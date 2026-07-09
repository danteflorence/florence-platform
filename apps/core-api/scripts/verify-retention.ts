// In-process smoke for the retention & revenue tail (no server, no DB). Asserts the
// canonicalStage derivations for the newly-wired retained_60d/term_complete/repayment
// stages and the retentionCohorts cohort/curve/recurring/lifetime math.
//
//   node scripts/verify-retention.ts

import { foldPassport } from "../src/passport.ts";
import type { Nurse, NurseEvent, NurseRef } from "../src/store.ts";
import { canonicalStage } from "../src/ledgerStages.ts";
import { retentionCohorts } from "../src/retention.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
  cond ? (pass += 1) : (fail += 1);
};

let t = 0;
const ev = (nurseId: string, type: string, data: Record<string, unknown>): NurseEvent => ({
  id: `e${t}`, nurse_id: nurseId, type, source: "test", at: new Date(Date.UTC(2027, 0, 1, 0, 0, t++)).toISOString(), data, created_at: "",
});
const fold = (id: string, events: NurseEvent[]) =>
  foldPassport({ id, email: `${id}@x.com`, name: id, created_at: "", updated_at: "" } as Nurse, [] as NurseRef[], events);

const started = (id: string, startDate: string): NurseEvent[] => [
  ev(id, "pathway.licensure_status", { status: "issued", state: "CA" }),
  ev(id, "ats.started", { employer: "Kaiser", startDate }),
  ev(id, "billing.subscription_started", {}),
];

// ── Stage derivations for the newly-wired tail ───────────────────────────────
const r60 = fold("r60", [...started("r60", "2027-02-10"), ev("r60", "ats.retention_30d", {}), ev("r60", "ats.retention_60d", {})]);
ok("retained_60d → canonical 'retained_60d'", canonicalStage(r60) === "retained_60d", canonicalStage(r60));
const tc = fold("tc", [...started("tc", "2027-02-10"), ev("tc", "ats.retention_90d", {}), ev("tc", "ats.term_complete", {})]);
ok("term_complete → canonical 'term_complete'", canonicalStage(tc) === "term_complete", canonicalStage(tc));
const rp = fold("rp", [...started("rp", "2027-02-10"), ev("rp", "ats.term_complete", {}), ev("rp", "billing.repayment_started", {})]);
ok("repayment → canonical 'repayment'", canonicalStage(rp) === "repayment", canonicalStage(rp));

// ── Cohort / curve / recurring math ──────────────────────────────────────────
const s1 = fold("s1", started("s1", "2027-02-10")); // started only
const s2 = fold("s2", [...started("s2", "2027-02-12"), ev("s2", "ats.retention_30d", {})]); // +30d
const s3 = fold("s3", [...started("s3", "2027-02-15"), ev("s3", "ats.retention_30d", {}), ev("s3", "ats.retention_60d", {}), ev("s3", "ats.retention_90d", {})]); // +30/60/90
const sum = retentionCohorts([s1, s2, s3], { feeUsd: 1750, now: "2027-03-01T00:00:00Z" });

ok("startedBillingGrade = 3", sum.startedBillingGrade === 3, String(sum.startedBillingGrade));
ok("one cohort: 2027-02", sum.cohorts.length === 1 && sum.cohorts[0]?.startMonth === "2027-02");
const co = sum.cohorts[0]!;
ok("cohort counts started=3, 30d=2, 60d=1, 90d=1", co.started === 3 && co.retained30d === 2 && co.retained60d === 1 && co.retained90d === 1, JSON.stringify(co));
ok("cohort churnPct30to90 === round((1 - 90d/30d)*100) === 50", co.churnPct30to90 === 50, String(co.churnPct30to90));
ok("cohort lifetimeRevenueUsd === started × fee × 24", co.lifetimeRevenueUsd === 3 * 1750 * 24, String(co.lifetimeRevenueUsd));

const c30 = sum.curve.find((c) => c.milestone === "30d")!;
const c90 = sum.curve.find((c) => c.milestone === "90d")!;
ok("curve 30d count=2 churn=33", c30.count === 2 && c30.churnPctFromStart === 33, JSON.stringify(c30));
ok("curve 90d count=1 churn=67", c90.count === 1 && c90.churnPctFromStart === 67, JSON.stringify(c90));

ok("recurring tailByMonth length ≤ 24", sum.recurring.tailByMonth.length <= 24, String(sum.recurring.tailByMonth.length));
ok("recurring tail each recurringUsd === activeCohortRn × fee", sum.recurring.tailByMonth.every((m) => m.recurringUsd === m.activeCohortRn * 1750));
ok("recurring MRR this month = 3 × 1750 (all active in 2027-03)", sum.recurring.monthlyRecurringUsd === 3 * 1750, String(sum.recurring.monthlyRecurringUsd));
ok("recurring lifetimeBookedUsd === 3 × 1750 × 24", sum.recurring.lifetimeBookedUsd === 3 * 1750 * 24, String(sum.recurring.lifetimeBookedUsd));
ok("note flags BOOKED, not revenue-recognized", /booked/i.test(sum.recurring ? sum.note : "") && /not revenue-recognized/i.test(sum.note));

// ── Termination stops the recurring tail (no booked revenue past it) ─────────
const term = fold("term", [...started("term", "2027-02-10"), ev("term", "ats.withdrawn", { reason: "left" })]);
const sumT = retentionCohorts([term], { feeUsd: 1750, now: "2027-06-01T00:00:00Z" });
ok("terminated nurse: recurring tail capped at termination month", sumT.recurring.tailByMonth.length <= 1, String(sumT.recurring.tailByMonth.length));

console.log(`\n${fail ? "RETENTION FAILED" : "RETENTION PASSED"} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
