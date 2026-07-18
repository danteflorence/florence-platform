import { describe, expect, it } from "vitest";
import { estimateWeeksToGreen, doorDistancePhrase } from "./distance";

describe("estimateWeeksToGreen", () => {
  it("returns null when there is nothing honest to say", () => {
    expect(estimateWeeksToGreen(undefined)).toBeNull();
    expect(estimateWeeksToGreen(Number.NaN)).toBeNull();
    expect(estimateWeeksToGreen(0.8)).toBeNull();
    expect(estimateWeeksToGreen(0.95)).toBeNull();
  });

  it("brackets a mid-baseline learner in single-digit weeks", () => {
    const d = estimateWeeksToGreen(0.62)!;
    expect(d.minWeeks).toBe(6);
    expect(d.maxWeeks).toBe(10);
  });

  it("a near-green learner gets a short, still-ranged estimate", () => {
    const d = estimateWeeksToGreen(0.78)!;
    expect(d.minWeeks).toBeGreaterThanOrEqual(1);
    expect(d.maxWeeks).toBeGreaterThan(d.minWeeks);
  });

  it("a low baseline caps at the long-runway ceiling", () => {
    const d = estimateWeeksToGreen(0.1)!;
    expect(d.maxWeeks).toBe(26);
    expect(doorDistancePhrase(d)).toContain("long runway");
  });

  it("more weekly practice shortens the range; the scale is clamped", () => {
    const base = estimateWeeksToGreen(0.6, 150)!;
    const fast = estimateWeeksToGreen(0.6, 225)!;
    const absurd = estimateWeeksToGreen(0.6, 5000)!;
    expect(fast.maxWeeks).toBeLessThan(base.maxWeeks);
    // 225/150 already hits the 1.5x pace clamp, so 5000 items/week changes nothing
    expect(absurd).toEqual(fast);
  });

  it("phrase states the range and the honesty caveat", () => {
    const p = doorDistancePhrase(estimateWeeksToGreen(0.62)!);
    expect(p).toContain("6 to 10 weeks");
    expect(p).toContain("not a promise");
  });
});
