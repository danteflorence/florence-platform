import { describe, it, expect } from "vitest";
import { subscaleMastery, masteryGaps, masteryMeans, MASTERY_THRESHOLD } from "./mastery";
import type { CatResponse } from "./cat";
import type { ClientNeed, CjmmStep } from "../types/question";

// Helper: N responses in a Client Need at difficulty b, all scored `score`.
function bucket(clientNeed: ClientNeed, n: number, b: number, score: number, cjmm?: CjmmStep): CatResponse[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${clientNeed}-${i}`,
    difficulty: b,
    clientNeed,
    score,
    ...(cjmm ? { cjmm } : {}),
  }));
}

describe("subscaleMastery", () => {
  it("estimates a higher theta for the strong Client Need than the weak one", () => {
    const responses = [
      ...bucket("pharmacological-therapies", 6, 0.5, 1), // all correct on moderate items → strong
      ...bucket("physiological-adaptation", 6, 0.5, 0), // all wrong → weak
    ];
    const ms = subscaleMastery(responses);
    const strong = ms.find((m) => m.key === "pharmacological-therapies")!;
    const weak = ms.find((m) => m.key === "physiological-adaptation")!;
    expect(strong.theta).toBeGreaterThan(weak.theta);
    expect(strong.passProb).toBeGreaterThan(weak.passProb);
    expect(strong.items).toBe(6);
  });

  it("masteryGaps returns the weak subscale first and excludes the strong one", () => {
    const responses = [
      ...bucket("pharmacological-therapies", 6, 0.5, 1),
      ...bucket("physiological-adaptation", 6, 0.5, 0),
    ];
    const gaps = masteryGaps(subscaleMastery(responses));
    expect(gaps.length).toBeGreaterThanOrEqual(1);
    expect(gaps[0]!.key).toBe("physiological-adaptation");
    expect(gaps.some((g) => g.key === "pharmacological-therapies")).toBe(false);
  });

  it("ignores subscales below the minimum item count (insufficient evidence ≠ gap)", () => {
    const responses = bucket("safety-infection-control", 2, 0.5, 0); // weak but only 2 items
    const gaps = masteryGaps(subscaleMastery(responses));
    expect(gaps.length).toBe(0);
    expect(MASTERY_THRESHOLD.minItems).toBeGreaterThan(2);
  });

  it("computes per-CJMM-step mastery for tagged items", () => {
    const responses = [
      ...bucket("management-of-care", 5, 0.3, 0, "analyze-cues"), // weak CJMM layer
      ...bucket("management-of-care", 5, 0.3, 1, "take-actions"), // strong CJMM layer
    ];
    const ms = subscaleMastery(responses);
    const cjmm = ms.filter((m) => m.dim === "cjmm");
    expect(cjmm.map((m) => m.key).sort()).toEqual(["analyze-cues", "take-actions"]);
    const means = masteryMeans(ms);
    expect(Object.keys(means.by_cjmm)).toContain("analyze-cues");
    const gaps = masteryGaps(ms);
    expect(gaps.some((g) => g.dim === "cjmm" && g.key === "analyze-cues")).toBe(true);
  });
});
