// ============================================================================
// External status sync — closes the loop between the ledger and the outside
// world on three rails, strictly mock-by-default (a rail without credentials
// reports 'unconfigured' and NEVER fabricates a status):
//
//  1. Nursys e-Notify (real API rail): license/discipline status per nurse.
//     Configure NURSYS_ENOTIFY_URL + NURSYS_ENOTIFY_TOKEN (institution account).
//  2. Visa appointment wait times (public feed rail): configure
//     VISA_WAIT_FEED_URL to a travel.state.gov-derived JSON feed. Cached 24h.
//  3. Candidate attestation (human rail, always available): where no API exists
//     (Pearson ATT arrival, CGFNS report issuance), the candidate confirms with
//     one click; the attestation writes the ledger + audit trail.
//
// Every detected change lands as a production-ledger milestone (which already
// notifies the candidate via the notification spine) and is audited. Statuses
// are stored on the profile under externalStatuses keyed by rail, so re-syncs
// are idempotent (no change → no milestone spam).
// ============================================================================
import type { CandidateProfile } from '../shared/types'
import { store, audit, now } from './db'
import { pushMilestone } from './agents'

// ── rail 1: Nursys e-Notify ──────────────────────────────────────────────────
const nursysUrl = process.env.NURSYS_ENOTIFY_URL ?? ''
const nursysToken = process.env.NURSYS_ENOTIFY_TOKEN ?? ''

export interface NursysStatus { status: string; state?: string; expirationDate?: string }

/** Test seam: inject fixtures keyed by candidate id (smokes/demo only). */
const nursysFixtures = new Map<string, NursysStatus>()
export function _injectNursysFixture(candidateId: string, s: NursysStatus): void {
  if (process.env.NODE_ENV === 'production') return
  nursysFixtures.set(candidateId, s)
}

async function nursysLookup(c: CandidateProfile): Promise<NursysStatus | null> {
  if (nursysFixtures.has(c.id)) return nursysFixtures.get(c.id)!
  if (!nursysUrl || !nursysToken) return null // unconfigured — never fabricate
  try {
    const r = await fetch(`${nursysUrl.replace(/\/$/, '')}/enotify/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${nursysToken}` },
      body: JSON.stringify({ firstName: c.legalFirstName, lastName: c.legalLastName, state: c.employmentState ?? c.nclexState }),
    })
    if (!r.ok) return null
    const j = (await r.json()) as Partial<NursysStatus>
    return j && typeof j.status === 'string' ? { status: j.status, state: j.state, expirationDate: j.expirationDate } : null
  } catch {
    return null
  }
}

// ── rail 2: visa appointment wait times (public data; cached 24h) ───────────
const visaFeedUrl = process.env.VISA_WAIT_FEED_URL ?? ''
let visaCache: { at: number; data: Record<string, number> } | null = null

/** Post/city → wait days, from the configured feed. Null when unconfigured. */
export async function visaWaitDays(post: string): Promise<number | null> {
  if (!visaFeedUrl) return null
  const DAY = 24 * 60 * 60 * 1000
  if (!visaCache || Date.now() - visaCache.at > DAY) {
    try {
      const r = await fetch(visaFeedUrl)
      if (!r.ok) return null
      visaCache = { at: Date.now(), data: (await r.json()) as Record<string, number> }
    } catch {
      return null
    }
  }
  const days = visaCache.data[post] ?? visaCache.data[post.toLowerCase()]
  return typeof days === 'number' ? days : null
}

// ── rail 3: candidate status attestation (always available) ─────────────────
/** The statuses a candidate may attest — label-only, no free text. */
export const ATTESTABLE_STATUSES: Record<string, string> = {
  att_received: 'NCLEX Authorization to Test (ATT) received',
  cgfns_report_issued: 'CGFNS report issued',
  cgfns_docs_submitted: 'Documents submitted to CGFNS',
  license_verification_sent: 'License verification sent to the board',
}

export async function attestStatus(candidateId: string, kind: string): Promise<{ ok: boolean; label?: string }> {
  const label = ATTESTABLE_STATUSES[kind]
  if (!label) return { ok: false }
  const c = await store.candidates.get(candidateId)
  if (!c) return { ok: false }
  const prior = c.externalStatuses?.[kind]
  if (!prior) {
    c.externalStatuses = { ...(c.externalStatuses ?? {}), [kind]: { value: 'confirmed', at: now(), source: 'candidate_attested' } }
    c.updatedAt = now()
    await store.candidates.update(c)
    await audit('candidate', 'status_attested', 'candidate', candidateId, candidateId, kind)
    await pushMilestone(candidateId, undefined, label)
  }
  return { ok: true, label }
}

// ── the sync pass (idempotent; unconfigured rails are no-ops) ────────────────
export function integrationModes(): Record<string, 'configured' | 'unconfigured'> {
  return {
    nursys_enotify: nursysUrl && nursysToken ? 'configured' : 'unconfigured',
    visa_wait_feed: visaFeedUrl ? 'configured' : 'unconfigured',
    candidate_attestation: 'configured', // the human rail always works
  }
}

export async function syncExternalStatuses(): Promise<{ checked: number; changed: number }> {
  let checked = 0
  let changed = 0
  for (const c of await store.candidates.all()) {
    const s = await nursysLookup(c)
    if (!s) continue
    checked += 1
    const key = 'nursys_license'
    const value = `${s.status}${s.state ? `/${s.state}` : ''}`
    if (c.externalStatuses?.[key]?.value === value) continue // unchanged → silent
    c.externalStatuses = { ...(c.externalStatuses ?? {}), [key]: { value, at: now(), source: 'nursys_enotify' } }
    c.updatedAt = now()
    await store.candidates.update(c)
    await audit('system', 'external_status_changed', 'candidate', c.id, c.id, `${key}=${value}`)
    await pushMilestone(c.id, undefined, `License status update: ${s.status}${s.state ? ` (${s.state})` : ''}`)
    changed += 1
  }
  return { checked, changed }
}

/** Hourly external-status sync; no-op while every API rail is unconfigured. */
export function startIntegrationLoop(): NodeJS.Timeout | undefined {
  if (process.env.PATHWAY_INTEGRATIONS_DISABLED === '1') return undefined
  const tick = async () => { try { await syncExternalStatuses() } catch { /* never crash the server */ } }
  void tick()
  return setInterval(tick, 60 * 60 * 1000)
}
