import { useEffect } from "react";
import {
  categoryBreakdown,
  type AbilityEstimate,
  type CatConfig,
} from "../../lib/cat";
import type { SessionItem } from "../../lib/useCatSession";
import QuestionWalkthrough from "../QuestionWalkthrough";
import QuestionTutorButton from "../QuestionTutorButton";
import { optionTextsOf, chosenIndexOf } from "../../lib/walkthrough";
import {
  isReportingEnabled,
  kindFromConfig,
  reportAssessmentResult,
  sessionReporterConfig,
  summaryFromSession,
} from "../../lib/academyApi";
import { useCandidate } from "../../lib/CandidateContext";
import { CLIENT_NEED_LABEL } from "../../data/blueprint";
import { QUESTION_TYPE_LABELS, type ClientNeed } from "../../types/question";

const STOP_LABEL: Record<string, string> = {
  ci: "Reached a statistically confident result (95% confidence rule).",
  "max-length": "Reached the session length.",
  "pool-exhausted": "Answered every available item.",
  time: "Time expired - the countdown ran out.",
  ended: "Session ended early.",
  running: "Session complete.",
};

function fmt(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}

function barTone(score: number): string {
  if (score >= 0.7) return "bg-vital-ok";
  if (score >= 0.5) return "bg-vital-warn";
  return "bg-vital-danger";
}

export default function Results({
  history,
  ability,
  outcome,
  stopReason,
  config,
  elapsedMs,
  markedCount,
  onRestart,
  onExit,
}: {
  history: SessionItem[];
  ability: AbilityEstimate;
  outcome?: "pass" | "fail";
  stopReason?: string;
  config: CatConfig;
  elapsedMs: number;
  markedCount: number;
  onRestart: () => void;
  onExit: () => void;
}) {
  const { refreshReadiness } = useCandidate();
  // Report this finished session to the Data API using the signed-in candidate's
  // live session token (falls back to env, else a no-op). Fires once on mount,
  // then refreshes the learner's readiness band from the new result.
  useEffect(() => {
    const cfg = sessionReporterConfig();
    if (!isReportingEnabled(cfg) || !cfg.candidateId) return;
    void (async () => {
      const sent = await reportAssessmentResult(
        summaryFromSession({
          candidateId: cfg.candidateId!,
          kind: kindFromConfig(config),
          history,
          ability,
        }),
        cfg,
      );
      if (sent) void refreshReadiness();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const graded = history.filter((h) => h.grade);
  const answered = graded.length;
  const correctCount = graded.filter((h) => h.grade!.score > 0.999).length;
  const pctCorrect = answered === 0 ? 0 : (correctCount / answered) * 100;
  const passPct = Math.round(ability.passProb * 100);

  const responses = graded.map((h) => ({
    id: h.question.id,
    difficulty: h.question.difficulty,
    clientNeed: h.question.clientNeed,
    score: h.grade!.score,
  }));
  const cats = categoryBreakdown(responses);

  // Average time per item within each Client Need - shows where pacing drags so
  // a learner knows which content areas to drill *faster*, not just more.
  const paceByNeed = new Map<ClientNeed, { ms: number; n: number }>();
  for (const h of graded) {
    if (h.spentMs == null) continue;
    const cur = paceByNeed.get(h.question.clientNeed) ?? { ms: 0, n: 0 };
    cur.ms += h.spentMs;
    cur.n += 1;
    paceByNeed.set(h.question.clientNeed, cur);
  }
  const avgSecFor = (need: ClientNeed): number | null => {
    const p = paceByNeed.get(need);
    return p && p.n ? Math.round(p.ms / p.n / 1000) : null;
  };

  const showOutcome = config.useCiRule && outcome;
  const outcomeBanner =
    outcome === "pass"
      ? { text: "Projected: above the passing standard", cls: "border-vital-ok bg-emerald-50 text-emerald-900" }
      : { text: "Projected: below the passing standard - keep practicing", cls: "border-vital-danger bg-red-50 text-red-900" };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="fl-eyebrow">Session complete</p>
      <h1 className="mt-1 text-3xl font-semibold">Your performance</h1>
      <p className="mt-1 text-sm text-florence-slate">
        {STOP_LABEL[stopReason ?? "running"] ?? "Session complete."}
      </p>

      {showOutcome && (
        <div className={`mt-5 rounded-2xl border p-4 text-sm font-semibold ${outcomeBanner.cls}`}>
          {outcomeBanner.text}
        </div>
      )}

      {/* Headline metrics */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric value={`${passPct}%`} label="Projected pass probability" big />
        <Metric value={`${Math.round(pctCorrect)}%`} label="Answered correctly" />
        <Metric value={String(answered)} label="Items completed" />
        <Metric value={fmt(elapsedMs)} label="Time on task" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric value={ability.theta.toFixed(2)} label="Ability est. (logits)" sub />
        <Metric value={`±${(1.96 * ability.se).toFixed(2)}`} label="95% CI half-width" sub />
        <Metric
          value={answered ? `${Math.round(elapsedMs / 1000 / answered)}s` : "-"}
          label="Avg / item (stamina)"
          sub
        />
        <Metric value={String(markedCount)} label="Flagged for review" sub />
      </div>

      {/* Category breakdown */}
      <h2 className="mt-9 text-lg font-semibold">By Client Need category</h2>
      <div className="mt-3 space-y-2.5">
        {cats.map((c) => (
          <div key={c.clientNeed} className="fl-card p-3">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-florence-ink">
                {CLIENT_NEED_LABEL[c.clientNeed]}
              </span>
              <span className="text-florence-slate">
                {Math.round(c.meanScore * 100)}% · {c.count}{" "}
                {c.count === 1 ? "item" : "items"}
                {avgSecFor(c.clientNeed) != null && (
                  <>
                    {" · "}
                    <span className="tabular-nums">{avgSecFor(c.clientNeed)}s</span>{" "}
                    avg
                  </>
                )}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-florence-mist">
              <div
                className={`h-full rounded-full ${barTone(c.meanScore)}`}
                style={{ width: `${Math.max(3, c.meanScore * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Item review */}
      <h2 className="mt-9 text-lg font-semibold">Review every item</h2>
      <div className="mt-3 space-y-2">
        {graded.map((h, i) => {
          const score = h.grade!.score;
          const badge =
            score > 0.999
              ? { t: "Correct", c: "text-vital-ok" }
              : score > 0
                ? { t: `${Math.round(score * 100)}%`, c: "text-vital-warn" }
                : { t: "Incorrect", c: "text-vital-danger" };
          return (
            <details key={h.question.id} className="fl-card overflow-hidden">
              <summary className="flex cursor-pointer items-center gap-3 p-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-florence-mist text-xs font-bold text-florence-slate">
                  {i + 1}
                </span>
                <span className={`w-20 shrink-0 text-xs font-bold ${badge.c}`}>
                  {badge.t}
                </span>
                <span className="flex-1 truncate text-florence-ink">
                  {h.question.stem}
                </span>
                {h.spentMs != null && (
                  <span className="hidden shrink-0 tabular-nums text-[11px] text-florence-slate/80 sm:block">
                    {Math.round(h.spentMs / 1000)}s
                  </span>
                )}
                <span className="hidden shrink-0 text-[11px] text-florence-slate sm:block">
                  {QUESTION_TYPE_LABELS[h.question.type]}
                </span>
              </summary>
              <div className="border-t border-florence-line bg-florence-mist/40 p-4 text-sm">
                <div className="mb-3 flex justify-end">
                  <QuestionTutorButton
                    question={h.question}
                    answer={h.answer}
                    revealed
                    context={{ source: "Session review" }}
                    compact
                  />
                </div>
                <QuestionWalkthrough
                  questionId={h.question.id}
                  optionTexts={optionTextsOf(h.question)}
                  fallbackRationale={h.question.rationale}
                  {...(h.question.reference ? { reference: h.question.reference } : {})}
                  {...(chosenIndexOf(h.question, h.answer) != null ? { chosenOptionIndex: chosenIndexOf(h.question, h.answer)! } : {})}
                />
              </div>
            </details>
          );
        })}
      </div>

      <div className="mt-9 flex flex-wrap gap-3">
        <button
          onClick={onRestart}
          className="rounded-xl bg-florence-indigo px-5 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark"
        >
          Start another session
        </button>
        <button
          onClick={onExit}
          className="rounded-xl border border-florence-line bg-white px-5 py-3 text-sm font-semibold text-florence-ink hover:bg-florence-mist"
        >
          Back to practice menu
        </button>
      </div>

      <p className="mt-6 text-[11px] leading-relaxed text-florence-slate/70">
        Pass probability is an estimate from a Rasch ability model on this
        practice pool - a study signal, not a prediction of your actual NCLEX
        result.
      </p>
    </div>
  );
}

function Metric({
  value,
  label,
  big,
  sub,
}: {
  value: string;
  label: string;
  big?: boolean;
  sub?: boolean;
}) {
  return (
    <div
      className={`fl-card p-3 ${big ? "ring-1 ring-florence-teal/30" : ""}`}
    >
      <p
        className={`font-semibold ${
          big ? "text-3xl text-florence-teal-dark" : sub ? "text-lg" : "text-2xl"
        } text-florence-ink`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] leading-tight text-florence-slate">
        {label}
      </p>
    </div>
  );
}
