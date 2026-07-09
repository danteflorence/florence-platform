import type { CandidateDossier, EvidenceSourceType } from '../../shared/types'

// Data Extraction Agent
// ---------------------
// In production this reads passports, transcripts, licenses, I-20s and offer
// letters and outputs structured fields with confidence + source citations.
// Here the documents arrive pre-extracted; this agent assembles the normalized
// "facts" the mapping and consistency agents consume — in particular EVERY name
// spelling seen across every source, which is the input to name-match QA.

export interface NameObservation {
  source: string
  sourceType: EvidenceSourceType
  name: string
  /** Critical sources must match exactly for exams / appointments / the visa. */
  critical: boolean
}

export interface ExtractedFacts {
  profileFullName: string
  names: NameObservation[]
  dobs: { source: string; dob: string }[]
  passport?: { number?: string; expiry?: string; issuing?: string; name: string }
}

export function extractFacts(d: CandidateDossier): ExtractedFacts {
  const profileFullName = [d.profile.legalFirstName, d.profile.legalMiddleName, d.profile.legalLastName]
    .filter(Boolean)
    .join(' ')

  const names: NameObservation[] = [
    { source: 'Profile (legal name)', sourceType: 'candidate_input', name: profileFullName, critical: false },
  ]

  for (const doc of d.identityDocuments) {
    names.push({
      source: doc.kind === 'passport' ? 'Passport' : doc.kind === 'national_id' ? 'National ID' : 'Birth certificate',
      sourceType: doc.kind === 'national_id' ? 'national_id' : 'passport_scan',
      name: doc.nameOnDocument,
      critical: doc.kind === 'passport' || doc.kind === 'national_id',
    })
  }
  for (const e of d.education) if (e.nameOnRecord) names.push({ source: `Transcript (${e.school})`, sourceType: 'transcript', name: e.nameOnRecord, critical: false })
  for (const l of d.licenses) if (l.nameOnLicense) names.push({ source: `License (${l.jurisdiction})`, sourceType: 'license_doc', name: l.nameOnLicense, critical: true })
  for (const s of d.schoolPrograms) if (s.nameOnI20) names.push({ source: `I-20 (${s.schoolName})`, sourceType: 'i20', name: s.nameOnI20, critical: false })
  for (const x of d.englishExams) if (x.nameOnReport) names.push({ source: `${x.exam} score report`, sourceType: 'english_score', name: x.nameOnReport, critical: false })
  for (const n of d.nclex) if (n.nameOnPearson) names.push({ source: `Pearson / NCLEX (${n.nrb})`, sourceType: 'derived', name: n.nameOnPearson, critical: true })

  const dobs: { source: string; dob: string }[] = [{ source: 'Profile', dob: d.profile.dateOfBirth }]
  for (const doc of d.identityDocuments) if (doc.dateOfBirth) dobs.push({ source: doc.kind, dob: doc.dateOfBirth })

  const passportDoc = d.identityDocuments.find((x) => x.kind === 'passport')
  const passport = passportDoc
    ? { number: passportDoc.documentNumber, expiry: passportDoc.expirationDate, issuing: passportDoc.issuingAuthority, name: passportDoc.nameOnDocument }
    : undefined

  return { profileFullName, names, dobs, passport }
}
