import { describe, expect, it } from "vitest";
import { SEPSIS_01 } from "../../data/vpatient/scenarios/sepsis01";
import { validateScenario } from "../../data/vpatient/validate";
import { applyDifficulty, DIFFICULTIES } from "./difficulty";
import { evaluate } from "./score";
import { runScript } from "./engine.test";

describe("applyDifficulty", () => {
  it("standard is the identity", () => {
    expect(applyDifficulty(SEPSIS_01, "standard")).toBe(SEPSIS_01);
  });

  it("never mutates the source scenario", () => {
    const before = JSON.stringify(SEPSIS_01);
    applyDifficulty(SEPSIS_01, "hardest");
    expect(JSON.stringify(SEPSIS_01)).toBe(before);
  });

  it("every level still produces a valid scenario", () => {
    for (const level of DIFFICULTIES) {
      expect(validateScenario(applyDifficulty(SEPSIS_01, level))).toEqual([]);
    }
  });

  it("harder tightens rubric windows; gentle widens them", () => {
    const escId = "d-escalate";
    const base = SEPSIS_01.rubric.find((d) => d.decisionId === escId)!.windowSec!;
    const harder = applyDifficulty(SEPSIS_01, "harder").rubric.find((d) => d.decisionId === escId)!.windowSec!;
    const gentle = applyDifficulty(SEPSIS_01, "gentle").rubric.find((d) => d.decisionId === escId)!.windowSec!;
    expect(harder).toBeLessThan(base);
    expect(gentle).toBeGreaterThan(base);
  });

  it("harder brings the escalation deadline sooner", () => {
    const ruleOf = (sc: typeof SEPSIS_01) =>
      sc.rules.find((r) => r.id === "r-no-escalation")!.when.actionNotTakenBySec!.sec;
    expect(ruleOf(applyDifficulty(SEPSIS_01, "harder"))).toBeLessThan(ruleOf(SEPSIS_01));
    expect(ruleOf(applyDifficulty(SEPSIS_01, "gentle"))).toBeGreaterThan(ruleOf(SEPSIS_01));
  });

  it("all timing knobs stay inside the run length", () => {
    const hardest = applyDifficulty(SEPSIS_01, "hardest");
    for (const r of hardest.rules) {
      if (r.when.actionNotTakenBySec) expect(r.when.actionNotTakenBySec.sec).toBeLessThan(hardest.durationSec);
      for (const e of r.effects) if (e.kind === "vitalsRamp") expect(e.overSec).toBeGreaterThanOrEqual(1);
    }
    for (const d of hardest.rubric) {
      if (d.opensAtSec !== undefined) expect(d.opensAtSec).toBeLessThan(hardest.durationSec);
    }
  });

  it("makes an otherwise-passing run fail when it is too slow for the harder clock", () => {
    // A timeline that meets every window at STANDARD but is too slow once the
    // windows tighten - proves the knob actually bites at runtime.
    const script: [number, string][] = [
      [0, "check_vitals"],
      [40, "assess_wound"],
      [90, "review_labs"],
      [150, "notify_provider"],
      [210, "draw_cultures"],
      [305, "give_antibiotics"], // just inside the 180s abx window at standard
    ];
    const standardEv = evaluate(runScript(script, SEPSIS_01.durationSec), SEPSIS_01);
    const hardest = applyDifficulty(SEPSIS_01, "hardest");
    const hardEv = evaluate(runScript(script, hardest.durationSec, hardest), hardest);
    expect(hardEv.overall).toBeLessThan(standardEv.overall);
  });
});
