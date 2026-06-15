// Clinical-judgment walkthrough — frontend core. Mirrors the api walkthrough record
// (the approved subset the learner sees) and provides a PURE view-model builder so
// the rendering logic is unit-testable without a DOM, plus a per-question fetch with
// a session cache (404 / no-API → null → fall back to the plain rationale).

import { apiBaseUrl } from "./academyAuth";
import { CJMM_STEPS, CJMM_LABEL } from "../data/blueprint";
import type { CjmmStep, Question } from "../types/question";

export type ErrorType =
  | "missed_cue" | "misread_cue" | "priority_error" | "scope_error" | "safety_error"
  | "content_gap" | "over_treatment" | "under_treatment" | "distractor_bias"
  | "treating_symptom_not_cause" | "unsafe_delay";

export const ERROR_TYPE_LABEL: Record<ErrorType, { label: string; meaning: string }> = {
  missed_cue: { label: "Missed cue", meaning: "Didn't flag the clinically significant data in the stem." },
  misread_cue: { label: "Misread cue", meaning: "Saw the cue but interpreted it incorrectly." },
  priority_error: { label: "Priority error", meaning: "A reasonable action — but not the first or safest one." },
  scope_error: { label: "Scope / delegation error", meaning: "Outside the RN's scope or wrongly delegated." },
  safety_error: { label: "Safety error", meaning: "An unsafe delay or low-priority action when something urgent was needed." },
  content_gap: { label: "Content gap", meaning: "The underlying knowledge wasn't there." },
  over_treatment: { label: "Over-treatment", meaning: "Escalated too early without the required assessment." },
  under_treatment: { label: "Under-treatment", meaning: "Didn't act on a deteriorating picture." },
  distractor_bias: { label: "Distractor bias", meaning: "Chose familiar wording over the clinical priority." },
  treating_symptom_not_cause: { label: "Treated symptom, not cause", meaning: "Addressed the symptom instead of the underlying problem." },
  unsafe_delay: { label: "Unsafe delay", meaning: "Delayed a time-critical intervention." },
};

export interface WtStepText { text: string }
export interface WtRecognize { text: string; cues: string[] }
export interface ClinicalJudgment {
  recognize_cues: WtRecognize; analyze_cues: WtStepText; prioritize_hypotheses: WtStepText;
  generate_solutions: WtStepText; take_action: WtStepText; evaluate_outcomes: WtStepText;
}
export interface AnswerChoiceAnalysis {
  optionIndex: number; isCorrect: boolean; why_wrong_or_right: string;
  error_type_if_chosen: ErrorType | null; remediation_tags: string[];
}
export interface QuestionWalkthrough {
  question_id: string; cjmm: string | null; standard_rationale: string;
  clinical_judgment: ClinicalJudgment; answer_choice_analysis: AnswerChoiceAnalysis[];
  teach_back: string; what_to_review_next: string;
  linked_content?: { ebook_section_ids: string[]; academy_lesson_ids: string[]; simulation_ids: string[] };
  status: string;
}

// Map the api's snake_case section keys → CjmmStep keys (in NCJMM order).
const SECTION_TO_STEP: { field: keyof ClinicalJudgment; key: CjmmStep }[] = [
  { field: "recognize_cues", key: "recognize-cues" },
  { field: "analyze_cues", key: "analyze-cues" },
  { field: "prioritize_hypotheses", key: "prioritize-hypotheses" },
  { field: "generate_solutions", key: "generate-solutions" },
  { field: "take_action", key: "take-actions" },
  { field: "evaluate_outcomes", key: "evaluate-outcomes" },
];

export interface OptionRow {
  optionIndex: number; label: string; isCorrect: boolean; why: string;
  heading: string; errorLabel: string | null;
}
export interface StepRow {
  key: CjmmStep; order: number; label: string; blurb: string; applies: string; isPrimary: boolean; cues: string[];
}
export interface WalkthroughView {
  primary: { key: CjmmStep | null; label: string };
  optionRows: OptionRow[];
  stepRows: StepRow[];
  teachBack: string;
  whatToReviewNext: string;
}

/** Pure: an approved walkthrough + the question's option texts → render-ready view model. */
export function buildWalkthroughView(w: QuestionWalkthrough, optionTexts: string[]): WalkthroughView {
  const optionRows: OptionRow[] = [...w.answer_choice_analysis]
    .sort((a, b) => a.optionIndex - b.optionIndex)
    .map((a) => ({
      optionIndex: a.optionIndex,
      label: optionTexts[a.optionIndex] ?? `Option ${a.optionIndex + 1}`,
      isCorrect: a.isCorrect,
      why: a.why_wrong_or_right,
      heading: a.isCorrect ? "Why this is correct" : "Why not this",
      errorLabel: a.isCorrect || !a.error_type_if_chosen ? null : ERROR_TYPE_LABEL[a.error_type_if_chosen].label,
    }));
  const primaryKey = (w.cjmm as CjmmStep) || null;
  const stepRows: StepRow[] = CJMM_STEPS.map((spec, idx) => {
    const map = SECTION_TO_STEP.find((s) => s.key === spec.key);
    const section = map ? (w.clinical_judgment[map.field] as WtStepText | WtRecognize) : undefined;
    return {
      key: spec.key,
      order: spec.order ?? idx + 1,
      label: spec.label,
      blurb: spec.blurb,
      applies: section?.text ?? "",
      isPrimary: spec.key === primaryKey,
      cues: map?.field === "recognize_cues" ? (w.clinical_judgment.recognize_cues.cues ?? []) : [],
    };
  });
  return {
    primary: { key: primaryKey, label: primaryKey ? CJMM_LABEL[primaryKey] : "Clinical judgment" },
    optionRows,
    stepRows,
    teachBack: w.teach_back,
    whatToReviewNext: w.what_to_review_next,
  };
}

/** The single option the learner chose, for multiple-choice (for error diagnosis). */
export function chosenIndexOf(q: Question, answer: unknown): number | undefined {
  if (q.type === "multiple-choice" && typeof answer === "number") return answer;
  return undefined;
}

/** Resolve a question's flat option texts across the union (mc/sata/trend/media-exhibit). */
export function optionTextsOf(q: Question): string[] {
  const anyq = q as unknown as { options?: unknown };
  if (Array.isArray(anyq.options)) {
    return anyq.options.map((o) => (typeof o === "string" ? o : String((o as { text?: unknown; alt?: unknown })?.text ?? (o as { alt?: unknown })?.alt ?? "")));
  }
  return [];
}

// --- per-question fetch (session-cached, like audioManifest) -----------------
const cache = new Map<string, Promise<QuestionWalkthrough | null>>();

async function fetchOne(id: string): Promise<QuestionWalkthrough | null> {
  const base = apiBaseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/v1/questions/${encodeURIComponent(id)}/walkthrough`, { credentials: "include" });
    if (!res.ok) return null; // 404 → no approved walkthrough → fall back to rationale
    return (await res.json()) as QuestionWalkthrough;
  } catch {
    return null;
  }
}

export function fetchWalkthrough(id: string): Promise<QuestionWalkthrough | null> {
  let p = cache.get(id);
  if (!p) { p = fetchOne(id); cache.set(id, p); }
  return p;
}
