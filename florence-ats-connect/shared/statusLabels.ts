// ============================================================================
// Status labels for the 3-state model (Interest → Application-ready → Submitted).
// Pure copy maps — the nurse-facing + employer-facing language, the gate-status →
// nurse message, interview modes, and the "subject to consular processing" line.
// Employer labels NEVER expose visa/immigration (Title VII / IRCA).
// ============================================================================
import type { ApplicationGateStatus, GateKey } from './applicationGate'

// What the nurse sees for each gate status, with the next action.
export const NURSE_GATE_LABEL: Record<ApplicationGateStatus, { label: string; cta: string }> = {
  missing_consent: { label: 'Consent needed to share your packet', cta: 'Grant consent' },
  visa_pending: { label: 'Work authorization not yet cleared', cta: 'Track your pathway' },
  license_pending: { label: 'License verification in progress', cta: 'Complete next step' },
  qa_pending: { label: 'FlorenceRN is reviewing your packet', cta: 'Track status' },
  duplicate_submission: { label: 'Submission already in progress', cta: 'Track employer status' },
  not_ready: { label: 'A few steps remain before we can submit', cta: 'Complete next step' },
  ready_to_submit: { label: 'Application-ready', cta: 'Approve application' },
  submitted: { label: 'Submitted', cta: 'Track employer status' },
}

// Plain reason copy per gate key (nurse-facing; never employer-facing).
export const GATE_KEY_LABEL: Record<GateKey, string> = {
  employer_share_consent: 'Employer-share consent',
  visa_approved: 'Visa / work authorization',
  license_verified_active: 'Active RN license for this role',
  employer_packet_qa_approved: 'FlorenceRN packet QA',
  job_open: 'Job still open',
  channel_authorized: 'Authorized employer workflow',
  duplicate_submission_lock_clear: 'No duplicate active submission',
  data_minimized_packet_generated: 'Employer-safe packet generated',
  documents_complete: 'Required documents',
}

// Employer-facing candidate status — NEVER reveals visa/immigration.
export type EmployerCandidateStatus = 'application_ready' | 'submitted' | 'interview' | 'offer' | 'started'
export const EMPLOYER_STATUS_LABEL: Record<EmployerCandidateStatus, string> = {
  application_ready: 'Application-ready (licensed, QA-cleared, consented)',
  submitted: 'Submitted',
  interview: 'Interview',
  offer: 'Offer',
  started: 'Started',
}

// Interview modes (conservative; a formal application requires the gate to have cleared).
export type InterviewMode = 'pre_clearance' | 'formal'
export const INTERVIEW_LABEL: Record<InterviewMode, string> = {
  pre_clearance: 'Pre-clearance screen — subject to consular processing',
  formal: 'Formal interview — subject to employer onboarding and final start clearance',
}

/** The standard conditional-language line for any interview/offer/start. */
export const SUBJECT_TO_LINE =
  'Interviews, offers, and start dates remain subject to consular processing, final work authorization, credentialing, onboarding, employer approval, and occupational health.'
