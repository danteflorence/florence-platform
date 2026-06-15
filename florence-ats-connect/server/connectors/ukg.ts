// ============================================================================
// UKG Pro Recruiting connector — pull requisitions + submit candidate. UKG
// deployments vary, so live access is customer-specific (configured through the
// customer's UKG admin). Mock by default; live behind UKG_BASE / UKG_CLIENT_ID /
// UKG_CLIENT_SECRET (OAuth2 client-credentials).
// ============================================================================
import type { EmployerAccount, JobRequisition, ApplicationPacket } from '../../shared/types'
import type { ATSConnector, ConnectionTestResult, PulledJob, SubmitResult } from './types'

const BASE = process.env.UKG_BASE
const CLIENT_ID = process.env.UKG_CLIENT_ID
const CLIENT_SECRET = process.env.UKG_CLIENT_SECRET
const isLive = Boolean(BASE && CLIENT_ID && CLIENT_SECRET)

let cachedToken: { value: string; expiresAt: number } | null = null
async function token(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value
  const res = await fetch(`${BASE}/oauth/token`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: CLIENT_ID!, client_secret: CLIENT_SECRET! }),
  })
  if (!res.ok) throw new Error(`UKG token failed: ${res.status}`)
  const j = (await res.json()) as { access_token: string; expires_in?: number }
  cachedToken = { value: j.access_token, expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000 }
  return cachedToken.value
}

const MOCK_JOBS: PulledJob[] = [
  { atsRequisitionId: 'UKG-REQ-9101', title: 'Registered Nurse — Emergency', specialty: 'Emergency', setting: 'inpatient', city: 'Colorado Springs', state: 'CO', requiredLicenseState: 'CO', shift: 'variable', employmentType: 'full_time', openings: 5, targetStartWindow: 'Q2 2027' },
  { atsRequisitionId: 'UKG-REQ-9102', title: 'Registered Nurse — Med Surg', specialty: 'Med Surg', setting: 'inpatient', city: 'Tucson', state: 'AZ', requiredLicenseState: 'AZ', shift: 'day', employmentType: 'full_time', openings: 7, targetStartWindow: 'Q1 2027' },
]

export const ukgConnector: ATSConnector = {
  provider: 'ukg_pro',

  async testConnection(employer: EmployerAccount): Promise<ConnectionTestResult> {
    if (!isLive) return { ok: true, mode: 'mock', detail: 'UKG connector in MOCK mode — set UKG_BASE/CLIENT_ID/CLIENT_SECRET for live (deployment-specific).' }
    await token()
    return { ok: true, mode: 'live', detail: `Authenticated to UKG for ${employer.name}.` }
  },

  async listJobs(_employer: EmployerAccount): Promise<PulledJob[]> {
    if (!isLive) return MOCK_JOBS
    const t = await token()
    const r = await fetch(`${BASE}/recruiting/v1/requisitions?status=Open`, { headers: { authorization: `Bearer ${t}` } })
    if (!r.ok) throw new Error(`UKG requisitions failed: ${r.status}`)
    const data = (await r.json()) as { requisitions?: any[] }
    return (data.requisitions ?? []).slice(0, 100).map((d): PulledJob => ({
      atsRequisitionId: String(d.requisitionId ?? d.id), title: d.title ?? 'Registered Nurse', specialty: undefined, setting: 'inpatient',
      city: d.city, state: d.state, requiredLicenseState: d.state, openings: Number(d.openings ?? 1), targetStartWindow: undefined,
    }))
  },

  async submitCandidate({ packet, requisition, employer }: { packet: ApplicationPacket; requisition: JobRequisition; employer: EmployerAccount }): Promise<SubmitResult> {
    if (!isLive) {
      return { atsCandidateId: `UKG-C-${packet.candidateId.slice(0, 8)}`, atsApplicationId: `UKG-A-${packet.id.slice(0, 8)}`, status: 'submitted', atsStage: 'New (UKG Recruiting)', detail: `Created UKG candidate + application against ${requisition.atsRequisitionId ?? requisition.id} for ${employer.name} (MOCK).` }
    }
    const t = await token()
    const r = await fetch(`${BASE}/recruiting/v1/candidates`, { method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' }, body: JSON.stringify({ source: 'FlorenceRN', requisitionId: requisition.atsRequisitionId }) })
    if (!r.ok) throw new Error(`UKG candidate create failed: ${r.status}`)
    const d = (await r.json()) as any
    return { atsCandidateId: String(d.candidateId), atsApplicationId: String(d.applicationId ?? d.candidateId), status: 'submitted', atsStage: 'New (UKG Recruiting)', detail: 'Submitted via UKG Recruiting API.' }
  },

  async getApplicationStatus(): Promise<{ status: any; atsStage: string }> {
    return { status: 'received', atsStage: 'New (UKG Recruiting)' }
  },
}
