// Partner-facing projections (employer + university). CRITICAL: these views
// carry ONLY education readiness — never ARR, financing, deposits, or visa
// detail. They are the role-scoped face of the Readiness Passport.

import type { Candidate, ReadinessBand, ReadinessSnapshot, RouteClass } from "./types.ts";

// ── Employer: interview packet ────────────────────────────────────────────────
export interface InterviewPacket {
  candidate_id: string;
  full_name: string;
  country?: string;
  band: ReadinessBand;
  route: RouteClass;
  readiness?: number;
  /** Strongest client-need areas (highest scores). */
  strengths: string[];
  /** Weakest client-need areas (the gaps). */
  focus_areas: string[];
  sections_completed: number;
  sections_total: number;
}

export function buildInterviewPacket(candidate: Candidate, snapshot: ReadinessSnapshot): InterviewPacket {
  const byNeed = snapshot.by_client_need ?? {};
  const strengths = Object.entries(byNeed)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);
  return {
    candidate_id: candidate.id,
    full_name: candidate.full_name,
    band: snapshot.band,
    route: snapshot.route,
    strengths,
    focus_areas: snapshot.focus_areas,
    sections_completed: snapshot.sections_completed,
    sections_total: snapshot.sections_total,
    ...(candidate.country && { country: candidate.country }),
    ...(snapshot.readiness !== undefined && { readiness: snapshot.readiness }),
  };
}

/** A candidate is interview-ready (employer-visible) at green/yellow readiness. */
export function isReadinessCleared(snapshot: ReadinessSnapshot): boolean {
  return snapshot.band === "green" || snapshot.band === "yellow";
}

// ── University: program overview ──────────────────────────────────────────────
export interface UniversityOverview {
  candidates: number;
  assessed: number;
  band_counts: Record<ReadinessBand, number>;
  avg_readiness: number | null;
  top_gaps: { client_need: string; mean_score: number }[];
  avg_sections_completed: number;
  sections_total: number;
  funnel: { registered: number; assessed: number; readiness_cleared: number };
}

export function computeUniversityOverview(snapshots: ReadinessSnapshot[]): UniversityOverview {
  const band_counts: Record<ReadinessBand, number> = { none: 0, red: 0, orange: 0, yellow: 0, green: 0 };
  const needTotals = new Map<string, { sum: number; n: number }>();
  let readinessSum = 0;
  let assessed = 0;
  let cleared = 0;
  let sectionsSum = 0;
  let sectionsTotal = 20;

  for (const s of snapshots) {
    band_counts[s.band] += 1;
    if (s.readiness != null) {
      readinessSum += s.readiness;
      assessed += 1;
    }
    if (isReadinessCleared(s)) cleared += 1;
    sectionsSum += s.sections_completed;
    sectionsTotal = s.sections_total;
    if (s.by_client_need) {
      for (const [need, score] of Object.entries(s.by_client_need)) {
        const t = needTotals.get(need) ?? { sum: 0, n: 0 };
        t.sum += score;
        t.n += 1;
        needTotals.set(need, t);
      }
    }
  }

  const top_gaps = [...needTotals.entries()]
    .map(([client_need, t]) => ({ client_need, mean_score: Math.round((t.sum / t.n) * 1000) / 1000 }))
    .sort((a, b) => a.mean_score - b.mean_score)
    .slice(0, 3);

  return {
    candidates: snapshots.length,
    assessed,
    band_counts,
    avg_readiness: assessed > 0 ? Math.round((readinessSum / assessed) * 1000) / 1000 : null,
    top_gaps,
    avg_sections_completed: snapshots.length > 0 ? Math.round((sectionsSum / snapshots.length) * 10) / 10 : 0,
    sections_total: sectionsTotal,
    funnel: { registered: snapshots.length, assessed, readiness_cleared: cleared },
  };
}
