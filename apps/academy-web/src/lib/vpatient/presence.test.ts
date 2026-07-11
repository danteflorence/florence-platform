import { describe, expect, it } from "vitest";
import { presenceCaption, presenceState, skinToneOf } from "./presence";
import type { VitalsState } from "../../data/vpatient/types";

const base: VitalsState = {
  hr: 78,
  sbp: 122,
  dbp: 78,
  rr: 15,
  spo2: 98,
  tempC: 36.9,
  pain: 1,
  rhythm: "Sinus",
  loc: "alert",
};

describe("presenceState", () => {
  it("healthy vitals read as alert", () => {
    expect(presenceState(base)).toBe("alert");
    expect(presenceCaption(base)).toBe("Resting comfortably.");
  });

  it("LOC dominates the physiology", () => {
    expect(presenceState({ ...base, loc: "unresponsive" })).toBe("unresponsive");
    expect(presenceState({ ...base, loc: "lethargic", spo2: 80 })).toBe("lethargic");
  });

  it("desaturation or shock reads as distressed", () => {
    expect(presenceState({ ...base, spo2: 88 })).toBe("distressed");
    expect(presenceState({ ...base, sbp: 84 })).toBe("distressed");
  });

  it("work of breathing, tachycardia, pain, or confusion read as anxious", () => {
    expect(presenceState({ ...base, rr: 28 })).toBe("anxious");
    expect(presenceState({ ...base, hr: 130 })).toBe("anxious");
    expect(presenceState({ ...base, pain: 8 })).toBe("anxious");
    expect(presenceState({ ...base, loc: "confused" })).toBe("anxious");
  });

  it("skin tone follows perfusion, hypoxia beats hypotension", () => {
    expect(skinToneOf(base)).toBe("normal");
    expect(skinToneOf({ ...base, sbp: 85 })).toBe("pale");
    expect(skinToneOf({ ...base, spo2: 84, sbp: 85 })).toBe("cyanotic");
    expect(skinToneOf({ ...base, tempC: 39.2 })).toBe("flushed");
  });

  it("captions surface the tone", () => {
    expect(presenceCaption({ ...base, spo2: 84 })).toBe("In visible distress, lips dusky.");
    expect(presenceCaption({ ...base, loc: "lethargic", sbp: 82 })).toBe("Lethargic, pale.");
    expect(presenceCaption({ ...base, rr: 28 })).toBe("Anxious, working to breathe.");
  });
});
