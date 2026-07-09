// SmartRecruiters Posting API — public (api.smartrecruiters.com/v1/companies/<id>/postings).
// Mock-by-default. Compliance-equal to the other public APIs (no scraping).
import type { DemandSource } from '../../../shared/demand-types'
import type { JobSourceConnector, PullResult } from './types'
import type { IngestRow } from '../../demand/ingest'

const MOCK: IngestRow[] = [
  { employerName: 'Sample Health (SR)', title: 'Registered Nurse — PCU', city: 'Chicago', state: 'IL', atsRequisitionId: 'SR-4001', sourceUrl: 'https://jobs.smartrecruiters.com/sample/4001', description: 'Progressive care. $40-$54 per hour. Health insurance, PTO, tuition reimbursement.' },
  { employerName: 'Sample Health (SR)', title: 'RN, Operating Room', city: 'Chicago', state: 'IL', atsRequisitionId: 'SR-4002', sourceUrl: 'https://jobs.smartrecruiters.com/sample/4002' },
  { employerName: 'Sample Health (SR)', title: 'HR Business Partner', city: 'Chicago', state: 'IL', atsRequisitionId: 'SR-4003' }, // non-RN → filtered
]

export const smartRecruitersConnector: JobSourceConnector = {
  sourceType: 'smartrecruiters',
  connectionType: 'public_api',
  async test(source) {
    const id = (source.baseUrl ?? '').trim()
    return id ? { ok: true, mode: 'live', note: `Would query SmartRecruiters company ${id}.` } : { ok: true, mode: 'mock', note: 'No company id (source.baseUrl) — mock mode.' }
  },
  async listJobs(source: DemandSource): Promise<PullResult> {
    const id = (source.baseUrl ?? '').trim()
    if (!id) return { rows: MOCK, mode: 'mock', note: 'No company id (source.baseUrl) — returning sample jobs.' }
    const r = await fetch(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(id)}/postings?limit=100`)
    if (!r.ok) throw new Error(`SmartRecruiters ${id}: ${r.status}`)
    const data = (await r.json()) as { content?: any[] }
    const rows: IngestRow[] = (data.content ?? []).map((j) => ({
      employerName: source.name,
      title: String(j.name ?? 'Registered Nurse'),
      city: j.location?.city,
      state: j.location?.region,
      atsRequisitionId: String(j.id ?? j.refNumber),
      sourceUrl: j.applyUrl ?? j.ref,
      raw: j,
    }))
    return { rows, mode: 'live', note: `SmartRecruiters ${id}: ${rows.length} postings.` }
  },
}
