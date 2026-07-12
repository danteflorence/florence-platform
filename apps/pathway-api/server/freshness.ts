// ============================================================================
// Self-refreshing grounding — the promise "everything ties to official sources"
// only stays true if it is re-verified continuously. This engine watches every
// official-source URL the rules cite:
//
//   inventory (from ALL_RULES) → fetch → normalized content hash → compare to
//   the stored snapshot → CHANGED sources become a staff review queue item
//   (never an automatic rule edit — a human approves every regulatory change,
//   counsel-flagged workflows included per RULE_FRESHNESS.requiresCounsel).
//
// Network fetching is OFF by default (hermetic CI); enable per-run via
// `npm run refresh-rules` (FRESHNESS_FETCH_ENABLED=1) or a cron hitting
// POST /admin/freshness/check. The fetcher is injectable for tests.
// ============================================================================
import { createHash } from 'node:crypto'
import { ALL_RULES } from '../shared/rules'
import { RULE_FRESHNESS } from '../shared/freshness'
import type { WorkflowType } from '../shared/types'
import { store, audit, now } from './db'

export interface SourceSnapshot {
  url: string
  label: string
  workflows: string[]
  contentHash?: string
  status: 'unchecked' | 'ok' | 'changed' | 'unreachable'
  checkedAt?: string
  changedAt?: string
  reviewedAt?: string
  reviewedBy?: string
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const urlId = (url: string) => `src_${sha(url).slice(0, 24)}`

/** Every official-source URL cited by any rule, deduped, with its workflows. */
export function sourceInventory(): { url: string; label: string; workflows: string[] }[] {
  const byUrl = new Map<string, { url: string; label: string; workflows: string[] }>()
  for (const [type, rule] of Object.entries(ALL_RULES)) {
    for (const r of rule.officialResources ?? []) {
      const cur = byUrl.get(r.url) ?? { url: r.url, label: r.label, workflows: [] }
      if (!cur.workflows.includes(type)) cur.workflows.push(type)
      byUrl.set(r.url, cur)
    }
  }
  return [...byUrl.values()]
}

/** Strip volatile noise so hashes reflect CONTENT changes, not counters. */
function normalize(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export type Fetcher = (url: string) => Promise<string | null>

const realFetcher: Fetcher = async (url) => {
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'FlorenceOS-rule-freshness/1.0' } })
    return r.ok ? await r.text() : null
  } catch {
    return null
  }
}

/** One verification pass over every cited source. Injectable fetcher for tests. */
export async function checkFreshness(fetcher: Fetcher = realFetcher): Promise<{ checked: number; changed: number; unreachable: number }> {
  let checked = 0, changed = 0, unreachable = 0
  for (const src of sourceInventory()) {
    const id = urlId(src.url)
    const prior = (await store.ruleSnapshots.get(id)) as SourceSnapshot | null
    const body = await fetcher(src.url)
    checked += 1
    let next: SourceSnapshot
    if (body === null) {
      unreachable += 1
      next = { ...(prior ?? { url: src.url, label: src.label, workflows: src.workflows, status: 'unchecked' }), status: 'unreachable', checkedAt: now() }
    } else {
      const hash = sha(normalize(body))
      if (!prior?.contentHash) {
        next = { url: src.url, label: src.label, workflows: src.workflows, contentHash: hash, status: 'ok', checkedAt: now() }
      } else if (prior.contentHash === hash) {
        next = { ...prior, status: prior.status === 'changed' ? 'changed' : 'ok', checkedAt: now() }
      } else if (prior.status === 'changed') {
        // Already pending staff review — sticky, no re-count, no audit spam.
        next = { ...prior, checkedAt: now() }
      } else {
        changed += 1
        next = { ...prior, status: 'changed', changedAt: now(), checkedAt: now(), reviewedAt: undefined, reviewedBy: undefined }
        await audit('system', 'rule_source_changed', 'rule_source', id, undefined, src.url)
      }
    }
    await store.ruleSnapshots.upsert(id, next)
  }
  return { checked, changed, unreachable }
}

/** Staff approval: the reviewer re-verified the rule against the changed
 *  source (and updated the rule code if needed) — baseline moves forward. */
export async function approveSourceChange(url: string, reviewer: string): Promise<boolean> {
  const id = urlId(url)
  const snap = (await store.ruleSnapshots.get(id)) as SourceSnapshot | null
  if (!snap || snap.status !== 'changed') return false
  const body = await realFetcher(url)
  const s: SourceSnapshot = {
    ...snap,
    contentHash: body !== null ? sha(normalize(body)) : snap.contentHash,
    status: 'ok',
    reviewedAt: now(),
    reviewedBy: reviewer,
  }
  await store.ruleSnapshots.upsert(id, s)
  await audit('qa', 'rule_source_approved', 'rule_source', id, undefined, `${url} by ${reviewer}`)
  return true
}

/** The review board: per-workflow freshness (incl. overdue) + per-source state. */
export async function freshnessBoard(): Promise<{
  rules: (typeof RULE_FRESHNESS[WorkflowType] & { type: string; overdue: boolean })[]
  sources: SourceSnapshot[]
  pendingChanges: number
}> {
  const today = new Date().toISOString().slice(0, 10)
  const rules = Object.entries(RULE_FRESHNESS).map(([type, f]) => ({ ...f, type, overdue: f.nextReview < today }))
  const sources = (await store.ruleSnapshots.all()) as SourceSnapshot[]
  return { rules, sources, pendingChanges: sources.filter((s) => s.status === 'changed').length }
}
