import { describe, expect, it } from "vitest";
import {
  applySessionOutcomes,
  dueEntries,
  emptyQueue,
  markReviewDone,
  mergeQueues,
  nextDueAt,
  recordCorrect,
  recordMiss,
} from "./spacedQueue";

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 6, 10, 12, 0, 0); // fixed clock - all math is relative

describe("recordMiss", () => {
  it("a new miss enters box 1, due tomorrow", () => {
    const q = recordMiss(emptyQueue(), "q1", T0);
    expect(q.entries).toHaveLength(1);
    expect(q.entries[0]).toMatchObject({ id: "q1", box: 1, lapses: 0, dueAt: T0 + DAY });
  });

  it("missing a queued item resets it to box 1 and counts a lapse", () => {
    let q = recordMiss(emptyQueue(), "q1", T0);
    q = recordCorrect(q, "q1", T0 + DAY); // box 2
    q = recordMiss(q, "q1", T0 + 2 * DAY);
    expect(q.entries[0]).toMatchObject({ box: 1, lapses: 1, dueAt: T0 + 3 * DAY });
  });
});

describe("recordCorrect", () => {
  it("advances through the 1/3/7/14-day curve and graduates after box 4", () => {
    let q = recordMiss(emptyQueue(), "q1", T0);
    q = recordCorrect(q, "q1", T0); // → box 2, +3d
    expect(q.entries[0]).toMatchObject({ box: 2, dueAt: T0 + 3 * DAY });
    q = recordCorrect(q, "q1", T0); // → box 3, +7d
    expect(q.entries[0]).toMatchObject({ box: 3, dueAt: T0 + 7 * DAY });
    q = recordCorrect(q, "q1", T0); // → box 4, +14d
    expect(q.entries[0]).toMatchObject({ box: 4, dueAt: T0 + 14 * DAY });
    q = recordCorrect(q, "q1", T0); // graduated
    expect(q.entries).toHaveLength(0);
  });

  it("ignores items that were never queued", () => {
    expect(recordCorrect(emptyQueue(), "ghost", T0).entries).toHaveLength(0);
  });
});

describe("applySessionOutcomes", () => {
  it("misses enqueue, corrects only advance already-queued items", () => {
    let q = recordMiss(emptyQueue(), "old", T0);
    q = applySessionOutcomes(
      q,
      [
        { id: "old", correct: true }, // queued → advance to box 2
        { id: "new-miss", correct: false }, // → enqueue
        { id: "fresh-correct", correct: true }, // never queued → ignored
      ],
      T0 + DAY,
    );
    expect(q.entries.map((e) => e.id).sort()).toEqual(["new-miss", "old"]);
    expect(q.entries.find((e) => e.id === "old")!.box).toBe(2);
  });
});

describe("due + next-due", () => {
  it("returns overdue items oldest first and the next future due time", () => {
    let q = recordMiss(emptyQueue(), "a", T0); // due T0+1d
    q = recordMiss(q, "b", T0 + DAY); // due T0+2d
    const at = T0 + DAY + 60_000;
    expect(dueEntries(q, at).map((e) => e.id)).toEqual(["a"]);
    expect(nextDueAt(q, at)).toBe(T0 + 2 * DAY);
    expect(nextDueAt(emptyQueue(), T0)).toBeNull();
  });
});

describe("mergeQueues (cross-device sync)", () => {
  it("unions by id, keeping the entry with more progress", () => {
    // Device A: q1 advanced to box 3. Device B: q1 still box 1, plus q2.
    let a = recordMiss(emptyQueue(), "q1", T0);
    a = recordCorrect(a, "q1", T0);
    a = recordCorrect(a, "q1", T0); // box 3
    let b = recordMiss(emptyQueue(), "q1", T0 + DAY);
    b = recordMiss(b, "q2", T0 + DAY);
    const m = mergeQueues(a, b);
    expect(m.entries).toHaveLength(2);
    expect(m.entries.find((e) => e.id === "q1")!.box).toBe(3);
    expect(m.entries.find((e) => e.id === "q2")!.box).toBe(1);
  });

  it("is commutative and takes the best streak + later review day", () => {
    const a = { ...markReviewDone(emptyQueue(), T0), streak: 4, lastReviewDay: "2026-07-08" };
    const b = { ...markReviewDone(emptyQueue(), T0), streak: 2, lastReviewDay: "2026-07-10" };
    const ab = mergeQueues(a, b);
    const ba = mergeQueues(b, a);
    expect(ab.streak).toBe(4);
    expect(ab.lastReviewDay).toBe("2026-07-10");
    expect(JSON.stringify([...ab.entries].sort((x, y) => x.id.localeCompare(y.id)))).toBe(
      JSON.stringify([...ba.entries].sort((x, y) => x.id.localeCompare(y.id))),
    );
    expect(ba.streak).toBe(ab.streak);
  });

  it("keeps max lapses and earliest addedAt on conflicts", () => {
    let a = recordMiss(emptyQueue(), "q1", T0); // addedAt T0
    let b = recordMiss(emptyQueue(), "q1", T0 + DAY);
    b = recordCorrect(b, "q1", T0 + DAY);
    b = recordMiss(b, "q1", T0 + 2 * DAY); // lapses 1
    const m = mergeQueues(a, b);
    const e = m.entries[0];
    expect(e.lapses).toBe(1);
    expect(e.addedAt).toBe(T0);
  });
});

describe("markReviewDone (streak)", () => {
  it("consecutive days grow the streak; a gap resets; same-day is idempotent", () => {
    let q = markReviewDone(emptyQueue(), T0);
    expect(q.streak).toBe(1);
    q = markReviewDone(q, T0 + 2 * 60 * 60 * 1000); // same day
    expect(q.streak).toBe(1);
    q = markReviewDone(q, T0 + DAY); // next day
    expect(q.streak).toBe(2);
    q = markReviewDone(q, T0 + 4 * DAY); // gap
    expect(q.streak).toBe(1);
  });
});
