// VMS Connect — the submission gate, a thin channel-aware wrapper over the canonical
// Application Gate (shared/applicationGate.ts). Pure, fail-closed, no IO. Same non-negotiable
// rules as a direct submission (consent + visa + license + QA + job open) PLUS the VMS channel
// must be authorized (program active + integration authorized). Cross-channel duplicate
// prevention is handled separately at submit time by the SubmissionLock — not here.
import { applicationGate, SUBJECT_TO, type ApplicationGateOpts } from './applicationGate'
import type { FlorenceCandidate } from './types'
import type { VMSGateStatus, VMSProgram, VMSRequisition } from './vms-types'

// An interview/offer/start through a VMS is ALSO conditional on the channel accepting it.
export const VMS_SUBJECT_TO = [...SUBJECT_TO, 'vms_or_msp_acceptance']

export interface VMSGateDecision {
  candidate_id: string
  vms_requisition_id: string
  gate_status: VMSGateStatus
  allowed_action: 'express_interest' | 'submit_vms_packet'
  missing_gates: string[]
  subject_to: string[]
  message: string
  ok: boolean
}

/** Can FlorenceRN submit this candidate to this VMS requisition right now? */
export function canSubmitToVMS(args: {
  candidate: FlorenceCandidate
  requisition: VMSRequisition
  program: VMSProgram
  opts?: ApplicationGateOpts
}): VMSGateDecision {
  const { candidate, requisition, program, opts } = args
  // The channel is authorized only when the program is live AND integration is contract-cleared.
  const channelAuthorized = program.status === 'active' && program.integrationAuthorized
  const res = applicationGate({
    candidate,
    job: {
      id: requisition.id,
      status: requisition.status, // only 'open' clears job_open
      requiredLicenseState: requisition.requiredLicenseState,
      state: requisition.state,
    },
    opportunityState: channelAuthorized ? 'vms_channel' : 'public',
    opts,
  })
  // In the VMS context, an unauthorized channel reads as 'vms_authorized'.
  const missing = res.missing.map((k) => (k === 'channel_authorized' ? 'vms_authorized' : k))
  const gateStatus: VMSGateStatus = res.status
  return {
    candidate_id: candidate.id,
    vms_requisition_id: requisition.id,
    gate_status: gateStatus,
    allowed_action: res.ok ? 'submit_vms_packet' : 'express_interest',
    missing_gates: missing,
    subject_to: res.ok ? VMS_SUBJECT_TO : [],
    message: res.ok
      ? 'Ready to submit a FlorenceRN employer-safe packet to the VMS/MSP — interviews, offers, and starts remain subject to consular processing, final work authorization, credentialing, onboarding, employer approval, and VMS/MSP acceptance.'
      : 'Interest can be recorded now. FlorenceRN will not submit to the VMS until visa, license, consent, QA, and channel-authorization gates are complete.',
    ok: res.ok,
  }
}
