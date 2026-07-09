// Ashby public job board API (api.ashbyhq.com/posting-api/job-board/<name>?includeCompensation=true).
// Ashby uniquely exposes posted compensation — when present it flows into listedPay* via
// the description (parsePay picks it up). Mock-by-default.
import type { DemandSource } from '../../../shared/demand-types'
import type { JobSourceConnector, PullResult } from './types'
import type { IngestRow } from '../../demand/ingest'

const MOCK: IngestRow[] = [
  { employerName: 'Sample Health (Ashby)', title: 'Registered Nurse — ICU', city: 'Seattle', state: 'WA', atsRequisitionId: 'ASH-3001', sourceUrl: 'https://jobs.ashbyhq.com/sample/3001', description: 'ICU. Compensation $55 - $72 per hour. Health insurance, 401(k), relocation.' },
  { employerName: 'Sample Health (Ashby)', title: 'RN, Med Surg', city: 'Seattle', state: 'WA', atsRequisitionId: 'ASH-3002', sourceUrl: 'https://jobs.ashbyhq.com/sample/3002' },
  { employerName: 'Sample Health (Ashby)', title: 'People Ops Manager', city: 'Seattle', state: 'WA', atsRequisitionId: 'ASH-3003' }, // non-RN → filtered
]

/** Pull Ashby's structured compensation into a "$X - $Y per hour" tail so parsePay reads it. */
function compText(j: any): string {
  const comp = j.compensation?.compensationTierSummary || j.compensation?.summaryComponents?.[0]
  const min = comp?.minValue ?? comp?.min, max = comp?.maxValue ?? comp?.max
  const unit = String(comp?.interval ?? '').toLowerCase().includes('hour') ? 'hour' : String(comp?.interval ?? '').toLowerCase().includes('year') ? 'year' : 'hour'
  return min != null && max != null ? ` Compensation $${min} - $${max} per ${unit}.` : ''
}

export const ashbyConnector: JobSourceConnector = {
  sourceType: 'ashby',
  connectionType: 'public_api',
  async test(source) {
    const name = (source.baseUrl ?? '').trim()
    return name ? { ok: true, mode: 'live', note: `Would query Ashby board ${name}.` } : { ok: true, mode: 'mock', note: 'No Ashby board (source.baseUrl) — mock mode.' }
  },
  async listJobs(source: DemandSource): Promise<PullResult> {
    const name = (source.baseUrl ?? '').trim()
    if (!name) return { rows: MOCK, mode: 'mock', note: 'No Ashby board (source.baseUrl) — returning sample jobs.' }
    const r = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(name)}?includeCompensation=true`)
    if (!r.ok) throw new Error(`Ashby ${name}: ${r.status}`)
    const data = (await r.json()) as { jobs?: any[] }
    const rows: IngestRow[] = (data.jobs ?? []).map((j) => ({
      employerName: source.name,
      title: String(j.title ?? 'Registered Nurse'),
      city: j.location ? String(j.location).split(',')[0]?.trim() : undefined,
      state: j.location,
      atsRequisitionId: String(j.id ?? j.jobId),
      sourceUrl: j.jobUrl ?? j.applyUrl,
      description: `${j.descriptionPlain ?? ''}${compText(j)}`.trim(),
      raw: j,
    }))
    return { rows, mode: 'live', note: `Ashby ${name}: ${rows.length} jobs.` }
  },
}
