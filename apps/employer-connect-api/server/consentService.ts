// Central consent checks for employer-facing sharing. Routes and gate services
// should call this instead of reading candidate.employerShareConsent directly.
import { store } from './db'
import type { EmployerShareConsent } from '../shared/types'

export type ConsentFailureCode = 'employer_share_consent'

export interface EmployerConsentCheck {
  ok: boolean
  consent: EmployerShareConsent | null
  code?: ConsentFailureCode
  reason?: string
}

export interface EmployerConsentInput {
  candidateId: string
  employerId: string
  jobRequisitionId?: string
  programId?: string
  purpose?: string
}

const REQUIRED_DEFAULT_FIELDS = ['resume', 'credential_summary', 'readiness_summary']

export async function checkEmployerShareConsent(input: EmployerConsentInput): Promise<EmployerConsentCheck> {
  const liveConsents = (await store.consents.byCandidate(input.candidateId))
    .filter((consent) => consent.employerId === input.employerId && !consent.revokedAt)
  if (!liveConsents.length) {
    return { ok: false, consent: null, code: 'employer_share_consent', reason: 'No live employer-share consent for this employer.' }
  }
  const scopedConsents = liveConsents.filter((consent) => {
    if (input.programId) {
      if (consent.programId !== input.programId) return false
    } else if (consent.programId) return false
    if (consent.jobRequisitionId && input.jobRequisitionId && consent.jobRequisitionId !== input.jobRequisitionId) return false
    if (consent.jobRequisitionId && !input.jobRequisitionId) return false
    if (input.purpose && consent.purpose && consent.purpose !== input.purpose) return false
    return true
  })
  if (!scopedConsents.length) {
    return {
      ok: false,
      consent: liveConsents[0] ?? null,
      code: 'employer_share_consent',
      reason: input.programId ? 'No live employer-share consent for this employer program.' : 'No live employer-share consent for this workflow scope.',
    }
  }
  const consent = scopedConsents.find((candidateConsent) => {
    const allowed = new Set(candidateConsent.allowedData)
    return REQUIRED_DEFAULT_FIELDS.every((field) => allowed.has(field))
  })
  if (!consent) {
    return { ok: false, consent: scopedConsents[0] ?? null, code: 'employer_share_consent', reason: 'Consent does not cover the required employer-safe packet fields.' }
  }
  return { ok: true, consent }
}

export async function requireEmployerShareConsent(input: EmployerConsentInput): Promise<EmployerShareConsent | null> {
  const check = await checkEmployerShareConsent(input)
  return check.ok ? check.consent : null
}
