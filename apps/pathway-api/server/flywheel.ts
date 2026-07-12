// ============================================================================
// Deficiency flywheel — the engine that grows itself. Every deficiency the QA
// desk sees is clustered by (classification × workflow type × corridor); a
// recurring cluster becomes a PROPOSED intake check. Staff approve or dismiss —
// approved checks surface to matching candidates BEFORE they submit, so the
// next cohort never hits the deficiency the last cohort did.
// ============================================================================
import { createHash } from 'node:crypto'
import type { CandidateProfile, WorkflowInstance } from '../shared/types'
import { WORKFLOW_META } from '../shared/constants'
import { store, audit, now } from './db'

export interface IntakeCheck {
  id: string
  classification: string
  workflowType: string
  /** Source-country corridor ('' = all corridors). */
  corridor: string
  occurrences: number
  proposedCheck: string
  status: 'proposed' | 'approved' | 'dismissed'
  createdAt: string
  decidedAt?: string
  decidedBy?: string
}

const checkId = (cls: string, wt: string, corridor: string) =>
  `chk_${createHash('sha256').update(`${cls}\0${wt}\0${corridor}`).digest('hex').slice(0, 20)}`

const MIN_CLUSTER = 2

/** Cluster history into proposals. Idempotent: existing decisions are kept;
 *  only occurrence counts refresh. Returns how many NEW proposals appeared. */
export async function clusterDeficiencies(): Promise<{ clusters: number; newProposals: number }> {
  const counts = new Map<string, { cls: string; wt: string; corridor: string; n: number }>()
  for (const def of await store.deficiencies.all()) {
    const w = await store.workflows.get(def.workflowId)
    const c = await store.candidates.get(def.candidateId)
    if (!w || !c) continue
    const key = `${def.classification}\0${w.type}\0${c.citizenship}`
    const cur = counts.get(key) ?? { cls: def.classification, wt: w.type, corridor: c.citizenship, n: 0 }
    cur.n += 1
    counts.set(key, cur)
  }
  let newProposals = 0
  let clusters = 0
  for (const { cls, wt, corridor, n } of counts.values()) {
    if (n < MIN_CLUSTER) continue
    clusters += 1
    const id = checkId(cls, wt, corridor)
    const existing = (await store.intakeChecks.get(id)) as IntakeCheck | null
    if (existing) {
      if (existing.occurrences !== n) await store.intakeChecks.upsert(id, { ...existing, occurrences: n })
      continue
    }
    const short = WORKFLOW_META[wt as keyof typeof WORKFLOW_META]?.short ?? wt
    const check: IntakeCheck = {
      id, classification: cls, workflowType: wt, corridor, occurrences: n,
      proposedCheck: `${corridor} candidates on ${short}: verify "${cls}" is addressed at intake — this deficiency recurred ${n}× in the cohort.`,
      status: 'proposed',
      createdAt: now(),
    }
    await store.intakeChecks.upsert(id, check)
    await audit('system', 'intake_check_proposed', 'intake_check', id, undefined, `${cls}/${wt}/${corridor} n=${n}`)
    newProposals += 1
  }
  return { clusters, newProposals }
}

export async function decideIntakeCheck(id: string, action: 'approve' | 'dismiss', reviewer: string): Promise<boolean> {
  const check = (await store.intakeChecks.get(id)) as IntakeCheck | null
  if (!check || check.status !== 'proposed') return false
  await store.intakeChecks.upsert(id, { ...check, status: action === 'approve' ? 'approved' : 'dismissed', decidedAt: now(), decidedBy: reviewer })
  await audit('qa', `intake_check_${action}d`, 'intake_check', id, undefined, `by ${reviewer}`)
  return true
}

/** APPROVED checks that apply to this candidate's corridor + active workflows. */
export async function checksForCandidate(c: CandidateProfile, workflows: WorkflowInstance[]): Promise<IntakeCheck[]> {
  const active = new Set(workflows.filter((w) => !['submitted', 'completed'].includes(w.status)).map((w) => String(w.type)))
  const all = (await store.intakeChecks.all()) as IntakeCheck[]
  return all.filter((k) => k.status === 'approved' && active.has(k.workflowType) && (k.corridor === '' || k.corridor === c.citizenship))
}
