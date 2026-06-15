import { describe, it, expect } from "vitest";
import {
  raschP,
  itemInfo,
  estimateAbility,
  selectNextItem,
  shouldStop,
  CAT_MODES,
  LEVELS,
  LEVEL_BY_KEY,
  applyLevel,
  indexItems,
  caseDifficulty,
  selectNextCase,
  pacing,
  type CatResponse,
} from "./cat";
import {
  gradeQuestion,
  type ClientNeed,
  type MultipleChoiceQuestion,
  type SelectAllQuestion,
  type OrderedResponseQuestion,
  type MatrixQuestion,
  type BowtieQuestion,
  type CaseStudy,
  type Question,
} from "../types/question";

const NEED: ClientNeed = "physiological-adaptation";
const mk = (n: number, b: number, score: number): CatResponse[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `r${i}`,
    difficulty: b,
    clientNeed: NEED,
    score,
  }));

describe("Rasch model", () => {
  it("is 0.5 when ability equals difficulty", () => {
    expect(raschP(0, 0)).toBeCloseTo(0.5, 6);
    expect(raschP(1.5, 1.5)).toBeCloseTo(0.5, 6);
  });
  it("increases monotonically with ability", () => {
    expect(raschP(2, 0)).toBeGreaterThan(raschP(0, 0));
    expect(raschP(-2, 0)).toBeLessThan(0.5);
  });
  it("information peaks when difficulty matches ability", () => {
    expect(itemInfo(0, 0)).toBeCloseTo(0.25, 6);
    expect(itemInfo(0, 0)).toBeGreaterThan(itemInfo(0, 1));
    expect(itemInfo(0, 0)).toBeGreaterThan(itemInfo(0, -1));
  });
});

describe("EAP ability estimate", () => {
  it("rises above the standard for all-correct and falls below for all-wrong", () => {
    expect(estimateAbility(mk(6, 1, 1)).theta).toBeGreaterThan(0);
    expect(estimateAbility(mk(6, 1, 0)).theta).toBeLessThan(0);
  });
  it("shrinks the standard error as more items are answered", () => {
    const few = estimateAbility(mk(4, 0, 0.5)).se;
    const many = estimateAbility(mk(16, 0, 0.5)).se;
    expect(many).toBeLessThan(few);
  });
  it("projects a higher pass probability the better the candidate does", () => {
    expect(estimateAbility(mk(8, 0.5, 1)).passProb).toBeGreaterThan(0.5);
    expect(estimateAbility(mk(8, 0.5, 0)).passProb).toBeLessThan(0.5);
  });
});

describe("Adaptive item selection", () => {
  const pool: Question[] = [-2, 0, 2].map((b, i) => ({
    id: `i${i}`,
    type: "multiple-choice",
    difficulty: b,
    clientNeed: NEED,
    section: 7,
    topic: "t",
    stem: "s",
    rationale: "r",
    options: ["a", "b"],
    correct: 0,
  }));
  const zeroCounts = {
    "management-of-care": 0,
    "safety-infection-control": 0,
    "health-promotion": 0,
    "psychosocial-integrity": 0,
    "basic-care-comfort": 0,
    "pharmacological-therapies": 0,
    "reduction-of-risk": 0,
    "physiological-adaptation": 0,
  } as Record<ClientNeed, number>;

  it("picks the most informative item at the current ability", () => {
    const pick = selectNextItem(pool, new Set(), 0, zeroCounts, 0);
    expect(pick?.difficulty).toBe(0); // b == theta maximizes information
  });
  it("never repeats an already-answered item", () => {
    const answered = new Set(["i1"]); // the b=0 item
    const pick = selectNextItem(pool, answered, 0, zeroCounts, 1);
    expect(pick).not.toBeNull();
    expect(pick!.id).not.toBe("i1");
  });
  it("returns null when the pool is exhausted", () => {
    const all = new Set(pool.map((q) => q.id));
    expect(selectNextItem(pool, all, 0, zeroCounts, 3)).toBeNull();
  });
});

describe("Stopping rules", () => {
  const est = (theta: number, se: number) => ({ theta, se, passProb: 0.5 });
  it("never stops before the minimum length", () => {
    expect(shouldStop(est(2, 0.1), 10, CAT_MODES.exam).stop).toBe(false);
  });
  it("passes when the 95% CI is entirely above the standard", () => {
    const d = shouldStop(est(1, 0.2), 90, CAT_MODES.exam);
    expect(d.stop).toBe(true);
    expect(d.outcome).toBe("pass");
  });
  it("fails when the 95% CI is entirely below the standard", () => {
    const d = shouldStop(est(-1, 0.2), 90, CAT_MODES.exam);
    expect(d.stop).toBe(true);
    expect(d.outcome).toBe("fail");
  });
  it("nightly mode runs a fixed length then stops on max-length", () => {
    expect(shouldStop(est(0.5, 0.5), 149, CAT_MODES.nightly).stop).toBe(false);
    expect(shouldStop(est(0.5, 0.5), 150, CAT_MODES.nightly).reason).toBe(
      "max-length",
    );
  });
});

describe("Grading", () => {
  const base = {
    id: "q",
    difficulty: 0,
    clientNeed: NEED,
    section: 7,
    topic: "t",
    stem: "s",
    rationale: "r",
  };

  it("scores multiple-choice 1 / 0", () => {
    const q: MultipleChoiceQuestion = {
      ...base,
      type: "multiple-choice",
      options: ["a", "b", "c"],
      correct: 1,
    };
    expect(gradeQuestion(q, { type: "multiple-choice", choice: 1 }).score).toBe(1);
    expect(gradeQuestion(q, { type: "multiple-choice", choice: 0 }).score).toBe(0);
  });

  it("gives select-all partial credit with a penalty for wrong picks", () => {
    const q: SelectAllQuestion = {
      ...base,
      type: "select-all",
      options: ["a", "b", "c", "d"],
      correct: [0, 2],
    };
    expect(gradeQuestion(q, { type: "select-all", choices: [0, 2] }).score).toBe(1);
    expect(gradeQuestion(q, { type: "select-all", choices: [0] }).score).toBe(0.5);
    expect(gradeQuestion(q, { type: "select-all", choices: [0, 1] }).score).toBe(0);
  });

  it("scores ordered-response by items in their correct position", () => {
    const q: OrderedResponseQuestion = {
      ...base,
      type: "ordered-response",
      steps: ["first", "second", "third"],
    };
    expect(
      gradeQuestion(q, { type: "ordered-response", order: [0, 1, 2] }).score,
    ).toBe(1);
    expect(
      gradeQuestion(q, { type: "ordered-response", order: [1, 0, 2] }).score,
    ).toBeCloseTo(1 / 3, 6);
  });

  it("scores a matrix per row", () => {
    const q: MatrixQuestion = {
      ...base,
      type: "matrix",
      rows: ["r1", "r2"],
      columns: ["c1", "c2"],
      mode: "single",
      correct: [[0], [1]],
    };
    expect(
      gradeQuestion(q, { type: "matrix", selected: [[0], [1]] }).score,
    ).toBe(1);
    expect(
      gradeQuestion(q, { type: "matrix", selected: [[0], [0]] }).score,
    ).toBe(0.5);
  });

  it("scores a bow-tie across all five cells", () => {
    const q: BowtieQuestion = {
      ...base,
      type: "bowtie",
      condition: { options: ["x", "y"], correct: 0 },
      actions: { options: ["a", "b", "c"], correct: [1, 2] },
      parameters: { options: ["p", "q", "r"], correct: [0, 1] },
    };
    expect(
      gradeQuestion(q, {
        type: "bowtie",
        condition: 0,
        actions: [1, 2],
        parameters: [0, 1],
      }).score,
    ).toBe(1);
    expect(
      gradeQuestion(q, {
        type: "bowtie",
        condition: 0,
        actions: [1],
        parameters: [0],
      }).score,
    ).toBeCloseTo(3 / 5, 6);
  });
});

describe("Difficulty levels", () => {
  it("exposes a chooser with an explicit start plus an adaptive option", () => {
    expect(LEVELS.map((l) => l.key)).toEqual([
      "foundational",
      "easy",
      "moderate",
      "challenging",
      "adaptive",
    ]);
    for (const l of LEVELS) expect(LEVEL_BY_KEY[l.key]).toBe(l);
  });

  it("orders the explicit levels from easiest to hardest start", () => {
    expect(LEVEL_BY_KEY.foundational.startTheta).toBeLessThan(
      LEVEL_BY_KEY.easy.startTheta,
    );
    expect(LEVEL_BY_KEY.easy.startTheta).toBeLessThan(
      LEVEL_BY_KEY.moderate.startTheta,
    );
    expect(LEVEL_BY_KEY.moderate.startTheta).toBeLessThan(
      LEVEL_BY_KEY.challenging.startTheta,
    );
    expect(Number.isFinite(LEVEL_BY_KEY.adaptive.startTheta)).toBe(true);
  });

  it("overrides only startTheta when applied to a mode config", () => {
    const cfg = applyLevel(CAT_MODES.tutor, "challenging");
    expect(cfg.startTheta).toBe(LEVEL_BY_KEY.challenging.startTheta);
    expect(cfg.mode).toBe("tutor");
    expect(cfg.maxItems).toBe(CAT_MODES.tutor.maxItems);
    expect(cfg.immediateFeedback).toBe(CAT_MODES.tutor.immediateFeedback);
    // does not mutate the shared preset
    expect(CAT_MODES.tutor.startTheta).toBe(-0.3);
  });
});

describe("Case-level selection", () => {
  const caseItem = (id: string, b: number): Question => ({
    id,
    type: "multiple-choice",
    difficulty: b,
    clientNeed: NEED,
    section: 17,
    topic: "t",
    stem: "s",
    rationale: "r",
    options: ["a", "b"],
    correct: 0,
  });
  // A case of 6 items, each at difficulty `b` (so mean difficulty == b).
  const mkCase = (id: string, b: number) => {
    const items = Array.from({ length: 6 }, (_, i) => caseItem(`${id}-q${i + 1}`, b));
    const study: CaseStudy = {
      id,
      title: id,
      tabs: [],
      questionIds: items.map((it) => it.id),
    };
    return { study, items };
  };

  const easy = mkCase("c-easy", -2);
  const mid = mkCase("c-mid", 0);
  const hard = mkCase("c-hard", 2);
  const cases = [easy.study, mid.study, hard.study];
  const byId = indexItems([...easy.items, ...mid.items, ...hard.items]);

  it("derives case difficulty as the mean of its items", () => {
    expect(caseDifficulty(mid.study, byId)).toBeCloseTo(0, 6);
    expect(caseDifficulty(easy.study, byId)).toBeCloseTo(-2, 6);
    // mixed item difficulties average out
    const mixed = mkCase("c-mix", 0);
    mixed.items.forEach((it, i) => (it.difficulty = i < 3 ? -1 : 1));
    expect(caseDifficulty(mixed.study, indexItems(mixed.items))).toBeCloseTo(0, 6);
  });

  it("returns 0 for a case whose items are not in the index", () => {
    const orphan: CaseStudy = { id: "x", title: "x", tabs: [], questionIds: ["nope"] };
    expect(caseDifficulty(orphan, byId)).toBe(0);
  });

  it("serves the case most informative at the current ability", () => {
    expect(selectNextCase(cases, byId, new Set(), 0)?.id).toBe("c-mid");
    expect(selectNextCase(cases, byId, new Set(), 2)?.id).toBe("c-hard");
    expect(selectNextCase(cases, byId, new Set(), -2)?.id).toBe("c-easy");
  });

  it("climbs to a harder case as ability rises", () => {
    const low = selectNextCase(cases, byId, new Set(), -1.5)!;
    const high = selectNextCase(cases, byId, new Set(), 1.5)!;
    expect(caseDifficulty(high, byId)).toBeGreaterThan(caseDifficulty(low, byId));
  });

  it("never repeats an answered case and stops when all are used", () => {
    const pick = selectNextCase(cases, byId, new Set(["c-mid"]), 0);
    expect(pick).not.toBeNull();
    expect(pick!.id).not.toBe("c-mid");
    const all = new Set(cases.map((c) => c.id));
    expect(selectNextCase(cases, byId, all, 0)).toBeNull();
  });

  it("can pick among the top-K nearest cases for session variety", () => {
    // rng=0 → always the best; rng→1 → the K-th nearest. At θ=0 the ranking is
    // mid (closest), then the two ±2 cases tie.
    expect(selectNextCase(cases, byId, new Set(), 0, { topK: 3, rng: () => 0 })?.id).toBe("c-mid");
    const last = selectNextCase(cases, byId, new Set(), 0, { topK: 3, rng: () => 0.99 });
    expect(last).not.toBeNull();
    expect(last!.id).not.toBe("c-mid"); // reached past the best into the tail
  });
});

describe("Timed pacing", () => {
  const t0 = 1_000_000;

  it("counts whole seconds down to the deadline", () => {
    const dl = t0 + 90_000;
    expect(pacing(dl, t0).remainingSec).toBe(90);
    expect(pacing(dl, t0).expired).toBe(false);
    expect(pacing(dl, t0 + 30_000).remainingSec).toBe(60);
    // sub-second remainder rounds up, so the learner sees 0:00 only at zero
    expect(pacing(dl, dl - 200).remainingSec).toBe(1);
  });

  it("never reports negative time and flips to expired at the deadline", () => {
    const dl = t0 + 10_000;
    expect(pacing(dl, dl).expired).toBe(true);
    const past = pacing(dl, t0 + 25_000);
    expect(past.remainingSec).toBe(0);
    expect(past.expired).toBe(true);
  });

  it("escalates urgency as the clock runs low", () => {
    const dl = t0 + 10 * 60_000;
    expect(pacing(dl, t0).tier).toBe("normal"); // 10 min left
    expect(pacing(dl, dl - 4 * 60_000).tier).toBe("warning"); // 4 min left
    expect(pacing(dl, dl - 30_000).tier).toBe("critical"); // 30 s left
  });
});

describe("Timed mode preset", () => {
  it("is a fixed-length test with a countdown limit", () => {
    const cfg = CAT_MODES.timed;
    expect(cfg.minItems).toBe(cfg.maxItems); // fixed length
    expect(cfg.useCiRule).toBe(false);
    expect(cfg.immediateFeedback).toBe(false);
    expect(cfg.timeLimitSec).toBeGreaterThan(0);
  });

  it("keeps its time limit when a difficulty level is applied", () => {
    const cfg = applyLevel(CAT_MODES.timed, "challenging");
    expect(cfg.timeLimitSec).toBe(CAT_MODES.timed.timeLimitSec);
    expect(cfg.startTheta).toBe(LEVEL_BY_KEY.challenging.startTheta);
  });
});
