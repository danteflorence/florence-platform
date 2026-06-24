// ============================================================================
// Application gate enforcement (IO wrapper around the pure shared/applicationGate).
// Mirrors the pathway readinessGate pattern: load → compute opportunityState →
// run the pure gate → return an audited decision. Fail-closed: no environment flag
// or override can release employer data or submit an application when a gate fails.
// ============================================================================
import { store, audit } from './db'
import { applicationGate, type ApplicationGateResult, type GateKey } from '../shared/applicationGate'
import { opportunityStateFor } from '../shared/opportunityState'
import type { FlorenceCandidate, JobRequisition, ApplicationPacket } from '../shared/types'
import type { SubmissionChannel } from '../shared/vms-types'
import { checkEmployerShareConsent } from './consentService'
import { activeSubmissionLock } from './submissionLock'

export interface OverrideTicket {
  actor: string
  role: string // ops | super_admin
  reason: string
}

const OVERRIDE_ROLES = ['ops', 'super_admin']

/** Overrides are no longer release valves. Keep this helper for callers/tests that
 *  need to distinguish an override request from an allowed gate decision. */
export function validApplicationOverride(o: OverrideTicket | undefined, missing: GateKey[]): boolean {
  return !!o && OVERRIDE_ROLES.includes(o.role) && o.reason.trim().length > 0 && missing.length === 0
}

export interface GateEnforcement {
  allowed: boolean       // may proceed only when the gate is fully ok
  wouldBlock: boolean    // the gate actually failed
  shadow: boolean        // retained for old callers; always false
  overridden: boolean
  result: ApplicationGateResult
}

function packetDocumentsComplete(packet?: ApplicationPacket | null): boolean {
  return !!packet
    && (packet.status === 'ready_to_submit' || packet.status === 'submitted')
    && packet.humanQaStatus === 'approved'
    && packet.documents.length > 0
    && packet.documents.every((d) => d.shareApproved === true)
}

export function packetIsDataMinimized(packet?: ApplicationPacket | null): boolean {
  if (!packet) return false
  const outbound = JSON.stringify(packet.sharedFields)
  if (/visa|nationality|financ|underwrit|passport|ds.?160|sevis/i.test(outbound)) return false
  const withheld = JSON.stringify(packet.withheldFields)
  return /visa|immigration/i.test(withheld)
    && /nationality|national-origin|origin/i.test(withheld)
    && /financ|underwrit/i.test(withheld)
}

/** Evaluate the full (packet-aware) gate for a candidate × requisition (+ optional packet). */
export async function runApplicationGate(args: {
  candidate: FlorenceCandidate
  requisition: JobRequisition
  packet?: ApplicationPacket | null
  override?: OverrideTicket
  auditEntity?: string
  auditEntityId?: string
  action?: 'gate_check' | 'submission_attempt' | 'packet_release' | 'profile_release' | 'slate_lock'
  channel?: SubmissionChannel
  programId?: string
}): Promise<GateEnforcement> {
  const { candidate, requisition, packet, override } = args
  const employer = await store.employers.get(requisition.employerId)
  const consentCheck = await checkEmployerShareConsent({
    candidateId: candidate.id,
    employerId: requisition.employerId,
    jobRequisitionId: requisition.id,
    programId: args.programId ?? packet?.programId,
  })
  const lock = await activeSubmissionLock({ candidateId: candidate.id, employerId: requisition.employerId })
  const gatePacket = packet
    && packet.candidateId === candidate.id
    && packet.jobRequisitionId === requisition.id
    && packet.employerId === requisition.employerId
    ? packet
    : null
  const opportunityState = opportunityStateFor(
    { employerId: requisition.employerId },
    employer ? { integrationStatus: employer.integrationStatus, sourceChannel: employer.sourceChannel } : undefined,
  )
  const result = applicationGate({
    candidate,
    job: requisition,
    opportunityState,
    opts: {
      employerShareConsentGranted: consentCheck.ok,
      // QA approval is the human attestation that the packet (incl. documents) is
      // complete + shareable.
      packetQaApproved: gatePacket ? ((gatePacket.status === 'ready_to_submit' || gatePacket.status === 'submitted') && gatePacket.humanQaStatus === 'approved') : false,
      documentsComplete: packetDocumentsComplete(gatePacket),
      dataMinimizedPacketGenerated: packetIsDataMinimized(gatePacket),
      duplicateSubmissionLockClear: !lock || gatePacket?.status === 'submitted',
      alreadySubmitted: gatePacket?.status === 'submitted',
    },
  })
  const overridden = false
  const allowed = result.ok
  const entity = args.auditEntity ?? 'application'
  const entityId = args.auditEntityId
    ?? (entity === 'packet' && gatePacket ? gatePacket.id : entity === 'candidate' ? candidate.id : requisition.id)
  audit('system', 'application_gate_checked', entity, entityId,
    `candidate=${candidate.id};action=${args.action ?? 'gate_check'};channel=${args.channel ?? 'unknown'};status=${result.status};missing=${result.missing.join(',') || 'none'}`)
  if (override && !result.ok) {
    audit('ops', 'application_gate_override_rejected', entity, entityId,
      `${override.role} ${override.actor}: ${result.missing.join(',')} - ${override.reason}`)
  }
  if (!result.ok) {
    audit('system', 'application_gate_blocked', entity, entityId,
      `${candidate.id}: ${result.status} (${result.missing.join(',')})`)
  } else {
    audit('system', 'application_gate_passed', entity, entityId,
      `candidate=${candidate.id};action=${args.action ?? 'gate_check'}`)
  }
  return { allowed, wouldBlock: !result.ok, shadow: false, overridden, result }
}

/** Parse an override ticket from a request body (submit/lock routes). */
export function overrideFromBody(body: any, actorRole = 'ops', actor = 'ops'): OverrideTicket | undefined {
  if (!body?.override) return undefined
  const o = body.override
  return { actor: String(o.actor ?? actor), role: String(o.role ?? actorRole), reason: String(o.reason ?? '') }
}
