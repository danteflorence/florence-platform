// A tiny external store that lets any surface (e.g. a question walkthrough) open the
// single global FlorenceRN voice tutor PRE-SEEDED with a question's context - without
// mounting a second ConversationProvider. The global <VoiceTutor> subscribes; callers
// publish. Mock-by-default: if the tutor isn't configured, opening is a no-op and the
// "Ask FlorenceRN" affordance stays hidden.

export interface TutorSeed {
  questionId: string;
  /** Optional pre-built grounding (stem/options/why) so "why not C?" works. */
  context?: string;
  variables?: Record<string, string>;
}

type Listener = (seed: TutorSeed) => void;
type ConfigListener = (configured: boolean) => void;

let configured = false;
let listener: Listener | null = null;
const configListeners = new Set<ConfigListener>();

export function setTutorConfigured(v: boolean): void {
  configured = v;
  for (const fn of configListeners) fn(v);
}
export function tutorConfigured(): boolean {
  return configured;
}

export function subscribeTutorConfigured(fn: ConfigListener): () => void {
  configListeners.add(fn);
  return () => {
    configListeners.delete(fn);
  };
}

/** The global VoiceTutor registers here to receive seeded-open requests. */
export function subscribeTutor(fn: Listener): () => void {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

/** Open the tutor seeded with a question. Returns false when unconfigured / not mounted. */
export function openTutorForQuestion(seed: TutorSeed): boolean {
  if (!configured || !listener) return false;
  listener(seed);
  return true;
}
