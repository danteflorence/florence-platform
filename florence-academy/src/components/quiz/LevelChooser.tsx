import { LEVELS, type DifficultyLevel } from "../../lib/cat";

/**
 * Lets the learner (or their instructor) choose a STARTING difficulty before a
 * session - or hand the choice to FlorenceRN's adaptive engine. Whatever they
 * pick is only a starting point: the session climbs or eases from there based on
 * how they actually perform, and the rationale is always shown afterward.
 */
export default function LevelChooser({
  title,
  subtitle,
  onPick,
  onBack,
}: {
  title: string;
  subtitle: string;
  onPick: (level: DifficultyLevel) => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <button
        onClick={onBack}
        className="fl-pill mb-6 hover:bg-florence-mist"
        aria-label="Back to practice menu"
      >
        ← Back
      </button>

      <p className="fl-eyebrow">{title}</p>
      <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
        Where should we start?
      </h1>
      <p className="mt-3 max-w-2xl text-florence-slate">{subtitle}</p>

      <div className="mt-8 space-y-3">
        {LEVELS.map((lv) => {
          const adaptive = lv.key === "adaptive";
          return (
            <button
              key={lv.key}
              onClick={() => onPick(lv.key)}
              className={`group flex w-full items-center gap-4 rounded-2xl border p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-lg ${
                adaptive
                  ? "border-florence-indigo/40 bg-florence-indigo-soft/40"
                  : "border-florence-line bg-white"
              }`}
            >
              <LevelDial level={lv.key} />
              <span className="flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-florence-ink">
                    {lv.label}
                  </span>
                  {adaptive && (
                    <span className="fl-pill border-florence-indigo/30 text-florence-indigo-dark">
                      CAT
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-sm leading-relaxed text-florence-slate">
                  {lv.blurb}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-florence-teal-dark group-hover:underline">
                Start →
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-[11px] leading-relaxed text-florence-slate/70">
        Your choice only sets the first question's difficulty. From there the
        session adapts to your performance, and you'll always see the rationale -
        whether you got it right or wrong.
      </p>
    </div>
  );
}

/** A tiny 5-bar level indicator, filled to match the difficulty of the level. */
function LevelDial({ level }: { level: DifficultyLevel }) {
  const fill: Record<DifficultyLevel, number> = {
    foundational: 1,
    easy: 2,
    moderate: 3,
    challenging: 5,
    adaptive: 0, // shown as an adaptive glyph instead
  };
  if (level === "adaptive") {
    return (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-florence-indigo text-base font-bold text-white">
        ∿
      </span>
    );
  }
  const n = fill[level];
  return (
    <span className="flex h-10 w-10 shrink-0 items-end justify-center gap-0.5 rounded-xl bg-florence-mist p-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`w-1 rounded-full ${
            i < n ? "bg-florence-teal" : "bg-florence-line"
          }`}
          style={{ height: `${30 + i * 14}%` }}
        />
      ))}
    </span>
  );
}
