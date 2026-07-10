// ───────────────────────────────────────────────────────────────────────────
// PatientVoice v2 - the conversational virtual patient, proxied server-side.
//
// The browser NEVER holds a model key. The sim player POSTs the learner's
// question plus the patient persona and ONLY the findings the learner has
// already revealed; this module answers either:
//   • MOCK (default): keyword-match against the scenario's canned responses -
//     identical behavior to the client-side v1 fallback, but proves the pipe.
//   • MODEL (env-gated): MODEL_GATEWAY_URL + MODEL_GATEWAY_KEY set → one
//     completion call. The request shape is isolated in `modelReply` so
//     wiring the Florence Core model gateway (or any provider) is a
//     one-function change, reviewed with the key owner.
//
// FIDELITY RULE (the whole point of the system prompt): the patient may only
// reference findings the nurse has ALREADY surfaced. Undiscovered facts stay
// undiscovered - the sim teaches assessment; the patient must not do the
// assessment for you.
// ───────────────────────────────────────────────────────────────────────────

export interface PatientVoiceRequest {
  question: string;
  persona: {
    name: string;
    age: number;
    sex: string;
    setting: string;
  };
  /** Texts of cues the learner has already revealed (feelings, findings). */
  revealed: string[];
  /** The scenario's canned keyword responses - the mock provider's brain and
   *  the model provider's style examples. */
  canned: { match: string[]; text: string }[];
}

export interface PatientVoiceReply {
  text: string;
  source: "mock" | "model";
}

export function patientVoiceConfigured(): boolean {
  return Boolean(process.env.MODEL_GATEWAY_URL && process.env.MODEL_GATEWAY_KEY);
}

/** The in-character constraint set. Exported for tests - the fidelity rule
 *  (only revealed findings) must never regress silently. */
export function buildSystemPrompt(req: PatientVoiceRequest): string {
  return [
    `You are ${req.persona.name}, a ${req.persona.age}-year-old ${req.persona.sex} patient. Setting: ${req.persona.setting}.`,
    `You are unwell and speak in short, natural sentences (1-2 max), always in character as the patient. Never give medical advice, never name diagnoses, never break character.`,
    `You may ONLY reference symptoms and findings the nurse has already discovered, listed here: ${req.revealed.length ? req.revealed.join(" | ") : "(nothing discovered yet)"}.`,
    `If asked about anything not in that list, answer vaguely and in character ("I don't know... I just feel off") without inventing or revealing new clinical facts.`,
    `Example replies in this patient's voice: ${req.canned.map((c) => `"${c.text}"`).join(" ")}`,
  ].join("\n");
}

/** v1 behavior, server-side: first canned response whose keywords match. */
export function mockReply(req: PatientVoiceRequest): PatientVoiceReply {
  const q = req.question.toLowerCase();
  const hit = req.canned.find((c) => c.match.some((k) => q.includes(k.toLowerCase())));
  return {
    text: hit ? hit.text : "The patient looks at you but doesn't seem to follow the question.",
    source: "mock",
  };
}

/**
 * Real completion call, env-gated. Contract: POST MODEL_GATEWAY_URL with
 * {system, user, max_tokens} and bearer MODEL_GATEWAY_KEY; expects {text}.
 * Adjust THIS function (only) to match the Core model gateway when the
 * key owner wires it. Falls back to the mock on any failure - class never
 * stalls on a model hiccup.
 */
async function modelReply(req: PatientVoiceRequest): Promise<PatientVoiceReply> {
  const res = await fetch(process.env.MODEL_GATEWAY_URL as string, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.MODEL_GATEWAY_KEY}`,
    },
    body: JSON.stringify({
      system: buildSystemPrompt(req),
      user: req.question,
      max_tokens: 120,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`model gateway ${res.status}`);
  const j = (await res.json()) as { text?: string };
  if (!j.text) throw new Error("model gateway: empty reply");
  return { text: j.text.slice(0, 400), source: "model" };
}

export async function patientVoiceReply(req: PatientVoiceRequest): Promise<PatientVoiceReply> {
  if (!patientVoiceConfigured()) return mockReply(req);
  try {
    return await modelReply(req);
  } catch {
    return mockReply(req); // degrade gracefully mid-class
  }
}

// ── Tutor hint (safe-to-fail Socratic coaching) ─────────────────────────────
// The same AI tutor the learner uses everywhere, inside the sim. It coaches
// the REASONING (which NCJMM step to work) and never names the correct action -
// the client only ever sends the step + a spoiler-free situation, so even the
// model cannot hand over the answer. Same mock-default / model-gated shape.

export type NcjmmStep =
  | "recognize-cues"
  | "analyze-cues"
  | "prioritize-hypotheses"
  | "generate-solutions"
  | "take-actions"
  | "evaluate-outcomes";

export interface TutorHintRequest {
  /** The reasoning phase to coach (never a specific action). */
  step: NcjmmStep;
  /** Critical cues the learner has not yet surfaced. */
  criticalCuesRemaining: number;
  /** A one-line, spoiler-free situation summary (client-composed). */
  situation: string;
}

export interface TutorHintReply {
  text: string;
  source: "mock" | "model";
}

// Socratic nudges per NCJMM step - a question, never an answer.
const STEP_NUDGE: Record<NcjmmStep, string> = {
  "recognize-cues":
    "Slow down and look before you act. What have you actually assessed versus assumed? Some of the most dangerous findings only show up if you go looking for them.",
  "analyze-cues":
    "You have some data now. Which single finding worries you most, and what is it pointing to? Say the pattern out loud before you decide.",
  "prioritize-hypotheses":
    "If you are not sure of the cause, ask which possibility is the most dangerous to miss - and rule that one out first.",
  "generate-solutions":
    "You have a sense of what is wrong. What are your options, and which can you do on your own versus which needs an order first?",
  "take-actions":
    "You have decided. What is the very first thing, and is anything time-critical slipping while you set up?",
  "evaluate-outcomes":
    "You acted - now how will you KNOW it worked? What will you reassess, and how soon?",
};

export function tutorHintConfigured(): boolean {
  return patientVoiceConfigured();
}

export function tutorMockReply(req: TutorHintRequest): TutorHintReply {
  let text = STEP_NUDGE[req.step] ?? STEP_NUDGE["recognize-cues"];
  if (req.step === "recognize-cues" && req.criticalCuesRemaining > 0) {
    text += ` There ${req.criticalCuesRemaining === 1 ? "is 1 key finding" : `are ${req.criticalCuesRemaining} key findings`} you have not uncovered yet.`;
  }
  return { text, source: "mock" };
}

function tutorSystemPrompt(req: TutorHintRequest): string {
  return [
    "You are a calm bedside clinical-judgment coach for a nursing student inside a safe-to-fail patient simulation.",
    `The student is working the '${req.step}' step of the NCSBN Clinical Judgment Measurement Model.`,
    "Give ONE short Socratic nudge (1-2 sentences) that pushes their reasoning forward.",
    "NEVER name the correct assessment, intervention, medication, or answer. Ask a question or point at a category of thinking. It is a safe-to-fail environment - it is fine for them to be wrong; your job is to make them think, not to rescue them.",
    `Situation (spoiler-free): ${req.situation}`,
  ].join("\n");
}

async function tutorModelReply(req: TutorHintRequest): Promise<TutorHintReply> {
  const res = await fetch(process.env.MODEL_GATEWAY_URL as string, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.MODEL_GATEWAY_KEY}`,
    },
    body: JSON.stringify({ system: tutorSystemPrompt(req), user: "Give me a hint.", max_tokens: 90 }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`model gateway ${res.status}`);
  const j = (await res.json()) as { text?: string };
  if (!j.text) throw new Error("model gateway: empty reply");
  return { text: j.text.slice(0, 400), source: "model" };
}

export async function tutorHintReply(req: TutorHintRequest): Promise<TutorHintReply> {
  if (!tutorHintConfigured()) return tutorMockReply(req);
  try {
    return await tutorModelReply(req);
  } catch {
    return tutorMockReply(req);
  }
}
