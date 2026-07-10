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
