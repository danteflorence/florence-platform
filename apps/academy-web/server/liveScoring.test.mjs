// Unit tests for the pure poll-scoring half of live persistence.
// Run: node --test server/liveScoring.test.mjs   (chained into `npm test`)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  choicesOf,
  isPollCorrect,
  recordPollOutcome,
  summarizePollStats,
} from "./liveScoring.mjs";

test("single-choice: first pick must be in the correct set", () => {
  assert.equal(isPollCorrect([2], [2], false), true);
  assert.equal(isPollCorrect([2], [1], false), false);
  assert.equal(isPollCorrect([1, 3], [3], false), true);
});

test("multi-select: exact set match, order-independent, no partial credit", () => {
  assert.equal(isPollCorrect([1, 3], [3, 1], true), true);
  assert.equal(isPollCorrect([1, 3], [1], true), false);
  assert.equal(isPollCorrect([1, 3], [1, 3, 4], true), false);
  assert.equal(isPollCorrect([1, 3], [1, 4], true), false);
});

test("ungraded or unanswered never counts as correct", () => {
  assert.equal(isPollCorrect([], [0], false), false);
  assert.equal(isPollCorrect([0], [], false), false);
});

test("choicesOf collects a socket's picks across the answer map, sorted", () => {
  const answers = new Map([
    [2, new Set(["sock-a", "sock-b"])],
    [0, new Set(["sock-a"])],
    [1, new Set(["sock-c"])],
  ]);
  assert.deepEqual(choicesOf(answers, "sock-a"), [0, 2]);
  assert.deepEqual(choicesOf(answers, "sock-c"), [1]);
  assert.deepEqual(choicesOf(answers, "sock-z"), []);
});

test("accumulate + summarize produces one live_poll payload per candidate", () => {
  const stats = new Map();
  recordPollOutcome(stats, "cand_a", true, "recognize-cues");
  recordPollOutcome(stats, "cand_a", false, "recognize-cues");
  recordPollOutcome(stats, "cand_a", true, "take-actions");
  recordPollOutcome(stats, "cand_a", true, undefined); // untagged poll
  recordPollOutcome(stats, "cand_b", false, "take-actions");

  const rows = summarizePollStats(stats);
  assert.equal(rows.length, 2);
  const a = rows.find((r) => r.candidate_id === "cand_a");
  const b = rows.find((r) => r.candidate_id === "cand_b");
  assert.equal(a.kind, "live_poll");
  assert.equal(a.items_completed, 4);
  assert.deepEqual(a.by_cjmm, { "recognize-cues": 0.5, "take-actions": 1 });
  assert.equal(b.items_completed, 1);
  assert.deepEqual(b.by_cjmm, { "take-actions": 0 });
  // No readiness field ever - poll accuracy must not drive the band.
  assert.equal("readiness" in a, false);
});

test("summarize skips empty accumulators entirely", () => {
  const stats = new Map([["cand_x", { taken: 0, correct: 0, byCjmm: new Map() }]]);
  assert.deepEqual(summarizePollStats(stats), []);
});
