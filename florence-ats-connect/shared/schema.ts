import { z } from 'zod'

// Input validators for the API boundary — the few places untrusted input enters.
// Domain reads use the types in types.ts; these guard writes.

const ats = z.enum([
  'manual', 'csv', 'portal', 'workday', 'oracle_taleo', 'oracle_recruiting',
  'icims', 'ukg_pro', 'sap_successfactors', 'greenhouse', 'merge',
])
const sourceChannel = z.enum(['direct', 'amn', 'other'])
const setting = z.enum(['inpatient', 'outpatient', 'home_health', 'home_care', 'post_acute', 'clinic', 'other'])

export const createEmployerSchema = z.object({
  name: z.string().min(1),
  atsProvider: ats.default('manual'),
  atsTenantId: z.string().optional(),
  defaultBillingModel: z.enum(['direct', 'channel']).default('direct'),
  sourceChannel: sourceChannel.default('direct'),
})
export type CreateEmployerInput = z.infer<typeof createEmployerSchema>

export const importRequisitionsSchema = z.object({
  // The submission source for THIS import; the canonical model is identical
  // regardless of whether jobs arrive by hand, CSV, portal, or a native pull.
  source: ats.default('manual'),
  jobs: z.array(z.object({
    atsRequisitionId: z.string().optional(),
    atsJobUrl: z.string().optional(),
    title: z.string().min(1),
    facilityName: z.string().optional(),
    department: z.string().optional(),
    unit: z.string().optional(),
    specialty: z.string().optional(),
    setting: setting.default('inpatient'),
    city: z.string().optional(),
    state: z.string().optional(),
    requiredLicenseState: z.string().optional(),
    requiredCertifications: z.array(z.string()).optional(),
    shift: z.enum(['day', 'night', 'variable', 'unknown']).optional(),
    employmentType: z.enum(['full_time', 'part_time', 'contract', 'per_diem', 'unknown']).optional(),
    openings: z.number().int().positive().optional(),
    targetStartDate: z.string().optional(),
    targetStartWindow: z.string().optional(),
    sourceChannel: sourceChannel.optional(),
  })).min(1),
})
export type ImportRequisitionsInput = z.infer<typeof importRequisitionsSchema>

export const grantConsentSchema = z.object({
  employerId: z.string().min(1),
  jobRequisitionId: z.string().optional(),
  purpose: z.string().default('employment_application'),
  allowedData: z.array(z.string()).default([
    'resume', 'credential_summary', 'readiness_summary', 'video_profile',
    'nclex_status', 'license_status', 'expected_start_window',
  ]),
  attestationTextVersion: z.string().default('employer-share-v1'),
})
export type GrantConsentInput = z.infer<typeof grantConsentSchema>

export const createPacketSchema = z.object({
  candidateId: z.string().min(1),
  jobRequisitionId: z.string().min(1),
  includeDocuments: z.array(z.enum([
    'resume', 'credential_summary', 'readiness_summary', 'license',
    'nclex_att', 'english_score', 'transcript', 'video_profile', 'other',
  ])).optional(),
})
export type CreatePacketInput = z.infer<typeof createPacketSchema>

export const qaApproveSchema = z.object({
  reviewer: z.string().min(1),
  decision: z.enum(['approve', 'block']).default('approve'),
  notes: z.string().optional(),
})
export type QaApproveInput = z.infer<typeof qaApproveSchema>

export const updateAtsStatusSchema = z.object({
  status: z.enum([
    'submitted', 'received', 'screen', 'interview', 'offer', 'hired',
    'rejected', 'withdrawn', 'start_scheduled', 'started',
  ]),
  atsStage: z.string().optional(),
  statusReason: z.string().optional(),
  /** How this status was learned. start/started/retention should be hris or
   *  employer_attestation — NOT ats — for anything that drives billing. */
  verifiedVia: z.enum(['ats', 'hris', 'employer_attestation', 'nurse_confirmation']).optional(),
})
export type UpdateAtsStatusInput = z.infer<typeof updateAtsStatusSchema>

export const ledgerEventSchema = z.object({
  candidateId: z.string().min(1),
  stage: z.enum([
    'matched', 'packet_created', 'qa_approved', 'ats_application_submitted',
    'interview_scheduled', 'offer_made', 'offer_accepted', 'start_scheduled',
    'started', 'rejected', 'withdrawn', 'retention_30d', 'retention_90d',
  ]),
  sourceId: z.string().optional(),
  employerId: z.string().optional(),
  jobRequisitionId: z.string().optional(),
  notes: z.string().optional(),
  verifiedVia: z.enum(['ats', 'hris', 'employer_attestation', 'nurse_confirmation']).optional(),
})
export type LedgerEventInput = z.infer<typeof ledgerEventSchema>

export const createProgramSchema = z.object({
  employerId: z.string().min(1),
  name: z.string().min(1),
  targetCount: z.number().int().positive(),
  waveStructure: z.array(z.number().int().positive()).min(1),
  channel: z.enum(['amn', 'direct']).default('amn'),
  perRnMonthlyFeeUsd: z.number().positive().optional(),
  ownerNames: z.array(z.string()).optional(),
})
export const lockWaveSchema = z.object({ candidateIds: z.array(z.string().min(1)).min(1) })
