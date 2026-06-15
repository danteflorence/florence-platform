// ───────────────────────────────────────────────────────────────────────────
// Academy → Data API reporter
//
// Maps a finished practice/exam session to the Data API's append-only
// `assessment-results` shape and POSTs it, so real performance data starts
// flowing into the system of record (api/).
//
// SECURITY: the browser must NEVER hold a client_secret. Reporting is OFF unless
// the deployment injects BOTH a Data API base URL and a SHORT-LIVED bearer token
// (minted server-side / by a backend proxy — not a hardcoded secret) plus the
// signed-in candidate's id. With any of those missing, every call is a no-op, so
// the static app is unaffected. Failures are swallowed — reporting must never
// break the learner's results screen.
// ───────────────────────────────────────────────────────────────────────────

import { categoryBreakdown, type AbilityEstimate, type CatConfig, type CatResponse } from "./cat";
import { subscaleMastery, masteryMeans, type SubscaleMastery } from "./mastery";
import type { SessionItem } from "./useCatSession";
import { apiBaseUrl, storedCandidate, storedToken } from "./academyAuth";

export type AssessmentKind =
  | "tutor"
  | "nightly"
  | "adaptive_exam"
  | "timed"
  | "diagnostic";

export interface AssessmentSummary {
  candidate_id: string;
  kind: AssessmentKind;
  /** Projected pass probability, 0..1. */
  readiness: number;
  /** Rasch ability estimate (logits). */
  theta: number;
  items_completed: number;
  /** Mean score per NCSBN Client Need category. */
  by_client_need: Record<string, number>;
  /** Pass-probability per NGN clinical-judgment (NCJMM) step, when items were tagged. */
  by_cjmm?: Record<string, number>;
  /** Per-subscale ability (Client Need + CJMM) for gates + remediation dispatch. */
  mastery?: SubscaleMastery[];
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Which assessment kind a session config represents. */
export function kindFromConfig(config: CatConfig): AssessmentKind {
  if (config.timeLimitSec != null) return "timed";
  if (config.useCiRule) return "adaptive_exam";
  if (config.immediateFeedback) return "tutor";
  return "nightly";
}

/** Build the API payload from a finished session's history + ability estimate. */
export function summaryFromSession(opts: {
  candidateId: string;
  kind: AssessmentKind;
  history: SessionItem[];
  ability: AbilityEstimate;
}): AssessmentSummary {
  const graded = opts.history.filter((h) => h.grade);
  const responses: CatResponse[] = graded.map((h) => ({
    id: h.question.id,
    difficulty: h.question.difficulty,
    clientNeed: h.question.clientNeed,
    score: h.grade!.score,
    ...(h.question.cjmm ? { cjmm: h.question.cjmm } : {}),
  }));
  const by_client_need: Record<string, number> = {};
  for (const c of categoryBreakdown(responses)) {
    by_client_need[c.clientNeed] = round3(c.meanScore);
  }
  const mastery = subscaleMastery(responses).map((m) => ({
    ...m,
    theta: round3(m.theta),
    se: round3(m.se),
    passProb: round3(m.passProb),
  }));
  const means = masteryMeans(mastery);
  const by_cjmm: Record<string, number> = {};
  for (const [k, v] of Object.entries(means.by_cjmm)) by_cjmm[k] = round3(v);
  return {
    candidate_id: opts.candidateId,
    kind: opts.kind,
    readiness: round3(opts.ability.passProb),
    theta: round3(opts.ability.theta),
    items_completed: graded.length,
    by_client_need,
    ...(Object.keys(by_cjmm).length ? { by_cjmm } : {}),
    ...(mastery.length ? { mastery } : {}),
  };
}

export interface ReporterConfig {
  url?: string;
  token?: string;
  candidateId?: string;
}

export function reporterConfig(): ReporterConfig {
  const env = import.meta.env as Record<string, string | undefined>;
  return {
    url: env["VITE_API_URL"]?.trim() || undefined,
    token: env["VITE_API_TOKEN"]?.trim() || undefined,
    candidateId: env["VITE_CANDIDATE_ID"]?.trim() || undefined,
  };
}

export function isReportingEnabled(cfg: ReporterConfig = reporterConfig()): boolean {
  return Boolean(cfg.url && cfg.token && cfg.candidateId);
}

/**
 * Prefer the live signed-in candidate session (runtime token from localStorage)
 * over the build-time env config. This is what makes a logged-in learner's
 * sessions actually persist; falls back to env (or disabled) when anonymous.
 */
export function sessionReporterConfig(): ReporterConfig {
  const token = storedToken();
  const candidateId = storedCandidate()?.id;
  const url = apiBaseUrl();
  if (url && token && candidateId) return { url, token, candidateId };
  return reporterConfig();
}

/** Fire-and-forget POST to /v1/assessment-results. Returns false if disabled or on error. */
export async function reportAssessmentResult(
  summary: AssessmentSummary,
  cfg: ReporterConfig = reporterConfig(),
): Promise<boolean> {
  if (!cfg.url || !cfg.token) return false;
  try {
    const res = await fetch(`${cfg.url.replace(/\/$/, "")}/v1/assessment-results`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.token}`,
        "idempotency-key": `${summary.candidate_id}:${summary.kind}:${summary.items_completed}`,
      },
      body: JSON.stringify(summary),
    });
    return res.ok;
  } catch {
    return false; // never surface a reporting failure to the learner
  }
}
