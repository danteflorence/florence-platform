// Proprietary cohort pass-rate data asset (Initiative 8). NCSBN publishes a single
// "internationally-educated" first-time pass rate; it does NOT break out Nigeria,
// Ghana, India, Philippines, or Kenya separately. FlorenceRN's longitudinal data
// can — by corridor — which feeds sales ("our PH cohort passes at X vs the Y
// national baseline"), recruiting, and the remediation model.
//
// Two outputs: an INTERNAL view (all corridors, raw) and a k-ANONYMIZED published
// report (small cells suppressed so no individual is re-identifiable). Pure; the
// route layer adds auth + an audit row on every publish.

export interface CohortCandidate {
  id: string;
  country?: string;
}
export interface CohortOutcome {
  candidate_id: string;
  kind: string; // we only read 'nclex_result'
  status?: string; // 'pass' | 'fail'
  occurred_at: string;
}
export interface CohortAssessment {
  candidate_id: string;
  readiness?: number; // pass probability 0..1
  created_at: string;
}

export interface CorridorStat {
  corridor: string;
  sits: number;
  firstTimePass: number;
  /** First-time pass rate (0..1), or null when suppressed for k-anonymity. */
  passRate: number | null;
  /** Of those who sat, how many were above the readiness gate at sit time. */
  aboveGateAtSit: number;
  /** Published national IEN baseline for this corridor, when known (reference). */
  nationalBaseline?: number;
  /** True when the cell was suppressed (fewer than minCell sits). */
  suppressed: boolean;
}

// Corridor mapping (accepts ISO-2 or common country names, case-insensitive).
const CORRIDOR: Record<string, string> = {
  ph: "Philippines", philippines: "Philippines",
  in: "India", india: "India",
  ng: "Nigeria", nigeria: "Nigeria",
  gh: "Ghana", ghana: "Ghana",
  ke: "Kenya", kenya: "Kenya",
};
// Published national IEN first-time NCLEX-RN baselines (reference figures; verify
// against the latest NCSBN / corridor sources before external use).
const BASELINE: Record<string, number> = {
  Philippines: 0.52,
  India: 0.405,
  Kenya: 0.691,
};

export function corridorOf(country?: string): string {
  if (!country) return "Other";
  return CORRIDOR[country.trim().toLowerCase()] ?? "Other";
}

export interface CohortInput {
  candidates: CohortCandidate[];
  outcomes: CohortOutcome[];
  assessments: CohortAssessment[];
  /** Minimum sits per corridor before a rate is published. */
  minCell?: number;
  /** Readiness-gate threshold used for the "above gate at sit" signal. */
  gateMin?: number;
}

export function cohortPassRates(input: CohortInput): CorridorStat[] {
  const minCell = input.minCell ?? 5;
  const gateMin = input.gateMin ?? 0.8;

  const countryById = new Map(input.candidates.map((c) => [c.id, c.country]));

  // First NCLEX result per candidate (the first-time attempt).
  const firstSit = new Map<string, CohortOutcome>();
  for (const o of input.outcomes) {
    if (o.kind !== "nclex_result") continue;
    const prev = firstSit.get(o.candidate_id);
    if (!prev || o.occurred_at < prev.occurred_at) firstSit.set(o.candidate_id, o);
  }

  // Latest readiness per candidate (proxy for "ready at sit time").
  const latestReadiness = new Map<string, number>();
  const latestReadinessAt = new Map<string, string>();
  for (const a of input.assessments) {
    if (a.readiness == null) continue;
    const prevAt = latestReadinessAt.get(a.candidate_id);
    if (!prevAt || a.created_at > prevAt) {
      latestReadinessAt.set(a.candidate_id, a.created_at);
      latestReadiness.set(a.candidate_id, a.readiness);
    }
  }

  const byCorridor = new Map<string, { sits: number; pass: number; aboveGate: number }>();
  for (const [cid, sit] of firstSit) {
    const corridor = corridorOf(countryById.get(cid));
    const agg = byCorridor.get(corridor) ?? { sits: 0, pass: 0, aboveGate: 0 };
    agg.sits += 1;
    if (sit.status === "pass") agg.pass += 1;
    if ((latestReadiness.get(cid) ?? 0) >= gateMin) agg.aboveGate += 1;
    byCorridor.set(corridor, agg);
  }

  return [...byCorridor.entries()]
    .map(([corridor, a]): CorridorStat => {
      const suppressed = a.sits < minCell;
      return {
        corridor,
        sits: a.sits,
        firstTimePass: a.pass,
        passRate: suppressed ? null : a.pass / a.sits,
        aboveGateAtSit: a.aboveGate,
        ...(BASELINE[corridor] !== undefined ? { nationalBaseline: BASELINE[corridor] } : {}),
        suppressed,
      };
    })
    .sort((x, y) => y.sits - x.sits);
}

export interface PublishedReport {
  generated_for: string;
  corridors: CorridorStat[];
  note: string;
}

/** k-anonymized, externally-shareable report: drop suppressed cells entirely. */
export function publishedReport(stats: CorridorStat[], opts: { stampIso: string }): PublishedReport {
  return {
    generated_for: opts.stampIso,
    corridors: stats.filter((s) => !s.suppressed),
    note: "First-time NCLEX-RN pass rate by corridor. Cells with fewer than the minimum cohort size are suppressed for privacy. National baselines are published reference figures.",
  };
}
