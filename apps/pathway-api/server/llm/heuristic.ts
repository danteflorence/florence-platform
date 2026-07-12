import type { LlmProvider, ExplainStepInput, QaSummaryInput, ChatInput, ExtractDocumentInput, ExtractedDocumentProposal } from './provider'

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

// ── document extraction (deterministic, no model) ───────────────────────────
// Real capability, honestly labeled: parses the passport MRZ (TD3, two 44-char
// lines) when the caller supplies it as text — surname/given names, birth date,
// expiry, issuing state, and the document number truncated to LAST 4 at this
// seam. Without an MRZ it returns an empty proposal so the UI asks the
// candidate to type the fields (never invents values). Vision (photo → fields)
// requires the Model Gateway provider.
const yymmddToIso = (s: string, kind: 'dob' | 'expiry'): string | undefined => {
  if (!/^\d{6}$/.test(s)) return undefined
  const yy = Number(s.slice(0, 2))
  const nowYy = new Date().getUTCFullYear() % 100
  // dob: past century window; expiry: future window.
  const century = kind === 'dob' ? (yy > nowYy ? 1900 : 2000) : (yy < nowYy - 1 ? 2100 : 2000)
  return `${century + yy}-${s.slice(2, 4)}-${s.slice(4, 6)}`
}

function extractDocument(i: ExtractDocumentInput): ExtractedDocumentProposal {
  const notes: string[] = []
  const lines = (i.textContent ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim().toUpperCase())
    .filter((l) => l.length >= 30 && /^[A-Z0-9<]+$/.test(l))
  const l1 = lines.find((l) => l.startsWith('P<'))
  const l2 = l1 ? lines[lines.indexOf(l1) + 1] : undefined
  if (l1 && l2) {
    const fields: Record<string, string> = {}
    const nameBlock = l1.slice(5).split('<<')
    const family = (nameBlock[0] ?? '').replace(/</g, ' ').trim()
    const given = (nameBlock[1] ?? '').replace(/</g, ' ').trim()
    if (family) fields.familyName = family
    if (given) fields.givenNames = given
    if (family || given) fields.nameOnDocument = `${given} ${family}`.trim()
    fields.issuingAuthority = l1.slice(2, 5).replace(/</g, '')
    const number = l2.slice(0, 9).replace(/</g, '')
    if (number) fields.documentNumberLast4 = number.slice(-4)
    const dob = yymmddToIso(l2.slice(13, 19), 'dob')
    if (dob) fields.dateOfBirth = dob
    const exp = yymmddToIso(l2.slice(21, 27), 'expiry')
    if (exp) fields.expirationDate = exp
    notes.push('Parsed from the machine-readable zone (MRZ). Confirm each field against the printed page.')
    return { fields, confidence: 'medium', notes }
  }
  notes.push(
    i.imageBase64
      ? 'Photo received, but no vision provider is configured — connect the Core Model Gateway for photo extraction, or type the fields below.'
      : 'No machine-readable text found. Type the fields exactly as printed on the document.',
  )
  return { fields: {}, confidence: 'unknown', notes }
}

export const heuristicProvider: LlmProvider = {
  mode: 'heuristic',
  async explainStep(i) { return explainStep(i) },
  async summarizeForQa(i) { return summarizeForQa(i) },
  async classifyDeficiency(items) { return classifyDeficiency(items) },
  async chat(i) { return chat(i) },
  async extractDocument(i) { return extractDocument(i) },
}
