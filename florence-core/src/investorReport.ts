// Investor / board report — a ZERO-PII aggregate projection of the Control Tower
// summary. No nurseId, name, email, or roster ever appears. Pure, dependency-free.

import type { ControlTowerSummary } from "./controlTower.ts";

export interface InvestorReport {
  totalNurses: number;
  stageCounts: ControlTowerSummary["stageCounts"];
  licensedAvailable: number;
  employerReadyCount: number;
  forecast: {
    startedToDate: number;
    billingActive: number;
    monthlyRecurringUsd: number;
    annualizedUsd: number;
    pipelineExpectedStarts: number;
  };
  mrrBySource: ControlTowerSummary["forecast"]["mrrBySource"];
  retention: {
    startedBillingGrade: number;
    curve: ControlTowerSummary["retention"]["curve"];
    monthlyRecurringUsd: number;
    lifetimeBookedUsd: number;
  };
  onboardingRiskDistribution: ControlTowerSummary["onboardingRisks"]["bandDistribution"];
  generatedAt: string;
}

/** Strip the Control Tower summary to a board-safe, de-identified rollup. */
export function investorReport(s: ControlTowerSummary): InvestorReport {
  return {
    totalNurses: s.totalNurses,
    stageCounts: s.stageCounts,
    licensedAvailable: s.licensedAvailable,
    employerReadyCount: s.employerReadyCount,
    forecast: {
      startedToDate: s.forecast.startedToDate,
      billingActive: s.forecast.billingActive,
      monthlyRecurringUsd: s.forecast.monthlyRecurringUsd,
      annualizedUsd: s.forecast.annualizedUsd,
      pipelineExpectedStarts: s.forecast.pipelineExpectedStarts,
    },
    mrrBySource: s.forecast.mrrBySource,
    retention: {
      startedBillingGrade: s.retention.startedBillingGrade,
      curve: s.retention.curve,
      monthlyRecurringUsd: s.retention.recurring.monthlyRecurringUsd,
      lifetimeBookedUsd: s.retention.recurring.lifetimeBookedUsd,
    },
    onboardingRiskDistribution: s.onboardingRisks.bandDistribution,
    generatedAt: s.generatedAt,
  };
}
