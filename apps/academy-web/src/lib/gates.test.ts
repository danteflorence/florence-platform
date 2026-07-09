import { describe, it, expect } from "vitest";
import { sectionGate, readinessSit } from "./gates";
import type { SubscaleMastery } from "./mastery";
import type { SectionSpec } from "../data/blueprint";

const section: SectionSpec = { n: 7, title: "Cardiac", slug: "section-7-cardiac", primaryNeed: "physiological-adaptation" };

const m = (key: string, theta: number, items: number): SubscaleMastery => ({
  dim: "client_need",
  key: key as SubscaleMastery["key"],
  theta,
  se: 0.3,
  passProb: theta > 0 ? 0.8 : 0.3,
  items,
});

describe("sectionGate", () => {
  it("closes a section when its primary Client Need is below threshold (with evidence)", () => {
    const r = sectionGate(section, [m("physiological-adaptation", -0.8, 6)]);
    expect(r.open).toBe(false);
    expect(r.blockedBy[0]!.key).toBe("physiological-adaptation");
  });

  it("opens a section when the primary Client Need is mastered", () => {
    const r = sectionGate(section, [m("physiological-adaptation", 0.9, 6)]);
    expect(r.open).toBe(true);
    expect(r.blockedBy).toHaveLength(0);
  });

  it("opens (learn-first) when there is no mastery evidence yet", () => {
    expect(sectionGate(section, []).open).toBe(true);
    expect(sectionGate(section, [m("physiological-adaptation", -2, 2)]).open).toBe(true); // too few items
  });
});

describe("readinessSit", () => {
  it("blocks below the readiness standard and clears at or above it", () => {
    expect(readinessSit(0.62).ready).toBe(false);
    expect(readinessSit(0.85).ready).toBe(true);
    expect(readinessSit(undefined).ready).toBe(false);
  });
});
