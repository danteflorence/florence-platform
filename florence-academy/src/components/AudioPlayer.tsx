// Compact audio player for narrated rationales + lesson segments. Built for the
// global-mobile, low-bandwidth case: preload="none" (no bytes until the learner
// hits play), a playback-speed control, and a download button for offline study
// on a spotty connection. Audio IS the data-saver path, so there's no video to
// gate — just a light, accessible control.

import { useEffect, useRef, useState } from "react";

const SPEEDS = [1, 1.25, 1.5, 2] as const;

function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AudioPlayer({
  src,
  durationSec,
  label = "Listen",
  onEnded,
  autoPlay = false,
}: {
  src: string;
  durationSec?: number;
  label?: string;
  /** Fired when playback finishes (used by the e-book's play-all to advance). */
  onEnded?: () => void;
  /** Play on mount / src change — only set true after a user gesture (play-all). */
  autoPlay?: boolean;
}) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(durationSec ?? 0);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTime = () => setCur(el.currentTime);
    const onMeta = () => { if (isFinite(el.duration)) setDur(el.duration); };
    const onEnd = () => { setPlaying(false); onEnded?.(); };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
    };
  }, [onEnded]);

  // Play-all: when autoPlay is on, start (or restart on src change). Browsers allow
  // this because play-all is initiated by a user click on the first chapter.
  useEffect(() => {
    const el = ref.current;
    if (!el || !autoPlay) return;
    void el.play().then(() => setPlaying(true)).catch(() => undefined);
  }, [autoPlay, src]);

  function toggle() {
    const el = ref.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play();
      setPlaying(true);
    }
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const el = ref.current;
    if (!el) return;
    const t = Number(e.target.value);
    el.currentTime = t;
    setCur(t);
  }

  function cycleSpeed() {
    const next = SPEEDS[(SPEEDS.indexOf(rate as (typeof SPEEDS)[number]) + 1) % SPEEDS.length];
    setRate(next);
    if (ref.current) ref.current.playbackRate = next;
  }

  const total = dur || durationSec || 0;

  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-florence-line bg-white px-3 py-2">
      <audio ref={ref} src={src} preload="none" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause" : label}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-florence-teal text-white transition hover:bg-florence-teal-dark"
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="hidden text-xs font-medium text-florence-slate sm:inline">{label}</span>
          <input
            type="range"
            min={0}
            max={total || 1}
            step={1}
            value={Math.min(cur, total || 1)}
            onChange={seek}
            aria-label="Seek"
            className="h-1 flex-1 cursor-pointer accent-florence-teal"
          />
          <span className="shrink-0 tabular-nums text-xs text-florence-slate">
            {fmt(cur)} / {fmt(total)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={cycleSpeed}
        aria-label="Playback speed"
        className="shrink-0 rounded-md border border-florence-line px-1.5 py-0.5 text-xs font-semibold text-florence-slate transition hover:border-florence-teal hover:text-florence-teal-dark"
      >
        {rate}×
      </button>

      <a
        href={src}
        download
        aria-label="Download for offline"
        title="Download for offline"
        className="shrink-0 text-florence-slate transition hover:text-florence-teal-dark"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
      </a>
    </div>
  );
}
