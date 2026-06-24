import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Deck } from "../../lib/deck";
import { useFocusTrap } from "../../lib/useFocusTrap";
import SlideView from "./SlideView";

interface SlideDeckProps {
  deck: Deck;
  /** Controlled current index. Omit for self-paced (internal state). */
  index?: number;
  /** Called whenever navigation is requested (also fires in controlled mode). */
  onIndexChange?: (i: number) => void;
  /** When true, local keyboard/click navigation is disabled (followers in a
   *  synced room whose instructor has locked the deck). */
  locked?: boolean;
  /** Route to return to when exiting the deck. */
  exitTo?: string;
  /** Optional banner shown top-center (e.g. live-sync status). */
  statusBadge?: React.ReactNode;
}

/** A kind → swatch map so the overview grid reads at a glance. */
const KIND_DOT: Record<string, string> = {
  cover: "bg-florence-indigo",
  objectives: "bg-florence-teal",
  agenda: "bg-florence-teal",
  section: "bg-florence-indigo",
  content: "bg-florence-slate/50",
  callout: "bg-vital-warn",
  widget: "bg-florence-teal",
  practice: "bg-florence-indigo",
  close: "bg-florence-indigo",
};

export default function SlideDeck({
  deck,
  index,
  onIndexChange,
  locked = false,
  exitTo = "/academy/section-7-cardiac",
  statusBadge,
}: SlideDeckProps) {
  const controlled = index != null;
  const [internal, setInternal] = useState(0);
  const cur = controlled ? Math.min(index!, deck.slides.length - 1) : internal;

  const [overview, setOverview] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const overviewRef = useFocusTrap<HTMLDivElement>(overview);

  const total = deck.slides.length;

  const go = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, total - 1));
      onIndexChange?.(clamped);
      if (!controlled) setInternal(clamped);
    },
    [controlled, onIndexChange, total],
  );

  const next = useCallback(() => {
    if (!locked) go(cur + 1);
  }, [cur, go, locked]);
  const prev = useCallback(() => {
    if (!locked) go(cur - 1);
  }, [cur, go, locked]);

  // Keyboard presenter controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing in form fields (e.g. a widget's input).
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))
        return;

      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          if (overview) return;
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          if (overview) return;
          prev();
          break;
        case "Home":
          e.preventDefault();
          if (!locked) go(0);
          break;
        case "End":
          e.preventDefault();
          if (!locked) go(total - 1);
          break;
        case "o":
        case "O":
          setOverview((v) => !v);
          break;
        case "f":
        case "F":
          toggleFs();
          break;
        case "Escape":
          if (overview) setOverview(false);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, go, overview, locked, total]);

  // Track fullscreen state to flip the icon.
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFs = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  };

  const current = deck.slides[cur];
  const pct = total > 1 ? (cur / (total - 1)) * 100 : 0;

  return (
    <div ref={stageRef} className="flex h-screen flex-col bg-florence-ink">
      {/* Control bar */}
      <div className="flex items-center justify-between gap-3 bg-florence-ink px-4 py-2 text-white/80">
        <div className="flex items-center gap-3">
          <Link
            to={exitTo}
            className="rounded-lg px-2 py-1 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Exit deck"
          >
            ← Exit
          </Link>
          <span className="hidden text-sm font-medium text-white/60 sm:block">
            {deck.title}
          </span>
        </div>

        {statusBadge}

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setOverview((v) => !v)}
            className="rounded-lg px-2.5 py-1 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Overview (O)"
          >
            ▦ Overview
          </button>
          <button
            onClick={toggleFs}
            className="rounded-lg px-2.5 py-1 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Fullscreen (F)"
          >
            {isFs ? "⤢ Exit full" : "⤢ Full"}
          </button>
          <span className="ml-1 tabular-nums rounded-lg bg-white/10 px-2.5 py-1 text-sm font-semibold text-white">
            {cur + 1} / {total}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div
        className="h-1 w-full bg-white/10"
        role="progressbar"
        aria-label="Deck progress"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={cur + 1}
      >
        <div
          className="h-full bg-florence-teal transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Screen-reader announcement on slide change. */}
      <div className="sr-only" role="status" aria-live="polite">
        {`Slide ${cur + 1} of ${total}: ${current?.label ?? ""}`}
      </div>

      {/* Stage */}
      <div className="relative min-h-0 flex-1 bg-white">
        <div className="h-full w-full overflow-hidden">
          {current && <SlideView slide={current.slide} />}
        </div>

        {/* Click zones for prev / next (skip when locked) */}
        {!locked && (
          <>
            <button
              onClick={prev}
              disabled={cur === 0}
              aria-label="Previous slide"
              className="group absolute inset-y-0 left-0 hidden w-16 items-center justify-start pl-2 disabled:opacity-0 md:flex"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-florence-ink/0 text-xl text-florence-ink/0 transition-all group-hover:bg-florence-ink/5 group-hover:text-florence-ink/60">
                ‹
              </span>
            </button>
            <button
              onClick={next}
              disabled={cur === total - 1}
              aria-label="Next slide"
              className="group absolute inset-y-0 right-0 hidden w-16 items-center justify-end pr-2 disabled:opacity-0 md:flex"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-florence-ink/0 text-xl text-florence-ink/0 transition-all group-hover:bg-florence-ink/5 group-hover:text-florence-ink/60">
                ›
              </span>
            </button>
          </>
        )}

        {locked && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-florence-ink/80 px-4 py-1.5 text-xs font-medium text-white">
            Following the instructor
          </div>
        )}
      </div>

      {/* Overview grid */}
      {overview && (
        <div
          ref={overviewRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={`${deck.title} - slide overview`}
          className="absolute inset-0 z-50 overflow-y-auto bg-florence-ink/95 p-6 outline-none backdrop-blur"
          onClick={() => setOverview(false)}
        >
          <div className="mx-auto max-w-6xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold text-white">
                {deck.title} - all slides
              </h2>
              <button
                onClick={() => setOverview(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-white/70 hover:bg-white/10 hover:text-white"
              >
                Close (Esc)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {deck.slides.map((s) => (
                <button
                  key={s.id}
                  aria-current={s.index === cur ? "true" : undefined}
                  aria-label={`Slide ${s.index + 1}: ${s.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!locked) go(s.index);
                    setOverview(false);
                  }}
                  className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                    s.index === cur
                      ? "border-florence-teal bg-white/10"
                      : "border-white/15 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <span className="mt-1 flex shrink-0 items-center gap-1.5">
                    <span className="w-5 text-right font-mono text-[11px] text-white/50">
                      {s.index + 1}
                    </span>
                    <span
                      className={`h-2 w-2 rounded-full ${KIND_DOT[s.slide.kind] ?? "bg-white/40"}`}
                    />
                  </span>
                  <span className="text-sm font-medium leading-snug text-white/90 line-clamp-2">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
