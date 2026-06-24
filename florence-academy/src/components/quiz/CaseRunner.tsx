import { useEffect, useState } from "react";
import QuestionBody from "./QuestionBody";
import LabDrawer from "./LabDrawer";
import Calculator from "./Calculator";
import Results from "./Results";
import { useCaseSession } from "../../lib/useCaseSession";
import { CAT_MODES, LEVEL_BY_KEY, type DifficultyLevel } from "../../lib/cat";
import {
  isAnswered,
  QUESTION_TYPE_LABELS,
  type CaseStudy,
  type Question,
} from "../../types/question";
import { CLIENT_NEED_LABEL, CJMM_LABEL } from "../../data/blueprint";

const CASES_PER_SESSION = 3;

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Plain-English difficulty band from a case's mean Rasch difficulty (logits). */
function band(b: number): string {
  if (b <= -1.1) return "Foundational";
  if (b <= -0.35) return "Easier";
  if (b < 0.45) return "Moderate";
  if (b < 1.0) return "Challenging";
  return "Hard";
}

export default function CaseRunner({
  cases,
  caseItems,
  level,
  onExit,
  onRestart,
}: {
  cases: CaseStudy[];
  caseItems: Question[];
  level: DifficultyLevel;
  onExit: () => void;
  onRestart: () => void;
}) {
  const s = useCaseSession(cases, caseItems, {
    startTheta: LEVEL_BY_KEY[level].startTheta,
    passTheta: 0,
    caseLimit: CASES_PER_SESSION,
  });
  const [tab, setTab] = useState(0);
  const [labOpen, setLabOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  const currentId = s.current?.id;
  useEffect(() => setTab(0), [currentId]); // reset tabs when the case changes

  useEffect(() => {
    if (s.phase === "finished") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [s.phase]);

  if (s.phase === "finished") {
    return (
      <div className="min-h-screen bg-florence-mist">
        <ClimbSummary results={s.results} />
        <Results
          history={s.history}
          ability={s.ability}
          outcome={undefined}
          stopReason="running"
          config={CAT_MODES.tutor}
          elapsedMs={(s.finishedAt ?? Date.now()) - s.startedAt}
          markedCount={0}
          onRestart={onRestart}
          onExit={onExit}
        />
      </div>
    );
  }

  if (s.phase === "case-complete") {
    const last = s.results[s.results.length - 1];
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <p className="fl-eyebrow">Case {s.answeredCaseCount} complete</p>
        <h1 className="mt-1 text-3xl font-semibold">{last?.title}</h1>
        <p className="mt-2 text-florence-slate">
          You scored{" "}
          <span className="font-semibold text-florence-ink">
            {Math.round((last?.meanScore ?? 0) * 100)}%
          </span>{" "}
          across the six clinical-judgment steps.
        </p>

        <div className="fl-card mt-6 p-5">
          <p className="text-sm font-semibold text-florence-ink">
            How the difficulty is adapting
          </p>
          <p className="mt-1 text-sm text-florence-slate">
            FlorenceRN re-estimated your ability and is choosing the next case to
            match. Your ability estimate is{" "}
            <span className="font-mono font-semibold text-florence-ink">
              {s.ability.theta.toFixed(2)}
            </span>{" "}
            logits.
          </p>
          <div className="mt-4">
            <ClimbStrip results={s.results} />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={s.nextCase}
            className="rounded-xl bg-florence-indigo px-5 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark"
          >
            {s.isLastCase ? "Final case →" : "Next case →"}
          </button>
          <button
            onClick={s.endNow}
            className="rounded-xl border border-florence-line bg-white px-5 py-3 text-sm font-semibold text-florence-ink hover:bg-florence-mist"
          >
            End &amp; see results
          </button>
        </div>
      </div>
    );
  }

  const item = s.item;
  const caseStudy = s.current;
  if (!item || !caseStudy) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center text-florence-slate">
        No unfolding cases are available.
        <div className="mt-4">
          <button onClick={onExit} className="fl-pill">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  const { question, answer, grade } = item;
  const canSubmit = isAnswered(question, answer);
  const isLastItem = s.itemIndex >= s.itemCount - 1;

  const verdict =
    grade && s.revealed
      ? grade.score > 0.999
        ? { label: "Correct", cls: "text-vital-ok", panel: "border-vital-ok bg-emerald-50" }
        : grade.score > 0
          ? { label: `Partially correct (${Math.round(grade.score * 100)}%)`, cls: "text-vital-warn", panel: "border-vital-warn bg-amber-50" }
          : { label: "Incorrect", cls: "text-vital-danger", panel: "border-vital-danger bg-red-50" }
      : null;

  return (
    <div className="min-h-screen bg-florence-mist pb-28">
      {/* Top bar */}
      <div className="sticky top-16 z-30 border-b border-florence-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-florence-ink">
              Case {s.caseNumber}
              <span className="text-florence-slate"> / {s.caseLimit}</span>
            </span>
            <span className="fl-pill border-florence-teal/40 bg-florence-teal-soft text-florence-teal-dark">
              {band(s.results.length ? s.ability.theta : LEVEL_BY_KEY[level].startTheta)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="fl-pill font-mono" aria-label="Elapsed time">
              ⏱ {fmt(now - s.startedAt)}
            </span>
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
              onClick={s.endNow}
              className="fl-pill hover:bg-florence-mist"
              title="End session and see results"
            >
              End
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-florence-slate">
          NGN Unfolding Case
        </p>
        <h2 className="mt-1 text-xl font-semibold text-florence-ink">
          {caseStudy.title}
        </h2>

        {/* CJMM step stepper across the six items of this case */}
        <StepDots items={s.items} current={s.itemIndex} />

        {/* Shared scenario, as tabs (persistent across all six items) */}
        <div className="fl-card mt-4 overflow-hidden">
          <div className="flex flex-wrap gap-1 border-b border-florence-line bg-florence-mist/50 p-1.5">
            {caseStudy.tabs.map((t, i) => (
              <button
                key={i}
                onClick={() => setTab(i)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === i
                    ? "bg-white text-florence-ink shadow-card"
                    : "text-florence-slate hover:text-florence-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="whitespace-pre-line p-4 text-sm leading-relaxed text-florence-ink/90">
            {caseStudy.tabs[tab]?.body}
          </div>
        </div>

        {/* The current clinical-judgment item */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="fl-pill border-florence-teal/40 bg-florence-teal-soft text-florence-teal-dark">
            {QUESTION_TYPE_LABELS[question.type]}
          </span>
          <span className="fl-pill">{CLIENT_NEED_LABEL[question.clientNeed]}</span>
          {question.cjmm && (
            <span className="fl-pill border-florence-indigo/30 text-florence-indigo-dark">
              {CJMM_LABEL[question.cjmm]}
            </span>
          )}
          <span className="ml-auto text-xs text-florence-slate">
            Step {s.itemIndex + 1} of {s.itemCount}
          </span>
        </div>

        <div className="fl-card mt-3 p-5 sm:p-6">
          <p className="mb-5 text-base leading-relaxed text-florence-ink">
            {question.stem}
          </p>

          <QuestionBody
            question={question}
            answer={answer}
            onChange={s.setAnswer}
            revealed={s.revealed}
            disabled={s.submitted}
            tutorContext={{
              source: "NGN unfolding case",
              caseTitle: caseStudy.title,
              caseTabs: caseStudy.tabs,
            }}
          />

          {verdict && (
            <div className={`mt-5 rounded-xl border p-4 ${verdict.panel}`}>
              <p className={`text-sm font-bold ${verdict.cls}`}>{verdict.label}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-florence-ink/90">
                {question.rationale}
              </p>
              {question.reference && (
                <p className="mt-2 text-xs font-medium text-florence-slate">
                  {question.reference}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-florence-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <p className="text-xs text-florence-slate">
            {s.revealed
              ? "Review the rationale, then continue the case."
              : "Answer, then submit to see the rationale - right or wrong."}
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
              {isLastItem ? "Finish case →" : "Next →"}
            </button>
          )}
        </div>
      </div>

      <LabDrawer open={labOpen} onClose={() => setLabOpen(false)} />
      <Calculator open={calcOpen} onClose={() => setCalcOpen(false)} />
    </div>
  );
}

/** Six dots tracking progress through the CJMM steps of one case. */
function StepDots({
  items,
  current,
}: {
  items: { grade?: { score: number } }[];
  current: number;
}) {
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {items.map((it, i) => {
        const score = it.grade?.score;
        let cls = "bg-florence-line";
        if (score !== undefined) {
          cls =
            score > 0.999
              ? "bg-vital-ok"
              : score > 0
                ? "bg-vital-warn"
                : "bg-vital-danger";
        } else if (i === current) {
          cls = "bg-florence-teal ring-2 ring-florence-teal/30";
        }
        return <span key={i} className={`h-2 w-8 rounded-full ${cls}`} />;
      })}
    </div>
  );
}

/** Compact bars showing each completed case's difficulty + score (the "climb"). */
function ClimbStrip({
  results,
}: {
  results: { caseId: string; title: string; meanScore: number; difficulty: number }[];
}) {
  return (
    <div className="space-y-2">
      {results.map((r, i) => (
        <div key={r.caseId} className="flex items-center gap-3 text-sm">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-florence-mist text-xs font-bold text-florence-slate">
            {i + 1}
          </span>
          <span className="w-24 shrink-0 text-xs font-medium text-florence-slate">
            {band(r.difficulty)}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-florence-mist">
            <div
              className={`h-full rounded-full ${
                r.meanScore >= 0.7
                  ? "bg-vital-ok"
                  : r.meanScore >= 0.5
                    ? "bg-vital-warn"
                    : "bg-vital-danger"
              }`}
              style={{ width: `${Math.max(4, r.meanScore * 100)}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-xs font-semibold text-florence-ink">
            {Math.round(r.meanScore * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}

/** Header band on the finished screen summarizing the difficulty climb. */
function ClimbSummary({
  results,
}: {
  results: { caseId: string; title: string; meanScore: number; difficulty: number }[];
}) {
  if (results.length === 0) return null;
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <p className="fl-eyebrow">Unfolding-case session</p>
      <h2 className="mt-1 text-lg font-semibold text-florence-ink">
        Your difficulty climb
      </h2>
      <div className="fl-card mt-3 p-4">
        <ClimbStrip results={results} />
      </div>
    </div>
  );
}
