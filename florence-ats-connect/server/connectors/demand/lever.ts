// Lever Postings API — public, no auth (api.lever.co/v0/postings/<account>?mode=json).
// Mock-by-default so the pull→normalize→dedup flow is demoable without a real account.
import type { DemandSource } from '../../../shared/demand-types'
import type { JobSourceConnector, PullResult } from './types'
import type { IngestRow } from '../../demand/ingest'

const MOCK: IngestRow[] = [
  { employerName: 'Sample Health (Lever)', title: 'Registered Nurse — Telemetry', city: 'Denver', state: 'CO', atsRequisitionId: 'LV-2001', sourceUrl: 'https://jobs.lever.co/sample/2001', description: 'Day shift. $36-$48 per hour. Health insurance, 401(k).' },
  { employerName: 'Sample Health (Lever)', title: 'RN, Emergency', city: 'Denver', state: 'CO', atsRequisitionId: 'LV-2002', sourceUrl: 'https://jobs.lever.co/sample/2002' },
  { employerName: 'Sample Health (Lever)', title: 'Talent Sourcer', city: 'Denver', state: 'CO', atsRequisitionId: 'LV-2003' }, // non-RN → filtered
]

export const leverConnector: JobSourceConnector = {
  sourceType: 'lever_postings',
  connectionType: 'public_api',
  async test(source) {
    const acct = (source.baseUrl ?? '').trim()
    return acct ? { ok: true, mode: 'live', note: `Would query Lever account ${acct}.` } : { ok: true, mode: 'mock', note: 'No Lever account (source.baseUrl) — mock mode.' }
  },
  async listJobs(source: DemandSource): Promise<PullResult> {
    const acct = (source.baseUrl ?? '').trim()
    if (!acct) return { rows: MOCK, mode: 'mock', note: 'No Lever account (source.baseUrl) — returning sample jobs.' }
    const r = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(acct)}?mode=json`)
    if (!r.ok) throw new Error(`Lever ${acct}: ${r.status}`)
    const data = (await r.json()) as any[]
    const rows: IngestRow[] = (data ?? []).map((j) => ({
      employerName: source.name,
      title: String(j.text ?? 'Registered Nurse'),
      city: j.categories?.location ? String(j.categories.location).split(',')[0]?.trim() : undefined,
      state: j.categories?.location,
      atsRequisitionId: String(j.id),
      sourceUrl: j.hostedUrl ?? j.applyUrl,
      description: j.descriptionPlain ?? j.description,
      raw: j,
    }))
    return { rows, mode: 'live', note: `Lever ${acct}: ${rows.length} postings.` }
  },
}
