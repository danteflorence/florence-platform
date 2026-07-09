import { describe, expect, it } from "vitest";
import type { ReadinessSnapshot } from "./academyAuth";
import { bandPresentation, focusAreaLabel, presentReadiness } from "./readinessView";

const base: ReadinessSnapshot = {
  candidate_id: "cand_x",
  band: "none",
  items_completed: 0,
  assessments_taken: 0,
  sections_completed: 0,
  sections_total: 20,
  focus_areas: [],
  updated_at: "2026-07-09T00:00:00.000Z",
};

describe("bandPresentation", () => {
  it("maps every band to a distinct label and tone", () => {
    const bands = ["green", "yellow", "orange", "red", "none"] as const;
    const labels = new Set(bands.map((b) => bandPresentation(b).label));
    const chips = new Set(bands.map((b) => bandPresentation(b).chipClass));
    expect(labels.size).toBe(bands.length);
    expect(chips.size).toBe(bands.length);
  });

  it("green reads as exam-ready, red as needing work", () => {
    expect(bandPresentation("green").label).toMatch(/ready/i);
    expect(bandPresentation("red").label).toMatch(/work/i);
  });
});

describe("focusAreaLabel", () => {
  it("uses the blueprint label for known Client Needs", () => {
    expect(focusAreaLabel("management-of-care")).toBe("Management of Care");
    expect(focusAreaLabel("physiological-adaptation")).toBe("Physiological Adaptation");
  });

  it("prettifies unknown slugs instead of leaking them raw", () => {
    expect(focusAreaLabel("some-new-area")).toBe("Some New Area");
  });
});

describe("presentReadiness", () => {
  it("has no pass percent before any scored result", () => {
    const v = presentReadiness(base);
    expect(v.passPct).toBeNull();
    expect(v.band).toBe("none");
    expect(v.nextAction).toMatch(/diagnostic/i);
  });

  it("rounds pass probability to a whole percent and computes section progress", () => {
    const v = presentReadiness({
      ...base,
      band: "yellow",
      readiness: 0.786,
      next_action: "You're close - sharpen Pharmacological Therapies, then take another practice exam.",
      focus_areas: ["pharmacological-therapies", "reduction-of-risk"],
      sections_completed: 5,
      assessments_taken: 3,
      items_completed: 240,
    });
    expect(v.passPct).toBe(79);
    expect(v.sectionsPct).toBe(25);
    // Labels come from the SPA blueprint (full NCSBN names), not the API's short names.
    expect(v.focusAreas).toEqual([
      "Pharmacological & Parenteral Therapies",
      "Reduction of Risk Potential",
    ]);
    expect(v.nextAction).toContain("sharpen");
  });

  it("falls back to the baseline prompt when next_action is missing", () => {
    const v = presentReadiness({ ...base, next_action: undefined as unknown as string });
    expect(v.nextAction).toMatch(/baseline diagnostic/i);
  });

  it("never divides by zero on sections_total", () => {
    const v = presentReadiness({ ...base, sections_total: 0 });
    expect(v.sectionsPct).toBe(0);
  });
});
