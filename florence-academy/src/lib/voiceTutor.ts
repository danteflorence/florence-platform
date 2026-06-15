// Voice tutor client — talks to the API's ElevenLabs Conversational-AI bridge.
// config is public (so the SPA can show/hide the button); a session mints a
// short-lived signed URL, gated server-side to signed-in learners (it consumes
// grant minutes). The actual realtime audio runs through @elevenlabs/react.

import { apiBaseUrl } from "./academyAuth";
import type { WalkthroughView } from "./walkthrough";

export interface QuestionContext {
  topic: string;
  primaryStep: string;
  correct: { label: string; why: string }[];
  distractors: { label: string; why: string; error?: string }[];
  teachBack: string;
}

/** Build a compact question context from a walkthrough view (for voice grounding). */
export function questionContextFrom(topic: string, view: WalkthroughView): QuestionContext {
  return {
    topic,
    primaryStep: view.primary.label,
    correct: view.optionRows.filter((r) => r.isCorrect).map((r) => ({ label: r.label, why: r.why })),
    distractors: view.optionRows.filter((r) => !r.isCorrect).map((r) => ({ label: r.label, why: r.why, ...(r.errorLabel ? { error: r.errorLabel } : {}) })),
    teachBack: view.teachBack,
  };
}

/** A spoken-friendly grounding string the agent can reason over ("why not C?"). */
export function groundingText(ctx: QuestionContext): string {
  const parts = [`The learner is reviewing an NCLEX item on ${ctx.topic}. It primarily tests ${ctx.primaryStep}.`];
  for (const c of ctx.correct) parts.push(`The correct answer is "${c.label}": ${c.why}`);
  for (const d of ctx.distractors) parts.push(`"${d.label}" is wrong${d.error ? ` (${d.error})` : ""}: ${d.why}`);
  if (ctx.teachBack) parts.push(`Key takeaway: ${ctx.teachBack}`);
  parts.push("Answer the learner's follow-up using this; keep it to 2-4 spoken sentences.");
  return parts.join(" ");
}

/** Flat dynamic variables (string-only) for the agent session. */
export function groundingVars(ctx: QuestionContext): Record<string, string> {
  return {
    question_topic: ctx.topic,
    primary_cjmm_step: ctx.primaryStep,
    correct_answer: ctx.correct.map((c) => c.label).join("; "),
  };
}

export async function fetchTutorConfigured(): Promise<boolean> {
  try {
    const r = await fetch(`${apiBaseUrl()}/v1/tutor/config`);
    if (!r.ok) return false;
    const j = (await r.json()) as { configured?: boolean };
    return Boolean(j.configured);
  } catch {
    return false;
  }
}

/** Mint a signed URL for a tutor conversation (sends the Core session cookie). */
export async function startTutorSession(): Promise<string> {
  const r = await fetch(`${apiBaseUrl()}/v1/tutor/session`, { method: "POST", credentials: "include" });
  if (!r.ok) {
    const msg = ((await r.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message;
    throw new Error(msg ?? `Could not start the tutor (${r.status}).`);
  }
  const j = (await r.json()) as { signedUrl?: string };
  if (!j.signedUrl) throw new Error("Tutor session response missing signed URL.");
  return j.signedUrl;
}
