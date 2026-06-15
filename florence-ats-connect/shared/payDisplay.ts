// Pure, shared (server + client) formatter that keeps LISTED pay (from the employer
// posting) and ESTIMATED pay (FlorenceRN's local-market estimate) visually + textually
// distinct — never presenting an estimate as employer-posted. Listed always wins display.
import type { FlorenceRNJob, PayUnit, Confidence } from './demand-types'

export interface PayDisplay {
  kind: 'listed' | 'estimated' | 'none'
  min?: number
  max?: number
  unit?: PayUnit
  /** Short label: "Listed pay" | "Estimated pay" | "Pay not posted". */
  label: string
  /** Provenance line: "from employer posting" | "FlorenceRN estimate (local RN market)". */
  source: string
  confidence?: Confidence
  /** Formatted amount, e.g. "$40–$55/hr" or "" when none. */
  amount: string
  /** One-line combined string for compact contexts. */
  text: string
}

const UNIT_SUFFIX: Record<PayUnit, string> = { hour: '/hr', year: '/yr', month: '/mo' }

function fmt(min?: number, max?: number, unit?: PayUnit): string {
  if (min == null) return ''
  const suffix = unit ? UNIT_SUFFIX[unit] : ''
  const n = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1))
  const body = max != null && max !== min ? `$${n(min)}–$${n(max)}` : `$${n(min)}`
  return `${body}${suffix}`
}

export function payDisplay(job: Pick<FlorenceRNJob, 'listedPayMin' | 'listedPayMax' | 'listedPayUnit' | 'estimatedPayMin' | 'estimatedPayMax' | 'estimatedPayConfidence'>): PayDisplay {
  if (job.listedPayMin != null) {
    const amount = fmt(job.listedPayMin, job.listedPayMax, job.listedPayUnit ?? 'hour')
    return { kind: 'listed', min: job.listedPayMin, max: job.listedPayMax, unit: job.listedPayUnit ?? 'hour', label: 'Listed pay', source: 'from employer posting', amount, text: `Listed pay ${amount} — from employer posting` }
  }
  if (job.estimatedPayMin != null) {
    const amount = fmt(job.estimatedPayMin, job.estimatedPayMax, 'hour')
    return { kind: 'estimated', min: job.estimatedPayMin, max: job.estimatedPayMax, unit: 'hour', label: 'Estimated pay', source: 'FlorenceRN estimate (local RN market)', confidence: job.estimatedPayConfidence, amount, text: `Estimated pay ${amount} — FlorenceRN estimate (${job.estimatedPayConfidence ?? 'low'} confidence)` }
  }
  return { kind: 'none', label: 'Pay not posted', source: '', amount: '', text: 'Pay not posted' }
}
