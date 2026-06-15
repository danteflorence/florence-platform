// ============================================================================
// ATSConnector — the native-integration seam. Every native ATS (iCIMS first,
// then Workday/Taleo/...) implements this. The rest of ATS Connect never branches
// on provider; it asks the registry for a connector and calls these methods.
//
// The verb that matters is submitCandidate(): no existing connector anywhere
// (florenceos included) writes a candidate INTO an ATS — they only pull jobs.
// That is the gap this layer fills.
// ============================================================================
import type { ApplicationPacket, ATSApplicationStatus, EmployerAccount, FlorenceCandidate, JobRequisition } from '../../shared/types'

/** The resume/packet PDF that rides along with a submission. */
export interface ResumeFile {
  filename: string
  base64: string
  mime: 'application/pdf'
  /** Public (unguessable-token) URL serving the same PDF — for ATSs that ingest by URL. */
  url?: string
}

export interface ConnectionTestResult {
  ok: boolean
  mode: 'live' | 'mock'
  detail: string
}

export interface SubmitResult {
  atsCandidateId: string
  atsApplicationId: string
  status: ATSApplicationStatus
  atsStage: string
  detail: string
}

/** A job pulled from the ATS, in canonical-ish shape (the import route fills the rest). */
export type PulledJob = Pick<JobRequisition,
  'atsRequisitionId' | 'atsJobUrl' | 'title' | 'specialty' | 'setting' | 'city' | 'state' |
  'requiredLicenseState' | 'shift' | 'employmentType' | 'openings' | 'targetStartWindow'>

export interface ATSConnector {
  provider: string
  testConnection(employer: EmployerAccount): Promise<ConnectionTestResult>
  /** Pull open requisitions from the employer's ATS tenant. */
  listJobs(employer: EmployerAccount): Promise<PulledJob[]>
  /** Create the candidate + application INSIDE the employer's ATS. */
  submitCandidate(args: {
    packet: ApplicationPacket
    requisition: JobRequisition
    employer: EmployerAccount
    /** Real candidate identity (data-minimized at the call site). */
    candidate?: FlorenceCandidate | null
    /** Resume PDF to attach (base64 + public URL). */
    resume?: ResumeFile
  }): Promise<SubmitResult>
  /** Pull the current stage/status of a previously-submitted application. */
  getApplicationStatus(atsApplicationId: string): Promise<{ status: ATSApplicationStatus; atsStage: string }>
}
