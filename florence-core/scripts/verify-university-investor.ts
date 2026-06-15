// In-process smoke for the investor (zero-PII rollup) + university (k-anon cohort)
// reports. No server, no DB.
//
//   node scripts/verify-university-investor.ts

import type { Nurse, NurseEvent, NurseRef } from "../src/store.ts";
import { controlTower, type NurseBundle } from "../src/controlTower.ts";
import { investorReport } from "../src/investorReport.ts";
import { universityCohorts } from "../src/universityReport.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
  cond ? (pass += 1) : (fail += 1);
};

let t = 0;
const ev = (id: string, type: string, data: Record<string, unknown>): NurseEvent => ({ id: `e${t}`, nurse_id: id, type, source: "test", at: new Date(Date.UTC(2027, 0, 1, 0, 0, t++)).toISOString(), data, created_at: "" });
const bundle = (id: string, events: NurseEvent[]): NurseBundle => ({ nurse: { id, email: `${id}@x.com`, name: `Name ${id}`, created_at: "", updated_at: "" } as Nurse, refs: [] as NurseRef[], events });

// Billing-active nurses (one employer-direct, one UNIVERSITY-brokered) + a few licensed.
const seeded: NurseBundle[] = [
  bundle("a", [ev("a", "pathway.licensure_status", { status: "issued", state: "TX" }), ev("a", "ats.started", { startDate: "2027-01-10" }), ev("a", "billing.subscription_started", {})]),
  bundle("u", [ev("u", "pathway.licensure_status", { status: "issued", state: "TX" }), ev("u", "university.job_started", { employerId: "emp-uni", universityOrgId: "uni-1", startDate: "2027-01-12" }), ev("u", "billing.subscription_started", {})]),
  bundle("b", [ev("b", "pathway.licensure_status", { status: "issued", state: "TX" })]),
  bundle("c", [ev("c", "pathway.licensure_status", { status: "issued", state: "CA" })]),
];
const summary = controlTower(seeded, { feeUsd: 1750, now: "2027-01-15T00:00:00Z" });

// ── mrrBySource attribution (no double-count; sums to MRR) ────────────────────
const mbs = summary.forecast.mrrBySource;
ok("university-brokered start attributed to mrrBySource.university", mbs.university.starts === 1 && mbs.university.mrrUsd === 1750);
ok("employer-direct start attributed to mrrBySource.employer", mbs.employer.starts === 1 && mbs.employer.mrrUsd === 1750);
ok("mrrBySource sums to monthlyRecurringUsd (no double-count)", mbs.university.mrrUsd + mbs.employer.mrrUsd + mbs.internal.mrrUsd === summary.forecast.monthlyRecurringUsd);

// ── Investor report: zero PII ────────────────────────────────────────────────
const ir = investorReport(summary);
const irJson = JSON.stringify(ir);
ok("investor report has NO PII (nurseId/name/email/roster)", !/nurseId|"name"|email|roster/i.test(irJson));
ok("investor report carries aggregate MRR + totals", ir.forecast.monthlyRecurringUsd === 3500 && ir.totalNurses === 4 && ir.forecast.billingActive === 2);
ok("investor report exposes mrrBySource (university + employer)", ir.mrrBySource.university.starts === 1 && ir.mrrBySource.employer.starts === 1);
ok("investor report includes retention curve + risk distribution", Array.isArray(ir.retention.curve) && typeof ir.onboardingRiskDistribution.low === "number");

// ── University k-anon cohorts ────────────────────────────────────────────────
// 5 TX (reported) + 2 CA (suppressed, n<5).
const uniBundles: NurseBundle[] = [];
for (let i = 0; i < 5; i += 1) uniBundles.push(bundle(`tx${i}`, [ev(`tx${i}`, "pathway.licensure_status", { status: "issued", state: "TX" }), ...(i < 2 ? [ev(`tx${i}`, "ats.started", { startDate: "2027-01-10" }), ev(`tx${i}`, "billing.subscription_started", {})] : [])]));
for (let i = 0; i < 2; i += 1) uniBundles.push(bundle(`ca${i}`, [ev(`ca${i}`, "pathway.licensure_status", { status: "issued", state: "CA" })]));
const uni = universityCohorts(uniBundles, { minCell: 5, now: "2027-01-15T00:00:00Z" });

const tx = uni.cohorts.find((c) => c.cohort === "TX")!;
const ca = uni.cohorts.find((c) => c.cohort === "CA")!;
ok("TX cohort (n=5 ≥ minCell) reported with rates", tx.n === 5 && !tx.suppressed && tx.licensedPct === 100 && tx.startedPct === 40, JSON.stringify(tx));
ok("CA cohort (n=2 < minCell) SUPPRESSED (k-anon)", ca.suppressed && ca.n === null && ca.licensedPct === null);
ok("suppressedCells counts the small cell", uni.suppressedCells === 1);
ok("university report has NO PII (no nurseId/name/email)", !/nurseId|"name"|email/i.test(JSON.stringify(uni)));

console.log(`\n${fail ? "UNIVERSITY+INVESTOR FAILED" : "UNIVERSITY+INVESTOR PASSED"} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
