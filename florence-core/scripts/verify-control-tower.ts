// In-process smoke for the Production Ledger Control Tower (no server). Seeds nurses
// at distinct canonical stages and asserts the deriver + aggregation + forecast.
//
//   node scripts/verify-control-tower.ts

import { foldPassport, FUNNEL_STAGES } from "../src/passport.ts";
import type { Nurse, NurseEvent, NurseRef } from "../src/store.ts";
import { canonicalStage, CANONICAL_STAGES, RULE_STAGES, DEFAULT_STAGE, RESERVED_STAGES } from "../src/ledgerStages.ts";
import { controlTower, type NurseBundle } from "../src/controlTower.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
  cond ? (pass += 1) : (fail += 1);
};

let t = 0;
const ev = (nurseId: string, type: string, data: Record<string, unknown>): NurseEvent => ({
  id: `e${t}`, nurse_id: nurseId, type, source: "test", at: new Date(Date.UTC(2027, 0, 1, 0, 0, t++)).toISOString(), data, created_at: "",
});
const bundle = (id: string, name: string, events: NurseEvent[]): NurseBundle => ({
  nurse: { id, email: `${id}@x.com`, name, created_at: "", updated_at: "" } as Nurse,
  refs: [] as NurseRef[],
  events,
});

// A: enrolled + assessed green → readiness_cleared
const a = bundle("nrs_a", "A", [ev("nrs_a", "academy.enrolled", {}), ev("nrs_a", "academy.assessment_completed", { band: "green", passProbability: 0.85 })]);
// B: + nclex passed + licensed → licensed_rn (licensed, not yet matched)
const b = bundle("nrs_b", "B", [ev("nrs_b", "academy.assessment_completed", { band: "green" }), ev("nrs_b", "pathway.nclex_status", { status: "passed" }), ev("nrs_b", "pathway.licensure_status", { status: "issued", state: "CA" })]);
// C: licensed + matched → matched
const c = bundle("nrs_c", "C", [ev("nrs_c", "pathway.licensure_status", { status: "active", state: "CA" }), ev("nrs_c", "ats.matched", { employer: "Kaiser", employerId: "emp1" })]);
// D: started + billing → billing_active, with a start month
const d = bundle("nrs_d", "D", [ev("nrs_d", "pathway.licensure_status", { status: "issued", state: "CA" }), ev("nrs_d", "ats.started", { employer: "Kaiser", startDate: "2027-02-15" }), ev("nrs_d", "billing.subscription_started", {})]);
// E: just a document → credentials_uploaded
const e = bundle("nrs_e", "E", [ev("nrs_e", "pathway.document_verified", { key: "passport_bio" })]);
// F: started + billing + retained_30d → retained_30d (retention outranks billing)
const f = bundle("nrs_f", "F", [ev("nrs_f", "pathway.licensure_status", { status: "issued", state: "CA" }), ev("nrs_f", "ats.started", { employer: "Kaiser", startDate: "2027-02-15" }), ev("nrs_f", "billing.subscription_started", {}), ev("nrs_f", "ats.retention_30d", {})]);
// G: started + billing + 30/60/90 → retained_90d
const g = bundle("nrs_g", "G", [ev("nrs_g", "pathway.licensure_status", { status: "issued", state: "CA" }), ev("nrs_g", "ats.started", { employer: "Kaiser", startDate: "2027-02-20" }), ev("nrs_g", "billing.subscription_started", {}), ev("nrs_g", "ats.retention_30d", {}), ev("nrs_g", "ats.retention_60d", {}), ev("nrs_g", "ats.retention_90d", {})]);

// canonicalStage derivations
ok("A → readiness_cleared", canonicalStage(foldPassport(a.nurse, a.refs, a.events)) === "readiness_cleared");
ok("B → licensed_rn", canonicalStage(foldPassport(b.nurse, b.refs, b.events)) === "licensed_rn");
ok("C → matched", canonicalStage(foldPassport(c.nurse, c.refs, c.events)) === "matched");
ok("D → billing_active", canonicalStage(foldPassport(d.nurse, d.refs, d.events)) === "billing_active");
ok("E → credentials_uploaded", canonicalStage(foldPassport(e.nurse, e.refs, e.events)) === "credentials_uploaded");

const ct = controlTower([a, b, c, d, e], { feeUsd: 1750, now: "2027-01-01T00:00:00Z" });
ok("totalNurses = 5", ct.totalNurses === 5);
ok("stageCounts: 1 each at the five derived stages", ct.stageCounts.readiness_cleared === 1 && ct.stageCounts.licensed_rn === 1 && ct.stageCounts.matched === 1 && ct.stageCounts.billing_active === 1 && ct.stageCounts.credentials_uploaded === 1);
ok("licensedAvailable = 1 (B: licensed, not yet matched)", ct.licensedAvailable === 1, String(ct.licensedAvailable));
ok("employerReadyCount = 3 (B,C,D licensed+)", ct.employerReadyCount === 3, String(ct.employerReadyCount));
ok("startedToDate = 1 (D)", ct.forecast.startedToDate === 1);
ok("billingActive = 1 (D)", ct.forecast.billingActive === 1);
ok("MRR = 1 × 1750", ct.forecast.monthlyRecurringUsd === 1750 && ct.forecast.annualizedUsd === 21000);
ok("pipeline expected starts > 0 (B,C in flight)", ct.forecast.pipelineExpectedStarts > 0, String(ct.forecast.pipelineExpectedStarts));
ok("startsByMonth has 2027-02 (D)", ct.forecast.startsByMonth.some((m) => m.month === "2027-02" && m.started === 1));
ok("blockers list the in-flight stages (licensed_rn, matched)", ct.blockers.some((x) => x.stage === "licensed_rn") && ct.blockers.some((x) => x.stage === "matched"));
ok("roster has 5 rows with stages", ct.roster.length === 5 && ct.roster.every((r) => !!r.stage));
ok("ct.retention present (additive); D is the lone billing-grade start", !!ct.retention && ct.retention.startedBillingGrade === 1);

// Retention tail — SEPARATE aggregation so the 16 assertions above stay byte-exact.
ok("F → retained_30d (retention outranks billing)", canonicalStage(foldPassport(f.nurse, f.refs, f.events)) === "retained_30d");
ok("G → retained_90d", canonicalStage(foldPassport(g.nurse, g.refs, g.events)) === "retained_90d");
const ctR = controlTower([f, g], { feeUsd: 1750, now: "2027-03-01T00:00:00Z" });
ok("retention: startedBillingGrade = 2 (F,G)", ctR.retention.startedBillingGrade === 2);
ok("retention curve 30d count = 2 (F,G)", ctR.retention.curve.find((c) => c.milestone === "30d")?.count === 2);
ok("retention curve 90d count = 1 (G)", ctR.retention.curve.find((c) => c.milestone === "90d")?.count === 1);
ok("retention cohort churn 30→90 = 50%", ctR.retention.cohorts[0]?.churnPct30to90 === 50, String(ctR.retention.cohorts[0]?.churnPct30to90));
ok("retention MRR = 2 × 1750 (active this month)", ctR.retention.recurring.monthlyRecurringUsd === 3500, String(ctR.retention.recurring.monthlyRecurringUsd));
ok("retention lifetime booked = 2 × 1750 × 24", ctR.retention.recurring.lifetimeBookedUsd === 84000, String(ctR.retention.recurring.lifetimeBookedUsd));
ok("billingActive NOT double-counted by retention (F,G = 2)", ctR.forecast.billingActive === 2 && ctR.forecast.startedToDate === 2);

// Reachability guard (capstone): every canonical stage must be derivable, the default,
// or explicitly reserved — no silently-dead stage (this caught employer_ready_packet).
const unreachable = CANONICAL_STAGES.filter((s) => !RULE_STAGES.includes(s) && s !== DEFAULT_STAGE && !RESERVED_STAGES.includes(s));
ok("no dead canonical stage (every stage derivable / default / reserved)", unreachable.length === 0, unreachable.join(",") || "none");
// employer_ready_packet now reachable: licensed + credential packet, not yet matched.
const erp = bundle("erp", "ERP", [ev("erp", "pathway.licensure_status", { status: "issued", state: "TX" }), ev("erp", "pathway.document_verified", { key: "passport_bio" })]);
ok("employer_ready_packet derivable (licensed + document, no placement)", canonicalStage(foldPassport(erp.nurse, erp.refs, erp.events)) === "employer_ready_packet");
// FUNNEL_STAGES stays index-aligned after the Phase 1 retained_60d insert + 90d bump.
ok("FUNNEL_STAGES alignment: [11]=retained_60d, [12]=retained_90d", FUNNEL_STAGES[11] === "retained_60d" && FUNNEL_STAGES[12] === "retained_90d");

console.log(`\n${fail ? "CONTROL TOWER FAILED" : "CONTROL TOWER PASSED"} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
