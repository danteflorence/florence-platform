import { describe, expect, it } from "vitest";
import { PACE_BUDGET_MS, profileFrom, type PaceSample } from "./pacing";

const mk = (sec: number, correct = true): PaceSample => ({ spentMs: sec * 1000, correct });

describe("profileFrom", () => {
  it("needs 10 usable samples before it speaks", () => {
    const p = profileFrom([mk(60), mk(70)]);
    expect(p.band).toBe("unknown");
    expect(p.medianSec).toBeNull();
  });

  it("filters accidental taps and walked-away outliers", () => {
    const noise = [{ spentMs: 100, correct: true }, mk(25 * 60)];
    const real = Array.from({ length: 12 }, () => mk(80));
    const p = profileFrom([...noise, ...real]);
    expect(p.samples).toBe(12);
    expect(p.medianSec).toBe(80);
  });

  it("bands slow / on-pace / fast around the 90s budget", () => {
    expect(profileFrom(Array.from({ length: 12 }, () => mk(120))).band).toBe("slow");
    expect(profileFrom(Array.from({ length: 12 }, () => mk(75))).band).toBe("on-pace");
    expect(profileFrom(Array.from({ length: 12 }, () => mk(40))).band).toBe("fast");
  });

  it("distinguishes productive slowness from unproductive re-reading", () => {
    // Slow AND the over-budget answers are MORE accurate → time is buying accuracy.
    const productive = [
      ...Array.from({ length: 8 }, () => mk(120, true)),
      ...Array.from({ length: 4 }, () => mk(70, false)),
    ];
    expect(profileFrom(productive).advice).toMatch(/buying accuracy/i);
    // Slow and no accuracy gain → re-reading.
    const unproductive = [
      ...Array.from({ length: 8 }, () => mk(120, false)),
      ...Array.from({ length: 4 }, () => mk(70, true)),
    ];
    expect(profileFrom(unproductive).advice).toMatch(/re-reading/i);
  });

  it("fast but inaccurate gets told to slow down", () => {
    const rushed = Array.from({ length: 12 }, (_, i) => mk(35, i < 5));
    const p = profileFrom(rushed);
    expect(p.band).toBe("fast");
    expect(p.advice).toMatch(/slow down/i);
  });

  it("overBudget share + split accuracies compute", () => {
    const mix = [
      ...Array.from({ length: 6 }, () => mk(60, true)),
      ...Array.from({ length: 6 }, () => mk(100, false)),
    ];
    const p = profileFrom(mix);
    expect(p.overBudget).toBe(0.5);
    expect(p.accuracyWithin).toBe(1);
    expect(p.accuracyOver).toBe(0);
    expect(PACE_BUDGET_MS).toBe(90_000);
  });
});
