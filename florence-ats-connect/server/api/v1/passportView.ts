// Local permissioned Passport views for the Platform API. Mirrors Core's
// passportView redaction so the /v1 layer works mock-by-default (Core off). The
// employer view NEVER exposes visa / nationality / financing (Title VII / IRCA) —
// the same invariant the employer packet + Core enforce.
import type { FlorenceCandidate } from '../../../shared/types'

export type PassportAudience = 'internal' | 'employer' | 'candidate'

export interface PassportView {
  view: PassportAudience
  nurseId: string
  passport: Record<string, unknown>
  withheld: { field: string; reason: string }[]
}

const EMPLOYER_WITHHELD = [
  { field: 'visaStatus', reason: 'Immigration / visa status withheld pre-offer (employer IRCA exposure)' },
  { field: 'nationality', reason: 'National-origin data withheld pre-offer (Title VII / IRCA)' },
  { field: 'countryOfEducation', reason: 'National-origin proxy withheld pre-offer' },
  { field: 'currentCountry', reason: 'National-origin proxy withheld pre-offer' },
  { field: 'financing', reason: 'Florence Capital data is out of scope for employer sharing' },
]

/** Project a candidate to an audience-safe passport view. */
export function passportView(c: FlorenceCandidate, audience: PassportAudience): PassportView {
  const base = {
    nurseId: c.id,
    name: c.fullName,
    readinessBand: c.readinessBand,
    nclexStatus: c.nclexStatus,
    licenseStatus: c.licenseStatus,
    specialtyExperience: c.specialtyExperience,
    yearsExperience: c.yearsExperience,
    targetStates: c.targetStates,
    expectedStartWindow: c.expectedStartWindow,
  }
  if (audience === 'employer') {
    // Licensed-RN packet view ONLY — no visa/nationality/financing, no contact PII.
    return { view: 'employer', nurseId: c.id, passport: base, withheld: EMPLOYER_WITHHELD }
  }
  if (audience === 'candidate') {
    // The nurse's own view — their statuses + contact, no internal QA notes.
    return {
      view: 'candidate', nurseId: c.id,
      passport: { ...base, email: c.email, phone: c.phone, visaStatus: c.visaStatus ?? 'unknown', employerShareConsent: c.employerShareConsent },
      withheld: [],
    }
  }
  // internal_ops — the full internal record.
  return {
    view: 'internal', nurseId: c.id,
    passport: { ...base, email: c.email, phone: c.phone, nationality: c.nationality, countryOfEducation: c.countryOfEducation, currentCountry: c.currentCountry, arrivalStatus: c.arrivalStatus, visaStatus: c.visaStatus ?? 'unknown', employerShareConsent: c.employerShareConsent, humanQaStatus: c.humanQaStatus },
    withheld: [],
  }
}
