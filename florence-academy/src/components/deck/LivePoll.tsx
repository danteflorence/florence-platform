import { useEffect, useState } from "react";
import type { PollView } from "../../lib/liveProtocol";
import { CJMM_STEPS } from "../../data/blueprint";

interface LivePollProps {
  poll: PollView | null;
  isInstructor: boolean;
  /** Headcount used as the "answered" denominator. */
  studentsPresent: number;
  /** Instructor-only: present when the current slide has a pushable item and
   *  no poll is live yet. Launches that item as a live poll. */
  onLaunch?: () => void;
  onAnswer: (choice: number) => void;
  onReveal: () => void;
  onClose: () => void;
}

const letter = (i: number) => String.fromCharCode(65 + i); // 0→A, 1→B …

/**
 * The live-poll layer that floats over the deck. Instructors push a question,
 * watch responses land in real time, then reveal the answer to the whole room
 * at once. Students get big tap targets and — until the reveal — only their own
 * choice, never the running tally (so the class doesn't herd toward a leader).
 */
export default function LivePoll({
  poll,
  isInstructor,
  studentsPresent,
  onLaunch,
  onAnswer,
  onReveal,
  onClose,
}: LivePollProps) {
  const [myChoice, setMyChoice] = useState<number | null>(null);

  // Reset the local selection whenever a new poll opens.
  useEffect(() => {
    setMyChoice(null);
  }, [poll?.id]);

  // No poll live: instructors on a pushable slide get a launch button.
  if (!poll) {
    if (isInstructor && onLaunch) {
      return (
        <button
          type="button"
          onClick={onLaunch}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-florence-indigo px-5 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark"
          title="Push this question to the room as a live poll"
        >
          <span aria-hidden>📊</span> Poll the room
        </button>
      );
    }
    return null;
  }

  const total = poll.total;
  const correct = new Set(poll.correct ?? []);
  const revealed = poll.revealed;
  // The NGN Clinical Judgment step this question exercises, surfaced always.
  const step = poll.cjmm
    ? CJMM_STEPS.find((s) => s.key === poll.cjmm)
    : undefined;
  const showTally = isInstructor || revealed; // students stay blind until reveal
  const answering = !isInstructor && poll.open && !revealed;
  const denom = Math.max(studentsPresent, total);
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3">
      <section
        aria-label={revealed ? "Poll results" : "Live poll"}
        className="w-full max-w-3xl rounded-2xl border border-florence-line bg-white shadow-2xl ring-1 ring-black/5"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-florence-line px-5 py-3">
          <span className="inline-flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${revealed ? "bg-florence-indigo" : "bg-vital-danger animate-pulse"}`} />
            <span className="fl-eyebrow">{revealed ? "Poll results" : "Live poll"}</span>
          </span>
          <span className="flex items-center gap-3">
            {(isInstructor || revealed) && (
              <span className="text-sm font-medium text-florence-slate">
                <span className="tabular-nums font-bold text-florence-ink">{total}</span>
                {denom > 0 && <span className="text-florence-slate/70"> / {denom}</span>} answered
              </span>
            )}
            {isInstructor && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close poll"
                className="rounded-lg px-2 py-1 text-sm font-medium text-florence-slate transition-colors hover:bg-florence-mist hover:text-florence-ink"
                title="Close the poll"
              >
                <span aria-hidden>✕</span>
              </button>
            )}
          </span>
        </div>

        {/* Body */}
        <div className="max-h-[46vh] overflow-y-auto px-5 py-4">
          {step && (
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-florence-indigo/20 bg-florence-indigo/5 px-3 py-1 text-[11px] font-semibold text-florence-indigo-dark">
              <span aria-hidden>🧠</span>
              Clinical Judgment · Step {step.order} of 6 · {step.label}
            </div>
          )}
          <p className="mb-4 text-base font-semibold leading-snug text-florence-ink">
            {poll.prompt}
          </p>

          <div className="space-y-2.5" role="group" aria-label="Answer options">
            {poll.options.map((opt, i) => {
              const isMine = myChoice === i;
              const isCorrect = revealed && correct.has(i);
              const isMyWrong = revealed && isMine && !correct.has(i);

              // Student, poll open → tap targets.
              if (answering) {
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={isMine}
                    aria-label={`Option ${letter(i)}: ${opt}`}
                    onClick={() => {
                      setMyChoice(i);
                      onAnswer(i);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                      isMine
                        ? "border-florence-teal bg-florence-teal-soft/50 ring-2 ring-florence-teal/40"
                        : "border-florence-line bg-white hover:border-florence-teal/50 hover:bg-florence-mist"
                    }`}
                  >
                    <span aria-hidden className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${isMine ? "bg-florence-teal text-white" : "bg-florence-mist text-florence-slate"}`}>
                      {letter(i)}
                    </span>
                    <span className="text-sm leading-snug text-florence-ink">{opt}</span>
                  </button>
                );
              }

              // Instructor (any time) or anyone after reveal → distribution bars.
              const count = poll.counts[i] ?? 0;
              const width = showTally ? pct(count) : 0;
              return (
                <div
                  key={i}
                  className={`relative overflow-hidden rounded-xl border px-4 py-3 ${
                    isCorrect
                      ? "border-vital-ok/50 bg-vital-ok/5"
                      : isMyWrong
                        ? "border-vital-danger/50 bg-vital-danger/5"
                        : "border-florence-line bg-white"
                  }`}
                >
                  {showTally && (
                    <div
                      className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                        isCorrect ? "bg-vital-ok/15" : "bg-florence-teal/10"
                      }`}
                      style={{ width: `${width}%` }}
                      aria-hidden
                    />
                  )}
                  <div className="relative flex items-center gap-3">
                    <span aria-hidden className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${
                      isCorrect ? "bg-vital-ok text-white" : isMyWrong ? "bg-vital-danger text-white" : "bg-florence-mist text-florence-slate"
                    }`}>
                      {isCorrect ? "✓" : letter(i)}
                    </span>
                    <span className="flex-1 text-sm leading-snug text-florence-ink">
                      <span className="sr-only">
                        {`Option ${letter(i)}${isCorrect ? ", correct answer" : ""}${isMyWrong ? ", your answer, incorrect" : ""}: `}
                      </span>
                      {opt}
                      {isMine && (
                        <span className="ml-2 rounded-full bg-florence-ink/5 px-2 py-0.5 text-[11px] font-semibold text-florence-slate">
                          your answer
                        </span>
                      )}
                    </span>
                    {showTally && (
                      <span className="shrink-0 tabular-nums text-sm font-semibold text-florence-slate">
                        {count}
                        <span className="ml-1 text-xs font-normal text-florence-slate/60">{pct(count)}%</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rationale — shown to the whole room on reveal, right or wrong. */}
          {revealed && poll.rationale && (
            <div className="mt-4 rounded-xl border border-florence-line bg-florence-mist/50 p-4">
              <div className="mb-1.5 flex items-center gap-2">
                <span aria-hidden>💡</span>
                <span className="fl-eyebrow">Why — rationale</span>
              </div>
              <p className="text-sm leading-relaxed text-florence-ink/90">
                {poll.rationale}
              </p>
              {step && (
                <p className="mt-2.5 text-xs leading-relaxed text-florence-slate">
                  <span className="font-semibold text-florence-indigo-dark">
                    {`Clinical Judgment · ${step.label}: `}
                  </span>
                  {step.blurb}
                </p>
              )}
              {poll.reference && (
                <p className="mt-2 text-[11px] font-medium text-florence-slate/80">
                  {poll.reference}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-florence-line px-5 py-3">
          <StatusLine
            isInstructor={isInstructor}
            revealed={revealed}
            answered={myChoice != null}
            myCorrect={myChoice != null && correct.has(myChoice)}
          />
          {isInstructor &&
            (revealed ? (
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-xl bg-florence-ink px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Close poll
              </button>
            ) : (
              <button
                type="button"
                onClick={onReveal}
                className="shrink-0 rounded-xl bg-florence-indigo px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark"
              >
                Reveal answer
              </button>
            ))}
        </div>
      </section>
    </div>
  );
}

function StatusLine({
  isInstructor,
  revealed,
  answered,
  myCorrect,
}: {
  isInstructor: boolean;
  revealed: boolean;
  answered: boolean;
  myCorrect: boolean;
}) {
  let text = "";
  let tone = "text-florence-slate";
  if (isInstructor) {
    text = revealed
      ? "Answer shown to the room."
      : "Responses are landing live — reveal when you’re ready.";
  } else if (revealed) {
    if (!answered) text = "The instructor revealed the answer.";
    else if (myCorrect) {
      text = "✓ Correct — nicely done.";
      tone = "text-vital-ok font-semibold";
    } else {
      text = "Not quite — the correct answer is highlighted.";
      tone = "text-vital-danger font-medium";
    }
  } else if (answered) {
    text = "✓ Answer locked in. Tap another to change it.";
    tone = "text-florence-teal-dark font-medium";
  } else {
    text = "Tap your answer above.";
  }
  return (
    <span role="status" aria-live="polite" className={`text-sm ${tone}`}>
      {text}
    </span>
  );
}
