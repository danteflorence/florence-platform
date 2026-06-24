// Clinical Judgment Walkthrough - the data model that turns every question into a
// mini clinical-judgment lesson: the 6 NCJMM steps, per-choice "why" + the reasoning
// ERROR a learner makes if they pick it, what to review next, and the QA workflow
// state. A separate record keyed by questionId (not a field on Question) because the
// QA status is mutable and most questions live in JSON banks.
//
// No TS enums (string-literal unions). api-local types (decoupled from the frontend
// question types, like the remediations repo); the frontend mirrors these shapes.

/**
 * The reasoning-error taxonomy. When a learner picks a distractor, we name the
 * cognitive error - this is what powers "what error you made" + error-typed
 * remediation. `null` on the correct option.
 */
export type ErrorType =
  | "missed_cue" //              didn't identify the clinically significant data
  | "misread_cue" //            saw the cue but interpreted it wrong
  | "priority_error" //         valid action, but not the first/safest
  | "scope_error" //            outside RN scope / wrong delegation
  | "safety_error" //           unsafe delay or low-priority action
  | "content_gap" //            lacked the underlying knowledge
  | "over_treatment" //         escalated too early without required assessment
  | "under_treatment" //        failed to act on deterioration
  | "distractor_bias" //        chose familiar wording over clinical priority
  | "treating_symptom_not_cause"
  | "unsafe_delay";

export const ERROR_TYPES: readonly ErrorType[] = [
  "missed_cue", "misread_cue", "priority_error", "scope_error", "safety_error",
  "content_gap", "over_treatment", "under_treatment", "distractor_bias",
  "treating_symptom_not_cause", "unsafe_delay",
];

/** Learner-facing labels + one-line meanings (shown in the error-diagnosis panel). */
export const ERROR_TYPE_LABEL: Record<ErrorType, { label: string; meaning: string }> = {
  missed_cue: { label: "Missed cue", meaning: "You didn't flag the clinically significant data in the stem." },
  misread_cue: { label: "Misread cue", meaning: "You saw the cue but interpreted it incorrectly." },
  priority_error: { label: "Priority error", meaning: "A reasonable action - but not the first or safest one." },
  scope_error: { label: "Scope / delegation error", meaning: "Outside the RN's scope or wrongly delegated." },
  safety_error: { label: "Safety error", meaning: "An unsafe delay or a low-priority action when something urgent was needed." },
  content_gap: { label: "Content gap", meaning: "The underlying knowledge wasn't there." },
  over_treatment: { label: "Over-treatment", meaning: "Escalated too early without the required assessment." },
  under_treatment: { label: "Under-treatment", meaning: "Didn't act on a deteriorating picture." },
  distractor_bias: { label: "Distractor bias", meaning: "Chose familiar wording over the clinical priority." },
  treating_symptom_not_cause: { label: "Treated symptom, not cause", meaning: "Addressed the symptom instead of the underlying problem." },
  unsafe_delay: { label: "Unsafe delay", meaning: "Delayed a time-critical intervention." },
};

export function isErrorType(s: string): s is ErrorType {
  return (ERROR_TYPES as readonly string[]).includes(s);
}

/** The 6 NCJMM cognitive steps (kept in sync with the frontend blueprint.ts). */
export type CjmmStepKey =
  | "recognize-cues" | "analyze-cues" | "prioritize-hypotheses"
  | "generate-solutions" | "take-actions" | "evaluate-outcomes";

/** The 6 NCJMM steps with labels + blurbs (mirrors the frontend blueprint.ts). */
export const CJMM_STEP_BLURBS: { key: CjmmStepKey; label: string; blurb: string }[] = [
  { key: "recognize-cues", label: "Recognize Cues", blurb: "Identify relevant and important data from many sources." },
  { key: "analyze-cues", label: "Analyze Cues", blurb: "Connect the cues to the client's clinical presentation." },
  { key: "prioritize-hypotheses", label: "Prioritize Hypotheses", blurb: "Rank the possible explanations by urgency and likelihood." },
  { key: "generate-solutions", label: "Generate Solutions", blurb: "Identify expected outcomes and the actions that achieve them." },
  { key: "take-actions", label: "Take Actions", blurb: "Implement the interventions that best address the priority." },
  { key: "evaluate-outcomes", label: "Evaluate Outcomes", blurb: "Compare observed results against expected outcomes." },
];

export interface RecognizeCues {
  text: string;
  /** The clinically significant facts in the stem (shown as cue chips). */
  cues: string[];
}
export interface StepText {
  text: string;
}

/** The 6-step clinical-judgment breakdown for THIS item. */
export interface ClinicalJudgment {
  recognize_cues: RecognizeCues;
  analyze_cues: StepText;
  prioritize_hypotheses: StepText;
  generate_solutions: StepText;
  take_action: StepText;
  evaluate_outcomes: StepText;
}

/** Per answer-option analysis: why it's right/wrong + the error if chosen + remediation tags. */
export interface AnswerChoiceAnalysis {
  optionIndex: number;
  isCorrect: boolean; // authoritative - comes from gradeQuestion, never the model
  why_wrong_or_right: string;
  error_type_if_chosen: ErrorType | null; // null on the correct option
  remediation_tags: string[];
}

export interface LinkedContent {
  ebook_section_ids: string[];
  academy_lesson_ids: string[];
  simulation_ids: string[];
}

export type WalkthroughStatus = "draft" | "sme_reviewed" | "approved" | "rejected";
export type WalkthroughProvenance = "templated" | "ai_drafted";

export interface Walkthrough {
  question_id: string;
  client_need: string;
  cjmm: string | null; // the question's primary tagged step
  standard_rationale: string; // the existing quick rationale (30-60s audio source)
  clinical_judgment: ClinicalJudgment;
  answer_choice_analysis: AnswerChoiceAnalysis[];
  teach_back: string;
  what_to_review_next: string;
  linked_content: LinkedContent;
  status: WalkthroughStatus;
  provenance: WalkthroughProvenance;
  model: string | null;
  sme_reviewed_by: string | null;
  sme_reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  review_note: string | null;
  content_hash: string; // over the body - idempotency + audio cache key
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export interface WalkthroughUpsertInput {
  question_id: string;
  client_need: string;
  cjmm: string | null;
  standard_rationale: string;
  clinical_judgment: ClinicalJudgment;
  answer_choice_analysis: AnswerChoiceAnalysis[];
  teach_back: string;
  what_to_review_next: string;
  linked_content?: Partial<LinkedContent>;
  provenance: WalkthroughProvenance;
  model: string | null;
  status?: WalkthroughStatus; // templated path passes "approved"
}

export const emptyLinkedContent = (): LinkedContent => ({ ebook_section_ids: [], academy_lesson_ids: [], simulation_ids: [] });

/** Only approved walkthroughs are audio- + learner-eligible. */
export function isWalkthroughEligible(w: Pick<Walkthrough, "status">): boolean {
  return w.status === "approved";
}
