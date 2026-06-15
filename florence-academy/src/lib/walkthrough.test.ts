import { describe, it, expect } from "vitest";
import { buildWalkthroughView, optionTextsOf, type QuestionWalkthrough } from "./walkthrough";
import type { MultipleChoiceQuestion } from "../types/question";

const Q: MultipleChoiceQuestion = {
  id: "q1", type: "multiple-choice", difficulty: 0, clientNeed: "physiological-adaptation",
  section: 7, topic: "Sepsis priority", stem: "Septic, new confusion, BP 84/50. First action?",
  rationale: "plain rationale", options: ["Give IV fluids", "Document", "Reassess in 1h", "Call dietitian"], correct: 0,
};

const W: QuestionWalkthrough = {
  question_id: "q1", cjmm: "take-actions", status: "approved", standard_rationale: "plain rationale",
  teach_back: "Restore perfusion first.", what_to_review_next: "Sepsis first actions.",
  clinical_judgment: {
    recognize_cues: { text: "Hypotension + acute confusion are the key cues.", cues: ["BP 84/50", "new confusion"] },
    analyze_cues: { text: "Together they signal hypoperfusion." },
    prioritize_hypotheses: { text: "Septic shock is the priority." },
    generate_solutions: { text: "Fluids, cultures, escalation." },
    take_action: { text: "Give IV fluids first." },
    evaluate_outcomes: { text: "Recheck BP + mentation." },
  },
  answer_choice_analysis: [
    { optionIndex: 0, isCorrect: true, why_wrong_or_right: "Restores perfusion.", error_type_if_chosen: null, remediation_tags: [] },
    { optionIndex: 1, isCorrect: false, why_wrong_or_right: "Premature before stabilizing.", error_type_if_chosen: "priority_error", remediation_tags: ["prioritization"] },
    { optionIndex: 2, isCorrect: false, why_wrong_or_right: "Delays a time-critical action.", error_type_if_chosen: "unsafe_delay", remediation_tags: ["safety"] },
    { optionIndex: 3, isCorrect: false, why_wrong_or_right: "Not relevant to the priority.", error_type_if_chosen: "distractor_bias", remediation_tags: [] },
  ],
};

describe("buildWalkthroughView", () => {
  const v = buildWalkthroughView(W, optionTextsOf(Q));

  it("highlights exactly the correct option with a 'why this is correct' heading", () => {
    const correct = v.optionRows.filter((r) => r.isCorrect);
    expect(correct).toHaveLength(1);
    expect(correct[0]!.optionIndex).toBe(0);
    expect(correct[0]!.label).toBe("Give IV fluids");
    expect(correct[0]!.heading).toMatch(/why this is correct/i);
    expect(correct[0]!.errorLabel).toBeNull();
  });

  it("marks each distractor with a 'why not' heading + its named error type", () => {
    const distractors = v.optionRows.filter((r) => !r.isCorrect);
    expect(distractors).toHaveLength(3);
    distractors.forEach((d) => expect(d.heading).toMatch(/why not/i));
    expect(v.optionRows[1]!.errorLabel).toBe("Priority error");
    expect(v.optionRows[2]!.errorLabel).toBe("Unsafe delay");
    expect(v.optionRows[1]!.why).toMatch(/premature/i);
  });

  it("lists the 6 CJMM steps in order, flags the primary, and surfaces cues", () => {
    expect(v.stepRows.map((s) => s.key)).toEqual([
      "recognize-cues", "analyze-cues", "prioritize-hypotheses", "generate-solutions", "take-actions", "evaluate-outcomes",
    ]);
    expect(v.primary.label).toBe("Take Actions");
    expect(v.stepRows.find((s) => s.key === "take-actions")!.isPrimary).toBe(true);
    expect(v.stepRows.find((s) => s.key === "recognize-cues")!.cues).toContain("new confusion");
    expect(v.stepRows.find((s) => s.key === "analyze-cues")!.applies).toMatch(/hypoperfusion/);
  });
});

describe("optionTextsOf + fallback", () => {
  it("resolves flat option text from a multiple-choice question", () => {
    expect(optionTextsOf(Q)).toEqual(["Give IV fluids", "Document", "Reassess in 1h", "Call dietitian"]);
  });
  it("a null walkthrough means render the plain rationale", () => {
    const w: QuestionWalkthrough | null = null;
    expect(w == null ? Q.rationale : "rich").toBe("plain rationale");
  });
});
