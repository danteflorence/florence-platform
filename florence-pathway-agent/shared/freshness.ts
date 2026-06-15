// Regulatory-source freshness governance. A pathway system that automates
// regulated workflows can do real harm if its rules go stale. Every rule carries
// an owner, a last-verified date, a next-review date, a confidence level, and an
// active flag — so staleness is visible and accountable, not silent.
import type { WorkflowType } from './types'

export interface RuleFreshness {
  owner: string
  /** YYYY-MM-DD — when the rule was last checked against the official source. */
  lastVerified: string
  /** YYYY-MM-DD — when it must next be re-verified. */
  nextReview: string
  confidence: 'high' | 'medium' | 'low'
  active: boolean
  /** Sensitive workflow whose changes need legal review. */
  requiresCounsel?: boolean
}

export const RULE_FRESHNESS: Record<WorkflowType, RuleFreshness> = {
  cgfns_ces: { owner: 'Priya (credentials)', lastVerified: '2026-05-20', nextReview: '2026-08-20', confidence: 'high', active: true },
  sevis_i20: { owner: 'Diego (immigration)', lastVerified: '2026-05-28', nextReview: '2026-08-28', confidence: 'high', active: true, requiresCounsel: true },
  ds160: { owner: 'Diego (immigration)', lastVerified: '2026-05-28', nextReview: '2026-08-28', confidence: 'high', active: true, requiresCounsel: true },
  visa_appointment: { owner: 'Diego (immigration)', lastVerified: '2026-04-10', nextReview: '2026-05-25', confidence: 'medium', active: true, requiresCounsel: true },
  nclex_att: { owner: 'Stacy (licensure)', lastVerified: '2026-05-15', nextReview: '2026-08-15', confidence: 'high', active: true },
  florida_rn_exam: { owner: 'Stacy (licensure)', lastVerified: '2026-05-12', nextReview: '2026-08-12', confidence: 'high', active: true },
  newyork_rn_exam: { owner: 'Stacy (licensure)', lastVerified: '2026-05-18', nextReview: '2026-08-18', confidence: 'high', active: true },
  texas_rn_exam: { owner: 'Stacy (licensure)', lastVerified: '2026-03-30', nextReview: '2026-05-30', confidence: 'medium', active: true },
  california_rn_exam: { owner: 'Stacy (licensure)', lastVerified: '2026-05-10', nextReview: '2026-08-10', confidence: 'high', active: true },
  arizona_rn_exam: { owner: 'Stacy (licensure)', lastVerified: '2026-05-10', nextReview: '2026-08-10', confidence: 'high', active: true },
  rn_exam: { owner: 'Stacy (licensure)', lastVerified: '2026-05-20', nextReview: '2026-08-20', confidence: 'medium', active: true },
  endorsement: { owner: 'Stacy (licensure)', lastVerified: '2026-05-22', nextReview: '2026-08-22', confidence: 'medium', active: true },
  university_admission: { owner: 'Ops', lastVerified: '2026-05-01', nextReview: '2026-08-01', confidence: 'medium', active: true },
  financing_packet: { owner: 'Mei (capital)', lastVerified: '2026-05-25', nextReview: '2026-08-25', confidence: 'high', active: true, requiresCounsel: true },
  employer_packet: { owner: 'Ops', lastVerified: '2026-05-25', nextReview: '2026-08-25', confidence: 'medium', active: true },
}

export function getFreshness(type: WorkflowType): RuleFreshness {
  return RULE_FRESHNESS[type]
}

/** True when the next-review date has passed — the rule needs re-verification. */
export function isStale(f: RuleFreshness, today: Date): boolean {
  return new Date(f.nextReview).getTime() < today.getTime()
}
