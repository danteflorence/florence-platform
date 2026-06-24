import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import QuestionBody from "../components/quiz/QuestionBody";
import { MEDIA_BANK } from "../data/mediaBank";
import {
  emptyAnswer,
  gradeQuestion,
  isAnswered,
  QUESTION_TYPE_LABELS,
  type Answer,
  type Question,
} from "../types/question";

/**
 * Content-lab gallery for the image / media item types. Renders each scaffold
 * through the real QuestionBody + grading path so the team can review behaviour
 * (and screen-reader labels) before any artwork exists - each item shows a
 * "media pending" placeholder until a real asset is dropped into its `src`.
 */
export default function MediaPreview() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="fl-eyebrow">Content lab · scaffold</p>
      <h1 className="mt-1 text-3xl font-semibold">Image &amp; media item types</h1>
      <p className="mt-2 text-sm leading-relaxed text-florence-slate">
        Three NCLEX image item types - graphic hot-spot, graphic answer options,
        and a media exhibit - authored and fully gradable now. Each renders a
        “media&nbsp;pending” placeholder until artwork is supplied; drop a real
        image into the item’s <code className="rounded bg-florence-mist px-1">src</code> and it
        appears in place, no other change needed.
      </p>

      <div className="mt-8 space-y-6">
        {MEDIA_BANK.map((q) => (
          <ItemCard key={q.id} q={q} />
        ))}
      </div>

      <div className="mt-10">
        <Link
          to="/academy/practice"
          className="text-sm font-semibold text-florence-teal-dark hover:underline"
        >
          ← Back to practice
        </Link>
      </div>
    </div>
  );
}

function ItemCard({ q }: { q: Question }) {
  const [answer, setAnswer] = useState<Answer>(() => emptyAnswer(q));
  const [revealed, setRevealed] = useState(false);
  const grade = useMemo(
    () => (revealed ? gradeQuestion(q, answer) : null),
    [revealed, q, answer],
  );
  const answered = isAnswered(q, answer);

  return (
    <section className="fl-card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="fl-eyebrow">{QUESTION_TYPE_LABELS[q.type]}</span>
        {grade && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              grade.correct
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {Math.round(grade.score * 100)}%{grade.correct ? " · correct" : ""}
          </span>
        )}
      </div>

      <p className="mb-4 text-base font-semibold leading-snug text-florence-ink">
        {q.stem}
      </p>

      <QuestionBody
        question={q}
        answer={answer}
        onChange={(u) =>
          setAnswer((prev) => (typeof u === "function" ? u(prev) : u))
        }
        revealed={revealed}
        disabled={revealed}
      />

      <div className="mt-4 flex items-center gap-3">
        {!revealed ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            disabled={!answered}
            className="rounded-xl bg-florence-indigo px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark disabled:opacity-40"
          >
            Check answer
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setAnswer(emptyAnswer(q));
              setRevealed(false);
            }}
            className="rounded-xl border border-florence-line bg-white px-5 py-2.5 text-sm font-semibold text-florence-ink hover:bg-florence-mist"
          >
            Try again
          </button>
        )}
      </div>

      {revealed && (
        <div className="mt-4 rounded-xl border border-florence-line bg-florence-mist/50 p-4">
          <p className="fl-eyebrow mb-1">Rationale</p>
          <p className="text-sm leading-relaxed text-florence-ink/90">
            {q.rationale}
          </p>
          {q.reference && (
            <p className="mt-2 text-xs font-medium text-florence-slate">
              {q.reference}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
