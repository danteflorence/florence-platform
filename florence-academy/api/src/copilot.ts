// Instructor Copilot — deterministic cohort analytics that help faculty run the
// production line: who's falling behind, what to reteach, how to group, and the
// Day-5 routing draft. AI doesn't make the calls here; it surfaces the evidence
// (an LLM narrative layer can be added later behind a model key). Faculty review.

import type { ReadinessBand, ReadinessSnapshot, RouteClass } from "./types.ts";

export interface CopilotMember {
  candidate_id: string;
  full_name?: string;
  snapshot: ReadinessSnapshot;
}

export interface CopilotFaller {
  candidate_id: string;
  full_name?: string;
  band: ReadinessBand;
  readiness?: number;
}
export interface CopilotReteach {
  client_need: string;
  mean_score: number;
}
export interface CopilotGroup {
  client_need: string;
  candidate_ids: string[];
}

export interface CohortCopilot {
  cohort: string;
  candidates: number;
  band_counts: Record<ReadinessBand, number>;
  avg_readiness: number | null;
  /** Lowest-readiness / unassessed candidates, weakest first. */
  fallers: CopilotFaller[];
  /** Weakest client-need areas across the cohort — what to reteach tomorrow. */
  top_reteach: CopilotReteach[];
  /** Candidates grouped by their single weakest client need. */
  groups: CopilotGroup[];
  /** Day-5 routing draft: candidate ids bucketed by readiness route. */
  routing: Record<RouteClass, string[]>;
  generated_at: string;
}

function emptyRouting(): Record<RouteClass, string[]> {
  return {
    interview_ready: [],
    repeat: [],
    bridge: [],
    credential_repair: [],
    in_progress: [],
  };
}

export function computeCohortCopilot(cohort: string, members: CopilotMember[]): CohortCopilot {
  const band_counts: Record<ReadinessBand, number> = { none: 0, red: 0, orange: 0, yellow: 0, green: 0 };
  const routing = emptyRouting();
  const needTotals = new Map<string, { sum: number; n: number }>();
  const groups = new Map<string, string[]>();
  const fallers: CopilotFaller[] = [];
  let readinessSum = 0;
  let assessed = 0;

  for (const m of members) {
    const snap = m.snapshot;
    band_counts[snap.band] += 1;
    routing[snap.route].push(m.candidate_id);
    if (snap.readiness != null) {
      readinessSum += snap.readiness;
      assessed += 1;
    }
    if (snap.band === "none" || snap.band === "red" || snap.band === "orange") {
      fallers.push({
        candidate_id: m.candidate_id,
        band: snap.band,
        ...(m.full_name && { full_name: m.full_name }),
        ...(snap.readiness != null && { readiness: snap.readiness }),
      });
    }
    if (snap.by_client_need) {
      for (const [need, score] of Object.entries(snap.by_client_need)) {
        const t = needTotals.get(need) ?? { sum: 0, n: 0 };
        t.sum += score;
        t.n += 1;
        needTotals.set(need, t);
      }
    }
    const weakest = snap.focus_areas[0];
    if (weakest) {
      const g = groups.get(weakest) ?? [];
      g.push(m.candidate_id);
      groups.set(weakest, g);
    }
  }

  // Unassessed (readiness undefined) sort to the front, then ascending readiness.
  fallers.sort((a, b) => (a.readiness ?? -1) - (b.readiness ?? -1));

  const top_reteach = [...needTotals.entries()]
    .map(([client_need, t]) => ({ client_need, mean_score: Math.round((t.sum / t.n) * 1000) / 1000 }))
    .sort((a, b) => a.mean_score - b.mean_score)
    .slice(0, 3);

  const groupArr = [...groups.entries()]
    .map(([client_need, candidate_ids]) => ({ client_need, candidate_ids }))
    .sort((a, b) => b.candidate_ids.length - a.candidate_ids.length);

  return {
    cohort,
    candidates: members.length,
    band_counts,
    avg_readiness: assessed > 0 ? Math.round((readinessSum / assessed) * 1000) / 1000 : null,
    fallers,
    top_reteach,
    groups: groupArr,
    routing,
    generated_at: new Date().toISOString(),
  };
}
