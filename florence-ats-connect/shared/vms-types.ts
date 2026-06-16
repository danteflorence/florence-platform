// FlorenceRN VMS Connect — the canonical channel/MSP distribution model. ONE shape that
// every VMS/MSP/staffing source maps into (the spec's data model). String-literal unions,
// no TS enums. VMS Connect is the distributor sibling of ATS Connect: it reuses the same
// kernel (matching / Application Gate / packet redaction / Production Ledger / pricing) and
// adds requisition-in → match → gate → employer-safe packet → submit → status-back → ledger.

export type VMSProvider =
  | 'amn'
  | 'shiftwise'
  | 'aya'
  | 'simplifyvms'
  | 'beeline'
  | 'sap_fieldglass'
  | 'workday_vndly'
  | 'magnit'
  | 'custom'
  | 'manual_csv'

export type VMSProgramType = 'msp' | 'vms' | 'supplier_network' | 'direct_channel'
export type VMSIntegrationMode = 'api' | 'webhook' | 'sftp' | 'csv' | 'portal_manual'
export type VMSProgramStatus = 'sandbox' | 'active' | 'paused' | 'terminated'

export interface VMSProgram {
  id: string
  provider: VMSProvider
  /** The VMS/MSP partner org (the tenant boundary — reused as the Core M2M org_id). */
  partnerOrgId: string
  partnerName: string
  /** The end customer (health system) this program staffs, if known. */
  customerEmployerId?: string
  customerName?: string
  programType: VMSProgramType
  integrationMode: VMSIntegrationMode
  status: VMSProgramStatus
  /** Whether FlorenceRN is authorized to submit through this channel (legal/contract gate). */
  integrationAuthorized: boolean
  allowedScopes: string[]
  perRnMonthlyFeeUsd?: number
  createdAt: string
  updatedAt: string
}

export type VMSNormalizedRole =
  | 'registered_nurse'
  | 'licensed_vocational_nurse'
  | 'nurse_manager'
  | 'other'

export type VMSSpecialty =
  | 'med_surg' | 'icu' | 'er' | 'telemetry' | 'home_health'
  | 'dialysis' | 'hospice' | 'snf' | 'clinic' | 'asc' | 'other'

export type VMSSetting =
  | 'hospital' | 'home_health' | 'snf' | 'dialysis' | 'hospice' | 'clinic' | 'asc' | 'other'

export type VMSEmploymentType = 'permanent' | 'contract' | 'temp_to_perm' | 'per_diem' | 'unknown'
export type VMSRequisitionStatus = 'open' | 'hold' | 'filled' | 'closed' | 'stale'

export interface VMSRequisition {
  id: string
  vmsProgramId: string
  externalReqId?: string
  employerId?: string
  employerName?: string
  facilityId?: string
  facilityName?: string
  title: string
  normalizedRole: VMSNormalizedRole
  specialty?: VMSSpecialty
  setting?: VMSSetting
  city?: string
  state?: string
  requiredLicenseState?: string
  shift?: string
  employmentType?: VMSEmploymentType
  startWindow?: string
  billRate?: number
  payRange?: string
  credentialRequirements?: string[]
  status: VMSRequisitionStatus
  sourceUrl?: string
  firstSeenAt: string
  lastSyncedAt?: string
}

/** The gate decision recorded on a submission (mirrors the Application Gate statuses). */
export type VMSGateStatus =
  | 'not_ready'
  | 'missing_consent'
  | 'visa_pending'
  | 'license_pending'
  | 'qa_pending'
  | 'ready_to_submit'
  | 'submitted'

/** The placement lifecycle for a candidate submitted through a VMS channel. */
export type VMSSubmissionStatus =
  | 'draft'
  | 'ready_to_submit'
  | 'submitted'
  | 'reviewed'
  | 'interview_requested'
  | 'interview_scheduled'
  | 'offer_received'
  | 'onboarding'
  | 'cleared'
  | 'started'
  | 'rejected'
  | 'withdrawn'

export interface VMSSubmission {
  id: string
  vmsProgramId: string
  vmsRequisitionId: string
  candidateId: string
  applicationPacketId?: string
  externalSubmissionId?: string
  gateStatus: VMSGateStatus
  status: VMSSubmissionStatus
  submittedAt?: string
  startedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

/** Cross-channel duplicate-submission guard. A candidate may EXPRESS INTEREST anywhere, but
 *  may be formally SUBMITTED to a given employer/facility/req through only ONE channel at a
 *  time. Lock until the submission is rejected/withdrawn/released or it expires. */
export type SubmissionChannel = 'direct' | 'ats' | 'vms' | 'amn' | 'other'
export type SubmissionLockStatus = 'active' | 'released' | 'expired'

export interface SubmissionLock {
  id: string
  candidateId: string
  employerId: string
  facilityId?: string
  requisitionId?: string
  channel: SubmissionChannel
  /** The ats/vms submission that holds the lock (for release + audit). */
  submissionId?: string
  status: SubmissionLockStatus
  lockedAt: string
  expiresAt?: string
}
