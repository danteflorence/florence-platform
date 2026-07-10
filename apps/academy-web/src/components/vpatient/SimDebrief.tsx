// ───────────────────────────────────────────────────────────────────────────
// Sim debrief - where a virtual-patient run turns into clinical judgment.
// Evidence is unambiguous that the DEBRIEF (not the sim modality) moves pass
// rates, so this is the payload, not a footnote:
//   1. outcome frame + your timeline vs the optimal timeline
//   2. cues caught vs missed
//   3. decision-by-decision verdicts with the SAME reasoning-error taxonomy
//      chips as QuestionWalkthrough, each linking to remediation
//   4. "Re-run with hints" (deliberate practice; hinted runs down-weighted)
//
// Side effect: on mount it POSTs the scored run through the EXISTING
// assessment-results reporter as kind:"simulation" (fire-and-forget), so a sim
// feeds readiness / remediation / the copilot with no bespoke backend.
// ───────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import type { VPatientScenario } from "../../data/vpatient/types";
import type { SimState } from "../../lib/vpatient/engine";
import { evaluate, toAssessmentSummary, type DecisionVerdict } from "../../lib/vpatient/score";
import { ERROR_TYPE_LABEL, type ErrorType } from "../../lib/walkthrough";
import { useCandidate } from "../../lib/CandidateContext";
import {
  isReportingEnabled,
  reportAssessmentResult,
  sessionReporterConfig,
} from "../../lib/academyApi";

const VERDICT_STYLE: Record<DecisionVerdict, { label: string; cls: string }> = {
  met: { label: "Met", cls: "bg-vital-ok/15 text-emerald-800 ring-vital-ok/40" },
  late: { label: "Late", cls: "bg-vital-warn/15 text-amber-800 ring-vital-warn/40" },
  missed: { label: "Missed", cls: "bg-vital-danger/15 text-red-800 ring-vital-danger/40" },
  harmful: { label: "Harmful", cls: "bg-vital-danger/20 text-red-900 ring-vital-danger/60" },
  na: { label: "N/A", cls: "bg-florence-mist text-florence-slate ring-florence-line" },
};

function mmss(sec: number): string {
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

export default function SimDebrief({
  scenario,
  state,
  onReplay,
}: {
  scenario: VPatientScenario;
  state: SimState;
  onReplay: () => void;
}) {
  const ev = useMemo(() => evaluate(state, scenario), [state, scenario]);
  const { candidate, refreshReadiness } = useCandidate();
  const reported = useRef(false);

  // Report the run once (kind:"simulation"). Hinted runs are marked and, per
  // the score module, carry no readiness value - so they inform dimensions
  // without flattering the band.
  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    const cfg = sessionReporterConfig();
    if (!isReportingEnabled(cfg) || !cfg.candidateId || state.hinted) return;
    void (async () => {
      const ok = await reportAssessmentResult(toAssessmentSummary(ev, cfg.candidateId!), cfg);
      if (ok) void refreshReadiness();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const optimal = scenario.debrief.optimalTimeline;
  const yourTimeline = state.actionLog;

  return (
    <div className="min-h-screen bg-florence-mist">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm font-medium text-florence-slate">Debrief</p>
        <h1 className="mt-1 text-2xl font-semibold text-florence-ink">{scenario.title}</h1>

        {/* Outcome frame */}
        <div className="mt-4 rounded-2xl border border-florence-line bg-white p-4">
          <p className="text-base leading-relaxed text-florence-ink">
            {scenario.debrief.outcomeSummaries[ev.outcome]}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-florence-ink px-3 py-1 font-semibold text-white">
              Overall {Math.round(ev.overall * 100)}%
            </span>
            <span className="text-florence-slate">
              {ev.caughtCriticalCues.length} of{" "}
              {ev.caughtCriticalCues.length + ev.missedCriticalCues.length} critical cues caught
            </span>
            {state.hinted && (
              <span className="rounded-full bg-florence-mist px-2.5 py-0.5 text-xs font-medium text-florence-slate">
                Practice run (hints on) — not scored
              </span>
            )}
          </div>
        </div>

        {/* Timeline: yours vs optimal */}
        <h2 className="mt-6 text-lg font-semibold text-florence-ink">Your timeline vs the optimal path</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-florence-line bg-white p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-florence-slate">You did</p>
            {yourTimeline.length === 0 ? (
              <p className="text-sm text-florence-slate">No actions taken.</p>
            ) : (
              <ol className="space-y-1.5">
                {yourTimeline.map((e, i) => {
                  const label = scenario.actions.find((a) => a.id === e.actionId)?.label ?? e.actionId;
                  return (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="shrink-0 font-mono text-xs text-florence-slate">{mmss(e.atSec)}</span>
                      <span className="text-florence-ink">{label}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          <div className="rounded-2xl border border-florence-teal/30 bg-florence-teal-soft/30 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-florence-teal-dark">Optimal path</p>
            <ol className="space-y-1.5">
              {optimal.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="shrink-0 font-mono text-xs text-florence-teal-dark">{mmss(t.atSec)}</span>
                  <span className="text-florence-ink">{t.label}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Decisions with error-taxonomy chips */}
        <h2 className="mt-6 text-lg font-semibold text-florence-ink">Decision by decision</h2>
        <div className="mt-3 space-y-2">
          {ev.decisions.map((d) => {
            const v = VERDICT_STYLE[d.verdict];
            const err = d.errorTag ? ERROR_TYPE_LABEL[d.errorTag as ErrorType] : undefined;
            return (
              <div key={d.decisionId} className="rounded-xl border border-florence-line bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-florence-ink">{d.label}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${v.cls}`}>
                    {v.label}
                  </span>
                </div>
                {err && (
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="rounded bg-vital-danger/10 px-2 py-0.5 text-[11px] font-semibold text-red-800">
                      {err.label}
                    </span>
                    <span className="text-xs text-florence-slate">{err.meaning}</span>
                  </div>
                )}
                {d.citation && (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-florence-slate/80">{d.citation}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Missed cues */}
        {ev.missedCriticalCues.length > 0 && (
          <div className="mt-5 rounded-2xl border border-vital-danger/30 bg-red-50/60 p-4">
            <p className="text-sm font-semibold text-red-900">Critical cues you didn't surface</p>
            <ul className="mt-2 space-y-1">
              {ev.missedCriticalCues.map((id) => {
                const cue = scenario.phases.flatMap((p) => p.cues ?? []).find((c) => c.id === id);
                return (
                  <li key={id} className="text-sm text-red-900/90">
                    • {cue?.text ?? id}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-red-900/70">
              Assessment-channel cues only appear when you go looking. Next run, assess earlier.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            onClick={() => {
              // Mark the NEXT run as a hinted practice run before replaying.
              onReplay();
            }}
            className="rounded-xl bg-florence-teal px-5 py-3 text-sm font-semibold text-white shadow-card hover:bg-florence-teal-dark"
          >
            Run it again
          </button>
          <Link
            to="/academy/practice"
            className="rounded-xl border border-florence-line bg-white px-5 py-3 text-sm font-semibold text-florence-ink hover:bg-florence-mist"
          >
            Practice the weak areas
          </Link>
          <Link
            to="/academy"
            className="rounded-xl border border-florence-line bg-white px-5 py-3 text-sm font-semibold text-florence-ink hover:bg-florence-mist"
          >
            Back to the Academy
          </Link>
        </div>
        {!candidate && (
          <p className="mt-4 text-[11px] text-florence-slate/70">
            Sign in to save this run to your readiness profile.
          </p>
        )}
      </div>
    </div>
  );
}
