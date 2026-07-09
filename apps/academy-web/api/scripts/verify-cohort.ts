// Verify the cohort pass-rate data asset: corridor mapping, first-time pass-rate
// computation, "above gate at sit" signal, k-anonymity suppression, and that the
// published report contains no suppressed cells.
//
//   node scripts/verify-cohort.ts

import { cohortPassRates, publishedReport, corridorOf, type CohortInput } from "../src/cohortStats.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` - ${extra}` : ""}`);
  cond ? (pass += 1) : (fail += 1);
};

ok("corridorOf maps PH + full names + falls back to Other", corridorOf("PH") === "Philippines" && corridorOf("Nigeria") === "Nigeria" && corridorOf("US") === "Other");

// 10 Philippines first-time sits (6 pass); 4 of them above the readiness gate.
// 3 India sits (1 pass) → below minCell → suppressed.
const candidates: CohortInput["candidates"] = [];
const outcomes: CohortInput["outcomes"] = [];
const assessments: CohortInput["assessments"] = [];
for (let i = 0; i < 10; i++) {
  const id = `ph-${i}`;
  candidates.push({ id, country: "PH" });
  outcomes.push({ candidate_id: id, kind: "nclex_result", status: i < 6 ? "pass" : "fail", occurred_at: `2026-03-${10 + i}` });
  assessments.push({ candidate_id: id, readiness: i < 4 ? 0.86 : 0.5, created_at: "2026-03-01" });
}
for (let i = 0; i < 3; i++) {
  const id = `in-${i}`;
  candidates.push({ id, country: "India" });
  outcomes.push({ candidate_id: id, kind: "nclex_result", status: i === 0 ? "pass" : "fail", occurred_at: "2026-04-01" });
}

const stats = cohortPassRates({ candidates, outcomes, assessments, minCell: 5, gateMin: 0.8 });
const ph = stats.find((s) => s.corridor === "Philippines")!;
const india = stats.find((s) => s.corridor === "India")!;

ok("PH corridor: 10 sits, 6 first-time passes", ph.sits === 10 && ph.firstTimePass === 6);
ok("PH pass rate = 0.6 (not suppressed)", ph.passRate === 0.6 && ph.suppressed === false);
ok("PH 'above gate at sit' = 4", ph.aboveGateAtSit === 4);
ok("PH carries published national baseline", ph.nationalBaseline === 0.52);
ok("India corridor suppressed (3 < minCell 5), rate null", india.suppressed === true && india.passRate === null);

// only the FIRST nclex_result counts as the first-time attempt
const retry: CohortInput = {
  candidates: [{ id: "x", country: "PH" }],
  outcomes: [
    { candidate_id: "x", kind: "nclex_result", status: "fail", occurred_at: "2026-01-01" },
    { candidate_id: "x", kind: "nclex_result", status: "pass", occurred_at: "2026-06-01" },
  ],
  assessments: [],
  minCell: 1,
};
const rs = cohortPassRates(retry)[0]!;
ok("first-time rate uses the EARLIEST sit (fail), not the later pass", rs.sits === 1 && rs.firstTimePass === 0);

const report = publishedReport(stats, { stampIso: "2026-06-14T00:00:00Z" });
ok("published report drops suppressed cells", report.corridors.every((c) => !c.suppressed) && report.corridors.some((c) => c.corridor === "Philippines") && !report.corridors.some((c) => c.corridor === "India"));

console.log(`\n${fail ? "COHORT FAILED" : "COHORT PASSED"} - ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
