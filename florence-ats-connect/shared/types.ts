// ============================================================================
// FlorenceRN ATS Connect — canonical employment data model
// ----------------------------------------------------------------------------
// One canonical model. Every INGESTION channel (manual / CSV / employer portal
// now; native ATS connectors — Workday/Taleo/iCIMS/... — later) normalizes INTO
// these types; every SUBMISSION channel maps OUT of them. Connectors are an
// implementation detail behind this model, never the model itself.
//
// The candidate side (FlorenceCandidate / ReadinessPassportSummary) is a
// consent-gated PROJECTION synced from florence-pathway-agent's CandidateProfile
// + readiness + consent kernel. We deliberately do NOT duplicate the full IEN
// (internationally-educated nurse) dossier — only what matching and packets need.
// ============================================================================

// ---------------------------------------------------------------------------
// Employer / facility / requisition
// ---------------------------------------------------------------------------

/** ATS / submission surfaces. `manual`/`csv`/`portal` are live in V1; the rest
 *  are native connectors built later (and only when a customer's security review
 *  grants tenant access — they are EARNED, not a prerequisite to launch). */
export type ATSProvider =
  | 'manual'
  | 'csv'
  | 'portal'
  | 'workday'
  | 'oracle_taleo'
  | 'oracle_recruiting'
  | 'icims'
  | 'ukg_pro'
  | 'sap_successfactors'
  | 'greenhouse'
  | 'merge'

export type IntegrationStatus =
  | 'not_started'
  | 'manual'
  | 'credentials_pending'
  | 'sandbox'
  | 'active'
  | 'paused'
  | 'error'

/** Whether a req/employer reaches us directly or through a staffing channel.
 *  Kept on every requisition so a Kaiser-direct vs AMN-channel split stays
 *  legible even if the commercial motion gets messy. */
export type SourceChannel = 'direct' | 'amn' | 'other'

export interface EmployerAccount {
  id: string
  name: string
  atsProvider: ATSProvider
  atsTenantId?: string
  integrationStatus: IntegrationStatus
  defaultBillingModel: 'direct' | 'channel'
  sourceChannel: SourceChannel
  /** Explicit, deliberate authorization to write candidates INTO this employer's ATS.
   *  Native live-submit is gated on this in ADDITION to integrationStatus==='active';
   *  until set, the ATS-light manual bridge is the path (no live ATS write). */
  atsAuthorized?: boolean
  createdAt: string
  updatedAt: string
}

export type FacilityType =
  | 'hospital'
  | 'home_health'
  | 'home_care'
  | 'clinic'
  | 'physician_practice'
  | 'snf'
  | 'asc'
  | 'dialysis'
  | 'hospice'
  | 'other'

export interface Facility {
  id: string
  employerId: string
  name: string
  facilityType: FacilityType
  city?: string
  state?: string
  country?: string
  costCenter?: string
  atsFacilityRef?: string
  createdAt: string
}

export type CareSetting =
  | 'inpatient'
  | 'outpatient'
  | 'home_health'
  | 'home_care'
  | 'post_acute'
  | 'clinic'
  | 'other'

export type Shift = 'day' | 'night' | 'variable' | 'unknown'
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'per_diem' | 'unknown'
export type RequisitionStatus = 'open' | 'paused' | 'closed' | 'filled' | 'archived'

export interface JobRequisition {
  id: string
  employerId: string
  facilityId?: string
  atsProvider: ATSProvider
  atsRequisitionId?: string
  atsJobUrl?: string
  title: string
  department?: string
  unit?: string
  specialty?: string
  setting: CareSetting
  city?: string
  state?: string
  country?: string
  /** The U.S. state license the role REQUIRES — the load-bearing match constraint. */
  requiredLicenseState?: string
  requiredCertifications?: string[]
  shift?: Shift
  employmentType?: EmploymentType
  openings?: number
  targetStartDate?: string
  targetStartWindow?: string
  status: RequisitionStatus
  sourceChannel: SourceChannel
  importedAt: string
  lastSyncedAt: string
}

// ---------------------------------------------------------------------------
// Candidate projection (synced from florence-pathway-agent) + readiness
// ---------------------------------------------------------------------------

export type ReadinessBand = 'green' | 'yellow' | 'orange' | 'red'

export type NclexStatus =
  | 'not_started'
  | 'diagnostic'
  | 'registered'
  | 'att_issued'
  | 'scheduled'
  | 'passed'
  | 'failed'
  | 'unknown'

export type LicenseStatus =
  | 'not_started'
  | 'application_draft'
  | 'submitted'
  | 'deficiency'
  | 'approved'
  | 'issued'
  | 'endorsement_in_progress'
  | 'unknown'

export type ConsentStatus = 'not_requested' | 'granted' | 'revoked'
export type QaStatus = 'not_started' | 'pending' | 'approved' | 'blocked'

/** Work-authorization / visa outcome — an INTERNAL gate input, NEVER an employer-facing
 *  field (withheld from packets + the employer passport view; Title VII / IRCA). The
 *  Application Submission Gate is FAIL-CLOSED: only 'approved' | 'not_required' pass;
 *  everything else (incl. the default 'unknown') blocks submission. */
export type VisaStatus =
  | 'not_required'            // domestic / already work-authorized — no consular step needed
  | 'pending'                 // in progress (DS-160 / appointment / pre-decision)
  | 'approved'                // visa issued / work-authorization cleared
  | 'refused'
  | 'administrative_processing'
  | 'expired'
  | 'unknown'                 // default — fail-closed

/** Employer-relevant projection of a Florence (IEN) nurse. Synced from
 *  pathway-agent's CandidateProfile; `sourceCandidateId` is that profile's id. */
export interface FlorenceCandidate {
  id: string
  sourceCandidateId?: string
  fullName: string
  email?: string
  phone?: string
  // --- Legally sensitive: used for matching feasibility, NEVER auto-shared ---
  // Pushing national-origin / visa signals into an employer ATS pre-offer is a
  // Title VII / IRCA exposure for the employer, so these stay on our side of the
  // wall and are withheld from packets by default (see packet.ts).
  nationality?: string
  countryOfEducation?: string
  currentCountry?: string
  arrivalStatus?: 'abroad' | 'arrived'
  // --------------------------------------------------------------------------
  specialtyExperience: string[]
  yearsExperience?: number
  readinessBand: ReadinessBand
  nclexStatus: NclexStatus
  licenseStatus: LicenseStatus
  /** Work-authorization gate input (internal-only; never shared with employers).
   *  Default 'unknown' ⇒ fail-closed (the candidate cannot be submitted). */
  visaStatus?: VisaStatus
  /** U.S. states the nurse is licensed in or actively pursuing. */
  targetStates: string[]
  expectedStartWindow?: string
  employerShareConsent: ConsentStatus
  humanQaStatus: QaStatus
  createdAt: string
  updatedAt: string
}

/** The employer-SAFE readiness summary — the only readiness view that ever
 *  leaves FlorenceRN. No nationality, no visa pathway, no underwriting. */
export interface ReadinessPassportSummary {
  candidateId: string
  readinessBand: ReadinessBand
  nclexStatus: NclexStatus
  licenseStatus: LicenseStatus
  licenseStateTarget?: string
  specialtyExperience: string[]
  yearsExperience?: number
  expectedStartWindow?: string
  credentialCompletenessPct: number
  humanQaStatus: QaStatus
  shareableSummaryText: string
}

// ---------------------------------------------------------------------------
// Consent
// ---------------------------------------------------------------------------

export interface EmployerShareConsent {
  id: string
  candidateId: string
  employerId: string
  jobRequisitionId?: string
  purpose: string
  allowedData: string[]
  consentTextVersion: string
  consentTextHash: string
  grantedAt: string
  revokedAt?: string
  /** Canonical Core consent id (set when dual-written to the Core consent store). */
  coreConsentId?: string
}

// ---------------------------------------------------------------------------
// Application packet + ATS application
// ---------------------------------------------------------------------------

export type PacketDocType =
  | 'resume'
  | 'credential_summary'
  | 'readiness_summary'
  | 'license'
  | 'nclex_att'
  | 'english_score'
  | 'transcript'
  | 'video_profile'
  | 'other'

export interface PacketDocument {
  id: string
  type: PacketDocType
  label: string
  url?: string
  shareApproved: boolean
}

export type PacketStatus =
  | 'draft'
  | 'qa_pending'
  | 'candidate_review'
  | 'ready_to_submit'
  | 'submitted'
  | 'withdrawn'

export interface ApplicationPacket {
  id: string
  candidateId: string
  jobRequisitionId: string
  employerId: string
  readinessPassport: ReadinessPassportSummary
  documents: PacketDocument[]
  /** Fields actually shared with the employer (post data-minimization). */
  sharedFields: Record<string, string>
  /** Fields deliberately withheld, each with the compliance reason. */
  withheldFields: { field: string; reason: string }[]
  consentId?: string
  humanQaStatus: QaStatus
  status: PacketStatus
  createdAt: string
  updatedAt: string
}

export type SubmissionMode = 'manual_link' | 'portal' | 'csv' | 'native_api'

export type ATSApplicationStatus =
  | 'submitted'
  | 'received'
  | 'screen'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected'
  | 'withdrawn'
  | 'start_scheduled'
  | 'started'

export interface ATSApplication {
  id: string
  packetId: string
  candidateId: string
  jobRequisitionId: string
  employerId: string
  atsProvider: ATSProvider
  submissionMode: SubmissionMode
  /** For manual_link/portal mode: the secure packet URL handed to the recruiter. */
  packetLink?: string
  atsCandidateId?: string
  atsApplicationId?: string
  atsStage?: string
  /** Unguessable token for the public resume-PDF link (manual bridge + URL-ingesting ATSs). */
  resumeToken?: string
  status: ATSApplicationStatus
  statusReason?: string
  submittedAt?: string
  lastInboundSyncAt?: string
  lastOutboundSyncAt?: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// Sync events (every cross-system action is auditable)
// ---------------------------------------------------------------------------

export interface SyncEvent {
  id: string
  employerId: string
  atsProvider: ATSProvider
  entityType: 'job_requisition' | 'candidate' | 'application' | 'attachment' | 'status' | 'connection'
  entityId: string
  direction: 'inbound' | 'outbound'
  status: 'success' | 'failed' | 'retrying' | 'skipped'
  errorCode?: string
  errorMessage?: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// ATS connection (self-serve "click to add")
// ---------------------------------------------------------------------------

export type ConnectionStatus = 'active' | 'error' | 'revoked'

/** A live, employer-authorized link to an ATS — created self-serve (Merge Link
 *  or a Greenhouse key), not by Florence ops. The credential (OAuth account
 *  token / API key) is NEVER stored here; it lives encrypted in a separate vault
 *  column (see server/vault.ts + the store `connections` repo). */
export interface AtsConnection {
  id: string
  employerId: string
  /** Connector key — a native provider, or 'merge' for the unified-API lane. */
  provider: ATSProvider
  /** External account/tenant id from the provider (e.g. Merge account id). */
  externalAccountId?: string
  status: ConnectionStatus
  scopes?: string[]
  createdAt: string
  lastSyncAt?: string
}

// ---------------------------------------------------------------------------
// Production ledger
// ---------------------------------------------------------------------------

export type LedgerStage =
  | 'matched'
  | 'packet_created'
  | 'qa_approved'
  | 'ats_application_submitted'
  | 'interview_scheduled'
  | 'offer_made'
  | 'offer_accepted'
  | 'start_scheduled'
  | 'started'
  | 'rejected'
  | 'withdrawn'
  | 'retention_30d'
  | 'retention_60d'
  | 'retention_90d'
  | 'term_complete'
  | 'repayment'
  // --- Application Submission Gate / 3-state model (additive; existing positions unchanged) ---
  | 'visa_approved'                          // internal readiness signal (no employer-view event)
  | 'license_verified'                       // internal readiness signal
  | 'application_ready_to_submit'            // gate cleared, pre-submit
  | 'interview_pre_clearance_requested'      // informational employer/AMN screen, pre-final-clearance
  | 'interview_formal_scheduled'             // formal interview (== ats.interview)
  | 'offer_received_subject_to_clearance'    // offer, conditional on consular/onboarding (== ats.offer)
  | 'start_cleared'                          // HRIS/attested start (== ats.started; opens billing)

/** How a billing-relevant fact was verified. Start/retention must NOT be trusted
 *  from ATS stage data alone — those ride on `hris` or `employer_attestation`. */
export type VerificationSource = 'ats' | 'hris' | 'employer_attestation' | 'nurse_confirmation'

export interface ProductionLedgerEvent {
  id: string
  candidateId: string
  stage: LedgerStage
  sourceType: 'ats_connect'
  sourceId?: string
  employerId?: string
  jobRequisitionId?: string
  notes?: string
  verifiedVia?: VerificationSource
  at: string
  /** Set to 'core' when LEDGER_CANONICAL=core: this local row is a rebuildable
   *  PROJECTION of the canonical Core nurse_events ledger (written after the Core
   *  emit), not an independent source of truth. */
  projectionOf?: 'core'
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

export type MatchCategory =
  | 'ready_to_submit'
  | 'ready_after_milestone'
  | 'hold_for_academy'
  | 'hold_for_credential_repair'

export type RouteConfidence = 'high' | 'medium' | 'low'

/** Transparent per-signal contribution — we never show employers a black-box
 *  number first; this is the explainable breakdown behind the score. */
export interface MatchSignal {
  signal: string
  weight: number
  score: number
  note: string
}

export interface MatchResult {
  candidateId: string
  candidateName: string
  requisitionId: string
  matchScore: number
  category: MatchCategory
  routeConfidence: RouteConfidence
  readinessBand: ReadinessBand
  expectedStartWindow?: string
  reasons: string[]
  blockers: string[]
  signals: MatchSignal[]
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export type Actor = 'system' | 'ops' | 'candidate' | 'qa' | 'connector'

export interface AuditEntry {
  id: string
  at: string
  actor: Actor
  action: string
  entity: string
  entityId: string
  detail?: string
}

// ---------------------------------------------------------------------------
// Program / Wave / Slate — the AMN/Kaiser Program Workspace (productized 200-RN
// program). A Program groups placements for one employer into Waves (50+50+100);
// a Slate is the locked snapshot of licensed candidates submitted into a wave.
// ---------------------------------------------------------------------------

export type ProgramStatus = 'planning' | 'active' | 'paused' | 'completed'
export type ProgramChannel = 'amn' | 'direct'
export type WaveStatus = 'planned' | 'active' | 'filled' | 'closed'

export interface Program {
  id: string
  employerId: string
  name: string                  // e.g. "Kaiser 200-RN"
  targetCount: number
  waveStructure: number[]       // e.g. [50, 50, 100]
  status: ProgramStatus
  channel: ProgramChannel
  perRnMonthlyFeeUsd?: number   // program override; else Pricing API
  ownerNames?: string[]
  createdAt: string
  updatedAt: string
}

export interface ProgramWave {
  id: string
  programId: string
  waveNumber: number
  targetCount: number
  targetStartMonth?: string     // YYYY-MM
  status: WaveStatus
  createdAt: string
}

export interface ProgramSlate {
  id: string
  programId: string
  waveId: string
  candidateIds: string[]        // LOCKED snapshot once submittedAt is set
  createdAt: string
  submittedAt?: string
}
