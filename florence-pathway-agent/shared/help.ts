import type { OfficialResource } from './types'

// Where candidates go for legitimate help. Surfaced on every candidate view as
// the anti-fraud / anti-"notario" safeguard: Florence prepares and checks drafts,
// but legal advice must come from a licensed attorney or a DOJ-accredited rep.
// Sourced from USCIS's own "Find Legal Services" / "Avoid Scams" guidance.
export const LEGAL_HELP: OfficialResource[] = [
  {
    label: 'USCIS — Find Legal Services',
    url: 'https://www.uscis.gov/scams-fraud-and-misconduct/avoid-scams/find-legal-services',
    note: 'How to find an attorney or a DOJ-accredited representative.',
  },
  {
    label: 'USCIS — Avoid Scams (notario fraud)',
    url: 'https://www.uscis.gov/scams-fraud-and-misconduct/avoid-scams/common-scams',
    note: 'In the U.S. a “notario” is NOT a lawyer and cannot give immigration legal advice.',
  },
  {
    label: 'DOJ EOIR — Recognized orgs & accredited reps',
    url: 'https://www.justice.gov/eoir/recognition-and-accreditation-program',
  },
  {
    label: 'AILA — Find an immigration lawyer',
    url: 'https://www.ailalawyer.com/',
  },
]

export const DISCLAIMER =
  'Florence Pathway Agent prepares and quality-checks your drafts and explains each step. It is not a law firm and does not provide legal advice. Always verify on the official site, and for legal questions use a licensed attorney or a DOJ-accredited representative — never a “notario.”'
