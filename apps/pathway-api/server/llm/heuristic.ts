import type { LlmProvider, ExplainStepInput, QaSummaryInput, ChatInput } from './provider'

// Deterministic, no-API-key implementation. Outputs are templated but genuinely
// derived from the structured inputs — this is the honest fallback, and it also
// makes the point that the moat is the data + rules, not the prose.

function explainStep(i: ExplainStepInput): string {
  const lead = `**${i.stepTitle}** — for ${i.candidateName}`
  const guard = i.guardrails[0] ? `\n\n*Important:* ${i.guardrails[0]}` : ''
  return `${lead}\n\n${i.ruleSummary}${guard}`
}

function summarizeForQa(i: QaSummaryInput): string {
  const parts: string[] = []
  parts.push(`Draft for **${i.candidateName}** — ${i.workflowTitle}.`)
  if (i.escalateCount > 0) {
    parts.push(`⛔ ${i.escalateCount} item(s) require escalation to counsel/specialist before this can proceed.`)
  }
  if (i.sensitiveCount > 0) {
    parts.push(`${i.sensitiveCount} legally-sensitive answer(s) need explicit candidate confirmation.`)
  }
  if (i.flagLabels.length) {
    parts.push(`Flags: ${i.flagLabels.join(', ')}.`)
  } else {
    parts.push('No consistency flags raised.')
  }
  if (i.missingLabels.length) {
    parts.push(`Missing before submission: ${i.missingLabels.join(', ')}.`)
  }
  const recommend = i.escalateCount > 0
    ? 'Recommendation: escalate, do not approve.'
    : i.missingLabels.length || i.flagLabels.length
      ? 'Recommendation: request changes / collect missing data, then re-review.'
      : 'Recommendation: clean draft — safe to approve for candidate review.'
  parts.push(recommend)
  return parts.join('\n\n')
}

function classifyDeficiency(items: string[]): { classification: string; responseDraft: string } {
  const text = items.join(' ').toLowerCase()
  const cat = /fingerprint|livescan/.test(text) ? 'Fingerprinting'
    : /transcript|education|program|verif/.test(text) ? 'Education verification'
      : /infection|child|coursework|course/.test(text) ? 'Required coursework'
        : /name|spelling|match/.test(text) ? 'Name discrepancy'
          : /fee|payment/.test(text) ? 'Fee / payment'
            : /english|ielts|oet|toefl/.test(text) ? 'English proficiency'
              : /photo|document|missing|copy/.test(text) ? 'Missing document'
                : 'General deficiency'
  const lines = items.map((it, n) => `${n + 1}. ${it} → action drafted; routed to candidate checklist.`)
  const responseDraft =
    `Classification: ${cat}.\n\nProposed response:\n${lines.join('\n')}\n\n` +
    'Each item is added to the candidate checklist with plain-language instructions. Human QA reviews the response before it is sent.'
  return { classification: cat, responseDraft }
}

function chat(i: ChatInput): string {
  const q = i.question.toLowerCase()
  const ctx = i.context
  const line = (needle: RegExp): string | null => {
    const hit = ctx.split('\n').find((l) => needle.test(l))
    return hit ? hit.replace(/^[-•]\s*/, '').trim() : null
  }
  const nextActions = ctx
    .split('\n')
    .filter((l) => /^[-•]/.test(l))
    .map((l) => l.replace(/^[-•]\s*/, '').trim())

  if (/(name|spelling|match)/.test(q)) {
    return line(/name/i) ?? 'Your name must match exactly across your passport, ID, board application, and Pearson registration. I don’t see a mismatch right now.'
  }
  if (/passport/.test(q)) {
    return line(/passport/i) ?? 'I have your passport details on file. Let me know if anything changed.'
  }
  if (/(fingerprint|livescan)/.test(q)) {
    return nextActions.find((a) => /fingerprint|livescan/i.test(a)) ?? 'Electronic (Livescan) fingerprinting is required for Florida licensure. I’ll walk you through where to go.'
  }
  if (/(appointment|interview|consulate|embassy)/.test(q)) {
    return line(/appointment/i) ?? 'For your visa appointment I’ll guide you step-by-step on the official portal once your DS-160 is signed.'
  }
  if (/(nclex|att|pearson)/.test(q)) {
    const nl = line(/NCLEX\/ATT/i)
    if (/expir|when|valid|deadline/.test(q) && nl) return nl.replace(/^NCLEX\/ATT:\s*/i, 'For NCLEX — ')
    return nextActions.find((a) => /nclex|att|pearson/i.test(a)) ?? nl ?? 'For NCLEX you’ll register with Pearson, then receive your Authorization to Test (ATT). I check that your name matches exactly first.'
  }
  if (/(visa|ds-?160)/.test(q)) {
    return 'For your DS-160, I prepare and quality-check the draft, then you personally review and sign it — by law the applicant must sign their own DS-160. ' + (nextActions[0] ? `Next: ${nextActions[0]}` : '')
  }
  if (/(next|what|todo|to do|do i|should i|now)/.test(q)) {
    if (!nextActions.length) return `You’re all caught up for now, ${i.candidateName}. I’ll notify you the moment something needs your attention.`
    return `Here’s what I need from you next, ${i.candidateName}:\n\n` + nextActions.slice(0, 5).map((a) => `• ${a}`).join('\n')
  }
  // Fallback
  if (nextActions.length) {
    return `I’m your Florence pathway copilot. Right now the most important next step is: **${nextActions[0]}**. Ask me about your visa, NCLEX, fingerprinting, name match, or appointment any time.`
  }
  return `I’m your Florence pathway copilot, ${i.candidateName}. Ask me what’s next, or about your visa, NCLEX, licensure, or appointment.`
}

export const heuristicProvider: LlmProvider = {
  mode: 'heuristic',
  async explainStep(i) { return explainStep(i) },
  async summarizeForQa(i) { return summarizeForQa(i) },
  async classifyDeficiency(items) { return classifyDeficiency(items) },
  async chat(i) { return chat(i) },
}
