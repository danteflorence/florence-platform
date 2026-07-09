// The Production Ledger Control Tower — the company cockpit. Folds every nurse's
// Passport, derives each one's canonical stage, and aggregates into stage counts,
// a forecast (current MRR + probability-weighted pipeline), blockers (in-flight
// stages needing action), and an INTERNAL roster. Pure; the route owns fetching +
// scope + audit. No fabricated revenue — the per-RN/month fee is supplied by the caller.

import { foldPassport, type Passport } from "./passport.ts";
import { canonicalStage, canonicalRank, CANONICAL_STAGES, type CanonicalStage } from "./ledgerStages.ts";
import { retentionCohorts, type RetentionSummary } from "./retention.ts";
import { stratify, type RiskBand } from "./onboardingRisk.ts";
import { recommendedActionsByBand, type RetentionAction } from "./retentionPlaybook.ts";
import { demandSourceForPassport, type DemandSource } from "./universityRouting.ts";
import type { Nurse, NurseEvent, NurseRef } from "./store.ts";

export interface NurseBundle {
  nurse: Nurse;
  refs: NurseRef[];
  events: NurseEvent[];
}

export interface RosterRow {
  nurseId: string;
  name?: string;
  email?: string;
  stage: CanonicalStage;
  inFlight: boolean;
}

export interface ControlTowerSummary {
  totalNurses: number;
  stageCounts: Record<CanonicalStage, number>;
  /** Licensed nurses not yet matched — near-term employer supply. */
  licensedAvailable: number;
  /** All licensed+ nurses — total employer-ready supply. */
  employerReadyCount: number;
  forecast: {
    perRnMonthlyFeeUsd: number;
    startedToDate: number;
    billingActive: number;
    monthlyRecurringUsd: number; // billingActive × fee (current MRR)
    annualizedUsd: number; // MRR × 12
    pipelineExpectedStarts: number; // probability-weighted over the in-flight pipeline
    pipelineMrrUsd: number; // pipelineExpectedStarts × fee
    startsByMonth: { month: string; started: number }[];
    /** Current MRR split by demand source (sums to monthlyRecurringUsd). */
    mrrBySource: Record<DemandSource, { starts: number; mrrUsd: number }>;
  };
  /** In-flight stages that need management attention (current-stage distribution). */
  blockers: { stage: CanonicalStage; count: number }[];
  /** Retention tail: cohort curve, churn, and recurring/lifetime BOOKED revenue. */
  retention: RetentionSummary;
  /** Onboarding-risk roll-up (internal). atRiskRoster carries PII — gated like roster. */
  onboardingRisks: {
    bandDistribution: Record<RiskBand, number>;
    highestRiskCount: number; // high + critical
    recommendedActionsByBand: Record<RiskBand, RetentionAction[]>;
  };
  atRiskRoster: { nurseId: string; name?: string; email?: string; riskBand: RiskBand; reasonCodes: string[] }[];
  roster: RosterRow[];
  generatedAt: string;
}

// Probability a nurse at this stage eventually starts (pipeline forecast weights).
const START_PROB: Partial<Record<CanonicalStage, number>> = {
  readiness_cleared: 0.2,
  nclex_att_active: 0.35,
  licensed_rn: 0.5,
  employer_ready_packet: 0.55,
  matched: 0.6,
  packet_shared: 0.7,
  interview: 0.8,
  offer: 0.9,
  offer_accepted: 0.95,
  start_scheduled: 0.97,
};
// Stages that are "in flight" — placed into the pipeline, awaiting the next action.
const IN_FLIGHT: CanonicalStage[] = ["licensed_rn", "employer_ready_packet", "matched", "packet_shared", "interview", "offer", "offer_accepted", "start_scheduled"];
const STARTED_RANK = canonicalRank("started");
const LICENSED_RANK = canonicalRank("licensed_rn");
const MATCHED_RANK = canonicalRank("matched");

export function controlTower(bundles: NurseBundle[], opts: { feeUsd: number; now: string }): ControlTowerSummary {
  const stageCounts = Object.fromEntries(CANONICAL_STAGES.map((s) => [s, 0])) as Record<CanonicalStage, number>;
  const roster: RosterRow[] = [];
  const startsByMonth = new Map<string, number>();
  const passports: Passport[] = [];
  const onboardingBands: Record<RiskBand, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  const atRiskRoster: ControlTowerSummary["atRiskRoster"] = [];
  const mrrSourceStarts: Record<DemandSource, number> = { university: 0, employer: 0, internal: 0 };
  let licensedAvailable = 0, employerReadyCount = 0, startedToDate = 0, billingActive = 0, pipelineExpectedStarts = 0;

  for (const b of bundles) {
    const p: Passport = foldPassport(b.nurse, b.refs, b.events);
    passports.push(p);
    const risk = stratify(p);
    onboardingBands[risk.band] += 1;
    if (risk.band === "high" || risk.band === "critical") {
      atRiskRoster.push({ nurseId: p.nurseId, ...(p.name ? { name: p.name } : {}), ...(p.email ? { email: p.email } : {}), riskBand: risk.band, reasonCodes: risk.reasonCodes });
    }
    const stage = canonicalStage(p);
    const rank = canonicalRank(stage);
    stageCounts[stage] += 1;
    if (rank >= LICENSED_RANK) employerReadyCount += 1;
    if (rank >= LICENSED_RANK && rank < MATCHED_RANK) licensedAvailable += 1;
    if (rank >= STARTED_RANK) startedToDate += 1;
    if (p.billing.subscriptionStartedAt) { billingActive += 1; mrrSourceStarts[demandSourceForPassport(p)] += 1; }
    if (rank < STARTED_RANK) pipelineExpectedStarts += START_PROB[stage] ?? 0;
    if (p.placement.startDate) {
      const month = p.placement.startDate.slice(0, 7);
      startsByMonth.set(month, (startsByMonth.get(month) ?? 0) + 1);
    }
    roster.push({ nurseId: p.nurseId, ...(p.name ? { name: p.name } : {}), ...(p.email ? { email: p.email } : {}), stage, inFlight: IN_FLIGHT.includes(stage) });
  }

  const monthlyRecurringUsd = billingActive * opts.feeUsd;
  return {
    totalNurses: bundles.length,
    stageCounts,
    licensedAvailable,
    employerReadyCount,
    forecast: {
      perRnMonthlyFeeUsd: opts.feeUsd,
      startedToDate,
      billingActive,
      monthlyRecurringUsd,
      annualizedUsd: monthlyRecurringUsd * 12,
      pipelineExpectedStarts: Math.round(pipelineExpectedStarts * 10) / 10,
      pipelineMrrUsd: Math.round(pipelineExpectedStarts * opts.feeUsd),
      startsByMonth: [...startsByMonth.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([month, started]) => ({ month, started })),
      mrrBySource: {
        university: { starts: mrrSourceStarts.university, mrrUsd: mrrSourceStarts.university * opts.feeUsd },
        employer: { starts: mrrSourceStarts.employer, mrrUsd: mrrSourceStarts.employer * opts.feeUsd },
        internal: { starts: mrrSourceStarts.internal, mrrUsd: mrrSourceStarts.internal * opts.feeUsd },
      },
    },
    blockers: IN_FLIGHT.map((stage) => ({ stage, count: stageCounts[stage] })).filter((b) => b.count > 0),
    retention: retentionCohorts(passports, { feeUsd: opts.feeUsd, now: opts.now }),
    onboardingRisks: {
      bandDistribution: onboardingBands,
      highestRiskCount: onboardingBands.high + onboardingBands.critical,
      recommendedActionsByBand: recommendedActionsByBand(),
    },
    atRiskRoster,
    roster,
    generatedAt: opts.now,
  };
}
