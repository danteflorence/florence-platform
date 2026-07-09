// Dedup keys for Demand Radar. A FlorenceRNJob discovered on an employer career
// site AND on an aggregator must collapse to ONE job (preserving every source).
// The fingerprint is the collapse key; contentHash detects an unchanged raw pull.
import { createHash } from 'node:crypto'

const norm = (s?: string): string => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** Collapse key. A shared ATS requisition id is the strongest signal; otherwise
 *  fall back to employer+facility+title+location+specialty. */
export function jobFingerprint(p: {
  employerName?: string
  facilityName?: string
  title: string
  city?: string
  state?: string
  specialty?: string
  atsRequisitionId?: string
}): string {
  if (p.atsRequisitionId && p.atsRequisitionId.trim()) {
    return `req:${norm(p.employerName)}:${p.atsRequisitionId.trim().toLowerCase()}`
  }
  return [
    `emp:${norm(p.employerName)}`,
    norm(p.facilityName),
    `t:${norm(p.title)}`,
    norm(p.city),
    norm(p.state),
    norm(p.specialty),
  ]
    .filter(Boolean)
    .join('|')
}

/** Stable hash of the salient raw fields — an unchanged re-pull hits the same row. */
export function contentHash(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}
