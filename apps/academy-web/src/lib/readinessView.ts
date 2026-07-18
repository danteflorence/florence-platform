// Readiness presentation - pure mapping from a ReadinessSnapshot (the API's
// learner-facing projection) to render-ready strings/classes. Kept out of the
// component so the repo's headless vitest suite can pin the band → tone map
// and the label fallbacks without a DOM.

import type { ReadinessBand, ReadinessSnapshot } from "./academyAuth";
import { CLIENT_NEED_LABEL } from "../data/blueprint";
import type { ClientNeed } from "../types/question";

/** Green-band pass-probability threshold. Mirrors bandFromReadiness in
 *  api/src/readiness.ts; change both together. */
export const GREEN_THRESHOLD = 0.8;

export interface BandPresentation {
  /** Short badge text, e.g. "Exam-ready". */
  label: string;
  /** Pill classes (background + text). */
  chipClass: string;
  /** Accent classes for the progress bar fill. */
  barClass: string;
}

const BAND_PRESENTATION: Record<ReadinessBand, BandPresentation> = {
  green: {
    label: "Exam-ready",
    chipClass: "bg-vital-ok/15 text-emerald-800 ring-1 ring-vital-ok/40",
    barClass: "bg-vital-ok",
  },
  yellow: {
    label: "Almost there",
    chipClass: "bg-vital-warn/15 text-amber-800 ring-1 ring-vital-warn/40",
    barClass: "bg-vital-warn",
  },
  orange: {
    label: "Building",
    chipClass: "bg-orange-500/15 text-orange-800 ring-1 ring-orange-500/40",
    barClass: "bg-orange-500",
  },
  red: {
    label: "Needs focused work",
    chipClass: "bg-vital-danger/15 text-red-800 ring-1 ring-vital-danger/40",
    barClass: "bg-vital-danger",
  },
  none: {
    label: "No baseline yet",
    chipClass: "bg-florence-mist text-florence-slate ring-1 ring-florence-line",
    barClass: "bg-florence-slate/40",
  },
};

export function bandPresentation(band: ReadinessBand): BandPresentation {
  return BAND_PRESENTATION[band] ?? BAND_PRESENTATION.none;
}

/** "management-of-care" → "Management of Care"; unknown slugs prettified. */
export function focusAreaLabel(slug: string): string {
  const known = (CLIENT_NEED_LABEL as Record<string, string>)[slug as ClientNeed];
  if (known) return known;
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export interface ReadinessView {
  band: ReadinessBand;
  presentation: BandPresentation;
  /** Projected pass probability as a whole percent, or null before any scored result. */
  passPct: number | null;
  /** The engine's prescriptive study step ("Focus your studying on …"). */
  nextAction: string;
  /** Weakest Client Need areas, human-labeled, weakest first (max 3 from the API). */
  focusAreas: string[];
  /** Course progress 0..100 from sections completed. */
  sectionsPct: number;
  assessmentsTaken: number;
  itemsCompleted: number;
  sectionsCompleted: number;
  sectionsTotal: number;
}

export function presentReadiness(s: ReadinessSnapshot): ReadinessView {
  const passPct =
    typeof s.readiness === "number" && Number.isFinite(s.readiness)
      ? Math.round(s.readiness * 100)
      : null;
  const sectionsPct =
    s.sections_total > 0
      ? Math.round((s.sections_completed / s.sections_total) * 100)
      : 0;
  return {
    band: s.band,
    presentation: bandPresentation(s.band),
    passPct,
    nextAction:
      s.next_action ?? "Take a baseline diagnostic to see where you stand.",
    focusAreas: (s.focus_areas ?? []).map(focusAreaLabel),
    sectionsPct,
    assessmentsTaken: s.assessments_taken,
    itemsCompleted: s.items_completed,
    sectionsCompleted: s.sections_completed,
    sectionsTotal: s.sections_total,
  };
}
