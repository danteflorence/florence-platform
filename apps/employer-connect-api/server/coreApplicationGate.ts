import type { ApplicationGateResult, GateKey } from '../shared/applicationGate'
import type { ApplicationPacket, FlorenceCandidate, JobRequisition } from '../shared/types'
import type { SubmissionChannel } from '../shared/vms-types'

const coreUrl = (process.env.CORE_ISSUER_URL ?? process.env.PUBLIC_CORE_URL ?? 'http://id.lvh.me:8080').replace(/\/$/, '')
const clientId = process.env.FLORENCE_CORE_CLIENT_ID ?? ''
const clientSecret = process.env.FLORENCE_CORE_CLIENT_SECRET ?? ''
const scope = process.env.CORE_APPLICATION_GATE_SCOPE
  ?? 'applications:eligibility applications:submit passport:read passport:write consent:read'

export const coreApplicationGateEnabled = Boolean(clientId && clientSecret)
export const coreApplicationGateRequired = process.env.CORE_APPLICATION_GATE_REQUIRED === '1' || process.env.NODE_ENV === 'production'

let token = ''
let tokenExp = 0

async function getToken(): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000)
  if (token && nowSec < tokenExp - 30) return token
  const res = await fetch(`${coreUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, scope }),
  })
  if (!res.ok) throw new Error(`Core token failed (${res.status})`)
  const json = await res.json() as { access_token: string; expires_in?: number }
  token = json.access_token
  tokenExp = nowSec + (json.expires_in ?? 3600)
  return token
}

async function corePost(path: string, body: unknown): Promise<{ ok: boolean; status: number; json: any }> {
  const auth = await getToken()
  const res = await fetch(`${coreUrl}${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${auth}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : null
  return { ok: res.ok, status: res.status, json }
}

async function coreCall(path: string, body: unknown): Promise<unknown> {
  const response = await corePost(path, body)
  if (!response.ok) throw new Error(`Core ${path} failed (${response.status})`)
  return response.json
}

async function resolveCoreNurseId(candidate: FlorenceCandidate): Promise<string> {
  const ref = { app: 'ats', externalId: candidate.sourceCandidateId ?? candidate.id }
  const resolved = await coreCall('/v1/nurse/resolve', {
    ...(candidate.email ? { email: candidate.email } : {}),
    name: candidate.fullName,
    ref,
  }) as { nurseId?: string }
  if (!resolved.nurseId) throw new Error('Core nurse resolve returned no nurseId')
  return resolved.nurseId
}

export interface CoreGateCheckArgs {
  candidate: FlorenceCandidate
  requisition: JobRequisition
  packet?: ApplicationPacket | null
  action: 'gate_check' | 'submission_attempt' | 'packet_release' | 'profile_release' | 'slate_lock'
  channel?: SubmissionChannel
  programId?: string
}

export interface CoreGateDecision {
  checked: boolean
  ok: boolean
  status?: string
  failureCodes?: string[]
  reasons?: string[]
  subjectTo?: string[]
  subjectToMessage?: string
  submissionLockId?: string
  error?: string
}

function coreAction(action: CoreGateCheckArgs['action']): string {
  if (action === 'packet_release' || action === 'profile_release') return 'release_employer_packet'
  if (action === 'slate_lock') return 'submit_application'
  return 'submit_application'
}

async function coreGateBody(args: CoreGateCheckArgs): Promise<Record<string, unknown>> {
  const nurseId = await resolveCoreNurseId(args.candidate)
  return {
    nurseId,
    employerId: args.requisition.employerId,
    programId: args.programId ?? args.packet?.programId,
    jobRequisitionId: args.requisition.id,
    jobStatus: args.requisition.status,
    requiredLicenseState: args.requisition.requiredLicenseState ?? args.requisition.state,
    channel: args.channel ?? (args.requisition.sourceChannel === 'amn' ? 'amn' : 'ats'),
    action: coreAction(args.action),
  }
}

export async function checkCoreApplicationGate(args: CoreGateCheckArgs): Promise<CoreGateDecision> {
  if (!coreApplicationGateEnabled) {
    return coreApplicationGateRequired
      ? { checked: true, ok: false, error: 'Core Application Gate credentials are required.' }
      : { checked: false, ok: true }
  }
  try {
    const body = await coreGateBody(args)
    const response = await coreCall('/v1/application-gate/check', body) as { gate?: { ok?: boolean; status?: string; failureCodes?: string[]; reasons?: string[]; subjectTo?: string[]; subjectToMessage?: string } }
    const gate = response.gate ?? {}
    return {
      checked: true,
      ok: gate.ok === true,
      status: gate.status,
      failureCodes: gate.failureCodes,
      reasons: gate.reasons,
      subjectTo: gate.subjectTo,
      subjectToMessage: gate.subjectToMessage,
    }
  } catch (error) {
    return { checked: true, ok: false, error: 'core_application_gate_unavailable' }
  }
}

export async function submitThroughCoreApplicationGate(args: CoreGateCheckArgs): Promise<CoreGateDecision> {
  if (!coreApplicationGateEnabled) {
    return coreApplicationGateRequired
      ? { checked: true, ok: false, error: 'Core Application Gate credentials are required.' }
      : { checked: false, ok: true }
  }
  try {
    const body = await coreGateBody({ ...args, action: 'submission_attempt' })
    const response = await corePost('/v1/applications/submit', body)
    const gate = response.json?.gate ?? {}
    return {
      checked: true,
      ok: response.ok && (response.json?.ok === true || gate.ok === true),
      status: gate.status,
      failureCodes: gate.failureCodes,
      reasons: gate.reasons,
      subjectTo: gate.subjectTo,
      subjectToMessage: gate.subjectToMessage,
      submissionLockId: response.json?.submissionLockId,
      ...(!response.ok ? { error: 'core_application_gate_rejected' } : {}),
    }
  } catch (error) {
    return { checked: true, ok: false, error: 'core_application_gate_unavailable' }
  }
}

const FAILURE_TO_LOCAL: Record<string, GateKey> = {
  missing_consent: 'employer_share_consent',
  work_authorization_pending: 'visa_approved',
  license_pending: 'license_verified_active',
  packet_qa_pending: 'employer_packet_qa_approved',
  job_not_active: 'job_open',
  workflow_unauthorized: 'channel_authorized',
  duplicate_submission_lock: 'duplicate_submission_lock_clear',
  packet_not_minimized: 'data_minimized_packet_generated',
}

export function mergeCoreGateResult(local: ApplicationGateResult, core: CoreGateDecision): ApplicationGateResult {
  if (!core.checked || core.ok) return local
  const coreMissing: GateKey[] = (core.failureCodes ?? []).map((code) => FAILURE_TO_LOCAL[code] ?? 'core_application_gate')
  const coreFallback: GateKey[] = coreMissing.length ? [] : ['core_application_gate']
  const missing = [...new Set<GateKey>([...local.missing, ...coreMissing, ...coreFallback])]
  const reasons = [
    ...local.reasons,
    ...(core.reasons?.length ? core.reasons.map((reason) => `Core Application Gate: ${reason}`) : [`Core Application Gate: ${core.error ?? core.status ?? 'not cleared'}`]),
  ]
  return {
    ...local,
    ok: false,
    status: local.status === 'ready_to_submit' || local.status === 'submitted' ? 'not_ready' : local.status,
    allowedAction: 'express_interest',
    missing,
    reasons,
    ...(core.subjectTo?.length ? { subjectTo: core.subjectTo } : {}),
    ...(core.subjectToMessage ? { subjectToMessage: core.subjectToMessage } : {}),
  }
}
