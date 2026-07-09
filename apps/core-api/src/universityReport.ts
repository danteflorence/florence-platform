// University affiliate report — k-ANONYMIZED cohort outcomes (by licensure state) for a
// university partner. Cells with fewer than `minCell` nurses are SUPPRESSED (counts +
// rates null) so no individual is re-identifiable. Zero PII — no nurseId/name/email.
// Pure; the caller folds bundles + audits the read.

import { foldPassport } from "./passport.ts";
import { canonicalStage, canonicalRank } from "./ledgerStages.ts";
import type { Nurse, NurseEvent, NurseRef } from "./store.ts";

export interface UniversityCohortRow {
  cohort: string; // e.g. licensure state
  n: number | null; // suppressed (null) when < minCell
  licensedPct: number | null;
  startedPct: number | null;
  suppressed: boolean;
}

export interface UniversityReport {
  minCell: number;
  cohorts: UniversityCohortRow[];
  suppressedCells: number;
  generatedAt: string;
}

const LICENSED_RANK = canonicalRank("licensed_rn");
const STARTED_RANK = canonicalRank("started");

export function universityCohorts(
  bundles: { nurse: Nurse; refs: NurseRef[]; events: NurseEvent[] }[],
  opts: { minCell?: number; now: string },
): UniversityReport {
  const minCell = opts.minCell ?? 5;
  const byCohort = new Map<string, { n: number; licensed: number; started: number }>();
  for (const b of bundles) {
    const p = foldPassport(b.nurse, b.refs, b.events);
    const cohort = p.licensure.state ?? "unknown";
    const rank = canonicalRank(canonicalStage(p));
    const c = byCohort.get(cohort) ?? { n: 0, licensed: 0, started: 0 };
    c.n += 1;
    if (rank >= LICENSED_RANK) c.licensed += 1;
    if (rank >= STARTED_RANK) c.started += 1;
    byCohort.set(cohort, c);
  }
  let suppressedCells = 0;
  const cohorts: UniversityCohortRow[] = [...byCohort.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([cohort, c]) => {
      if (c.n < minCell) {
        suppressedCells += 1;
        return { cohort, n: null, licensedPct: null, startedPct: null, suppressed: true };
      }
      return { cohort, n: c.n, licensedPct: Math.round((c.licensed / c.n) * 100), startedPct: Math.round((c.started / c.n) * 100), suppressed: false };
    });
  return { minCell, cohorts, suppressedCells, generatedAt: opts.now };
}
