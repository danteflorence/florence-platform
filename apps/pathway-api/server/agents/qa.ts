import type { CandidateDossier, ConsistencyFlag, FormDraft, MissingItem, QaReview, WorkflowInstance } from '../../shared/types'
import { getLlm } from '../llm/provider'
import { uid, now } from './util'

// QA Agent
// --------
// Prepares the human reviewer summary: the answers, their sources, the risks,
// and the fields that need attention — plus a recommendation.
export async function buildQaReview(
  w: WorkflowInstance,
  d: CandidateDossier,
  draft: FormDraft,
  flags: ConsistencyFlag[],
  missing: MissingItem[],
): Promise<QaReview> {
  const answers = draft.sections.flatMap((s) => s.answers)
  const sensitiveCount = answers.filter((a) => a.sensitive).length
  const escalateCount = flags.filter((f) => f.requiresEscalation).length

  const summary = await getLlm().summarizeForQa({
    candidateName: `${d.profile.legalFirstName} ${d.profile.legalLastName}`,
    workflowTitle: w.title,
    flagLabels: flags.slice(0, 6).map((f) => f.message),
    missingLabels: missing.map((m) => m.label),
    sensitiveCount,
    escalateCount,
  })

  const changedFields = answers
    .filter((a) => a.sensitive || a.confidence === 'low' || a.status === 'inconsistent' || a.status === 'missing')
    .map((a) => a.label)

  return {
    id: uid(),
    workflowId: w.id,
    candidateId: d.profile.id,
    formDraftId: draft.id,
    status: 'pending',
    summary,
    flags,
    missing,
    changedFields,
    createdAt: now(),
  }
}
