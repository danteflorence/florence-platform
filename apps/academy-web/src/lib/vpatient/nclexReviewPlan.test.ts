import { describe, expect, it } from "vitest";
import { buildReviewPlan, groupByNclexSection } from "./nclexReviewPlan";
import { cjmmScorecard, evaluate } from "./score";
import { allScenarios } from "../../data/vpatient/registry";
import { init, tick } from "./engine";
import { SEPSIS_01 } from "../../data/vpatient/scenarios/sepsis01";
import type { ClientNeed } from "../../types/question";
import type { VPatientScenario } from "../../data/vpatient/types";

// A tiny synthetic library spanning several NCLEX sections so apportionment is
// observable without depending on which real scenarios exist.
function stub(id: string, clientNeed: ClientNeed, status: VPatientScenario["status"] = "approved"): VPatientScenario {
  return { ...(SEPSIS_01 as VPatientScenario), id, title: `Stub ${id}`, clientNeed, status };
}
const lib: VPatientScenario[] = [
  stub("phys-1", "physiological-adaptation"),
  stub("phys-2", "physiological-adaptation"),
  stub("pharm-1", "pharmacological-therapies"),
  stub("mgmt-1", "management-of-care"),
  stub("psych-1", "psychosocial-integrity"),
  stub("draft-1", "reduction-of-risk", "draft"),
];

describe("groupByNclexSection", () => {
  it("groups by NCLEX section, heaviest test-plan weight first, with an exemplar", () => {
    const sections = groupByNclexSection(lib);
    // Management of Care (0.18) is the heaviest represented section → first non-empty.
    const nonEmpty = sections.filter((s) => s.scenarioIds.length > 0);
    expect(nonEmpty[0].clientNeed).toBe("management-of-care");
    const phys = sections.find((s) => s.clientNeed === "physiological-adaptation")!;
    expect(phys.scenarioIds.sort()).toEqual(["phys-1", "phys-2"]);
    expect(phys.group).toBe("Physiological Integrity");
    // Exemplar prefers an approved scenario.
    const rr = sections.find((s) => s.clientNeed === "reduction-of-risk")!;
    expect(rr.exemplarId).toBe("draft-1"); // only one, a draft
  });

  it("covers all 8 sections even when some are empty", () => {
    expect(groupByNclexSection(lib)).toHaveLength(8);
  });
});

describe("buildReviewPlan", () => {
  it("lays out exactly N days, weighted toward heavier sections", () => {
    const plan = buildReviewPlan(lib, 10);
    expect(plan).toHaveLength(10);
    expect(plan.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    // Every assigned day references a real scenario from its section.
    for (const d of plan) {
      expect(d.simOfTheDayId).toBeDefined();
      const sc = lib.find((s) => s.id === d.simOfTheDayId)!;
      expect(sc.clientNeed).toBe(d.clientNeed);
    }
    // Physiological Integrity sections (heaviest group) get the most days.
    const physIntegrityDays = plan.filter((d) => d.group === "Physiological Integrity").length;
    const psychDays = plan.filter((d) => d.clientNeed === "psychosocial-integrity").length;
    expect(physIntegrityDays).toBeGreaterThan(psychDays);
  });

  it("rotates through a section's scenarios across its days", () => {
    const many = [
      stub("a", "physiological-adaptation"),
      stub("b", "physiological-adaptation"),
      stub("c", "physiological-adaptation"),
    ];
    const plan = buildReviewPlan(many, 3);
    const ids = plan.map((d) => d.simOfTheDayId);
    expect(new Set(ids).size).toBe(3); // all three used, none repeated
  });

  it("is deterministic and handles the empty/zero cases", () => {
    expect(buildReviewPlan(lib, 10)).toEqual(buildReviewPlan(lib, 10));
    expect(buildReviewPlan(lib, 0)).toEqual([]);
    expect(buildReviewPlan([], 5)).toEqual([]);
  });

  it("works over the real registry", () => {
    const plan = buildReviewPlan(allScenarios(), 6);
    expect(plan.length).toBeGreaterThan(0);
  });
});

describe("cjmmScorecard", () => {
  it("returns all 6 NCJMM steps in model order, score or null", () => {
    let s = init(SEPSIS_01);
    for (let i = 0; i < 30; i++) s = tick(s, SEPSIS_01);
    const card = cjmmScorecard(evaluate(s, SEPSIS_01));
    expect(card.map((r) => r.step)).toEqual([
      "recognize-cues",
      "analyze-cues",
      "prioritize-hypotheses",
      "generate-solutions",
      "take-actions",
      "evaluate-outcomes",
    ]);
    expect(card.map((r) => r.order)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const r of card) expect(r.score === null || (r.score >= 0 && r.score <= 1)).toBe(true);
  });
});
