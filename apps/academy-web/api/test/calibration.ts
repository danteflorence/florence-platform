// Calibration math checks - pure, offline. Run: `node test/calibration.ts`.
import { strict as assert } from "node:assert";
import { calibrateItems, difficultyFromPassRate, validateCut } from "../src/calibration.ts";

let passed = 0;
const ok = (l: string) => {
  passed++;
  console.log(`  ✓ ${l}`);
};

// Rasch inversion: 50% pass = 0 difficulty; harder items positive; clamped.
assert.equal(difficultyFromPassRate(0.5), -0);
assert.ok(difficultyFromPassRate(0.2) > 1); // rarely passed → hard
assert.ok(difficultyFromPassRate(0.9) < -1); // usually passed → easy
assert.equal(difficultyFromPassRate(0), 3); // clamp, stays finite
assert.equal(difficultyFromPassRate(1), -3);
ok("difficulty inversion: p=.5 → 0, low p → hard, clamped at ±3 logits");

// Evidence gate: thin items stay on their priors.
const items = calibrateItems(
  [
    { question_id: "q-hard", attempts: 50, pass_rate: 0.25 },
    { question_id: "q-easy", attempts: 40, pass_rate: 0.85 },
    { question_id: "q-thin", attempts: 5, pass_rate: 0.0 },
  ],
  20,
);
assert.equal(items.length, 2);
assert.equal(items[0].question_id, "q-hard"); // hardest first
assert.ok(items[0].empirical_b > 0 && items[1].empirical_b < 0);
ok("calibrateItems: min-attempts gate + hardest-first ordering");

// Cut validation: per-band pass rates + the green promise.
const v = validateCut([
  { band: "green", passed: true },
  { band: "green", passed: true },
  { band: "green", passed: true },
  { band: "green", passed: false },
  { band: "orange", passed: false },
  { band: "orange", passed: true },
  { band: "red", passed: false },
]);
assert.equal(v.pairs, 7);
assert.equal(v.green_ppv, 0.75);
assert.equal(v.non_green_pass_rate, Math.round((1 / 3) * 1000) / 1000);
assert.equal(v.by_band[0].band, "green"); // ordered best-first
ok("validateCut: green PPV + non-green pass rate + band ordering");

// Degenerate: no green pairs yet → nulls, not crashes.
const empty = validateCut([{ band: "red", passed: false }]);
assert.equal(empty.green_ppv, null);
ok("validateCut: null PPV before any green outcomes exist");

console.log(`PASS - ${passed} checks`);
