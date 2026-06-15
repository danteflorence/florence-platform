/**
 * Computerized Adaptive Testing (CAT) engine — Rasch (1-PL) model.
 *
 * This mirrors how the real NCLEX adapts: estimate the candidate's ability
 * after every item, then serve the next item that is both (a) maximally
 * informative at that ability and (b) needed to keep the content mix on the
 * NCSBN blueprint. Stopping follows the NCLEX trio: the 95%-confidence-interval
 * rule, a maximum-length cap, and (in the UI) a run-out-of-time guard.
 *
 * Everything here is a pure function so it can be unit-tested without React.
 * Partial-credit (NGN) scores feed the ability model through a continuous
 * quasi-Bernoulli likelihood, so a 0.5 on a matrix item counts as half-evidence
 * rather than being thrown away.
 */

import type { CaseStudy, CjmmStep, ClientNeed, Question } from "../types/question";
import { CLIENT_NEEDS } from "../data/blueprint";

export interface CatResponse {
  id: string;
  /** Rasch difficulty (b) of the item that was answered. */
  difficulty: number;
  clientNeed: ClientNeed;
  /** Continuous score in [0, 1]. */
  score: number;
  /** Optional NGN clinical-judgment step — enables per-CJMM-layer mastery. */
  cjmm?: CjmmStep;
}

const TARGET: Record<ClientNeed, number> = Object.fromEntries(
  CLIENT_NEEDS.map((c) => [c.key, c.target]),
) as Record<ClientNeed, number>;

// θ grid for Expected-A-Posteriori estimation.
const THETA_MIN = -4;
const THETA_MAX = 4;
const THETA_STEP = 0.05;
const GRID: number[] = (() => {
  const g: number[] = [];
  for (let t = THETA_MIN; t <= THETA_MAX + 1e-9; t += THETA_STEP) {
    g.push(Number(t.toFixed(4)));
  }
  return g;
})();
/** Standard-normal prior N(0,1), evaluated on the grid (unnormalized). */
const PRIOR = GRID.map((t) => Math.exp(-(t * t) / 2));

/** Probability of a correct response under the Rasch model. */
export function raschP(theta: number, b: number): number {
  return 1 / (1 + Math.exp(-(theta - b)));
}

/** Fisher information of a Rasch item at a given ability. Peaks when b ≈ θ. */
export function itemInfo(theta: number, b: number): number {
  const p = raschP(theta, b);
  return p * (1 - p);
}

export interface AbilityEstimate {
  /** Posterior-mean ability (logits). */
  theta: number;
  /** Posterior standard deviation = standard error of measurement. */
  se: number;
  /** Posterior mass above the passing standard = projected pass probability. */
  passProb: number;
}

/**
 * EAP ability estimate from the full response history. Numerically stable for
 * all-correct / all-incorrect patterns (unlike MLE), which matters early in a
 * session when SE is large.
 */
export function estimateAbility(
  responses: CatResponse[],
  passTheta = 0,
): AbilityEstimate {
  if (responses.length === 0) return { theta: 0, se: 1, passProb: 0.5 };

  const post = PRIOR.slice();
  for (let i = 0; i < GRID.length; i++) {
    const theta = GRID[i];
    let lik = 1;
    for (const r of responses) {
      let p = raschP(theta, r.difficulty);
      p = Math.min(1 - 1e-6, Math.max(1e-6, p));
      lik *= Math.pow(p, r.score) * Math.pow(1 - p, 1 - r.score);
    }
    post[i] *= lik;
  }

  let sum = 0;
  let mean = 0;
  let mass = 0;
  for (let i = 0; i < GRID.length; i++) {
    sum += post[i];
    mean += GRID[i] * post[i];
    if (GRID[i] > passTheta) mass += post[i];
  }
  if (sum === 0) return { theta: 0, se: 1, passProb: 0.5 };
  mean /= sum;

  let varr = 0;
  for (let i = 0; i < GRID.length; i++) {
    varr += post[i] * (GRID[i] - mean) ** 2;
  }
  varr /= sum;

  return { theta: mean, se: Math.sqrt(varr), passProb: mass / sum };
}

/**
 * Pick the next item: the most informative unused item from the Client-Need
 * category that is currently furthest below its blueprint target.
 */
export function selectNextItem(
  pool: Question[],
  answeredIds: Set<string>,
  theta: number,
  counts: Record<ClientNeed, number>,
  totalAnswered: number,
): Question | null {
  const deficit = (cn: ClientNeed) =>
    TARGET[cn] - (counts[cn] ?? 0) / Math.max(1, totalAnswered);

  const cats = CLIENT_NEEDS.map((c) => c.key).sort((a, b) => {
    const d = deficit(b) - deficit(a);
    return d !== 0 ? d : TARGET[b] - TARGET[a];
  });

  const mostInformative = (items: Question[]): Question | null => {
    let best: Question | null = null;
    let bestInfo = -Infinity;
    for (const it of items) {
      const info = itemInfo(theta, it.difficulty);
      if (info > bestInfo) {
        bestInfo = info;
        best = it;
      }
    }
    return best;
  };

  for (const cn of cats) {
    const items = pool.filter(
      (q) => !answeredIds.has(q.id) && q.clientNeed === cn,
    );
    const pick = mostInformative(items);
    if (pick) return pick;
  }

  // Blueprint exhausted for the needed categories — fall back to any unused item.
  return mostInformative(pool.filter((q) => !answeredIds.has(q.id)));
}

// ---------------------------------------------------------------------------
// Case-level selection — NGN unfolding cases play as fixed 6-item units, so
// difficulty climbs BETWEEN cases (not within). A CaseStudy has no difficulty
// field of its own, so we derive it from the items it references.
// ---------------------------------------------------------------------------

/** Index a flat item list by id once, so case difficulty is cheap to compute. */
export function indexItems(items: Question[]): Map<string, Question> {
  const m = new Map<string, Question>();
  for (const it of items) m.set(it.id, it);
  return m;
}

/**
 * Mean Rasch difficulty of a case = the average difficulty of its referenced
 * items. Returns 0 when none of the ids resolve (treated as "at the standard").
 */
export function caseDifficulty(
  caseStudy: CaseStudy,
  itemsById: Map<string, Question>,
): number {
  let sum = 0;
  let n = 0;
  for (const id of caseStudy.questionIds) {
    const it = itemsById.get(id);
    if (it) {
      sum += it.difficulty;
      n += 1;
    }
  }
  return n === 0 ? 0 : sum / n;
}

/**
 * Pick the next unfolding case: the unused case whose mean difficulty is most
 * informative at the current ability (Fisher information peaks when case b ≈ θ).
 * As the learner's θ climbs the engine serves harder cases; if they struggle, θ
 * falls and easier cases follow — the same adaptive logic as `selectNextItem`,
 * lifted to the case level.
 *
 * By default this returns the single most-informative case (deterministic). Pass
 * `topK > 1` to pick at random among the K nearest-difficulty cases, so two
 * sessions started at the same level don't replay the identical case — variety
 * without drifting off the target difficulty. `rng` is injectable for tests.
 */
export function selectNextCase(
  cases: CaseStudy[],
  itemsById: Map<string, Question>,
  answeredCaseIds: Set<string>,
  theta: number,
  opts?: { topK?: number; rng?: () => number },
): CaseStudy | null {
  const ranked = cases
    .filter((c) => !answeredCaseIds.has(c.id))
    .map((c) => ({ c, info: itemInfo(theta, caseDifficulty(c, itemsById)) }))
    .sort((a, b) => b.info - a.info);
  if (ranked.length === 0) return null;
  const k = Math.max(1, Math.min(opts?.topK ?? 1, ranked.length));
  const rng = opts?.rng ?? Math.random;
  return ranked[Math.floor(rng() * k)].c;
}

export type StopReason = "ci" | "max-length" | "pool-exhausted" | "running";

export interface StopDecision {
  stop: boolean;
  reason: StopReason;
  outcome?: "pass" | "fail";
}

export function shouldStop(
  est: AbilityEstimate,
  count: number,
  cfg: CatConfig,
  passTheta = 0,
): StopDecision {
  if (count < cfg.minItems) return { stop: false, reason: "running" };

  if (cfg.useCiRule) {
    const lower = est.theta - cfg.zCrit * est.se;
    const upper = est.theta + cfg.zCrit * est.se;
    if (lower > passTheta) return { stop: true, reason: "ci", outcome: "pass" };
    if (upper < passTheta) return { stop: true, reason: "ci", outcome: "fail" };
  }

  if (count >= cfg.maxItems) {
    return {
      stop: true,
      reason: "max-length",
      outcome: est.theta >= passTheta ? "pass" : "fail",
    };
  }
  return { stop: false, reason: "running" };
}

// ---------------------------------------------------------------------------
// Timed-test pacing — pure countdown math so the UI and the tests agree on when
// the clock is low and when it has expired.
// ---------------------------------------------------------------------------

export type PaceTier = "normal" | "warning" | "critical";

export interface PacingState {
  /** Whole seconds remaining until the deadline (clamped at 0). */
  remainingSec: number;
  /** True once the deadline has passed. */
  expired: boolean;
  /** Urgency tier for styling the countdown. */
  tier: PaceTier;
}

/**
 * Countdown state for a timed test. `warnSec`/`criticalSec` set the thresholds
 * where the clock turns amber then red (defaults: 5 min / 1 min). Seconds are
 * rounded up so the learner only sees 0:00 at the actual deadline.
 */
export function pacing(
  deadlineAt: number,
  now: number,
  opts?: { warnSec?: number; criticalSec?: number },
): PacingState {
  const warnSec = opts?.warnSec ?? 300;
  const criticalSec = opts?.criticalSec ?? 60;
  const remainingMs = deadlineAt - now;
  const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const tier: PaceTier =
    remainingSec <= criticalSec
      ? "critical"
      : remainingSec <= warnSec
        ? "warning"
        : "normal";
  return { remainingSec, expired: remainingMs <= 0, tier };
}

// ---------------------------------------------------------------------------
// Mode presets
// ---------------------------------------------------------------------------

export type CatMode = "tutor" | "exam" | "nightly" | "timed";

export interface CatConfig {
  mode: CatMode;
  minItems: number;
  maxItems: number;
  /** Apply the 95% confidence-interval early-stop rule. */
  useCiRule: boolean;
  /** Reveal the rationale immediately after each submit. */
  immediateFeedback: boolean;
  zCrit: number;
  /** Where the first item's difficulty is targeted (slightly easy). */
  startTheta: number;
  /** The passing standard on the logit scale (NCLEX-RN 2023 standard = 0.00). */
  passTheta: number;
  /** Overall countdown for timed tests (seconds). Omitted = untimed. */
  timeLimitSec?: number;
}

export const CAT_MODES: Record<CatMode, CatConfig> = {
  // Study mode: short, adaptive, with immediate rationale after each item.
  tutor: {
    mode: "tutor",
    minItems: 10,
    maxItems: 10,
    useCiRule: false,
    immediateFeedback: true,
    zCrit: 1.96,
    startTheta: -0.3,
    passTheta: 0,
  },
  // Real-style adaptive exam: variable length, 95% CI early stop.
  exam: {
    mode: "exam",
    minItems: 85,
    maxItems: 150,
    useCiRule: true,
    immediateFeedback: false,
    zCrit: 1.96,
    startTheta: -0.3,
    passTheta: 0,
  },
  // Nightly stamina set: fixed 150 items, adaptive difficulty, no early stop.
  nightly: {
    mode: "nightly",
    minItems: 150,
    maxItems: 150,
    useCiRule: false,
    immediateFeedback: false,
    zCrit: 1.96,
    startTheta: -0.3,
    passTheta: 0,
  },
  // Timed test: fixed-length, self-paced against a countdown that auto-submits
  // at zero. Trains exam pacing and stamina under real time pressure. 75 items
  // in 90 minutes ≈ the NCLEX's own ~1.2 min/item budget.
  timed: {
    mode: "timed",
    minItems: 75,
    maxItems: 75,
    useCiRule: false,
    immediateFeedback: false,
    zCrit: 1.96,
    startTheta: -0.3,
    passTheta: 0,
    timeLimitSec: 90 * 60,
  },
};

// ---------------------------------------------------------------------------
// Starting difficulty (student- or instructor-chosen)
// ---------------------------------------------------------------------------

/**
 * The learner (or their instructor) picks where the session STARTS; CAT then
 * climbs or eases from there based on performance. "adaptive" is the
 * "let FlorenceRN choose" option — a neutral start that adapts from the very
 * first item, closest to the real exam. Every level resolves to a `startTheta`
 * that overrides the mode default.
 */
export type DifficultyLevel =
  | "foundational"
  | "easy"
  | "moderate"
  | "challenging"
  | "adaptive";

export interface LevelSpec {
  key: DifficultyLevel;
  label: string;
  /** Where the first item's difficulty is targeted (logits). */
  startTheta: number;
  blurb: string;
}

export const LEVELS: LevelSpec[] = [
  {
    key: "foundational",
    label: "Foundational",
    startTheta: -1.5,
    blurb: "Build confidence with core, lower-difficulty items first.",
  },
  {
    key: "easy",
    label: "Easy",
    startTheta: -0.7,
    blurb: "Start a little below the passing standard and work up.",
  },
  {
    key: "moderate",
    label: "Moderate",
    startTheta: 0,
    blurb: "Start right at the passing standard.",
  },
  {
    key: "challenging",
    label: "Challenging",
    startTheta: 0.9,
    blurb: "Start above the standard for a tougher climb.",
  },
  {
    key: "adaptive",
    label: "Let FlorenceRN choose",
    startTheta: -0.3,
    blurb: "Begin at a neutral point and adapt from the very first item.",
  },
];

export const LEVEL_BY_KEY: Record<DifficultyLevel, LevelSpec> =
  Object.fromEntries(LEVELS.map((l) => [l.key, l])) as Record<
    DifficultyLevel,
    LevelSpec
  >;

/** Return a copy of `config` with its starting difficulty set by `level`. */
export function applyLevel(
  config: CatConfig,
  level: DifficultyLevel,
): CatConfig {
  return { ...config, startTheta: LEVEL_BY_KEY[level].startTheta };
}

// ---------------------------------------------------------------------------
// Reporting helpers
// ---------------------------------------------------------------------------

export interface CategoryStat {
  clientNeed: ClientNeed;
  count: number;
  /** Mean continuous score (0..1) in this category. */
  meanScore: number;
}

export function categoryBreakdown(responses: CatResponse[]): CategoryStat[] {
  return CLIENT_NEEDS.map((c) => {
    const inCat = responses.filter((r) => r.clientNeed === c.key);
    const meanScore =
      inCat.length === 0
        ? 0
        : inCat.reduce((s, r) => s + r.score, 0) / inCat.length;
    return { clientNeed: c.key, count: inCat.length, meanScore };
  }).filter((s) => s.count > 0);
}
