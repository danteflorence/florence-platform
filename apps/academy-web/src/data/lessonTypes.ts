// ───────────────────────────────────────────────────────────────────────────
// Canonical lesson format for ALL course sections. Every section's content file
// (hour1.ts … hour20.ts) is authored to this shape and exposes a `lesson:
// Lesson`; the deck builder, reader page, and live presenter are pure views of
// it. Extracted from the original Section-7 (Cardiac) content so all sections
// share one source of truth.
// ───────────────────────────────────────────────────────────────────────────

import type { CjmmStep } from "../types/question";

export type CalloutTone = "key" | "warn" | "info";

export type ContentBlock =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "callout"; tone: CalloutTone; title: string; text: string };

export interface PracticeOption {
  key: string; // "A" | "B" | ...
  text: string;
}

export interface PracticeItem {
  id: string;
  stem: string;
  options: PracticeOption[];
  answer: string; // option key
  rationale: string;
  /** NGN Clinical Judgment step this item primarily exercises. */
  cjmm?: CjmmStep;
  /** Short reference back into this section's lesson. */
  reference?: string;
}

/** Optional interactive widget a segment can mount after its prose. */
export type LessonWidget = "heart" | "rhythms" | "sim" | "ngn" | "vpatient";

export interface Segment {
  id: string; // anchor slug
  minutes: string;
  title: string;
  format: string;
  blocks: ContentBlock[];
  practiceItemId?: string;
  widget?: LessonWidget;
}

export interface RhythmCard {
  name: string;
  recognition: string;
  action: string;
  shockable: "yes" | "no" | "n/a";
  group: "Sinus" | "Atrial" | "Ventricular" | "Arrest" | "Block";
}

export interface TimingRow {
  minutes: string;
  segment: string;
  format: string;
}

export interface LessonMeta {
  number: number;
  title: string;
  durationMin: number;
  audience: string;
  contentWeight: string;
  tagline: string;
}

/** A complete section lesson - the single source every view renders from. */
export interface Lesson {
  meta: LessonMeta;
  objectives: string[];
  timing: TimingRow[];
  practiceItems: Record<string, PracticeItem>;
  segments: Segment[];
}
