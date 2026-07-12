// ───────────────────────────────────────────────────────────────────────────
// speech.ts - thin wrapper over the browser's built-in SpeechRecognition
// (Web Speech API). Zero dependencies, zero cost, on-device/vendor STT:
// exactly right for short tutor questions. Feature-detected - callers render
// the mic only when supported (Chrome/Edge/Safari yes; Firefox no), and
// everything degrades to the existing tap/text path.
// ───────────────────────────────────────────────────────────────────────────

type RecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function ctor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"] ?? null) as RecognitionCtor | null;
}

export function speechAvailable(): boolean {
  return ctor() !== null;
}

export interface ListenHandle {
  stop(): void;
}

/**
 * Listen for ONE utterance (English - the exam's language, so practicing the
 * question in English is part of the training). Resolves callbacks:
 * onResult with the best transcript, onEnd always, onError on mic/permission
 * trouble. Returns a handle so the UI can cancel.
 */
export function listenOnce(cb: {
  onResult: (transcript: string) => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}): ListenHandle | null {
  const C = ctor();
  if (!C) return null;
  const rec = new C();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.continuous = false;
  rec.onresult = (e) => {
    const t = e.results[0]?.[0]?.transcript?.trim();
    if (t) cb.onResult(t);
  };
  rec.onerror = (e) => cb.onError?.(e.error === "not-allowed" ? "Microphone permission was blocked." : "Couldn't hear that - try again.");
  rec.onend = () => cb.onEnd?.();
  try {
    rec.start();
  } catch {
    return null;
  }
  return { stop: () => rec.abort() };
}
