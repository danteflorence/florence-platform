import type { CandidateDossier, ConsistencyFlag, WorkflowInstance } from '../../shared/types'
import { getRule } from '../../shared/rules'
import { getLlm } from '../llm/provider'
import type { NextAction } from './workflow'
import { daysUntil } from './util'

// Candidate Guide Agent
// ---------------------
// Speaks to the nurse in plain language: explains the current step, and compiles
// the briefing the copilot chat uses to answer questions.

export async function explainStepForWorkflow(d: CandidateDossier, w: WorkflowInstance): Promise<string> {
  const rule = getRule(w.type)
  const step = w.steps.find((s) => s.status === 'in_progress') ?? w.steps[0]
  return getLlm().explainStep({
    candidateName: d.profile.legalFirstName,
    workflowTitle: w.title,
    stepTitle: step.title,
    ruleSummary: rule.summary,
    guardrails: rule.guardrails,
  })
}

/** Compile a compact briefing string consumed by the copilot chat. */
export function buildBriefing(d: CandidateDossier, actions: NextAction[], flags: ConsistencyFlag[]): string {
  const lines: string[] = []
  for (const a of actions) lines.push(`- ${a.title} (${a.workflowShort})`)

  const nameFlag = flags.find((f) => f.type === 'name_mismatch')
  lines.push(`NAME: ${nameFlag ? `${nameFlag.detail} — fix before exam/appointment` : 'consistent across documents'}`)

  const passport = d.identityDocuments.find((x) => x.kind === 'passport')
  if (passport?.expirationDate) {
    lines.push(`PASSPORT: expires ${passport.expirationDate} (${daysUntil(passport.expirationDate)} days)`)
  }

  const att = d.nclex.find((n) => n.attIssued)
  const reg = d.nclex.find((n) => n.pearsonRegistered)
  lines.push(`NCLEX/ATT: ${att ? `ATT issued, expires ${att.attExpiresOn}` : reg ? 'registered with Pearson, awaiting ATT' : 'not yet registered'}`)

  lines.push('APPOINTMENT: guided scheduling available once the DS-160 is signed')
  return lines.join('\n')
}

export async function copilotReply(d: CandidateDossier, question: string, actions: NextAction[], flags: ConsistencyFlag[]): Promise<string> {
  const context = buildBriefing(d, actions, flags)
  return getLlm().chat({ candidateName: d.profile.legalFirstName, question, context })
}
