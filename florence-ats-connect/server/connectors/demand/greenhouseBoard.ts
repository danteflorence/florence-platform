// Greenhouse Job Board API — public, no auth. A board token (stored as the
// source's baseUrl) returns published jobs as JSON. Mock-by-default so the whole
// pull → normalize → dedup flow is demoable without a real board.
import type { DemandSource } from '../../../shared/demand-types'
import type { DemandSourceConnector, PullResult } from './types'
import type { IngestRow } from '../../demand/ingest'

const MOCK: IngestRow[] = [
  { employerName: 'Sample Health (GH)', title: 'Registered Nurse — Med Surg', city: 'Austin', state: 'TX', atsRequisitionId: 'GH-1001', sourceUrl: 'https://boards.greenhouse.io/sample/jobs/1001' },
  { employerName: 'Sample Health (GH)', title: 'RN, ICU', city: 'Austin', state: 'TX', atsRequisitionId: 'GH-1002', sourceUrl: 'https://boards.greenhouse.io/sample/jobs/1002' },
  { employerName: 'Sample Health (GH)', title: 'Recruiting Coordinator', city: 'Austin', state: 'TX', atsRequisitionId: 'GH-1003' }, // non-RN → filtered downstream
]

export const greenhouseBoardConnector: DemandSourceConnector = {
  sourceType: 'greenhouse_board',
  async listJobs(source: DemandSource): Promise<PullResult> {
    const token = (source.baseUrl ?? '').trim()
    if (!token) return { rows: MOCK, mode: 'mock', note: 'No board token (source.baseUrl) — returning sample jobs.' }
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`
    const r = await fetch(url)
    if (!r.ok) throw new Error(`Greenhouse board ${token}: ${r.status}`)
    const data = (await r.json()) as { jobs?: any[] }
    const rows: IngestRow[] = (data.jobs ?? []).map((j) => ({
      employerName: source.name,
      title: String(j.title ?? 'Registered Nurse'),
      city: j.location?.name ? String(j.location.name).split(',')[0]?.trim() : undefined,
      state: j.location?.name,
      atsRequisitionId: String(j.id),
      sourceUrl: j.absolute_url,
      raw: j,
    }))
    return { rows, mode: 'live', note: `Greenhouse board ${token}: ${rows.length} jobs.` }
  },
}
