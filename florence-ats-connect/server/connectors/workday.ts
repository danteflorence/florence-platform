// ============================================================================
// Workday Recruiting connector — pull requisitions + submit candidate INTO Workday.
// OAuth2 refresh-token grant (the common ISU pattern) behind WORKDAY_* env; mock
// by default so the flow is demoable without a tenant. Live endpoints are
// tenant-specific (each customer's Workday config/security groups differ) and
// must be confirmed with the customer's Workday integration admin.
// ============================================================================
import type { EmployerAccount, JobRequisition, ApplicationPacket } from '../../shared/types'
import type { ATSConnector, ConnectionTestResult, PulledJob, SubmitResult } from './types'

const TENANT = process.env.WORKDAY_TENANT
const CLIENT_ID = process.env.WORKDAY_CLIENT_ID
const CLIENT_SECRET = process.env.WORKDAY_CLIENT_SECRET
const REFRESH = process.env.WORKDAY_REFRESH_TOKEN
const BASE = process.env.WORKDAY_BASE // e.g. https://wd2-impl-services1.workday.com
const isLive = Boolean(TENANT && CLIENT_ID && CLIENT_SECRET && REFRESH && BASE)

let cachedToken: { value: string; expiresAt: number } | null = null
async function token(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value
  const res = await fetch(`${BASE}/ccx/oauth2/${TENANT}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64') },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: REFRESH! }),
  })
  if (!res.ok) throw new Error(`Workday token failed: ${res.status} ${await res.text().catch(() => '')}`)
  const j = (await res.json()) as { access_token: string; expires_in?: number }
  cachedToken = { value: j.access_token, expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000 }
  return cachedToken.value
}

const MOCK_JOBS: PulledJob[] = [
  { atsRequisitionId: 'WD-REQ-3001', title: 'Registered Nurse — ICU', specialty: 'ICU', setting: 'inpatient', city: 'Oakland', state: 'CA', requiredLicenseState: 'CA', shift: 'night', employmentType: 'full_time', openings: 9, targetStartWindow: 'Q1 2027' },
  { atsRequisitionId: 'WD-REQ-3002', title: 'Registered Nurse — Emergency', specialty: 'Emergency', setting: 'inpatient', city: 'Sacramento', state: 'CA', requiredLicenseState: 'CA', shift: 'variable', employmentType: 'full_time', openings: 6, targetStartWindow: 'Q2 2027' },
  { atsRequisitionId: 'WD-REQ-3003', title: 'Registered Nurse — Med Surg', specialty: 'Med Surg', setting: 'inpatient', city: 'Fresno', state: 'CA', requiredLicenseState: 'CA', shift: 'day', employmentType: 'full_time', openings: 7, targetStartWindow: 'Q2 2027' },
]

export const workdayConnector: ATSConnector = {
  provider: 'workday',

  async testConnection(employer: EmployerAccount): Promise<ConnectionTestResult> {
    if (!isLive) return { ok: true, mode: 'mock', detail: 'Workday connector in MOCK mode — set WORKDAY_TENANT/CLIENT_ID/CLIENT_SECRET/REFRESH_TOKEN/BASE for live.' }
    await token()
    return { ok: true, mode: 'live', detail: `Authenticated to Workday tenant ${TENANT} for ${employer.name}.` }
  },

  async listJobs(_employer: EmployerAccount): Promise<PulledJob[]> {
    if (!isLive) return MOCK_JOBS
    const t = await token()
    const r = await fetch(`${BASE}/ccx/api/recruiting/v4/${TENANT}/jobRequisitions?status=Open`, { headers: { authorization: `Bearer ${t}` } })
    if (!r.ok) throw new Error(`Workday jobRequisitions failed: ${r.status}`)
    const data = (await r.json()) as { data?: any[] }
    return (data.data ?? []).slice(0, 100).map((d): PulledJob => ({
      atsRequisitionId: String(d.id ?? d.jobRequisitionId), atsJobUrl: d.externalUrl, title: d.jobPostingTitle ?? 'Registered Nurse',
      specialty: d.specialty, setting: 'inpatient', city: d.primaryLocation?.city, state: d.primaryLocation?.state,
      requiredLicenseState: d.primaryLocation?.state, openings: Number(d.numberOfOpenings ?? 1), targetStartWindow: undefined,
    }))
  },

  async submitCandidate({ packet, requisition, employer }: { packet: ApplicationPacket; requisition: JobRequisition; employer: EmployerAccount }): Promise<SubmitResult> {
    if (!isLive) {
      return { atsCandidateId: `WD-C-${packet.candidateId.slice(0, 8)}`, atsApplicationId: `WD-A-${packet.id.slice(0, 8)}`, status: 'submitted', atsStage: 'Review (Workday Recruiting)', detail: `Created Workday candidate + job application against ${requisition.atsRequisitionId ?? requisition.id} in ${employer.name} (MOCK).` }
    }
    const t = await token()
    const cand = await fetch(`${BASE}/ccx/api/recruiting/v4/${TENANT}/candidates`, {
      method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
      body: JSON.stringify({ source: 'FlorenceRN', readiness: packet.readinessPassport.readinessBand }),
    })
    if (!cand.ok) throw new Error(`Workday candidate create failed: ${cand.status}`)
    const candidateId = String(((await cand.json()) as any).id)
    const app = await fetch(`${BASE}/ccx/api/recruiting/v4/${TENANT}/jobRequisitions/${requisition.atsRequisitionId}/jobApplications`, {
      method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' }, body: JSON.stringify({ candidate: { id: candidateId } }),
    })
    if (!app.ok) throw new Error(`Workday application create failed: ${app.status}`)
    return { atsCandidateId: candidateId, atsApplicationId: String(((await app.json()) as any).id), status: 'submitted', atsStage: 'Review (Workday Recruiting)', detail: `Submitted to Workday tenant ${TENANT}.` }
  },

  async getApplicationStatus(): Promise<{ status: any; atsStage: string }> {
    return { status: 'received', atsStage: 'In Review (Workday)' }
  },
}
