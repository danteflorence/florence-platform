import { describe, it, expect } from "vitest";
import {
  emptyAnswer,
  gradeQuestion,
  isAnswered,
  type GraphicHotspotQuestion,
  type GraphicOptionsQuestion,
  type MediaAsset,
  type MediaExhibitQuestion,
} from "./question";

const META = {
  difficulty: 0,
  clientNeed: "physiological-adaptation" as const,
  section: 7,
  topic: "t",
  stem: "s",
  rationale: "r",
};

const img = (alt = "x"): MediaAsset => ({ src: "", alt });

// ── graphic hot-spot ────────────────────────────────────────────────────────
describe("graphic-hotspot grading", () => {
  const base: GraphicHotspotQuestion = {
    id: "gh",
    type: "graphic-hotspot",
    ...META,
    image: img(),
    hotspots: [
      { id: "a", label: "A", x: 0, y: 0, width: 10, height: 10 },
      { id: "b", label: "B", x: 10, y: 0, width: 10, height: 10 },
      { id: "c", label: "C", x: 20, y: 0, width: 10, height: 10 },
      { id: "d", label: "D", x: 30, y: 0, width: 10, height: 10 },
    ],
    correct: [3],
    multi: false,
  };

  it("seeds an empty selection and needs one before submit", () => {
    const a = emptyAnswer(base);
    expect(a).toEqual({ type: "graphic-hotspot", selected: [] });
    expect(isAnswered(base, a)).toBe(false);
    expect(isAnswered(base, { type: "graphic-hotspot", selected: [3] })).toBe(true);
  });

  it("scores a single correct region all-or-nothing", () => {
    expect(gradeQuestion(base, { type: "graphic-hotspot", selected: [3] }).score).toBe(1);
    expect(gradeQuestion(base, { type: "graphic-hotspot", selected: [0] }).score).toBe(0);
  });

  it("awards overlap-with-penalty for multi-region", () => {
    const multi: GraphicHotspotQuestion = { ...base, correct: [0, 2], multi: true };
    expect(gradeQuestion(multi, { type: "graphic-hotspot", selected: [0, 2] }).score).toBe(1);
    expect(gradeQuestion(multi, { type: "graphic-hotspot", selected: [0] }).score).toBeCloseTo(0.5);
    // one right, one wrong → (1 - 1) / 2 = 0
    expect(gradeQuestion(multi, { type: "graphic-hotspot", selected: [0, 1] }).score).toBe(0);
  });
});

// ── graphic options ─────────────────────────────────────────────────────────
describe("graphic-options grading", () => {
  const single: GraphicOptionsQuestion = {
    id: "go",
    type: "graphic-options",
    ...META,
    options: [img("a"), img("b"), img("c"), img("d")],
    correct: 1,
  };

  it("requires a pick and grades single all-or-nothing", () => {
    expect(isAnswered(single, emptyAnswer(single))).toBe(false);
    expect(gradeQuestion(single, { type: "graphic-options", choice: 1, choices: [] }).correct).toBe(true);
    expect(gradeQuestion(single, { type: "graphic-options", choice: 0, choices: [] }).score).toBe(0);
  });

  it("grades multi by overlap and reads choices not choice", () => {
    const multi: GraphicOptionsQuestion = { ...single, correct: [0, 2], multi: true };
    expect(isAnswered(multi, { type: "graphic-options", choice: null, choices: [] })).toBe(false);
    expect(isAnswered(multi, { type: "graphic-options", choice: null, choices: [0] })).toBe(true);
    expect(gradeQuestion(multi, { type: "graphic-options", choice: null, choices: [0, 2] }).score).toBe(1);
    expect(gradeQuestion(multi, { type: "graphic-options", choice: null, choices: [0] }).score).toBeCloseTo(0.5);
    expect(gradeQuestion(multi, { type: "graphic-options", choice: null, choices: [0, 1] }).score).toBe(0);
  });
});

// ── media exhibit ───────────────────────────────────────────────────────────
describe("media-exhibit grading", () => {
  const q: MediaExhibitQuestion = {
    id: "me",
    type: "media-exhibit",
    ...META,
    exhibit: img("ecg"),
    options: ["w", "x", "y", "z"],
    correct: 0,
  };

  it("seeds empty, requires a pick, grades single", () => {
    expect(emptyAnswer(q)).toEqual({ type: "media-exhibit", choice: null, choices: [] });
    expect(isAnswered(q, emptyAnswer(q))).toBe(false);
    expect(gradeQuestion(q, { type: "media-exhibit", choice: 0, choices: [] }).correct).toBe(true);
    expect(gradeQuestion(q, { type: "media-exhibit", choice: 2, choices: [] }).score).toBe(0);
  });

  it("grades a multi exhibit by overlap", () => {
    const multi: MediaExhibitQuestion = { ...q, correct: [1, 3], multi: true };
    expect(gradeQuestion(multi, { type: "media-exhibit", choice: null, choices: [1, 3] }).score).toBe(1);
    expect(gradeQuestion(multi, { type: "media-exhibit", choice: null, choices: [1] }).score).toBeCloseTo(0.5);
  });
});
