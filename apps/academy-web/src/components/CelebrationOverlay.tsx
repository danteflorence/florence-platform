// ───────────────────────────────────────────────────────────────────────────
// CelebrationOverlay - the designed moment for emotional peaks. Milestones
// (first baseline, streak 7/30, first green band) get a full-screen beat and,
// when audio is available, ONE spoken sentence in the narrator's voice -
// most products can't talk; ours can, so the big moments should.
//
// Discipline: celebrations are RARE (each fires once, localStorage-guarded by
// the caller), short (one tap to dismiss), and reduced-motion safe (the
// fl-pop/fl-rise classes no-op under prefers-reduced-motion).
// ───────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { speakText } from "../lib/audioManifest";
import { storedToken } from "../lib/academyAuth";

/** Fire-once guard. Returns true (and marks) the first time per key. */
export function celebrateOnce(key: string): boolean {
  try {
    const k = `florence.celebrated.${key}`;
    if (localStorage.getItem(k)) return false;
    localStorage.setItem(k, new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

export default function CelebrationOverlay({
  emoji,
  title,
  message,
  spoken,
  onClose,
}: {
  emoji: string;
  title: string;
  message: string;
  /** One sentence, spoken in the narrator voice (best-effort). */
  spoken?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!spoken || !storedToken()) return;
    let el: HTMLAudioElement | null = null;
    void speakText(spoken, storedToken()).then((url) => {
      if (!url) return;
      el = new Audio(url);
      el.preload = "none";
      void el.play().catch(() => undefined);
    });
    return () => {
      el?.pause();
    };
  }, [spoken]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-florence-ink/85 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="fl-rise w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="fl-pop mx-auto grid h-20 w-20 place-items-center rounded-full bg-florence-teal-soft text-4xl">
          {emoji}
        </div>
        <h2 className="mt-5 text-2xl font-bold text-florence-ink">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-florence-slate">{message}</p>
        <button
          onClick={onClose}
          autoFocus
          className="fl-press mt-6 w-full rounded-xl bg-florence-teal px-5 py-3 text-sm font-semibold text-white shadow-card hover:bg-florence-teal-dark"
        >
          Keep going →
        </button>
      </div>
    </div>
  );
}
