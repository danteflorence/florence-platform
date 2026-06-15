import type { EvidenceSourceType } from '../../shared/types'

export const uid = (): string => (globalThis.crypto as Crypto).randomUUID()
export const now = (): string => new Date().toISOString()
export const today = (): Date => new Date()

/** Normalize a personal name for exact-match comparison: strip diacritics,
 *  lowercase, drop punctuation, collapse whitespace. */
export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function nameTokensSorted(s: string): string {
  return normalizeName(s).split(' ').filter(Boolean).sort().join(' ')
}

/** Exact (order-sensitive) normalized equality. */
export function sameNameExact(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b)
}

/** Same tokens, possibly different order (e.g. surname-first vs given-first). */
export function sameNameTokens(a: string, b: string): boolean {
  return nameTokensSorted(a) === nameTokensSorted(b)
}

export function parseDate(d?: string): Date | null {
  if (!d) return null
  const t = Date.parse(d)
  return Number.isNaN(t) ? null : new Date(t)
}

export function daysUntil(d?: string, from: Date = today()): number | null {
  const target = parseDate(d)
  if (!target) return null
  return Math.round((target.getTime() - from.getTime()) / 86_400_000)
}

export function daysBetween(a?: string, b?: string): number | null {
  const da = parseDate(a)
  const db = parseDate(b)
  if (!da || !db) return null
  return Math.round((db.getTime() - da.getTime()) / 86_400_000)
}

export const SOURCE_LABEL: Record<EvidenceSourceType, string> = {
  passport_scan: 'Passport',
  national_id: 'National ID',
  transcript: 'Transcript',
  license_doc: 'License',
  i20: 'I-20',
  offer_letter: 'Offer letter',
  prior_visa: 'Prior visa',
  english_score: 'English score report',
  cgfns_doc: 'CGFNS document',
  candidate_input: 'Candidate-entered',
  derived: 'Derived',
}
