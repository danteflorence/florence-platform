// Walkthrough assembly helpers shared by the generator script + tests.
// - templatedDraft: deterministic walkthrough for parametric generator items
//   (lab/dose/drug) — mechanical, so no LLM + no SME review needed (auto-approved).
// - toUpsertInput: merges a draft into a store upsert input, attaching isCorrect
//   from the ANSWER KEY (never the model) and the workflow status by provenance.

import type { WalkthroughDraft, WalkthroughDraftInput } from "./llm.ts";
import type { ErrorType, WalkthroughProvenance, WalkthroughUpsertInput } from "./walkthroughTypes.ts";

/** Generator items have formulaic distractors → deterministic, auto-approvable. */
export function isTemplatedId(id: string): boolean {
  return /^(lab-|dose-|drug-|drugname-)/.test(id);
}

export function templatedDraft(input: WalkthroughDraftInput): WalkthroughDraft {
  const r = input.rationale.trim();
  const correctText = input.correctIndices.map((i) => input.options[i]).filter(Boolean).join("; ");
  const isLab = input.questionId.startsWith("lab-");
  const errorFor: ErrorType = isLab ? "misread_cue" : "content_gap";
  return {
    clinical_judgment: {
      recognize_cues: { text: "Read the reported value or term and the relevant reference.", cues: [] },
      analyze_cues: { text: r || "Compare the finding to its expected range or standard name." },
      prioritize_hypotheses: { text: "This is a direct recognition / recall item." },
      generate_solutions: { text: "Match the finding to the option that fits the reference." },
      take_action: { text: correctText ? `Select: ${correctText}.` : "Select the matching option." },
      evaluate_outcomes: { text: "Confirm the chosen option matches the reference." },
    },
    answer_choice_analysis: input.options.map((_opt, i) => {
      const isCorrect = input.correctIndices.includes(i);
      return {
        optionIndex: i,
        why: isCorrect ? `Correct. ${r}` : "Does not match the reference for this item.",
        error_type_if_chosen: isCorrect ? null : errorFor,
        remediation_tags: isCorrect ? [] : [input.clientNeed],
      };
    }),
    teach_back: r || correctText,
    what_to_review_next: `Review ${input.topic}.`,
  };
}

/** Build a store upsert input from a draft. isCorrect comes from the answer key. */
export function toUpsertInput(
  input: WalkthroughDraftInput,
  draft: WalkthroughDraft,
  opts: { provenance: WalkthroughProvenance; model: string | null },
): WalkthroughUpsertInput {
  return {
    question_id: input.questionId,
    client_need: input.clientNeed,
    cjmm: input.cjmm,
    standard_rationale: input.rationale,
    clinical_judgment: draft.clinical_judgment,
    answer_choice_analysis: draft.answer_choice_analysis.map((c) => {
      const isCorrect = input.correctIndices.includes(c.optionIndex);
      return {
        optionIndex: c.optionIndex,
        isCorrect, // authoritative — from the bank's answer key, not the model
        why_wrong_or_right: c.why,
        error_type_if_chosen: isCorrect ? null : c.error_type_if_chosen,
        remediation_tags: c.remediation_tags ?? [],
      };
    }),
    teach_back: draft.teach_back,
    what_to_review_next: draft.what_to_review_next,
    provenance: opts.provenance,
    model: opts.model,
    status: opts.provenance === "templated" ? "approved" : "draft",
  };
}

/** Normalize a bank item's `correct` (number | number[]) to indices. */
export function correctIndicesOf(correct: unknown, optionCount: number): number[] {
  if (typeof correct === "number") return correct >= 0 && correct < optionCount ? [correct] : [];
  if (Array.isArray(correct)) return correct.filter((n): n is number => typeof n === "number" && n >= 0 && n < optionCount);
  return [];
}
