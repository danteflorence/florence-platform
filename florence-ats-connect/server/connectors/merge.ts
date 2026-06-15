// ============================================================================
// Merge.dev unified-ATS connector — the breadth lane. ONE integration gives every
// employer a self-serve "Connect your ATS" via Merge Link across 50+ ATSs
// (incl. all six of ours), read + write. The per-employer Merge `account_token`
// is stored encrypted (vault) on the employer's AtsConnection and resolved here.
//
// Mock-by-default (no MERGE_API_KEY) like the native connectors, so the whole
// self-serve flow is demoable without a Merge account. Live calls use Merge's
// org API key (Bearer) + the account token (X-Account-Token).
// ============================================================================
import type { EmployerAccount, JobRequisition, ApplicationPacket, FlorenceCandidate } from '../../shared/types'
import type { ATSConnector, ConnectionTestResult, PulledJob, ResumeFile, SubmitResult } from './types'
import { store } from '../db'
import { decryptSecret } from '../vault'

/** Split a full name for ATS first/last fields (last word = family name). */
function splitName(c?: FlorenceCandidate | null, packet?: ApplicationPacket): { first: string; last: string } {
  const full = (packet?.sharedFields['fullName'] ?? c?.fullName ?? 'FlorenceRN Candidate').trim()
  const parts = full.split(/\s+/)
  if (parts.length === 1) return { first: parts[0]!, last: 'Candidate' }
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1]! }
}

const API_KEY = process.env.MERGE_API_KEY
const ATS_BASE = process.env.MERGE_ATS_BASE ?? 'https://api.merge.dev/api/ats/v1'
const LINK_BASE = process.env.MERGE_LINK_BASE ?? 'https://api.merge.dev/api/integrations'
const isLive = Boolean(API_KEY)

/** Resolve the employer's stored Merge account token (decrypted). */
async function accountToken(employerId: string): Promise<string | null> {
  const conn = (await store.connections.byEmployer(employerId)).find((c) => c.provider === 'merge' && c.status === 'active')
  if (!conn) return null
  const enc = await store.connections.secret(conn.id)
  return enc ? decryptSecret(enc) : null
}
const headers = (token: string) => ({ authorization: `Bearer ${API_KEY}`, 'X-Account-Token': token, 'content-type': 'application/json' })

const MOCK_JOBS: PulledJob[] = [
  { atsRequisitionId: 'MERGE-REQ-1001', title: 'Registered Nurse — Med Surg', specialty: 'Med Surg', setting: 'inpatient', city: 'Austin', state: 'TX', requiredLicenseState: 'TX', shift: 'night', employmentType: 'full_time', openings: 5, targetStartWindow: 'Q2 2027' },
  { atsRequisitionId: 'MERGE-REQ-1002', title: 'Registered Nurse — ICU', specialty: 'ICU', setting: 'inpatient', city: 'Oakland', state: 'CA', requiredLicenseState: 'CA', shift: 'variable', employmentType: 'full_time', openings: 4, targetStartWindow: 'Q1 2027' },
]

export const mergeConnector: ATSConnector = {
  provider: 'merge',

  async testConnection(employer: EmployerAccount): Promise<ConnectionTestResult> {
    if (!isLive) return { ok: true, mode: 'mock', detail: 'Merge in MOCK mode — set MERGE_API_KEY for live unified-API connect.' }
    const token = await accountToken(employer.id)
    if (!token) return { ok: false, mode: 'live', detail: 'No Merge account token for this employer.' }
    return { ok: true, mode: 'live', detail: `Merge unified ATS linked for ${employer.name}.` }
  },

  async listJobs(employer: EmployerAccount): Promise<PulledJob[]> {
    if (!isLive) return MOCK_JOBS
    const token = await accountToken(employer.id)
    if (!token) throw new Error('No Merge account token for employer')
    const r = await fetch(`${ATS_BASE}/jobs?status=OPEN`, { headers: headers(token) })
    if (!r.ok) throw new Error(`Merge jobs failed: ${r.status}`)
    const data = (await r.json()) as { results?: any[] }
    return (data.results ?? []).slice(0, 200).map((j): PulledJob => ({
      atsRequisitionId: String(j.id), atsJobUrl: j.url, title: j.name ?? 'Registered Nurse', specialty: undefined,
      setting: 'inpatient', city: j.offices?.[0]?.city, state: undefined, requiredLicenseState: undefined,
      openings: Number(j.number_of_openings ?? 1), targetStartWindow: undefined,
    }))
  },

  async submitCandidate({ packet, requisition, employer, candidate, resume }: { packet: ApplicationPacket; requisition: JobRequisition; employer: EmployerAccount; candidate?: FlorenceCandidate | null; resume?: ResumeFile }): Promise<SubmitResult> {
    const { first, last } = splitName(candidate, packet)
    if (!isLive) {
      return { atsCandidateId: `MERGE-C-${packet.candidateId.slice(0, 8)}`, atsApplicationId: `MERGE-A-${packet.id.slice(0, 8)}`, status: 'submitted', atsStage: 'Submitted (via Merge)', detail: `Created candidate ${first} ${last} + application via Merge unified API for ${employer.name}${resume ? ` with resume ${resume.filename}` : ''} (MOCK).` }
    }
    const token = await accountToken(employer.id)
    if (!token) throw new Error('No Merge account token for employer')
    const email = packet.sharedFields['email'] ?? candidate?.email
    const cand = await fetch(`${ATS_BASE}/candidates`, {
      method: 'POST', headers: headers(token),
      body: JSON.stringify({ model: { first_name: first, last_name: last, ...(email ? { email_addresses: [{ value: email, email_address_type: 'PERSONAL' }] } : {}), tags: ['FlorenceRN'] } }),
    })
    if (!cand.ok) throw new Error(`Merge candidate create failed: ${cand.status}`)
    const candidateId = String(((await cand.json()) as any).model?.id)
    const app = await fetch(`${ATS_BASE}/applications`, { method: 'POST', headers: headers(token), body: JSON.stringify({ model: { candidate: candidateId, job: requisition.atsRequisitionId, source: 'FlorenceRN' } }) })
    if (!app.ok) throw new Error(`Merge application create failed: ${app.status}`)
    // Attach the resume by public URL (Merge ingests attachments via file_url).
    let attachNote = ''
    if (resume?.url) {
      const att = await fetch(`${ATS_BASE}/attachments`, {
        method: 'POST', headers: headers(token),
        body: JSON.stringify({ model: { candidate: candidateId, file_name: resume.filename, file_url: resume.url, attachment_type: 'RESUME' } }),
      })
      attachNote = att.ok ? ' Resume attached.' : ` (resume attach failed: ${att.status})`
    }
    return { atsCandidateId: candidateId, atsApplicationId: String(((await app.json()) as any).model?.id), status: 'submitted', atsStage: 'Submitted (via Merge)', detail: `Submitted via Merge unified ATS API.${attachNote}` }
  },

  async getApplicationStatus(): Promise<{ status: any; atsStage: string }> {
    return { status: 'received', atsStage: 'In Review (via Merge)' }
  },
}

// --- Merge Link (the embedded "Connect your ATS" handshake) ----------------

/** Create a Merge Link token for the employer to open the embedded widget. */
export async function createMergeLinkToken(employer: { id: string; name: string }): Promise<{ linkToken: string; mode: 'live' | 'mock' }> {
  if (!isLive) return { linkToken: `mock-link-${employer.id}`, mode: 'mock' }
  const r = await fetch(`${LINK_BASE}/create-link-token`, {
    method: 'POST', headers: { authorization: `Bearer ${API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ end_user_origin_id: employer.id, end_user_organization_name: employer.name, end_user_email_address: `connect+${employer.id}@florencern.com`, categories: ['ats'] }),
  })
  if (!r.ok) throw new Error(`Merge create-link-token failed: ${r.status}`)
  return { linkToken: String(((await r.json()) as any).link_token), mode: 'live' }
}

/** Exchange the Link public token (from the widget) for a durable account token. */
export async function exchangeMergePublicToken(publicToken: string): Promise<{ accountToken: string; accountId: string; mode: 'live' | 'mock' }> {
  if (!isLive) return { accountToken: `mock-acct-${publicToken}`, accountId: `mock-int-${publicToken.slice(0, 8)}`, mode: 'mock' }
  const r = await fetch(`${LINK_BASE}/account-token/${publicToken}`, { headers: { authorization: `Bearer ${API_KEY}` } })
  if (!r.ok) throw new Error(`Merge account-token exchange failed: ${r.status}`)
  const j = (await r.json()) as any
  return { accountToken: String(j.account_token), accountId: String(j.integration?.id ?? ''), mode: 'live' }
}
