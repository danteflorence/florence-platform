// Pure threshold logic for the audible monitor alarm. The bands are CRITICAL
// (tighter than the per-tile visual warning in VitalsDisplay): the sound only
// fires when a vital leaves the survivable envelope.
import { describe, expect, it } from "vitest";
import { alarmLevel, criticalVitals } from "./monitorAudio";
import type { VitalsState } from "../../data/vpatient/types";

const base: VitalsState = {
  hr: 80,
  sbp: 120,
  dbp: 76,
  rr: 16,
  spo2: 97,
  tempC: 36.8,
  pain: 0,
  rhythm: "Sinus",
  loc: "alert",
};

describe("criticalVitals / alarmLevel", () => {
  it("is silent for normal vitals", () => {
    expect(criticalVitals(base)).toEqual([]);
    expect(alarmLevel(base)).toBe("none");
  });

  it("fires on critical hypoxia, hypotension, brady/tachy, and resp extremes", () => {
    expect(criticalVitals({ ...base, spo2: 87 })).toContain("spo2");
    expect(criticalVitals({ ...base, sbp: 84 })).toContain("sbp");
    expect(criticalVitals({ ...base, sbp: 205 })).toContain("sbp");
    expect(criticalVitals({ ...base, hr: 38 })).toContain("hr");
    expect(criticalVitals({ ...base, hr: 150 })).toContain("hr");
    expect(criticalVitals({ ...base, rr: 6 })).toContain("rr");
    expect(criticalVitals({ ...base, rr: 36 })).toContain("rr");
  });

  it("does NOT fire in the warning-only band (visual pulse territory)", () => {
    // These alarm the tile visually (VitalsDisplay) but stay below the audible
    // critical threshold - warning is a nudge, sound is an emergency.
    expect(alarmLevel({ ...base, spo2: 90 })).toBe("none");
    expect(alarmLevel({ ...base, sbp: 88 })).toBe("none");
    expect(alarmLevel({ ...base, hr: 130 })).toBe("none");
  });

  it("stacks multiple critical vitals", () => {
    const crashing = { ...base, spo2: 80, sbp: 70, hr: 145 };
    expect(criticalVitals(crashing)).toEqual(["spo2", "sbp", "hr"]);
    expect(alarmLevel(crashing)).toBe("critical");
  });
});
