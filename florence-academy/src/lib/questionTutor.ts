import { CLIENT_NEED_LABEL, CJMM_LABEL } from "../data/blueprint";
import type { PracticeItem } from "../data/lessonTypes";
import {
  QUESTION_TYPE_LABELS,
  type Answer,
  type ClozeSegment,
  type MediaAsset,
  type Question,
} from "../types/question";
import type { TutorSeed } from "./tutorBus";

export interface QuestionTutorContext {
  caseTitle?: string;
  caseTabs?: { label: string; body: string }[];
  source?: string;
}

export function buildQuestionTutorSeed(opts: {
  question: Question;
  answer?: Answer;
  revealed: boolean;
  context?: QuestionTutorContext;
}): TutorSeed {
  const { question, answer, revealed, context } = opts;
  const questionType = QUESTION_TYPE_LABELS[question.type];
  const studentAnswer = answer ? answerSummary(question, answer) : "Not answered yet.";
  const correctAnswer = revealed ? correctSummary(question) : "";
  const phase = revealed
    ? "Rationale is visible. Explain the correct answer, the student's answer, and the clinical judgment."
    : "Question is active. Coach Socratically. Do not reveal the correct answer unless the learner says they already submitted.";

  const lines = [
    "FlorenceRN current question context.",
    context?.source ? `Surface: ${context.source}.` : "",
    `Question id: ${question.id}.`,
    `Topic: ${question.topic}.`,
    `Item type: ${questionType}.`,
    `Client Need: ${CLIENT_NEED_LABEL[question.clientNeed]}.`,
    question.cjmm ? `Clinical Judgment step: ${CJMM_LABEL[question.cjmm]}.` : "",
    context?.caseTitle ? `Unfolding case: ${context.caseTitle}.` : "",
    context?.caseTabs?.length ? `Case data: ${caseTabsSummary(context.caseTabs)}.` : "",
    question.context ? `Scenario: ${clip(question.context, 900)}.` : "",
    `Stem: ${clip(question.stem, 900)}.`,
    `Visible answer structure: ${answerStructure(question)}.`,
    `Learner answer: ${studentAnswer}.`,
    revealed ? `Correct answer: ${correctAnswer}.` : "",
    revealed ? `Rationale: ${clip(question.rationale, 1200)}.` : "",
    question.reference && revealed ? `Reference: ${question.reference}.` : "",
    `Tutor behavior: ${phase}`,
  ].filter(Boolean);

  const contextText = clip(lines.join("\n"), 4200);
  return {
    questionId: question.id,
    context: contextText,
    variables: {
      tutor_context: contextText,
      question_topic: question.topic,
      question_type: questionType,
      client_need: CLIENT_NEED_LABEL[question.clientNeed],
      primary_cjmm_step: question.cjmm ? CJMM_LABEL[question.cjmm] : "Not tagged",
      question_phase: revealed ? "review" : "active",
      student_answer: clip(studentAnswer, 500),
      correct_answer: clip(correctAnswer, 500),
    },
  };
}

export function buildPracticeItemTutorSeed(opts: {
  item: PracticeItem;
  picked?: string | null;
  revealed: boolean;
  source: string;
}): TutorSeed {
  const { item, picked, revealed, source } = opts;
  const studentAnswer = picked
    ? `${picked}: ${item.options.find((o) => o.key === picked)?.text ?? "selected option"}`
    : "Not answered yet.";
  const correct = `${item.answer}: ${item.options.find((o) => o.key === item.answer)?.text ?? "correct option"}`;
  const lines = [
    "FlorenceRN current question context.",
    `Surface: ${source}.`,
    `Question id: ${item.id}.`,
    item.cjmm ? `Clinical Judgment step: ${CJMM_LABEL[item.cjmm]}.` : "",
    `Stem: ${clip(item.stem, 900)}.`,
    `Visible options: ${item.options.map((o) => `${o.key}. ${clip(o.text, 260)}`).join(" | ")}.`,
    `Learner answer: ${studentAnswer}.`,
    revealed ? `Correct answer: ${correct}.` : "",
    revealed ? `Rationale: ${clip(item.rationale, 1200)}.` : "",
    item.reference && revealed ? `Reference: ${item.reference}.` : "",
    revealed
      ? "Tutor behavior: Rationale is visible. Explain why the correct option is safer."
      : "Tutor behavior: Question is active. Coach Socratically. Do not reveal the correct answer unless the learner says they already submitted.",
  ].filter(Boolean);
  const contextText = clip(lines.join("\n"), 3600);
  return {
    questionId: item.id,
    context: contextText,
    variables: {
      tutor_context: contextText,
      question_topic: item.reference ?? item.id,
      question_type: "Lesson practice item",
      client_need: "Lesson practice",
      primary_cjmm_step: item.cjmm ? CJMM_LABEL[item.cjmm] : "Not tagged",
      question_phase: revealed ? "review" : "active",
      student_answer: clip(studentAnswer, 500),
      correct_answer: revealed ? clip(correct, 500) : "",
    },
  };
}

function answerStructure(q: Question): string {
  switch (q.type) {
    case "multiple-choice":
    case "select-all":
    case "trend":
    case "media-exhibit":
      return optionsText(q.options);
    case "fill-in-blank":
      return `Numeric response${q.unit ? ` in ${q.unit}` : ""}.`;
    case "ordered-response":
      return `Order these steps: ${q.steps.map((s, i) => `${i + 1}. ${clip(s, 220)}`).join(" | ")}.`;
    case "matrix":
      return `Rows: ${q.rows.join(" | ")}. Columns: ${q.columns.join(" | ")}.`;
    case "dropdown-cloze":
      return `Drop-down blanks: ${clozeOptions(q.segments)}.`;
    case "highlight":
      return `Highlight tokens: ${q.tokens.map((t, i) => `${i + 1}. ${clip(t, 160)}`).join(" | ")}.`;
    case "bowtie":
      return `Bow-tie. Condition options: ${optionsText(q.condition.options)}. Action options: ${optionsText(q.actions.options)}. Parameter options: ${optionsText(q.parameters.options)}.`;
    case "drag-drop":
      return `Zones: ${q.zones.map((z) => `${z.id}=${z.label}`).join(" | ")}. Tokens: ${q.tokens.map((t) => `${t.id}=${clip(t.text, 180)}`).join(" | ")}.`;
    case "graphic-hotspot":
      return `Image: ${assetText(q.image)}. Hotspots: ${q.hotspots.map((h, i) => `${letter(i)}. ${h.label}`).join(" | ")}.`;
    case "graphic-options":
      return `Image options: ${q.options.map((o, i) => `${letter(i)}. ${assetText(o)}`).join(" | ")}.`;
  }
}

function correctSummary(q: Question): string {
  switch (q.type) {
    case "multiple-choice":
      return optionAt(q.options, q.correct);
    case "select-all":
      return q.correct.map((i) => optionAt(q.options, i)).join("; ");
    case "fill-in-blank":
      return `${q.answer}${q.unit ? ` ${q.unit}` : ""}`;
    case "ordered-response":
      return q.steps.map((s, i) => `${i + 1}. ${clip(s, 180)}`).join("; ");
    case "matrix":
      return q.correct.map((cols, r) => `${q.rows[r]}: ${cols.map((c) => q.columns[c]).join(", ")}`).join("; ");
    case "dropdown-cloze": {
      const blanks = q.segments.filter((s): s is Extract<ClozeSegment, { kind: "blank" }> => s.kind === "blank");
      return blanks.map((b, i) => `Blank ${i + 1}: ${b.options[b.correct]}`).join("; ");
    }
    case "highlight":
      return q.correct.map((i) => `${i + 1}. ${q.tokens[i]}`).join("; ");
    case "bowtie":
      return [
        `Condition: ${optionAt(q.condition.options, q.condition.correct)}`,
        `Actions: ${q.actions.correct.map((i) => optionAt(q.actions.options, i)).join("; ")}`,
        `Parameters: ${q.parameters.correct.map((i) => optionAt(q.parameters.options, i)).join("; ")}`,
      ].join(" | ");
    case "drag-drop":
      return q.tokens.map((t) => `${t.text} -> ${q.zones.find((z) => z.id === t.correctZone)?.label ?? t.correctZone}`).join("; ");
    case "trend":
      return singleOrMultiSummary(q.options, q.correct, q.multi);
    case "graphic-hotspot":
      return q.correct.map((i) => `${letter(i)}. ${q.hotspots[i]?.label ?? `Hotspot ${i + 1}`}`).join("; ");
    case "graphic-options":
      return singleOrMultiAssetSummary(q.options, q.correct, q.multi);
    case "media-exhibit":
      return singleOrMultiSummary(q.options, q.correct, q.multi);
  }
}

function answerSummary(q: Question, a: Answer): string {
  switch (q.type) {
    case "multiple-choice":
      if (a.type !== "multiple-choice") return "Answer type does not match this question.";
      return a.choice == null ? "Not answered yet." : optionAt(q.options, a.choice);
    case "select-all":
      if (a.type !== "select-all") return "Answer type does not match this question.";
      return a.choices.length ? a.choices.map((i) => optionAt(q.options, i)).join("; ") : "Not answered yet.";
    case "fill-in-blank":
      if (a.type !== "fill-in-blank") return "Answer type does not match this question.";
      return a.value.trim() ? a.value : "Not answered yet.";
    case "ordered-response":
      if (a.type !== "ordered-response") return "Answer type does not match this question.";
      return a.order.map((idx, pos) => `${pos + 1}. ${clip(q.steps[idx] ?? `Step ${idx + 1}`, 160)}`).join("; ");
    case "matrix":
      if (a.type !== "matrix") return "Answer type does not match this question.";
      return a.selected.map((cols, r) => `${q.rows[r]}: ${cols.map((c) => q.columns[c]).join(", ") || "none"}`).join("; ");
    case "dropdown-cloze":
      if (a.type !== "dropdown-cloze") return "Answer type does not match this question.";
      return dropdownAnswerSummary(q.segments, a.choices);
    case "highlight":
      if (a.type !== "highlight") return "Answer type does not match this question.";
      return a.selected.length ? a.selected.map((i) => `${i + 1}. ${q.tokens[i]}`).join("; ") : "Not answered yet.";
    case "bowtie":
      if (a.type !== "bowtie") return "Answer type does not match this question.";
      return [
        `Condition: ${a.condition == null ? "none" : optionAt(q.condition.options, a.condition)}`,
        `Actions: ${a.actions.map((i) => optionAt(q.actions.options, i)).join("; ") || "none"}`,
        `Parameters: ${a.parameters.map((i) => optionAt(q.parameters.options, i)).join("; ") || "none"}`,
      ].join(" | ");
    case "drag-drop":
      if (a.type !== "drag-drop") return "Answer type does not match this question.";
      return Object.entries(a.placement).map(([tokenId, zoneId]) => {
        const token = q.tokens.find((t) => t.id === tokenId);
        const zone = q.zones.find((z) => z.id === zoneId);
        return `${token?.text ?? tokenId} -> ${zone?.label ?? zoneId ?? "unplaced"}`;
      }).join("; ");
    case "trend":
      if (a.type !== "trend") return "Answer type does not match this question.";
      return q.multi ? selectedOptions(q.options, a.choices) : a.choice == null ? "Not answered yet." : optionAt(q.options, a.choice);
    case "graphic-hotspot":
      if (a.type !== "graphic-hotspot") return "Answer type does not match this question.";
      return a.selected.length ? a.selected.map((i) => `${letter(i)}. ${q.hotspots[i]?.label ?? `Hotspot ${i + 1}`}`).join("; ") : "Not answered yet.";
    case "graphic-options":
      if (a.type !== "graphic-options") return "Answer type does not match this question.";
      return q.multi ? selectedAssets(q.options, a.choices) : a.choice == null ? "Not answered yet." : `${letter(a.choice)}. ${assetText(q.options[a.choice])}`;
    case "media-exhibit":
      if (a.type !== "media-exhibit") return "Answer type does not match this question.";
      return q.multi ? selectedOptions(q.options, a.choices) : a.choice == null ? "Not answered yet." : optionAt(q.options, a.choice);
  }
}

function caseTabsSummary(tabs: { label: string; body: string }[]): string {
  return clip(tabs.map((t) => `${t.label}: ${clip(t.body, 450)}`).join(" | "), 1400);
}

function optionsText(options: string[]): string {
  return options.map((o, i) => `${letter(i)}. ${clip(o, 240)}`).join(" | ");
}

function clozeOptions(segments: ClozeSegment[]): string {
  let blank = 0;
  return segments
    .filter((s): s is Extract<ClozeSegment, { kind: "blank" }> => s.kind === "blank")
    .map((s) => {
      blank += 1;
      return `Blank ${blank}: ${optionsText(s.options)}`;
    })
    .join(" | ");
}

function dropdownAnswerSummary(segments: ClozeSegment[], choices: (number | null)[]): string {
  const blanks = segments.filter((s): s is Extract<ClozeSegment, { kind: "blank" }> => s.kind === "blank");
  return blanks.map((b, i) => `Blank ${i + 1}: ${choices[i] == null ? "none" : b.options[choices[i]!]}`).join("; ");
}

function singleOrMultiSummary(options: string[], correct: number | number[], multi?: boolean): string {
  if (multi && Array.isArray(correct)) return correct.map((i) => optionAt(options, i)).join("; ");
  return optionAt(options, Array.isArray(correct) ? correct[0] : correct);
}

function singleOrMultiAssetSummary(options: MediaAsset[], correct: number | number[], multi?: boolean): string {
  const at = (i: number) => `${letter(i)}. ${assetText(options[i])}`;
  if (multi && Array.isArray(correct)) return correct.map(at).join("; ");
  return at(Array.isArray(correct) ? correct[0] : correct);
}

function selectedOptions(options: string[], choices: number[]): string {
  return choices.length ? choices.map((i) => optionAt(options, i)).join("; ") : "Not answered yet.";
}

function selectedAssets(options: MediaAsset[], choices: number[]): string {
  return choices.length ? choices.map((i) => `${letter(i)}. ${assetText(options[i])}`).join("; ") : "Not answered yet.";
}

function optionAt(options: string[], index: number): string {
  return `${letter(index)}. ${clip(options[index] ?? `Option ${index + 1}`, 240)}`;
}

function assetText(asset: MediaAsset | undefined): string {
  if (!asset) return "Image option";
  return clip([asset.modality, asset.alt, asset.caption].filter(Boolean).join(" - "), 260);
}

function letter(index: number): string {
  return String.fromCharCode(65 + index);
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
}
