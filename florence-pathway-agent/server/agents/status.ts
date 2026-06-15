import type { CandidateDossier, RiskLevel } from '../../shared/types'
import { daysUntil } from './util'

// Status Agent
// ------------
// Monitors expirations and deadlines — ATT validity, passport validity, target
// start — and assigns urgency so nothing silently lapses.

export interface StatusItem {
  kind: 'att_expiry' | 'passport_expiry' | 'target_start' | 'visa_interview' | 'nclex_exam'
  label: string
  date?: string
  daysRemaining?: number | null
  severity: RiskLevel
}

function severityForDays(days: number | null, soon: number, urgent: number): RiskLevel {
  if (days == null) return 'none'
  if (days < 0) return 'high'
  if (days <= urgent) return 'high'
  if (days <= soon) return 'medium'
  return 'low'
}

export function deadlines(d: CandidateDossier): StatusItem[] {
  const items: StatusItem[] = []

  for (const ap of d.appointments) {
    if (ap.status === 'cancelled' || !ap.scheduledFor) continue
    const days = daysUntil(ap.scheduledFor)
    const loc = ap.location ? ` — ${ap.location}` : ''
    if (ap.kind === 'visa_interview') {
      items.push({ kind: 'visa_interview', label: `Visa interview${loc}`, date: ap.scheduledFor, daysRemaining: days, severity: severityForDays(days, 30, 7) })
    } else if (ap.kind === 'nclex') {
      items.push({ kind: 'nclex_exam', label: `NCLEX exam${loc}`, date: ap.scheduledFor, daysRemaining: days, severity: severityForDays(days, 30, 7) })
    }
  }

  for (const n of d.nclex) {
    if (n.attIssued && n.attExpiresOn) {
      const days = daysUntil(n.attExpiresOn)
      items.push({
        kind: 'att_expiry',
        label: `ATT expires (${n.nrb})`,
        date: n.attExpiresOn,
        daysRemaining: days,
        severity: severityForDays(days, 30, 14),
      })
    }
  }

  const passport = d.identityDocuments.find((x) => x.kind === 'passport')
  if (passport?.expirationDate) {
    const days = daysUntil(passport.expirationDate)
    items.push({
      kind: 'passport_expiry',
      label: 'Passport expiration',
      date: passport.expirationDate,
      daysRemaining: days,
      severity: severityForDays(days, 183, 90),
    })
  }

  if (d.profile.targetStartDate) {
    const days = daysUntil(d.profile.targetStartDate)
    items.push({
      kind: 'target_start',
      label: 'Target U.S. start',
      date: d.profile.targetStartDate,
      daysRemaining: days,
      severity: 'none',
    })
  }

  const RANK: Record<RiskLevel, number> = { escalate: 4, high: 3, medium: 2, low: 1, none: 0 }
  return items.sort((a, b) => RANK[b.severity] - RANK[a.severity])
}
