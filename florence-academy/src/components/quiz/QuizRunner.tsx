import { useEffect, useState } from "react";
import QuestionBody from "./QuestionBody";
import LabDrawer from "./LabDrawer";
import Calculator from "./Calculator";
import Results from "./Results";
import { useCatSession } from "../../lib/useCatSession";
import { useFocusTrap } from "../../lib/useFocusTrap";
import { pacing, type CatConfig } from "../../lib/cat";
import {
  isAnswered,
  QUESTION_TYPE_LABELS,
  type Question,
} from "../../types/question";
import { CLIENT_NEED_LABEL, CJMM_LABEL } from "../../data/blueprint";
import QuestionWalkthrough from "../QuestionWalkthrough";
import { optionTextsOf, chosenIndexOf } from "../../lib/walkthrough";

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export default function QuizRunner({
  pool,
  config,
  title,
  onExit,
  onRestart,
}: {
  pool: Question[];
  config: CatConfig;
  title: string;
  onExit: () => void;
  onRestart: () => void;
}) {
  const s = useCatSession(pool, config);
  const [labOpen, setLabOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (s.phase !== "active") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [s.phase]);

  // Timed tests auto-submit the moment the countdown reaches zero — but never
  // while paused, when the clock is deliberately frozen for a break.
  useEffect(() => {
    if (s.phase !== "active" || s.deadlineAt == null || s.paused) return;
    if (now >= s.deadlineAt) s.timeUp();
  }, [now, s.phase, s.deadlineAt, s.paused, s.timeUp]);

  // Guard against losing an in-progress session to an accidental refresh, tab
  // close, or browser-back — the native prompt gives a chance to stay.
  useEffect(() => {
    if (s.phase !== "active") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [s.phase]);

  if (s.phase === "finished") {
    return (
      <Results
        history={s.history}
        ability={s.ability}
        outcome={s.outcome}
        stopReason={s.stopReason}
        config={config}
        elapsedMs={(s.finishedAt ?? Date.now()) - s.startedAt - s.pausedMs}
        markedCount={marked.size}
        onRestart={onRestart}
        onExit={onExit}
      />
    );
  }

  const item = s.current;
  if (!item) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center text-florence-slate">
        No items available in this pool.
        <div className="mt-4">
          <button onClick={onExit} className="fl-pill">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  const { question, answer, grade } = item;
  const fixedLength = config.minItems === config.maxItems;
  const itemNumber = s.index + 1;
  const progress = Math.min(100, (itemNumber / config.maxItems) * 100);
  const canSubmit = isAnswered(question, answer);
  const isLast = s.answeredCount >= config.maxItems;
  const timed = s.deadlineAt != null;
  // While paused the clock reads from the pause instant, so the countdown and
  // the elapsed timer both freeze instead of bleeding time during the break.
  const effectiveNow = s.paused && s.pausedAt != null ? s.pausedAt : now;
  const pace = timed ? pacing(s.deadlineAt!, effectiveNow) : null;

  const verdict =
    grade && s.revealed
      ? grade.score > 0.999
        ? { label: "Correct", cls: "text-vital-ok", panel: "border-vital-ok bg-emerald-50" }
        : grade.score > 0
          ? { label: `Partially correct (${Math.round(grade.score * 100)}%)`, cls: "text-vital-warn", panel: "border-vital-warn bg-amber-50" }
          : { label: "Incorrect", cls: "text-vital-danger", panel: "border-vital-danger bg-red-50" }
      : null;

  const toggleMark = () =>
    setMarked((prev) => {
      const set = new Set(prev);
      set.has(question.id) ? set.delete(question.id) : set.add(question.id);
      return set;
    });

  return (
    <div className="min-h-screen bg-florence-mist pb-28">
      {/* Top bar */}
      <div className="sticky top-16 z-30 border-b border-florence-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-florence-ink">
              Item {itemNumber}
              {fixedLength && (
                <span className="text-florence-slate"> / {config.maxItems}</span>
              )}
            </span>
            <button
              onClick={toggleMark}
              className={`fl-pill ${
                marked.has(question.id)
                  ? "border-florence-indigo bg-florence-indigo-soft text-florence-indigo-dark"
                  : ""
              }`}
              aria-pressed={marked.has(question.id)}
            >
              <span aria-hidden>⚑</span>
              {marked.has(question.id) ? "Flagged" : "Flag"}
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            {timed && pace ? (
              <span
                className={`fl-pill font-mono tabular-nums ${
                  pace.tier === "critical"
                    ? "border-vital-danger bg-red-50 text-vital-danger animate-pulse"
                    : pace.tier === "warning"
                      ? "border-vital-warn bg-amber-50 text-amber-700"
                      : ""
                }`}
                aria-label="Time remaining"
                title="Time remaining — the test submits automatically at zero"
              >
                ⏳ {fmt(pace.remainingSec * 1000)}
              </span>
            ) : (
              <span className="fl-pill font-mono" aria-label="Elapsed time">
                ⏱ {fmt(effectiveNow - s.startedAt - s.pausedMs)}
              </span>
            )}
            <button onClick={() => setLabOpen(true)} className="fl-pill hover:bg-florence-mist">
              Lab values
            </button>
            <button
              onClick={() => setCalcOpen((o) => !o)}
              className={`fl-pill hover:bg-florence-mist ${calcOpen ? "border-florence-teal text-florence-teal-dark" : ""}`}
            >
              Calculator
            </button>
            <button
              onClick={s.pause}
              className="fl-pill hover:bg-florence-mist"
              title="Pause — freezes the timer until you resume"
            >
              <span aria-hidden>⏸</span> Pause
            </button>
            <button
              onClick={() => (s.answeredCount > 0 ? setConfirmEnd(true) : s.endNow())}
              className="fl-pill hover:bg-florence-mist"
              title="End session and see results"
            >
              End
            </button>
          </div>
        </div>
        <div className="h-0.5 w-full bg-florence-line">
          <div
            className="h-full bg-florence-gradient transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-4xl px-4 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-florence-slate">
          {title}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="fl-pill border-florence-teal/40 bg-florence-teal-soft text-florence-teal-dark">
            {QUESTION_TYPE_LABELS[question.type]}
          </span>
          <span className="fl-pill">{CLIENT_NEED_LABEL[question.clientNeed]}</span>
          {question.cjmm && (
            <span className="fl-pill border-florence-indigo/30 text-florence-indigo-dark">
              {CJMM_LABEL[question.cjmm]}
            </span>
          )}
        </div>

        <div className="fl-card mt-4 p-5 sm:p-6">
          {question.context && (
            <div className="mb-4 rounded-xl border border-florence-line bg-florence-mist/70 p-4 text-sm leading-relaxed text-florence-ink/90">
              <p className="fl-eyebrow mb-1">Scenario</p>
              {question.context}
            </div>
          )}
          <p className="mb-5 text-base leading-relaxed text-florence-ink">
            {question.stem}
          </p>

          <QuestionBody
            question={question}
            answer={answer}
            onChange={s.setAnswer}
            revealed={s.revealed}
            disabled={s.submitted}
          />

          {verdict && (
            <div className={`mt-5 rounded-xl border p-4 ${verdict.panel}`}>
              <p className={`text-sm font-bold ${verdict.cls}`}>{verdict.label}</p>
              <div className="mt-1.5">
                <QuestionWalkthrough
                  questionId={question.id}
                  optionTexts={optionTextsOf(question)}
                  fallbackRationale={question.rationale}
                  {...(question.reference ? { reference: question.reference } : {})}
                  {...(chosenIndexOf(question, answer) != null ? { chosenOptionIndex: chosenIndexOf(question, answer)! } : {})}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-florence-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <p className="text-xs text-florence-slate">
            {s.revealed
              ? "Review the rationale, then continue."
              : config.immediateFeedback
                ? "Answer, then submit to see the rationale."
                : "Answer, then submit. Difficulty adapts to your performance."}
          </p>
          {!s.submitted ? (
            <button
              onClick={s.submit}
              disabled={!canSubmit}
              className="rounded-xl bg-florence-teal px-6 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-teal-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit
            </button>
          ) : (
            <button
              onClick={s.next}
              className="rounded-xl bg-florence-indigo px-6 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark"
            >
              {isLast ? "See results →" : "Next →"}
            </button>
          )}
        </div>
      </div>

      <LabDrawer open={labOpen} onClose={() => setLabOpen(false)} />
      <Calculator open={calcOpen} onClose={() => setCalcOpen(false)} />

      {s.paused && (
        <PauseOverlay
          remainingLabel={pace ? fmt(pace.remainingSec * 1000) : null}
          onResume={s.resume}
        />
      )}
      {confirmEnd && (
        <ConfirmEnd
          answered={s.answeredCount}
          total={config.maxItems}
          fixedLength={fixedLength}
          onCancel={() => setConfirmEnd(false)}
          onConfirm={() => {
            setConfirmEnd(false);
            s.endNow();
          }}
        />
      )}
    </div>
  );
}

/** Full-screen break: freezes the clock and hides the question until resumed. */
function PauseOverlay({
  remainingLabel,
  onResume,
}: {
  remainingLabel: string | null;
  onResume: () => void;
}) {
  const ref = useFocusTrap<HTMLDivElement>(true);
  return (
    <div
      ref={ref}
      tabIndex={-1}
      onKeyDown={(e) => e.key === "Escape" && onResume()}
      className="fixed inset-0 z-50 grid place-items-center bg-florence-ink/85 px-5 outline-none backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Session paused"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div
          className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-florence-mist text-2xl"
          aria-hidden
        >
          ⏸
        </div>
        <h2 className="text-xl font-semibold text-florence-ink">Paused</h2>
        <p className="mt-1.5 text-sm text-florence-slate">
          {remainingLabel
            ? `The clock is frozen at ${remainingLabel}. The question is hidden until you resume.`
            : "Take a breather — the question is hidden until you resume."}
        </p>
        <button
          onClick={onResume}
          autoFocus
          className="mt-5 w-full rounded-xl bg-florence-teal px-5 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-teal-dark"
        >
          Resume
        </button>
      </div>
    </div>
  );
}

/** Confirms an early end so a slip never throws away an in-progress session. */
function ConfirmEnd({
  answered,
  total,
  fixedLength,
  onCancel,
  onConfirm,
}: {
  answered: number;
  total: number;
  fixedLength: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useFocusTrap<HTMLDivElement>(true);
  return (
    <div
      ref={ref}
      tabIndex={-1}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
      className="fixed inset-0 z-50 grid place-items-center bg-florence-ink/70 px-5 outline-none backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="End session?"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-florence-ink">End this session?</h2>
        <p className="mt-1.5 text-sm text-florence-slate">
          You've answered{" "}
          <span className="font-semibold text-florence-ink">{answered}</span>
          {fixedLength ? ` of ${total}` : ""} item{answered === 1 ? "" : "s"}. We'll
          score your results on what you've done so far — you can't resume after
          ending.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            autoFocus
            className="rounded-xl border border-florence-line bg-white px-4 py-2.5 text-sm font-semibold text-florence-ink hover:bg-florence-mist"
          >
            Keep going
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-vital-danger px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            End &amp; see results
          </button>
        </div>
      </div>
    </div>
  );
}
