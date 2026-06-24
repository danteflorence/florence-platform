// ============================================================================
// FlorenceRN Platform API — v1. A versioned, SCOPED, IDEMPOTENT contract over the
// existing handlers so every surface (our apps, AMN/Kaiser/lender/employer portals,
// future ATS integrations) is a client of ONE API. Mounted at /v1, separate from
// the internal /api/ops routes (which keep working). The Nurse Passport is the
// central object (permissioned views); the Production Ledger is the system of record;
// every workflow is an event. Built deterministically — no runtime LLM.
// ============================================================================
import { Router, type Request, type Response } from 'express'
import { requireAuth, currentUser, type Role } from '../../auth'
import { store, uid, now, audit } from '../../db'
import { passportView, type PassportAudience } from './passportView'
import { applicationGate, candidateApplicationReady } from '../../../shared/applicationGate'
import { effectiveCta } from '../../../shared/opportunityState'
import { buildPublicCard, resolveOpportunityState, registerPublicInterest } from '../../demand/publicCard'
import { scoreCandidateForJob } from '../../demand/opportunityFit'
import { runApplicationGate, overrideFromBody } from '../../applicationGateEnforce'
import { recordLedger, ledgerForecast } from '../../ledger'
import { getCorePassportView, passportEnabled } from '../../passport'
import { acquireSubmissionLock, attachSubmissionToLock, releaseSubmissionLock } from '../../submissionLock'

const PRICING_API_URL = (process.env.PRICING_API_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')

// Strangler-fig read flip: when READ_VIA_CORE includes 'passport' (or 'all') AND the
// Core spine is configured, the redacted Passport comes from Core's ONE canonical
// redactor; otherwise the local projection is used (mock-by-default, keep-green).
const READ_VIA_CORE = (process.env.READ_VIA_CORE ?? '').split(',').map((s) => s.trim())
const passportViaCore = READ_VIA_CORE.includes('passport') || READ_VIA_CORE.includes('all')

export const apiV1 = Router()

// --- async handler wrapper ---------------------------------------------------
const h = (fn: (req: Request, res: Response) => unknown | Promise<unknown>) =>
  (req: Request, res: Response) => { Promise.resolve(fn(req, res)).catch((err) => { if (!res.headersSent) res.status(500).json({ error: String(err?.message ?? err) }) }) }

// --- scoped auth -------------------------------------------------------------
// Core role → API scopes. ops/super_admin (mapped to 'ops') get the full internal
// surface; employer gets the redacted, own-org surface only.
const ROLE_SCOPES: Record<Role, string[]> = {
  ops: ['passport:read:internal', 'passport:read:employer', 'passport:read:candidate', 'opportunities:read',
    'opportunities:interest:create', 'applications:eligibility', 'applications:submit', 'packets:qa', 'pricing:quote',
    'programs:read', 'ledger:read', 'ledger:write'],
  employer: ['passport:read:employer', 'opportunities:read', 'programs:read', 'ledger:read'],
}
export function requireScope(scope: string) {
  return (req: Request, res: Response, next: () => void) => {
    const u = currentUser(req)
    if (!u) return res.status(401).json({ error: 'Sign in required.' })
    if (!ROLE_SCOPES[u.role]?.includes(scope)) return res.status(403).json({ error: `Missing scope: ${scope}` })
    next()
  }
}

function scopedEmployerId(req: Request): string | undefined {
  const u = currentUser(req)
  return u?.role === 'employer' ? u.employerId : undefined
}

function auditTenantScopeDenied(req: Request, entity: string, entityId: string, scopeId: string) {
  audit(currentUser(req)?.role === 'employer' ? 'connector' : 'ops', 'tenant_scope_denied', entity, entityId, `scope=${scopeId}`)
}

async function employerCanReadCandidate(req: Request, candidateId: string): Promise<boolean> {
  const employerId = scopedEmployerId(req)
  if (!employerId) return true
  const candidate = await store.candidates.get(candidateId)
  if (!candidate) return false
  const packets = (await store.packets.byCandidate(candidateId)).filter((p) => p.employerId === employerId)
  for (const packet of packets) {
    const requisition = await store.requisitions.get(packet.jobRequisitionId)
    if (!requisition) continue
    const gate = await runApplicationGate({ candidate, requisition, packet, auditEntity: 'candidate', action: 'profile_release', channel: 'ats' })
    if (gate.allowed) return true
  }
  return false
}

function filterScopedEmployerRows<T extends { employerId?: string }>(req: Request, rows: T[]): T[] {
  const employerId = scopedEmployerId(req)
  return employerId ? rows.filter((row) => row.employerId === employerId) : rows
}

// --- idempotency -------------------------------------------------------------
// Idempotency-Key header → cached response so a retried create never double-applies
// (never double-submits an application / double-writes an event). DURABLE: backed by
// the dual-store (store.idempotency), so a retry is replay-safe across restarts /
// instances. The key is caller-scoped (user + method + path) so the same key on a
// different route/user can't collide; only successful (2xx) responses are stored.
export async function idempotent(req: Request, res: Response): Promise<{ hit: boolean; commit: (status: number, body: unknown) => Promise<void> }> {
  const raw = req.header('Idempotency-Key')
  const key = raw ? `${currentUser(req)?.username ?? 'anon'}:${req.method}:${req.originalUrl.split('?')[0]}:${raw}` : undefined
  if (key) {
    const cached = await store.idempotency.get(key)
    if (cached) { res.status(cached.status).json(cached.body); return { hit: true, commit: async () => {} } }
  }
  return { hit: false, commit: async (status, body) => { if (key && status >= 200 && status < 300) await store.idempotency.put(key, status, body); res.status(status).json(body) } }
}

// Every v1 route is authenticated (Core RS256 cookie or Bearer) + audited.
apiV1.use(requireAuth)

// --- meta --------------------------------------------------------------------
apiV1.get('/', (_req, res) => res.json({ api: 'florencern-platform', version: 'v1', modules: ['nurses', 'opportunities', 'applications', 'pricing', 'programs', 'ledger', 'events'] }))

// --- Nurses + Passport (the central object) ---------------------------------
apiV1.get('/nurses/:id', requireScope('passport:read:internal'), h(async (req, res) => {
  const c = await store.candidates.get(req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  audit('ops', 'v1.nurse.read', 'candidate', c.id)
  // Core-canonical read (strangler): prefer Core's redactor when enabled + reachable.
  if (passportViaCore && passportEnabled) {
    const core = await getCorePassportView({ ref: `ats:${c.id}`, ...(c.email ? { email: c.email } : {}) }, 'internal')
    if (core) return res.json(core)
  }
  res.json(passportView(c, 'internal'))
}))

apiV1.get('/nurses/:id/passport', h(async (req, res) => {
  const view = (String(req.query.view ?? 'employer') as PassportAudience)
  const u = currentUser(req)!
  // Scope per audience: employer role may only read the employer view.
  const need = view === 'internal' ? 'passport:read:internal' : view === 'candidate' ? 'passport:read:candidate' : 'passport:read:employer'
  if (!ROLE_SCOPES[u.role]?.includes(need)) return res.status(403).json({ error: `Missing scope: ${need}` })
  const c = await store.candidates.get(req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  const employerId = scopedEmployerId(req)
  if (employerId && !(await employerCanReadCandidate(req, c.id))) {
    auditTenantScopeDenied(req, 'candidate_passport', c.id, employerId)
    return res.status(403).json({ error: 'Out of scope for your employer.' })
  }
  audit(u.role === 'employer' ? 'connector' : 'ops', 'v1.passport.read', 'candidate', c.id, view)
  // Core-canonical read (strangler): prefer Core's redactor when enabled + reachable,
  // else fall back to the local projection. Both withhold visa/financing from employers.
  if (passportViaCore && passportEnabled) {
    const core = await getCorePassportView({ ref: `ats:${c.id}`, ...(c.email ? { email: c.email } : {}) }, view)
    if (core) return res.json(core)
  }
  res.json(passportView(c, view))
}))

// next-actions: the candidate's gate-missing list across their interested jobs.
apiV1.get('/nurses/:id/next-actions', requireScope('passport:read:internal'), h(async (req, res) => {
  const c = await store.candidates.get(req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  const interests = await store.jobInterests.byCandidate(c.id)
  const actions = []
  for (const i of interests) {
    const job = await store.demandJobs.get(i.jobId)
    if (!job) continue
    const state = await resolveOpportunityState(job)
    const gate = applicationGate({ candidate: c, job: { id: job.id, status: job.status, requiredLicenseState: job.requiredLicenseState, state: job.state }, opportunityState: state, opts: {} })
    actions.push({ jobId: job.id, job: job.title, status: gate.status, missing: gate.missing, allowedAction: gate.allowedAction })
  }
  res.json({ nurseId: c.id, actions })
}))

// --- Opportunities -----------------------------------------------------------
apiV1.get('/opportunities', requireScope('opportunities:read'), h(async (_req, res) => {
  const open = (await store.demandJobs.all()).filter((j) => j.status === 'open' && j.displayAllowed === true)
  res.json(open.slice(0, 200).map((j) => ({ id: j.id, title: j.title, employerName: j.employerName, city: j.city, state: j.state, requiredLicenseState: j.requiredLicenseState, specialty: j.specialty })))
}))
apiV1.get('/opportunities/:id', requireScope('opportunities:read'), h(async (req, res) => {
  const job = await store.demandJobs.get(req.params.id)
  if (!job || job.status !== 'open' || job.displayAllowed !== true) return res.status(404).json({ error: 'not found' })
  res.json(await buildPublicCard(job))
}))
apiV1.post('/opportunities/:id/interest', requireScope('opportunities:interest:create'), h(async (req, res) => {
  const idem = await idempotent(req, res); if (idem.hit) return
  const b = req.body ?? {}
  try {
    const i = await registerPublicInterest({ jobId: req.params.id, fullName: String(b.fullName ?? ''), email: b.email ? String(b.email) : undefined, phone: b.phone ? String(b.phone) : undefined, targetState: b.targetState ? String(b.targetState) : undefined, consentGranted: b.consentGranted === true })
    await idem.commit(201, { ok: true, interestId: i.id, candidateRef: i.candidateId, status: i.status })
  } catch (e) { res.status(400).json({ error: (e as Error).message }) }
}))
apiV1.get('/nurses/:id/opportunities', requireScope('passport:read:internal'), h(async (req, res) => {
  const c = await store.candidates.get(req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  const open = (await store.demandJobs.all()).filter((j) => j.status === 'open')
  const scored = open.map((job) => ({ job, m: scoreCandidateForJob(c, job) })).sort((a, b) => b.m.matchScore - a.m.matchScore).slice(0, 25)
  const ranked = await Promise.all(scored.map(async ({ job, m }) => {
    const state = await resolveOpportunityState(job)
    const gateOk = candidateApplicationReady(c, { id: job.id, status: job.status, requiredLicenseState: job.requiredLicenseState, state: job.state })
    return { jobId: job.id, title: job.title, employerName: job.employerName, fitScore: m.matchScore, category: m.category, cta: effectiveCta(state, gateOk), applicationReady: gateOk }
  }))
  res.json(ranked)
}))

// --- Applications + gate -----------------------------------------------------
apiV1.post('/applications/eligibility-check', requireScope('applications:eligibility'), h(async (req, res) => {
  const b = req.body ?? {}
  const candidate = await store.candidates.get(String(b.candidateId ?? ''))
  const job = await store.demandJobs.get(String(b.jobId ?? ''))
  if (!candidate || !job) return res.status(404).json({ error: 'candidate or job not found' })
  const state = await resolveOpportunityState(job)
  const gate = applicationGate({ candidate, job: { id: job.id, status: job.status, requiredLicenseState: job.requiredLicenseState, state: job.state }, opportunityState: state, opts: {} })
  audit('system', 'application_gate_checked', 'job', job.id, `candidate=${candidate.id};action=eligibility_check;status=${gate.status};missing=${gate.missing.join(',') || 'none'}`)
  res.json({ candidateId: candidate.id, jobId: job.id, applicationGateStatus: gate.status, missing: gate.missing, allowedAction: gate.allowedAction, subjectTo: gate.subjectTo, subjectToMessage: gate.subjectToMessage })
}))
apiV1.get('/applications/:packetId/gate-check', requireScope('applications:eligibility'), h(async (req, res) => {
  const p = await store.packets.get(req.params.packetId)
  if (!p) return res.status(404).json({ error: 'packet not found' })
  const requisition = await store.requisitions.get(p.jobRequisitionId)
  const candidate = await store.candidates.get(p.candidateId)
  if (!requisition || !candidate) return res.status(404).json({ error: 'requisition or candidate not found' })
  const gate = await runApplicationGate({ candidate, requisition, packet: p, auditEntity: 'packet', action: 'gate_check', channel: 'ats' })
  res.json({ allowed: gate.allowed, packetId: p.id, status: gate.result.status, missing: gate.result.missing, reasons: gate.result.reasons, subjectTo: gate.result.subjectTo, subjectToMessage: gate.result.subjectToMessage })
}))
apiV1.post('/applications/:packetId/submit', requireScope('applications:submit'), h(async (req, res) => {
  const idem = await idempotent(req, res); if (idem.hit) return
  const p = await store.packets.get(req.params.packetId)
  if (!p) return res.status(404).json({ error: 'packet not found' })
  const requisition = await store.requisitions.get(p.jobRequisitionId)
  const candidate = await store.candidates.get(p.candidateId)
  if (!requisition || !candidate) return res.status(404).json({ error: 'requisition or candidate not found' })
  audit('ops', 'application_submission_attempted', 'packet', p.id, `candidate=${candidate.id};employer=${requisition.employerId}`)
  const gate = await runApplicationGate({ candidate, requisition, packet: p, override: overrideFromBody(req.body), auditEntity: 'packet', action: 'submission_attempt', channel: 'ats' })
  if (!gate.allowed) return res.status(409).json({ error: 'application gate not cleared', status: gate.result.status, missing: gate.result.missing, reasons: gate.result.reasons, subjectTo: gate.result.subjectTo, subjectToMessage: gate.result.subjectToMessage })
  if (p.status !== 'ready_to_submit') return res.status(409).json({ error: 'packet must be QA-approved (ready_to_submit) before submission', status: gate.result.status, missing: gate.result.missing, reasons: gate.result.reasons, subjectTo: gate.result.subjectTo, subjectToMessage: gate.result.subjectToMessage })
  const lockResult = await acquireSubmissionLock({ candidateId: candidate.id, employerId: requisition.employerId, requisitionId: requisition.id, channel: 'ats' }, p.id)
  if (!lockResult.ok) return res.status(409).json({ error: 'duplicate submission lock active', status: 'duplicate_submission', lockId: lockResult.lock.id, subjectTo: gate.result.subjectTo, subjectToMessage: gate.result.subjectToMessage })
  let lock = lockResult.lock
  try {
    await recordLedger({ candidateId: candidate.id, stage: 'ats_application_submitted', sourceId: p.id, employerId: requisition.employerId, jobRequisitionId: requisition.id, notes: 'v1 submit (gate cleared)' })
    p.status = 'submitted'
    p.updatedAt = now()
    await store.packets.update(p)
    lock = await attachSubmissionToLock(lock, p.id)
    await idem.commit(201, { ok: true, packetId: p.id, status: 'submitted', subjectTo: gate.result.subjectTo, subjectToMessage: gate.result.subjectToMessage })
  } catch (err) {
    await releaseSubmissionLock(lock, 'v1_submission_failed')
    throw err
  }
}))

// --- Pricing (deterministic; proxy the Workforce Economist; no runtime LLM) ---
apiV1.post('/pricing/quote', requireScope('pricing:quote'), h(async (req, res) => {
  const b = req.body ?? {}
  const state = String(b.state ?? ''), setting = String(b.setting ?? 'hospital'), role = String(b.role ?? 'RN — Med/Surg')
  try {
    const r = await fetch(`${PRICING_API_URL}/price-job`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state, setting, role, employer_name: b.employerName, cohort: { eta: 1.0 } }) })
    if (!r.ok) throw new Error(`pricing-api ${r.status}`)
    const d = (await r.json()) as any
    res.json({ state, setting, role, monthlyFeePerRnUsd: d.pricing?.florence_monthly_fee_per_rn, effectiveCostPerRnMonthUsd: d.pricing?.fica_adjusted_effective_cost_per_rn_month, channel: d.pricing?.channel, note: 'FICA offset is customer effective-cost, never FlorenceRN revenue.' })
  } catch (e) {
    res.json({ state, setting, role, monthlyFeePerRnUsd: 1750, effectiveCostPerRnMonthUsd: 1050, channel: 'direct', note: `pricing-api unreachable (${(e as Error).message}); standard fallback. FICA offset is customer effective-cost.` })
  }
}))

// --- Programs ----------------------------------------------------------------
apiV1.get('/programs', requireScope('programs:read'), h(async (req, res) => {
  const employerId = scopedEmployerId(req)
  res.json(employerId ? await store.programs.byEmployer(employerId) : await store.programs.all())
}))
apiV1.get('/programs/:id', requireScope('programs:read'), h(async (req, res) => {
  const p = await store.programs.get(req.params.id)
  if (!p) return res.status(404).json({ error: 'not found' })
  const employerId = scopedEmployerId(req)
  if (employerId && p.employerId !== employerId) {
    auditTenantScopeDenied(req, 'program', p.id, employerId)
    return res.status(403).json({ error: 'Out of scope for your employer.' })
  }
  res.json({ program: p, waves: await store.programWaves.byProgram(p.id) })
}))

// --- Production Ledger + events ----------------------------------------------
apiV1.post('/events', requireScope('ledger:write'), h(async (req, res) => {
  const idem = await idempotent(req, res); if (idem.hit) return
  const b = req.body ?? {}
  if (!b.event_type) return res.status(400).json({ error: 'event_type required' })
  const e = { id: uid(), candidateId: b.candidate_id ? String(b.candidate_id) : undefined, employerId: b.employer_id ? String(b.employer_id) : undefined, jobId: b.job_id ? String(b.job_id) : undefined, eventType: String(b.event_type), sourceSystem: String(b.source_system ?? 'platform_api'), metadata: b.payload ?? {}, occurredAt: now() }
  await store.attribution.insert(e)
  await idem.commit(201, { ok: true, eventId: e.id })
}))
apiV1.get('/events', requireScope('ledger:read'), h(async (req, res) => {
  const cid = String(req.query.candidate_id ?? '')
  const employerId = scopedEmployerId(req)
  if (employerId && cid && !(await employerCanReadCandidate(req, cid))) {
    auditTenantScopeDenied(req, 'attribution_events', cid, employerId)
    return res.status(403).json({ error: 'Out of scope for your employer.' })
  }
  const rows = cid ? await store.attribution.byCandidate(cid) : (await store.attribution.all()).slice(0, 200)
  res.json(filterScopedEmployerRows(req, rows))
}))
apiV1.get('/ledger', requireScope('ledger:read'), h(async (req, res) => {
  const cid = String(req.query.candidate_id ?? '')
  const employerId = scopedEmployerId(req)
  if (employerId && cid && !(await employerCanReadCandidate(req, cid))) {
    auditTenantScopeDenied(req, 'production_ledger', cid, employerId)
    return res.status(403).json({ error: 'Out of scope for your employer.' })
  }
  const rows = cid ? await store.ledger.byCandidate(cid) : (await store.ledger.all()).slice(0, 200)
  res.json(filterScopedEmployerRows(req, rows))
}))
apiV1.get('/ledger/forecast', requireScope('ledger:read'), h(async (req, res) => {
  const employerId = scopedEmployerId(req)
  if (employerId) {
    auditTenantScopeDenied(req, 'production_ledger_forecast', employerId, employerId)
    return res.status(403).json({ error: 'Employer-scoped forecast is not available yet.' })
  }
  res.json(await ledgerForecast())
}))
