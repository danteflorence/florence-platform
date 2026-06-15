import type { WorkflowType, WorkflowStatus, FieldStatus, RiskLevel, FlagType } from './types'

export type Tone = 'neutral' | 'info' | 'warn' | 'danger' | 'success' | 'progress'

// ── Visa-interview OUTCOME vocabulary ────────────────────────────────────────
// The four consular DECISIONS a human (ops/QA) attests after the visa interview.
// This is the single deterministic source the FlorenceRN Application Gate trusts:
// only 'approved' clears the visa clause (the ATS maps it to VisaStatus 'approved';
// everything else stays fail-closed/blocked). 'pending'/'unknown'/'not_required'
// are NOT decisions and are never captured here. Emitted to the Core Passport spine
// as pathway.visa_status { stage:'decision', outcome }; NEVER shown on any employer
// surface (Title VII / IRCA) — Core's employer passportView withholds the visa facet.
export const VISA_OUTCOMES = ['approved', 'refused', 'administrative_processing', 'expired'] as const
export type VisaOutcome = (typeof VISA_OUTCOMES)[number]
export const VISA_OUTCOME_LABEL: Record<VisaOutcome, string> = {
  approved: 'Visa approved',
  refused: 'Visa refused',
  administrative_processing: 'Administrative processing (221g)',
  expired: 'Visa expired',
}

export const WORKFLOW_META: Record<WorkflowType, { label: string; short: string; blurb: string }> = {
  cgfns_ces: {
    label: 'CGFNS Credentials Evaluation (CES)',
    short: 'CGFNS CES',
    blurb: 'Credentials evaluation many state boards require for internationally-educated nurses.',
  },
  sevis_i20: {
    label: 'SEVIS / Form I-20 & I-901 Fee',
    short: 'I-20 / SEVIS',
    blurb: 'School-issued Form I-20 (SEVIS ID) and the I-901 SEVIS fee — required before the visa interview.',
  },
  ds160: {
    label: 'DS-160 (Nonimmigrant Visa Application)',
    short: 'DS-160',
    blurb: 'Prepare & QA the DS-160 draft. Applicant reviews and signs — we never sign for them.',
  },
  visa_appointment: {
    label: 'Visa Appointment Guidance',
    short: 'Visa Appt',
    blurb: 'Step-by-step guided scheduling. No scraping or bulk-booking — candidate stays in control.',
  },
  nclex_att: {
    label: 'NCLEX Registration & ATT',
    short: 'NCLEX/ATT',
    blurb: 'Pearson registration checklist, exact-name validation, and ATT expiry tracking.',
  },
  florida_rn_exam: {
    label: 'Florida RN Licensure by Exam',
    short: 'FL RN',
    blurb: 'Florida BON application packet, Livescan fingerprinting, deficiency handling.',
  },
  newyork_rn_exam: {
    label: 'New York RN Licensure by Exam',
    short: 'NY RN',
    blurb: 'NYSED Form 1 packet, infection-control + child-abuse coursework tracking.',
  },
  texas_rn_exam: {
    label: 'Texas RN Licensure by Exam',
    short: 'TX RN',
    blurb: 'Texas BON application via the Nurse Portal, DPS/FBI fingerprinting, credential review.',
  },
  california_rn_exam: {
    label: 'California RN Licensure by Exam',
    short: 'CA RN',
    blurb: 'California BRN application, international transcripts + certified English translation.',
  },
  arizona_rn_exam: {
    label: 'Arizona RN Licensure by Exam',
    short: 'AZ RN',
    blurb: 'Arizona BON application, independent credential review and English validation.',
  },
  endorsement: {
    label: 'Licensure by Endorsement',
    short: 'Endorsement',
    blurb: 'Endorse an existing US license into the employer state. 50-state rules model.',
  },
  rn_exam: {
    label: 'RN Licensure by Examination',
    short: 'RN Exam',
    blurb: 'Licensure by exam in any state — data-driven board requirements, credential eval, fingerprints, and the NCLEX-RN.',
  },
  university_admission: {
    label: 'University Admission (F-1)',
    short: 'Admission',
    blurb: 'Match to a SEVP-certified program and prepare the admission packet that triggers the I-20.',
  },
  financing_packet: {
    label: 'Financing Packet (Florence Capital)',
    short: 'Financing',
    blurb: 'Assemble a financing packet from the profile and route it under Florence Capital policy — human-governed, never a black-box decision.',
  },
  employer_packet: {
    label: 'Employer-Ready Packet',
    short: 'Employer',
    blurb: 'Assemble a credential & readiness packet and share with employers (ATS) only when QA-approved and consented.',
  },
}

/** Sensible default pathway ordering for an internationally-educated nurse. */
export const WORKFLOW_ORDER: WorkflowType[] = [
  'cgfns_ces',
  'university_admission',
  'sevis_i20',
  'financing_packet',
  'ds160',
  'visa_appointment',
  'nclex_att',
  'florida_rn_exam',
  'newyork_rn_exam',
  'texas_rn_exam',
  'california_rn_exam',
  'arizona_rn_exam',
  'rn_exam',
  'endorsement',
  'employer_packet',
]

export const STATUS_META: Record<WorkflowStatus, { label: string; tone: Tone }> = {
  drafted: { label: 'Drafted by agent', tone: 'info' },
  needs_candidate_data: { label: 'Needs candidate data', tone: 'warn' },
  needs_document: { label: 'Needs document', tone: 'warn' },
  needs_human_qa: { label: 'Needs human QA', tone: 'progress' },
  qa_approved: { label: 'QA approved', tone: 'success' },
  sent_to_candidate: { label: 'Sent to candidate', tone: 'progress' },
  candidate_signed: { label: 'Candidate signed', tone: 'success' },
  submitted: { label: 'Submitted', tone: 'success' },
  deficiency_received: { label: 'Deficiency received', tone: 'danger' },
  resolved: { label: 'Deficiency resolved', tone: 'success' },
  completed: { label: 'Completed', tone: 'success' },
  blocked: { label: 'Blocked (compliance)', tone: 'danger' },
}

/** The "happy path" progression shown as a pipeline in the UI. */
export const STATUS_PIPELINE: WorkflowStatus[] = [
  'drafted',
  'needs_candidate_data',
  'needs_human_qa',
  'qa_approved',
  'sent_to_candidate',
  'candidate_signed',
  'submitted',
  'completed',
]

export const RISK_META: Record<RiskLevel, { label: string; tone: Tone }> = {
  none: { label: 'No risk', tone: 'success' },
  low: { label: 'Low', tone: 'neutral' },
  medium: { label: 'Medium', tone: 'warn' },
  high: { label: 'High', tone: 'danger' },
  escalate: { label: 'Escalate', tone: 'danger' },
}

export const FIELD_STATUS_META: Record<FieldStatus, { label: string; tone: Tone }> = {
  user_entered: { label: 'Candidate-entered', tone: 'info' },
  document_extracted: { label: 'Document-extracted', tone: 'info' },
  human_verified: { label: 'Human-verified', tone: 'success' },
  expired: { label: 'Expired', tone: 'danger' },
  missing: { label: 'Missing', tone: 'warn' },
  inconsistent: { label: 'Inconsistent', tone: 'danger' },
  legally_sensitive: { label: 'Legally sensitive', tone: 'danger' },
}

export const FLAG_META: Record<FlagType, { label: string; escalates: boolean }> = {
  name_mismatch: { label: 'Name mismatch', escalates: false },
  dob_mismatch: { label: 'Date-of-birth mismatch', escalates: false },
  passport_expiring: { label: 'Passport expiring soon', escalates: false },
  passport_expired: { label: 'Passport expired', escalates: false },
  employment_gap: { label: 'Employment gap', escalates: false },
  date_conflict: { label: 'Date conflict', escalates: false },
  prior_refusal: { label: 'Prior visa refusal', escalates: true },
  prior_nclex_fail: { label: 'Prior NCLEX failure', escalates: false },
  criminal_history: { label: 'Criminal history', escalates: true },
  license_discipline: { label: 'Prior license discipline', escalates: true },
  overstay: { label: 'Overstay / unlawful presence', escalates: true },
  unauthorized_work: { label: 'Prior unauthorized work', escalates: true },
  education_concern: { label: 'Education credential concern', escalates: true },
  employer_mismatch: { label: 'Employer offer mismatch', escalates: false },
  english_missing: { label: 'English exam missing', escalates: false },
  missing_data: { label: 'Missing required data', escalates: false },
  compliance_block: { label: 'Compliance block', escalates: true },
}

/** Flag types that always require escalation to counsel / a specialist. */
export const ESCALATION_FLAGS: FlagType[] = (Object.keys(FLAG_META) as FlagType[]).filter(
  (f) => FLAG_META[f].escalates,
)

export const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-florence-50 text-florence-700 ring-florence-200', // info = teal (Florence DS rule)
  warn: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  progress: 'bg-florence-50 text-florence-700 ring-florence-200',
}
