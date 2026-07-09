// Ingest pipeline: raw rows → RawJobPosting (dedup by contentHash) → normalize →
// canonical FlorenceRNJob (collapse by fingerprint, preserve every JobSource).
// Source-agnostic: CSV/manual and the public connectors all funnel through ingestRows.
import { store, uid, now } from '../db'
import { normalizeJob, type NormalizeInput } from './normalize'
import { jobFingerprint, contentHash } from './fingerprint'
import type { DemandSourceType, JobSource, RawJobPosting, FlorenceRNJob } from '../../shared/demand-types'

export interface IngestRow extends NormalizeInput {
  sourceUrl?: string
  atsProvider?: string
  atsRequisitionId?: string
  postedAt?: string
  raw?: Record<string, unknown>
}

export interface IngestSummary {
  received: number
  rawNew: number
  jobsCreated: number
  jobsUpdated: number
  skippedNonRn: number
}

export async function ingestRows(
  demandSourceId: string,
  sourceType: DemandSourceType,
  rows: IngestRow[],
): Promise<IngestSummary> {
  const s: IngestSummary = { received: rows.length, rawNew: 0, jobsCreated: 0, jobsUpdated: 0, skippedNonRn: 0 }
  for (const row of rows) {
    if (!row.employerName || !row.title) continue
    const payload = row.raw ?? { ...row }
    const hash = contentHash({
      src: demandSourceId,
      employerName: row.employerName,
      title: row.title,
      city: row.city,
      state: row.state,
      atsRequisitionId: row.atsRequisitionId,
    })

    let raw = await store.rawJobs.byContentHash(hash)
    if (raw) {
      raw.lastSeenAt = now()
      await store.rawJobs.update(raw)
    } else {
      raw = {
        id: uid(), demandSourceId, sourceType, sourceUrl: row.sourceUrl, atsProvider: row.atsProvider,
        atsRequisitionId: row.atsRequisitionId, rawPayload: payload, contentHash: hash, firstSeenAt: now(), lastSeenAt: now(),
      } satisfies RawJobPosting
      await store.rawJobs.insert(raw)
      s.rawNew += 1
    }

    const n = normalizeJob(row)
    if (!n.keep) {
      s.skippedNonRn += 1
      continue
    }

    const fp = jobFingerprint({
      employerName: row.employerName, facilityName: row.facilityName, title: row.title,
      city: row.city, state: n.requiredLicenseState ?? row.state, specialty: n.specialty, atsRequisitionId: row.atsRequisitionId,
    })

    let job = await store.demandJobs.byFingerprint(fp)
    if (job) {
      job.lastSeenAt = now()
      job.status = 'open'
      job.specialty ??= n.specialty
      job.setting ??= n.setting
      job.requiredLicenseState ??= n.requiredLicenseState
      job.state ??= n.requiredLicenseState ?? row.state
      // Provenance + listed pay: first source to supply a value wins (no clobber).
      job.sourceUrl ??= row.sourceUrl
      job.atsProvider ??= row.atsProvider
      job.atsRequisitionId ??= row.atsRequisitionId
      if (job.listedPayMin == null && n.listedPayMin != null) { job.listedPayMin = n.listedPayMin; job.listedPayMax = n.listedPayMax; job.listedPayUnit = n.listedPayUnit }
      await store.demandJobs.update(job)
      s.jobsUpdated += 1
    } else {
      job = {
        id: uid(), employerName: row.employerName, facilityName: row.facilityName, fingerprint: fp, title: row.title,
        normalizedRole: n.normalizedRole, specialty: n.specialty, setting: n.setting, city: row.city,
        state: n.requiredLicenseState ?? row.state, country: row.country ?? 'US', requiredLicenseState: n.requiredLicenseState,
        shift: n.shift, employmentType: n.employmentType, openingsEstimate: row.openings, status: 'open',
        sourceUrl: row.sourceUrl, atsProvider: row.atsProvider, atsRequisitionId: row.atsRequisitionId,
        listedPayMin: n.listedPayMin, listedPayMax: n.listedPayMax, listedPayUnit: n.listedPayUnit,
        ...(n.payTransparencyFlag ? { payTransparencyFlag: true, payTransparencyNote: n.payTransparencyNote } : {}),
        ...(n.benefitsExtracted ? { benefitsExtracted: n.benefitsExtracted, benefitsSourceUrl: row.sourceUrl } : {}),
        // Demand-Radar jobs are publicly displayable (Gap F public card). The displayAllowed
        // gate is default-deny, so set it explicitly here; the long-tail layer overrides origin/flag at claim time.
        displayAllowed: true, origin: 'demand_radar',
        confidence: n.confidence, firstSeenAt: now(), lastSeenAt: now(),
      } satisfies FlorenceRNJob
      await store.demandJobs.insert(job)
      s.jobsCreated += 1
      // Attribution: the top of the source→start funnel — detected + normalized (the
      // canonical RN job exists with specialty/setting/state resolved).
      await store.attribution.insert({
        id: uid(), jobId: job.id, employerId: job.employerId, eventType: 'demand.job_detected',
        sourceSystem: 'demand_radar', metadata: { employer: job.employerName, specialty: job.specialty, state: job.requiredLicenseState ?? job.state, source: sourceType }, occurredAt: now(),
      })
      await store.attribution.insert({
        id: uid(), jobId: job.id, employerId: job.employerId, eventType: 'demand.job_normalized',
        sourceSystem: 'demand_radar', metadata: { role: job.normalizedRole, specialty: job.specialty, setting: job.setting }, occurredAt: now(),
      })
    }

    const js: JobSource = {
      id: uid(), jobId: job.id, rawJobPostingId: raw.id, demandSourceId, sourceType,
      sourceUrl: row.sourceUrl, atsProvider: row.atsProvider, atsRequisitionId: row.atsRequisitionId,
    }
    await store.jobSources.insert(js)

    // Benefits: record a posting-sourced JobBenefits row once per job (idempotent — skip
    // if a job_posting row already exists). Source-attributed, never overpromised.
    if (n.benefitsExtracted?.length) {
      const existing = await store.jobBenefits.byJob(job.id)
      if (!existing.some((b) => b.sourceType === 'job_posting')) {
        await store.jobBenefits.insert({ id: uid(), jobId: job.id, benefits: n.benefitsExtracted, sourceType: 'job_posting', sourceUrl: row.sourceUrl, capturedAt: now() })
      }
    }
  }
  return s
}

// --- CSV --------------------------------------------------------------------

/** RFC-4180-ish CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQ = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1 } else inQ = false
      } else field += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (ch !== '\r') field += ch
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  const header = (rows.shift() ?? []).map((h) => h.trim())
  return rows
    .filter((r) => r.some((c) => c.trim() !== ''))
    .map((r) => {
      const o: Record<string, string> = {}
      header.forEach((h, idx) => (o[h] = (r[idx] ?? '').trim()))
      return o
    })
}

const ALIAS: Record<string, keyof IngestRow> = {
  employer: 'employerName', employername: 'employerName', employer_name: 'employerName', company: 'employerName',
  facility: 'facilityName', facilityname: 'facilityName', facility_name: 'facilityName', location_name: 'facilityName',
  title: 'title', role: 'title', jobtitle: 'title', job_title: 'title',
  description: 'description', summary: 'description',
  city: 'city', state: 'state', country: 'country',
  shift: 'shift', employmenttype: 'employmentType', employment_type: 'employmentType', type: 'employmentType',
  openings: 'openings', sourceurl: 'sourceUrl', source_url: 'sourceUrl', url: 'sourceUrl',
  atsprovider: 'atsProvider', ats_provider: 'atsProvider',
  atsrequisitionid: 'atsRequisitionId', requisition_id: 'atsRequisitionId', reqid: 'atsRequisitionId', req_id: 'atsRequisitionId',
  postedat: 'postedAt', posted_at: 'postedAt',
}

/** Map CSV rows (flexible headers) → IngestRow[]. */
export function rowsFromCsv(text: string): IngestRow[] {
  return parseCsv(text).map((rec) => {
    const out: Record<string, unknown> = { raw: rec }
    for (const [k, v] of Object.entries(rec)) {
      const key = ALIAS[k.toLowerCase().replace(/\s+/g, '')]
      if (!key) continue
      out[key] = key === 'openings' ? Number(v) || undefined : v
    }
    return out as unknown as IngestRow
  })
}
