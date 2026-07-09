/**
 * NCSBN 2026 RN Test Plan blueprint + NGN Clinical Judgment model + the
 * Florence Academy Section list.
 *
 * The CAT engine uses CLIENT_NEEDS target proportions to content-balance an
 * adaptive session (so a 150-item night mirrors the real exam's mix, not just
 * whatever happens to be hardest). Percentages are the published 2026 RN plan
 * ranges; `target` is the midpoint we balance toward.
 */

import type { ClientNeed, CjmmStep } from "../types/question";

export interface ClientNeedSpec {
  key: ClientNeed;
  label: string;
  group: string;
  /** Published lower / upper bound of the blueprint range (proportion). */
  min: number;
  max: number;
  /** Midpoint target proportion used for content balancing (sums to ~1). */
  target: number;
}

export const CLIENT_NEEDS: ClientNeedSpec[] = [
  {
    key: "management-of-care",
    label: "Management of Care",
    group: "Safe & Effective Care Environment",
    min: 0.15,
    max: 0.21,
    target: 0.18,
  },
  {
    key: "safety-infection-control",
    label: "Safety & Infection Control",
    group: "Safe & Effective Care Environment",
    min: 0.1,
    max: 0.16,
    target: 0.13,
  },
  {
    key: "health-promotion",
    label: "Health Promotion & Maintenance",
    group: "Health Promotion & Maintenance",
    min: 0.06,
    max: 0.12,
    target: 0.09,
  },
  {
    key: "psychosocial-integrity",
    label: "Psychosocial Integrity",
    group: "Psychosocial Integrity",
    min: 0.06,
    max: 0.12,
    target: 0.09,
  },
  {
    key: "basic-care-comfort",
    label: "Basic Care & Comfort",
    group: "Physiological Integrity",
    min: 0.06,
    max: 0.12,
    target: 0.09,
  },
  {
    key: "pharmacological-therapies",
    label: "Pharmacological & Parenteral Therapies",
    group: "Physiological Integrity",
    min: 0.13,
    max: 0.19,
    target: 0.16,
  },
  {
    key: "reduction-of-risk",
    label: "Reduction of Risk Potential",
    group: "Physiological Integrity",
    min: 0.09,
    max: 0.15,
    target: 0.12,
  },
  {
    key: "physiological-adaptation",
    label: "Physiological Adaptation",
    group: "Physiological Integrity",
    min: 0.11,
    max: 0.17,
    target: 0.14,
  },
];

export const CLIENT_NEED_LABEL: Record<ClientNeed, string> = Object.fromEntries(
  CLIENT_NEEDS.map((c) => [c.key, c.label]),
) as Record<ClientNeed, string>;

export interface CjmmSpec {
  key: CjmmStep;
  order: number;
  label: string;
  blurb: string;
}

export const CJMM_STEPS: CjmmSpec[] = [
  {
    key: "recognize-cues",
    order: 1,
    label: "Recognize Cues",
    blurb: "Identify relevant and important data from many sources.",
  },
  {
    key: "analyze-cues",
    order: 2,
    label: "Analyze Cues",
    blurb: "Connect the cues to the client's clinical presentation.",
  },
  {
    key: "prioritize-hypotheses",
    order: 3,
    label: "Prioritize Hypotheses",
    blurb: "Rank the possible explanations by urgency and likelihood.",
  },
  {
    key: "generate-solutions",
    order: 4,
    label: "Generate Solutions",
    blurb: "Identify expected outcomes and the actions that achieve them.",
  },
  {
    key: "take-actions",
    order: 5,
    label: "Take Actions",
    blurb: "Implement the interventions that best address the priority.",
  },
  {
    key: "evaluate-outcomes",
    order: 6,
    label: "Evaluate Outcomes",
    blurb: "Compare observed results against expected outcomes.",
  },
];

export const CJMM_LABEL: Record<CjmmStep, string> = Object.fromEntries(
  CJMM_STEPS.map((c) => [c.key, c.label]),
) as Record<CjmmStep, string>;

// ---------------------------------------------------------------------------
// Course sections (formerly "hours" - de-emphasized per product direction)
// ---------------------------------------------------------------------------

export interface SectionSpec {
  n: number;
  title: string;
  slug: string;
  primaryNeed: ClientNeed;
  ready?: boolean;
}

export const SECTIONS: SectionSpec[] = [
  { n: 1, title: "Orientation", slug: "section-1-orientation", primaryNeed: "management-of-care", ready: true },
  { n: 2, title: "Test-Taking Strategy", slug: "section-2-test-taking", primaryNeed: "management-of-care", ready: true },
  { n: 3, title: "Pharmacology I - Cardiac & Anticoagulants", slug: "section-3-pharmacology-i", primaryNeed: "pharmacological-therapies", ready: true },
  { n: 4, title: "Pharmacology II", slug: "section-4-pharmacology-ii", primaryNeed: "pharmacological-therapies", ready: true },
  { n: 5, title: "Pharmacology III", slug: "section-5-pharmacology-iii", primaryNeed: "pharmacological-therapies", ready: true },
  { n: 6, title: "Lab Values", slug: "section-6-lab-values", primaryNeed: "reduction-of-risk", ready: true },
  { n: 7, title: "Cardiac", slug: "section-7-cardiac", primaryNeed: "physiological-adaptation", ready: true },
  { n: 8, title: "Respiratory", slug: "section-8-respiratory", primaryNeed: "physiological-adaptation", ready: true },
  { n: 9, title: "Endocrine", slug: "section-9-endocrine", primaryNeed: "physiological-adaptation", ready: true },
  { n: 10, title: "Renal & GI", slug: "section-10-renal-gi", primaryNeed: "physiological-adaptation", ready: true },
  { n: 11, title: "Neuro & Musculoskeletal", slug: "section-11-neuro-msk", primaryNeed: "physiological-adaptation", ready: true },
  { n: 12, title: "Maternity", slug: "section-12-maternity", primaryNeed: "health-promotion", ready: true },
  { n: 13, title: "Pediatrics", slug: "section-13-pediatrics", primaryNeed: "health-promotion", ready: true },
  { n: 14, title: "Mental Health", slug: "section-14-mental-health", primaryNeed: "psychosocial-integrity", ready: true },
  { n: 15, title: "Infection Control", slug: "section-15-infection-control", primaryNeed: "safety-infection-control", ready: true },
  { n: 16, title: "Management of Care", slug: "section-16-management-of-care", primaryNeed: "management-of-care", ready: true },
  { n: 17, title: "NGN Unfolding Cases", slug: "section-17-ngn-cases", primaryNeed: "management-of-care", ready: true },
  { n: 18, title: "Full Simulation", slug: "section-18-full-simulation", primaryNeed: "physiological-adaptation", ready: true },
  { n: 19, title: "Targeted Review", slug: "section-19-targeted-review", primaryNeed: "reduction-of-risk", ready: true },
  { n: 20, title: "Exam Day", slug: "section-20-exam-day", primaryNeed: "management-of-care", ready: true },
];

export const sectionByN = (n: number) => SECTIONS.find((s) => s.n === n);

// ── Live-cohort coverage watermark ───────────────────────────────────────────
// How far the instructor has gotten in the live cohort, by section number.
//   0  = nothing covered yet (default for a brand-new cohort)
//   n  = sections 1..n have been covered live and are revisitable
//   20 = entire curriculum has been covered
// Sections ABOVE the watermark stay shaded and are not clickable - the lesson
// pages themselves block direct URL access too. Bump this each week as the
// cohort progresses (or override via VITE_COVERED_THROUGH_SECTION at build time).
const DEFAULT_COVERED_THROUGH = 0;

function readCoveredThrough(): number {
  try {
    const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
    const raw = env["VITE_COVERED_THROUGH_SECTION"];
    const n = raw != null ? Number(raw) : DEFAULT_COVERED_THROUGH;
    if (!Number.isFinite(n)) return DEFAULT_COVERED_THROUGH;
    return Math.max(0, Math.min(SECTIONS.length, Math.floor(n)));
  } catch {
    return DEFAULT_COVERED_THROUGH;
  }
}

export const COVERED_THROUGH_SECTION = readCoveredThrough();

/** Three-state UI signal for a section - the home grid and the lesson page agree. */
export type CoverageState = "covered" | "current" | "upcoming" | "not_published";

/**
 * Classify a section against a watermark. If `watermark` is omitted the
 * build-time env-var default is used - that's the right behavior for the
 * public/unenrolled browser. Authenticated students get their cohort's
 * actual coverage by reading /v1/me/cohort and passing it in.
 */
export function coverageOf(section: SectionSpec, watermark?: number): CoverageState {
  const w = typeof watermark === "number" ? watermark : COVERED_THROUGH_SECTION;
  if (!section.ready) return "not_published"; // lesson file missing
  if (section.n <= w) return "covered";
  if (section.n === w + 1) return "current";
  return "upcoming";
}

/** A learner can open the section iff it's covered or current. */
export function isAccessible(section: SectionSpec, watermark?: number): boolean {
  const c = coverageOf(section, watermark);
  return c === "covered" || c === "current";
}
