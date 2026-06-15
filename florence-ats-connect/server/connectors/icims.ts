// ============================================================================
// iCIMS connector — first native integration.
//
// Pull pattern is modeled on the OAuth2 client already proven in florenceos
// (token + customer-scoped endpoints + paginated job search). The NEW capability
// is submitCandidate(): create a Person via the Profiles API and an application
// against the requisition's workflow — the write nobody had built.
//
// Runs in MOCK mode unless ICIMS_CLIENT_ID / ICIMS_CLIENT_SECRET / ICIMS_CUSTOMER_ID
// are set, so the whole flow is demoable end-to-end without a live tenant. The
// live HTTP paths are present and clearly marked; they require a real sandbox to
// exercise (each customer's iCIMS config/permissions differ).
// ============================================================================
import type { EmployerAccount, JobRequisition, ApplicationPacket } from '../../shared/types'
import type { ATSConnector, ConnectionTestResult, PulledJob, SubmitResult } from './types'

const CLIENT_ID = process.env.ICIMS_CLIENT_ID
const CLIENT_SECRET = process.env.ICIMS_CLIENT_SECRET
const CUSTOMER_ID = process.env.ICIMS_CUSTOMER_ID
const BASE = process.env.ICIMS_BASE ?? 'https://api.icims.com'
const isLive = Boolean(CLIENT_ID && CLIENT_SECRET && CUSTOMER_ID)

let cachedToken: { value: string; expiresAt: number } | null = null

async function token(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value
  // iCIMS OAuth2 client-credentials. (Live only.)
  const res = await fetch(`${BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: CLIENT_ID!, client_secret: CLIENT_SECRET! }),
  })
  if (!res.ok) throw new Error(`iCIMS token failed: ${res.status} ${await res.text().catch(() => '')}`)
  const j = (await res.json()) as { access_token: string; expires_in?: number }
  cachedToken = { value: j.access_token, expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000 }
  return cachedToken.value
}

// Deterministic mock ids so repeated runs are stable and traceable.
const mockPersonId = (p: ApplicationPacket) => `ICIMS-P-${p.candidateId.slice(0, 8)}`
const mockAppId = (p: ApplicationPacket) => `ICIMS-A-${p.id.slice(0, 8)}`

const MOCK_JOBS: PulledJob[] = [
  { atsRequisitionId: 'ICIMS-REQ-9001', title: 'Registered Nurse — Telemetry', specialty: 'Telemetry', setting: 'inpatient', city: 'Detroit', state: 'MI', requiredLicenseState: 'MI', shift: 'night', employmentType: 'full_time', openings: 5, targetStartWindow: 'Q2 2027' },
  { atsRequisitionId: 'ICIMS-REQ-9002', title: 'Registered Nurse — PACU', specialty: 'Periop', setting: 'outpatient', city: 'Detroit', state: 'MI', requiredLicenseState: 'MI', shift: 'day', employmentType: 'full_time', openings: 3, targetStartWindow: 'Q3 2027' },
  { atsRequisitionId: 'ICIMS-REQ-9003', title: 'Registered Nurse — Med Surg', specialty: 'Med Surg', setting: 'inpatient', city: 'Miami', state: 'FL', requiredLicenseState: 'FL', shift: 'variable', employmentType: 'full_time', openings: 8, targetStartWindow: 'Q1 2027' },
]

export const icimsConnector: ATSConnector = {
  provider: 'icims',

  async testConnection(employer: EmployerAccount): Promise<ConnectionTestResult> {
    if (!isLive) return { ok: true, mode: 'mock', detail: 'iCIMS connector in MOCK mode — set ICIMS_CLIENT_ID/SECRET/CUSTOMER_ID for live.' }
    await token()
    return { ok: true, mode: 'live', detail: `Authenticated to iCIMS customer ${CUSTOMER_ID} for ${employer.name}.` }
  },

  async listJobs(employer: EmployerAccount): Promise<PulledJob[]> {
    if (!isLive) return MOCK_JOBS
    // LIVE: search open RN reqs, then hydrate. (Endpoint/field mapping is tenant-specific.)
    const t = await token()
    const search = await fetch(`${BASE}/customers/${CUSTOMER_ID}/search/jobs`, {
      method: 'POST',
      headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
      body: JSON.stringify({ filters: [{ name: 'jobs.status', value: ['Open'] }, { name: 'jobs.joblicensetype', value: ['RN'] }] }),
    })
    if (!search.ok) throw new Error(`iCIMS job search failed: ${search.status}`)
    const ids = ((await search.json()) as { searchResults?: { id: string }[] }).searchResults ?? []
    const jobs: PulledJob[] = []
    for (const { id } of ids.slice(0, 100)) {
      const r = await fetch(`${BASE}/customers/${CUSTOMER_ID}/jobs/${id}`, { headers: { authorization: `Bearer ${t}` } })
      if (!r.ok) continue
      const d = (await r.json()) as any
      jobs.push({
        atsRequisitionId: String(d.jobid ?? id), atsJobUrl: d.joburl, title: d.jobtitle ?? 'Registered Nurse',
        specialty: d.specialty, setting: 'inpatient', city: d.city, state: d.state,
        requiredLicenseState: d.state, openings: Number(d.numberofpositions ?? 1), targetStartWindow: undefined,
      })
    }
    return jobs
  },

  async submitCandidate({ packet, requisition, employer }: { packet: ApplicationPacket; requisition: JobRequisition; employer: EmployerAccount }): Promise<SubmitResult> {
    if (!isLive) {
      return {
        atsCandidateId: mockPersonId(packet),
        atsApplicationId: mockAppId(packet),
        status: 'submitted',
        atsStage: 'New Submission (iCIMS)',
        detail: `Created iCIMS person + application against ${requisition.atsRequisitionId ?? requisition.id} in ${employer.name} (MOCK).`,
      }
    }
    // LIVE: create/find Person via Profiles API, then create the application.
    const t = await token()
    const person = await fetch(`${BASE}/customers/${CUSTOMER_ID}/people`, {
      method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
      // Data-minimized: only the consent-approved, role-relevant fields (no nationality/visa).
      body: JSON.stringify({
        firstname: packet.readinessPassport.shareableSummaryText.slice(0, 1),
        sourcename: 'FlorenceRN', readiness: packet.readinessPassport.readinessBand,
      }),
    })
    if (!person.ok) throw new Error(`iCIMS person create failed: ${person.status}`)
    const personId = String(((await person.json()) as any).id)
    const app = await fetch(`${BASE}/customers/${CUSTOMER_ID}/applicantworkflows`, {
      method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
      body: JSON.stringify({ profile: { id: personId }, job: { id: requisition.atsRequisitionId }, status: { id: 'C2' } }),
    })
    if (!app.ok) throw new Error(`iCIMS application create failed: ${app.status}`)
    const appId = String(((await app.json()) as any).id)
    return { atsCandidateId: personId, atsApplicationId: appId, status: 'submitted', atsStage: 'New Submission (iCIMS)', detail: `Submitted to iCIMS customer ${CUSTOMER_ID}.` }
  },

  async getApplicationStatus(atsApplicationId: string): Promise<{ status: any; atsStage: string }> {
    if (!isLive) return { status: 'received', atsStage: 'Under Review (iCIMS)' }
    const t = await token()
    const r = await fetch(`${BASE}/customers/${CUSTOMER_ID}/applicantworkflows/${atsApplicationId}`, { headers: { authorization: `Bearer ${t}` } })
    if (!r.ok) throw new Error(`iCIMS status fetch failed: ${r.status}`)
    const d = (await r.json()) as any
    return { status: 'received', atsStage: d?.status?.value ?? 'Under Review (iCIMS)' }
  },
}
