// ───────────────────────────────────────────────────────────────────────────
// SimNarrationAudio - a compact speaker control for a single sim narration /
// patient line. Resolves the clip through the audio manifest; if no audio has
// been generated yet (the pre-ElevenLabs state) it renders NOTHING, so the
// text line stands on its own. Tap-to-play, preload="none" - the low-bandwidth
// convention the rest of the app uses. Respects a global mute.
// ───────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { audioFor, simNarrationKey, type AudioEntry } from "../../lib/audioManifest";

export default function SimNarrationAudio({
  scenarioId,
  audioId,
  muted = false,
  autoPlay = false,
}: {
  scenarioId: string;
  audioId: string;
  muted?: boolean;
  /** Play once on mount when a new line lands (only if not muted + clip exists). */
  autoPlay?: boolean;
}) {
  const [entry, setEntry] = useState<AudioEntry | null>(null);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let alive = true;
    void audioFor(simNarrationKey(scenarioId, audioId)).then((e) => {
      if (alive) setEntry(e);
    });
    return () => {
      alive = false;
    };
  }, [scenarioId, audioId]);

  // Auto-play the newest line once, if unmuted and the clip exists. Allowed
  // because the learner already gestured ("Start the shift") this session.
  useEffect(() => {
    if (!entry || muted || !autoPlay) return;
    const el = ref.current;
    if (!el) return;
    void el.play().then(() => setPlaying(true)).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  if (!entry) return null;

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play().then(() => setPlaying(true)).catch(() => undefined);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause narration" : "Play narration"}
        aria-pressed={playing}
        className="inline-grid h-6 w-6 shrink-0 place-items-center rounded-full border border-florence-line bg-white text-florence-teal-dark hover:bg-florence-mist"
      >
        {playing ? (
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
            <rect x="4" y="3" width="3" height="10" rx="1" />
            <rect x="9" y="3" width="3" height="10" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
            <path d="M5 3.5v9a.5.5 0 0 0 .77.42l7-4.5a.5.5 0 0 0 0-.84l-7-4.5A.5.5 0 0 0 5 3.5Z" />
          </svg>
        )}
      </button>
      <audio ref={ref} src={entry.url} preload="none" onEnded={() => setPlaying(false)} />
    </>
  );
}
