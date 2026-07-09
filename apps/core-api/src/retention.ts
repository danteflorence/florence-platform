// Retention & revenue tail — the company's recurring-revenue + churn view, folded
// from the same Passports the Control Tower already computes (caller passes them in;
// no second fold, no DB). Pure + dependency-free, no enums.
//
// REVENUE INTEGRITY: the cohort anchor is a BILLING-GRADE started nurse — i.e. one
// with billing.subscriptionStartedAt (emitted only on a verified/attested start, never
// bare ATS). Retention milestones (30/60/90d) are analytics + churn signals; they NEVER
// generate a billing line. Recurring/lifetime figures are BOOKED (started × fee × term),
// explicitly NOT revenue-recognized — recognition policy is finance-owned. FICA never
// enters any figure here (it is the customer's effective-cost reducer only).

import { foldPassport, type Passport } from "./passport.ts";
import type { Nurse, NurseEvent, NurseRef } from "./store.ts";

export interface RetentionCohortRow {
  startMonth: string; // YYYY-MM
  started: number;
  retained30d: number;
  retained60d: number;
  retained90d: number;
  churnPct30to90: number;
  lifetimeRevenueUsd: number; // booked = started × fee × recurringMonths
}

export interface RetentionCurvePoint {
  milestone: "30d" | "60d" | "90d";
  count: number;
  churnPctFromStart: number;
}

export interface RetentionRecurring {
  perRnMonthlyFeeUsd: number;
  monthlyRecurringUsd: number; // active billed RN THIS month × fee
  lifetimeBookedUsd: number; // billing-started × fee × recurringMonths (booked, not earned)
  tailByMonth: { month: string; activeCohortRn: number; recurringUsd: number }[];
}

export interface RetentionSummary {
  startedBillingGrade: number;
  recurringMonths: number;
  cohorts: RetentionCohortRow[];
  curve: RetentionCurvePoint[];
  recurring: RetentionRecurring;
  note: string;
}

const ym = (iso: string): string => iso.slice(0, 7);
const ymIndex = (month: string): number => {
  const [y, m] = month.split("-").map(Number);
  return (y ?? 0) * 12 + ((m ?? 1) - 1);
};
const pct = (numerator: number, denominator: number): number =>
  denominator > 0 ? Math.round((1 - numerator / denominator) * 100) : 0;

/** A nurse counts toward the recurring tail only if billing actually opened (attested start). */
const billingStartMonth = (p: Passport): string | undefined => {
  if (!p.billing.subscriptionStartedAt) return undefined;
  return ym(p.placement.startDate ?? p.billing.subscriptionStartedAt);
};

export function retentionCohorts(
  passports: Passport[],
  opts: { feeUsd: number; now: string; recurringMonths?: number },
): RetentionSummary {
  const fee = opts.feeUsd;
  const recurringMonths = opts.recurringMonths ?? 24;
  const nowIdx = ymIndex(ym(opts.now));

  const started = passports.filter((p) => billingStartMonth(p) !== undefined);

  // ── Cohorts by start month ────────────────────────────────────────────────
  const byMonth = new Map<string, Passport[]>();
  for (const p of started) {
    const m = billingStartMonth(p)!;
    (byMonth.get(m) ?? byMonth.set(m, []).get(m)!).push(p);
  }
  const cohorts: RetentionCohortRow[] = [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([startMonth, group]) => {
      const r30 = group.filter((p) => p.retention.retained30dAt).length;
      const r60 = group.filter((p) => p.retention.retained60dAt).length;
      const r90 = group.filter((p) => p.retention.retained90dAt).length;
      return {
        startMonth,
        started: group.length,
        retained30d: r30,
        retained60d: r60,
        retained90d: r90,
        churnPct30to90: pct(r90, r30),
        lifetimeRevenueUsd: group.length * fee * recurringMonths,
      };
    });

  // ── Curve across all billing-grade starts ─────────────────────────────────
  const total = started.length;
  const c30 = started.filter((p) => p.retention.retained30dAt).length;
  const c60 = started.filter((p) => p.retention.retained60dAt).length;
  const c90 = started.filter((p) => p.retention.retained90dAt).length;
  const curve: RetentionCurvePoint[] = [
    { milestone: "30d", count: c30, churnPctFromStart: pct(c30, total) },
    { milestone: "60d", count: c60, churnPctFromStart: pct(c60, total) },
    { milestone: "90d", count: c90, churnPctFromStart: pct(c90, total) },
  ];

  // ── Recurring tail: each billing-started nurse bills fee/month from its start
  //    for recurringMonths, capped at the current month and at termination. ────
  const activeByMonthIdx = new Map<number, number>();
  for (const p of started) {
    const startIdx = ymIndex(billingStartMonth(p)!);
    let endIdx = Math.min(startIdx + recurringMonths - 1, nowIdx);
    if (p.retention.terminatedAt) endIdx = Math.min(endIdx, ymIndex(ym(p.retention.terminatedAt)));
    for (let i = startIdx; i <= endIdx; i += 1) activeByMonthIdx.set(i, (activeByMonthIdx.get(i) ?? 0) + 1);
  }
  const tailByMonth = [...activeByMonthIdx.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([idx, activeCohortRn]) => ({
      month: `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`,
      activeCohortRn,
      recurringUsd: activeCohortRn * fee,
    }));

  return {
    startedBillingGrade: total,
    recurringMonths,
    cohorts,
    curve,
    recurring: {
      perRnMonthlyFeeUsd: fee,
      monthlyRecurringUsd: (activeByMonthIdx.get(nowIdx) ?? 0) * fee,
      lifetimeBookedUsd: total * fee * recurringMonths,
      tailByMonth,
    },
    note: "Recurring/lifetime figures are BOOKED (billing-grade started × fee × term), not revenue-recognized; recognition policy is finance-owned. FICA is excluded (customer effective-cost only).",
  };
}

/** Convenience for callers holding raw bundles (verify scripts). */
export function retentionFromBundles(
  bundles: { nurse: Nurse; refs: NurseRef[]; events: NurseEvent[] }[],
  opts: { feeUsd: number; now: string; recurringMonths?: number },
): RetentionSummary {
  return retentionCohorts(bundles.map((b) => foldPassport(b.nurse, b.refs, b.events)), opts);
}
