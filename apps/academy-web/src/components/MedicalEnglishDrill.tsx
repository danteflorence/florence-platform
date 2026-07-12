// ───────────────────────────────────────────────────────────────────────────
// MedicalEnglishDrill - decode the NCLEX's own language. Five-minute drill:
// one exam phrasing at a time, instant verdict + plain-English why. Items are
// shuffled deterministically by day so the daily plan serves variety without
// randomness in tests.
// ───────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { MEDICAL_ENGLISH_DRILLS, type EnglishDrillItem } from "../data/medicalEnglish";

/** Deterministic day-seeded order: same order all day, fresh order tomorrow. */
function dayShuffled(items: EnglishDrillItem[], seed: string): EnglishDrillItem[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return [...items].sort((a, b) => {
    const ka = (h ^ [...a.id].reduce((x, c) => (x * 33 + c.charCodeAt(0)) >>> 0, 5381)) >>> 0;
    const kb = (h ^ [...b.id].reduce((x, c) => (x * 33 + c.charCodeAt(0)) >>> 0, 5381)) >>> 0;
    return ka - kb;
  });
}

export default function MedicalEnglishDrill({ onExit }: { onExit: () => void }) {
  const items = useMemo(
    () => dayShuffled(MEDICAL_ENGLISH_DRILLS, new Date().toISOString().slice(0, 10)).slice(0, 10),
    [],
  );
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  if (index >= items.length) {
    return (
      <div className="mx-auto max-w-xl px-5 py-14 text-center">
        <p className="text-sm font-medium text-florence-slate">NCLEX language drill</p>
        <p className="mt-2 font-serif text-3xl font-semibold text-florence-ink">
          {correctCount} / {items.length}
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-florence-slate">
          {correctCount === items.length
            ? "You read the exam's language like a native. Keep it warm - one drill a week."
            : "Every phrase you decode here is a point you don't lose to wording on exam day."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => {
              setIndex(0);
              setPicked(null);
              setCorrectCount(0);
            }}
            className="rounded-xl bg-florence-teal px-5 py-3 text-sm font-semibold text-white shadow-card hover:bg-florence-teal-dark"
          >
            Run it again
          </button>
          <button onClick={onExit} className="rounded-xl border border-florence-line bg-white px-5 py-3 text-sm font-semibold text-florence-ink hover:bg-florence-mist">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  const item = items[index];
  const revealed = picked !== null;

  return (
    <div className="mx-auto max-w-xl px-5 py-8">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-florence-slate">
          NCLEX language · {index + 1} / {items.length}
        </p>
        <button onClick={onExit} className="text-xs font-semibold text-florence-slate hover:text-florence-ink">
          End drill
        </button>
      </div>

      <p className="mt-4 rounded-xl bg-florence-indigo-soft/40 px-4 py-3 font-serif text-lg leading-snug text-florence-ink">
        {item.phrase}
      </p>
      <p className="mt-3 text-sm font-medium text-florence-ink">{item.question}</p>

      <div className="mt-3 space-y-2">
        {item.options.map((opt, i) => {
          const isCorrect = i === item.correctIndex;
          const isPicked = picked === i;
          const cls = !revealed
            ? "border-florence-line bg-white hover:bg-florence-mist"
            : isCorrect
              ? "border-vital-ok bg-emerald-50"
              : isPicked
                ? "border-vital-danger bg-red-50"
                : "border-florence-line bg-white opacity-60";
          return (
            <button
              key={i}
              disabled={revealed}
              onClick={() => {
                setPicked(i);
                if (i === item.correctIndex) setCorrectCount((c) => c + 1);
              }}
              className={`block w-full rounded-xl border px-4 py-2.5 text-left text-sm text-florence-ink transition-colors ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="mt-3 rounded-xl border border-florence-teal/30 bg-florence-teal-soft/30 px-4 py-3">
          <p className="text-sm leading-relaxed text-florence-ink">{item.explain}</p>
          <button
            onClick={() => {
              setIndex((i) => i + 1);
              setPicked(null);
            }}
            className="mt-3 rounded-xl bg-florence-teal px-5 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-florence-teal-dark"
          >
            {index + 1 >= items.length ? "Finish" : "Next phrase →"}
          </button>
        </div>
      )}
    </div>
  );
}
