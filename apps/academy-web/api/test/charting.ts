// Charting grader checks - pure, offline. Run: `node test/charting.ts`.
import { strict as assert } from "node:assert";
import { gradeChartNote } from "../src/charting.ts";

let passed = 0;
const ok = (l: string) => {
  passed++;
  console.log(`  ✓ ${l}`);
};

const expected = {
  mustMention: ["hypotension SBP below 90", "oxygen applied", "provider notified"],
};

// A strong note: objective, timed, numeric, closed-loop.
const good = gradeChartNote(
  "14:32 BP 86/54, HR 122, RR 24, SpO2 89% on RA. O2 applied at 4L NC, SpO2 up to 94%. Dr. Reyes notified at 14:35, orders received. Reassessed 14:45: BP 98/60.",
  expected,
);
assert.equal(good.missing.length, 0);
assert.equal(good.style_flags.length, 0);
assert.ok(good.score >= 0.95, `good score was ${good.score}`);
ok("strong note: full coverage, timed, numeric, closed-loop → ~1.0");

// A weak note: subjective, vague, no numbers/times, blames the patient.
const weak = gradeChartNote("Patient seems fine now. Was uncooperative earlier. I think the BP was low.", expected);
assert.ok(weak.score < 0.5, `weak score was ${weak.score}`);
assert.ok(weak.style_flags.length >= 2);
assert.ok(weak.missing.length >= 1);
assert.ok(/times/i.test(weak.feedback));
ok("weak note: subjective + vague + untimed → flagged and low");

// Blame language is its own flag - the career-ender rule.
const blame = gradeChartNote("14:00 BP 86/54. O2 applied. Provider notified. Med error occurred, tech at fault.", expected);
assert.ok(blame.style_flags.some((f) => f.includes("incident report")));
ok("blame/error language flagged with the incident-report rule");

console.log(`PASS - ${passed} checks`);
