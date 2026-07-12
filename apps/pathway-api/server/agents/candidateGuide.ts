import type { CandidateDossier, ConsistencyFlag, WorkflowInstance } from '../../shared/types'
import { getRule } from '../../shared/rules'
import { getLanguage } from '../../shared/languages'
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

  // H02: the briefing feeds the model-gateway chat context — keep the mismatch
  // SIGNAL but never the detail text (it spells out full legal names across
  // documents). The candidate sees the specifics on their documents screen.
  const nameFlag = flags.find((f) => f.type === 'name_mismatch')
  lines.push(`NAME: ${nameFlag ? 'mismatch detected across documents — fix before exam/appointment' : 'consistent across documents'}`)

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

/** Official-source citations for the candidate's ACTIVE workflows — every
 *  copilot answer is grounded in the same sources the requirements ledger uses. */
export function groundingSources(d: CandidateDossier): { label: string; url: string }[] {
  const seen = new Set<string>()
  const out: { label: string; url: string }[] = []
  for (const w of d.workflows) {
    if (['submitted', 'completed'].includes(w.status)) continue
    for (const r of getRule(w.type).officialResources.slice(0, 2)) {
      if (seen.has(r.url)) continue
      seen.add(r.url)
      out.push({ label: r.label, url: r.url })
    }
  }
  return out.slice(0, 5)
}

export async function copilotReply(d: CandidateDossier, question: string, actions: NextAction[], flags: ConsistencyFlag[]): Promise<string> {
  const context = buildBriefing(d, actions, flags)
  const lang = getLanguage(d.profile.preferredLanguage)
  const reply = await getLlm().chat({ candidateName: d.profile.legalFirstName, question, context, language: lang.code })
  // Localized frame + grounded citations (deterministic — not model output).
  const sources = groundingSources(d)
  const parts = [
    `${lang.greeting(d.profile.legalFirstName)} —`,
    reply,
    ...(sources.length ? [`\n${lang.sourcesHeader}:`, ...sources.map((s) => `• ${s.label} — ${s.url}`)] : []),
    ...(lang.code !== 'en' && lang.translationNote && getLlm().mode === 'heuristic' ? [`\n${lang.translationNote}`] : []),
  ]
  return parts.join('\n')
}
