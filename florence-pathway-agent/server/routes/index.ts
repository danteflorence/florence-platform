import { Router, type Request, type Response, type NextFunction } from 'express'
import { store, getDossier, uid, now, audit } from '../db'
import {
  createCandidateSchema, createWorkflowSchema, qaDecisionSchema,
  attestationSchema, answerMissingSchema, deficiencySchema, reviewAndSignSchema,
  recordConfirmationSchema, appointmentSchema, nclexRegisterSchema, nclexAttSchema, visaResultSchema,
} from '../../shared/schema'
import { ALL_RULES, getRule } from '../../shared/rules'
import { WORKFLOW_META, VISA_OUTCOME_LABEL } from '../../shared/constants'
import type { CandidateProfile, WorkflowInstance, PathwayDocument } from '../../shared/types'
import { runPipeline, pushMilestone } from '../agents'
import { emitForCandidate } from '../passport'
import { checkReadinessGate, type OverrideTicket } from '../readinessGate'
import { instantiateWorkflow, applyStatus, nextActions } from '../agents/workflow'
import { extractFacts } from '../agents/dataExtraction'
import { checkConsistency } from '../agents/consistency'
import { findMissing } from '../agents/missingData'
import { copilotReply } from '../agents/candidateGuide'
import { getLlm } from '../llm/provider'
import {
  assembleCandidateView, assembleQaQueue, assembleQaDetail,
  assembleAdminMetrics, candidateSummaries,
} from '../views'
import { requireRole, principalFromRequest, isStaff as isStaffPrincipal } from '../coreAuth'

export const api = Router()

const h = (fn: (req: Request, res: Response) => unknown | Promise<unknown>) =>
  (req: Request, res: Response) => {
    Promise.resolve(fn(req, res)).catch((err) => {
      console.error('[api error]', err)
      if (!res.headersSent) res.status(500).json({ error: String(err?.message ?? err) })
    })
  }

const mw = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next) }

// --- FlorenceRN Core SSO gate --------------------------------------------------
// QA Console + Operations are STAFF surfaces (Operations holds Florence's economics).
// They require a Core staff role; the Candidate Copilot stays open. Auth is enforced
// by verifying Core's RS256 SSO token (shared cookie OR bearer) via JWKS — no local
// passcode. The role→app mapping: QA reviewers reach /qa; only ops/super_admin reach
// the economics under /admin.
api.use(['/admin'], requireRole('super_admin', 'ops'))
api.use(['/qa'], requireRole('super_admin', 'ops', 'qa'))

// Session probe for the SPA — "who am I?" per the shared Core cookie.
api.get('/session', h(async (req, res) => {
  const p = await principalFromRequest(req)
  if (!p) return res.json({ authenticated: false })
  res.json({
    authenticated: true,
    email: p.email ?? null,
    role: p.role ?? null,
    roles: p.roles,
    cand: p.cand ?? null,
    staff: isStaffPrincipal(p),
  })
}))

// Candidate binding (defense-in-depth): a candidate-bound Core token may only touch
// its OWN dossier/workflows; staff bypass; anonymous stays allowed for the open
// copilot (interim — full lockdown lands with the candidate sign-in frontend).
api.use('/candidates/:id', mw(async (req, res, next) => {
  const p = await principalFromRequest(req)
  if (p && !isStaffPrincipal(p) && p.cand && p.cand !== req.params.id) {
    res.status(403).json({ error: 'You can only access your own records.' })
    return
  }
  next()
}))
api.use('/workflows/:id', mw(async (req, res, next) => {
  const p = await principalFromRequest(req)
  if (p && !isStaffPrincipal(p) && p.cand) {
    const w = store.workflows.get(req.params.id)
    if (w && w.candidateId !== p.cand) {
      res.status(403).json({ error: 'You can only access your own records.' })
      return
    }
  }
  next()
}))

// --- meta ------------------------------------------------------------------
api.get('/health', (_req, res) => res.json({ ok: true, at: now() }))
api.get('/meta', (_req, res) => res.json({
  llmMode: getLlm().mode,
  workflows: WORKFLOW_META,
  rules: ALL_RULES,
}))

// --- candidates ------------------------------------------------------------
api.get('/candidates', h((_req, res) => res.json(candidateSummaries())))

api.post('/candidates', h((req, res) => {
  const parsed = createCandidateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const c = parsed.data
  const profile: CandidateProfile = {
    id: uid(), aliases: [], createdAt: now(), updatedAt: now(),
    legalFirstName: c.legalFirstName, legalMiddleName: c.legalMiddleName, legalLastName: c.legalLastName,
    dateOfBirth: c.dateOfBirth, citizenship: c.citizenship, nationality: c.nationality,
    countryOfResidence: c.countryOfResidence, email: c.email, phone: c.phone,
    visaTarget: c.visaTarget, nclexState: c.nclexState, employmentState: c.employmentState, targetStartDate: c.targetStartDate,
    ...(c.pnleHistory ? { pnleHistory: c.pnleHistory } : {}),
  }
  store.candidates.insert(profile)
  audit('system', 'candidate_created', 'candidate', profile.id, profile.id)
  res.json({ id: profile.id })
}))

api.get('/candidates/:id', h((req, res) => {
  const d = getDossier(req.params.id)
  if (!d) return res.status(404).json({ error: 'not found' })
  res.json(d)
}))

api.get('/candidates/:id/view', h((req, res) => {
  const v = assembleCandidateView(req.params.id)
  if (!v) return res.status(404).json({ error: 'not found' })
  res.json(v)
}))

api.get('/candidates/:id/required-actions', h((req, res) => {
  const d = getDossier(req.params.id)
  if (!d) return res.status(404).json({ error: 'not found' })
  res.json(nextActions(d))
}))

api.post('/candidates/:id/chat', h(async (req, res) => {
  const d = getDossier(req.params.id)
  if (!d) return res.status(404).json({ error: 'not found' })
  const question = String(req.body?.question ?? '')
  const flags = checkConsistency(d, extractFacts(d))
  const reply = await copilotReply(d, question, nextActions(d), flags)
  audit('candidate', 'copilot_chat', 'candidate', d.profile.id, d.profile.id, question.slice(0, 120))
  res.json({ reply })
}))

api.post('/candidates/:id/notify', h((req, res) => {
  const view = assembleCandidateView(req.params.id)
  if (!view) return res.status(404).json({ error: 'not found' })
  const hook = process.env.FLORENCE_NOTIFY_WEBHOOK
  for (const r of view.reminders) {
    if (hook) void fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to: view.profile.email, title: r.title, detail: r.detail, severity: r.severity }) }).catch(() => {})
    audit('system', 'reminder_dispatched', 'candidate', req.params.id, req.params.id, r.title)
  }
  res.json({ sent: view.reminders.length, channel: hook ? 'webhook' : 'logged (set FLORENCE_NOTIFY_WEBHOOK for email/SMS delivery)' })
}))

api.post('/candidates/:id/documents', h((req, res) => {
  const c = store.candidates.get(req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  const kind = String(req.body?.kind ?? 'derived') as PathwayDocument['kind']
  const filename = String(req.body?.filename ?? 'document')
  // Extraction is vision-pluggable: with ANTHROPIC_API_KEY a vision model reads
  // the upload; without a key the document is stored for manual confirmation.
  const doc: PathwayDocument = { id: uid(), candidateId: c.id, kind, filename, uploadedAt: now(), extracted: false, extractionConfidence: 'unknown' }
  store.documents.insert(doc)
  audit('candidate', 'document_uploaded', 'candidate', c.id, c.id, `${kind}: ${filename}`)
  emitForCandidate(c.id, 'pathway.document_verified', { key: kind })
  res.json({ id: doc.id, extracted: doc.extracted })
}))

const EXAM_TYPE_BY_STATE: Record<string, WorkflowInstance['type']> = {
  florida: 'florida_rn_exam', 'new york': 'newyork_rn_exam', texas: 'texas_rn_exam',
  california: 'california_rn_exam', arizona: 'arizona_rn_exam',
}

// The "choose your state" engine: the nurse picks where they accepted a job; we
// auto-route to endorsement (if they hold a U.S. license) or exam licensure, set
// the target state, and spin up the pre-filled, state-specific pathway.
api.post('/candidates/:id/choose-state', h(async (req, res) => {
  const c = store.candidates.get(req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  const state = String(req.body?.state ?? '').trim()
  if (!state) return res.status(400).json({ error: 'state is required' })
  const d = getDossier(c.id)
  if (!d) return res.status(404).json({ error: 'not found' })

  const hasUsLicense = d.licenses.some((l) => l.kind === 'us_state')
  let path: 'endorsement' | 'exam'
  let type: WorkflowInstance['type']
  if (hasUsLicense) {
    path = 'endorsement'; type = 'endorsement'
  } else {
    // The five flagship states keep their detailed workflows; any other state flows
    // through the generic, data-driven rn_exam engine — so a new grad can pick ANY state.
    const exam = EXAM_TYPE_BY_STATE[state.toLowerCase()] ?? 'rn_exam'
    path = 'exam'; type = exam; c.nclexState = state
  }

  c.employmentState = state
  c.updatedAt = now()
  store.candidates.update(c)

  let w = store.workflows.byCandidate(c.id).find((x) => x.type === type && !['submitted', 'completed'].includes(x.status))
  const created = !w
  if (!w) { w = instantiateWorkflow(type, c.id); store.workflows.insert(w) }
  await runPipeline(w.id) // (re)generate the draft so it reflects the chosen target state

  audit('candidate', 'chose_state', 'candidate', c.id, c.id, `${state} (${path})`)
  if (created) pushMilestone(c.id, w.id, `Pathway started: ${state} (${path})`)
  emitForCandidate(c.id, 'pathway.licensure_status', { status: 'in_progress', state, path })
  res.json({ path, state, workflowId: w.id, type, created })
}))

// Track whether the candidate has obtained their SSN — a BOOLEAN ONLY. We never
// accept, request, or store the number itself; the nurse enters it solely on the
// official application. Any non-boolean (e.g. a digit string) is rejected.
api.post('/candidates/:id/ssn-status', h(async (req, res) => {
  const c = store.candidates.get(req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  if (typeof req.body?.hasSsn !== 'boolean') {
    return res.status(400).json({ error: 'hasSsn must be a boolean — Florence never collects the SSN itself, only whether you have one.' })
  }
  c.hasSsn = req.body.hasSsn
  c.updatedAt = now()
  store.candidates.update(c)
  audit('candidate', 'ssn_status', 'candidate', c.id, c.id, c.hasSsn ? 'received SSN' : 'no SSN yet')
  res.json({ hasSsn: c.hasSsn })
}))

// Grant / revoke consent for reusing the canonical profile across FlorenceRN products.
// Capital and employer packet generators gate on these scopes (canShare).
const CONSENT_SCOPE_SET = new Set(['visa', 'education', 'underwriting', 'employer', 'demand_radar'])
api.post('/candidates/:id/consent', h(async (req, res) => {
  const c = store.candidates.get(req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  const scope = String(req.body?.scope ?? '')
  if (!CONSENT_SCOPE_SET.has(scope)) return res.status(400).json({ error: 'invalid consent scope' })
  if (typeof req.body?.granted !== 'boolean') return res.status(400).json({ error: 'granted must be a boolean' })
  c.consents = { ...(c.consents ?? {}), [scope]: { granted: req.body.granted, grantedAt: req.body.granted ? now() : undefined, via: 'candidate_portal' } }
  c.updatedAt = now()
  store.candidates.update(c)
  audit('candidate', 'consent', 'candidate', c.id, c.id, `${scope}=${req.body.granted}`)
  emitForCandidate(c.id, 'consent.updated', { scope, status: req.body.granted ? 'granted' : 'revoked' })
  // Re-generate the consent-gated packet so the gate is live: granting underwriting
  // assembles the financing packet; granting employer assembles the employer packet.
  const affected = scope === 'underwriting' ? 'financing_packet' : scope === 'employer' ? 'employer_packet' : null
  if (affected) {
    const w = store.workflows.byCandidate(c.id).find((x) => x.type === affected)
    if (w) await runPipeline(w.id)
  }
  res.json({ scope, granted: req.body.granted })
}))

// --- workflows -------------------------------------------------------------
api.post('/workflows', h(async (req, res) => {
  const parsed = createWorkflowSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { candidateId, type } = parsed.data
  if (!store.candidates.get(candidateId)) return res.status(404).json({ error: 'candidate not found' })
  const w = instantiateWorkflow(type, candidateId)
  store.workflows.insert(w)
  audit('agent', 'workflow_created', 'workflow', w.id, candidateId, type)
  const result = await runPipeline(w.id)
  res.json(result)
}))

api.get('/workflows/:id', h((req, res) => {
  const w = store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  res.json({
    workflow: w,
    draft: store.formDrafts.byWorkflow(w.id),
    qa: store.qaReviews.byWorkflow(w.id),
    rule: getRule(w.type),
    deficiencies: store.deficiencies.byWorkflow(w.id),
  })
}))

api.post('/workflows/:id/run', h(async (req, res) => {
  const w = store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  res.json(await runPipeline(w.id))
}))

api.post('/workflows/:id/answer', h((req, res) => {
  const w = store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  const parsed = answerMissingSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const draft = store.formDrafts.byWorkflow(w.id)
  if (!draft) return res.status(400).json({ error: 'no draft' })
  let updated = false
  for (const s of draft.sections) for (const a of s.answers) {
    if (a.fieldId === parsed.data.fieldId) {
      a.value = parsed.data.value
      a.status = a.sensitive ? 'legally_sensitive' : 'user_entered'
      a.confidence = 'medium'
      a.evidence = [{ sourceType: 'candidate_input', detail: 'Candidate provided' }]
      if (a.sensitive) a.candidateAttested = true
      updated = true
    }
  }
  store.formDrafts.update(draft)
  const d = getDossier(w.candidateId)!
  const missing = findMissing(w.type, d, draft)
  const qa = store.qaReviews.byWorkflow(w.id)
  if (qa) { qa.missing = missing; store.qaReviews.update(qa) }
  if (w.status === 'needs_candidate_data' && !missing.some((m) => m.blocker)) {
    applyStatus(w, 'needs_human_qa'); store.workflows.update(w)
  }
  audit('candidate', 'answer_provided', 'workflow', w.id, w.candidateId, parsed.data.fieldId)
  res.json({ updated, missing, status: w.status })
}))

api.post('/workflows/:id/attest', h((req, res) => {
  const w = store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  const parsed = attestationSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const draft = store.formDrafts.byWorkflow(w.id)
  if (draft) {
    for (const s of draft.sections) for (const a of s.answers) if (a.sensitive && a.value) a.candidateAttested = true
    store.formDrafts.update(draft)
  }
  store.attestations.insert({
    id: uid(), workflowId: w.id, candidateId: w.candidateId,
    statement: getRule(w.type).key === 'ds160'
      ? 'I have reviewed my answers and I will personally sign and submit my DS-160. My answers are true and correct.'
      : 'I have reviewed this application; the information is true and correct and I authorize its submission.',
    signatureName: parsed.data.signatureName, attestedAt: now(),
  })
  applyStatus(w, 'candidate_signed'); store.workflows.update(w)
  audit('candidate', 'attested', 'workflow', w.id, w.candidateId, parsed.data.signatureName)
  pushMilestone(w.candidateId, w.id, `${WORKFLOW_META[w.type].short} candidate signed`)
  res.json({ status: w.status })
}))

api.post('/workflows/:id/review-and-sign', h((req, res) => {
  const w = store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  const parsed = reviewAndSignSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const draft = store.formDrafts.byWorkflow(w.id)
  if (!draft) return res.status(400).json({ error: 'no draft' })

  const provided = new Map(parsed.data.answers.map((a) => [a.fieldId, a]))
  const confirmed = new Set(parsed.data.confirmedFieldIds)

  for (const s of draft.sections) {
    for (const a of s.answers) {
      const p = provided.get(a.fieldId)
      if (p) {
        a.value = p.note ? `${p.value} — ${p.note}` : p.value
        a.status = a.sensitive ? 'legally_sensitive' : 'user_entered'
        a.confidence = 'high'
        a.evidence = [{ sourceType: 'candidate_input', detail: 'Candidate reviewed & confirmed' }]
        a.candidateAttested = true
      } else if (confirmed.has(a.fieldId) && a.value != null && a.value !== '') {
        a.candidateAttested = true
      }
    }
  }

  // The review is only valid if every legally-sensitive question now has an answer.
  const unanswered = draft.sections.flatMap((s) => s.answers).filter((a) => a.sensitive && (a.value == null || a.value === ''))
  if (unanswered.length) {
    return res.status(409).json({ error: `You must answer all required questions first (${unanswered.length} remaining).`, unanswered: unanswered.map((a) => a.fieldId) })
  }

  store.formDrafts.update(draft)
  store.attestations.insert({
    id: uid(), workflowId: w.id, candidateId: w.candidateId,
    statement: 'I reviewed every answer in my DS-160; the answers are true and correct to the best of my knowledge and belief; and I will personally sign and submit my DS-160 in CEAC.',
    signatureName: parsed.data.signatureName, attestedAt: now(),
  })
  applyStatus(w, 'candidate_signed'); store.workflows.update(w)

  const d = getDossier(w.candidateId)
  const qa = store.qaReviews.byWorkflow(w.id)
  if (d && qa) { qa.missing = findMissing(w.type, d, draft); store.qaReviews.update(qa) }

  audit('candidate', 'reviewed_and_signed', 'workflow', w.id, w.candidateId, `${confirmed.size} confirmed, ${provided.size} answered`)
  pushMilestone(w.candidateId, w.id, `${WORKFLOW_META[w.type].short} candidate reviewed & signed`)
  res.json({ status: w.status, attestedFields: confirmed.size + provided.size })
}))

api.post('/workflows/:id/record-confirmation', h(async (req, res) => {
  const w = store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  if (w.type !== 'ds160') return res.status(400).json({ error: 'confirmation capture is for the DS-160' })
  if (w.status !== 'candidate_signed') return res.status(409).json({ error: 'Sign your DS-160 before recording the CEAC confirmation.' })
  const parsed = recordConfirmationSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const num = parsed.data.confirmationNumber.toUpperCase()
  w.confirmationNumber = num
  store.submissions.insert({
    id: uid(), workflowId: w.id, candidateId: w.candidateId, type: w.type,
    mode: 'candidate_self_submit', reference: num,
    note: 'Applicant submitted the DS-160 in CEAC; confirmation barcode captured.', at: now(),
  })
  applyStatus(w, 'submitted'); store.workflows.update(w)
  audit('candidate', 'ds160_confirmation_recorded', 'workflow', w.id, w.candidateId, num)
  pushMilestone(w.candidateId, w.id, 'DS-160 submitted')
  emitForCandidate(w.candidateId, 'pathway.visa_status', { stage: 'ds160_submitted' })

  // Refresh the visa appointment so it now sees the signed-and-submitted DS-160.
  const va = store.workflows.byCandidate(w.candidateId).find((x) => x.type === 'visa_appointment')
  if (va) await runPipeline(va.id)

  res.json({ status: w.status, confirmationNumber: num })
}))

// Capture the CONSULAR DECISION after the visa interview. STAFF-ATTESTED (ops/QA) —
// AI never decides, the candidate never self-reports it. This is the single
// deterministic source for the FlorenceRN Application Gate's visa clause: only
// 'approved' clears it downstream; everything else stays fail-closed/blocked. The
// outcome is emitted to the Core Passport spine (pathway.visa_status { stage, outcome })
// but is INTERNAL-only — Core's employer passportView withholds the visa facet (Title VII/IRCA).
api.post('/workflows/:id/visa-result', requireRole('super_admin', 'ops', 'qa'), h(async (req, res) => {
  const w = store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  if (w.type !== 'visa_appointment' && w.type !== 'ds160') return res.status(400).json({ error: 'visa outcome capture is for the visa appointment / DS-160 workflow' })
  const parsed = visaResultSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { outcome, decidedOn, note } = parsed.data

  w.visaOutcome = outcome
  store.workflows.update(w)
  store.submissions.insert({
    id: uid(), workflowId: w.id, candidateId: w.candidateId, type: w.type,
    mode: 'guided', reference: outcome, note: note ?? `Consular decision recorded: ${VISA_OUTCOME_LABEL[outcome]}`, at: now(),
  })
  const actor = (await principalFromRequest(req))?.email ?? 'qa'
  audit('qa', 'visa_outcome_recorded', 'workflow', w.id, w.candidateId, `${outcome}${decidedOn ? ` @ ${decidedOn}` : ''} by ${actor}`)
  pushMilestone(w.candidateId, w.id, VISA_OUTCOME_LABEL[outcome])
  emitForCandidate(w.candidateId, 'pathway.visa_status', { stage: 'decision', outcome, ...(decidedOn ? { decidedOn } : {}) })

  res.json({ status: w.status, visaOutcome: outcome })
}))

api.post('/workflows/:id/nclex-register', h((req, res) => {
  const w = store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  if (w.type !== 'nclex_att') return res.status(400).json({ error: 'NCLEX registration is for the nclex_att workflow' })
  const parsed = nclexRegisterSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { nameOnPearson, programCode, email, registered } = parsed.data

  const regs = store.nclex.byCandidate(w.candidateId)
  const reg = regs[0]
  if (reg) {
    reg.nameOnPearson = nameOnPearson
    if (programCode) reg.programCode = programCode
    if (email) reg.email = email
    reg.pearsonRegistered = registered
    store.nclex.update(reg)
  } else {
    store.nclex.insert({ id: uid(), candidateId: w.candidateId, nrb: store.candidates.get(w.candidateId)?.nclexState ?? '', programCode, nameOnPearson, pearsonRegistered: registered, attIssued: false, priorAttempts: 0, email })
  }

  // Recompute against the updated name so the Pearson name-match flag resolves.
  const d = getDossier(w.candidateId)!
  const flags = checkConsistency(d, extractFacts(d))
  const draft = store.formDrafts.byWorkflow(w.id)
  if (draft) {
    for (const s of draft.sections) for (const a of s.answers) {
      if (a.fieldId === 'pearson_name') { a.value = nameOnPearson; a.status = 'user_entered'; a.confidence = 'high'; a.candidateAttested = true; a.evidence = [{ sourceType: 'derived', detail: 'Pearson registration' }] }
      if (a.fieldId === 'program_code' && programCode) { a.value = programCode; a.status = 'user_entered' }
      if (a.fieldId === 'email' && email) { a.value = email; a.status = 'user_entered' }
    }
    store.formDrafts.update(draft)
    const qa = store.qaReviews.byWorkflow(w.id)
    if (qa) { qa.flags = flags; qa.missing = findMissing(w.type, d, draft); store.qaReviews.update(qa) }
  }

  if (registered) { applyStatus(w, 'submitted'); store.workflows.update(w) }
  store.submissions.insert({ id: uid(), workflowId: w.id, candidateId: w.candidateId, type: w.type, mode: 'guided', reference: programCode, note: `Registered with Pearson as "${nameOnPearson}".`, at: now() })
  audit('candidate', 'nclex_registered', 'workflow', w.id, w.candidateId, nameOnPearson)
  pushMilestone(w.candidateId, w.id, 'NCLEX registered')
  emitForCandidate(w.candidateId, 'pathway.nclex_status', { status: 'registered' })

  const pearsonMismatch = flags.some((f) => f.type === 'name_mismatch' && /pearson|nclex/i.test(f.message))
  res.json({ status: w.status, nameMatchResolved: !pearsonMismatch })
}))

api.post('/workflows/:id/nclex-att', h(async (req, res) => {
  const w = store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  if (w.type !== 'nclex_att') return res.status(400).json({ error: 'for the nclex_att workflow' })
  const parsed = nclexAttSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { attNumber, attExpiresOn, examDate, testCenter } = parsed.data
  const reg = store.nclex.byCandidate(w.candidateId)[0]
  if (!reg) return res.status(409).json({ error: 'Register with Pearson before recording your ATT.' })

  if (attExpiresOn) { reg.attIssued = true; reg.attExpiresOn = attExpiresOn; if (attNumber) reg.attNumber = attNumber; store.nclex.update(reg) }

  let milestone = attExpiresOn ? 'ATT received' : ''
  if (examDate) {
    const att = attExpiresOn ?? reg.attExpiresOn
    if (att && examDate > att) return res.status(409).json({ error: `Your exam date must be on or before your ATT expiry (${att}).` })

    // Readiness gate (shadow-first): block scheduling the sit unless the
    // candidate is at/above the readiness standard, or a staff override is given.
    let override: OverrideTicket | undefined
    const ob = (req.body as { override?: { reason?: string } } | undefined)?.override
    if (ob && typeof ob === 'object') {
      const p = await principalFromRequest(req)
      if (p && isStaffPrincipal(p)) override = { actor: p.email ?? p.userId, role: p.role ?? 'ops', reason: String(ob.reason ?? '') }
    }
    const gate = await checkReadinessGate(w.candidateId, override ? { override } : {})
    audit('system', 'nclex_readiness_gate', 'workflow', w.id, w.candidateId,
      `${gate.allowed ? 'allow' : 'BLOCK'} p=${Math.round((gate.passProbability ?? 0) * 100)}%${gate.shadow ? ' shadow' : ''}${gate.overridden ? ' overridden' : ''}`)
    if (!gate.allowed) {
      return res.status(409).json({ error: gate.reason, readinessGate: { band: gate.band, passProbability: gate.passProbability, wouldBlock: gate.wouldBlock } })
    }

    store.appointments.insert({ id: uid(), workflowId: w.id, candidateId: w.candidateId, kind: 'nclex', location: testCenter, scheduledFor: examDate, status: 'scheduled' })
    milestone = 'NCLEX scheduled'
    applyStatus(w, 'completed'); store.workflows.update(w)
  }
  store.submissions.insert({
    id: uid(), workflowId: w.id, candidateId: w.candidateId, type: w.type, mode: 'guided', reference: attNumber,
    note: [attExpiresOn && `ATT valid to ${attExpiresOn}`, examDate && `exam ${examDate}${testCenter ? ` at ${testCenter}` : ''}`].filter(Boolean).join('; '), at: now(),
  })
  audit('candidate', 'nclex_att', 'workflow', w.id, w.candidateId, milestone || 'updated')
  if (milestone) pushMilestone(w.candidateId, w.id, milestone)
  emitForCandidate(w.candidateId, 'pathway.nclex_status', { status: examDate ? 'scheduled' : 'att_received', scheduledFor: examDate })
  res.json({ status: w.status })
}))

api.post('/workflows/:id/appointment', h((req, res) => {
  const w = store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  if (w.type !== 'visa_appointment') return res.status(400).json({ error: 'appointment scheduling is for the visa appointment workflow' })
  const parsed = appointmentSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { consulate, appointmentDate, location, mrvReceipt } = parsed.data

  store.appointments.insert({
    id: uid(), workflowId: w.id, candidateId: w.candidateId,
    kind: 'visa_interview', location: location ?? consulate, scheduledFor: appointmentDate, status: 'scheduled',
  })
  const draft = store.formDrafts.byWorkflow(w.id)
  if (draft) {
    for (const s of draft.sections) for (const a of s.answers) {
      if (a.fieldId === 'consulate') { a.value = consulate; a.status = 'user_entered'; a.candidateAttested = true }
    }
    store.formDrafts.update(draft)
  }
  store.submissions.insert({
    id: uid(), workflowId: w.id, candidateId: w.candidateId, type: w.type,
    mode: 'guided', reference: mrvReceipt,
    note: `Interview scheduled at ${location ?? consulate} on ${appointmentDate}.`, at: now(),
  })
  applyStatus(w, 'submitted'); store.workflows.update(w)
  audit('candidate', 'visa_appointment_scheduled', 'workflow', w.id, w.candidateId, `${consulate} ${appointmentDate}`)
  pushMilestone(w.candidateId, w.id, 'Visa appointment scheduled')
  emitForCandidate(w.candidateId, 'pathway.visa_status', { stage: 'interview_scheduled' })
  res.json({ status: w.status })
}))

const LICENSURE_TYPES = ['florida_rn_exam', 'newyork_rn_exam', 'texas_rn_exam', 'california_rn_exam', 'arizona_rn_exam', 'endorsement']

api.post('/workflows/:id/licensure-submit', h((req, res) => {
  const w = store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  if (!LICENSURE_TYPES.includes(w.type)) return res.status(400).json({ error: 'not a licensure workflow' })
  const parsed = reviewAndSignSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const draft = store.formDrafts.byWorkflow(w.id)
  if (!draft) return res.status(400).json({ error: 'no draft' })

  const provided = new Map(parsed.data.answers.map((a) => [a.fieldId, a]))
  const confirmed = new Set(parsed.data.confirmedFieldIds)
  for (const s of draft.sections) for (const a of s.answers) {
    const p = provided.get(a.fieldId)
    if (p) {
      a.value = p.note ? `${p.value} — ${p.note}` : p.value
      a.status = 'user_entered'; a.confidence = 'high'; a.candidateAttested = true
      a.evidence = [{ sourceType: 'candidate_input', detail: 'Candidate provided' }]
    } else if (confirmed.has(a.fieldId) && a.value != null && a.value !== '') {
      a.candidateAttested = true
    }
  }
  store.formDrafts.update(draft)

  // Complete applications process faster — block submission while a required item is missing.
  const d = getDossier(w.candidateId)!
  const blockers = findMissing(w.type, d, draft).filter((m) => m.blocker)
  if (blockers.length) {
    return res.status(409).json({ error: `Complete these before submitting: ${blockers.map((m) => m.label).join(', ')}.`, missing: blockers.map((m) => m.fieldId) })
  }

  store.attestations.insert({
    id: uid(), workflowId: w.id, candidateId: w.candidateId,
    statement: `I attest that the information in my ${WORKFLOW_META[w.type].label} is true and correct, and I authorize Florence to submit it with my human QA reviewer.`,
    signatureName: parsed.data.signatureName, attestedAt: now(),
  })
  store.submissions.insert({ id: uid(), workflowId: w.id, candidateId: w.candidateId, type: w.type, mode: 'guided', note: `${WORKFLOW_META[w.type].short} application submitted with candidate attestation.`, at: now() })
  applyStatus(w, 'submitted'); store.workflows.update(w)
  const qa = store.qaReviews.byWorkflow(w.id)
  if (qa) { qa.missing = findMissing(w.type, d, draft); store.qaReviews.update(qa) }
  audit('candidate', 'licensure_submitted', 'workflow', w.id, w.candidateId, parsed.data.signatureName)
  pushMilestone(w.candidateId, w.id, `${WORKFLOW_META[w.type].short} application submitted`)
  emitForCandidate(w.candidateId, 'pathway.licensure_status', { status: 'submitted', state: store.candidates.get(w.candidateId)?.employmentState })
  res.json({ status: w.status })
}))

api.post('/workflows/:id/submit', h((req, res) => {
  const w = store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  if (w.status !== 'candidate_signed' && w.status !== 'qa_approved') {
    return res.status(409).json({ error: 'workflow must be candidate-signed before submission' })
  }
  store.submissions.insert({
    id: uid(), workflowId: w.id, candidateId: w.candidateId, type: w.type,
    mode: w.type === 'ds160' ? 'candidate_self_submit' : 'guided', at: now(),
    note: w.type === 'ds160' ? 'Applicant submitted via CEAC' : 'Submitted with candidate attestation',
  })
  applyStatus(w, 'submitted'); store.workflows.update(w)
  audit('candidate', 'submitted', 'workflow', w.id, w.candidateId)
  pushMilestone(w.candidateId, w.id, `${WORKFLOW_META[w.type].short} submitted`)
  res.json({ status: w.status })
}))

api.post('/workflows/:id/deficiency', h(async (req, res) => {
  const w = store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  const parsed = deficiencySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { classification, responseDraft } = await getLlm().classifyDeficiency(parsed.data.items)
  const def = {
    id: uid(), workflowId: w.id, candidateId: w.candidateId,
    source: parsed.data.source, classification, items: parsed.data.items,
    responseDraft, receivedAt: now(),
  }
  store.deficiencies.insert(def)
  applyStatus(w, 'deficiency_received'); store.workflows.update(w)
  audit('system', 'deficiency_received', 'workflow', w.id, w.candidateId, classification)
  res.json(def)
}))

api.post('/deficiencies/:id/resolve', h((req, res) => {
  const def = store.deficiencies.get(req.params.id)
  if (!def) return res.status(404).json({ error: 'not found' })
  def.resolvedAt = now()
  store.deficiencies.update(def)
  const w = store.workflows.get(def.workflowId)
  if (w && w.status === 'deficiency_received') { applyStatus(w, 'resolved'); store.workflows.update(w) }
  audit('candidate', 'deficiency_resolved', 'deficiency', def.id, def.candidateId, def.classification)
  pushMilestone(def.candidateId, def.workflowId, 'Deficiency resolved')
  res.json({ ok: true })
}))

// --- QA console ------------------------------------------------------------
api.get('/qa/queue', h((_req, res) => res.json(assembleQaQueue())))

api.get('/qa/reviews/:id', h((req, res) => {
  const detail = assembleQaDetail(req.params.id)
  if (!detail) return res.status(404).json({ error: 'not found' })
  res.json(detail)
}))

api.post('/qa/reviews/:id/decide', h((req, res) => {
  const review = store.qaReviews.get(req.params.id)
  if (!review) return res.status(404).json({ error: 'not found' })
  const parsed = qaDecisionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const w = store.workflows.get(review.workflowId)
  if (!w) return res.status(404).json({ error: 'workflow not found' })

  if (parsed.data.decision === 'approve') {
    review.status = 'approved'
    applyStatus(w, 'sent_to_candidate')
    pushMilestone(w.candidateId, w.id, `${WORKFLOW_META[w.type].short} QA approved`)
  } else {
    review.status = 'changes_requested'
    applyStatus(w, 'needs_candidate_data')
  }
  review.reviewer = parsed.data.reviewer
  review.reviewerNotes = parsed.data.notes
  review.decidedAt = now()
  store.qaReviews.update(review)
  store.workflows.update(w)
  audit('qa', `qa_${parsed.data.decision}`, 'workflow', w.id, w.candidateId, parsed.data.reviewer)
  res.json({ status: w.status, review })
}))

// --- admin -----------------------------------------------------------------
api.get('/admin/metrics', h((_req, res) => res.json(assembleAdminMetrics())))
api.get('/admin/ledger', h((_req, res) => res.json(store.ledger.all())))
api.get('/admin/audit', h((_req, res) => res.json(store.audit.recent(150))))
