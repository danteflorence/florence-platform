// ============================================================================
// HRIS inbound — start / retention truth.
//
// The billing-critical events (did she actually START, is she still employed at
// 30/90 days) must NOT come from ATS stage data — recruiters keep ATS stages
// dirty and the real hire/termination lives in the HRIS/payroll system. This
// feed supplies those events with verifiedVia='hris', the only source the ledger
// accepts for HRIS-grade stages.
//
// Mock by default (no creds). A Finch-style provider plugs in behind
// FINCH_ACCESS_TOKEN — Finch is the HRIS/payroll aggregation layer, the right
// home for employment verification (distinct from the ATS).
// ============================================================================
import type { ATSApplication } from '../shared/types'
import { now } from './db'

export type EmploymentEventType = 'started' | 'retained_30d' | 'retained_60d' | 'retained_90d' | 'term_complete' | 'terminated'

export interface EmploymentEvent {
  atsApplicationId: string
  type: EmploymentEventType
  effectiveDate: string
}

export interface HrisProvider {
  provider: string
  mode: 'live' | 'mock'
  /** Given the apps we're tracking, return employment facts from the HRIS. */
  fetchEmployment(apps: ATSApplication[]): Promise<EmploymentEvent[]>
}

const today = () => now().slice(0, 10)
const daysSince = (iso?: string): number => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : 0)

// Apps that have progressed in the ATS but aren't confirmed started yet.
const PROGRESSED = new Set(['submitted', 'received', 'screen', 'interview', 'offer', 'hired', 'start_scheduled'])

/** Mock HRIS: confirms a START for any progressed application, then derives retention
 *  milestones from ELAPSED DAYS since the start anchor (submittedAt ?? createdAt).
 *  Because milestones are a pure function of elapsed time, re-running fetchEmployment
 *  yields the SAME event set — idempotent, so a repeated /ops/hris/sync never double-bills
 *  (billing counts distinct started anchors, not milestone rows). */
export const mockHrisProvider: HrisProvider = {
  provider: 'mock',
  mode: 'mock',
  async fetchEmployment(apps) {
    const out: EmploymentEvent[] = []
    for (const a of apps) {
      if (PROGRESSED.has(a.status)) { out.push({ atsApplicationId: a.id, type: 'started', effectiveDate: today() }); continue }
      if (a.status === 'started') {
        const elapsed = daysSince(a.submittedAt ?? a.createdAt)
        if (elapsed >= 30) out.push({ atsApplicationId: a.id, type: 'retained_30d', effectiveDate: today() })
        if (elapsed >= 60) out.push({ atsApplicationId: a.id, type: 'retained_60d', effectiveDate: today() })
        if (elapsed >= 90) out.push({ atsApplicationId: a.id, type: 'retained_90d', effectiveDate: today() })
      }
    }
    return out
  },
}

/** Finch-style live provider (stub): the real call resolves the employer's
 *  directory + employment records and matches them to our candidates. */
function finchProvider(token: string): HrisProvider {
  return {
    provider: 'finch',
    mode: 'live',
    async fetchEmployment(_apps) {
      // LIVE: GET https://api.tryfinch.com/employer/directory + /employer/employment,
      // match by name/email/employer, derive started/terminated from employment dates.
      // Requires a connected employer + access token; returns [] until wired per customer.
      void token
      return []
    },
  }
}

export function getHrisProvider(): HrisProvider {
  return process.env.FINCH_ACCESS_TOKEN ? finchProvider(process.env.FINCH_ACCESS_TOKEN) : mockHrisProvider
}
