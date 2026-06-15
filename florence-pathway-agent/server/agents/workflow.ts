import type { CandidateDossier, WorkflowInstance, WorkflowStatus, WorkflowType } from '../../shared/types'
import { WORKFLOW_TEMPLATES } from '../../shared/workflow-defs'
import { WORKFLOW_META } from '../../shared/constants'
import { uid, now } from './util'

// Workflow Agent
// --------------
// Instantiates workflow templates, advances status, and computes the candidate's
// immediate next actions across all of their workflows.

const STATUS_PROGRESS: Record<WorkflowStatus, number> = {
  drafted: 0.15,
  needs_candidate_data: 0.35,
  needs_document: 0.35,
  needs_human_qa: 0.6,
  qa_approved: 0.72,
  sent_to_candidate: 0.82,
  candidate_signed: 0.9,
  submitted: 0.97,
  deficiency_received: 0.85,
  resolved: 0.92,
  completed: 1,
  blocked: 0.5,
}

export function instantiateWorkflow(type: WorkflowType, candidateId: string): WorkflowInstance {
  const tpl = WORKFLOW_TEMPLATES[type]
  return {
    id: uid(),
    candidateId,
    type,
    title: WORKFLOW_META[type].label,
    status: 'drafted',
    steps: tpl.steps.map((s, i) => ({ ...s, status: i === 0 ? 'in_progress' : 'todo' })),
    createdAt: now(),
    updatedAt: now(),
  }
}

/** Set status and recompute step states (proportional to status progress). */
export function applyStatus(w: WorkflowInstance, status: WorkflowStatus, blockedReason?: string): WorkflowInstance {
  const progress = STATUS_PROGRESS[status]
  const n = w.steps.length
  const done = status === 'completed' ? n : Math.min(n - 1, Math.round(progress * n))
  w.steps = w.steps.map((s, i) => ({
    ...s,
    status: i < done ? 'done' : i === done ? (status === 'blocked' ? 'blocked' : 'in_progress') : 'todo',
  }))
  w.status = status
  w.blockedReason = status === 'blocked' ? blockedReason : undefined
  w.updatedAt = now()
  return w
}

export interface NextAction {
  workflowId: string
  type: WorkflowType
  workflowShort: string
  title: string
  description?: string
}

/** The immediate candidate-owned actions across all active workflows. */
export function nextActions(d: CandidateDossier): NextAction[] {
  const out: NextAction[] = []
  for (const w of d.workflows) {
    if (w.status === 'completed' || w.status === 'submitted') continue
    const step = w.steps.find((s) => s.owner === 'candidate' && s.status !== 'done')
    if (step) {
      out.push({
        workflowId: w.id,
        type: w.type,
        workflowShort: WORKFLOW_META[w.type].short,
        title: step.title,
        description: step.description,
      })
    }
  }
  return out
}
