// Agent orchestrator
// ------------------
// Wires the specialized agents into the governed pipeline:
//   extract → map → consistency + missing → compliance → workflow status → QA
// and emits a milestone to the FlorenceRN production ledger.
import { getDossier, store, audit } from '../db'
import type { WorkflowStatus, LedgerMilestone, ConsistencyFlag, MissingItem, FormDraft, QaReview, WorkflowInstance } from '../../shared/types'
import { WORKFLOW_META } from '../../shared/constants'
import { extractFacts } from './dataExtraction'
import { mapForm } from './formMapping'
import { checkConsistency } from './consistency'
import { findMissing } from './missingData'
import { complianceCheck, type ComplianceResult } from './compliance'
import { applyStatus } from './workflow'
import { buildQaReview } from './qa'
import { notifyCandidate } from '../notifications'
import { uid, now } from './util'

export interface PipelineResult {
  workflow: WorkflowInstance
  draft: FormDraft
  flags: ConsistencyFlag[]
  missing: MissingItem[]
  qa: QaReview
  compliance: ComplianceResult
}

export async function runPipeline(workflowId: string): Promise<PipelineResult> {
  const w = await store.workflows.get(workflowId)
  if (!w) throw new Error('workflow not found')
  const d = await getDossier(w.candidateId)
  if (!d) throw new Error('candidate not found')

  const facts = extractFacts(d)
  const draft = mapForm(w.type, d, facts, w.id)
  await store.formDrafts.insert(draft)

  const flags = checkConsistency(d, facts)
  const missing = findMissing(w.type, d, draft)
  const compliance = complianceCheck(w.type, draft, d, flags)

  const status: WorkflowStatus = compliance.blocked
    ? 'blocked'
    : missing.some((m) => m.blocker)
      ? 'needs_candidate_data'
      : 'needs_human_qa'

  applyStatus(w, status, compliance.blocked ? compliance.blocks.map((b) => b.message).join('; ') : undefined)
  await store.workflows.update(w)

  const qa = await buildQaReview(w, d, draft, flags, missing)
  await store.qaReviews.insert(qa)

  await audit('agent', 'pipeline_run', 'workflow', w.id, w.candidateId, `status=${status}; flags=${flags.length}; missing=${missing.length}`)
  await pushMilestone(w.candidateId, w.id, `${WORKFLOW_META[w.type].short} draft ready`)

  return { workflow: w, draft, flags, missing, qa, compliance }
}

/** Record a production-ledger milestone and (optionally) POST it to FlorenceRN. */
export async function pushMilestone(candidateId: string, workflowId: string | undefined, milestone: string): Promise<LedgerMilestone> {
  const m: LedgerMilestone = { id: uid(), candidateId, workflowId, milestone, at: now(), pushedToLedger: false }
  const hook = process.env.FLORENCE_LEDGER_WEBHOOK
  if (hook) {
    void fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(m) }).catch(() => {})
    m.pushedToLedger = true
  }
  await store.ledger.insert(m)
  await audit('system', 'ledger_milestone', 'candidate', candidateId, candidateId, milestone)
  // The engine finally speaks: every milestone notifies the candidate (their
  // own progress, label only). Fire-and-forget — never blocks the pipeline.
  void notifyCandidate(candidateId, 'milestone', { milestone }, workflowId ? { workflowId } : {}).catch(() => undefined)
  return m
}
