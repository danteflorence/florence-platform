// CSV / SFTP enterprise bridge. The on-ramp for slow HRIS/ATS partners
// (Workday/Taleo/iCIMS/UKG/SuccessFactors) before native integration: import their open
// requisitions ("jobs in", idempotent by the partner's req id) and export application
// status back ("status out"). Pure parse/format (reuses the demand CSV parser); the
// SFTP/GCS transport is operator-provisioned. Status exports carry IDs + status ONLY —
// never candidate PII (Title VII / FCRA safe).
import { parseCsv } from './demand/ingest'

export interface PartnerJobRow {
  externalReqId: string
  title: string
  city?: string
  state?: string
  requiredLicenseState: string
  setting?: string
  payMin?: number
  payMax?: number
}
export interface CsvImportResult {
  valid: PartnerJobRow[]
  errors: { row: number; error: string }[]
}

function lower(r: Record<string, string>): Record<string, string> {
  const o: Record<string, string> = {}
  for (const [k, v] of Object.entries(r)) o[k.trim().toLowerCase()] = v
  return o
}

/** Parse a partner "jobs in" CSV → validated requisition rows + per-row errors.
 *  Idempotent at upsert time: keyed by externalReqId (the caller upserts by that key). */
export function importPartnerJobsCsv(text: string): CsvImportResult {
  const valid: PartnerJobRow[] = []
  const errors: { row: number; error: string }[] = []
  parseCsv(text).forEach((raw, i) => {
    const r = lower(raw)
    const externalReqId = (r['external_req_id'] ?? r['req_id'] ?? '').trim()
    const title = (r['title'] ?? '').trim()
    const state = (r['state'] ?? '').trim().toUpperCase()
    const requiredLicenseState = (r['required_license_state'] ?? r['license_state'] ?? state).trim().toUpperCase()
    if (!externalReqId || !title || !requiredLicenseState) {
      errors.push({ row: i + 1, error: 'external_req_id, title, and required_license_state are required' })
      return
    }
    const pmin = Number(r['pay_min'])
    const pmax = Number(r['pay_max'])
    valid.push({
      externalReqId, title, requiredLicenseState,
      ...(r['city'] ? { city: r['city'].trim() } : {}),
      ...(state ? { state } : {}),
      ...(r['setting'] ? { setting: r['setting'].trim() } : {}),
      ...(Number.isFinite(pmin) ? { payMin: pmin } : {}),
      ...(Number.isFinite(pmax) ? { payMax: pmax } : {}),
    })
  })
  return { valid, errors }
}

// Status export rows — IDs + status only. NO candidate name/email/visa/PII.
export interface StatusExportRow {
  externalReqId: string
  applicationId: string
  stage: string
  status: string
  updatedAt: string
}

const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)

/** Format application-status rows as CSV for a partner SFTP/GCS drop (no PII). */
export function toApplicationStatusCsv(rows: StatusExportRow[]): string {
  const header = 'external_req_id,application_id,stage,status,updated_at'
  const lines = rows.map((r) => [r.externalReqId, r.applicationId, r.stage, r.status, r.updatedAt].map((v) => esc(String(v ?? ''))).join(','))
  return [header, ...lines].join('\n') + '\n'
}
