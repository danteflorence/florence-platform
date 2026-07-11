// ───────────────────────────────────────────────────────────────────────────
// Conversational scenario author. An instructor TALKS through a scenario and
// the system builds it out, one slot at a time, with a visible completeness
// checklist so they always know what's left.
//
//   • MOCK (default): a deterministic guided interview. Each turn stores the
//     instructor's answer into the current slot, patches the working scenario,
//     and asks the next question. Pulls vitals out of free text. No key needed
//     - it produces a valid, editable draft by the end of the interview.
//   • MODEL (env-gated MODEL_GATEWAY_URL/KEY): a real authoring partner - the
//     conversation + the current draft go to the model, which returns the next
//     reply and a JSON patch. Falls back to the guided interview on failure.
//
// The Studio holds the working scenario as the single source of truth; every
// turn returns the updated draft + which slots are filled, so the same
// validate → play-test → save → approve flow picks up from here.
// ───────────────────────────────────────────────────────────────────────────

import { scenarioSkeleton } from "./scenarioIngest.ts";

export type AuthorSlot =
  | "title"
  | "setting"
  | "patient"
  | "presentation"
  | "vitals"
  | "priority"
  | "escalation";

export const AUTHOR_SLOTS: AuthorSlot[] = [
  "title",
  "setting",
  "patient",
  "presentation",
  "vitals",
  "priority",
  "escalation",
];

const SLOT_LABEL: Record<AuthorSlot, string> = {
  title: "Title",
  setting: "Setting",
  patient: "Patient",
  presentation: "Presentation",
  vitals: "Vitals",
  priority: "Priority action",
  escalation: "Escalation",
};

const SLOT_QUESTION: Record<AuthorSlot, string> = {
  title: "Let's build a scenario. What should we call it - what's the condition or situation?",
  setting: "Where and when does the learner pick up this patient? (unit, time, what just happened)",
  patient: "Tell me about the patient - name, age, sex, and the key history.",
  presentation: "What does the learner notice first? The opening cue and what the patient says.",
  vitals: "What are the opening vital signs? (HR, BP, RR, SpO2, temp)",
  priority: "What's the single most important thing a strong learner does first?",
  escalation: "When and how should they escalate - and what happens if they don't?",
};

export interface AuthorTurnRequest {
  message: string;
  /** Slots already filled (client tracks this). */
  filled: AuthorSlot[];
  /** The current working scenario draft (or null to start). */
  draft: Record<string, unknown> | null;
}

export interface AuthorTurnReply {
  reply: string;
  draft: Record<string, unknown>;
  filled: AuthorSlot[];
  remaining: AuthorSlot[];
  done: boolean;
  source: "mock" | "model";
}

function authorConfigured(): boolean {
  return Boolean(process.env.MODEL_GATEWAY_URL && process.env.MODEL_GATEWAY_KEY);
}

function nextSlot(filled: AuthorSlot[]): AuthorSlot | null {
  return AUTHOR_SLOTS.find((s) => !filled.includes(s)) ?? null;
}

/** Deterministic guided interview: store the answer, patch the draft, ask next. */
export function mockAuthorTurn(req: AuthorTurnRequest): AuthorTurnReply {
  const filled = [...req.filled];
  // Seed a skeleton on the first turn (using the message as the title text).
  let draft = req.draft ?? scenarioSkeleton({ text: req.message, title: req.message.slice(0, 80) }).scenario;
  const current = nextSlot(filled);

  if (current && req.message.trim()) {
    const msg = req.message.trim();
    const patient = (draft.patient ?? {}) as Record<string, unknown>;
    switch (current) {
      case "title":
        draft = { ...draft, title: msg.slice(0, 120) };
        break;
      case "setting":
        draft = { ...draft, setting: msg.slice(0, 300) };
        break;
      case "patient": {
        const age = Number((msg.match(/\b(\d{1,3})\b/) ?? [])[1]);
        const name = (msg.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/) ?? [])[1];
        draft = {
          ...draft,
          patient: {
            ...patient,
            ...(name ? { name } : {}),
            ...(Number.isFinite(age) ? { age } : {}),
            sex: /female|woman|\bf\b/i.test(msg) ? "F" : /male|man|\bm\b/i.test(msg) ? "M" : (patient.sex ?? "F"),
            history: [msg.slice(0, 200)],
          },
        };
        break;
      }
      case "presentation": {
        const phases = (draft.phases ?? []) as Array<Record<string, unknown>>;
        const p0 = { ...(phases[0] ?? { id: "p0-baseline", atSec: 0 }) };
        p0.cues = [{ id: "c-opening", text: msg.slice(0, 300), channel: "patient", critical: true }];
        p0.patientLine = { text: msg.slice(0, 200) };
        draft = { ...draft, phases: [p0, ...phases.slice(1)] };
        break;
      }
      case "vitals": {
        const n = (re: RegExp, fb: number) => {
          const m = msg.match(re);
          return m ? Number(m[1]) : fb;
        };
        const bp = msg.match(/\b(\d{2,3})\s*\/\s*(\d{2,3})\b/);
        const iv = (draft.initialVitals ?? {}) as Record<string, unknown>;
        draft = {
          ...draft,
          initialVitals: {
            ...iv,
            hr: n(/\bHR[:\s]*?(\d{2,3})/i, (iv.hr as number) ?? 88),
            sbp: bp ? Number(bp[1]) : ((iv.sbp as number) ?? 120),
            dbp: bp ? Number(bp[2]) : ((iv.dbp as number) ?? 74),
            rr: n(/\bRR[:\s]*?(\d{1,2})/i, (iv.rr as number) ?? 18),
            spo2: n(/(?:SpO2|sat)[:\s]*?(\d{2,3})/i, (iv.spo2 as number) ?? 96),
            tempC: (iv.tempC as number) ?? 37,
            pain: (iv.pain as number) ?? 3,
            rhythm: (iv.rhythm as string) ?? "Sinus rhythm",
            loc: (iv.loc as string) ?? "alert",
          },
        };
        break;
      }
      case "priority":
        // Record the instructor's priority as a debrief note; the specific
        // action wiring is done in the editor/play-test.
        draft = { ...draft, _authorNotes: { ...(draft._authorNotes as object), priority: msg.slice(0, 300) } };
        break;
      case "escalation":
        draft = { ...draft, _authorNotes: { ...(draft._authorNotes as object), escalation: msg.slice(0, 300) } };
        break;
    }
    filled.push(current);
  }

  const next = nextSlot(filled);
  const remaining = AUTHOR_SLOTS.filter((s) => !filled.includes(s));
  const done = next === null;
  const reply = done
    ? "That's the backbone. I've drafted it on the right - open the editor to add the exact actions and rubric, then play-test and submit for review."
    : `Got it (${SLOT_LABEL[filled[filled.length - 1]] ?? "start"}). ${SLOT_QUESTION[next!]}`;

  return { reply, draft, filled, remaining, done, source: "mock" };
}

async function modelAuthorTurn(req: AuthorTurnRequest): Promise<AuthorTurnReply> {
  const system = [
    "You are co-authoring a nursing virtual-patient scenario with an instructor, one question at a time.",
    "Given the conversation so far (the current draft JSON) and their latest message, reply with ONE short next question OR a wrap-up, and return the UPDATED scenario draft JSON in our schema.",
    "Output ONLY JSON: { reply: string, draft: <scenario object>, filled: string[] } where filled lists which of these slots are done: title,setting,patient,presentation,vitals,priority,escalation.",
    `Current draft: ${JSON.stringify(req.draft ?? {})}`,
  ].join("\n");
  const res = await fetch(process.env.MODEL_GATEWAY_URL as string, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.MODEL_GATEWAY_KEY}` },
    body: JSON.stringify({ system, user: req.message, max_tokens: 3000, response_format: "json" }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`model gateway ${res.status}`);
  const j = (await res.json()) as { text?: string };
  if (!j.text) throw new Error("empty");
  const parsed = JSON.parse(j.text) as { reply: string; draft: Record<string, unknown>; filled: AuthorSlot[] };
  const filled = (parsed.filled ?? []).filter((s): s is AuthorSlot => AUTHOR_SLOTS.includes(s as AuthorSlot));
  const remaining = AUTHOR_SLOTS.filter((s) => !filled.includes(s));
  return { reply: parsed.reply, draft: parsed.draft, filled, remaining, done: remaining.length === 0, source: "model" };
}

export async function authorTurn(req: AuthorTurnRequest): Promise<AuthorTurnReply> {
  if (authorConfigured()) {
    try {
      return await modelAuthorTurn(req);
    } catch {
      /* fall back to the guided interview */
    }
  }
  return mockAuthorTurn(req);
}
