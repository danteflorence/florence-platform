// ============================================================================
// Predictive ETA engine — every nurse's journey makes the next nurse's ETA
// better. Per-node duration distributions are computed from the COHORT's
// completed workflows (the production ledger's raw material); a candidate's
// remaining critical path is then priced node-by-node:
//
//     cohort median (when n ≥ MIN_SAMPLES)  else  the graph's baseline days
//
// with a p25–p75 band and a transparent per-node basis (source + sample size),
// mirroring the route-recommender's "no black box" posture. SCHEDULE ONLY —
// this module never touches candidate pricing or Florence economics.
// ============================================================================
import { PATHWAY_NODES, buildPathwayGraph } from '../shared/pathway-graph'
import type { WorkflowType } from '../shared/types'
import type { CandidateEta, EtaBasisNode } from '../shared/views'
import { store } from './db'

const MIN_SAMPLES = 3
const DAY = 24 * 60 * 60 * 1000

const nodeByWorkflow = new Map<WorkflowType, string>()
for (const n of PATHWAY_NODES) for (const t of n.workflowTypes ?? []) nodeByWorkflow.set(t, n.key)

function pct(sorted: number[], p: number): number {
  if (!sorted.length) return 0
  const i = (sorted.length - 1) * p
  const lo = Math.floor(i), hi = Math.ceil(i)
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (i - lo)
}

export interface NodeDurationStats { key: string; n: number; p25: number; p50: number; p75: number }

/** Observed days per pathway node across every candidate's finished workflows. */
export async function cohortNodeDurations(): Promise<Map<string, NodeDurationStats>> {
  const samples = new Map<string, number[]>()
  for (const c of await store.candidates.all()) {
    for (const w of await store.workflows.byCandidate(c.id)) {
      if (!['submitted', 'completed'].includes(w.status)) continue
      const key = nodeByWorkflow.get(w.type)
      if (!key) continue
      const days = (Date.parse(w.updatedAt) - Date.parse(w.createdAt)) / DAY
      if (!Number.isFinite(days) || days < 0 || days > 365) continue
      samples.set(key, [...(samples.get(key) ?? []), days])
    }
  }
  const out = new Map<string, NodeDurationStats>()
  for (const [key, arr] of samples) {
    const s = arr.slice().sort((a, b) => a - b)
    out.set(key, { key, n: s.length, p25: pct(s, 0.25), p50: pct(s, 0.5), p75: pct(s, 0.75) })
  }
  return out
}

export async function candidateEta(candidateId: string): Promise<CandidateEta | null> {
  const workflows = await store.workflows.byCandidate(candidateId)
  const graph = buildPathwayGraph(workflows)
  const cohort = await cohortNodeDurations()

  let mid = 0, lo = 0, hi = 0
  const basis: EtaBasisNode[] = []
  for (const key of graph.criticalPath) {
    const node = graph.nodes.find((n) => n.key === key)
    if (!node || node.state === 'done' || node.expectedDays === 0) continue
    const remainFactor = node.state === 'active' ? Math.max(0.15, 1 - node.progress) : 1
    const stats = cohort.get(key)
    const useCohort = stats && stats.n >= MIN_SAMPLES
    const days = (useCohort ? stats.p50 : node.expectedDays) * remainFactor
    lo += (useCohort ? stats.p25 : node.expectedDays * 0.8) * remainFactor
    hi += (useCohort ? stats.p75 : node.expectedDays * 1.3) * remainFactor
    mid += days
    basis.push({ key, label: node.label, days: Math.round(days), source: useCohort ? 'cohort' : 'baseline', sampleSize: stats?.n ?? 0 })
  }
  if (!basis.length) return null
  const at = (d: number) => new Date(Date.now() + d * DAY).toISOString().slice(0, 10)
  const biggest = basis.slice().sort((a, b) => b.days - a.days)[0]
  return {
    etaDate: at(mid),
    earliest: at(lo),
    latest: at(hi),
    remainingDays: Math.round(mid),
    ...(biggest ? { biggestLever: { key: biggest.key, label: biggest.label, days: biggest.days } } : {}),
    basis,
  }
}

/** Staff forecast: every candidate's ETA, plus starts-by-month buckets. */
export async function etaForecast(): Promise<{
  candidates: { id: string; name: string; etaDate: string; earliest: string; latest: string }[]
  startsByMonth: Record<string, number>
}> {
  const rows: { id: string; name: string; etaDate: string; earliest: string; latest: string }[] = []
  const byMonth: Record<string, number> = {}
  for (const c of await store.candidates.all()) {
    const eta = await candidateEta(c.id)
    if (!eta) continue
    rows.push({ id: c.id, name: `${c.legalFirstName} ${c.legalLastName}`, etaDate: eta.etaDate, earliest: eta.earliest, latest: eta.latest })
    const month = eta.etaDate.slice(0, 7)
    byMonth[month] = (byMonth[month] ?? 0) + 1
  }
  rows.sort((a, b) => a.etaDate.localeCompare(b.etaDate))
  return { candidates: rows, startsByMonth: byMonth }
}
