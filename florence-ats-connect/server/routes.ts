import { Router, type Request, type Response, type NextFunction } from 'express'
import { createHash } from 'node:crypto'
import { store, uid, now, audit } from './db'
import { recordLedger, ledgerFunnel, ledgerForecast, HRIS_GRADE_STAGES, STATUS_TO_STAGE } from './ledger'
import { selectSubmissionChannel } from './submission'
import { buildResumePdf, resumeFilename } from './resumePdf'
import { runStatusSync, lastStatusSync } from './statusSync'
import { ingestRows, rowsFromCsv, type IngestRow } from './demand/ingest'
import { pullSource, refreshStale } from './demand/pull'
import { runEconomics, runEconomicsAll } from './demand/economics'
import { createLink, type CreateLinkInput } from './links'
import { registerInterest } from './demand/interest'
import { buildPublicCard, registerPublicInterest, resolveOpportunityState } from './demand/publicCard'
import { effectiveCta } from '../shared/opportunityState'
import { candidateApplicationReady, applicationGate } from '../shared/applicationGate'
import { scoreCandidateForJob, eligibilityCoaching } from './demand/opportunityFit'
import { recordHiringSignal, issueClaimToken, claimPrefill, authorizeAndClaim, registerMarketInterest, listCategoryTiles } from './demand/longTail'
import { rankLongTailLeads } from './demand/longTailLeads'
import { runApplicationGate, overrideFromBody } from './applicationGateEnforce'
import { buildOutreachDraft, renderOutreachPdf } from './demand/outreach'
import { setBucket, candidateBasket, compareOpportunities, isBucket } from './demand/basket'
import { buildDemandBrief, renderBriefPdf } from './demand/brief'
import { ingestReconciliation, reconRowsFromCsv, type ReconRow } from './demand/reconciliation'
import { createReservation, cancelReservation, reservationCockpit } from './demand/reservations'
import { productionReport } from './demand/productionReport'
import { forecastStarts } from './demand/forecast'
import { buildProposal, renderProposalPdf } from './demand/proposal'
import { attributionFunnel, dashboardSummary } from './demand/attribution'
import { rankAccounts } from './demand/ranking'
import type { DemandSource, JobBenefitTag, JobBenefits } from '../shared/demand-types'
import { syncFromPathway } from './candidateProvider'
import { getConnector } from './connectors'
import { provisionMergeFromPublicToken, provisionGreenhouse } from './connectService'
import { createMergeLinkToken } from './connectors/merge'
import { applyWebhookStatus } from './webhookService'
import { getHrisProvider, type EmploymentEventType } from './hris'
import { requireAuth, requireRole, currentUser, scopeEmployerId } from './auth'
import { principalFromRequest, atsRole } from './coreAuth'
import { mirrorConsentGrant, mirrorConsentRevoke } from './passport'
import { generateLicensedSlate, buildSlatePackets, lockSlate } from './program/slate'
import { rollupProgramInvoices } from './program/billing'
import { programOverview, waveTracker, scorecard, exceptions, expansionGate } from './program/workspace'
import { createProgramSchema, lockWaveSchema } from '../shared/schema'
import type { Program, ProgramWave } from '../shared/types'
import { runMatches, matchCandidateToRequisition, MATCH_WEIGHTS } from '../shared/matching'
import { buildPacket, ConsentRequiredError } from '../shared/packet'
import {
  createEmployerSchema, importRequisitionsSchema, grantConsentSchema,
  createPacketSchema, qaApproveSchema, updateAtsStatusSchema, ledgerEventSchema,
} from '../shared/schema'
import type {
  EmployerAccount, JobRequisition, EmployerShareConsent,
  ATSApplication, ATSApplicationStatus, LedgerStage, Facility,
} from '../shared/types'

export const api = Router()

const BASE_URL = process.env.ATS_CONNECT_BASE_URL ?? `http://localhost:${process.env.PORT ?? 8788}`

// Lightweight in-memory per-IP rate limiter for the PUBLIC interest endpoint
// (best-effort abuse guard; a real deploy fronts this with the platform WAF).
const PUBLIC_INTEREST_WINDOW_MS = 60_000
const PUBLIC_INTEREST_MAX = Number(process.env.PUBLIC_INTEREST_MAX_PER_MIN ?? 10)
const publicInterestHits = new Map<string, number[]>()
function publicInterestRateOk(ip: string): boolean {
  const cutoff = Date.now() - PUBLIC_INTEREST_WINDOW_MS
  const hits = (publicInterestHits.get(ip) ?? []).filter((t) => t > cutoff)
  if (hits.length >= PUBLIC_INTEREST_MAX) { publicInterestHits.set(ip, hits); return false }
  hits.push(Date.now())
  publicInterestHits.set(ip, hits)
  return true
}

// Async-safe handler wrapper (same shape as pathway-agent).
const h = (fn: (req: Request, res: Response) => unknown | Promise<unknown>) =>
  (req: Request, res: Response) => {
    Promise.resolve(fn(req, res)).catch((err) => {
      console.error('[api error]', err)
      if (!res.headersSent) res.status(500).json({ error: String(err?.message ?? err) })
    })
  }

// --- Auth: JWT sessions + roles --------------------------------------------
// All app surfaces require a signed JWT. Employer-role users are read-only and
// scoped to their own employer; the candidate pool, cross-employer dashboards,
// and audit log are FlorenceRN-ops only.
api.use(['/ops', '/candidates', '/ledger'], requireAuth)
api.use(['/ops', '/candidates', '/ledger'], (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET' && currentUser(req)?.role !== 'ops') return res.status(403).json({ error: 'Read-only: employer role cannot modify.' })
  next()
})
api.use(['/candidates', '/ops/dashboards', '/ops/audit'], requireRole('ops'))

// Session probe for the SPA — "who am I?" per the shared Core cookie. Employer
// users + roles are provisioned in the Core admin console (grant the `employer`
// role on an org whose id == the ATS employerId).
api.get('/session', h(async (req, res) => {
  const p = await principalFromRequest(req)
  if (!p) return res.json({ authenticated: false })
  const role = atsRole(p)
  res.json({ authenticated: true, email: p.email ?? null, role, employerId: p.orgId ?? null, staff: role === 'ops' })
}))

// --- self-serve connect ("click to add") -----------------------------------
// Authenticated employers (Core `employer` role, scoped to their org_id) connect
// their own ATS; ops can connect on an employer's behalf by passing employerId.
api.use(['/connect'], requireAuth)
function connectTarget(req: Request): { employerId: string; employerName: string } | null {
  const u = currentUser(req)!
  const employerId = u.role === 'employer' ? (u.employerId ?? '') : String(req.body?.employerId ?? '')
  if (!employerId) return null
  return { employerId, employerName: String(req.body?.employerName ?? u.username ?? `Employer ${employerId}`) }
}

api.post('/connect/merge/link-token', h(async (req, res) => {
  const t = connectTarget(req)
  if (!t) return res.status(400).json({ error: 'employerId required (ops must pass it; employer derives it from Core).' })
  const employer = await store.employers.get(t.employerId)
  const { linkToken, mode } = await createMergeLinkToken({ id: t.employerId, name: employer?.name ?? t.employerName })
  res.json({ linkToken, mode })
}))

api.post('/connect/merge/callback', h(async (req, res) => {
  const t = connectTarget(req)
  const publicToken = String(req.body?.publicToken ?? '')
  if (!t || !publicToken) return res.status(400).json({ error: 'employerId + publicToken required.' })
  const r = await provisionMergeFromPublicToken({ ...t, publicToken })
  audit('ops', 'merge_connected', 'employer', r.employer.id, `imported ${r.imported} reqs`)
  res.json({ connectionId: r.connection.id, employerId: r.employer.id, imported: r.imported })
}))

api.post('/connect/greenhouse', h(async (req, res) => {
  const t = connectTarget(req)
  const apiKey = String(req.body?.apiKey ?? '')
  if (!t || !apiKey) return res.status(400).json({ error: 'employerId + apiKey required.' })
  const r = await provisionGreenhouse({ ...t, apiKey })
  audit('ops', 'greenhouse_connected', 'employer', r.employer.id, `imported ${r.imported} reqs`)
  res.json({ connectionId: r.connection.id, employerId: r.employer.id, imported: r.imported })
}))

// --- meta ------------------------------------------------------------------
api.get('/health', h(async (_req, res) => res.json({ ok: true, at: now(), counts: await store.counts() })))
api.get('/meta', (_req, res) => res.json({ matchWeights: MATCH_WEIGHTS, baseUrl: BASE_URL }))

// --- employers -------------------------------------------------------------
api.post('/ops/employers', requireRole('ops'), h(async (req, res) => {
  const parsed = createEmployerSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const e: EmployerAccount = {
    id: uid(), name: parsed.data.name, atsProvider: parsed.data.atsProvider,
    atsTenantId: parsed.data.atsTenantId, integrationStatus: 'manual',
    defaultBillingModel: parsed.data.defaultBillingModel, sourceChannel: parsed.data.sourceChannel,
    createdAt: now(), updatedAt: now(),
  }
  await store.employers.insert(e)
  audit('ops', 'employer_created', 'employer', e.id, e.name)
  res.json(e)
}))

api.get('/ops/employers', h(async (req, res) => {
  const s = scopeEmployerId(req)
  res.json((await store.employers.all()).filter((e) => !s || e.id === s))
}))

api.get('/ops/employers/:id', h(async (req, res) => {
  const s = scopeEmployerId(req)
  if (s && req.params.id !== s) return res.status(403).json({ error: 'Out of scope for your employer.' })
  const e = await store.employers.get(req.params.id)
  if (!e) return res.status(404).json({ error: 'not found' })
  res.json({ employer: e, facilities: await store.facilities.byEmployer(e.id), requisitions: await store.requisitions.byEmployer(e.id) })
}))

// Authorize (or revoke) native ATS write-sync for an employer — the explicit gate
// that lets a live integration actually submit candidates into the ATS. Audited.
api.post('/ops/employers/:id/ats-authorization', requireRole('ops'), h(async (req, res) => {
  const e = await store.employers.get(req.params.id)
  if (!e) return res.status(404).json({ error: 'not found' })
  e.atsAuthorized = req.body?.authorized === true
  e.updatedAt = now()
  await store.employers.update(e)
  audit('ops', 'ats_authorization_set', 'employer', e.id, String(e.atsAuthorized))
  res.json({ id: e.id, atsAuthorized: e.atsAuthorized })
}))

// --- requisition import (manual / CSV / portal all land here) ---------------
api.post('/ops/employers/:id/requisitions/import', h(async (req, res) => {
  const employer = await store.employers.get(req.params.id)
  if (!employer) return res.status(404).json({ error: 'employer not found' })
  const parsed = importRequisitionsSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const existingFacilities = await store.facilities.byEmployer(employer.id)
  const created: JobRequisition[] = []
  for (const j of parsed.data.jobs) {
    // Resolve / create the facility by name so the canonical model stays linked.
    let facility: Facility | undefined = j.facilityName
      ? existingFacilities.find((f) => f.name.toLowerCase() === j.facilityName!.toLowerCase())
      : undefined
    if (!facility && j.facilityName) {
      facility = { id: uid(), employerId: employer.id, name: j.facilityName, facilityType: 'hospital', city: j.city, state: j.state, country: 'US', createdAt: now() }
      await store.facilities.insert(facility)
      existingFacilities.push(facility)
    }
    const r: JobRequisition = {
      id: uid(), employerId: employer.id, facilityId: facility?.id,
      atsProvider: parsed.data.source, atsRequisitionId: j.atsRequisitionId, atsJobUrl: j.atsJobUrl,
      title: j.title, department: j.department, unit: j.unit, specialty: j.specialty, setting: j.setting,
      city: j.city, state: j.state, requiredLicenseState: j.requiredLicenseState ?? j.state,
      requiredCertifications: j.requiredCertifications, shift: j.shift, employmentType: j.employmentType,
      openings: j.openings, targetStartDate: j.targetStartDate, targetStartWindow: j.targetStartWindow,
      status: 'open', sourceChannel: j.sourceChannel ?? employer.sourceChannel,
      importedAt: now(), lastSyncedAt: now(),
    }
    await store.requisitions.insert(r)
    await store.sync.insert({ id: uid(), employerId: employer.id, atsProvider: parsed.data.source, entityType: 'job_requisition', entityId: r.id, direction: 'inbound', status: 'success', createdAt: now() })
    created.push(r)
  }
  audit('ops', 'requisitions_imported', 'employer', employer.id, `${created.length} via ${parsed.data.source}`)
  res.json({ imported: created.length, requisitions: created })
}))

api.get('/ops/employers/:id/requisitions', h(async (req, res) => {
  const s = scopeEmployerId(req)
  if (s && req.params.id !== s) return res.status(403).json({ error: 'Out of scope for your employer.' })
  res.json(await store.requisitions.byEmployer(req.params.id))
}))
api.get('/ops/requisitions', h(async (req, res) => {
  const s = scopeEmployerId(req)
  res.json(s ? await store.requisitions.byEmployer(s) : await store.requisitions.all())
}))
api.get('/ops/requisitions/:id', h(async (req, res) => {
  const r = await store.requisitions.get(req.params.id)
  if (!r) return res.status(404).json({ error: 'not found' })
  res.json(r)
}))

// --- native ATS connectors -------------------------------------------------
api.post('/ops/employers/:id/connectors/:provider/connect', h(async (req, res) => {
  const employer = await store.employers.get(req.params.id)
  if (!employer) return res.status(404).json({ error: 'employer not found' })
  const connector = getConnector(req.params.provider)
  if (!connector) return res.status(400).json({ error: `no native connector for ${req.params.provider}` })
  const test = await connector.testConnection(employer)
  if (!test.ok) return res.status(502).json({ error: 'connection test failed', test })
  employer.atsProvider = req.params.provider as JobRequisition['atsProvider']
  employer.integrationStatus = 'active'
  employer.updatedAt = now()
  await store.employers.update(employer)
  audit('ops', 'connector_connected', 'employer', employer.id, `${req.params.provider} (${test.mode})`)
  res.json({ employer, test })
}))

api.post('/ops/employers/:id/connectors/:provider/pull', h(async (req, res) => {
  const employer = await store.employers.get(req.params.id)
  if (!employer) return res.status(404).json({ error: 'employer not found' })
  const connector = getConnector(req.params.provider)
  if (!connector) return res.status(400).json({ error: `no native connector for ${req.params.provider}` })
  const jobs = await connector.listJobs(employer)
  const existing = await store.requisitions.byEmployer(employer.id)
  const created: JobRequisition[] = []
  for (const j of jobs) {
    if (j.atsRequisitionId && existing.some((r) => r.atsRequisitionId === j.atsRequisitionId)) continue
    const r: JobRequisition = {
      id: uid(), employerId: employer.id, atsProvider: req.params.provider as JobRequisition['atsProvider'],
      atsRequisitionId: j.atsRequisitionId, atsJobUrl: j.atsJobUrl, title: j.title ?? 'Registered Nurse',
      specialty: j.specialty, setting: j.setting ?? 'inpatient', city: j.city, state: j.state,
      requiredLicenseState: j.requiredLicenseState ?? j.state, shift: j.shift, employmentType: j.employmentType,
      openings: j.openings, targetStartWindow: j.targetStartWindow, status: 'open',
      sourceChannel: employer.sourceChannel, importedAt: now(), lastSyncedAt: now(),
    }
    await store.requisitions.insert(r)
    await store.sync.insert({ id: uid(), employerId: employer.id, atsProvider: r.atsProvider, entityType: 'job_requisition', entityId: r.id, direction: 'inbound', status: 'success', createdAt: now() })
    created.push(r)
  }
  audit('connector', 'jobs_pulled', 'employer', employer.id, `${created.length} via ${req.params.provider}`)
  res.json({ pulled: jobs.length, imported: created.length, requisitions: created })
}))

// --- candidates (projection synced from pathway-agent) ---------------------
api.get('/candidates', h(async (_req, res) => res.json(await store.candidates.all())))
api.get('/candidates/:id', h(async (req, res) => {
  const c = await store.candidates.get(req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  res.json({ candidate: c, consents: await store.consents.byCandidate(c.id), packets: await store.packets.byCandidate(c.id), ledger: await store.ledger.byCandidate(c.id) })
}))

// Sync the candidate projection from the real florence-pathway-agent dossier.
api.post('/ops/candidates/sync', requireRole('ops'), h(async (_req, res) => {
  const result = await syncFromPathway()
  audit('ops', 'candidates_synced', 'candidate', 'pathway', `${result.synced} synced (${result.inserted} new, ${result.updated} updated)`)
  res.json(result)
}))

// --- matching --------------------------------------------------------------
const matchReq = async (r: JobRequisition) => runMatches(r, await store.candidates.all())
api.post('/ops/requisitions/:id/matches/run', h(async (req, res) => {
  const r = await store.requisitions.get(req.params.id)
  if (!r) return res.status(404).json({ error: 'not found' })
  audit('ops', 'matches_run', 'requisition', r.id)
  res.json({ requisitionId: r.id, matches: await matchReq(r) })
}))
api.get('/ops/requisitions/:id/matches', h(async (req, res) => {
  const r = await store.requisitions.get(req.params.id)
  if (!r) return res.status(404).json({ error: 'not found' })
  res.json({ requisitionId: r.id, matches: await matchReq(r) })
}))
api.get('/candidates/:id/matched-requisitions', h(async (req, res) => {
  const c = await store.candidates.get(req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  const matches = (await store.requisitions.open()).map((r) => ({ requisition: r, match: matchCandidateToRequisition(c, r) })).sort((a, b) => b.match.matchScore - a.match.matchScore)
  res.json({ candidateId: c.id, matches })
}))

// --- consent ---------------------------------------------------------------
api.post('/candidates/:id/consents/employer-share', h(async (req, res) => {
  const c = await store.candidates.get(req.params.id)
  if (!c) return res.status(404).json({ error: 'candidate not found' })
  const parsed = grantConsentSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const employer = await store.employers.get(parsed.data.employerId)
  if (!employer) return res.status(404).json({ error: 'employer not found' })

  const consentText = `I authorize FlorenceRN to share my employer-ready packet with ${employer.name} for ${parsed.data.purpose}. The packet may include my résumé, credential summary, FlorenceRN readiness summary, video profile, and licensure/NCLEX status and expected start-window information I approve for employer review.`
  const consent: EmployerShareConsent = {
    id: uid(), candidateId: c.id, employerId: employer.id, jobRequisitionId: parsed.data.jobRequisitionId,
    purpose: parsed.data.purpose, allowedData: parsed.data.allowedData,
    consentTextVersion: parsed.data.attestationTextVersion,
    consentTextHash: createHash('sha256').update(`${parsed.data.attestationTextVersion}|${consentText}`).digest('hex'),
    grantedAt: now(),
  }
  // Dual-write to Core (the canonical consent store). Fail-closed: if the spine
  // is configured but the mirror write fails, surface sharing as NOT-yet-enabled
  // so disclosure can only happen once Core affirmatively holds the consent.
  const mirror = await mirrorConsentGrant({
    sel: { ...(c.email ? { email: c.email } : {}), name: c.fullName, ref: { app: 'ats', externalId: c.id } },
    recipientOrgId: employer.id,
    allowedFields: consent.allowedData,
    consentTextVersion: consent.consentTextVersion,
    consentTextHash: consent.consentTextHash,
  })
  if (mirror.coreConsentId) consent.coreConsentId = mirror.coreConsentId
  await store.consents.insert(consent)
  // Only mark the candidate as share-enabled when consent is durably recorded.
  if (mirror.ok) { c.employerShareConsent = 'granted'; c.updatedAt = now(); await store.candidates.update(c) }
  audit('candidate', 'employer_share_consent_granted', 'candidate', c.id, employer.name)
  res.json({ ...consent, sharingEnabled: mirror.ok })
}))

api.post('/candidates/:id/consents/revoke', h(async (req, res) => {
  const c = await store.candidates.get(req.params.id)
  if (!c) return res.status(404).json({ error: 'candidate not found' })
  const employerId = String(req.body?.employerId ?? '')
  const consent = await store.consents.live(c.id, employerId)
  if (!consent) return res.status(404).json({ error: 'no live consent for that employer' })
  consent.revokedAt = now(); await store.consents.update(consent)
  if (consent.coreConsentId) {
    await mirrorConsentRevoke({ sel: { ...(c.email ? { email: c.email } : {}), ref: { app: 'ats', externalId: c.id } }, consentId: consent.coreConsentId })
  }
  if (!(await store.consents.byCandidate(c.id)).some((x) => !x.revokedAt)) { c.employerShareConsent = 'revoked'; c.updatedAt = now(); await store.candidates.update(c) }
  audit('candidate', 'employer_share_consent_revoked', 'candidate', c.id, employerId)
  res.json({ ok: true, consentId: consent.id })
}))

api.get('/candidates/:id/consents', h(async (req, res) => res.json(await store.consents.byCandidate(req.params.id))))

// --- application packets ----------------------------------------------------
api.post('/ops/application-packets', h(async (req, res) => {
  const parsed = createPacketSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const candidate = await store.candidates.get(parsed.data.candidateId)
  const requisition = await store.requisitions.get(parsed.data.jobRequisitionId)
  if (!candidate) return res.status(404).json({ error: 'candidate not found' })
  if (!requisition) return res.status(404).json({ error: 'requisition not found' })
  const consent = await store.consents.live(candidate.id, requisition.employerId)
  try {
    const packet = buildPacket({ candidate, requisition, consent, includeDocuments: parsed.data.includeDocuments, newId: uid, nowIso: now })
    await store.packets.insert(packet)
    await recordLedger({ candidateId: candidate.id, stage: 'packet_created', sourceId: packet.id, employerId: requisition.employerId, jobRequisitionId: requisition.id, notes: `Packet for ${requisition.title}` })
    void store.attribution.insert({ id: uid(), candidateId: candidate.id, employerId: requisition.employerId, applicationPacketId: packet.id, eventType: 'candidate.packet_created', sourceSystem: 'ats_connect', metadata: { requisitionId: requisition.id }, occurredAt: now() }).catch(() => {})
    audit('ops', 'packet_created', 'packet', packet.id, candidate.fullName)
    res.json(packet)
  } catch (err) {
    if (err instanceof ConsentRequiredError) return res.status(409).json({ error: err.message })
    throw err
  }
}))

api.get('/ops/application-packets', h(async (_req, res) => res.json(await store.packets.all())))

api.get('/ops/application-packets/:id', h(async (req, res) => {
  const p = await store.packets.get(req.params.id)
  if (!p) return res.status(404).json({ error: 'not found' })
  res.json(p)
}))

api.post('/ops/application-packets/:id/qa-approve', h(async (req, res) => {
  const p = await store.packets.get(req.params.id)
  if (!p) return res.status(404).json({ error: 'not found' })
  const parsed = qaApproveSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  if (parsed.data.decision === 'approve') {
    p.humanQaStatus = 'approved'; p.status = 'ready_to_submit'
    await recordLedger({ candidateId: p.candidateId, stage: 'qa_approved', sourceId: p.id, employerId: p.employerId, jobRequisitionId: p.jobRequisitionId })
  } else {
    p.humanQaStatus = 'blocked'
  }
  p.updatedAt = now(); await store.packets.update(p)
  audit('qa', `packet_${parsed.data.decision}`, 'packet', p.id, parsed.data.reviewer)
  res.json(p)
}))

api.post('/ops/application-packets/:id/submit', h(async (req, res) => {
  const p = await store.packets.get(req.params.id)
  if (!p) return res.status(404).json({ error: 'not found' })
  if (p.status !== 'ready_to_submit') return res.status(409).json({ error: 'packet must be QA-approved (ready_to_submit) before submission' })
  const requisition = await store.requisitions.get(p.jobRequisitionId)
  const employer = await store.employers.get(p.employerId)
  if (!requisition || !employer) return res.status(404).json({ error: 'requisition/employer not found' })

  // Application Submission Gate (hard-block + audited override): consent + visa +
  // license + QA + job-open + channel-authorized + docs. Fail-closed.
  const candidate = await store.candidates.get(p.candidateId)
  if (!candidate) return res.status(404).json({ error: 'candidate not found' })
  const gate = await runApplicationGate({ candidate, requisition, packet: p, override: overrideFromBody(req.body), auditEntity: 'packet' })
  if (!gate.allowed) return res.status(409).json({ error: 'application gate not cleared', status: gate.result.status, missing: gate.result.missing, reasons: gate.result.reasons, subjectTo: gate.result.subjectTo })
  if (gate.overridden) await recordLedger({ candidateId: candidate.id, stage: 'qa_approved', sourceId: p.id, employerId: employer.id, jobRequisitionId: requisition.id, notes: `gate override: ${gate.result.missing.join(',')}` })
  await recordLedger({ candidateId: candidate.id, stage: 'application_ready_to_submit', sourceId: p.id, employerId: employer.id, jobRequisitionId: requisition.id, notes: 'application gate cleared' })

  // Resume PDF rides with every submission: native connectors attach it (base64
  // or by the public tokenized URL); the manual bridge IS the tokenized URL.
  const resumeToken = uid()
  const pdf = buildResumePdf({ packet: p, candidate, requisition })
  const resume = {
    filename: resumeFilename(p, candidate),
    base64: pdf.toString('base64'),
    mime: 'application/pdf' as const,
    url: `${BASE_URL}/api/p/${resumeToken}/resume.pdf`,
  }

  const channel = selectSubmissionChannel(employer)
  const outcome = await channel.submit(p, requisition, employer, { newId: uid, baseUrl: BASE_URL, candidate, resume, resumeToken })
  const app: ATSApplication = {
    id: uid(), packetId: p.id, candidateId: p.candidateId, jobRequisitionId: p.jobRequisitionId, employerId: p.employerId,
    atsProvider: employer.atsProvider, submissionMode: outcome.submissionMode, packetLink: outcome.packetLink,
    atsCandidateId: outcome.atsCandidateId, atsApplicationId: outcome.atsApplicationId, atsStage: outcome.atsStage,
    resumeToken,
    status: outcome.status, submittedAt: now(), lastOutboundSyncAt: now(), createdAt: now(),
  }
  await store.atsApplications.insert(app)
  p.status = 'submitted'; p.updatedAt = now(); await store.packets.update(p)
  await store.sync.insert({ id: uid(), employerId: employer.id, atsProvider: employer.atsProvider, entityType: 'application', entityId: app.id, direction: 'outbound', status: outcome.syncStatus, createdAt: now() })
  await recordLedger({ candidateId: p.candidateId, stage: 'ats_application_submitted', sourceId: app.id, employerId: employer.id, jobRequisitionId: requisition.id, notes: outcome.detail, verifiedVia: 'ats' })
  audit('ops', 'packet_submitted', 'application', app.id, `${employer.name} via ${outcome.submissionMode}`)
  res.json({ application: app, detail: outcome.detail })
}))

// --- packet resume PDF -------------------------------------------------------
// Ops/employer-scoped download (the document a recruiter uploads into their ATS).
api.get('/ops/application-packets/:id/resume.pdf', h(async (req, res) => {
  const p = await store.packets.get(req.params.id)
  if (!p) return res.status(404).json({ error: 'not found' })
  const s = scopeEmployerId(req)
  if (s && p.employerId !== s) return res.status(403).json({ error: 'Out of scope for your employer.' })
  const candidate = await store.candidates.get(p.candidateId)
  const requisition = await store.requisitions.get(p.jobRequisitionId)
  const pdf = buildResumePdf({ packet: p, candidate, requisition })
  res.setHeader('content-type', 'application/pdf')
  res.setHeader('content-disposition', `inline; filename="${resumeFilename(p, candidate)}"`)
  res.send(pdf)
}))

// Public tokenized resume link (unguessable token minted at submission) — what the
// manual bridge hands a recruiter, and what URL-ingesting ATSs (Merge) fetch.
api.get('/p/:token/resume.pdf', h(async (req, res) => {
  const apps = await store.atsApplications.all()
  const app = apps.find((a) => a.resumeToken === req.params.token)
  if (!app) return res.status(404).json({ error: 'not found' })
  const p = await store.packets.get(app.packetId)
  if (!p) return res.status(404).json({ error: 'not found' })
  const candidate = await store.candidates.get(p.candidateId)
  const requisition = await store.requisitions.get(p.jobRequisitionId)
  // Packet-view tracking: completes the click→interest→packet_shared→packet_viewed funnel.
  // No PII in the token URL; the event keys to the candidate/packet (internal join).
  void store.attribution.insert({
    id: uid(), candidateId: p.candidateId, employerId: requisition?.employerId, applicationPacketId: p.id,
    eventType: 'candidate.packet_viewed', sourceSystem: 'ats_connect',
    metadata: { requisitionId: p.jobRequisitionId }, occurredAt: now(),
  }).catch(() => {})
  const pdf = buildResumePdf({ packet: p, candidate, requisition })
  res.setHeader('content-type', 'application/pdf')
  res.setHeader('content-disposition', `inline; filename="${resumeFilename(p, candidate)}"`)
  res.send(pdf)
}))

// --- ATS application status (inbound sync) ----------------------------------

// Status-sync poller (ops-only): run on demand + inspect the last run.
api.get('/ops/status-sync', requireRole('ops'), h(async (_req, res) => res.json({ lastRun: lastStatusSync() })))
api.post('/ops/status-sync/run', requireRole('ops'), h(async (_req, res) => res.json(await runStatusSync())))

// ── Demand Radar: sources + ingestion + canonical jobs (ops-only) ───────────
api.post('/ops/demand/sources', requireRole('ops'), h(async (req, res) => {
  const b = req.body ?? {}
  const sourceType = String(b.sourceType ?? 'manual') as DemandSource['sourceType']
  const src: DemandSource = {
    id: uid(), sourceType, name: String(b.name ?? sourceType),
    baseUrl: b.baseUrl ? String(b.baseUrl) : undefined, atsProvider: b.atsProvider ? String(b.atsProvider) : undefined,
    robotsStatus: 'unknown', tosStatus: 'unknown', crawlAllowed: Boolean(b.crawlAllowed) || false,
    rateLimitPerMin: b.rateLimitPerMin ? Number(b.rateLimitPerMin) : undefined,
    notes: b.notes ? String(b.notes) : undefined,
    // Registry enrichment (all optional; JSON blob — no DDL).
    careerSiteUrl: b.careerSiteUrl ? String(b.careerSiteUrl) : undefined,
    publicApiAvailable: b.publicApiAvailable != null ? Boolean(b.publicApiAvailable) : undefined,
    payTransparencyJurisdiction: b.payTransparencyJurisdiction ? (String(b.payTransparencyJurisdiction) as DemandSource['payTransparencyJurisdiction']) : undefined,
    crawlCadence: b.crawlCadence ? (String(b.crawlCadence) as DemandSource['crawlCadence']) : undefined,
    priority: b.priority != null ? Number(b.priority) : undefined,
    channelOwner: b.channelOwner ? String(b.channelOwner) : undefined,
    createdAt: now(),
  }
  await store.demandSources.insert(src)
  audit('ops', 'demand_source_created', 'demand_source', src.id, src.name)
  res.status(201).json(src)
}))

api.get('/ops/demand/sources', requireRole('ops'), h(async (_req, res) => res.json(await store.demandSources.all())))

// Ingest jobs: either a CSV body (text) or a manual `jobs` array. Auto-creates a
// default source for the sourceType when no demandSourceId is supplied.
api.post('/ops/demand/jobs/import', requireRole('ops'), h(async (req, res) => {
  const b = req.body ?? {}
  const sourceType = String(b.sourceType ?? (b.csv ? 'csv' : 'manual')) as DemandSource['sourceType']
  let sourceId = b.demandSourceId ? String(b.demandSourceId) : ''
  if (sourceId) {
    if (!(await store.demandSources.get(sourceId))) return res.status(404).json({ error: 'unknown demandSourceId' })
  } else {
    const existing = (await store.demandSources.all()).find((s) => s.sourceType === sourceType && s.name === `default-${sourceType}`)
    if (existing) sourceId = existing.id
    else {
      const src: DemandSource = { id: uid(), sourceType, name: `default-${sourceType}`, robotsStatus: 'reviewed_ok', tosStatus: 'reviewed_ok', crawlAllowed: false, createdAt: now() }
      await store.demandSources.insert(src); sourceId = src.id
    }
  }
  const rows: IngestRow[] = typeof b.csv === 'string' ? rowsFromCsv(b.csv) : Array.isArray(b.jobs) ? (b.jobs as IngestRow[]) : []
  if (!rows.length) return res.status(400).json({ error: 'provide `csv` text or a `jobs` array' })
  const summary = await ingestRows(sourceId, sourceType, rows)
  const src = await store.demandSources.get(sourceId)
  if (src) { src.lastPulledAt = now(); await store.demandSources.update(src) }
  audit('ops', 'demand_jobs_imported', 'demand_source', sourceId, JSON.stringify(summary))
  res.json({ demandSourceId: sourceId, ...summary })
}))

api.get('/ops/demand/jobs', requireRole('ops'), h(async (_req, res) => {
  const jobs = await store.demandJobs.all()
  res.json(jobs)
}))

api.get('/ops/demand/jobs/:id', requireRole('ops'), h(async (req, res) => {
  const job = await store.demandJobs.get(req.params.id)
  if (!job) return res.status(404).json({ error: 'not found' })
  const [sources, economics, benefits] = await Promise.all([store.jobSources.byJob(job.id), store.jobEconomics.latestByJob(job.id), store.jobBenefits.byJob(job.id)])
  res.json({ job, sources, economics, benefits })
}))

api.get('/ops/demand/jobs/:id/benefits', requireRole('ops'), h(async (req, res) => {
  if (!(await store.demandJobs.get(req.params.id))) return res.status(404).json({ error: 'not found' })
  res.json(await store.jobBenefits.byJob(req.params.id))
}))

// Manual benefits override (ops research) — recorded as a separate source-attributed row
// (never overwrites the posting-sourced row) + denormalized onto the job for the card.
api.post('/ops/demand/jobs/:id/benefits', requireRole('ops'), h(async (req, res) => {
  const job = await store.demandJobs.get(req.params.id)
  if (!job) return res.status(404).json({ error: 'not found' })
  const b = req.body ?? {}
  const tags = Array.isArray(b.benefits) ? (b.benefits as JobBenefitTag[]) : []
  if (!tags.length) return res.status(400).json({ error: 'provide a `benefits` array' })
  const sourceType = (String(b.sourceType ?? 'manual_research') as JobBenefits['sourceType'])
  const row: JobBenefits = { id: uid(), jobId: job.id, benefits: tags, sourceType, sourceUrl: b.sourceUrl ? String(b.sourceUrl) : undefined, capturedAt: now() }
  await store.jobBenefits.insert(row)
  job.benefitsExtracted = tags
  if (row.sourceUrl) job.benefitsSourceUrl = row.sourceUrl
  await store.demandJobs.update(job)
  audit('ops', 'demand_benefits_set', 'demand_job', job.id, tags.join(','))
  res.status(201).json(row)
}))

// Pull a registered source through its connector (mock-by-default; career pages
// gated behind crawlAllowed) → normalize + dedup into the canonical pool.
api.post('/ops/demand/sources/:id/pull', requireRole('ops'), h(async (req, res) => {
  const src = await store.demandSources.get(req.params.id)
  if (!src) return res.status(404).json({ error: 'not found' })
  const summary = await pullSource(src)
  audit('ops', 'demand_source_pulled', 'demand_source', src.id, JSON.stringify({ mode: summary.mode, created: summary.jobsCreated }))
  res.json(summary)
}))

// Freshness: age out openings not seen within ?days (default 14) → 'stale'.
api.post('/ops/demand/refresh-stale', requireRole('ops'), h(async (req, res) => {
  const days = req.query.days ? Number(req.query.days) : 14
  res.json(await refreshStale(days))
}))

// Economics: price a job per-RN/month via the Workforce Economist pricing-api.
api.post('/ops/demand/jobs/:id/economics/run', requireRole('ops'), h(async (req, res) => {
  const job = await store.demandJobs.get(req.params.id)
  if (!job) return res.status(404).json({ error: 'not found' })
  const amnMarkupPct = req.body?.amnMarkupPct != null ? Number(req.body.amnMarkupPct) : undefined
  const econ = await runEconomics(job, { amnMarkupPct })
  res.json(econ)
}))

api.get('/ops/demand/jobs/:id/economics', requireRole('ops'), h(async (req, res) => {
  res.json(await store.jobEconomics.latestByJob(req.params.id))
}))

// Batch-price all open jobs (skip already-priced unless ?force=1).
api.post('/ops/demand/economics/run-all', requireRole('ops'), h(async (req, res) => {
  const force = req.query.force === '1' || req.body?.force === true
  const amnMarkupPct = req.body?.amnMarkupPct != null ? Number(req.body.amnMarkupPct) : undefined
  res.json(await runEconomicsAll({ force, amnMarkupPct }))
}))

// ── Tracked links (ops-only management; the redirect itself is public /l/:code) ─
api.post('/ops/links', requireRole('ops'), h(async (req, res) => {
  const b = req.body ?? {}
  if (!b.destinationUrl) return res.status(400).json({ error: 'destinationUrl is required' })
  // A tracked link can only target a candidate-displayable job (never an un-claimed signal).
  if (b.jobId) { const j = await store.demandJobs.get(String(b.jobId)); if (!j || j.displayAllowed !== true) return res.status(400).json({ error: 'jobId must reference a displayable job' }) }
  const link = await createLink(b as CreateLinkInput)
  audit('ops', 'link_created', 'tracking_link', link.id, link.shortUrl)
  res.status(201).json(link)
}))

api.get('/ops/links', requireRole('ops'), h(async (_req, res) => res.json(await store.trackingLinks.all())))

api.get('/ops/links/:id/clicks', requireRole('ops'), h(async (req, res) => res.json(await store.trackingClicks.byLink(req.params.id))))

api.get('/ops/clicks/recent', requireRole('ops'), h(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 100
  res.json(await store.trackingClicks.recent(limit))
}))

// ── Candidate interest (express interest in a matched opportunity, NOT apply) ──
api.post('/ops/demand/jobs/:id/interest', requireRole('ops'), h(async (req, res) => {
  const candidateId = String(req.body?.candidateId ?? '')
  if (!candidateId) return res.status(400).json({ error: 'candidateId is required' })
  try {
    const interest = await registerInterest({
      candidateId, jobId: req.params.id,
      trackingClickId: req.body?.trackingClickId ? String(req.body.trackingClickId) : undefined,
      consentGranted: req.body?.consentGranted === true,
    })
    audit('ops', 'demand_interest_registered', 'demand_job', req.params.id, `${candidateId} → ${interest.status}`)
    res.status(201).json(interest)
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
}))

// ── AMN Account Radar: account-level demand × supply × economics × value ─────
api.get('/ops/amn/accounts', requireRole('ops'), h(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50
  const accounts = await rankAccounts(limit)
  const withPilot = accounts.map((a) => ({ ...a, recommendedPilotStarts: Math.min(a.openings || 5, a.matchedLicensed || a.matchedNearLicensed || 5) }))
  res.json(withPilot)
}))

api.get('/ops/demand/jobs/:id/interests', requireRole('ops'), h(async (req, res) => res.json(await store.jobInterests.byJob(req.params.id))))
api.get('/ops/demand/candidates/:id/interests', requireRole('ops'), h(async (req, res) => res.json(await store.jobInterests.byCandidate(req.params.id))))

// ── PUBLIC candidate-facing job card (reached via a FlorenceRN tracked link) ───
// No ops auth. Returns a REDACTED card (no internal economics). The :code is the
// opaque job id — no PII. Only 'open' jobs are publicly viewable.
api.get('/public/jobs/:code', h(async (req, res) => {
  const job = await store.demandJobs.get(req.params.code)
  // Default-deny: only an explicitly displayable, open job is candidate-readable. An
  // un-claimed long-tail signal is never a job, but this is the load-bearing belt-and-suspenders.
  if (!job || job.status !== 'open' || job.displayAllowed !== true) return res.status(404).json({ error: 'not found' })
  void store.attribution.insert({
    id: uid(), jobId: job.id, employerId: job.employerId, eventType: 'job.tile_viewed',
    sourceSystem: 'opportunity_graph', metadata: { employer: job.employerName }, occurredAt: now(),
  }).catch(() => {})
  res.json(await buildPublicCard(job))
}))

// PUBLIC "express interest" (NOT apply): captures contact + explicit consent +
// frn_click_id in the BODY (never the URL). Lightly rate-limited per IP.
api.post('/public/jobs/:id/interest', h(async (req, res) => {
  if (!publicInterestRateOk(req.ip ?? 'unknown')) return res.status(429).json({ error: 'too many requests — try again shortly' })
  const guard = await store.demandJobs.get(req.params.id)
  if (!guard || guard.displayAllowed !== true) return res.status(404).json({ error: 'not found' })
  const b = req.body ?? {}
  try {
    const interest = await registerPublicInterest({
      jobId: req.params.id,
      fullName: String(b.fullName ?? ''),
      email: b.email ? String(b.email) : undefined,
      phone: b.phone ? String(b.phone) : undefined,
      targetState: b.targetState ? String(b.targetState) : undefined,
      trackingClickId: b.trackingClickId ? String(b.trackingClickId) : undefined,
      consentGranted: b.consentGranted === true,
    })
    res.status(201).json({ ok: true, status: interest.status, ref: interest.candidateId })
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
}))

// PUBLIC per-job fit + eligibility coaching — CONSENT-GATED: requires a consented
// interest linking the candidateRef (a lead created via express-interest) to this job.
api.get('/public/jobs/:code/fit', h(async (req, res) => {
  const candidateRef = String(req.query.candidateRef ?? '')
  if (!candidateRef) return res.status(400).json({ error: 'candidateRef is required' })
  const job = await store.demandJobs.get(req.params.code)
  if (!job || job.status !== 'open' || job.displayAllowed !== true) return res.status(404).json({ error: 'not found' })
  const candidate = await store.candidates.get(candidateRef)
  if (!candidate) return res.status(404).json({ error: 'unknown candidate' })
  const consented = (await store.jobInterests.byCandidate(candidateRef)).some((i) => i.jobId === job.id && !!i.consentId)
  if (!consented) return res.status(403).json({ error: 'consent required — express interest with consent first' })
  res.json({ coaching: eligibilityCoaching(candidate, job) })
}))

// PUBLIC Opportunity Basket — set a bucket (consent-gated via the interest record).
api.post('/public/jobs/:id/bucket', h(async (req, res) => {
  if (!publicInterestRateOk(req.ip ?? 'unknown')) return res.status(429).json({ error: 'too many requests' })
  const b = req.body ?? {}
  const candidateRef = String(b.candidateRef ?? '')
  const bucket = String(b.bucket ?? '')
  if (!candidateRef || !isBucket(bucket)) return res.status(400).json({ error: 'candidateRef + a valid bucket are required' })
  try {
    const interest = await setBucket(candidateRef, req.params.id, bucket)
    res.json({ ok: true, bucket: interest.bucket })
  } catch (e) { res.status(403).json({ error: (e as Error).message }) }
}))

// PUBLIC basket view (grouped by bucket) for a consented lead.
api.get('/public/candidates/:ref/basket', h(async (req, res) => {
  if (!(await store.candidates.get(req.params.ref))) return res.status(404).json({ error: 'not found' })
  res.json(await candidateBasket(req.params.ref))
}))

// PUBLIC compare — side-by-side of consented opportunities; emits job.compared.
api.post('/public/opportunities/compare', h(async (req, res) => {
  if (!publicInterestRateOk(req.ip ?? 'unknown')) return res.status(429).json({ error: 'too many requests' })
  const b = req.body ?? {}
  const candidateRef = String(b.candidateRef ?? '')
  const jobIds = Array.isArray(b.jobIds) ? b.jobIds.map(String) : []
  if (!candidateRef || jobIds.length < 1) return res.status(400).json({ error: 'candidateRef + jobIds[] are required' })
  try {
    res.json(await compareOpportunities(candidateRef, jobIds))
  } catch (e) { res.status(400).json({ error: (e as Error).message }) }
}))

// ── Long-Tail Demand Radar ──────────────────────────────────────────────────
// Signals are LEAD-ONLY (never candidate-readable). Ops records them; ops issues a
// claim link; the employer claims via the public token deeplink → a displayable job.
api.post('/ops/longtail/signals', requireRole('ops'), h(async (req, res) => {
  const b = req.body ?? {}
  try {
    const signal = await recordHiringSignal({
      sourceType: String(b.sourceType ?? 'manual') as any, employerName: b.employerName ? String(b.employerName) : undefined,
      city: b.city ? String(b.city) : undefined, state: String(b.state ?? ''), roleCategory: b.roleCategory, setting: b.setting,
      sourceUrl: b.sourceUrl ? String(b.sourceUrl) : undefined, observedAt: b.observedAt ? String(b.observedAt) : undefined,
      reviewer: b.reviewer ? String(b.reviewer) : undefined, confidence: b.confidence, notes: b.notes ? String(b.notes) : undefined,
    })
    audit('ops', 'longtail_signal_recorded', 'hiring_signal', signal.id, `${signal.roleCategory} @ ${signal.marketDisplay}`)
    res.status(201).json(signal)
  } catch (e) { res.status(400).json({ error: (e as Error).message }) }
}))

api.get('/ops/longtail/signals', requireRole('ops'), h(async (_req, res) => res.json(await store.hiringSignals.all())))
api.get('/ops/longtail/tiles', requireRole('ops'), h(async (req, res) => res.json(await listCategoryTiles({ state: req.query.state ? String(req.query.state) : undefined }))))
api.get('/ops/longtail/leads', requireRole('ops'), h(async (req, res) => res.json(await rankLongTailLeads(req.query.limit ? Number(req.query.limit) : 50))))

// Employer outreach — DRAFT ONLY (human sends; no programmatic send, no bulk export).
api.post('/ops/longtail/outreach', requireRole('ops'), h(async (req, res) => {
  const b = req.body ?? {}
  if (!b.employerName || !b.roleCategory) return res.status(400).json({ error: 'employerName + roleCategory are required' })
  try {
    const draft = await buildOutreachDraft({ employerName: String(b.employerName), city: b.city ? String(b.city) : undefined, state: b.state ? String(b.state) : undefined, roleCategory: b.roleCategory, issuedBy: 'ops' })
    audit('ops', 'longtail_outreach_drafted', 'employer', String(b.employerName), draft.market)
    res.json(draft)
  } catch (e) { res.status(400).json({ error: (e as Error).message }) }
}))

api.get('/ops/longtail/outreach/pdf', requireRole('ops'), h(async (req, res) => {
  const employerName = String(req.query.employer ?? '')
  if (!employerName) return res.status(400).json({ error: 'employer query param required' })
  const draft = await buildOutreachDraft({ employerName, state: req.query.state ? String(req.query.state) : undefined, city: req.query.city ? String(req.query.city) : undefined, roleCategory: (req.query.roleCategory ? String(req.query.roleCategory) : 'other_rn') as any, issuedBy: 'ops' })
  const pdf = renderOutreachPdf(draft)
  res.setHeader('content-type', 'application/pdf')
  res.setHeader('content-disposition', `inline; filename="florencern-outreach-${employerName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf"`)
  res.send(pdf)
}))

api.post('/ops/longtail/claim-tokens', requireRole('ops'), h(async (req, res) => {
  const b = req.body ?? {}
  try {
    const t = await issueClaimToken({
      hiringSignalId: b.hiringSignalId ? String(b.hiringSignalId) : undefined,
      city: b.city ? String(b.city) : undefined, state: b.state ? String(b.state) : undefined,
      roleCategory: b.roleCategory, prefillTitle: b.prefillTitle ? String(b.prefillTitle) : undefined,
      issuedBy: 'ops',
    })
    audit('ops', 'longtail_claim_token_issued', 'claim_token', t.id, t.claimUrl)
    res.status(201).json(t)
  } catch (e) { res.status(400).json({ error: (e as Error).message }) }
}))

// PUBLIC claim deeplink — redacted prefill (no PII, no Craigslist content).
api.get('/public/claim/:token', h(async (req, res) => {
  const view = await claimPrefill(req.params.token)
  if (!view) return res.status(404).json({ error: 'claim link not found or already used' })
  res.json(view)
}))

// PUBLIC claim submit — employer certifies authority → mints a displayable job. Rate-limited.
api.post('/public/claim/:token', h(async (req, res) => {
  if (!publicInterestRateOk(req.ip ?? 'unknown')) return res.status(429).json({ error: 'too many requests' })
  const b = req.body ?? {}
  try {
    const r = await authorizeAndClaim({
      token: req.params.token, certificationChecked: b.certificationChecked === true,
      certificationText: String(b.certificationText ?? 'I am authorized to post and promote this job on behalf of my organization, and I authorize FlorenceRN to display, summarize, and promote this role to FlorenceRN nurses.'),
      employerName: String(b.employerName ?? ''), employerAuthorizedBy: String(b.employerAuthorizedBy ?? ''),
      title: String(b.title ?? ''), description: b.description ? String(b.description) : undefined,
      location: b.location ? String(b.location) : undefined, requiredLicenseState: b.requiredLicenseState ? String(b.requiredLicenseState) : undefined,
      setting: b.setting, payMin: b.payMin != null ? Number(b.payMin) : undefined, payMax: b.payMax != null ? Number(b.payMax) : undefined,
      payUnit: b.payUnit, benefits: Array.isArray(b.benefits) ? b.benefits : undefined,
    })
    res.status(201).json({ ok: true, jobId: r.jobId, claimedJobId: r.claimedJob.id })
  } catch (e) { res.status(400).json({ error: (e as Error).message }) }
}))

// PUBLIC category tiles (aggregate counts only, no PII) + market interest.
api.get('/public/longtail/tiles', h(async (req, res) => res.json(await listCategoryTiles({ state: req.query.state ? String(req.query.state) : undefined }))))

api.post('/public/longtail/interest', h(async (req, res) => {
  if (!publicInterestRateOk(req.ip ?? 'unknown')) return res.status(429).json({ error: 'too many requests' })
  const b = req.body ?? {}
  try {
    const i = await registerMarketInterest({
      city: b.city ? String(b.city) : undefined, state: String(b.state ?? ''), roleCategory: b.roleCategory, setting: b.setting,
      fullName: String(b.fullName ?? ''), email: b.email ? String(b.email) : undefined, phone: b.phone ? String(b.phone) : undefined,
      readinessStatus: b.readinessStatus, trackingClickId: b.trackingClickId ? String(b.trackingClickId) : undefined,
      consentToShareAggregate: b.consentToShareAggregate === true,
    })
    res.status(201).json({ ok: true, ref: i.candidateId })
  } catch (e) { res.status(400).json({ error: (e as Error).message }) }
}))

// OPS: rank a candidate across all open opportunities (fit + coaching), best first.
api.get('/ops/demand/candidates/:id/opportunities', requireRole('ops'), h(async (req, res) => {
  const candidate = await store.candidates.get(req.params.id)
  if (!candidate) return res.status(404).json({ error: 'not found' })
  const limit = req.query.limit ? Number(req.query.limit) : 25
  const open = (await store.demandJobs.all()).filter((j) => j.status === 'open')
  const scored = open
    .map((job) => ({ job, m: scoreCandidateForJob(candidate, job) }))
    .sort((a, b) => b.m.matchScore - a.m.matchScore)
    .slice(0, limit)
  // Gate-aware CTA per opportunity: "apply" only when the channel allows it AND the
  // candidate has cleared the Application Gate (consent + visa + license); else express-interest.
  const ranked = await Promise.all(scored.map(async ({ job, m }) => {
    const state = await resolveOpportunityState(job)
    const gateOk = candidateApplicationReady(candidate, { id: job.id, status: job.status, requiredLicenseState: job.requiredLicenseState, state: job.state })
    return { jobId: job.id, title: job.title, employerName: job.employerName, state: job.requiredLicenseState ?? job.state, fitScore: m.matchScore, category: m.category, opportunityState: state, cta: effectiveCta(state, gateOk), applicationReady: gateOk, coaching: eligibilityCoaching(candidate, job) }
  }))
  res.json(ranked)
}))

// ── Interest-to-Application Queue: who expressed interest, the exact missing gates,
//    and when they can be submitted. The operational bridge from signal → submission. ──
api.get('/ops/application-queue', requireRole('ops'), h(async (req, res) => {
  const [interests, jobs, candidates] = await Promise.all([store.jobInterests.all(), store.demandJobs.all(), store.candidates.all()])
  const jobById = new Map(jobs.map((j) => [j.id, j]))
  const candById = new Map(candidates.map((c) => [c.id, c]))
  const rows = []
  for (const i of interests) {
    const candidate = candById.get(i.candidateId)
    const job = jobById.get(i.jobId)
    if (!candidate || !job) continue
    const state = await resolveOpportunityState(job)
    const gate = applicationGate({ candidate, job: { id: job.id, status: job.status, requiredLicenseState: job.requiredLicenseState, state: job.state }, opportunityState: state, opts: {} })
    // Expected release ETA from the FIRST missing gate (most-blocking).
    const expectedRelease = gate.missing.includes('visa_approved') ? 'after consular processing / work-authorization'
      : gate.missing.includes('license_verified_active') ? 'after license verification'
      : gate.missing.includes('employer_share_consent') ? 'after candidate consent'
      : gate.missing.includes('channel_authorized') ? 'after an authorized employer/AMN workflow'
      : gate.missing.length ? 'after QA + packet' : 'ready now'
    rows.push({
      candidateId: candidate.id, candidate: candidate.fullName, jobId: job.id, job: job.title, employer: job.employerName,
      interestAt: i.createdAt, channel: state, visaStatus: candidate.visaStatus ?? 'unknown', licenseStatus: candidate.licenseStatus,
      consent: candidate.employerShareConsent, applicationGateStatus: gate.status, missing: gate.missing, readyToSubmit: gate.ok, expectedRelease,
    })
  }
  // Most-actionable first: ready, then fewest missing gates.
  rows.sort((a, b) => Number(b.readyToSubmit) - Number(a.readyToSubmit) || a.missing.length - b.missing.length)
  res.json(rows)
}))

// ── Employer / AMN demand brief (capacity proposal; DRAFT until human review) ──
api.post('/ops/demand/briefs', requireRole('ops'), h(async (req, res) => {
  const employerName = String(req.body?.employerName ?? '')
  if (!employerName) return res.status(400).json({ error: 'employerName is required' })
  const route = req.body?.route === 'amn' ? 'amn' : 'direct'
  const brief = await buildDemandBrief(employerName, route)
  audit('ops', 'demand_brief_generated', 'employer', employerName, `${brief.jobs.total} jobs, ${brief.supply.total} matched`)
  res.json(brief)
}))

api.get('/ops/demand/briefs/pdf', requireRole('ops'), h(async (req, res) => {
  const employer = String(req.query.employer ?? '')
  if (!employer) return res.status(400).json({ error: 'employer query param required' })
  const route = req.query.route === 'amn' ? 'amn' : 'direct'
  const brief = await buildDemandBrief(employer, route)
  const pdf = renderBriefPdf(brief)
  res.setHeader('content-type', 'application/pdf')
  res.setHeader('content-disposition', `inline; filename="florencern-demand-brief-${employer.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf"`)
  res.send(pdf)
}))

// ── Reconciliation: CSV/manual outcome updates → Production Ledger ───────────
api.post('/ops/demand/reconciliation/import', requireRole('ops'), h(async (req, res) => {
  const b = req.body ?? {}
  const source = ['csv', 'manual', 'amn_update', 'employer_update'].includes(b.source) ? b.source : b.csv ? 'csv' : 'manual'
  const rows: ReconRow[] = typeof b.csv === 'string' ? reconRowsFromCsv(b.csv) : Array.isArray(b.events) ? (b.events as ReconRow[]) : []
  if (!rows.length) return res.status(400).json({ error: 'provide `csv` text or an `events` array' })
  const summary = await ingestReconciliation(source, rows)
  audit('ops', 'demand_reconciliation', 'reconciliation', source, JSON.stringify({ recorded: summary.recorded, ledger: summary.ledgerEvents }))
  res.json(summary)
}))

api.get('/ops/demand/reconciliation', requireRole('ops'), h(async (_req, res) => res.json(await store.reconciliations.all())))

// ── Demand reservations (soft, priced, cancellable; never bill/payment/employer action) ──
api.get('/ops/demand/reservations', requireRole('ops'), h(async (req, res) => {
  const wantAll = (req.query as { all?: string }).all === '1'
  res.json(wantAll ? await store.reservations.all() : await store.reservations.live())
}))
api.get('/ops/demand/reservations/cockpit', requireRole('ops'), h(async (_req, res) => res.json(await reservationCockpit())))

// Weekly production report — funnel + by-employer/source/campaign over a window.
api.get('/ops/demand/production-report', requireRole('ops'), h(async (req, res) => {
  const windowDays = req.query.windowDays ? Number(req.query.windowDays) : 7
  const report = await productionReport({ windowDays, nowMs: Date.now() })
  res.json({ ...report, generatedAt: now() })
}))

// Job→start forecast — probability-weighted expected starts + recurring MRR by month.
api.get('/ops/demand/forecast', requireRole('ops'), h(async (req, res) => {
  const monthlyFeeUsd = req.query.feeUsd ? Number(req.query.feeUsd) : undefined
  const f = await forecastStarts({ nowMs: Date.now(), monthlyFeeUsd })
  res.json({ ...f, generatedAt: now() })
}))

// Automated proposal generation — DRAFT only (human-review-gated; never auto-sent).
api.post('/ops/demand/proposals', requireRole('ops'), h(async (req, res) => {
  const employerName = String(req.body?.employerName ?? '')
  if (!employerName) return res.status(400).json({ error: 'employerName is required' })
  const route = req.body?.route === 'amn' ? 'amn' : 'direct'
  const proposal = await buildProposal(employerName, route)
  audit('ops', 'demand_proposal_drafted', 'employer', employerName, `${proposal.pilotPlan.length} steps`)
  res.json(proposal)
}))

api.get('/ops/demand/proposals/pdf', requireRole('ops'), h(async (req, res) => {
  const employer = String(req.query.employer ?? '')
  if (!employer) return res.status(400).json({ error: 'employer query param required' })
  const route = req.query.route === 'amn' ? 'amn' : 'direct'
  const pdf = renderProposalPdf(await buildProposal(employer, route))
  res.setHeader('content-type', 'application/pdf')
  res.setHeader('content-disposition', `inline; filename="florencern-proposal-${employer.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf"`)
  res.send(pdf)
}))
api.post('/ops/demand/jobs/:jobId/reserve', requireRole('ops'), h(async (req, res) => {
  const b = req.body ?? {}
  const r = await createReservation(req.params.jobId, {
    nurseId: b.nurseId, ttlDays: b.ttlDays != null ? Number(b.ttlDays) : undefined, notes: b.notes,
    specialty: b.specialty, region: b.region ? String(b.region) : undefined, volume: b.volume != null ? Number(b.volume) : undefined,
    startWindow: b.startWindow ? String(b.startWindow) : undefined, channel: b.channel === 'amn' ? 'amn' : b.channel === 'direct' ? 'direct' : undefined,
    slateStatus: b.slateStatus, confidence: b.confidence, gate: b.gate ? String(b.gate) : undefined,
  })
  audit('ops', 'demand_reservation_created', 'reservation', r.id, JSON.stringify({ jobId: r.jobId, fee: r.perRnMonthlyFeeUsd }))
  res.json(r)
}))
api.post('/ops/demand/reservations/:id/cancel', requireRole('ops'), h(async (req, res) => {
  const r = await cancelReservation(req.params.id, req.body?.reason)
  audit('ops', 'demand_reservation_cancelled', 'reservation', r.id, req.body?.reason ?? '')
  res.json(r)
}))

// ── Demand Radar dashboard + source→start attribution funnel ────────────────
api.get('/ops/demand/dashboard', requireRole('ops'), h(async (_req, res) => res.json(await dashboardSummary())))
api.get('/ops/demand/attribution/funnel', requireRole('ops'), h(async (_req, res) => res.json(await attributionFunnel())))

// Account ranking: which employers to approach first (demand × supply fit × economics).
api.get('/ops/demand/accounts/ranked', requireRole('ops'), h(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 25
  res.json(await rankAccounts(limit))
}))

api.get('/ops/ats-applications', h(async (req, res) => {
  const s = scopeEmployerId(req)
  res.json(s ? await store.atsApplications.byEmployer(s) : await store.atsApplications.all())
}))

api.patch('/ops/ats-applications/:id/status', h(async (req, res) => {
  const app = await store.atsApplications.get(req.params.id)
  if (!app) return res.status(404).json({ error: 'not found' })
  const parsed = updateAtsStatusSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const stage = STATUS_TO_STAGE[parsed.data.status]

  // INVARIANT: start/retention truth cannot ride on bare ATS status. Require an
  // HRIS feed or employer/nurse attestation for those — this is the billing line.
  if (stage && HRIS_GRADE_STAGES.has(stage)) {
    const v = parsed.data.verifiedVia
    if (!v || v === 'ats') {
      return res.status(409).json({ error: `'${parsed.data.status}' is billing-critical and cannot be sourced from ATS status. Provide verifiedVia: hris | employer_attestation | nurse_confirmation.` })
    }
  }

  app.status = parsed.data.status
  if (parsed.data.atsStage) app.atsStage = parsed.data.atsStage
  if (parsed.data.statusReason) app.statusReason = parsed.data.statusReason
  app.lastInboundSyncAt = now()
  await store.atsApplications.update(app)
  await store.sync.insert({ id: uid(), employerId: app.employerId, atsProvider: app.atsProvider, entityType: 'status', entityId: app.id, direction: 'inbound', status: 'success', createdAt: now() })
  if (stage) await recordLedger({ candidateId: app.candidateId, stage, sourceId: app.id, employerId: app.employerId, jobRequisitionId: app.jobRequisitionId, notes: parsed.data.statusReason, verifiedVia: parsed.data.verifiedVia ?? 'ats' })
  audit('connector', 'ats_status_synced', 'application', app.id, parsed.data.status)
  res.json(app)
}))

// --- inbound ATS webhooks (provider-authenticated via shared secret; NOT a Core
// user session — so these live OUTSIDE the /ops auth gate). Real Merge/native
// webhooks carry a signature; here we check a shared secret + normalize. -------
const WEBHOOK_SECRET = process.env.ATS_WEBHOOK_SECRET || 'dev-webhook-secret'
api.post('/webhooks/ats/:provider', h(async (req, res) => {
  if ((req.headers['x-webhook-secret'] ?? '') !== WEBHOOK_SECRET) return res.status(401).json({ error: 'bad webhook secret' })
  const extId = String(req.body?.atsApplicationId ?? req.body?.application_id ?? '')
  const status = String(req.body?.status ?? '') as ATSApplicationStatus
  if (!extId || !status) return res.status(400).json({ error: 'atsApplicationId + status required' })
  const r = await applyWebhookStatus(req.params.provider, extId, status, req.body?.atsStage ? String(req.body.atsStage) : undefined)
  audit('connector', 'webhook_status', 'application', extId, `${req.params.provider} ${status} → ${r.applied ? 'applied' : 'skipped'}`)
  res.json(r)
}))

// --- HRIS inbound (start / retention truth — verifiedVia: hris) -------------
const HRIS_EVENT_STAGE: Record<EmploymentEventType, LedgerStage> = {
  started: 'started', retained_30d: 'retention_30d', retained_60d: 'retention_60d', retained_90d: 'retention_90d',
  term_complete: 'term_complete', terminated: 'withdrawn',
}
api.post('/ops/hris/sync', requireRole('ops'), h(async (_req, res) => {
  const provider = getHrisProvider()
  const events = await provider.fetchEmployment(await store.atsApplications.all())
  let applied = 0
  for (const ev of events) {
    const app = await store.atsApplications.get(ev.atsApplicationId)
    if (!app) continue
    if (ev.type === 'started') app.status = 'started'
    else if (ev.type === 'terminated') app.status = 'withdrawn'
    app.lastInboundSyncAt = now()
    await store.atsApplications.update(app)
    await store.sync.insert({ id: uid(), employerId: app.employerId, atsProvider: app.atsProvider, entityType: 'status', entityId: app.id, direction: 'inbound', status: 'success', createdAt: now() })
    // verifiedVia: 'hris' — the only source the ledger trusts for these stages.
    await recordLedger({ candidateId: app.candidateId, stage: HRIS_EVENT_STAGE[ev.type], sourceId: app.id, employerId: app.employerId, jobRequisitionId: app.jobRequisitionId, notes: `HRIS ${ev.type} eff. ${ev.effectiveDate}`, verifiedVia: 'hris' })
    applied++
  }
  audit('connector', 'hris_synced', 'hris', provider.provider, `${applied} employment events (${provider.mode})`)
  res.json({ provider: provider.provider, mode: provider.mode, events: events.length, applied })
}))

// --- production ledger ------------------------------------------------------
api.post('/ledger/events', requireRole('ops'), h(async (req, res) => {
  const parsed = ledgerEventSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const e = await recordLedger(parsed.data)
  audit('ops', 'ledger_event', 'candidate', parsed.data.candidateId, parsed.data.stage)
  res.json(e)
}))
api.get('/ledger', h(async (req, res) => {
  const { candidateId, employerId } = req.query as { candidateId?: string; employerId?: string }
  if (candidateId) return res.json(await store.ledger.byCandidate(candidateId))
  if (employerId) return res.json(await store.ledger.byEmployer(employerId))
  res.json(await store.ledger.all())
}))

// --- ops dashboards --------------------------------------------------------
api.get('/ops/dashboards/integration-health', h(async (_req, res) => {
  const sync = await store.sync.all()
  const employers = (await store.employers.all()).map((e) => {
    const es = sync.filter((s) => s.employerId === e.id)
    return { id: e.id, name: e.name, atsProvider: e.atsProvider, integrationStatus: e.integrationStatus, lastSyncAt: es[0]?.createdAt ?? null, syncCount: es.length, failed: es.filter((s) => s.status === 'failed').length }
  })
  res.json({ employers, recentSync: await store.sync.recent(25), failed: await store.sync.failed() })
}))

api.get('/ops/dashboards/employer-demand', h(async (_req, res) => {
  const open = await store.requisitions.open()
  const by = (key: (r: JobRequisition) => string | undefined) => {
    const m: Record<string, { reqs: number; openings: number }> = {}
    for (const r of open) { const k = key(r) ?? 'unknown'; m[k] ??= { reqs: 0, openings: 0 }; m[k].reqs++; m[k].openings += r.openings ?? 1 }
    return m
  }
  res.json({
    openRequisitions: open.length,
    totalOpenings: open.reduce((a, r) => a + (r.openings ?? 1), 0),
    byState: by((r) => r.state), bySpecialty: by((r) => r.specialty), bySetting: by((r) => r.setting),
    submittedApplications: (await store.atsApplications.all()).length,
  })
}))

api.get('/ops/dashboards/submissions', h(async (_req, res) => {
  const packets = await store.packets.all()
  const apps = await store.atsApplications.all()
  const tally = <T extends string>(items: { status: T }[]) => items.reduce((m, x) => { m[x.status] = (m[x.status] ?? 0) + 1; return m }, {} as Record<string, number>)
  const appStatus = tally(apps)
  const submitted = apps.length || 1
  res.json({
    packetsByStatus: tally(packets), applicationsByStatus: appStatus,
    rates: {
      interview: +(((appStatus.interview ?? 0) + (appStatus.offer ?? 0) + (appStatus.hired ?? 0) + (appStatus.started ?? 0)) / submitted).toFixed(2),
      offer: +(((appStatus.offer ?? 0) + (appStatus.hired ?? 0) + (appStatus.started ?? 0)) / submitted).toFixed(2),
      started: +((appStatus.started ?? 0) / submitted).toFixed(2),
    },
  })
}))

api.get('/ops/dashboards/production-ledger', h(async (_req, res) => res.json({ funnel: await ledgerFunnel(), forecast: await ledgerForecast() })))

// --- AMN/Kaiser Program Workspace (ops cockpit) ----------------------------
api.post('/ops/programs', requireRole('ops'), h(async (req, res) => {
  const parsed = createProgramSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const employer = await store.employers.get(parsed.data.employerId)
  if (!employer) return res.status(404).json({ error: 'employer not found' })
  const p: Program = { id: uid(), ...parsed.data, status: 'active', createdAt: now(), updatedAt: now() }
  await store.programs.insert(p)
  // Auto-create one wave per waveStructure entry.
  for (let i = 0; i < p.waveStructure.length; i++) {
    const w: ProgramWave = { id: uid(), programId: p.id, waveNumber: i + 1, targetCount: p.waveStructure[i]!, status: 'planned', createdAt: now() }
    await store.programWaves.insert(w)
  }
  audit('ops', 'program_created', 'program', p.id, p.name)
  res.status(201).json(await programOverview(p.id))
}))
api.get('/ops/programs', requireRole('ops'), h(async (_req, res) => res.json(await store.programs.all())))
api.get('/ops/programs/:id', requireRole('ops'), h(async (req, res) => res.json(await programOverview(req.params.id))))
api.get('/ops/programs/:id/slate', requireRole('ops'), h(async (req, res) => res.json(await generateLicensedSlate(req.params.id))))
api.post('/ops/programs/:id/packets', requireRole('ops'), h(async (req, res) => {
  const ids: string[] = Array.isArray(req.body?.candidateIds) ? req.body.candidateIds : []
  res.json(await buildSlatePackets(req.params.id, ids))
}))
api.post('/ops/programs/:id/waves/:waveId/lock', requireRole('ops'), h(async (req, res) => {
  const parsed = lockWaveSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  try {
    const slate = await lockSlate(req.params.id, req.params.waveId, parsed.data.candidateIds)
    audit('ops', 'program_wave_locked', 'program', req.params.id, `wave ${req.params.waveId}: ${slate.candidateIds.length} RNs`)
    res.status(201).json(slate)
  } catch (e) {
    res.status(409).json({ error: (e as Error).message })
  }
}))
api.get('/ops/programs/:id/wave-tracker', requireRole('ops'), h(async (req, res) => res.json(await waveTracker(req.params.id))))
api.get('/ops/programs/:id/forecast', requireRole('ops'), h(async (req, res) => res.json(await ledgerForecast())))
api.get('/ops/programs/:id/scorecard', requireRole('ops'), h(async (req, res) => res.json(await scorecard(req.params.id))))
api.get('/ops/programs/:id/exceptions', requireRole('ops'), h(async (req, res) => res.json(await exceptions(req.params.id))))
api.get('/ops/programs/:id/invoices', requireRole('ops'), h(async (req, res) => res.json(await rollupProgramInvoices(req.params.id))))
api.get('/ops/programs/:id/expansion-gate', requireRole('ops'), h(async (req, res) => res.json(await expansionGate(req.params.id))))

// --- audit -----------------------------------------------------------------
api.get('/ops/audit', h(async (_req, res) => res.json(await store.audit.recent(150))))
