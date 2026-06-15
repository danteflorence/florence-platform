// ============================================================================
// Oracle Taleo connector — pull requisitions + submit candidate INTO Taleo.
// Taleo auth is a login→sessionId pattern via the customer's dispatcher/host;
// modeled behind TALEO_* env, mock by default. Live calls require each customer's
// enabled Web Services framework + credentials.
// ============================================================================
import type { EmployerAccount, JobRequisition, ApplicationPacket } from '../../shared/types'
import type { ATSConnector, ConnectionTestResult, PulledJob, SubmitResult } from './types'

const COMPANY = process.env.TALEO_COMPANY_CODE
const USER = process.env.TALEO_USERNAME
const PASS = process.env.TALEO_PASSWORD
const BASE = process.env.TALEO_BASE // customer dispatcher/host, e.g. https://{host}.taleo.net
const isLive = Boolean(COMPANY && USER && PASS && BASE)

let session: { id: string; expiresAt: number } | null = null
async function login(): Promise<string> {
  if (session && session.expiresAt > Date.now() + 30_000) return session.id
  const r = await fetch(`${BASE}/ccx/services/rest/v1/login?orgCode=${COMPANY}&userName=${encodeURIComponent(USER!)}&password=${encodeURIComponent(PASS!)}`, { method: 'POST' })
  if (!r.ok) throw new Error(`Taleo login failed: ${r.status} ${await r.text().catch(() => '')}`)
  const j = (await r.json()) as { response?: { authToken?: string } }
  const id = j.response?.authToken
  if (!id) throw new Error('Taleo login returned no authToken')
  session = { id, expiresAt: Date.now() + 30 * 60 * 1000 }
  return id
}

// Taleo serves CommonSpirit (AZ) and HCA (CO/TX) in our seed — return
// employer-appropriate mock reqs so matches are sensible.
function mockJobs(employer: EmployerAccount): PulledJob[] {
  const base = (atsRequisitionId: string, title: string, specialty: string, city: string, state: string, openings: number): PulledJob =>
    ({ atsRequisitionId, title, specialty, setting: 'inpatient', city, state, requiredLicenseState: state, shift: 'variable', employmentType: 'full_time', openings, targetStartWindow: 'Q2 2027' })
  if (/commonspirit/i.test(employer.name)) return [base('TLO-REQ-4001', 'Registered Nurse — ICU', 'ICU', 'Phoenix', 'AZ', 6), base('TLO-REQ-4002', 'Registered Nurse — Med Surg', 'Med Surg', 'Chandler', 'AZ', 9)]
  if (/hca/i.test(employer.name)) return [base('TLO-REQ-5001', 'Registered Nurse — Emergency', 'Emergency', 'Denver', 'CO', 7), base('TLO-REQ-5002', 'Registered Nurse — Med Surg', 'Med Surg', 'Houston', 'TX', 8)]
  return [base('TLO-REQ-6001', 'Registered Nurse — Med Surg', 'Med Surg', 'Dallas', 'TX', 5)]
}

export const taleoConnector: ATSConnector = {
  provider: 'oracle_taleo',

  async testConnection(employer: EmployerAccount): Promise<ConnectionTestResult> {
    if (!isLive) return { ok: true, mode: 'mock', detail: 'Taleo connector in MOCK mode — set TALEO_COMPANY_CODE/USERNAME/PASSWORD/BASE for live.' }
    await login()
    return { ok: true, mode: 'live', detail: `Authenticated to Taleo org ${COMPANY} for ${employer.name}.` }
  },

  async listJobs(employer: EmployerAccount): Promise<PulledJob[]> {
    if (!isLive) return mockJobs(employer)
    const t = await login()
    const r = await fetch(`${BASE}/ccx/services/rest/v1/object/requisition/search?status=Open`, { headers: { cookie: `authToken=${t}` } })
    if (!r.ok) throw new Error(`Taleo requisition search failed: ${r.status}`)
    const data = (await r.json()) as { searchResults?: any[] }
    return (data.searchResults ?? []).slice(0, 100).map((d): PulledJob => ({
      atsRequisitionId: String(d.requisition?.contestNumber ?? d.id), title: d.requisition?.title ?? 'Registered Nurse', specialty: d.requisition?.specialty,
      setting: 'inpatient', city: d.requisition?.city, state: d.requisition?.state, requiredLicenseState: d.requisition?.state, openings: Number(d.requisition?.numberOfOpenings ?? 1), targetStartWindow: undefined,
    }))
  },

  async submitCandidate({ packet, requisition, employer }: { packet: ApplicationPacket; requisition: JobRequisition; employer: EmployerAccount }): Promise<SubmitResult> {
    if (!isLive) {
      return { atsCandidateId: `TLO-C-${packet.candidateId.slice(0, 8)}`, atsApplicationId: `TLO-A-${packet.id.slice(0, 8)}`, status: 'submitted', atsStage: 'New Submission (Taleo)', detail: `Created Taleo candidate + submission against ${requisition.atsRequisitionId ?? requisition.id} in ${employer.name} (MOCK).` }
    }
    const t = await login()
    const cand = await fetch(`${BASE}/ccx/services/rest/v1/object/candidate`, {
      method: 'POST', headers: { cookie: `authToken=${t}`, 'content-type': 'application/json' },
      body: JSON.stringify({ candidate: { source: 'FlorenceRN' } }),
    })
    if (!cand.ok) throw new Error(`Taleo candidate create failed: ${cand.status}`)
    const candidateId = String(((await cand.json()) as any).response?.id)
    const sub = await fetch(`${BASE}/ccx/services/rest/v1/object/candidate/${candidateId}/application`, {
      method: 'POST', headers: { cookie: `authToken=${t}`, 'content-type': 'application/json' }, body: JSON.stringify({ requisitionId: requisition.atsRequisitionId }),
    })
    if (!sub.ok) throw new Error(`Taleo application create failed: ${sub.status}`)
    return { atsCandidateId: candidateId, atsApplicationId: String(((await sub.json()) as any).response?.id), status: 'submitted', atsStage: 'New Submission (Taleo)', detail: `Submitted to Taleo org ${COMPANY}.` }
  },

  async getApplicationStatus(): Promise<{ status: any; atsStage: string }> {
    return { status: 'received', atsStage: 'New (Taleo)' }
  },
}
