// ============================================================================
// FlorenceRN ATS Connect — employer-ready packet builder
// ----------------------------------------------------------------------------
// Two invariants live here as CODE, not policy:
//   1. Consent gate — a packet cannot be built without a live employer-share
//      consent for this candidate↔employer. (Mirrors pathway-agent's canShare.)
//   2. Data minimization — national-origin / visa / underwriting signals are
//      WITHHELD from the employer packet by default. Pushing those into an
//      employer ATS pre-offer is a Title VII / IRCA exposure for the employer,
//      so they never leave FlorenceRN through this surface.
// ============================================================================
import type {
  ApplicationPacket, EmployerShareConsent, FlorenceCandidate, JobRequisition,
  PacketDocType, PacketDocument, ReadinessPassportSummary,
} from './types'

export class ConsentRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConsentRequiredError'
  }
}

const DEFAULT_DOCS: PacketDocType[] = ['resume', 'credential_summary', 'readiness_summary', 'video_profile']

// Each shareable document maps to a consent key; if the key isn't in the
// consent's allowedData, the doc is included but NOT share-approved.
const DOC_CONSENT_KEY: Record<PacketDocType, string> = {
  resume: 'resume',
  credential_summary: 'credential_summary',
  readiness_summary: 'readiness_summary',
  video_profile: 'video_profile',
  license: 'license_status',
  nclex_att: 'nclex_status',
  english_score: 'english_score',
  transcript: 'transcript',
  other: 'other',
}

const DOC_LABEL: Record<PacketDocType, string> = {
  resume: 'Résumé',
  credential_summary: 'Credential summary',
  readiness_summary: 'FlorenceRN readiness summary',
  video_profile: 'Video profile',
  license: 'License documentation',
  nclex_att: 'NCLEX / ATT status',
  english_score: 'English exam score',
  transcript: 'Transcript',
  other: 'Other',
}

export function credentialCompletenessPct(c: FlorenceCandidate): number {
  const nclex: Record<string, number> = {
    passed: 40, scheduled: 25, att_issued: 25, registered: 15,
    diagnostic: 8, unknown: 5, failed: 5, not_started: 0,
  }
  const license: Record<string, number> = {
    issued: 40, approved: 30, endorsement_in_progress: 20, submitted: 20,
    application_draft: 10, deficiency: 10, unknown: 5, not_started: 0,
  }
  const qa: Record<string, number> = { approved: 20, pending: 10, not_started: 5, blocked: 0 }
  return Math.min(100, (nclex[c.nclexStatus] ?? 5) + (license[c.licenseStatus] ?? 5) + (qa[c.humanQaStatus] ?? 5))
}

export function buildReadinessPassport(c: FlorenceCandidate, r?: JobRequisition): ReadinessPassportSummary {
  const stateTarget = r?.requiredLicenseState ?? c.targetStates[0]
  const parts = [
    `RN${c.yearsExperience ? `, ${c.yearsExperience} yrs` : ''}${c.specialtyExperience.length ? ` ${c.specialtyExperience.join(' / ')}` : ''} experience`,
    `NCLEX ${c.nclexStatus.replace(/_/g, ' ')}`,
    stateTarget ? `${stateTarget} RN license ${c.licenseStatus.replace(/_/g, ' ')}` : `license ${c.licenseStatus.replace(/_/g, ' ')}`,
    c.expectedStartWindow ? `available ${c.expectedStartWindow}` : null,
    `FlorenceRN readiness: ${c.readinessBand}`,
  ].filter(Boolean)
  return {
    candidateId: c.id,
    readinessBand: c.readinessBand,
    nclexStatus: c.nclexStatus,
    licenseStatus: c.licenseStatus,
    licenseStateTarget: stateTarget,
    specialtyExperience: c.specialtyExperience,
    yearsExperience: c.yearsExperience,
    expectedStartWindow: c.expectedStartWindow,
    credentialCompletenessPct: credentialCompletenessPct(c),
    humanQaStatus: c.humanQaStatus,
    shareableSummaryText: parts.join('. ') + '.',
  }
}

export interface BuildPacketArgs {
  candidate: FlorenceCandidate
  requisition: JobRequisition
  consent: EmployerShareConsent | null
  includeDocuments?: PacketDocType[]
  newId: () => string
  nowIso: () => string
}

/** Build an employer-ready packet. Throws ConsentRequiredError if there is no
 *  live (granted, not revoked) employer-share consent for this employer. */
export function buildPacket(args: BuildPacketArgs): ApplicationPacket {
  const { candidate: c, requisition: r, consent, includeDocuments, newId, nowIso } = args

  if (!consent || consent.revokedAt || consent.employerId !== r.employerId) {
    throw new ConsentRequiredError(
      `No live employer-share consent for candidate ${c.id} → employer ${r.employerId}. Capture consent before building a packet.`,
    )
  }

  const docTypes = includeDocuments?.length ? includeDocuments : DEFAULT_DOCS
  const documents: PacketDocument[] = docTypes.map((type) => ({
    id: newId(),
    type,
    label: DOC_LABEL[type],
    shareApproved: consent.allowedData.includes(DOC_CONSENT_KEY[type]),
  }))

  // Data minimization: only role-relevant, consent-covered fields are shared.
  const sharedFields: Record<string, string> = {
    readiness_band: c.readinessBand,
    nclex_status: c.nclexStatus,
    license_status: c.licenseStatus,
    license_state_target: r.requiredLicenseState ?? c.targetStates[0] ?? '—',
    specialty: c.specialtyExperience.join(', ') || '—',
    years_experience: c.yearsExperience != null ? String(c.yearsExperience) : '—',
    expected_start_window: c.expectedStartWindow ?? '—',
  }

  // Explicitly withheld — recorded so the audit trail shows WHAT we did not send
  // and WHY. These never enter an employer ATS through the packet.
  const withheldFields = [
    { field: 'nationality', reason: 'National-origin data withheld pre-offer (Title VII / IRCA)' },
    { field: 'country_of_education', reason: 'National-origin proxy withheld pre-offer' },
    { field: 'visa_pathway_status', reason: 'Immigration status withheld pre-offer (employer IRCA exposure)' },
    { field: 'financing_underwriting', reason: 'Florence Capital data is out of scope for employer sharing' },
  ]

  return {
    id: newId(),
    candidateId: c.id,
    jobRequisitionId: r.id,
    employerId: r.employerId,
    readinessPassport: buildReadinessPassport(c, r),
    documents,
    sharedFields,
    withheldFields,
    consentId: consent.id,
    humanQaStatus: 'pending',
    status: 'qa_pending',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
}
