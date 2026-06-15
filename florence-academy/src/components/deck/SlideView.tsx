import { useState, type ReactNode } from "react";
import type { CalloutTone, ContentBlock } from "../../data/hour7";
import type { DeckWidget, Slide } from "../../lib/deck";
import HeartViewer from "../HeartViewer";
import RhythmDrill from "../RhythmDrill";
import VitalsMonitor from "../VitalsMonitor";
import NgnCase from "../NgnCase";

const CALLOUT_STYLE: Record<
  CalloutTone,
  { wrap: string; chip: string; label: string }
> = {
  key: {
    wrap: "border-florence-teal bg-florence-teal-soft/50",
    chip: "text-florence-teal-dark",
    label: "Key point",
  },
  warn: {
    wrap: "border-vital-warn bg-amber-50",
    chip: "text-amber-700",
    label: "Watch out",
  },
  info: {
    wrap: "border-florence-indigo bg-florence-indigo-soft/50",
    chip: "text-florence-indigo-dark",
    label: "Note",
  },
};

/** Kicker shown top-left on content/callout/practice slides. */
function Kicker({ text }: { text: string }) {
  return (
    <p className="fl-eyebrow mb-4 text-florence-teal-dark sm:mb-6">{text}</p>
  );
}

/** Larger block renderer tuned for projected slides. */
function SlideBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "p":
            return (
              <p
                key={i}
                className="max-w-4xl text-xl leading-relaxed text-florence-ink/90 sm:text-2xl"
              >
                {b.text}
              </p>
            );
          case "h":
            return (
              <h3
                key={i}
                className="text-2xl font-semibold text-florence-ink sm:text-3xl"
              >
                {b.text}
              </h3>
            );
          case "list":
            return (
              <ul key={i} className="space-y-3">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-3.5">
                    <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-florence-teal sm:mt-3" />
                    <span className="text-lg leading-relaxed text-florence-ink/90 sm:text-xl">
                      {it}
                    </span>
                  </li>
                ))}
              </ul>
            );
          case "callout": {
            const s = CALLOUT_STYLE[b.tone];
            return (
              <div
                key={i}
                className={`rounded-2xl border-l-4 px-5 py-4 ${s.wrap}`}
              >
                <p className={`fl-eyebrow mb-1 ${s.chip}`}>
                  {s.label} · {b.title}
                </p>
                <p className="text-lg leading-relaxed text-florence-ink/90 sm:text-xl">
                  {b.text}
                </p>
              </div>
            );
          }
        }
      })}
    </div>
  );
}

/**
 * Vertically-centered slide body that stays scroll-safe: `m-auto` on a flex
 * child centers it when it fits and collapses to top-aligned + scrollable when
 * the content is taller than the stage (avoids the justify-center overflow
 * trap that clips the top of a slide).
 */
function CenteredStage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto px-8 py-12 sm:px-16">
      <div className={`m-auto w-full ${className}`}>{children}</div>
    </div>
  );
}

function Widget({ kind }: { kind: DeckWidget }) {
  switch (kind) {
    case "heart":
      return <HeartViewer />;
    case "rhythms":
      return <RhythmDrill />;
    case "sim":
      return <VitalsMonitor />;
    case "ngn":
      return <NgnCase />;
  }
}

/** Practice question shown on a slide: pick → reveal answer + rationale. */
function PracticeSlide({
  item,
}: {
  item: Extract<Slide, { kind: "practice" }>["item"];
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="w-full">
      <p className="mb-6 text-xl font-medium leading-relaxed text-florence-ink sm:text-2xl">
        {item.stem}
      </p>
      <div className="space-y-3">
        {item.options.map((o) => {
          const isCorrect = o.key === item.answer;
          const isPicked = picked === o.key;
          const show = revealed;
          const tone = show
            ? isCorrect
              ? "border-vital-ok bg-vital-ok/10"
              : isPicked
                ? "border-vital-danger bg-vital-danger/10"
                : "border-florence-line bg-white"
            : isPicked
              ? "border-florence-indigo bg-florence-indigo-soft/50"
              : "border-florence-line bg-white hover:border-florence-indigo/50";
          return (
            <button
              key={o.key}
              onClick={() => !revealed && setPicked(o.key)}
              disabled={revealed}
              className={`flex w-full items-start gap-4 rounded-xl border-2 px-5 py-4 text-left transition-colors ${tone}`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-sm font-bold ${
                  show && isCorrect
                    ? "border-vital-ok bg-vital-ok text-white"
                    : show && isPicked
                      ? "border-vital-danger bg-vital-danger text-white"
                      : "border-florence-line text-florence-slate"
                }`}
              >
                {o.key}
              </span>
              <span className="pt-1 text-lg text-florence-ink/90">{o.text}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3">
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            disabled={!picked}
            className="rounded-xl bg-florence-indigo px-6 py-3 text-base font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark disabled:opacity-40"
          >
            Reveal answer
          </button>
        ) : (
          <button
            onClick={() => {
              setPicked(null);
              setRevealed(false);
            }}
            className="rounded-xl border border-florence-line bg-white px-6 py-3 text-base font-semibold text-florence-slate transition-colors hover:text-florence-ink"
          >
            Reset
          </button>
        )}
      </div>

      {revealed && (
        <div className="mt-5 rounded-2xl border-l-4 border-florence-teal bg-florence-teal-soft/40 px-5 py-4">
          <p className="fl-eyebrow mb-1 text-florence-teal-dark">
            Answer · {item.answer}
          </p>
          <p className="text-lg leading-relaxed text-florence-ink/90">
            {item.rationale}
          </p>
        </div>
      )}
    </div>
  );
}

/** Renders a single slide full-bleed. */
export default function SlideView({ slide }: { slide: Slide }) {
  switch (slide.kind) {
    case "cover":
      return (
        <div className="flex h-full flex-col justify-center bg-indigo-gradient px-8 py-12 text-white sm:px-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70 sm:text-base">
            {slide.eyebrow}
          </p>
          <h1 className="mt-4 font-serif text-6xl font-semibold leading-[1.05] text-white sm:text-8xl">
            {slide.title}
          </h1>
          <p className="mt-6 max-w-3xl text-xl leading-relaxed text-white/85 sm:text-2xl">
            {slide.subtitle}
          </p>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2 text-sm text-white/70 sm:text-base">
            <span>{slide.meta.durationMin} minutes</span>
            <span>{slide.meta.contentWeight}</span>
          </div>
        </div>
      );

    case "objectives":
      return (
        <CenteredStage>
          <Kicker text="By the end of this section" />
          <h2 className="mb-8 font-serif text-4xl font-semibold text-florence-ink sm:text-5xl">
            {slide.title}
          </h2>
          <ul className="grid max-w-5xl gap-x-10 gap-y-4 md:grid-cols-2">
            {slide.items.map((o, i) => (
              <li key={i} className="flex gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-florence-teal-soft text-sm font-bold text-florence-teal-dark">
                  {i + 1}
                </span>
                <span className="text-base leading-relaxed text-florence-ink/90 sm:text-lg">
                  {o}
                </span>
              </li>
            ))}
          </ul>
        </CenteredStage>
      );

    case "agenda":
      return (
        <CenteredStage>
          <Kicker text="How the hour runs" />
          <h2 className="mb-8 font-serif text-4xl font-semibold text-florence-ink sm:text-5xl">
            {slide.title}
          </h2>
          <ul className="max-w-4xl divide-y divide-florence-line">
            {slide.rows.map((r) => (
              <li key={r.minutes} className="flex items-baseline gap-6 py-3">
                <span className="w-20 shrink-0 font-mono text-sm text-florence-teal-dark">
                  {r.minutes}
                </span>
                <span className="flex-1 text-lg text-florence-ink/90">
                  {r.segment}
                </span>
                <span className="hidden text-sm text-florence-slate sm:block">
                  {r.format}
                </span>
              </li>
            ))}
          </ul>
        </CenteredStage>
      );

    case "section":
      return (
        <div className="relative flex h-full flex-col justify-center overflow-hidden bg-florence-gradient px-8 py-12 text-white sm:px-16">
          <div className="pointer-events-none absolute -right-20 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70 sm:text-base">
            {slide.segment.format} · {slide.segment.minutes} min
          </p>
          <div className="mt-4 flex items-baseline gap-5">
            <span className="font-serif text-7xl font-semibold tabular-nums text-white/40 sm:text-8xl">
              {String(slide.index).padStart(2, "0")}
            </span>
            <h2 className="font-serif text-5xl font-semibold leading-tight text-white sm:text-7xl">
              {slide.segment.title}
            </h2>
          </div>
          <p className="mt-6 text-sm text-white/60">
            Section topic {slide.index} of {slide.total}
          </p>
        </div>
      );

    case "content":
      return (
        <CenteredStage>
          <Kicker text={slide.sectionTitle} />
          {slide.heading && (
            <h2 className="mb-6 font-serif text-4xl font-semibold leading-tight text-florence-ink sm:text-5xl">
              {slide.heading}
            </h2>
          )}
          <SlideBlocks blocks={slide.blocks} />
        </CenteredStage>
      );

    case "callout": {
      const s = CALLOUT_STYLE[slide.tone];
      return (
        <CenteredStage>
          <Kicker text={slide.sectionTitle} />
          <div className={`max-w-4xl rounded-3xl border-l-8 px-8 py-8 ${s.wrap}`}>
            <p
              className={`mb-3 text-sm font-semibold uppercase tracking-[0.16em] ${s.chip}`}
            >
              {s.label}
            </p>
            <h2 className="mb-4 font-serif text-3xl font-semibold leading-tight text-florence-ink sm:text-4xl">
              {slide.title}
            </h2>
            <p className="text-xl leading-relaxed text-florence-ink/90 sm:text-2xl">
              {slide.text}
            </p>
          </div>
        </CenteredStage>
      );
    }

    case "widget":
      return (
        <div className="flex h-full flex-col px-6 py-6 sm:px-10 sm:py-8">
          <Kicker text={slide.sectionTitle} />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Widget kind={slide.widget} />
          </div>
        </div>
      );

    case "practice":
      return (
        <CenteredStage className="max-w-4xl">
          <Kicker text={`${slide.sectionTitle} · Check your thinking`} />
          <PracticeSlide item={slide.item} />
        </CenteredStage>
      );

    case "close":
      return (
        <div className="flex h-full flex-col justify-center bg-indigo-gradient px-8 py-12 text-white sm:px-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
            That's the hour
          </p>
          <h2 className="mt-3 mb-8 font-serif text-5xl font-semibold text-white sm:text-6xl">
            {slide.title}
          </h2>
          <div className="max-w-4xl space-y-5">
            {slide.blocks.map((b, i) =>
              b.kind === "list" ? (
                <ul key={i} className="space-y-3">
                  {b.items.map((it, j) => (
                    <li key={j} className="flex gap-3.5">
                      <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-florence-teal" />
                      <span className="text-lg leading-relaxed text-white/90 sm:text-xl">
                        {it}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : b.kind === "p" ? (
                <p
                  key={i}
                  className="text-lg leading-relaxed text-white/90 sm:text-xl"
                >
                  {b.text}
                </p>
              ) : null,
            )}
          </div>
        </div>
      );
  }
}
