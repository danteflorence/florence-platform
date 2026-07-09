import { describe, it, expect } from "vitest";
import { buildRemediation } from "./remediation";
import type { SubscaleMastery } from "./mastery";
import type { CaseStudy, CjmmStep, ClientNeed, Question } from "../types/question";

// Minimal Question objects - buildRemediation only reads id/clientNeed/cjmm/difficulty.
function q(id: string, clientNeed: ClientNeed, difficulty: number, cjmm?: CjmmStep): Question {
  return {
    id,
    type: "multiple-choice",
    difficulty,
    clientNeed,
    section: 1,
    topic: "t",
    stem: "s",
    rationale: "r",
    ...(cjmm ? { cjmm } : {}),
    options: [{ id: "a", text: "a" }],
    answer: "a",
  } as unknown as Question;
}

const gap = (dim: "client_need" | "cjmm", key: ClientNeed | CjmmStep, theta: number): SubscaleMastery => ({
  dim,
  key,
  theta,
  se: 0.3,
  passProb: 0.3,
  items: 6,
});

describe("buildRemediation", () => {
  it("selects only items of the weak Client Need, most-informative near the gap θ", () => {
    const pool = [
      q("pharm-easy", "pharmacological-therapies", -2),
      q("phys-at-gap", "physiological-adaptation", -0.5), // near gap θ → most informative
      q("phys-far", "physiological-adaptation", 2.5),
      q("other", "management-of-care", -0.5),
    ];
    const mod = buildRemediation(gap("client_need", "physiological-adaptation", -0.5), pool, { count: 5 });
    expect(mod.itemIds).toContain("phys-at-gap");
    expect(mod.itemIds).not.toContain("pharm-easy");
    expect(mod.itemIds).not.toContain("other");
    expect(mod.itemIds[0]).toBe("phys-at-gap"); // highest Fisher info at θ = -0.5
    expect(mod.voiceTutorPrompt.length).toBeGreaterThan(0);
  });

  it("filters by CJMM step for a clinical-judgment gap and attaches a matching case study", () => {
    const pool = [
      q("c1", "management-of-care", -0.3, "analyze-cues"),
      q("c2", "management-of-care", -0.4, "analyze-cues"),
      q("c3", "management-of-care", -0.2, "take-actions"),
    ];
    const cases: CaseStudy[] = [{ id: "case-1", title: "Sepsis", tabs: [], questionIds: ["c1", "c9"] }];
    const mod = buildRemediation(gap("cjmm", "analyze-cues", -0.3), pool, { cases });
    expect(mod.itemIds.sort()).toEqual(["c1", "c2"]);
    expect(mod.itemIds).not.toContain("c3");
    expect(mod.caseStudyId).toBe("case-1");
    expect(mod.voiceTutorPrompt).toMatch(/analyze cues/i);
  });
});
