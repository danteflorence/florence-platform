import { z } from 'zod'
import { VISA_OUTCOMES } from './constants'

// Input validators for the API layer. Domain reads use the types in types.ts;
// these guard the few places where untrusted input enters the system.

export const createCandidateSchema = z.object({
  legalFirstName: z.string().min(1),
  legalMiddleName: z.string().optional(),
  legalLastName: z.string().min(1),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  citizenship: z.string().min(2),
  nationality: z.string().min(2),
  countryOfResidence: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  visaTarget: z.string().optional(),
  nclexState: z.string().optional(),
  employmentState: z.string().optional(),
  targetStartDate: z.string().optional(),
  pnleHistory: z.object({ firstAttemptPassed: z.boolean().optional(), attempts: z.number().int().min(0).optional() }).optional(),
})
export type CreateCandidateInput = z.infer<typeof createCandidateSchema>

export const createWorkflowSchema = z.object({
  candidateId: z.string().min(1),
  type: z.enum([
    'sevis_i20',
    'ds160',
    'visa_appointment',
    'nclex_att',
    'florida_rn_exam',
    'newyork_rn_exam',
    'texas_rn_exam',
    'california_rn_exam',
    'arizona_rn_exam',
    'endorsement',
    'cgfns_ces',
  ]),
})
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>

export const qaDecisionSchema = z.object({
  reviewer: z.string().min(1),
  notes: z.string().optional(),
  decision: z.enum(['approve', 'request_changes']),
})
export type QaDecisionInput = z.infer<typeof qaDecisionSchema>

export const attestationSchema = z.object({
  signatureName: z.string().min(1),
  acknowledge: z.literal(true),
})
export type AttestationInput = z.infer<typeof attestationSchema>

export const answerMissingSchema = z.object({
  fieldId: z.string().min(1),
  value: z.string(),
})
export type AnswerMissingInput = z.infer<typeof answerMissingSchema>

// Backs the candidate's full DS-160 review: the answers they provided/changed,
// the prepared answers they confirmed, and their signature. The attestation is
// only valid because an actual review happened.
export const reviewAndSignSchema = z.object({
  signatureName: z.string().min(1),
  acknowledge: z.literal(true),
  answers: z.array(z.object({ fieldId: z.string().min(1), value: z.string(), note: z.string().optional() })),
  confirmedFieldIds: z.array(z.string()),
})
export type ReviewAndSignInput = z.infer<typeof reviewAndSignSchema>

// The DS-160 confirmation (barcode) number the applicant gets from CEAC after
// they personally submit. ~10 alphanumeric characters.
export const recordConfirmationSchema = z.object({
  confirmationNumber: z.string().regex(/^[A-Za-z0-9]{8,12}$/, 'Enter the ~10-character DS-160 confirmation number (letters & digits).'),
})
export type RecordConfirmationInput = z.infer<typeof recordConfirmationSchema>

// The candidate's booked visa interview (after they scheduled on the official
// portal). We capture it so the system can monitor the date as a deadline.
export const appointmentSchema = z.object({
  consulate: z.string().min(1),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().optional(),
  mrvReceipt: z.string().optional(),
})
export type AppointmentInput = z.infer<typeof appointmentSchema>

// The consular DECISION after the visa interview, attested by ops/QA (humans —
// never the AI, never the candidate). Only 'approved' clears the Application Gate's
// visa clause downstream; everything else stays fail-closed.
export const visaResultSchema = z.object({
  outcome: z.enum(VISA_OUTCOMES),
  decidedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().max(500).optional(),
})
export type VisaResultInput = z.infer<typeof visaResultSchema>

// NCLEX / Pearson VUE registration. The name MUST match the ID exactly, so it is
// the load-bearing field — capturing it resolves the name-match flag.
export const nclexRegisterSchema = z.object({
  nameOnPearson: z.string().min(1),
  programCode: z.string().optional(),
  email: z.string().email().optional(),
  registered: z.boolean(),
})
export type NclexRegisterInput = z.infer<typeof nclexRegisterSchema>

// Capture the Authorization to Test (ATT) and/or the scheduled exam. The ATT
// validity is the binding constraint — the candidate must test before it lapses.
export const nclexAttSchema = z.object({
  attNumber: z.string().optional(),
  attExpiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  testCenter: z.string().optional(),
  readinessConfirmed: z.boolean().optional(),
}).refine((d) => d.attExpiresOn || d.examDate, { message: 'Provide your ATT details or schedule your exam.' })
export type NclexAttInput = z.infer<typeof nclexAttSchema>

export const deficiencySchema = z.object({
  source: z.string().min(1),
  items: z.array(z.string().min(1)).min(1),
})
export type DeficiencyInput = z.infer<typeof deficiencySchema>

const money = z.number().nonnegative().optional()
export const consularVisaTypeSchema = z.enum(['F1', 'F2', 'M1', 'M2', 'J1', 'J2', 'other'])
export const consularPaymentStatusSchema = z.enum([
  'not_required',
  'not_started',
  'eligible_for_i901_payment',
  'awaiting_student_attestation',
  'ready_for_sevismate',
  'payment_link_generated',
  'student_opened_payment',
  'payment_started',
  'payment_failed',
  'payment_confirmed_by_sevismate',
  'submitted_to_fmjfee',
  'receipt_pending',
  'receipt_received',
  'receipt_qa_approved',
  'receipt_rejected_needs_correction',
  'cancelled',
  'refunded',
  'case_escalated',
])

export const createI901OrderSchema = z.object({
  candidateId: z.string().min(1),
  visaType: consularVisaTypeSchema.default('F1'),
  payerType: z.enum(['student', 'florence']).default('student'),
  officialFeeUsd: money,
  serviceFeeUsd: money,
  taxOrProcessingFeeUsd: money,
  localCurrency: z.string().min(3).max(3).optional(),
  localAmount: money,
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  interviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ownerUserId: z.string().optional(),
  serviceSpeed: z.enum(['basic', 'standard', 'express']).optional(),
})
export type CreateI901OrderInput = z.infer<typeof createI901OrderSchema>

export const patchI901OrderSchema = z.object({
  status: consularPaymentStatusSchema.optional(),
  payerType: z.enum(['student', 'florence']).optional(),
  officialFeeUsd: money,
  serviceFeeUsd: money,
  taxOrProcessingFeeUsd: money,
  localCurrency: z.string().min(3).max(3).optional(),
  localAmount: money,
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  interviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  ownerUserId: z.string().nullable().optional(),
  serviceSpeed: z.enum(['basic', 'standard', 'express']).nullable().optional(),
  statusReason: z.string().max(500).optional(),
})
export type PatchI901OrderInput = z.infer<typeof patchI901OrderSchema>

export const i901AttestationSchema = z.object({
  signatureName: z.string().min(1),
  acknowledge: z.literal(true),
  confirmedFields: z.array(z.enum(['legal_name', 'date_of_birth', 'sevis_id', 'school_code', 'form_type', 'program_start_date'])).min(6),
})
export type I901AttestationInput = z.infer<typeof i901AttestationSchema>

export const sevismateHandoffSchema = z.object({
  integrationMode: z.enum(['deep_link', 'csv', 'sftp', 'api', 'manual']).default('deep_link'),
})
export type SevismateHandoffInput = z.infer<typeof sevismateHandoffSchema>

export const i901ReceiptSchema = z.object({
  filename: z.string().min(1),
  sevisId: z.string().min(3),
  legalName: z.string().optional(),
  schoolCode: z.string().optional(),
  formType: z.enum(['I-20', 'DS-2019']).optional(),
  visaType: consularVisaTypeSchema.optional(),
  receiptDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amountUsd: money,
  source: z.enum(['sevismate_dashboard', 'student_upload', 'ops_upload', 'api']).default('student_upload'),
  extractionConfidence: z.enum(['high', 'medium', 'low', 'unknown']).default('medium'),
})
export type I901ReceiptInput = z.infer<typeof i901ReceiptSchema>

export const i901QaDecisionSchema = z.object({
  reviewer: z.string().min(1),
  notes: z.string().max(500).optional(),
})
export type I901QaDecisionInput = z.infer<typeof i901QaDecisionSchema>
