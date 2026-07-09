// Partner feed — the cleanest, most-permissioned source (AMN account book or an
// employer-supplied feed). Mock-by-default; a live feed URL (source.baseUrl) is
// fetched and parsed as CSV or JSON. Flows through the standard ingest → normalize
// → dedup path with no special-casing.
import type { DemandSource } from '../../../shared/demand-types'
import type { DemandSourceConnector, PullResult } from './types'
import { rowsFromCsv, type IngestRow } from '../../demand/ingest'

const MOCK: IngestRow[] = [
  { employerName: 'AMN Partner Health (feed)', title: 'Registered Nurse — Med Surg', city: 'Las Vegas', state: 'NV', atsRequisitionId: 'PF-3001', sourceUrl: 'https://partner.example/jobs/3001', description: 'Full-time day shift. $40–$55 per hour. Health insurance, 401(k), tuition reimbursement.' },
  { employerName: 'AMN Partner Health (feed)', title: 'RN, ICU (Nights)', city: 'Las Vegas', state: 'NV', atsRequisitionId: 'PF-3002', sourceUrl: 'https://partner.example/jobs/3002', description: 'Night shift differential. Union represented.' },
  { employerName: 'AMN Partner Health (feed)', title: 'Patient Access Coordinator', city: 'Las Vegas', state: 'NV', atsRequisitionId: 'PF-3003' }, // non-RN → filtered downstream
]

function rowsFromJson(text: string, employerFallback: string): IngestRow[] {
  const data = JSON.parse(text)
  const arr: any[] = Array.isArray(data) ? data : Array.isArray(data?.jobs) ? data.jobs : []
  return arr.map((j) => ({
    employerName: String(j.employer ?? j.employerName ?? employerFallback),
    facilityName: j.facility ?? j.facilityName,
    title: String(j.title ?? 'Registered Nurse'),
    description: j.description ?? j.summary,
    city: j.city,
    state: j.state,
    atsRequisitionId: j.reqId ?? j.atsRequisitionId ?? (j.id != null ? String(j.id) : undefined),
    sourceUrl: j.sourceUrl ?? j.url,
    raw: j,
  }))
}

export const partnerFeedConnector: DemandSourceConnector = {
  sourceType: 'partner_feed',
  async listJobs(source: DemandSource): Promise<PullResult> {
    const feed = (source.baseUrl ?? '').trim()
    if (!feed) return { rows: MOCK.map((m) => ({ ...m, employerName: source.name || m.employerName })), mode: 'mock', note: 'No feed URL (source.baseUrl) — returning sample partner rows.' }
    const r = await fetch(feed, { headers: process.env.PARTNER_FEED_TOKEN ? { authorization: `Bearer ${process.env.PARTNER_FEED_TOKEN}` } : {} })
    if (!r.ok) throw new Error(`Partner feed ${source.name}: ${r.status}`)
    const text = await r.text()
    const rows = text.trimStart().startsWith('[') || text.trimStart().startsWith('{') ? rowsFromJson(text, source.name) : rowsFromCsv(text)
    return { rows, mode: 'live', note: `Partner feed ${source.name}: ${rows.length} rows.` }
  },
}
