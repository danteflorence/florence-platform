// ============================================================================
// Greenhouse connector — pull jobs (Job Board API) + submit candidate (Harvest /
// Candidate Ingestion API). Greenhouse is the most API-friendly ATS: the Harvest
// API's POST /v1/candidates is exactly the candidate-ingestion write we need.
// Mock by default; live submit behind GREENHOUSE_API_KEY (Harvest, Basic auth),
// jobs behind GREENHOUSE_BOARD_TOKEN (public board API).
// ============================================================================
import type { EmployerAccount, JobRequisition, ApplicationPacket, FlorenceCandidate } from '../../shared/types'
import type { ATSConnector, ConnectionTestResult, PulledJob, ResumeFile, SubmitResult } from './types'

const API_KEY = process.env.GREENHOUSE_API_KEY
const BOARD = process.env.GREENHOUSE_BOARD_TOKEN
const HARVEST = 'https://harvest.greenhouse.io'
const BOARDS = 'https://boards-api.greenhouse.io'
const isLive = Boolean(API_KEY)
const basic = () => 'Basic ' + Buffer.from(`${API_KEY}:`).toString('base64')

const MOCK_JOBS: PulledJob[] = [
  { atsRequisitionId: 'GH-REQ-7001', title: 'Registered Nurse — Ambulatory', specialty: 'Ambulatory', setting: 'clinic', city: 'Austin', state: 'TX', requiredLicenseState: 'TX', shift: 'day', employmentType: 'full_time', openings: 4, targetStartWindow: 'Q2 2027' },
  { atsRequisitionId: 'GH-REQ-7002', title: 'Registered Nurse — Med Surg', specialty: 'Med Surg', setting: 'inpatient', city: 'Brooklyn', state: 'NY', requiredLicenseState: 'NY', shift: 'night', employmentType: 'full_time', openings: 6, targetStartWindow: 'Q1 2027' },
]

export const greenhouseConnector: ATSConnector = {
  provider: 'greenhouse',

  async testConnection(employer: EmployerAccount): Promise<ConnectionTestResult> {
    if (!isLive) return { ok: true, mode: 'mock', detail: 'Greenhouse connector in MOCK mode — set GREENHOUSE_API_KEY (Harvest) and GREENHOUSE_BOARD_TOKEN for live.' }
    const r = await fetch(`${HARVEST}/v1/jobs?per_page=1`, { headers: { authorization: basic() } })
    if (!r.ok) throw new Error(`Greenhouse auth failed: ${r.status}`)
    return { ok: true, mode: 'live', detail: `Authenticated to Greenhouse Harvest for ${employer.name}.` }
  },

  async listJobs(_employer: EmployerAccount): Promise<PulledJob[]> {
    if (!isLive || !BOARD) return MOCK_JOBS
    const r = await fetch(`${BOARDS}/v1/boards/${BOARD}/jobs?content=true`)
    if (!r.ok) throw new Error(`Greenhouse board jobs failed: ${r.status}`)
    const data = (await r.json()) as { jobs?: any[] }
    return (data.jobs ?? []).slice(0, 100).map((j): PulledJob => ({
      atsRequisitionId: String(j.id), atsJobUrl: j.absolute_url, title: j.title ?? 'Registered Nurse', specialty: undefined,
      setting: 'inpatient', city: j.location?.name, state: undefined, requiredLicenseState: undefined, openings: 1, targetStartWindow: undefined,
    }))
  },

  async submitCandidate({ packet, requisition, employer, candidate, resume }: { packet: ApplicationPacket; requisition: JobRequisition; employer: EmployerAccount; candidate?: FlorenceCandidate | null; resume?: ResumeFile }): Promise<SubmitResult> {
    const full = (packet.sharedFields['fullName'] ?? candidate?.fullName ?? 'FlorenceRN Candidate').trim()
    const parts = full.split(/\s+/)
    const first = parts.length > 1 ? parts.slice(0, -1).join(' ') : full
    const last = parts.length > 1 ? parts[parts.length - 1]! : 'Candidate'
    if (!isLive) {
      return { atsCandidateId: `GH-C-${packet.candidateId.slice(0, 8)}`, atsApplicationId: `GH-A-${packet.id.slice(0, 8)}`, status: 'submitted', atsStage: 'Application Review (Greenhouse)', detail: `Created Greenhouse candidate ${first} ${last} + application on job ${requisition.atsRequisitionId ?? requisition.id} for ${employer.name}${resume ? ` with resume ${resume.filename}` : ''} (MOCK).` }
    }
    const email = packet.sharedFields['email'] ?? candidate?.email
    // Harvest Candidate Ingestion: POST /v1/candidates with applications[{job_id}]
    // + inline base64 resume attachment (Harvest accepts attachments[].content).
    const r = await fetch(`${HARVEST}/v1/candidates`, {
      method: 'POST', headers: { authorization: basic(), 'content-type': 'application/json', 'on-behalf-of': process.env.GREENHOUSE_USER_ID ?? '' },
      body: JSON.stringify({
        first_name: first, last_name: last,
        ...(email ? { email_addresses: [{ value: email, type: 'personal' }] } : {}),
        tags: ['FlorenceRN'],
        applications: [{ job_id: Number(requisition.atsRequisitionId) }],
        ...(resume ? { attachments: [{ filename: resume.filename, type: 'resume', content: resume.base64, content_type: resume.mime }] } : {}),
      }),
    })
    if (!r.ok) throw new Error(`Greenhouse candidate ingest failed: ${r.status}`)
    const d = (await r.json()) as any
    return { atsCandidateId: String(d.id), atsApplicationId: String(d.application_ids?.[0] ?? d.id), status: 'submitted', atsStage: 'Application Review (Greenhouse)', detail: 'Submitted via Greenhouse Harvest Candidate Ingestion.' }
  },

  async getApplicationStatus(): Promise<{ status: any; atsStage: string }> {
    return { status: 'received', atsStage: 'Application Review (Greenhouse)' }
  },
}
