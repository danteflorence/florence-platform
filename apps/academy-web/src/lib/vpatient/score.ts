// ───────────────────────────────────────────────────────────────────────────
// Virtual-patient scoring - pure evaluation of a finished run against the
// scenario rubric. Maps performance onto the SAME dimensions the rest of the
// product speaks: NCSBN Client Needs (by_client_need), NCJMM steps (by_cjmm)
// and the walkthrough reasoning-error taxonomy (errorTags) - so a sim run
// POSTs through the existing assessment-results pipe (kind:"simulation") and
// readiness / remediation / the copilot pick it up with no backend change.
//
// Verdicts per decision: harmful > met > late > missed, and "na" when an
// afterFlag-anchored window never opened (the learner PREVENTED the
// deterioration - decisions about handling it don't count against them).
// ───────────────────────────────────────────────────────────────────────────

import type {
  RubricEntry,
  RunOutcome,
  VPatientScenario,
} from "../../data/vpatient/types";
import type { SimState } from "./engine";

/** Ids of repeatable actions - needed to decide whether a pre-window action
 *  can satisfy a decision (see evaluateDecision). */
type RepeatableSet = ReadonlySet<string>;

export type DecisionVerdict = "met" | "late" | "missed" | "harmful" | "na";

export interface DecisionResult {
  decisionId: string;
  label: string;
  verdict: DecisionVerdict;
  /** Score contribution 0..1 (met 1, late 0.5, missed/harmful 0, na excluded). */
  score: number;
  /** When the satisfying (or harmful) action happened, if any. */
  atSec?: number;
  /** [openSec, closeSec] the rubric expected action within, when applicable. */
  windowSec?: [number, number];
  errorTag?: string;
  citation?: string;
}

export interface SimEvaluation {
  outcome: RunOutcome;
  /** Weighted 0..1 across applicable decisions. */
  overall: number;
  byClientNeed: Record<string, number>;
  byCjmm: Record<string, number>;
  /** Reasoning-error tags earned this run (deduped, order of occurrence). */
  errorTags: string[];
  decisions: DecisionResult[];
  /** Critical cues the learner surfaced / never surfaced. */
  caughtCriticalCues: string[];
  missedCriticalCues: string[];
  itemsCompleted: number;
  hinted: boolean;
}

const LATE_CREDIT = 0.5;

function evaluateDecision(
  entry: RubricEntry,
  state: SimState,
  repeatable: RepeatableSet,
): DecisionResult {
  const base: DecisionResult = {
    decisionId: entry.decisionId,
    label: entry.label,
    verdict: "missed",
    score: 0,
    ...(entry.citation ? { citation: entry.citation } : {}),
  };

  // Sequencing failure trumps everything (e.g. antibiotics before cultures).
  if (entry.failIfFlag && state.flagsSetAt[entry.failIfFlag] !== undefined) {
    return {
      ...base,
      verdict: "harmful",
      atSec: state.flagsSetAt[entry.failIfFlag],
      errorTag: entry.errorTypeIfHarmful ?? entry.errorTypeIfMissed,
    };
  }
  const harmful = state.actionLog.find((e) => (entry.harmfulActions ?? []).includes(e.actionId));
  if (harmful) {
    return {
      ...base,
      verdict: "harmful",
      atSec: harmful.atSec,
      errorTag: entry.errorTypeIfHarmful ?? entry.errorTypeIfMissed,
    };
  }

  // Resolve the expected window.
  let openSec = entry.opensAtSec ?? 0;
  if (entry.afterFlag !== undefined) {
    const flagAt = state.flagsSetAt[entry.afterFlag];
    if (flagAt === undefined) return { ...base, verdict: "na", score: 0 };
    openSec = flagAt;
  }
  const closeSec = entry.windowSec !== undefined ? openSec + entry.windowSec : Infinity;
  const window: [number, number] | undefined =
    entry.windowSec !== undefined ? [openSec, closeSec] : undefined;

  // First satisfying action IN or AFTER the window. A one-shot action taken
  // before the window opened still counts as met (being ahead of a
  // deterioration is good nursing, not a fault) - but a REPEATABLE action
  // (e.g. reassess vitals) must actually recur once the window opens; the
  // 07:00 baseline check can't satisfy "reassess after the bolus".
  const hits = state.actionLog.filter((e) => entry.correctActions.includes(e.actionId));
  let hit = hits.find((e) => e.atSec >= openSec);
  if (!hit) {
    const early = hits[0];
    if (early && !repeatable.has(early.actionId)) hit = early;
  }
  if (!hit) {
    return {
      ...base,
      verdict: "missed",
      errorTag: entry.errorTypeIfMissed,
      ...(window ? { windowSec: window } : {}),
    };
  }
  if (hit.atSec <= closeSec) {
    return {
      ...base,
      verdict: "met",
      score: 1,
      atSec: hit.atSec,
      ...(window ? { windowSec: window } : {}),
    };
  }
  return {
    ...base,
    verdict: "late",
    score: LATE_CREDIT,
    atSec: hit.atSec,
    errorTag: entry.errorTypeIfMissed,
    ...(window ? { windowSec: window } : {}),
  };
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function evaluate(state: SimState, scenario: VPatientScenario): SimEvaluation {
  const repeatable: RepeatableSet = new Set(
    scenario.actions.filter((a) => a.repeatable).map((a) => a.id),
  );
  const decisions = scenario.rubric.map((entry) => evaluateDecision(entry, state, repeatable));

  // Weighted rollups per dimension, excluding "na" decisions entirely.
  const needAcc = new Map<string, { sum: number; weight: number }>();
  const cjmmAcc = new Map<string, { sum: number; weight: number }>();
  let sum = 0;
  let weightTotal = 0;
  const errorTags: string[] = [];
  for (let i = 0; i < decisions.length; i++) {
    const d = decisions[i];
    const entry = scenario.rubric[i];
    if (d.verdict === "na") continue;
    sum += d.score * entry.weight;
    weightTotal += entry.weight;
    const need = needAcc.get(entry.clientNeed) ?? { sum: 0, weight: 0 };
    need.sum += d.score * entry.weight;
    need.weight += entry.weight;
    needAcc.set(entry.clientNeed, need);
    const cjmm = cjmmAcc.get(entry.ncjmmStep) ?? { sum: 0, weight: 0 };
    cjmm.sum += d.score * entry.weight;
    cjmm.weight += entry.weight;
    cjmmAcc.set(entry.ncjmmStep, cjmm);
    if (d.errorTag && !errorTags.includes(d.errorTag)) errorTags.push(d.errorTag);
  }
  const byClientNeed: Record<string, number> = {};
  for (const [k, v] of needAcc) byClientNeed[k] = round3(v.sum / v.weight);
  const byCjmm: Record<string, number> = {};
  for (const [k, v] of cjmmAcc) byCjmm[k] = round3(v.sum / v.weight);

  // Critical-cue recall: every critical cue in the scenario, caught iff the
  // run revealed it (auto-revealed channels count as caught - they were on
  // screen; the interesting misses are assessment cues nobody went looking for).
  const criticalIds = scenario.phases
    .flatMap((p) => p.cues ?? [])
    .filter((c) => c.critical)
    .map((c) => c.id);
  const caughtCriticalCues = criticalIds.filter((id) => state.revealedCueIds.includes(id));
  const missedCriticalCues = criticalIds.filter((id) => !state.revealedCueIds.includes(id));

  const applicable = decisions.filter((d) => d.verdict !== "na").length;
  return {
    outcome: state.ended?.outcome ?? "time_end",
    overall: weightTotal > 0 ? round3(sum / weightTotal) : 0,
    byClientNeed,
    byCjmm,
    errorTags,
    decisions,
    caughtCriticalCues,
    missedCriticalCues,
    itemsCompleted: applicable,
    hinted: state.hinted,
  };
}

/**
 * Shape a finished evaluation into the POST /v1/assessment-results payload
 * (kind:"simulation"). Deliberately NO readiness/theta: a sim rubric score is
 * not a calibrated pass probability, and the API's readiness rollup ignores
 * results without one - dimension signal flows, bands stay honest.
 */
export function toAssessmentSummary(
  ev: SimEvaluation,
  candidateId: string,
): {
  candidate_id: string;
  kind: "simulation";
  items_completed: number;
  by_client_need: Record<string, number>;
  by_cjmm: Record<string, number>;
  error_tags?: string[];
} {
  return {
    candidate_id: candidateId,
    kind: "simulation",
    items_completed: ev.itemsCompleted,
    by_client_need: ev.byClientNeed,
    by_cjmm: ev.byCjmm,
    // The reasoning-error tags this run earned - the API dispatches
    // dim:"error_type" remediation when a tag repeats across results.
    ...(ev.errorTags.length ? { error_tags: ev.errorTags } : {}),
  };
}
