/**
 * Florence Academy - unified NCLEX question model.
 *
 * One discriminated union covers every NCLEX-style item type (classic + Next
 * Generation), so a single runner and a single CAT engine can drive all of
 * them. Every item carries the metadata the adaptive engine needs:
 *   - `difficulty`  - Rasch difficulty on the logit scale (b parameter)
 *   - `clientNeed`  - NCSBN 2026 RN Test Plan category (for content balancing)
 *   - `section`     - which course Section it belongs to (1..20)
 *   - `cjmm`        - Next-Gen Clinical Judgment step, when applicable
 *
 * All content here is original, Florence-authored. The commercial prep banks
 * (UWorld / Archer / Saunders / Klimek) are used only as topical reference.
 */

// ---------------------------------------------------------------------------
// Blueprint enums
// ---------------------------------------------------------------------------

/** The 8 Client Needs categories of the NCSBN 2026 RN Test Plan. */
export type ClientNeed =
  | "management-of-care"
  | "safety-infection-control"
  | "health-promotion"
  | "psychosocial-integrity"
  | "basic-care-comfort"
  | "pharmacological-therapies"
  | "reduction-of-risk"
  | "physiological-adaptation";

/** The 6 cognitive steps of the NGN Clinical Judgment Measurement Model. */
export type CjmmStep =
  | "recognize-cues"
  | "analyze-cues"
  | "prioritize-hypotheses"
  | "generate-solutions"
  | "take-actions"
  | "evaluate-outcomes";

export type QuestionType =
  | "multiple-choice"
  | "select-all"
  | "fill-in-blank"
  | "ordered-response"
  | "matrix"
  | "dropdown-cloze"
  | "highlight"
  | "bowtie"
  | "drag-drop"
  | "trend"
  // Image / media item types (assets supplied by content team) ───────────────
  | "graphic-hotspot"
  | "graphic-options"
  | "media-exhibit";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  "multiple-choice": "Multiple choice",
  "select-all": "Select all that apply",
  "fill-in-blank": "Fill in the blank",
  "ordered-response": "Ordered response",
  matrix: "Matrix / grid",
  "dropdown-cloze": "Drop-down cloze",
  highlight: "Highlight",
  bowtie: "Bow-tie",
  "drag-drop": "Drag and drop",
  trend: "Trend",
  "graphic-hotspot": "Graphic hot-spot",
  "graphic-options": "Graphic options",
  "media-exhibit": "Media exhibit",
};

// ---------------------------------------------------------------------------
// Shared metadata
// ---------------------------------------------------------------------------

export interface QuestionMeta {
  id: string;
  type: QuestionType;
  /** Rasch difficulty (logit b). Roughly -3 (very easy) .. +3 (very hard). */
  difficulty: number;
  clientNeed: ClientNeed;
  /** Course Section this item maps to (1..20). */
  section: number;
  topic: string;
  /** Optional shared clinical scenario shown above the stem (e.g. an NGN case). */
  context?: string;
  /** NGN cognitive step, when the item is part of clinical-judgment content. */
  cjmm?: CjmmStep;
  /**
   * IEN-targeting lens. `clinical_english` = OET-style medical-English items
   * (handoffs, orders, patient teaching); `drug_naming` = US generic-name
   * conversions (e.g. Paracetamol→Acetaminophen). Untagged items behave exactly
   * as before; the CAT engine ignores these tags.
   */
  lens?: "clinical_english" | "drug_naming";
  /** Corridors an item especially targets (e.g. India drug-name conversions). */
  corridor?: ("india" | "africa" | "philippines")[];
  /** The lead-in / prompt shown to the candidate. */
  stem: string;
  /** Worked rationale, revealed in tutor mode after the item is submitted. */
  rationale: string;
  /** Optional short reference back into the Field Guide. */
  reference?: string;
  /**
   * Whether `difficulty` is calibrated from real response data. Imported and
   * seed items ship with an uncalibrated prior (false / undefined); this flips
   * to true once online Rasch calibration estimates b from collected responses
   * (see scripts/import_question_bank.py header for the procedure).
   */
  calibrated?: boolean;
}

// ---------------------------------------------------------------------------
// Per-type item shapes
// ---------------------------------------------------------------------------

export interface MultipleChoiceQuestion extends QuestionMeta {
  type: "multiple-choice";
  options: string[];
  /** Index of the single correct option. */
  correct: number;
}

export interface SelectAllQuestion extends QuestionMeta {
  type: "select-all";
  options: string[];
  /** Indices of every correct option (1+). */
  correct: number[];
}

export interface FillInBlankQuestion extends QuestionMeta {
  type: "fill-in-blank";
  /** Numeric answer (e.g. a dosage). */
  answer: number;
  unit?: string;
  /** Absolute tolerance for a correct numeric answer (default 0). */
  tolerance?: number;
  /** Decimal places to display/round to. */
  decimals?: number;
}

export interface OrderedResponseQuestion extends QuestionMeta {
  type: "ordered-response";
  /** Steps listed in the CORRECT order; the renderer shuffles for display. */
  steps: string[];
}

export interface MatrixQuestion extends QuestionMeta {
  type: "matrix";
  rows: string[];
  columns: string[];
  /** "single" = one column per row (radio); "multi" = any per row (checkbox). */
  mode: "single" | "multi";
  /** For each row, the set of correct column indices. */
  correct: number[][];
}

export type ClozeSegment =
  | { kind: "text"; text: string }
  | { kind: "blank"; options: string[]; correct: number };

export interface DropdownClozeQuestion extends QuestionMeta {
  type: "dropdown-cloze";
  /** Ordered prose with inline drop-down blanks. */
  segments: ClozeSegment[];
}

export interface HighlightQuestion extends QuestionMeta {
  type: "highlight";
  /** Clickable clauses/sentences. */
  tokens: string[];
  /** Indices of the tokens that SHOULD be highlighted. */
  correct: number[];
  /** Optional instruction above the passage. */
  instruction?: string;
}

export interface BowtieQuestion extends QuestionMeta {
  type: "bowtie";
  /** Center: the condition / problem (choose 1). */
  condition: { options: string[]; correct: number };
  /** Left wing: actions to take (choose exactly correct.length). */
  actions: { options: string[]; correct: number[] };
  /** Right wing: parameters to monitor (choose exactly correct.length). */
  parameters: { options: string[]; correct: number[] };
}

export interface DragDropQuestion extends QuestionMeta {
  type: "drag-drop";
  zones: { id: string; label: string }[];
  /** Each token belongs in exactly one zone. */
  tokens: { id: string; text: string; correctZone: string }[];
}

export interface TrendQuestion extends QuestionMeta {
  type: "trend";
  /** A time-series table the candidate must read. */
  table: { columns: string[]; rows: string[][] };
  options: string[];
  /** Single index, or multiple indices when `multi`. */
  correct: number | number[];
  multi?: boolean;
}

// ---------------------------------------------------------------------------
// Image / media item types
//
// NCLEX increasingly ships items built on a clinical image - an ECG strip, a
// wound photo, an X-ray. These three shapes scaffold that family. The CONTENT
// (alt text, options, rationale, geometry) is authored now; the binary ASSET
// (`MediaAsset.src`) is supplied later by the content team. Renderers degrade
// to a labelled "media pending" placeholder while `src` is empty, so an item
// is reviewable and gradable before its artwork exists.
// ---------------------------------------------------------------------------

/** A clinical image/media reference. Asset binary supplied later. */
export interface MediaAsset {
  /** Image URL or bundled import path. Empty string until the asset lands. */
  src: string;
  /** Screen-reader description of the image. Required (authored up front). */
  alt: string;
  /** Optional caption shown beneath the media. */
  caption?: string;
  /** Exhibit modality, used for the corner badge and future filtering. */
  modality?:
    | "ecg"
    | "rhythm"
    | "xray"
    | "ct"
    | "wound"
    | "photo"
    | "diagram"
    | "other";
  /** Aspect ratio (width / height) so the box reserves space before load. */
  aspect?: number;
}

/** A clickable region on a graphic, positioned as % of the image box. */
export interface Hotspot {
  id: string;
  /** Accessible name for the region (e.g. "Point of maximal impulse"). */
  label: string;
  /** Geometry as percentages of the image (0..100), so it scales responsively. */
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: "rect" | "ellipse";
}

/** Click region(s) on a clinical image (NGN "hot spot"). */
export interface GraphicHotspotQuestion extends QuestionMeta {
  type: "graphic-hotspot";
  image: MediaAsset;
  hotspots: Hotspot[];
  /** Indices of the hotspots that SHOULD be selected. */
  correct: number[];
  /** Allow more than one region (default true). */
  multi?: boolean;
  instruction?: string;
}

/** Multiple choice where each option is an image (e.g. "pick the AFib strip"). */
export interface GraphicOptionsQuestion extends QuestionMeta {
  type: "graphic-options";
  options: MediaAsset[];
  /** Single index, or multiple indices when `multi`. */
  correct: number | number[];
  multi?: boolean;
}

/** A media exhibit (ECG / X-ray / wound) shown above text answer options. */
export interface MediaExhibitQuestion extends QuestionMeta {
  type: "media-exhibit";
  exhibit: MediaAsset;
  options: string[];
  /** Single index, or multiple indices when `multi`. */
  correct: number | number[];
  multi?: boolean;
}

export type Question =
  | MultipleChoiceQuestion
  | SelectAllQuestion
  | FillInBlankQuestion
  | OrderedResponseQuestion
  | MatrixQuestion
  | DropdownClozeQuestion
  | HighlightQuestion
  | BowtieQuestion
  | DragDropQuestion
  | TrendQuestion
  | GraphicHotspotQuestion
  | GraphicOptionsQuestion
  | MediaExhibitQuestion;

// ---------------------------------------------------------------------------
// Unfolding case studies (a scenario shared by a sequence of items)
// ---------------------------------------------------------------------------

export interface CaseStudy {
  id: string;
  title: string;
  /** Tabs of clinical data (Nurses' Notes, Vital Signs, Labs, Orders, …). */
  tabs: { label: string; body: string }[];
  /** Ordered item ids - typically 6, one per CJMM step. */
  questionIds: string[];
}

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

export type Answer =
  | { type: "multiple-choice"; choice: number | null }
  | { type: "select-all"; choices: number[] }
  | { type: "fill-in-blank"; value: string }
  | { type: "ordered-response"; order: number[] }
  | { type: "matrix"; selected: number[][] }
  | { type: "dropdown-cloze"; choices: (number | null)[] }
  | { type: "highlight"; selected: number[] }
  | {
      type: "bowtie";
      condition: number | null;
      actions: number[];
      parameters: number[];
    }
  | { type: "drag-drop"; placement: Record<string, string | null> }
  | { type: "trend"; choice: number | null; choices: number[] }
  | { type: "graphic-hotspot"; selected: number[] }
  | { type: "graphic-options"; choice: number | null; choices: number[] }
  | { type: "media-exhibit"; choice: number | null; choices: number[] };

/** A fresh, empty answer for a given question (used to seed component state). */
export function emptyAnswer(q: Question): Answer {
  switch (q.type) {
    case "multiple-choice":
      return { type: "multiple-choice", choice: null };
    case "select-all":
      return { type: "select-all", choices: [] };
    case "fill-in-blank":
      return { type: "fill-in-blank", value: "" };
    case "ordered-response":
      return { type: "ordered-response", order: shuffledIndices(q.steps.length) };
    case "matrix":
      return { type: "matrix", selected: q.rows.map(() => []) };
    case "dropdown-cloze":
      return {
        type: "dropdown-cloze",
        choices: q.segments.filter((s) => s.kind === "blank").map(() => null),
      };
    case "highlight":
      return { type: "highlight", selected: [] };
    case "bowtie":
      return { type: "bowtie", condition: null, actions: [], parameters: [] };
    case "drag-drop":
      return {
        type: "drag-drop",
        placement: Object.fromEntries(q.tokens.map((t) => [t.id, null])),
      };
    case "trend":
      return { type: "trend", choice: null, choices: [] };
    case "graphic-hotspot":
      return { type: "graphic-hotspot", selected: [] };
    case "graphic-options":
      return { type: "graphic-options", choice: null, choices: [] };
    case "media-exhibit":
      return { type: "media-exhibit", choice: null, choices: [] };
  }
}

/** Whether the candidate has supplied enough of an answer to submit. */
export function isAnswered(q: Question, a: Answer): boolean {
  if (q.type !== a.type) return false;
  switch (a.type) {
    case "multiple-choice":
      return a.choice !== null;
    case "select-all":
      return a.choices.length > 0;
    case "fill-in-blank":
      return a.value.trim() !== "" && !Number.isNaN(Number(a.value));
    case "ordered-response":
      return true; // an ordering always exists
    case "matrix":
      return (q as MatrixQuestion).rows.every((_, r) => a.selected[r]?.length > 0);
    case "dropdown-cloze":
      return a.choices.every((c) => c !== null);
    case "highlight":
      return a.selected.length > 0;
    case "bowtie":
      return (
        a.condition !== null && a.actions.length > 0 && a.parameters.length > 0
      );
    case "drag-drop":
      return Object.values(a.placement).every((z) => z !== null);
    case "trend": {
      const tq = q as TrendQuestion;
      return tq.multi ? a.choices.length > 0 : a.choice !== null;
    }
    case "graphic-hotspot":
      return a.selected.length > 0;
    case "graphic-options": {
      const gq = q as GraphicOptionsQuestion;
      return gq.multi ? a.choices.length > 0 : a.choice !== null;
    }
    case "media-exhibit": {
      const mq = q as MediaExhibitQuestion;
      return mq.multi ? a.choices.length > 0 : a.choice !== null;
    }
  }
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

export interface GradeResult {
  /** Continuous score in [0, 1]. NGN-style partial credit where applicable. */
  score: number;
  /** True only at full credit. */
  correct: boolean;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const eq = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();
const overlap = (chosen: number[], correct: number[]) =>
  chosen.filter((c) => correct.includes(c)).length;

export function gradeQuestion(q: Question, a: Answer): GradeResult {
  const score = rawScore(q, a);
  return { score, correct: score > 0.999 };
}

function rawScore(q: Question, a: Answer): number {
  if (q.type !== a.type) return 0;
  switch (q.type) {
    case "multiple-choice":
      return a.type === "multiple-choice" && a.choice === q.correct ? 1 : 0;

    case "select-all": {
      if (a.type !== "select-all") return 0;
      const right = overlap(a.choices, q.correct);
      const wrong = a.choices.length - right;
      return clamp01((right - wrong) / q.correct.length);
    }

    case "fill-in-blank": {
      if (a.type !== "fill-in-blank") return 0;
      const v = Number(a.value);
      if (Number.isNaN(v)) return 0;
      return Math.abs(v - q.answer) <= (q.tolerance ?? 0) ? 1 : 0;
    }

    case "ordered-response": {
      if (a.type !== "ordered-response") return 0;
      const n = q.steps.length;
      const inPlace = a.order.filter((stepIdx, pos) => stepIdx === pos).length;
      return n === 0 ? 0 : inPlace / n;
    }

    case "matrix": {
      if (a.type !== "matrix") return 0;
      const rows = q.correct.length;
      let good = 0;
      for (let r = 0; r < rows; r++) {
        if (eq(a.selected[r] ?? [], q.correct[r])) good++;
      }
      return rows === 0 ? 0 : good / rows;
    }

    case "dropdown-cloze": {
      if (a.type !== "dropdown-cloze") return 0;
      const blanks = q.segments.filter(
        (s): s is Extract<ClozeSegment, { kind: "blank" }> => s.kind === "blank",
      );
      let good = 0;
      blanks.forEach((b, i) => {
        if (a.choices[i] === b.correct) good++;
      });
      return blanks.length === 0 ? 0 : good / blanks.length;
    }

    case "highlight": {
      if (a.type !== "highlight") return 0;
      const right = overlap(a.selected, q.correct);
      const wrong = a.selected.length - right;
      return clamp01((right - wrong) / q.correct.length);
    }

    case "bowtie": {
      if (a.type !== "bowtie") return 0;
      const max = 1 + q.actions.correct.length + q.parameters.correct.length;
      let pts = a.condition === q.condition.correct ? 1 : 0;
      pts += overlap(a.actions, q.actions.correct);
      pts += overlap(a.parameters, q.parameters.correct);
      return clamp01(pts / max);
    }

    case "drag-drop": {
      if (a.type !== "drag-drop") return 0;
      const total = q.tokens.length;
      const good = q.tokens.filter(
        (t) => a.placement[t.id] === t.correctZone,
      ).length;
      return total === 0 ? 0 : good / total;
    }

    case "trend": {
      if (a.type !== "trend") return 0;
      if (q.multi && Array.isArray(q.correct)) {
        const right = overlap(a.choices, q.correct);
        const wrong = a.choices.length - right;
        return clamp01((right - wrong) / q.correct.length);
      }
      return a.choice === q.correct ? 1 : 0;
    }

    case "graphic-hotspot": {
      if (a.type !== "graphic-hotspot") return 0;
      // Overlap-with-penalty, same as Highlight: reward hits, dock false clicks.
      const right = overlap(a.selected, q.correct);
      const wrong = a.selected.length - right;
      return q.correct.length === 0
        ? 0
        : clamp01((right - wrong) / q.correct.length);
    }

    case "graphic-options":
      return a.type === "graphic-options"
        ? scoreSingleOrMulti(q.correct, q.multi, a.choice, a.choices)
        : 0;

    case "media-exhibit":
      return a.type === "media-exhibit"
        ? scoreSingleOrMulti(q.correct, q.multi, a.choice, a.choices)
        : 0;
  }
}

/**
 * Grades an answer whose `correct` is one index (single-select) or several
 * (SATA-style). Single → all-or-nothing; multi → overlap with a wrong-pick
 * penalty, matching how Select-all and Trend score.
 */
function scoreSingleOrMulti(
  correct: number | number[],
  multi: boolean | undefined,
  choice: number | null,
  choices: number[],
): number {
  if (multi && Array.isArray(correct)) {
    const right = overlap(choices, correct);
    const wrong = choices.length - right;
    return correct.length === 0 ? 0 : clamp01((right - wrong) / correct.length);
  }
  const target = Array.isArray(correct) ? correct[0] : correct;
  return choice === target ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

/** A deterministic-enough shuffle of [0..n) for seeding ordered-response. */
export function shuffledIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Guard against the identity ordering (which would be pre-solved).
  if (n > 1 && arr.every((v, i) => v === i)) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr;
}
