// ============================================================================
// Florence Pathway Agent — canonical domain model
// ----------------------------------------------------------------------------
// This is the single source of truth shared by the API server and the three
// front-end surfaces. Every government-form answer the system produces is
// linked back to evidence and carries a provenance + confidence + review state,
// because auditability is the whole product.
// ============================================================================

// ---------------------------------------------------------------------------
// Provenance & confidence
// ---------------------------------------------------------------------------

/** Where a field value came from / what state it is in. */
export type FieldStatus =
  | 'user_entered'
  | 'document_extracted'
  | 'human_verified'
  | 'expired'
  | 'missing'
  | 'inconsistent'
  | 'legally_sensitive'

export type Confidence = 'high' | 'medium' | 'low' | 'unknown'

export type EvidenceSourceType =
  | 'passport_scan'
  | 'national_id'
  | 'transcript'
  | 'license_doc'
  | 'i20'
  | 'offer_letter'
  | 'prior_visa'
  | 'english_score'
  | 'cgfns_doc'
  | 'candidate_input'
  | 'derived'

export interface EvidenceRef {
  sourceType: EvidenceSourceType
  /** Human-readable provenance, e.g. "MRZ extraction" or "candidate confirmed". */
  detail: string
  documentId?: string
}

// ---------------------------------------------------------------------------
// Workflow taxonomy
// ---------------------------------------------------------------------------

/**
 * The pathway workflows for the F-1 (student visa, applied from abroad) journey
 * plus the nursing licensure track: the F-1 front-end (ds160, visa_appointment),
 * the state licensure boards (FL/NY/TX/CA/AZ + endorsement), NCLEX/ATT, and the
 * CGFNS credentials evaluation. No immigrant/work-visa back-end.
 */
export type WorkflowType =
  | 'sevis_i20'
  | 'ds160'
  | 'visa_appointment'
  | 'nclex_att'
  | 'florida_rn_exam'
  | 'newyork_rn_exam'
  | 'texas_rn_exam'
  | 'california_rn_exam'
  | 'arizona_rn_exam'
  | 'rn_exam'
  | 'endorsement'
  | 'cgfns_ces'
  | 'university_admission'
  | 'financing_packet'
  | 'employer_packet'

/** The QA status taxonomy from the brief, plus `blocked` for compliance stops. */
export type WorkflowStatus =
  | 'drafted'
  | 'needs_candidate_data'
  | 'needs_document'
  | 'needs_human_qa'
  | 'qa_approved'
  | 'sent_to_candidate'
  | 'candidate_signed'
  | 'submitted'
  | 'deficiency_received'
  | 'resolved'
  | 'completed'
  | 'blocked'

export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'escalate'

export type FlagType =
  | 'name_mismatch'
  | 'dob_mismatch'
  | 'passport_expiring'
  | 'passport_expired'
  | 'employment_gap'
  | 'date_conflict'
  | 'prior_refusal'
  | 'prior_nclex_fail'
  | 'criminal_history'
  | 'license_discipline'
  | 'overstay'
  | 'unauthorized_work'
  | 'education_concern'
  | 'employer_mismatch'
  | 'english_missing'
  | 'missing_data'
  | 'compliance_block'

export type Owner = 'agent' | 'candidate' | 'qa' | 'system'

// ---------------------------------------------------------------------------
// Candidate profile & sub-records
// ---------------------------------------------------------------------------

export interface CandidateProfile {
  id: string
  legalFirstName: string
  legalMiddleName?: string
  legalLastName: string
  aliases: string[]
  dateOfBirth: string // ISO yyyy-mm-dd
  gender?: string
  citizenship: string
  nationality: string
  countryOfResidence: string
  email: string
  phone?: string

  // Pathway targets
  visaTarget?: string // e.g. 'F-1'
  nclexState?: string // target NRB / board of nursing
  employmentState?: string // target employer state
  /** U.S. state where the nurse's F-1 program is — the natural licensure on-ramp. */
  studyState?: string
  targetStartDate?: string

  /** Whether the nurse is still abroad or has arrived in the U.S. Gates the
   *  in-person steps (Live Scan fingerprinting) and many SSN-dependent items. */
  arrivalStatus?: 'abroad' | 'arrived'
  /** F-1 nurses generally have no SSN until work-authorized — gates SSN-required states/steps. */
  hasSsn?: boolean

  /** Home-country licensure-exam (e.g. PNLE) history. A strong readiness-band
   *  signal: first-time passers pass the NCLEX at far higher rates than repeat
   *  takers, so a repeat-taker is flagged for more aggressive remediation. */
  pnleHistory?: { firstAttemptPassed?: boolean; attempts?: number }

  /** Consent-gated reuse of the canonical profile across FlorenceRN products.
   *  Capital / employers never see profile data unless the relevant scope is granted. */
  consents?: Partial<Record<ConsentScope, ConsentRecord>>
  /** Per-field provenance for the canonical profile (source / confidence / verification). */
  provenance?: Record<string, FieldProvenance>

  createdAt: string
  updatedAt: string
}

/** Where the canonical profile may be reused. Each is a separate, revocable consent. */
export type ConsentScope = 'visa' | 'education' | 'underwriting' | 'employer' | 'demand_radar'

export interface ConsentRecord {
  granted: boolean
  grantedAt?: string
  /** How consent was captured (e.g. 'candidate_portal', 'signed_form') — audit trail. */
  via?: string
}

/** Field-level governance: collect once, reuse everywhere — but always with provenance. */
export interface FieldProvenance {
  /** Where the value came from: 'passport scan', 'transcript', 'candidate input'… */
  sourceDoc?: string
  confidence: Confidence
  lastVerifiedAt?: string
  /** Human reviewer id, or 'system'. */
  verifiedBy?: string
  candidateConfirmed: boolean
}

export interface IdentityDocument {
  id: string
  candidateId: string
  kind: 'passport' | 'national_id' | 'birth_certificate'
  documentNumber?: string
  /** Name EXACTLY as printed on the document — load-bearing for name-match QA. */
  nameOnDocument: string
  dateOfBirth?: string
  issuingAuthority?: string
  issueDate?: string
  expirationDate?: string
  mrz?: string
  status: FieldStatus
  confidence: Confidence
}

export interface EducationRecord {
  id: string
  candidateId: string
  school: string
  degree: string
  country: string
  graduationDate: string
  programDetails?: string
  nameOnRecord?: string
  sevisId?: string
}

export interface EmploymentRecord {
  id: string
  candidateId: string
  employer: string
  role: string
  specialty?: string
  startDate: string
  endDate?: string
  supervisor?: string
  country?: string
}

export interface LicenseRecord {
  id: string
  candidateId: string
  kind: 'home_country' | 'us_state'
  jurisdiction: string
  licenseNumber?: string
  status: string
  issueDate?: string
  expirationDate?: string
  disciplinaryAction: boolean
  /** Name as it appears on the license / board application. */
  nameOnLicense?: string
}

export interface VisaHistoryRecord {
  id: string
  candidateId: string
  visaType: string
  priorRefusal: boolean
  refusalDetail?: string
  priorOverstay: boolean
  priorUsTravel: boolean
  notes?: string
}

export interface TravelHistoryRecord {
  id: string
  candidateId: string
  country: string
  fromDate: string
  toDate?: string
  purpose?: string
}

export interface SchoolProgram {
  id: string
  candidateId: string
  schoolName: string
  programName: string
  sevisSchoolCode?: string
  i20Number?: string
  startDate?: string
  endDate?: string
  nameOnI20?: string
}

export interface EmployerOffer {
  id: string
  candidateId: string
  employer: string
  state: string
  role: string
  startWindow?: string
  contingent: boolean
  atsRef?: string
}

export interface FinancingRecord {
  id: string
  candidateId: string
  loanApplied: boolean
  coaPackage?: string
  disbursementMilestones?: string
  borrowerConsent: boolean
}

export interface EnglishExam {
  id: string
  candidateId: string
  exam: 'IELTS' | 'OET' | 'TOEFL' | 'PTE'
  overall?: number
  date?: string
  passed?: boolean
  /** Name as printed on the score report. */
  nameOnReport?: string
}

/** A NCLEX / Pearson VUE registration record — name match here is critical. */
export interface NclexRegistration {
  id: string
  candidateId: string
  nrb: string // nursing regulatory body / state
  programCode?: string
  pearsonRegistered: boolean
  /** First/last name EXACTLY as entered with Pearson — must match the ID. */
  nameOnPearson?: string
  attIssued: boolean
  attNumber?: string
  attExpiresOn?: string
  priorAttempts: number
  email?: string
}

/** Uploaded document with extraction status. */
export interface PathwayDocument {
  id: string
  candidateId: string
  kind: EvidenceSourceType
  filename: string
  uploadedAt: string
  extracted: boolean
  extractionConfidence: Confidence
  fields?: Record<string, string>
}

// ---------------------------------------------------------------------------
// Form drafts (evidence-linked answers)
// ---------------------------------------------------------------------------

export interface FormAnswer {
  fieldId: string
  label: string
  value: string | null
  status: FieldStatus
  confidence: Confidence
  evidence: EvidenceRef[]
  reviewerApproved?: boolean
  candidateAttested?: boolean
  /** Sensitive answers (refusal/criminal/overstay/etc.) require human review. */
  sensitive?: boolean
  /** Can only be completed in person after arriving in the U.S. (e.g. Live Scan fingerprinting). */
  afterArrival?: boolean
  /** Requires an SSN, which F-1 nurses typically don't have until work-authorized. */
  needsSsn?: boolean
  /** Official source this requirement ties back to — an board/.gov document or page.
   *  Every requirement element should carry one so nothing is unsourced. */
  source?: OfficialResource
  /** Explicit fee for this element (USD), shown prominently. */
  feeUsd?: number
  note?: string
}

export interface FormSection {
  key: string
  title: string
  answers: FormAnswer[]
}

export interface FormDraft {
  id: string
  candidateId: string
  workflowId: string
  formType: WorkflowType
  title: string
  sections: FormSection[]
  generatedAt: string
}

// ---------------------------------------------------------------------------
// Agent outputs: consistency flags, missing data, guidance
// ---------------------------------------------------------------------------

export interface ConsistencyFlag {
  id: string
  type: FlagType
  severity: RiskLevel
  field?: string
  message: string
  detail?: string
  /** The conflicting values/records, for the QA reviewer. */
  involved: string[]
  requiresEscalation: boolean
  suggestedAction?: string
}

export interface MissingItem {
  fieldId: string
  label: string
  reason: string
  /** Plain-language question to ask the candidate. */
  question: string
  blocker: boolean
  /** Legally-sensitive items are routed to "you must personally answer/sign". */
  sensitive?: boolean
}

export interface GuidanceStep {
  key: string
  title: string
  owner: Owner
  body: string
  done?: boolean
}

// ---------------------------------------------------------------------------
// Workflow instance
// ---------------------------------------------------------------------------

export interface WorkflowStep {
  key: string
  title: string
  owner: Owner
  status: 'todo' | 'in_progress' | 'blocked' | 'done'
  description?: string
}

export interface WorkflowInstance {
  id: string
  candidateId: string
  type: WorkflowType
  title: string
  status: WorkflowStatus
  steps: WorkflowStep[]
  blockedReason?: string
  /** e.g. the DS-160 CEAC confirmation barcode number, captured after submission. */
  confirmationNumber?: string
  /** The consular decision attested by ops/QA after the visa interview (visa_appointment /
   *  ds160 workflow). The single deterministic source for the Application Gate's visa clause;
   *  INTERNAL-only — never surfaced to any employer view (Title VII / IRCA). */
  visaOutcome?: import('./constants').VisaOutcome
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// QA, attestation, submission, deficiency, audit, ledger
// ---------------------------------------------------------------------------

export interface QaReview {
  id: string
  workflowId: string
  candidateId: string
  formDraftId?: string
  status: 'pending' | 'approved' | 'changes_requested'
  summary: string
  flags: ConsistencyFlag[]
  missing: MissingItem[]
  changedFields: string[]
  reviewer?: string
  reviewerNotes?: string
  createdAt: string
  decidedAt?: string
}

export interface CandidateAttestation {
  id: string
  workflowId: string
  candidateId: string
  statement: string
  signatureName: string
  attestedAt: string
}

export interface SubmissionEvent {
  id: string
  workflowId: string
  candidateId: string
  type: WorkflowType
  mode: 'candidate_self_submit' | 'guided' | 'system_submit'
  reference?: string
  note?: string
  at: string
}

export interface AppointmentEvent {
  id: string
  workflowId: string
  candidateId: string
  kind: 'visa_interview' | 'biometrics' | 'nclex' | 'fingerprint'
  location?: string
  scheduledFor?: string
  status: 'unscheduled' | 'scheduled' | 'attended' | 'rescheduled' | 'cancelled'
}

export interface DeficiencyNotice {
  id: string
  workflowId: string
  candidateId: string
  source: string
  classification: string
  items: string[]
  responseDraft?: string
  receivedAt: string
  resolvedAt?: string
}

export interface AuditEntry {
  id: string
  at: string
  actor: Owner
  action: string
  entity: string
  entityId: string
  detail?: string
}

export interface LedgerMilestone {
  id: string
  candidateId: string
  workflowId?: string
  milestone: string
  at: string
  pushedToLedger: boolean
}

// ---------------------------------------------------------------------------
// Jurisdiction rules (data-driven rules engine)
// ---------------------------------------------------------------------------

export interface RequirementItem {
  id: string
  label: string
  detail?: string
  documentNeeded?: boolean
  candidateActionRequired?: boolean
}

export interface RuleStep {
  key: string
  title: string
  owner: Owner
  description: string
}

/** A link to an authoritative source — the official form, portal, or board. */
export interface OfficialResource {
  label: string
  url: string
  note?: string
}

export interface JurisdictionRule {
  key: WorkflowType
  jurisdiction: string
  title: string
  authority: string
  summary: string
  /** [min, max] estimated calendar days. */
  estimatedTimelineDays: [number, number]
  requirements: RequirementItem[]
  guardrails: string[]
  /** Grounding: each claim links to the official source it came from. */
  citations: { label: string; note: string; url?: string }[]
  /** Where the candidate goes for the real thing — official forms/portals/boards. */
  officialResources: OfficialResource[]
  steps: RuleStep[]
  /** Milestone names this workflow can emit to the FlorenceRN production ledger. */
  milestones: string[]
}

// ---------------------------------------------------------------------------
// Aggregate read model used by the UI
// ---------------------------------------------------------------------------

/** Everything about one candidate, assembled for a surface to render. */
export interface CandidateDossier {
  profile: CandidateProfile
  identityDocuments: IdentityDocument[]
  education: EducationRecord[]
  employment: EmploymentRecord[]
  licenses: LicenseRecord[]
  visaHistory: VisaHistoryRecord[]
  travelHistory: TravelHistoryRecord[]
  schoolPrograms: SchoolProgram[]
  employerOffers: EmployerOffer[]
  financing: FinancingRecord[]
  englishExams: EnglishExam[]
  nclex: NclexRegistration[]
  documents: PathwayDocument[]
  workflows: WorkflowInstance[]
  appointments: AppointmentEvent[]
}
