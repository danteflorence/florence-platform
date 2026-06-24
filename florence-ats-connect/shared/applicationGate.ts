// ============================================================================
// Application Submission Gate — the canonical, INSPECTABLE rules function that
// decides whether FlorenceRN may submit an employer application / build an
// employer-facing packet / represent a candidate as available. Pure, no IO, no
// LLM (a rules-engine artifact: "use tokens to build the machine, not as the
// machine"). FAIL-CLOSED: every clause must affirmatively pass; unknowns block.
//
// Interest is a free signal and is NOT gated here. This gate governs ONLY the
// submission/representation step (submit route, Kaiser slate-lock, packet release).
// ============================================================================
import type { FlorenceCandidate, VisaStatus } from './types'
import type { OpportunityState } from './opportunityState'

export type GateKey =
  | 'employer_share_consent'
  | 'visa_approved'
  | 'license_verified_active'
  | 'employer_packet_qa_approved'
  | 'job_open'
  | 'channel_authorized'
  | 'duplicate_submission_lock_clear'
  | 'data_minimized_packet_generated'
  | 'documents_complete'

export type ApplicationGateStatus =
  | 'submitted'
  | 'missing_consent'
  | 'visa_pending'
  | 'license_pending'
  | 'qa_pending'
  | 'duplicate_submission'
  | 'not_ready'
  | 'ready_to_submit'

/** Minimal job shape both JobRequisition and FlorenceRNJob satisfy. */
export interface GateJob {
  id: string
  status?: string
  requiredLicenseState?: string
  state?: string
}

export interface ApplicationGateOpts {
  /** Purpose-specific, employer/program-scoped consent has been verified by the consent service. */
  employerShareConsentGranted?: boolean
  /** Packet QA cleared (humanQaStatus==='approved' / packet.status==='ready_to_submit'). */
  packetQaApproved?: boolean
  /** Required documents present + share-approved on the packet. */
  documentsComplete?: boolean
  /** The packet exists and excludes prohibited employer-facing fields. */
  dataMinimizedPacketGenerated?: boolean
  /** No active duplicate submission lock exists for this candidate/employer workflow. */
  duplicateSubmissionLockClear?: boolean
  /** Already submitted (short-circuits to 'submitted'). */
  alreadySubmitted?: boolean
}

export interface ApplicationGateInput {
  candidate: FlorenceCandidate
  job: GateJob
  /** Derived employer-relationship state (reuse opportunityStateFor). 'public' ⇒ not authorized. */
  opportunityState?: OpportunityState
  opts?: ApplicationGateOpts
}

export interface ApplicationGateResult {
  ok: boolean
  missing: GateKey[]
  reasons: string[]
  status: ApplicationGateStatus
  /** The candidate-facing action this state permits. */
  allowedAction: 'express_interest' | 'apply_with_packet'
  /** What an interview/offer/start remains conditional on (mailpiece/UI honesty). */
  subjectTo: string[]
  /** Candidate/employer-facing conditionality copy. */
  subjectToMessage: string
}

const norm = (s?: string) => (s ?? '').trim().toLowerCase()

// Only an affirmatively-cleared work authorization passes (fail-closed).
const VISA_PASS: VisaStatus[] = ['approved', 'not_required']
const LICENSE_VERIFIED: string[] = ['issued', 'approved']
const AUTHORIZED_CHANNELS: OpportunityState[] = ['amn_channel', 'vms_channel', 'direct_partner', 'ats_connected']

export const SUBJECT_TO = [
  'consular_processing',
  'final_work_authorization',
  'employer_onboarding',
  'employer_approval',
  'credentialing',
  'occupational_health',
]

export const SUBJECT_TO_MESSAGE =
  'Interviews, offers, and starts remain subject to consular processing, final work authorization, credentialing, onboarding, and employer approval where applicable.'

/** The single source of truth for "can we submit this candidate to this job?" */
export function applicationGate(input: ApplicationGateInput): ApplicationGateResult {
  const { candidate: c, job, opportunityState = 'public', opts = {} } = input
  const missing: GateKey[] = []
  const reasons: string[] = []
  const fail = (key: GateKey, reason: string) => { missing.push(key); reasons.push(reason) }

  // 1. Employer-share consent
  const employerShareConsentGranted = opts.employerShareConsentGranted ?? c.employerShareConsent === 'granted'
  if (employerShareConsentGranted !== true) fail('employer_share_consent', 'Employer-share consent not yet granted for this employer/workflow')

  // 2. Visa / work-authorization (fail-closed: only approved | not_required)
  if (!c.visaStatus || !VISA_PASS.includes(c.visaStatus)) {
    fail('visa_approved', `Work authorization not cleared (visa: ${c.visaStatus ?? 'unknown'})`)
  }

  // 3. License verified-active + state-feasible (reuses matching's ready_to_submit definition)
  const need = job.requiredLicenseState ?? job.state
  const stateFeasible = !need || c.targetStates.map(norm).includes(norm(need))
  if (c.licenseStatus === 'deficiency') fail('license_verified_active', 'Open licensure deficiency to clear')
  else if (!LICENSE_VERIFIED.includes(c.licenseStatus)) fail('license_verified_active', `License not verified-active (${c.licenseStatus.replace(/_/g, ' ')})`)
  else if (!stateFeasible) fail('license_verified_active', `Not licensed or pursuing ${need}`)

  // 4. Human QA approved (packet-derived)
  if (opts.packetQaApproved !== true) fail('employer_packet_qa_approved', 'Employer packet not QA-approved')

  // 5. Job still open
  if (job.status !== 'open') fail('job_open', `Job is not open (${job.status ?? 'unknown'})`)

  // 6. Employer/channel authorized (public ⇒ no authorized employer workflow)
  if (!AUTHORIZED_CHANNELS.includes(opportunityState)) fail('channel_authorized', 'No authorized employer/AMN/ATS workflow for this job')

  // 7. Duplicate submission lock clear
  if (opts.duplicateSubmissionLockClear === false) fail('duplicate_submission_lock_clear', 'Duplicate active submission lock for this candidate/employer workflow')

  // 8. Data-minimized packet generated (packet-derived)
  if (opts.dataMinimizedPacketGenerated !== true) fail('data_minimized_packet_generated', 'Data-minimized employer-safe packet not generated')

  // 9. Documents complete (packet-derived)
  if (opts.documentsComplete !== true) fail('documents_complete', 'Required documents not complete')

  const ok = missing.length === 0
  // Status precedence — show ONE clear blocking reason first.
  let status: ApplicationGateStatus
  if (opts.alreadySubmitted) status = 'submitted'
  else if (ok) status = 'ready_to_submit'
  else if (missing.includes('employer_share_consent')) status = 'missing_consent'
  else if (missing.includes('visa_approved')) status = 'visa_pending'
  else if (missing.includes('license_verified_active')) status = 'license_pending'
  else if (missing.includes('employer_packet_qa_approved')) status = 'qa_pending'
  else if (missing.includes('duplicate_submission_lock_clear')) status = 'duplicate_submission'
  else status = 'not_ready'

  return {
    ok,
    missing,
    reasons,
    status,
    allowedAction: ok ? 'apply_with_packet' : 'express_interest',
    subjectTo: SUBJECT_TO,
    subjectToMessage: SUBJECT_TO_MESSAGE,
  }
}

/** Convenience: just the candidate-side readiness (consent+visa+license), ignoring
 *  packet/job/channel — used by the gate-aware CTA where a packet doesn't exist yet. */
export function candidateApplicationReady(c: FlorenceCandidate, job: GateJob): boolean {
  const need = job.requiredLicenseState ?? job.state
  const stateFeasible = !need || c.targetStates.map(norm).includes(norm(need))
  return c.employerShareConsent === 'granted'
    && !!c.visaStatus && VISA_PASS.includes(c.visaStatus)
    && LICENSE_VERIFIED.includes(c.licenseStatus)
    && stateFeasible
}
