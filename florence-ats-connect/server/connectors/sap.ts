// ============================================================================
// SAP SuccessFactors Recruiting connector — pull JobRequisition + submit
// Candidate/JobApplication via the OData v2 recruiting APIs (field-level perms
// apply per the job-requisition template). Mock by default; live behind
// SAP_SF_BASE / SAP_SF_USER / SAP_SF_PASS (OData Basic auth).
// ============================================================================
import type { EmployerAccount, JobRequisition, ApplicationPacket } from '../../shared/types'
import type { ATSConnector, ConnectionTestResult, PulledJob, SubmitResult } from './types'

const BASE = process.env.SAP_SF_BASE // e.g. https://api4.successfactors.com
const USER = process.env.SAP_SF_USER // user@companyId
const PASS = process.env.SAP_SF_PASS
const isLive = Boolean(BASE && USER && PASS)
const basic = () => 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64')

const MOCK_JOBS: PulledJob[] = [
  { atsRequisitionId: 'SF-REQ-8001', title: 'Registered Nurse — ICU', specialty: 'ICU', setting: 'inpatient', city: 'San Diego', state: 'CA', requiredLicenseState: 'CA', shift: 'night', employmentType: 'full_time', openings: 8, targetStartWindow: 'Q1 2027' },
  { atsRequisitionId: 'SF-REQ-8002', title: 'Registered Nurse — Dialysis', specialty: 'Dialysis', setting: 'outpatient', city: 'Orlando', state: 'FL', requiredLicenseState: 'FL', shift: 'day', employmentType: 'full_time', openings: 5, targetStartWindow: 'Q2 2027' },
]

export const sapConnector: ATSConnector = {
  provider: 'sap_successfactors',

  async testConnection(employer: EmployerAccount): Promise<ConnectionTestResult> {
    if (!isLive) return { ok: true, mode: 'mock', detail: 'SAP SuccessFactors connector in MOCK mode — set SAP_SF_BASE/USER/PASS for live OData.' }
    const r = await fetch(`${BASE}/odata/v2/JobRequisition?$top=1&$format=json`, { headers: { authorization: basic() } })
    if (!r.ok) throw new Error(`SAP SF auth failed: ${r.status}`)
    return { ok: true, mode: 'live', detail: `Authenticated to SAP SuccessFactors OData for ${employer.name}.` }
  },

  async listJobs(_employer: EmployerAccount): Promise<PulledJob[]> {
    if (!isLive) return MOCK_JOBS
    const r = await fetch(`${BASE}/odata/v2/JobRequisition?$filter=status eq 'Open'&$format=json`, { headers: { authorization: basic() } })
    if (!r.ok) throw new Error(`SAP SF JobRequisition failed: ${r.status}`)
    const data = (await r.json()) as { d?: { results?: any[] } }
    return (data.d?.results ?? []).slice(0, 100).map((d): PulledJob => ({
      atsRequisitionId: String(d.jobReqId), title: d.jobTitle ?? 'Registered Nurse', specialty: undefined, setting: 'inpatient',
      city: d.city, state: d.stateProvince, requiredLicenseState: d.stateProvince, openings: Number(d.numberOpenings ?? 1), targetStartWindow: undefined,
    }))
  },

  async submitCandidate({ packet, requisition, employer }: { packet: ApplicationPacket; requisition: JobRequisition; employer: EmployerAccount }): Promise<SubmitResult> {
    if (!isLive) {
      return { atsCandidateId: `SF-C-${packet.candidateId.slice(0, 8)}`, atsApplicationId: `SF-A-${packet.id.slice(0, 8)}`, status: 'submitted', atsStage: 'Default (SuccessFactors)', detail: `Created SuccessFactors Candidate + JobApplication for requisition ${requisition.atsRequisitionId ?? requisition.id} at ${employer.name} (MOCK).` }
    }
    const cand = await fetch(`${BASE}/odata/v2/Candidate`, { method: 'POST', headers: { authorization: basic(), 'content-type': 'application/json' }, body: JSON.stringify({ primaryEmail: 'candidate@florencern.com', source: 'FlorenceRN' }) })
    if (!cand.ok) throw new Error(`SAP SF Candidate create failed: ${cand.status}`)
    const candidateId = String(((await cand.json()) as any).d?.candidateId)
    const app = await fetch(`${BASE}/odata/v2/JobApplication`, { method: 'POST', headers: { authorization: basic(), 'content-type': 'application/json' }, body: JSON.stringify({ candidateId, jobReqId: requisition.atsRequisitionId }) })
    if (!app.ok) throw new Error(`SAP SF JobApplication failed: ${app.status}`)
    return { atsCandidateId: candidateId, atsApplicationId: String(((await app.json()) as any).d?.applicationId), status: 'submitted', atsStage: 'Default (SuccessFactors)', detail: 'Submitted via SuccessFactors OData.' }
  },

  async getApplicationStatus(): Promise<{ status: any; atsStage: string }> {
    return { status: 'received', atsStage: 'In Review (SuccessFactors)' }
  },
}
