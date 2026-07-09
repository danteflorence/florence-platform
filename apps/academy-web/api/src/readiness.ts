// Readiness scoring - pure derivation of a learner-facing "passport v0" snapshot
// from append-only assessment_results + per-section progress. No financial fields
// ever enter this projection (see types.ts ReadinessSnapshot).

import type {
  AssessmentResult,
  ProgressRecord,
  ReadinessBand,
  ReadinessSnapshot,
  RouteClass,
} from "./types.ts";

/** The Academy's full course length - used as the progress denominator. */
export const DEFAULT_SECTIONS_TOTAL = 20;

/**
 * Day-5 READINESS routing from the band - interview-ready / repeat / bridge /
 * credential-repair. This is NOT pathway/visa routing (university, state board,
 * employer, visa timing); that's the Florence Pathway Agent's job once a
 * candidate is handed off.
 */
export function routeFromReadiness(band: ReadinessBand): RouteClass {
  switch (band) {
    case "green":
      return "interview_ready";
    case "yellow":
      return "repeat";
    case "orange":
      return "bridge";
    case "red":
      return "credential_repair";
    default:
      return "in_progress";
  }
}

const NEED_LABEL: Record<string, string> = {
  "management-of-care": "Management of Care",
  "safety-infection-control": "Safety & Infection Control",
  "health-promotion": "Health Promotion",
  "psychosocial-integrity": "Psychosocial Integrity",
  "basic-care-comfort": "Basic Care & Comfort",
  "pharmacological-therapies": "Pharmacological Therapies",
  "reduction-of-risk": "Reduction of Risk",
  "physiological-adaptation": "Physiological Adaptation",
};

/**
 * Learner-facing STUDY next-best-action (no pathway/visa/employer steps - those
 * are the Pathway Agent's). Drives the "what should I do next" on the Passport.
 */
export function learnerNextAction(band: ReadinessBand, focusAreas: string[]): string {
  const top = focusAreas[0] ? (NEED_LABEL[focusAreas[0]] ?? focusAreas[0]) : undefined;
  switch (band) {
    case "none":
      return "Take a baseline diagnostic to see where you stand.";
    case "red":
    case "orange":
      return top ? `Focus your studying on ${top}.` : "Work through remediation on your weakest areas.";
    case "yellow":
      return top ? `You're close - sharpen ${top}, then take another practice exam.` : "You're close - take another practice exam.";
    case "green":
      return "You're exam-ready - keep sharp with a timed practice set.";
  }
}

/**
 * Map a projected pass probability to a traffic-light band. Thresholds mirror the
 * Academy's learner-facing readiness language (green = exam-ready).
 */
export function bandFromReadiness(readiness: number | undefined): ReadinessBand {
  if (readiness === undefined || !Number.isFinite(readiness)) return "none";
  if (readiness >= 0.8) return "green";
  if (readiness >= 0.65) return "yellow";
  if (readiness >= 0.5) return "orange";
  return "red";
}

/**
 * Roll up a candidate's results + progress into one snapshot. Corrections
 * (rows whose id is referenced by another row's `supersedes`) are excluded, so a
 * superseded result never drives the band.
 */
export function computeReadiness(opts: {
  candidateId: string;
  results: AssessmentResult[];
  progress: ProgressRecord[];
  sectionsTotal?: number;
}): ReadinessSnapshot {
  const { candidateId, results, progress } = opts;
  const sectionsTotal = opts.sectionsTotal ?? DEFAULT_SECTIONS_TOTAL;

  const supersededIds = new Set(
    results.map((r) => r.supersedes).filter((x): x is string => Boolean(x)),
  );
  const live = results.filter((r) => !supersededIds.has(r.id));
  const sorted = [...live].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const latest = sorted[sorted.length - 1];
  const latestWithNeeds = [...sorted]
    .reverse()
    .find((r) => r.by_client_need && Object.keys(r.by_client_need).length > 0);

  const items_completed = live.reduce((s, r) => s + (r.items_completed ?? 0), 0);
  const by_client_need = latestWithNeeds?.by_client_need;
  const focus_areas = by_client_need
    ? Object.entries(by_client_need)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
        .map(([k]) => k)
    : [];
  const sections_completed = progress.filter((p) => p.status === "completed").length;
  const band = bandFromReadiness(latest?.readiness);

  return {
    candidate_id: candidateId,
    band,
    route: routeFromReadiness(band),
    next_action: learnerNextAction(band, focus_areas),
    items_completed,
    assessments_taken: live.length,
    sections_completed,
    sections_total: sectionsTotal,
    focus_areas,
    updated_at: latest?.created_at ?? new Date().toISOString(),
    ...(latest?.readiness !== undefined && { readiness: latest.readiness }),
    ...(latest?.theta !== undefined && { theta: latest.theta }),
    ...(by_client_need && { by_client_need }),
  };
}
