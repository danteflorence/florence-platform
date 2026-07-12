import { Router, type Request, type Response, type NextFunction } from 'express'
import { databaseBackend, migrationStatus, store, getDossier, uid, now, audit } from '../db'
import {
  createCandidateSchema, createWorkflowSchema, qaDecisionSchema,
  attestationSchema, answerMissingSchema, deficiencySchema, reviewAndSignSchema,
  recordConfirmationSchema, appointmentSchema, appointmentStatusSchema, nclexRegisterSchema, nclexAttSchema, visaResultSchema,
} from '../../shared/schema'
import { ALL_RULES, getRule } from '../../shared/rules'
import { WORKFLOW_META, VISA_OUTCOME_LABEL } from '../../shared/constants'
import type { CandidateProfile, WorkflowInstance, PathwayDocument } from '../../shared/types'
import { runPipeline, pushMilestone } from '../agents'
import { emitForCandidate, provisionCoreLogin } from '../passport'
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
import { i901ReceiptApproved } from '../consularPayments'
import {
  hasSubmittedDs160,
  refreshConsularCase,
  refreshDs160WorkbenchStatus,
  refreshVisaAppointment,
} from '../pathwayStatus'
import { internalErrorBody, logInternalError } from '../safeErrors'
import { applyF1SsnApplicationPatch, payloadContainsSsn, sanitizeF1SsnApplicationPatch } from '../../shared/ssn-application'

export const api = Router()

const h = (fn: (req: Request, res: Response) => unknown | Promise<unknown>) =>
  (req: Request, res: Response) => {
    Promise.resolve(fn(req, res)).catch((err) => {
      const eventId = logInternalError('[pathway api error]', err)
      if (!res.headersSent) res.status(500).json(internalErrorBody(eventId))
    })
  }

const mw = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next) }

async function refreshConsularCaseEvent(candidateId: string, stage: string, workflowId?: string) {
  const consularCase = await refreshConsularCase(candidateId)
  if (consularCase) {
    emitForCandidate(candidateId, 'pathway.consular_case_status', {
      stage,
      status: consularCase.status,
      ...(workflowId ? { workflowId } : {}),
    })
  }
  return consularCase
}

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

// Candidate binding (C01): a candidate-bound Core token may only touch its OWN
// dossier/workflows; staff bypass. Anonymous access to these restricted immigration/
// licensure routes is closed when PATHWAY_REQUIRE_AUTH=1 (401). It defaults OFF so the
// open Candidate Copilot keeps working until the candidate sign-in frontend ships; flip
// it ON in staging/production once sign-in exists (shadow-first, mirrors the readiness
// gate). Non-production configs must not leave real candidate data reachable anonymously.
const REQUIRE_AUTH = process.env.PATHWAY_REQUIRE_AUTH === '1'
api.use('/candidates/:id', mw(async (req, res, next) => {
  const p = await principalFromRequest(req)
  if (!p && REQUIRE_AUTH) {
    res.status(401).json({ error: 'Sign in required.' })
    return
  }
  if (p && !isStaffPrincipal(p) && p.cand && p.cand !== req.params.id) {
    res.status(403).json({ error: 'You can only access your own records.' })
    return
  }
  next()
}))
api.use('/workflows/:id', mw(async (req, res, next) => {
  const p = await principalFromRequest(req)
  if (!p && REQUIRE_AUTH) {
    res.status(401).json({ error: 'Sign in required.' })
    return
  }
  if (p && !isStaffPrincipal(p) && p.cand) {
    const w = await store.workflows.get(req.params.id)
    if (w && w.candidateId !== p.cand) {
      res.status(403).json({ error: 'You can only access your own records.' })
      return
    }
  }
  next()
}))
// The remaining candidate-data surfaces outside the two :id prefixes, closed under
// the same switch (POST /candidates — intake/signup — deliberately stays open so a
// NEW candidate can register before they can sign in):
//   • GET /candidates lists every candidate summary → staff-only once auth is on.
//   • POST /workflows carries candidateId in the BODY → bind non-staff to their own.
//   • POST /deficiencies/:id/resolve mutates a candidate's workflow → bind likewise.
api.get('/candidates', mw(async (req, res, next) => {
  if (!REQUIRE_AUTH) return next()
  const p = await principalFromRequest(req)
  if (!p) { res.status(401).json({ error: 'Sign in required.' }); return }
  if (!isStaffPrincipal(p)) { res.status(403).json({ error: 'Staff only.' }); return }
  next()
}))
api.post('/workflows', mw(async (req, res, next) => {
  if (!REQUIRE_AUTH) return next()
  const p = await principalFromRequest(req)
  if (!p) { res.status(401).json({ error: 'Sign in required.' }); return }
  const bodyCandidate = typeof req.body?.candidateId === 'string' ? req.body.candidateId : ''
  if (!isStaffPrincipal(p) && p.cand !== bodyCandidate) {
    res.status(403).json({ error: 'You can only access your own records.' })
    return
  }
  next()
}))
api.post('/deficiencies/:id/resolve', mw(async (req, res, next) => {
  if (!REQUIRE_AUTH) return next()
  const p = await principalFromRequest(req)
  if (!p) { res.status(401).json({ error: 'Sign in required.' }); return }
  if (!isStaffPrincipal(p)) {
    const def = await store.deficiencies.get(req.params.id)
    if (def && def.candidateId !== p.cand) {
      res.status(403).json({ error: 'You can only access your own records.' })
      return
    }
  }
  next()
}))

// --- meta ------------------------------------------------------------------
api.get('/health', h(async (_req, res) => res.json({
  ok: true,
  at: now(),
  database: { backend: databaseBackend, migration: await migrationStatus() },
})))
api.get('/meta', (_req, res) => res.json({
  llmMode: getLlm().mode,
  workflows: WORKFLOW_META,
  rules: ALL_RULES,
}))

// --- candidates ------------------------------------------------------------
api.get('/candidates', h(async (_req, res) => res.json(await candidateSummaries())))

api.post('/candidates', h(async (req, res) => {
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
  await store.candidates.insert(profile)
  await audit('system', 'candidate_created', 'candidate', profile.id, profile.id)
  // C01: give the new candidate a Core sign-in (fire-and-forget, mock-by-default)
  // so PATHWAY_REQUIRE_AUTH can flip on without locking candidates out.
  provisionCoreLogin(profile.id)
  res.json({ id: profile.id })
}))

api.get('/candidates/:id', h(async (req, res) => {
  const d = await getDossier(req.params.id)
  if (!d) return res.status(404).json({ error: 'not found' })
  res.json(d)
}))

api.get('/candidates/:id/view', h(async (req, res) => {
  const v = await assembleCandidateView(req.params.id)
  if (!v) return res.status(404).json({ error: 'not found' })
  res.json(v)
}))

api.get('/candidates/:id/required-actions', h(async (req, res) => {
  const d = await getDossier(req.params.id)
  if (!d) return res.status(404).json({ error: 'not found' })
  res.json(nextActions(d))
}))

api.post('/candidates/:id/chat', h(async (req, res) => {
  const d = await getDossier(req.params.id)
  if (!d) return res.status(404).json({ error: 'not found' })
  const question = String(req.body?.question ?? '')
  const flags = checkConsistency(d, extractFacts(d))
  const reply = await copilotReply(d, question, nextActions(d), flags)
  await audit('candidate', 'copilot_chat', 'candidate', d.profile.id, d.profile.id, question.slice(0, 120))
  res.json({ reply })
}))

api.post('/candidates/:id/notify', h(async (req, res) => {
  const view = await assembleCandidateView(req.params.id)
  if (!view) return res.status(404).json({ error: 'not found' })
  const hook = process.env.FLORENCE_NOTIFY_WEBHOOK
  for (const r of view.reminders) {
    if (hook) void fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to: view.profile.email, title: r.title, detail: r.detail, severity: r.severity }) }).catch(() => {})
    await audit('system', 'reminder_dispatched', 'candidate', req.params.id, req.params.id, r.title)
  }
  res.json({ sent: view.reminders.length, channel: hook ? 'webhook' : 'logged (set FLORENCE_NOTIFY_WEBHOOK for email/SMS delivery)' })
}))

api.post('/candidates/:id/documents', h(async (req, res) => {
  const c = await store.candidates.get(req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  const kind = String(req.body?.kind ?? 'derived') as PathwayDocument['kind']
  const filename = String(req.body?.filename ?? 'document')
  // Extraction is ModelGateway-pluggable; without Core gateway configuration the
  // document is stored for manual confirmation.
  const doc: PathwayDocument = { id: uid(), candidateId: c.id, kind, filename, uploadedAt: now(), extracted: false, extractionConfidence: 'unknown' }
  await store.documents.insert(doc)
  await audit('candidate', 'document_uploaded', 'candidate', c.id, c.id, `kind=${kind};document=${doc.id}`)
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
  const c = await store.candidates.get(req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  const state = String(req.body?.state ?? '').trim()
  if (!state) return res.status(400).json({ error: 'state is required' })
  const d = await getDossier(c.id)
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
  await store.candidates.update(c)

  let w = (await store.workflows.byCandidate(c.id)).find((x) => x.type === type && !['submitted', 'completed'].includes(x.status))
  const created = !w
  if (!w) { w = instantiateWorkflow(type, c.id); await store.workflows.insert(w) }
  await runPipeline(w.id) // (re)generate the draft so it reflects the chosen target state

  await audit('candidate', 'chose_state', 'candidate', c.id, c.id, `${state} (${path})`)
  if (created) await pushMilestone(c.id, w.id, `Pathway started: ${state} (${path})`)
  emitForCandidate(c.id, 'pathway.licensure_status', { status: 'in_progress', state, path })
  res.json({ path, state, workflowId: w.id, type, created })
}))

// Track whether the candidate has obtained their SSN — a BOOLEAN ONLY. We never
// accept, request, or store the number itself; the nurse enters it solely on the
// official application. Any non-boolean (e.g. a digit string) is rejected.
api.post('/candidates/:id/ssn-status', h(async (req, res) => {
  const c = await store.candidates.get(req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  if (payloadContainsSsn(req.body)) {
    return res.status(400).json({ error: 'Florence never collects or stores the SSN itself. Track receipt status only.' })
  }
  if (typeof req.body?.hasSsn !== 'boolean') {
    return res.status(400).json({ error: 'hasSsn must be a boolean — Florence never collects the SSN itself, only whether you have one.' })
  }
  const ts = now()
  c.hasSsn = req.body.hasSsn
  c.updatedAt = ts
  if (c.hasSsn) {
    applyF1SsnApplicationPatch(c, { action: 'mark_card_received' }, ts)
  } else if (c.ssnApplication?.status === 'card_received') {
    applyF1SsnApplicationPatch(c, { action: 'reset' }, ts)
  }
  await store.candidates.update(c)
  await audit('candidate', 'ssn_status', 'candidate', c.id, c.id, c.hasSsn ? 'received SSN' : 'no SSN yet')
  res.json({ hasSsn: c.hasSsn })
}))

// Track the F-1 SSN application workflow. This is process metadata only:
// work-authorization evidence status, online-start timestamp, SSA visit timing,
// visit completion, and card-received status. The route rejects SSNs, last four
// digits, and SSA confirmation/reference fields.
api.post('/candidates/:id/ssn-application', h(async (req, res) => {
  const c = await store.candidates.get(req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  let patch
  try {
    patch = sanitizeF1SsnApplicationPatch(req.body)
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid SSN application update.' })
  }
  const updated = applyF1SsnApplicationPatch(c, patch, now())
  await store.candidates.update(updated)
  await audit('candidate', 'ssn_application_progress', 'candidate', updated.id, updated.id, `action=${patch.action}`)
  if (patch.action === 'mark_card_received') await pushMilestone(updated.id, undefined, 'SSN card received')
  emitForCandidate(updated.id, 'pathway.ssn_application_progress', { status: updated.ssnApplication?.status, hasSsn: !!updated.hasSsn })
  res.json({ hasSsn: !!updated.hasSsn, application: updated.ssnApplication })
}))

// Grant / revoke consent for reusing the canonical profile across FlorenceRN products.
// Capital and employer packet generators gate on these scopes (canShare).
const CONSENT_SCOPE_SET = new Set(['visa', 'education', 'underwriting', 'employer', 'demand_radar'])
api.post('/candidates/:id/consent', h(async (req, res) => {
  const c = await store.candidates.get(req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  const scope = String(req.body?.scope ?? '')
  if (!CONSENT_SCOPE_SET.has(scope)) return res.status(400).json({ error: 'invalid consent scope' })
  if (typeof req.body?.granted !== 'boolean') return res.status(400).json({ error: 'granted must be a boolean' })
  c.consents = { ...(c.consents ?? {}), [scope]: { granted: req.body.granted, grantedAt: req.body.granted ? now() : undefined, via: 'candidate_portal' } }
  c.updatedAt = now()
  await store.candidates.update(c)
  await audit('candidate', 'consent', 'candidate', c.id, c.id, `${scope}=${req.body.granted}`)
  emitForCandidate(c.id, 'consent.updated', { scope, status: req.body.granted ? 'granted' : 'revoked' })
  // Re-generate the consent-gated packet so the gate is live: granting underwriting
  // assembles the financing packet; granting employer assembles the employer packet.
  const affected = scope === 'underwriting' ? 'financing_packet' : scope === 'employer' ? 'employer_packet' : null
  if (affected) {
    const w = (await store.workflows.byCandidate(c.id)).find((x) => x.type === affected)
    if (w) await runPipeline(w.id)
  }
  res.json({ scope, granted: req.body.granted })
}))

// --- workflows -------------------------------------------------------------
api.post('/workflows', h(async (req, res) => {
  const parsed = createWorkflowSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { candidateId, type } = parsed.data
  if (!await store.candidates.get(candidateId)) return res.status(404).json({ error: 'candidate not found' })
  const w = instantiateWorkflow(type, candidateId)
  await store.workflows.insert(w)
  await audit('agent', 'workflow_created', 'workflow', w.id, candidateId, type)
  const result = await runPipeline(w.id)
  if (type === 'ds160') await refreshDs160WorkbenchStatus(w.id)
  if (type === 'visa_appointment') await refreshVisaAppointment(w.id)
  if (type === 'ds160' || type === 'visa_appointment' || type === 'sevis_i20') await refreshConsularCase(candidateId)
  res.json(result)
}))

api.get('/workflows/:id', h(async (req, res) => {
  const w = await store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  res.json({
    workflow: w,
    draft: await store.formDrafts.byWorkflow(w.id),
    qa: await store.qaReviews.byWorkflow(w.id),
    rule: getRule(w.type),
    deficiencies: await store.deficiencies.byWorkflow(w.id),
  })
}))

api.post('/workflows/:id/run', h(async (req, res) => {
  const w = await store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  res.json(await runPipeline(w.id))
}))

api.post('/workflows/:id/answer', h(async (req, res) => {
  const w = await store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  const parsed = answerMissingSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const draft = await store.formDrafts.byWorkflow(w.id)
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
  await store.formDrafts.update(draft)
  const d = await getDossier(w.candidateId)
  if (!d) return res.status(404).json({ error: 'candidate not found' })
  const missing = findMissing(w.type, d, draft)
  const qa = await store.qaReviews.byWorkflow(w.id)
  if (qa) { qa.missing = missing; await store.qaReviews.update(qa) }
  if (w.status === 'needs_candidate_data' && !missing.some((m) => m.blocker)) {
    applyStatus(w, 'needs_human_qa'); await store.workflows.update(w)
  }
  await audit('candidate', 'answer_provided', 'workflow', w.id, w.candidateId, parsed.data.fieldId)
  if (w.type === 'ds160') await refreshDs160WorkbenchStatus(w.id)
  res.json({ updated, missing, status: w.status })
}))

api.post('/workflows/:id/attest', h(async (req, res) => {
  const w = await store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  const parsed = attestationSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const draft = await store.formDrafts.byWorkflow(w.id)
  if (draft) {
    for (const s of draft.sections) for (const a of s.answers) if (a.sensitive && a.value) a.candidateAttested = true
    await store.formDrafts.update(draft)
  }
  await store.attestations.insert({
    id: uid(), workflowId: w.id, candidateId: w.candidateId,
    statement: getRule(w.type).key === 'ds160'
      ? 'I have reviewed my answers and I will personally sign and submit my DS-160. My answers are true and correct.'
      : 'I have reviewed this application; the information is true and correct and I authorize its submission.',
    signatureName: parsed.data.signatureName, attestedAt: now(),
  })
  applyStatus(w, 'candidate_signed'); await store.workflows.update(w)
  await audit('candidate', 'attested', 'workflow', w.id, w.candidateId, parsed.data.signatureName)
  await pushMilestone(w.candidateId, w.id, `${WORKFLOW_META[w.type].short} candidate signed`)
  if (w.type === 'ds160') {
    await refreshDs160WorkbenchStatus(w.id)
    await refreshConsularCaseEvent(w.candidateId, 'ds160_candidate_signed', w.id)
  }
  res.json({ status: w.status })
}))

api.post('/workflows/:id/review-and-sign', h(async (req, res) => {
  const w = await store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  const parsed = reviewAndSignSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const draft = await store.formDrafts.byWorkflow(w.id)
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

  await store.formDrafts.update(draft)
  await store.attestations.insert({
    id: uid(), workflowId: w.id, candidateId: w.candidateId,
    statement: 'I reviewed every answer in my DS-160; the answers are true and correct to the best of my knowledge and belief; and I will personally sign and submit my DS-160 in CEAC.',
    signatureName: parsed.data.signatureName, attestedAt: now(),
  })
  applyStatus(w, 'candidate_signed'); await store.workflows.update(w)

  const d = await getDossier(w.candidateId)
  const qa = await store.qaReviews.byWorkflow(w.id)
  if (d && qa) { qa.missing = findMissing(w.type, d, draft); await store.qaReviews.update(qa) }

  await audit('candidate', 'reviewed_and_signed', 'workflow', w.id, w.candidateId, `${confirmed.size} confirmed, ${provided.size} answered`)
  await pushMilestone(w.candidateId, w.id, `${WORKFLOW_META[w.type].short} candidate reviewed & signed`)
  if (w.type === 'ds160') {
    await refreshDs160WorkbenchStatus(w.id)
    await refreshConsularCaseEvent(w.candidateId, 'ds160_candidate_signed', w.id)
  }
  res.json({ status: w.status, attestedFields: confirmed.size + provided.size })
}))

api.post('/workflows/:id/record-confirmation', h(async (req, res) => {
  const w = await store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  if (w.type !== 'ds160') return res.status(400).json({ error: 'confirmation capture is for the DS-160' })
  if (w.status !== 'candidate_signed') return res.status(409).json({ error: 'Sign your DS-160 before recording the CEAC confirmation.' })
  const parsed = recordConfirmationSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const num = parsed.data.confirmationNumber.toUpperCase()
  w.confirmationNumber = num
  await store.submissions.insert({
    id: uid(), workflowId: w.id, candidateId: w.candidateId, type: w.type,
    mode: 'candidate_self_submit', reference: num,
    note: 'Applicant submitted the DS-160 in CEAC; confirmation barcode captured.', at: now(),
  })
  applyStatus(w, 'submitted'); await store.workflows.update(w)
  await audit('candidate', 'ds160_confirmation_recorded', 'workflow', w.id, w.candidateId, num)
  await pushMilestone(w.candidateId, w.id, 'DS-160 submitted')
  emitForCandidate(w.candidateId, 'pathway.visa_status', { stage: 'ds160_submitted' })
  await refreshDs160WorkbenchStatus(w.id)

  // Refresh the visa appointment so it now sees the signed-and-submitted DS-160.
  const va = (await store.workflows.byCandidate(w.candidateId)).find((x) => x.type === 'visa_appointment')
  if (va) {
    await runPipeline(va.id)
    await refreshVisaAppointment(va.id)
  }
  await refreshConsularCaseEvent(w.candidateId, 'ds160_submitted', w.id)

  res.json({ status: w.status, confirmationNumber: num })
}))

// Capture the CONSULAR DECISION after the visa interview. STAFF-ATTESTED (ops/QA) —
// AI never decides, the candidate never self-reports it. This is the single
// deterministic source for the FlorenceRN Application Gate's visa clause: only
// 'approved' clears it downstream; everything else stays fail-closed/blocked. The
// outcome is emitted to the Core Passport spine (pathway.visa_status { stage, outcome })
// but is INTERNAL-only — Core's employer passportView withholds the visa facet (Title VII/IRCA).
api.post('/workflows/:id/visa-result', requireRole('super_admin', 'ops', 'qa'), h(async (req, res) => {
  const w = await store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  if (w.type !== 'visa_appointment' && w.type !== 'ds160') return res.status(400).json({ error: 'visa outcome capture is for the visa appointment / DS-160 workflow' })
  const parsed = visaResultSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { outcome, decidedOn, note } = parsed.data

  w.visaOutcome = outcome
  await store.workflows.update(w)
  await store.submissions.insert({
    id: uid(), workflowId: w.id, candidateId: w.candidateId, type: w.type,
    mode: 'guided', reference: outcome, note: note ?? `Consular decision recorded: ${VISA_OUTCOME_LABEL[outcome]}`, at: now(),
  })
  const actor = (await principalFromRequest(req))?.email ?? 'qa'
  await audit('qa', 'visa_outcome_recorded', 'workflow', w.id, w.candidateId, `${outcome}${decidedOn ? ` @ ${decidedOn}` : ''} by ${actor}`)
  await pushMilestone(w.candidateId, w.id, VISA_OUTCOME_LABEL[outcome])
  emitForCandidate(w.candidateId, 'pathway.visa_status', { stage: 'decision', outcome, ...(decidedOn ? { decidedOn } : {}) })
  const appointmentStatus = w.type === 'visa_appointment' ? await refreshVisaAppointment(w.id) : null
  const consularCase = await refreshConsularCaseEvent(w.candidateId, 'visa_decision', w.id)

  res.json({ status: appointmentStatus?.status ?? consularCase?.status ?? w.status, visaOutcome: outcome })
}))

api.post('/workflows/:id/nclex-register', h(async (req, res) => {
  const w = await store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  if (w.type !== 'nclex_att') return res.status(400).json({ error: 'NCLEX registration is for the nclex_att workflow' })
  const parsed = nclexRegisterSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { nameOnPearson, programCode, email, registered } = parsed.data

  const regs = await store.nclex.byCandidate(w.candidateId)
  const reg = regs[0]
  if (reg) {
    reg.nameOnPearson = nameOnPearson
    if (programCode) reg.programCode = programCode
    if (email) reg.email = email
    reg.pearsonRegistered = registered
    await store.nclex.update(reg)
  } else {
    const candidate = await store.candidates.get(w.candidateId)
    await store.nclex.insert({ id: uid(), candidateId: w.candidateId, nrb: candidate?.nclexState ?? '', programCode, nameOnPearson, pearsonRegistered: registered, attIssued: false, priorAttempts: 0, email })
  }

  // Recompute against the updated name so the Pearson name-match flag resolves.
  const d = await getDossier(w.candidateId)
  if (!d) return res.status(404).json({ error: 'candidate not found' })
  const flags = checkConsistency(d, extractFacts(d))
  const draft = await store.formDrafts.byWorkflow(w.id)
  if (draft) {
    for (const s of draft.sections) for (const a of s.answers) {
      if (a.fieldId === 'pearson_name') { a.value = nameOnPearson; a.status = 'user_entered'; a.confidence = 'high'; a.candidateAttested = true; a.evidence = [{ sourceType: 'derived', detail: 'Pearson registration' }] }
      if (a.fieldId === 'program_code' && programCode) { a.value = programCode; a.status = 'user_entered' }
      if (a.fieldId === 'email' && email) { a.value = email; a.status = 'user_entered' }
    }
    await store.formDrafts.update(draft)
    const qa = await store.qaReviews.byWorkflow(w.id)
    if (qa) { qa.flags = flags; qa.missing = findMissing(w.type, d, draft); await store.qaReviews.update(qa) }
  }

  if (registered) { applyStatus(w, 'submitted'); await store.workflows.update(w) }
  await store.submissions.insert({ id: uid(), workflowId: w.id, candidateId: w.candidateId, type: w.type, mode: 'guided', reference: programCode, note: `Registered with Pearson as "${nameOnPearson}".`, at: now() })
  await audit('candidate', 'nclex_registered', 'workflow', w.id, w.candidateId, nameOnPearson)
  await pushMilestone(w.candidateId, w.id, 'NCLEX registered')
  emitForCandidate(w.candidateId, 'pathway.nclex_status', { status: 'registered' })

  const pearsonMismatch = flags.some((f) => f.type === 'name_mismatch' && /pearson|nclex/i.test(f.message))
  res.json({ status: w.status, nameMatchResolved: !pearsonMismatch })
}))

api.post('/workflows/:id/nclex-att', h(async (req, res) => {
  const w = await store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  if (w.type !== 'nclex_att') return res.status(400).json({ error: 'for the nclex_att workflow' })
  const parsed = nclexAttSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { attNumber, attExpiresOn, examDate, testCenter } = parsed.data
  const reg = (await store.nclex.byCandidate(w.candidateId))[0]
  if (!reg) return res.status(409).json({ error: 'Register with Pearson before recording your ATT.' })

  if (attExpiresOn) { reg.attIssued = true; reg.attExpiresOn = attExpiresOn; if (attNumber) reg.attNumber = attNumber; await store.nclex.update(reg) }

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
    await audit('system', 'nclex_readiness_gate', 'workflow', w.id, w.candidateId,
      `${gate.allowed ? 'allow' : 'BLOCK'} p=${Math.round((gate.passProbability ?? 0) * 100)}%${gate.shadow ? ' shadow' : ''}${gate.overridden ? ' overridden' : ''}`)
    if (!gate.allowed) {
      return res.status(409).json({ error: gate.reason, readinessGate: { band: gate.band, passProbability: gate.passProbability, wouldBlock: gate.wouldBlock } })
    }

    await store.appointments.insert({ id: uid(), workflowId: w.id, candidateId: w.candidateId, kind: 'nclex', location: testCenter, scheduledFor: examDate, status: 'scheduled' })
    milestone = 'NCLEX scheduled'
    applyStatus(w, 'completed'); await store.workflows.update(w)
  }
  await store.submissions.insert({
    id: uid(), workflowId: w.id, candidateId: w.candidateId, type: w.type, mode: 'guided', reference: attNumber,
    note: [attExpiresOn && `ATT valid to ${attExpiresOn}`, examDate && `exam ${examDate}${testCenter ? ` at ${testCenter}` : ''}`].filter(Boolean).join('; '), at: now(),
  })
  await audit('candidate', 'nclex_att', 'workflow', w.id, w.candidateId, milestone || 'updated')
  if (milestone) await pushMilestone(w.candidateId, w.id, milestone)
  emitForCandidate(w.candidateId, 'pathway.nclex_status', { status: examDate ? 'scheduled' : 'att_received', scheduledFor: examDate })
  res.json({ status: w.status })
}))

api.post('/workflows/:id/appointment', h(async (req, res) => {
  const w = await store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  if (w.type !== 'visa_appointment') return res.status(400).json({ error: 'appointment scheduling is for the visa appointment workflow' })
  if (!await i901ReceiptApproved(w.candidateId)) return res.status(409).json({ error: 'I-901 SEVIS receipt must be uploaded and QA-approved before the visa appointment is marked ready.' })
  if (!await hasSubmittedDs160(w.candidateId)) return res.status(409).json({ error: 'DS-160 must be candidate-attested and submitted before the visa appointment is marked ready.' })
  const parsed = appointmentSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { consulate, appointmentDate, location, mrvReceipt } = parsed.data

  await store.appointments.insert({
    id: uid(), workflowId: w.id, candidateId: w.candidateId,
    kind: 'visa_interview', location: location ?? consulate, scheduledFor: appointmentDate, status: 'scheduled',
  })
  const draft = await store.formDrafts.byWorkflow(w.id)
  if (draft) {
    for (const s of draft.sections) for (const a of s.answers) {
      if (a.fieldId === 'consulate') { a.value = consulate; a.status = 'user_entered'; a.candidateAttested = true }
    }
    await store.formDrafts.update(draft)
  }
  await store.submissions.insert({
    id: uid(), workflowId: w.id, candidateId: w.candidateId, type: w.type,
    mode: 'guided', reference: mrvReceipt,
    note: `Interview scheduled at ${location ?? consulate} on ${appointmentDate}.`, at: now(),
  })
  applyStatus(w, 'submitted'); await store.workflows.update(w)
  await audit('candidate', 'visa_appointment_scheduled', 'workflow', w.id, w.candidateId, `${consulate} ${appointmentDate}`)
  await pushMilestone(w.candidateId, w.id, 'Visa appointment scheduled')
  emitForCandidate(w.candidateId, 'pathway.visa_status', { stage: 'interview_scheduled' })
  const appointmentStatus = await refreshVisaAppointment(w.id)
  await refreshConsularCaseEvent(w.candidateId, 'interview_scheduled', w.id)
  res.json({ status: w.status, appointmentStatus: appointmentStatus?.status })
}))

api.post('/workflows/:id/appointment-status', requireRole('super_admin', 'ops', 'qa'), h(async (req, res) => {
  const w = await store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  if (w.type !== 'visa_appointment') return res.status(400).json({ error: 'appointment status is for the visa appointment workflow' })
  const parsed = appointmentStatusSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const label: Record<typeof parsed.data.status, string> = {
    expedite_requested: 'Visa expedite requested',
    interview_attended: 'Visa interview attended',
    passport_returned: 'Passport returned',
    arrival_gate: 'Arrival gate opened',
  }
  if (parsed.data.status === 'interview_attended') {
    await store.appointments.insert({
      id: uid(),
      workflowId: w.id,
      candidateId: w.candidateId,
      kind: 'visa_interview',
      status: 'attended',
      ...(parsed.data.occurredOn ? { scheduledFor: parsed.data.occurredOn } : {}),
    })
  }
  if (parsed.data.status === 'arrival_gate') applyStatus(w, 'completed')
  w.updatedAt = now()
  await store.workflows.update(w)
  await store.submissions.insert({
    id: uid(),
    workflowId: w.id,
    candidateId: w.candidateId,
    type: w.type,
    mode: 'guided',
    reference: parsed.data.status,
    note: parsed.data.note ?? label[parsed.data.status],
    at: now(),
  })
  await audit('qa', 'visa_appointment_status_recorded', 'workflow', w.id, w.candidateId, parsed.data.status)
  await pushMilestone(w.candidateId, w.id, label[parsed.data.status])
  const appointmentStatus = await refreshVisaAppointment(w.id)
  const consularCase = await refreshConsularCaseEvent(w.candidateId, parsed.data.status, w.id)
  res.json({ status: appointmentStatus?.status ?? consularCase?.status ?? parsed.data.status })
}))

const LICENSURE_TYPES = ['florida_rn_exam', 'newyork_rn_exam', 'texas_rn_exam', 'california_rn_exam', 'arizona_rn_exam', 'endorsement']

api.post('/workflows/:id/licensure-submit', h(async (req, res) => {
  const w = await store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  if (!LICENSURE_TYPES.includes(w.type)) return res.status(400).json({ error: 'not a licensure workflow' })
  const parsed = reviewAndSignSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const draft = await store.formDrafts.byWorkflow(w.id)
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
  await store.formDrafts.update(draft)

  // Complete applications process faster — block submission while a required item is missing.
  const d = await getDossier(w.candidateId)
  if (!d) return res.status(404).json({ error: 'candidate not found' })
  const blockers = findMissing(w.type, d, draft).filter((m) => m.blocker)
  if (blockers.length) {
    return res.status(409).json({ error: `Complete these before submitting: ${blockers.map((m) => m.label).join(', ')}.`, missing: blockers.map((m) => m.fieldId) })
  }

  await store.attestations.insert({
    id: uid(), workflowId: w.id, candidateId: w.candidateId,
    statement: `I attest that the information in my ${WORKFLOW_META[w.type].label} is true and correct, and I authorize Florence to submit it with my human QA reviewer.`,
    signatureName: parsed.data.signatureName, attestedAt: now(),
  })
  await store.submissions.insert({ id: uid(), workflowId: w.id, candidateId: w.candidateId, type: w.type, mode: 'guided', note: `${WORKFLOW_META[w.type].short} application submitted with candidate attestation.`, at: now() })
  applyStatus(w, 'submitted'); await store.workflows.update(w)
  const qa = await store.qaReviews.byWorkflow(w.id)
  if (qa) { qa.missing = findMissing(w.type, d, draft); await store.qaReviews.update(qa) }
  await audit('candidate', 'licensure_submitted', 'workflow', w.id, w.candidateId, parsed.data.signatureName)
  await pushMilestone(w.candidateId, w.id, `${WORKFLOW_META[w.type].short} application submitted`)
  const candidate = await store.candidates.get(w.candidateId)
  emitForCandidate(w.candidateId, 'pathway.licensure_status', { status: 'submitted', state: candidate?.employmentState })
  res.json({ status: w.status })
}))

api.post('/workflows/:id/submit', h(async (req, res) => {
  const w = await store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  if (w.status !== 'candidate_signed' && w.status !== 'qa_approved') {
    return res.status(409).json({ error: 'workflow must be candidate-signed before submission' })
  }
  await store.submissions.insert({
    id: uid(), workflowId: w.id, candidateId: w.candidateId, type: w.type,
    mode: w.type === 'ds160' ? 'candidate_self_submit' : 'guided', at: now(),
    note: w.type === 'ds160' ? 'Applicant submitted via CEAC' : 'Submitted with candidate attestation',
  })
  applyStatus(w, 'submitted'); await store.workflows.update(w)
  await audit('candidate', 'submitted', 'workflow', w.id, w.candidateId)
  await pushMilestone(w.candidateId, w.id, `${WORKFLOW_META[w.type].short} submitted`)
  res.json({ status: w.status })
}))

api.post('/workflows/:id/deficiency', h(async (req, res) => {
  const w = await store.workflows.get(req.params.id)
  if (!w) return res.status(404).json({ error: 'not found' })
  const parsed = deficiencySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { classification, responseDraft } = await getLlm().classifyDeficiency(parsed.data.items)
  const def = {
    id: uid(), workflowId: w.id, candidateId: w.candidateId,
    source: parsed.data.source, classification, items: parsed.data.items,
    responseDraft, receivedAt: now(),
  }
  await store.deficiencies.insert(def)
  applyStatus(w, 'deficiency_received'); await store.workflows.update(w)
  await audit('system', 'deficiency_received', 'workflow', w.id, w.candidateId, classification)
  res.json(def)
}))

api.post('/deficiencies/:id/resolve', h(async (req, res) => {
  const def = await store.deficiencies.get(req.params.id)
  if (!def) return res.status(404).json({ error: 'not found' })
  def.resolvedAt = now()
  await store.deficiencies.update(def)
  const w = await store.workflows.get(def.workflowId)
  if (w && w.status === 'deficiency_received') { applyStatus(w, 'resolved'); await store.workflows.update(w) }
  await audit('candidate', 'deficiency_resolved', 'deficiency', def.id, def.candidateId, def.classification)
  await pushMilestone(def.candidateId, def.workflowId, 'Deficiency resolved')
  res.json({ ok: true })
}))

// --- QA console ------------------------------------------------------------
api.get('/qa/queue', h(async (_req, res) => res.json(await assembleQaQueue())))

api.get('/qa/reviews/:id', h(async (req, res) => {
  const detail = await assembleQaDetail(req.params.id)
  if (!detail) return res.status(404).json({ error: 'not found' })
  res.json(detail)
}))

api.post('/qa/reviews/:id/decide', h(async (req, res) => {
  const review = await store.qaReviews.get(req.params.id)
  if (!review) return res.status(404).json({ error: 'not found' })
  const parsed = qaDecisionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const w = await store.workflows.get(review.workflowId)
  if (!w) return res.status(404).json({ error: 'workflow not found' })

  if (parsed.data.decision === 'approve') {
    review.status = 'approved'
    applyStatus(w, 'sent_to_candidate')
    await pushMilestone(w.candidateId, w.id, `${WORKFLOW_META[w.type].short} QA approved`)
  } else {
    review.status = 'changes_requested'
    applyStatus(w, 'needs_candidate_data')
  }
  review.reviewer = parsed.data.reviewer
  review.reviewerNotes = parsed.data.notes
  review.decidedAt = now()
  await store.qaReviews.update(review)
  await store.workflows.update(w)
  await audit('qa', `qa_${parsed.data.decision}`, 'workflow', w.id, w.candidateId, parsed.data.reviewer)
  res.json({ status: w.status, review })
}))

// --- admin -----------------------------------------------------------------
api.get('/admin/metrics', h(async (_req, res) => res.json(await assembleAdminMetrics())))
api.get('/admin/ledger', h(async (_req, res) => res.json(await store.ledger.all())))
api.get('/admin/audit', h(async (_req, res) => res.json(await store.audit.recent(150))))
