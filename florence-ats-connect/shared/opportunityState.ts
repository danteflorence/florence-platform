// Opportunity STATE — how "reachable" a job is through FlorenceRN, which drives the
// candidate CTA. Conservative by design: "apply with FlorenceRN packet" is offered
// ONLY when an authorized relationship exists (direct partner or a live ATS connection).
// Everything else is "express interest" — we never imply an employer partnership that
// doesn't exist, and never submit into an ATS without authorization.
import type { FlorenceRNJob } from './demand-types'

export type OpportunityState = 'public' | 'amn_channel' | 'vms_channel' | 'direct_partner' | 'ats_connected'
export type OpportunityCta = 'express_interest' | 'apply_with_packet'

// Minimal shapes so this is usable from both server and client without importing the
// full EmployerAccount / DemandSource (which carry server-only concerns).
export interface OppEmployerHint {
  integrationStatus?: string // ATS integration: 'active' = live connection; 'not_started' = cold prospect
  sourceChannel?: string // 'direct' | 'amn' | 'other'
}
export interface OppSourceHint {
  channelOwner?: string // 'AMN account' vs 'direct-target'
}

const STATE_LABEL: Record<OpportunityState, string> = {
  public: 'Publicly posted',
  amn_channel: 'AMN channel',
  vms_channel: 'VMS / MSP channel',
  direct_partner: 'FlorenceRN partner',
  ats_connected: 'ATS-connected partner',
}

export function opportunityStateLabel(s: OpportunityState): string {
  return STATE_LABEL[s]
}

/** Derive the opportunity state from the employer relationship + the discovering source.
 *  `job` is accepted for forward-compatibility (per-job overrides) but the relationship
 *  is the load-bearing signal today. */
export function opportunityStateFor(_job: Pick<FlorenceRNJob, 'employerId'>, employer?: OppEmployerHint, source?: OppSourceHint): OpportunityState {
  const integ = employer?.integrationStatus
  const channel = employer?.sourceChannel
  const ownerIsAmn = /amn/i.test(source?.channelOwner ?? '') || channel === 'amn'

  // A live ATS connection is the strongest, most-authorized state.
  if (integ === 'active') return 'ats_connected'
  // An engaged DIRECT relationship (anything past a cold 'not_started' prospect) → partner.
  if (channel === 'direct' && integ != null && integ !== 'not_started' && integ !== 'error') return 'direct_partner'
  // Reached/representable through an AMN channel relationship.
  if (ownerIsAmn) return 'amn_channel'
  // Otherwise it's just a publicly posted role we surfaced.
  return 'public'
}

/** Apply (with a FlorenceRN packet) ONLY when authorized; everything else is express interest. */
export function ctaForState(state: OpportunityState): OpportunityCta {
  return state === 'direct_partner' || state === 'ats_connected' ? 'apply_with_packet' : 'express_interest'
}

/** Candidate-context CTA: "apply with FlorenceRN packet" appears ONLY when BOTH the
 *  opportunity allows apply (authorized employer/channel) AND the candidate has cleared
 *  the Application Gate (consent + visa + license). Otherwise it's express-interest —
 *  even on a direct-partner job. Use this anywhere a specific candidate is known. */
export function effectiveCta(state: OpportunityState, gateOk: boolean): OpportunityCta {
  return ctaForState(state) === 'apply_with_packet' && gateOk ? 'apply_with_packet' : 'express_interest'
}
