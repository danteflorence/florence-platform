// ───────────────────────────────────────────────────────────────────────────
// NCLEX review plan - maps virtual-patient scenarios onto the NCLEX-RN test
// plan and lays out a "sim of the day" schedule for a review block.
//
// Every scenario already carries a `clientNeed` (one of the 8 NCLEX-RN
// sub-categories) and an NCJMM-typed rubric, so this module needs no new tagging
// - it groups the existing library by NCLEX section, weights the daily schedule
// by the real NCLEX-RN test-plan proportions (blueprint.ts CLIENT_NEEDS), and
// picks an exemplar per section. Grading is the CJMM scorecard (score.ts
// cjmmScorecard) plus the weighted-critical-element rubric each scenario carries.
// ───────────────────────────────────────────────────────────────────────────

import type { ClientNeed } from "../../types/question";
import type { VPatientScenario } from "../../data/vpatient/types";
import { CLIENT_NEEDS } from "../../data/blueprint";

export interface NclexSection {
  clientNeed: ClientNeed;
  label: string; //     "Physiological Adaptation"
  group: string; //     "Physiological Integrity" (the 4 major NCLEX categories)
  /** NCLEX-RN test-plan target proportion (from the blueprint). */
  target: number;
  scenarioIds: string[];
  /** A representative scenario for the section (first approved, else first). */
  exemplarId?: string;
}

/** Group a scenario library by NCLEX section, ordered by test-plan weight
 *  (heaviest sections first), each with an exemplar. */
export function groupByNclexSection(scenarios: VPatientScenario[]): NclexSection[] {
  const byNeed = new Map<ClientNeed, VPatientScenario[]>();
  for (const sc of scenarios) {
    const list = byNeed.get(sc.clientNeed) ?? [];
    list.push(sc);
    byNeed.set(sc.clientNeed, list);
  }
  const sections: NclexSection[] = [];
  for (const spec of CLIENT_NEEDS) {
    const list = byNeed.get(spec.key) ?? [];
    const exemplar = list.find((s) => s.status === "approved") ?? list[0];
    sections.push({
      clientNeed: spec.key,
      label: spec.label,
      group: spec.group,
      target: spec.target,
      scenarioIds: list.map((s) => s.id),
      ...(exemplar ? { exemplarId: exemplar.id } : {}),
    });
  }
  // Heaviest test-plan weight first (where the exam - and the review - leans).
  return sections.sort((a, b) => b.target - a.target);
}

export interface ReviewDay {
  day: number; //           1-indexed review day
  clientNeed: ClientNeed;
  sectionLabel: string;
  group: string;
  /** The scenario assigned as that day's sim (undefined if the section is empty). */
  simOfTheDayId?: string;
  simTitle?: string;
}

/**
 * Lay out an N-day review block. Days are allotted to sections in proportion to
 * the NCLEX-RN test-plan weights (largest-remainder apportionment), so a block
 * spends more days on Physiological Integrity than on Psychosocial - matching
 * where the exam's weight actually is. Within a section, scenarios rotate so a
 * section with several sims spreads them across its days.
 *
 * Deterministic: same library + same day count ⇒ same plan.
 */
export function buildReviewPlan(scenarios: VPatientScenario[], days: number): ReviewDay[] {
  if (days <= 0) return [];
  const sections = groupByNclexSection(scenarios).filter((s) => s.scenarioIds.length > 0);
  if (sections.length === 0) return [];

  // Apportion `days` across sections by target weight (largest remainder).
  const totalTarget = sections.reduce((sum, s) => sum + s.target, 0);
  const raw = sections.map((s) => ({ s, exact: (s.target / totalTarget) * days }));
  const alloc = raw.map((r) => ({ s: r.s, n: Math.floor(r.exact), frac: r.exact - Math.floor(r.exact) }));
  let assigned = alloc.reduce((sum, a) => sum + a.n, 0);
  // Hand out the remaining days to the largest fractional remainders; ensure a
  // non-empty section gets at least a shot before any section doubles up.
  const byFrac = [...alloc].sort((a, b) => b.frac - a.frac);
  let i = 0;
  while (assigned < days) {
    byFrac[i % byFrac.length].n += 1;
    assigned++;
    i++;
  }

  const plan: ReviewDay[] = [];
  const rotation = new Map<ClientNeed, number>();
  for (const a of alloc) {
    for (let k = 0; k < a.n; k++) {
      const ids = a.s.scenarioIds;
      const idx = rotation.get(a.s.clientNeed) ?? 0;
      const simId = ids[idx % ids.length];
      rotation.set(a.s.clientNeed, idx + 1);
      const sim = scenarios.find((sc) => sc.id === simId);
      plan.push({
        day: 0, // filled after ordering
        clientNeed: a.s.clientNeed,
        sectionLabel: a.s.label,
        group: a.s.group,
        ...(simId ? { simOfTheDayId: simId } : {}),
        ...(sim ? { simTitle: sim.title } : {}),
      });
    }
  }
  // Order the block heaviest-section-first (groupByNclexSection order) and number.
  return plan.map((d, idx) => ({ ...d, day: idx + 1 }));
}
