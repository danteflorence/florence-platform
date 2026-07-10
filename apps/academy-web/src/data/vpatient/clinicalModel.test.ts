// Coherence tests for the BioGears-derived clinical model. These keep the
// reference honest: every effect targets a real vital, enums are non-empty,
// severity scales are ordered, and the sepsis insult matches the gold
// scenario's teaching frame.
import { describe, expect, it } from "vitest";
import { INSULTS, INTERVENTIONS, INSULT_BY_ID, INTERVENTION_BY_ID } from "./clinicalModel";
import type { NumericVitalKey } from "./types";

const NUMERIC_KEYS: NumericVitalKey[] = ["hr", "sbp", "dbp", "rr", "spo2", "tempC", "pain"];

describe("clinical model integrity", () => {
  it("every insult + intervention has a unique id and a nursing focus", () => {
    const ids = [...INSULTS, ...INTERVENTIONS].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const x of [...INSULTS, ...INTERVENTIONS]) {
      expect(x.nursingFocus.length).toBeGreaterThan(20);
      expect(x.bioGearsAction.length).toBeGreaterThan(0);
    }
  });

  it("every vital effect targets a real numeric vital", () => {
    for (const x of [...INSULTS, ...INTERVENTIONS]) {
      for (const e of x.effects) {
        expect(NUMERIC_KEYS).toContain(e.key);
        expect(["up", "down"]).toContain(e.direction);
      }
    }
  });

  it("enum + severityEnum params carry non-empty option lists; numeric params carry ranges", () => {
    for (const x of [...INSULTS, ...INTERVENTIONS]) {
      for (const p of x.params) {
        if (p.kind === "enum" || p.kind === "severityEnum") {
          expect(p.options && p.options.length).toBeGreaterThan(0);
        }
        if (p.kind === "rate" || p.kind === "dose" || p.kind === "concentration" || p.kind === "scale010" || p.kind === "severity01" || p.kind === "fraction") {
          expect(p.range).toBeDefined();
          expect(p.range![0]).toBeLessThan(p.range![1]);
        }
      }
    }
  });

  it("lookups resolve", () => {
    expect(INSULT_BY_ID.get("infection_sepsis")?.category).toBe("infection");
    expect(INTERVENTION_BY_ID.get("fluid_resuscitation")?.requiresOrder).toBe(true);
  });

  it("the sepsis insult encodes the teaching frame of the gold scenario", () => {
    const sepsis = INSULT_BY_ID.get("infection_sepsis")!;
    // Fever up, tachycardia up, pressure down = the SIRS→shock trajectory the
    // sepsis01 scenario dramatizes.
    const dirs = Object.fromEntries(sepsis.effects.map((e) => [e.key, e.direction]));
    expect(dirs["tempC"]).toBe("up");
    expect(dirs["hr"]).toBe("up");
    expect(dirs["sbp"]).toBe("down");
    expect(sepsis.nursingFocus.toLowerCase()).toContain("cultures");
  });

  it("fluid resuscitation reverses the shock vitals it is meant to treat", () => {
    const fluids = INTERVENTION_BY_ID.get("fluid_resuscitation")!;
    const dirs = Object.fromEntries(fluids.effects.map((e) => [e.key, e.direction]));
    expect(dirs["sbp"]).toBe("up");
    expect(dirs["hr"]).toBe("down");
  });
});
