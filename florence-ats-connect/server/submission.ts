// ============================================================================
// Submission channels — how a QA-approved packet actually reaches the employer.
// The service picks a channel from the employer's connector status; the rest of
// the system never branches on provider. manual_link is the V1 default; native
// API connectors (iCIMS first) submit the candidate INTO the ATS via the
// connector registry once an employer's integration is 'active'.
// ============================================================================
import type {
  ApplicationPacket, ATSApplicationStatus, EmployerAccount, FlorenceCandidate, JobRequisition,
  SubmissionMode, SyncEvent,
} from '../shared/types'
import { getConnector } from './connectors'
import type { ResumeFile } from './connectors/types'

export interface SubmitContext {
  newId: () => string
  baseUrl: string
  /** Real candidate (name/email for the ATS write). */
  candidate?: FlorenceCandidate | null
  /** Resume PDF riding along with the submission. */
  resume?: ResumeFile
  /** Pre-generated public token for packet/resume links (persisted on the application). */
  resumeToken?: string
}

export interface ChannelOutcome {
  submissionMode: SubmissionMode
  packetLink?: string
  atsCandidateId?: string
  atsApplicationId?: string
  status: ATSApplicationStatus
  atsStage: string
  syncStatus: SyncEvent['status']
  detail: string
}

export interface SubmissionChannel {
  mode: SubmissionMode
  submit(packet: ApplicationPacket, requisition: JobRequisition, employer: EmployerAccount, ctx: SubmitContext): Promise<ChannelOutcome>
}

/** V1 default: a secure packet link the Florence recruiter hands to the employer's
 *  recruiter, who keys it into their own ATS. Works Day 1 with zero integration. */
const manualLinkChannel: SubmissionChannel = {
  mode: 'manual_link',
  async submit(packet, requisition, employer, ctx) {
    const token = ctx.resumeToken ?? ctx.newId()
    return {
      submissionMode: 'manual_link',
      // Resolves to the packet's resume PDF — the recruiter downloads it and
      // keys/uploads it into their own ATS. Zero integration required.
      packetLink: `${ctx.baseUrl}/api/p/${token}/resume.pdf`,
      status: 'submitted',
      atsStage: 'submitted (manual hand-off)',
      syncStatus: 'success',
      detail: `Secure packet link generated for ${employer.name}; recruiter keys it into ${requisition.atsProvider}.`,
    }
  },
}

/** Native API channel: submits the candidate INTO the employer's ATS via the
 *  provider's connector. This is the capability no pull-only connector has. */
function nativeChannel(provider: string): SubmissionChannel {
  return {
    mode: 'native_api',
    async submit(packet, requisition, employer, ctx) {
      const connector = getConnector(provider)
      if (!connector) throw new Error(`No native connector registered for ${provider}`)
      const r = await connector.submitCandidate({ packet, requisition, employer, candidate: ctx.candidate, resume: ctx.resume })
      return {
        submissionMode: 'native_api',
        atsCandidateId: r.atsCandidateId,
        atsApplicationId: r.atsApplicationId,
        status: r.status,
        atsStage: r.atsStage,
        syncStatus: 'success',
        detail: r.detail,
      }
    },
  }
}

export function selectSubmissionChannel(employer: EmployerAccount): SubmissionChannel {
  // Native live-submit requires BOTH a live integration AND explicit authorization to
  // write into the employer's ATS (atsAuthorized) — a deliberate gate so no candidate is
  // ever written into an ATS without the employer/AMN signing off. Until then, the
  // manual bridge is the path. Connectors are mock-by-default regardless.
  if (employer.integrationStatus === 'active' && employer.atsAuthorized === true && getConnector(employer.atsProvider)) {
    return nativeChannel(employer.atsProvider)
  }
  return manualLinkChannel
}
