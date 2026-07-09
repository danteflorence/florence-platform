// Onboarding-risk stratification — turns a folded Passport into a retention-risk
// signal (band + score + reason codes), reusing the proven Academy mastery model
// (weakest-first subscale gaps) plus early start-signals. Pure + dependency-free,
// no enums. Reads ONLY the Passport (which the route fetches via the secured
// passportView for partners; internal callers fold directly). INTERNAL-ONLY output.
//
// Phasing (per design): Phase 1 = readiness-only baseline (band mirrors the readiness
// band). Start-signals ESCALATE the baseline (never de-escalate), so noisy early
// signals can only raise attention, never hide a weak nurse.

import type { Passport } from "./passport.ts";

export const RISK_BANDS = ["low", "medium", "high", "critical"] as const;
export type RiskBand = (typeof RISK_BANDS)[number];

export const START_SIGNAL_KINDS = ["start_date_drift", "attestation_lag", "candidate_silence", "manager_concern"] as const;
export type StartSignal = (typeof START_SIGNAL_KINDS)[number];

export const REASON_CODES = [
  "weak_subscale", "low_overall_theta", "red_band", "orange_band",
  "start_date_drift", "attestation_lag", "candidate_silence", "manager_concern", "insufficient_evidence",
] as const;

const READINESS_BAND_TO_RISK: Record<string, RiskBand> = { green: "low", yellow: "medium", orange: "high", red: "critical", none: "medium" };
const RISK_RANK: Record<RiskBand, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const rankToBand = (r: number): RiskBand => RISK_BANDS[Math.max(0, Math.min(3, r))]!;

export interface SubscaleMasteryLite { dim: string; key: string; theta: number; passProb: number; items: number }

export interface OnboardingRisk {
  nurseId: string;
  band: RiskBand;
  baselineBand: RiskBand;
  score: number; // 0..1, monotonic in band
  gaps: SubscaleMasteryLite[];
  factors: { factor: string; value: number; confidence?: number }[];
  reasonCodes: string[];
  assessedAt: string;
}

/** Pure stratification. baseline = readiness band; start-signals + gaps escalate only. */
export function stratify(p: Passport, opts?: { minItems?: number; thetaFloor?: number }): OnboardingRisk {
  const minItems = opts?.minItems ?? 5;
  const thetaFloor = opts?.thetaFloor ?? 0;
  const baselineBand = READINESS_BAND_TO_RISK[p.readiness.band ?? "none"] ?? "medium";
  const reasonCodes: string[] = [];
  if (p.readiness.band === "red") reasonCodes.push("red_band");
  if (p.readiness.band === "orange") reasonCodes.push("orange_band");
  if (typeof p.readiness.theta === "number" && p.readiness.theta < thetaFloor) reasonCodes.push("low_overall_theta");

  // Weakest-first subscale gaps (mirrors Academy masteryGaps): below floor + enough evidence.
  const subs = p.readiness.subscaleMastery ?? [];
  const gaps = subs.filter((s) => s.theta < thetaFloor && s.items >= minItems).sort((a, b) => a.theta - b.theta);
  if (gaps.length) reasonCodes.push("weak_subscale");
  else if (subs.some((s) => s.theta < thetaFloor && s.items < minItems)) reasonCodes.push("insufficient_evidence");

  // Early start-signals → escalation factors (escalate-only).
  const factors = p.onboarding.startSignals.map((s) => ({ factor: s.signal, value: s.value, ...(s.confidence !== undefined ? { confidence: s.confidence } : {}) }));
  let escalation = 0;
  for (const f of factors) {
    const weight = f.value * (f.confidence ?? 1);
    if (weight >= 0.5 && START_SIGNAL_KINDS.includes(f.factor as StartSignal) && !reasonCodes.includes(f.factor)) reasonCodes.push(f.factor);
    if (weight >= 0.75) escalation += 2;
    else if (weight >= 0.5) escalation += 1;
  }
  if (gaps.length >= 2) escalation += 1;

  const band = rankToBand(RISK_RANK[baselineBand] + escalation); // never below baseline
  return {
    nurseId: p.nurseId,
    band,
    baselineBand,
    score: Math.min(1, RISK_RANK[band] / 3),
    gaps,
    factors,
    reasonCodes,
    assessedAt: p.onboarding.lastAssessedAt ?? p.readiness.lastAssessedAt ?? "",
  };
}
