// University-affiliate routing helpers — attribute a placement/start to its demand
// SOURCE (university-brokered vs employer-direct vs internal) for revenue-by-source.
// Pure, dependency-free, no enums.

import type { Passport } from "./passport.ts";

export type DemandSource = "university" | "employer" | "internal";

export const VALID_UNIVERSITY_EVENTS = ["university.job_matched", "university.job_offered", "university.job_started"] as const;
export type UniversityEvent = (typeof VALID_UNIVERSITY_EVENTS)[number];
export function isUniversityEvent(t: string): t is UniversityEvent {
  return (VALID_UNIVERSITY_EVENTS as readonly string[]).includes(t);
}

/** Where did this nurse's placement come from? university-brokered (marked on the
 *  placement facet) → 'university'; any other placement → 'employer'; none → 'internal'. */
export function demandSourceForPassport(p: Passport): DemandSource {
  if (p.placement.demandSource === "university") return "university";
  if (p.placement.stage || p.placement.employerId) return "employer";
  return "internal";
}
