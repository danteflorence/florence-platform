// Pathway graph — the dependency DAG behind a candidate's route to a U.S. RN start.
//
// A checklist tells you what's left; a graph tells you the CRITICAL PATH — the
// longest dependency chain that actually determines the start date. This is the
// "Google Maps for nurse production" layer: current node, next node, blocked
// nodes, and the days of work remaining on the critical path.
import type { WorkflowInstance, WorkflowType, WorkflowStatus, Owner } from './types'
import { WORKFLOW_META, STATUS_META } from './constants'

export type NodeState =
  | 'done' // workflow completed/submitted
  | 'active' // in progress, no one blocked on input
  | 'attention' // needs QA, candidate data, a document, or a deficiency response
  | 'blocked' // compliance stop
  | 'upcoming' // dependencies satisfied, not started yet
  | 'locked' // waiting on upstream dependencies

export interface PathwayNodeDef {
  key: string
  label: string
  dependsOn: string[]
  /** Workflow type(s) that realize this node, if any. */
  workflowTypes?: WorkflowType[]
  /** Rough working days this node adds to the critical path. */
  expectedDays: number
  /** A domain not yet built as a workflow (university / financing / employer). */
  future?: boolean
  /** Default owner when there's no workflow yet. */
  owner?: Owner
}

// Canonical route. Branches (exam vs endorsement, abroad vs US) collapse onto the
// licensure node via its multiple workflowTypes; university/financing/employer are
// Phase-3 domains shown as the upcoming part of the rail.
export const PATHWAY_NODES: PathwayNodeDef[] = [
  { key: 'profile', label: 'Profile & credentials', dependsOn: [], expectedDays: 0 },
  { key: 'cgfns', label: 'CGFNS credential eval', dependsOn: ['profile'], workflowTypes: ['cgfns_ces'], expectedDays: 60 },
  { key: 'admission', label: 'University admission', dependsOn: ['profile'], workflowTypes: ['university_admission'], expectedDays: 30 },
  { key: 'i20', label: 'I-20 / SEVIS', dependsOn: ['admission'], workflowTypes: ['sevis_i20'], expectedDays: 21 },
  { key: 'financing', label: 'Financing packet', dependsOn: ['i20'], workflowTypes: ['financing_packet'], expectedDays: 14 },
  { key: 'ds160', label: 'DS-160', dependsOn: ['i20'], workflowTypes: ['ds160'], expectedDays: 7 },
  { key: 'visa', label: 'Visa appointment', dependsOn: ['ds160'], workflowTypes: ['visa_appointment'], expectedDays: 30 },
  { key: 'nclex', label: 'NCLEX / ATT', dependsOn: ['cgfns'], workflowTypes: ['nclex_att'], expectedDays: 45 },
  {
    key: 'licensure',
    label: 'State licensure',
    dependsOn: ['nclex'],
    workflowTypes: ['florida_rn_exam', 'newyork_rn_exam', 'texas_rn_exam', 'california_rn_exam', 'arizona_rn_exam', 'rn_exam', 'endorsement'],
    expectedDays: 45,
  },
  { key: 'employer', label: 'Employer-ready packet', dependsOn: ['licensure'], workflowTypes: ['employer_packet'], expectedDays: 21 },
  { key: 'start', label: 'U.S. RN start', dependsOn: ['visa', 'licensure', 'employer'], expectedDays: 0 },
]

export interface PathwayNode {
  key: string
  label: string
  state: NodeState
  statusLabel: string
  progress: number
  expectedDays: number
  owner?: Owner
  future: boolean
  onCriticalPath: boolean
}

export interface PathwayGraphView {
  nodes: PathwayNode[]
  criticalPath: string[]
  currentNodeKey?: string
  nextNodeKey?: string
  blockedKeys: string[]
  /** Working days of incomplete work on the critical path. */
  remainingDays: number
}

function stateFromStatus(s: WorkflowStatus): NodeState {
  if (s === 'completed' || s === 'submitted') return 'done'
  if (s === 'blocked') return 'blocked'
  if (s === 'needs_human_qa' || s === 'needs_candidate_data' || s === 'needs_document' || s === 'sent_to_candidate' || s === 'deficiency_received') return 'attention'
  return 'active' // drafted, qa_approved, candidate_signed, resolved
}

export function buildPathwayGraph(workflows: WorkflowInstance[]): PathwayGraphView {
  const byKey = new Map<string, PathwayNode>()
  const blockedKeys: string[] = []

  for (const def of PATHWAY_NODES) {
    const depsDone = def.dependsOn.every((d) => byKey.get(d)?.state === 'done')
    let state: NodeState
    let statusLabel: string
    let progress = 0

    if (def.key === 'profile') {
      state = 'done'; statusLabel = 'Verified'; progress = 1
    } else {
      const wf = def.workflowTypes ? workflows.find((w) => def.workflowTypes!.includes(w.type)) : undefined
      if (wf) {
        state = stateFromStatus(wf.status)
        statusLabel = STATUS_META[wf.status].label
        const done = wf.steps.filter((s) => s.status === 'done').length
        progress = wf.steps.length ? done / wf.steps.length : 0
      } else {
        state = depsDone ? 'upcoming' : 'locked'
        statusLabel = depsDone ? (def.future ? 'Ready to begin' : 'Not started') : 'Waiting on earlier steps'
      }
    }
    if (def.key === 'start') {
      state = depsDone ? 'done' : 'locked'
      statusLabel = depsDone ? 'Started' : 'Pending'
      progress = depsDone ? 1 : 0
    }
    if (state === 'blocked') blockedKeys.push(def.key)
    byKey.set(def.key, {
      key: def.key, label: def.label, state, statusLabel, progress,
      expectedDays: def.expectedDays, owner: def.owner, future: !!def.future, onCriticalPath: false,
    })
  }

  // Longest-duration (critical) path to `start`.
  const longest: Record<string, number> = {}
  const via: Record<string, string | undefined> = {}
  for (const def of PATHWAY_NODES) {
    let best = 0
    let pick: string | undefined
    for (const dep of def.dependsOn) {
      if ((longest[dep] ?? 0) > best) { best = longest[dep]; pick = dep }
    }
    longest[def.key] = best + def.expectedDays
    via[def.key] = pick
  }
  const criticalPath: string[] = []
  for (let cur: string | undefined = 'start'; cur; cur = via[cur]) criticalPath.unshift(cur)
  for (const k of criticalPath) { const n = byKey.get(k); if (n) n.onCriticalPath = true }

  const nodes = PATHWAY_NODES.map((d) => byKey.get(d.key)!)
  const incomplete = criticalPath.filter((k) => byKey.get(k)?.state !== 'done')
  const remainingDays = incomplete.reduce((sum, k) => sum + (PATHWAY_NODES.find((d) => d.key === k)?.expectedDays ?? 0), 0)
  // Current = earliest incomplete node already in motion; next = the one after it.
  const currentNodeKey = incomplete.find((k) => { const s = byKey.get(k)?.state; return s === 'active' || s === 'attention' || s === 'blocked' }) ?? incomplete[0]
  const idx = currentNodeKey ? incomplete.indexOf(currentNodeKey) : -1
  const nextNodeKey = idx >= 0 ? incomplete[idx + 1] : incomplete[0]

  return { nodes, criticalPath, currentNodeKey, nextNodeKey, blockedKeys, remainingDays }
}

/** Label for a workflow type, for reuse where a node maps to a workflow. */
export function nodeWorkflowLabel(t: WorkflowType): string {
  return WORKFLOW_META[t].short
}
