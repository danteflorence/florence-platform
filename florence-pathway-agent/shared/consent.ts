// Consent-gated reuse of the canonical profile.
//
// "Collect once, reuse everywhere" is only safe if reuse is gated. Florence Capital
// and employers must NEVER see profile/Academy data unless the candidate has granted
// the relevant scope. This turns a policy promise into a data invariant: downstream
// packet generators call canShare() before reading anything.
import type { CandidateProfile, ConsentScope } from './types'

export interface ConsentScopeMeta {
  scope: ConsentScope
  label: string
  description: string
  /** Whether this scope is required for the core licensure/visa pathway to function. */
  core: boolean
}

export const CONSENT_SCOPES: ConsentScopeMeta[] = [
  {
    scope: 'visa',
    label: 'Visa & licensure preparation',
    description: 'Use your profile to prepare your I-20, DS-160, NCLEX, and state-board paperwork.',
    core: true,
  },
  {
    scope: 'education',
    label: 'Florence Academy',
    description: 'Share readiness data with Florence Academy for your NCLEX preparation.',
    core: false,
  },
  {
    scope: 'underwriting',
    label: 'Florence Capital (financing)',
    description: 'Share only the data needed to prepare a financing packet, under Florence Capital policy.',
    core: false,
  },
  {
    scope: 'employer',
    label: 'Employer matching',
    description: 'Share an employer-ready packet with prospective U.S. employers when you opt in.',
    core: false,
  },
  {
    scope: 'demand_radar',
    label: 'Job interest & matching',
    description: 'Let FlorenceRN record your interest in matched openings and route it to operations and approved partners.',
    core: false,
  },
]

type WithConsents = Pick<CandidateProfile, 'consents'>

/** The gate every cross-product packet generator must call before reading the profile. */
export function canShare(profile: WithConsents, scope: ConsentScope): boolean {
  return profile.consents?.[scope]?.granted === true
}

export interface ConsentState extends ConsentScopeMeta {
  granted: boolean
  grantedAt?: string
}

export function consentStates(profile: WithConsents): ConsentState[] {
  return CONSENT_SCOPES.map((m) => ({
    ...m,
    granted: canShare(profile, m.scope),
    grantedAt: profile.consents?.[m.scope]?.grantedAt,
  }))
}
