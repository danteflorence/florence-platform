import { describe, expect, it } from "vitest";
import { readbackQuiz } from "./readback";

describe("readbackQuiz", () => {
  it("distorts numbers - the fifty/fifteen trap", () => {
    const q = readbackQuiz("Give 15 mg IV push now");
    expect(q).not.toBeNull();
    expect(q!.options).toHaveLength(3);
    expect(q!.options[q!.correctIndex]).toBe("Give 15 mg IV push now");
    // Distractors differ and keep the sentence shape.
    const others = q!.options.filter((_, i) => i !== q!.correctIndex);
    expect(others.every((o) => o !== "Give 15 mg IV push now")).toBe(true);
    expect(others.some((o) => /150|50/.test(o))).toBe(true);
  });

  it("swaps route/urgency when there is no number", () => {
    const q = readbackQuiz("Start oxygen IV stat");
    expect(q).not.toBeNull();
    const others = q!.options.filter((_, i) => i !== q!.correctIndex);
    expect(others.some((o) => /PO|routine/.test(o))).toBe(true);
  });

  it("is deterministic for the same order", () => {
    const a = readbackQuiz("Give 500 mL NS bolus over 15 minutes");
    const b = readbackQuiz("Give 500 mL NS bolus over 15 minutes");
    expect(a).toEqual(b);
  });

  it("returns null when nothing can be distorted", () => {
    expect(readbackQuiz("Continue current plan of care")).toBeNull();
  });
});
