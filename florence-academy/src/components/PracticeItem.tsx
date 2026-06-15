import { useState } from "react";
import type { PracticeItem as PracticeItemData } from "../data/hour7";
import QuestionWalkthrough from "./QuestionWalkthrough";

/** A single inline NCLEX-style multiple-choice practice item with rationale reveal. */
export default function PracticeItem({ item }: { item: PracticeItemData }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const isCorrect = selected === item.answer;

  return (
    <section
      className="fl-card my-7 overflow-hidden"
      aria-label="Practice item"
    >
      <header className="flex items-center gap-2 border-b border-florence-line bg-florence-indigo-soft/60 px-5 py-3">
        <span className="fl-eyebrow text-florence-indigo-dark">
          Practice item
        </span>
        <span className="text-xs text-florence-slate">Select one answer</span>
      </header>

      <div className="px-5 py-5">
        <p className="mb-4 font-medium leading-relaxed text-florence-ink">
          {item.stem}
        </p>

        <div role="radiogroup" className="flex flex-col gap-2">
          {item.options.map((opt) => {
            const chosen = selected === opt.key;
            const isAnswer = opt.key === item.answer;
            let tone =
              "border-florence-line bg-white hover:border-florence-teal hover:bg-florence-teal-soft/40";
            if (revealed && isAnswer)
              tone = "border-vital-ok bg-emerald-50 text-emerald-900";
            else if (revealed && chosen && !isAnswer)
              tone = "border-vital-danger bg-red-50 text-red-900";
            else if (chosen)
              tone = "border-florence-teal bg-florence-teal-soft";

            return (
              <button
                key={opt.key}
                role="radio"
                aria-checked={chosen}
                disabled={revealed}
                onClick={() => setSelected(opt.key)}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default ${tone}`}
              >
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current text-xs font-semibold">
                  {opt.key}
                </span>
                <span className="leading-relaxed">{opt.text}</span>
                {revealed && isAnswer && (
                  <span className="ml-auto text-xs font-semibold text-vital-ok">
                    Correct
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-3">
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              disabled={!selected}
              className="rounded-lg bg-florence-indigo px-4 py-2 text-sm font-semibold text-white shadow-card transition-opacity disabled:opacity-40"
            >
              Check answer
            </button>
          ) : (
            <button
              onClick={() => {
                setRevealed(false);
                setSelected(null);
              }}
              className="rounded-lg border border-florence-line px-4 py-2 text-sm font-medium text-florence-slate hover:bg-florence-mist"
            >
              Try again
            </button>
          )}
          {revealed && (
            <span
              className={`text-sm font-semibold ${
                isCorrect ? "text-vital-ok" : "text-vital-danger"
              }`}
            >
              {isCorrect ? "Correct" : `Not quite — the answer is ${item.answer}`}
            </span>
          )}
        </div>

        {revealed && (
          <div className="mt-4 animate-fade-up rounded-xl border border-florence-line bg-florence-mist px-4 py-3">
            <QuestionWalkthrough
              questionId={item.id}
              optionTexts={item.options.map((o) => o.text)}
              fallbackRationale={item.rationale}
              {...(selected ? { chosenOptionIndex: item.options.findIndex((o) => o.key === selected) } : {})}
            />
          </div>
        )}
      </div>
    </section>
  );
}
