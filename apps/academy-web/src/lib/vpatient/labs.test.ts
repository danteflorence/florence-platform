// Labs: pure flag interpretation + the engine order→turnaround→result flow.
import { describe, expect, it } from "vitest";
import { criticalValues, describeValue, flagOf, interpretPanel } from "./labs";
import { SEPSIS_01 } from "../../data/vpatient/scenarios/sepsis01";
import { validateScenario } from "../../data/vpatient/validate";
import { dispatch, init, resultedLabPanels, tick, type SimState } from "./engine";
import type { LabValue } from "../../data/vpatient/types";

const mk = (v: Partial<LabValue>): LabValue => ({ id: "x", label: "X", value: 0, ...v });

describe("lab flag interpretation", () => {
  it("flags against reference + critical thresholds", () => {
    expect(flagOf(mk({ value: 4.6, refLow: 0.5, refHigh: 2.0, criticalHigh: 4.0 }))).toBe("critical-high");
    expect(flagOf(mk({ value: 2.5, refLow: 0.5, refHigh: 2.0 }))).toBe("high");
    expect(flagOf(mk({ value: 1.0, refLow: 0.5, refHigh: 2.0 }))).toBe("normal");
    expect(flagOf(mk({ value: 2.9, refLow: 3.5, refHigh: 5.0, criticalLow: 3.0 }))).toBe("critical-low");
    expect(flagOf(mk({ value: 3.2, refLow: 3.5, refHigh: 5.0, criticalLow: 3.0 }))).toBe("low");
  });
  it("honors an explicit qualitative flag and defaults strings to normal", () => {
    expect(flagOf(mk({ value: "gram-positive cocci", flag: "abnormal" }))).toBe("abnormal");
    expect(flagOf(mk({ value: "pending" }))).toBe("normal");
  });
  it("describeValue reads like a chart line", () => {
    const [v] = interpretPanel({ id: "p", label: "P", orderActionId: "a", resultDelaySec: 0, values: [mk({ label: "Lactate", value: 4.6, unit: "mmol/L", criticalHigh: 4.0 })] });
    expect(describeValue(v)).toBe("Lactate 4.6 mmol/L (critical-high)");
  });
});

describe("sepsis labs order→result flow", () => {
  it("sepsis01 validates with the lab panel", () => {
    expect(validateScenario(SEPSIS_01)).toEqual([]);
  });

  it("ordering send_labs posts results after the turnaround, revealing the critical lactate", () => {
    let s: SimState = init(SEPSIS_01);
    const r = dispatch(s, SEPSIS_01, "send_labs");
    expect(r.ok).toBe(true);
    s = r.state;
    // Not resulted yet (60s turnaround).
    expect(resultedLabPanels(s, SEPSIS_01)).toHaveLength(0);
    expect(s.revealedCueIds).not.toContain("c-lab-lactate");
    for (let i = 0; i < 61; i++) s = tick(s, SEPSIS_01);
    const posted = resultedLabPanels(s, SEPSIS_01);
    expect(posted).toHaveLength(1);
    expect(s.revealedCueIds).toContain("c-lab-lactate");
    // The lactate is the critical value the learner must catch.
    const crit = criticalValues(posted[0]).map((v) => v.label);
    expect(crit).toContain("Lactate");
    expect(s.narrationLog.some((n) => n.text.includes("Labs resulted"))).toBe(true);
  });

  it("does not post if labs were never ordered", () => {
    let s: SimState = init(SEPSIS_01);
    for (let i = 0; i < 120; i++) s = tick(s, SEPSIS_01);
    expect(resultedLabPanels(s, SEPSIS_01)).toHaveLength(0);
  });
});
