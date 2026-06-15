// ============================================================================
// Application gate enforcement (IO wrapper around the pure shared/applicationGate).
// Mirrors the pathway readinessGate pattern: load → compute opportunityState →
// run the pure gate → apply an audited override → return a decision. HARD-BLOCK by
// default (APPLICATION_GATE_ENFORCE !== '0'); fail-closed. The visa clause can only
// be overridden by super_admin. Every override is audited + ledger-noted.
// ============================================================================
import { store } from './db'
import { audit } from './db'
import { applicationGate, type ApplicationGateResult, type GateKey } from '../shared/applicationGate'
import { opportunityStateFor } from '../shared/opportunityState'
import type { FlorenceCandidate, JobRequisition, ApplicationPacket } from '../shared/types'

export interface OverrideTicket {
  actor: string
  role: string // ops | super_admin
  reason: string
}

const OVERRIDE_ROLES = ['ops', 'super_admin']

/** A valid override needs an authorized role + a reason. The visa_approved clause is
 *  tighter: only super_admin may override it (the one clause with IRCA weight). */
export function validApplicationOverride(o: OverrideTicket | undefined, missing: GateKey[]): boolean {
  if (!o || !OVERRIDE_ROLES.includes(o.role) || o.reason.trim().length === 0) return false
  if (missing.includes('visa_approved') && o.role !== 'super_admin') return false
  return true
}

export interface GateEnforcement {
  allowed: boolean       // may proceed (gate ok, OR not enforcing, OR validly overridden)
  wouldBlock: boolean    // the gate actually failed
  shadow: boolean        // computing but not enforcing
  overridden: boolean
  result: ApplicationGateResult
}

const enforcing = (): boolean => process.env.APPLICATION_GATE_ENFORCE !== '0'

/** Evaluate the full (packet-aware) gate for a candidate × requisition (+ optional packet). */
export async function runApplicationGate(args: {
  candidate: FlorenceCandidate
  requisition: JobRequisition
  packet?: ApplicationPacket | null
  override?: OverrideTicket
  auditEntity?: string
}): Promise<GateEnforcement> {
  const { candidate, requisition, packet, override } = args
  const employer = await store.employers.get(requisition.employerId)
  const opportunityState = opportunityStateFor(
    { employerId: requisition.employerId },
    employer ? { integrationStatus: employer.integrationStatus, sourceChannel: employer.sourceChannel } : undefined,
  )
  const result = applicationGate({
    candidate,
    job: requisition,
    opportunityState,
    opts: {
      // QA approval is the human attestation that the packet (incl. documents) is
      // complete + shareable — documents_complete folds into it for this pass.
      packetQaApproved: packet ? (packet.status === 'ready_to_submit' || packet.humanQaStatus === 'approved') : false,
      documentsComplete: packet ? (packet.humanQaStatus === 'approved' || packet.documents.length > 0) : false,
      alreadySubmitted: packet?.status === 'submitted',
    },
  })
  const overridden = !result.ok && validApplicationOverride(override, result.missing)
  const allowed = result.ok || !enforcing() || overridden
  if (overridden) {
    audit('ops', 'application_gate_override', args.auditEntity ?? 'application', requisition.id,
      `${override!.role} ${override!.actor}: ${result.missing.join(',')} — ${override!.reason}`)
  } else if (!result.ok && enforcing()) {
    audit('system', 'application_gate_blocked', args.auditEntity ?? 'application', requisition.id,
      `${candidate.id}: ${result.status} (${result.missing.join(',')})`)
  }
  return { allowed, wouldBlock: !result.ok, shadow: !enforcing(), overridden, result }
}

/** Parse an override ticket from a request body (submit/lock routes). */
export function overrideFromBody(body: any, actorRole = 'ops', actor = 'ops'): OverrideTicket | undefined {
  if (!body?.override) return undefined
  const o = body.override
  return { actor: String(o.actor ?? actor), role: String(o.role ?? actorRole), reason: String(o.reason ?? '') }
}
