// ============================================================================
// FlorenceRN Platform API (/v1) smoke — proves the headless contract end-to-end
// over REAL HTTP. We mint our own RS256 token against a throwaway in-process JWKS
// server so requireAuth + the scope gates + idempotency + the actual route
// handlers all run for real (no Core needed). Exercised THROUGH the TypeScript
// SDK (sdk/florencern.ts) so the SDK is verified too. Runs on sqlite AND
// ATS_DB=postgres.
//
// Asserts: OpenAPI 3.1 parses + documents the employer no-visa invariant; no token
// ⇒ 401; ops reaches every module; employer is redacted (no internal nurse, no
// submit) ⇒ 403; passport employer view omits visa/financing; the gate endpoint
// returns express_interest + the missing[] list; submit is hard-gated (409) and
// idempotent (dup Idempotency-Key ⇒ one ledger row, never double-submits); events
// write to the ledger idempotently; pricing keeps FICA customer-side.
// ============================================================================
import { createServer } from 'node:http'
import { generateKeyPairSync, createSign } from 'node:crypto'
import express from 'express'
import { store, uid, now } from '../server/db'
import { configureCoreAuth } from '../server/coreAuth'
import { api } from '../server/routes'
import { apiV1 } from '../server/api/v1'
import { OPENAPI_V1 } from '../server/api/v1/openapi'
import { buildPacket } from '../shared/packet'
import { buildResumePdf, resumeFilename } from '../server/resumePdf'
import { recordLedger } from '../server/ledger'
import { createAtsDocumentVault } from '../server/documentVault'
import { FlorenceRN } from '../sdk/florencern'
import type { FlorenceCandidate, JobRequisition, EmployerAccount, EmployerShareConsent, Program } from '../shared/types'
import type { FlorenceRNJob } from '../shared/demand-types'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }
const run = uid().slice(0, 8)
const ST = 'NV'

// ── Throwaway RS256 signer + JWKS server (stands in for Core) ────────────────
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const kid = `test-${run}`
const jwk = { ...(publicKey.export({ format: 'jwk' }) as Record<string, unknown>), kid, use: 'sig', alg: 'RS256' }
const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
function mintToken(claims: Record<string, unknown>): string {
  const header = { alg: 'RS256', typ: 'JWT', kid }
  const t = Math.floor(Date.now() / 1000)
  const payload = { iss: 'florence-auth', aud: 'florence', sub: `usr_${uid().slice(0, 6)}`, iat: t, exp: t + 3600, ...claims }
  const input = `${b64url(header)}.${b64url(payload)}`
  return `${input}.${createSign('RSA-SHA256').update(input).end().sign(privateKey).toString('base64url')}`
}

async function main() {
  // OpenAPI contract (pure — before any server) -------------------------------
  const spec = JSON.parse(JSON.stringify(OPENAPI_V1)) as any
  ok('openapi: parses + is 3.1.0', spec.openapi === '3.1.0')
  ok('openapi: documents the employer no-visa invariant (Title VII/IRCA)', /visa/i.test(spec.info?.description ?? '') && /IRCA/i.test(spec.info?.description ?? ''))
  ok('openapi: covers the core paths', ['/nurses/{id}', '/nurses/{id}/passport', '/opportunities', '/applications/eligibility-check', '/applications/{packetId}/submit', '/events', '/ledger/forecast'].every((p) => spec.paths?.[p]))
  ok('openapi: declares security schemes (cookie + bearer) + scope map', !!spec.components?.securitySchemes?.coreCookie && !!spec.components?.securitySchemes?.coreBearer && !!spec['x-scopes'])

  // Boot the JWKS server, point coreAuth at it, mint tokens --------------------
  const jwks = createServer((req, res) => {
    if (req.url?.startsWith('/.well-known/jwks.json')) { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ keys: [jwk] })) }
    else { res.statusCode = 404; res.end('{}') }
  })
  await new Promise<void>((r) => jwks.listen(0, '127.0.0.1', () => r()))
  const jwksPort = (jwks.address() as { port: number }).port
  configureCoreAuth({ issuerUrl: `http://127.0.0.1:${jwksPort}`, issuer: 'florence-auth', audience: 'florence' })

  const opsToken = mintToken({ role: 'ops', name: 'Ops User', email: `ops.${run}@florence.dev` })
  const empToken = mintToken({ role: 'employer', org_id: `emp-${run}`, email: `emp.${run}@partner.dev` })
  const missingTenantEmployerToken = mintToken({ role: 'employer', email: `missing-tenant.${run}@partner.dev` })

  // Boot the /v1 app (openapi public, everything else authed) ------------------
  const app = express()
  app.use(express.json())
  app.use('/api', api)
  app.get('/v1/openapi.json', (_req, res) => res.json(OPENAPI_V1))
  app.use('/v1', apiV1)
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>((r) => server.on('listening', () => r()))
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`

  const ops = new FlorenceRN({ baseUrl: base, token: opsToken })
  const emp = new FlorenceRN({ baseUrl: base, token: empToken })
  const expectStatus = async (p: Promise<unknown>, code: number): Promise<boolean> => {
    try { await p; return false } catch (e) { return (e as { status?: number }).status === code }
  }
  const apiFetch = (path: string) => fetch(`${base}/api${path}`, { headers: { authorization: `Bearer ${empToken}` } })
  const v1OpsFetch = (path: string, init: RequestInit = {}) => fetch(`${base}/v1${path}`, {
    ...init,
    headers: { authorization: `Bearer ${opsToken}`, 'content-type': 'application/json', ...(init.headers ?? {}) },
  })

  // ── Seed fixtures (same store the routes read) ──────────────────────────────
  const employer: EmployerAccount = { id: `emp-${run}`, name: `Partner ${run}`, atsProvider: 'manual', integrationStatus: 'manual', defaultBillingModel: 'direct', sourceChannel: 'direct', createdAt: now(), updatedAt: now() }
  await store.employers.insert(employer)
  const otherEmployer: EmployerAccount = { id: `other-emp-${run}`, name: `Other Partner ${run}`, atsProvider: 'manual', integrationStatus: 'manual', defaultBillingModel: 'direct', sourceChannel: 'direct', createdAt: now(), updatedAt: now() }
  await store.employers.insert(otherEmployer)
  const mkCand = (over: Partial<FlorenceCandidate>): FlorenceCandidate => ({
    id: uid(), fullName: `Nurse ${uid().slice(0, 5)}`, email: `n.${uid().slice(0, 6)}@t.dev`, specialtyExperience: ['med_surg'],
    readinessBand: 'green', nclexStatus: 'passed', licenseStatus: 'issued', visaStatus: 'approved', targetStates: [ST],
    employerShareConsent: 'granted', humanQaStatus: 'approved', createdAt: now(), updatedAt: now(), ...over,
  })
  const cand = mkCand({}); await store.candidates.insert(cand)
  const otherCand = mkCand({}); await store.candidates.insert(otherCand)
  const job: FlorenceRNJob = { id: uid(), employerId: employer.id, employerName: employer.name, fingerprint: `fp_${run}`, title: 'Registered Nurse', normalizedRole: 'registered_nurse', specialty: 'med_surg', setting: 'hospital', status: 'open', displayAllowed: true, confidence: 'low', firstSeenAt: now(), lastSeenAt: now(), state: ST, requiredLicenseState: ST }
  await store.demandJobs.insert(job)
  const req2: JobRequisition = { id: `req-${run}`, employerId: employer.id, atsProvider: 'manual', title: 'RN', setting: 'inpatient', status: 'open', requiredLicenseState: ST, sourceChannel: 'direct', importedAt: now(), lastSyncedAt: now() }
  await store.requisitions.insert(req2)
  const otherReq: JobRequisition = { ...req2, id: `other-req-${run}`, employerId: otherEmployer.id, atsRequisitionId: `OTHER-${run}` }
  await store.requisitions.insert(otherReq)
  const program: Program = { id: `prog-${run}`, employerId: employer.id, name: `Prog ${run}`, targetCount: 5, waveStructure: [5], status: 'active', channel: 'direct', createdAt: now(), updatedAt: now() } as Program
  await store.programs.insert(program)
  const otherProgram: Program = { ...program, id: `other-prog-${run}`, employerId: otherEmployer.id, name: `Other Prog ${run}` }
  await store.programs.insert(otherProgram)
  const mkConsent = (candidateId: string, employerId = employer.id): EmployerShareConsent => ({ id: uid(), candidateId, employerId, purpose: 'employer_share', allowedData: ['resume', 'credential_summary', 'readiness_summary', 'video_profile'], consentTextVersion: 'v1', consentTextHash: 'hash', grantedAt: now() })
  const consent = mkConsent(cand.id)
  await store.consents.insert(consent)
  const otherConsent = mkConsent(otherCand.id, otherEmployer.id)
  await store.consents.insert(otherConsent)
  const mkReadyPacket = (c: FlorenceCandidate, requisition: JobRequisition, packetConsent: EmployerShareConsent) => { const p = buildPacket({ candidate: { ...c, employerShareConsent: 'granted' }, requisition, consent: packetConsent, newId: uid, nowIso: now }); p.status = 'ready_to_submit'; p.humanQaStatus = 'approved'; return p }
  const readyPacket = mkReadyPacket(cand, req2, consent); await store.packets.insert(readyPacket)
  const otherPacket = mkReadyPacket(otherCand, otherReq, otherConsent); await store.packets.insert(otherPacket)
  const qaPendingCand = mkCand({}); await store.candidates.insert(qaPendingCand)
  const qaPendingConsent = mkConsent(qaPendingCand.id)
  await store.consents.insert(qaPendingConsent)
  const qaPendingPacket = buildPacket({ candidate: qaPendingCand, requisition: req2, consent: qaPendingConsent, newId: uid, nowIso: now })
  await store.packets.insert(qaPendingPacket)
  const blockedCand = mkCand({ visaStatus: 'unknown' }); await store.candidates.insert(blockedCand)
  const blockedConsent = mkConsent(blockedCand.id)
  await store.consents.insert(blockedConsent)
  const blockedPacket = mkReadyPacket(blockedCand, req2, blockedConsent); await store.packets.insert(blockedPacket)
  const blockedVault = createAtsDocumentVault({ store, publicBaseUrl: base, newId: uid, now: () => new Date() })
  const blockedPdf = buildResumePdf({ packet: blockedPacket, candidate: blockedCand, requisition: req2 })
  const blockedDocument = await blockedVault.upload({
    documentType: 'employer_packet',
    candidateId: blockedCand.id,
    employerId: employer.id,
    packetId: blockedPacket.id,
    filename: resumeFilename(blockedPacket, blockedCand),
    contentType: 'application/pdf',
    bytes: blockedPdf,
    actor: { id: 'system', role: 'system' },
  })
  const blockedSignedUrl = await blockedVault.createSignedUrl({
    documentId: blockedDocument.id,
    actor: { id: 'system', role: 'system' },
    recipientView: 'employer',
    recipientOrgId: employer.id,
    purpose: 'application_packet_release',
  })
  const blockedResumeToken = `blocked-resume-${run}`
  await store.attribution.insert({ id: uid(), candidateId: cand.id, employerId: employer.id, eventType: 'tenant.main_event', sourceSystem: 'smoke', occurredAt: now() })
  await store.attribution.insert({ id: uid(), candidateId: otherCand.id, employerId: otherEmployer.id, eventType: 'tenant.other_event', sourceSystem: 'smoke', occurredAt: now() })
  await recordLedger({ candidateId: cand.id, stage: 'matched', employerId: employer.id, jobRequisitionId: req2.id })
  await recordLedger({ candidateId: otherCand.id, stage: 'matched', employerId: otherEmployer.id, jobRequisitionId: otherReq.id })

  // ── Auth gate ───────────────────────────────────────────────────────────────
  ok('no token ⇒ 401', (await fetch(`${base}/v1/`)).status === 401)
  ok('openapi.json is PUBLIC (no auth) ⇒ 200', (await fetch(`${base}/v1/openapi.json`)).status === 200)
  ok('employer token without org_id ⇒ 401 (missing tenant fails closed)', (await fetch(`${base}/v1/programs`, { headers: { authorization: `Bearer ${missingTenantEmployerToken}` } })).status === 401)

  // ── /api tenant scope: employer can read only its own requisitions/packets ──
  ok('/api employer: own requisition read allowed', (await apiFetch(`/ops/requisitions/${req2.id}`)).status === 200)
  ok('/api employer: other employer requisition denied', (await apiFetch(`/ops/requisitions/${otherReq.id}`)).status === 403)
  ok('/api employer: other employer matches denied', (await apiFetch(`/ops/requisitions/${otherReq.id}/matches`)).status === 403)
  const packetList = await (await apiFetch('/ops/application-packets')).json() as any[]
  ok('/api employer: packet list is employer-scoped + gate-filtered', packetList.some((p) => p.id === readyPacket.id) && packetList.every((p) => p.employerId === employer.id) && !packetList.some((p) => p.id === otherPacket.id) && !packetList.some((p) => p.id === blockedPacket.id))
  ok('/api employer: own packet read allowed', (await apiFetch(`/ops/application-packets/${readyPacket.id}`)).status === 200)
  const blockedPacketRead = await apiFetch(`/ops/application-packets/${blockedPacket.id}`)
  const blockedPacketReadText = await blockedPacketRead.text()
  ok('/api employer: blocked packet read denied by ApplicationGate', blockedPacketRead.status === 409)
  ok('/api employer: blocked packet denial does not leak visa gate details', !/visa_approved|visa_pending|work authorization not cleared/i.test(blockedPacketReadText))
  ok('/api employer: detailed packet gate endpoint is staff-only', (await apiFetch(`/ops/application-packets/${blockedPacket.id}/gate`)).status === 403)
  ok('/api employer: blocked packet resume PDF denied by ApplicationGate', (await apiFetch(`/ops/application-packets/${blockedPacket.id}/resume.pdf`)).status === 409)
  ok('/api public signed packet: blocked packet artifact denied by ApplicationGate', (await fetch(blockedSignedUrl.url)).status === 409)
  ok('/api public legacy resume token: no longer resolves to a packet artifact', (await fetch(`${base}/api/p/${blockedResumeToken}/resume.pdf`)).status === 404)
  ok('/api employer: other employer packet denied', (await apiFetch(`/ops/application-packets/${otherPacket.id}`)).status === 403)

  // ── Document Vault: packet PDFs are encrypted + signed, not long-lived tokens
  const redirect = await fetch(`${base}/api/ops/application-packets/${readyPacket.id}/resume.pdf`, { headers: { authorization: `Bearer ${empToken}` }, redirect: 'manual' })
  const signedLocation = redirect.headers.get('location') ?? ''
  ok('/api document vault: authenticated packet request returns a short signed URL', redirect.status === 303 && signedLocation.startsWith(`${base}/api/p/`))
  ok('/api document vault: signed URL is opaque', !!signedLocation && !signedLocation.includes(readyPacket.id) && !signedLocation.includes(cand.id) && !signedLocation.includes(encodeURIComponent(cand.fullName)))
  const packetPdf = await fetch(signedLocation)
  const packetPdfBytes = Buffer.from(await packetPdf.arrayBuffer())
  ok('/api document vault: signed URL downloads the packet PDF', packetPdf.status === 200 && /^application\/pdf/.test(packetPdf.headers.get('content-type') ?? '') && packetPdfBytes.subarray(0, 5).toString('utf8') === '%PDF-')
  const packetDocs = await store.restrictedDocuments.byPacket(readyPacket.id)
  const packetDoc = packetDocs[0]
  ok('/api document vault: packet document stored in the vault', !!packetDoc && packetDoc.documentType === 'employer_packet' && packetDoc.status === 'active')
  if (!packetDoc) throw new Error('document vault smoke could not find packet document')
  ok('/api document vault: packet PDF is encrypted at rest', !!packetDoc && !packetDoc.encryptedBlob.includes('FlorenceRN verified candidate packet') && !packetDoc.encryptedBlob.includes(cand.fullName))
  const packetGrants = await store.documentAccessGrants.byDocument(packetDoc.id)
  ok('/api document vault: grant is hashed + short-lived', packetGrants.length > 0 && !signedLocation.includes(packetGrants[0].tokenHash) && new Date(packetGrants[0].expiresAt).getTime() - Date.now() <= (15 * 60 + 2) * 1000)
  const vault = createAtsDocumentVault({ store, publicBaseUrl: base, newId: uid, now: () => new Date() })
  let wrongTenantDenied = false
  try {
    await vault.createSignedUrl({ documentId: packetDoc.id, actor: { id: 'other-employer', role: 'employer', employerId: otherEmployer.id }, recipientView: 'employer', recipientOrgId: otherEmployer.id, purpose: 'smoke_wrong_tenant' })
  } catch { wrongTenantDenied = true }
  ok('/api document vault: wrong tenant cannot generate signed URL', wrongTenantDenied)
  const expiresFast = await vault.createSignedUrl({ documentId: packetDoc.id, actor: { id: 'ops-smoke', role: 'ops' }, recipientView: 'employer', recipientOrgId: employer.id, purpose: 'application_packet_release', ttlSeconds: 1 })
  await new Promise((r) => setTimeout(r, 1100))
  ok('/api document vault: expired signed URL fails closed', (await fetch(expiresFast.url)).status === 403)
  let unsafeRejected = false
  try {
    await vault.upload({ documentType: 'employer_packet', candidateId: cand.id, employerId: employer.id, packetId: readyPacket.id, filename: 'packet.exe', contentType: 'application/octet-stream', bytes: Buffer.from('not a pdf'), actor: { id: 'ops-smoke', role: 'ops' } })
  } catch { unsafeRejected = true }
  ok('/api document vault: unsafe upload type is rejected', unsafeRejected)
  const revokedUrl = await vault.createSignedUrl({ documentId: packetDoc.id, actor: { id: 'ops-smoke', role: 'ops' }, recipientView: 'employer', recipientOrgId: employer.id, purpose: 'application_packet_release' })
  await vault.revokeDocument(packetDoc.id, { id: 'ops-smoke', role: 'ops' })
  ok('/api document vault: revoked document signed URL fails closed', (await fetch(revokedUrl.url)).status === 403)
  const vaultAudit = await store.audit.recent(300)
  ok('/api document vault: upload/share/download/failed/delete audit events are recorded', ['document.upload', 'document.upload_failed', 'document.share', 'document.download', 'document.access_denied', 'document.delete'].every((action) => vaultAudit.some((a) => a.action === action)))

  // ── ops reaches every module ────────────────────────────────────────────────
  const meta = await ops.meta() as { modules: string[] }
  ok('ops: meta lists all modules', ['nurses', 'opportunities', 'applications', 'pricing', 'programs', 'ledger', 'events'].every((m) => meta.modules.includes(m)))
  const opps = await ops.opportunities() as any[]
  ok('ops: opportunities reachable + includes the open job', opps.some((o) => o.id === job.id))
  ok('ops: single opportunity card builds', !!(await ops.opportunity(job.id)))
  ok('ops: programs reachable + includes the program', (await ops.programs() as any[]).some((p) => p.id === program.id))
  ok('ops: forecast reachable', !!(await ops.forecast()))
  const employerPrograms = await emp.programs() as any[]
  ok('employer: program list is tenant-scoped', employerPrograms.some((p) => p.id === program.id) && employerPrograms.every((p) => p.employerId === employer.id) && !employerPrograms.some((p) => p.id === otherProgram.id))
  ok('employer: own program read allowed', ((await emp.program(program.id)) as any).program?.id === program.id)
  ok('employer: other employer program denied', await expectStatus(emp.program(otherProgram.id), 403))

  // ── Passport: internal carries visa; employer view withholds it ─────────────
  const internal = await ops.nurse(cand.id) as { passport: Record<string, unknown> }
  ok('ops: internal nurse view CARRIES visaStatus', 'visaStatus' in internal.passport)
  const empView = await ops.passport(cand.id, 'employer') as { passport: Record<string, unknown>; withheld: { field: string }[] }
  ok('employer view: passport OMITS visaStatus + financing', !('visaStatus' in empView.passport) && !('financing' in empView.passport))
  ok('employer view: withheld[] names visa + financing (with reasons)', empView.withheld.some((w) => w.field === 'visaStatus') && empView.withheld.some((w) => w.field === 'financing'))
  // The withheld[] manifest is REQUIRED to name visaStatus (with a reason) — that's the
  // audit trail. The invariant is the data PROJECTION carries no visa value.
  ok('employer view: passport projection contains NO visa value', !/visastatus|"visa"/i.test(JSON.stringify(empView.passport)))
  ok('employer token: can read the employer passport view', !!(await emp.passport(cand.id, 'employer')))
  ok('employer token: other employer candidate passport denied', await expectStatus(emp.passport(otherCand.id, 'employer'), 403))

  // ── Scope 403s: employer is redacted + can't act ────────────────────────────
  ok('employer ⇒ 403 on the INTERNAL nurse record (missing passport:read:internal)', await expectStatus(emp.nurse(cand.id), 403))
  ok('employer ⇒ 403 requesting the internal passport view', (await fetch(`${base}/v1/nurses/${cand.id}/passport?view=internal`, { headers: { authorization: `Bearer ${empToken}` } })).status === 403)
  ok('employer ⇒ 403 on submit (missing applications:submit)', await expectStatus(emp.submitApplication(readyPacket.id), 403))

  // ── Gate endpoint: express_interest + the missing[] list ────────────────────
  const elig = await ops.eligibilityCheck(cand.id, job.id) as { allowedAction: string; missing: string[]; applicationGateStatus: string; subjectTo: string[]; subjectToMessage: string }
  ok('gate endpoint: not-yet-QA candidate ⇒ express_interest', elig.allowedAction === 'express_interest')
  ok('gate endpoint: surfaces the post-QA missing gates (packet QA + docs)', elig.missing.includes('employer_packet_qa_approved') && elig.missing.includes('documents_complete'))
  ok('gate endpoint: carries required subject-to message', /consular processing, final work authorization, credentialing, onboarding, and employer approval/i.test(elig.subjectToMessage))
  const eligBlocked = await ops.eligibilityCheck(blockedCand.id, job.id) as { missing: string[] }
  ok('gate endpoint: visa-unknown candidate ⇒ visa_approved in missing[] (fail-closed)', eligBlocked.missing.includes('visa_approved'))

  // ── Submit: hard-gated (409) + idempotent (one ledger row) ──────────────────
  ok('submit: visa-unknown packet ⇒ 409 (hard block)', await expectStatus(ops.submitApplication(blockedPacket.id), 409))
  const qaSubmit = await v1OpsFetch(`/applications/${qaPendingPacket.id}/submit`, { method: 'POST', body: '{}' })
  const qaSubmitBody = await qaSubmit.json() as { status?: string; missing?: string[]; reasons?: string[] }
  ok('submit: QA-pending packet runs through ApplicationGate and blocks', qaSubmit.status === 409 && qaSubmitBody.status === 'qa_pending' && !!qaSubmitBody.missing?.includes('employer_packet_qa_approved') && !!qaSubmitBody.reasons?.length)
  const qaAudits = await store.audit.recent(300)
  ok('submit: blocked QA attempt writes submission + packet-scoped gate audit events', qaAudits.some((a) => a.action === 'application_gate.submission_attempt' && a.entityId === qaPendingPacket.id) && qaAudits.some((a) => a.action === 'application_gate.check' && a.entity === 'packet' && a.entityId === qaPendingPacket.id))
  const idemKey = `submit-${run}`
  const s1 = await ops.submitApplication(readyPacket.id, undefined, idemKey) as { ok: boolean; status: string }
  const s2 = await ops.submitApplication(readyPacket.id, undefined, idemKey) as { ok: boolean; status: string }
  ok('submit: fully-ready packet ⇒ 201 submitted', s1.ok && s1.status === 'submitted')
  ok('submit: replay with same Idempotency-Key ⇒ same result (cached)', s2.ok && s2.status === 'submitted')
  const subRows = (await store.ledger.byCandidate(cand.id)).filter((e) => e.stage === 'ats_application_submitted')
  ok('submit: idempotent — exactly ONE ledger submit row (never double-submits)', subRows.length === 1, `rows=${subRows.length}`)

  // ── Events: write to the ledger spine, idempotently ─────────────────────────
  const evCand = mkCand({}); await store.candidates.insert(evCand)
  const evKey = `ev-${run}`
  const ev1 = await ops.recordEvent({ event_type: 'demand.tile_viewed', candidate_id: evCand.id }, evKey) as { eventId: string }
  const ev2 = await ops.recordEvent({ event_type: 'demand.tile_viewed', candidate_id: evCand.id }, evKey) as { eventId: string }
  ok('events: create returns an id', !!ev1.eventId)
  ok('events: replay with same Idempotency-Key ⇒ same eventId (no double-write)', ev1.eventId === ev2.eventId)
  const evRows = (await store.attribution.byCandidate(evCand.id)).filter((e) => e.eventType === 'demand.tile_viewed')
  ok('events: exactly ONE attribution row written', evRows.length === 1, `rows=${evRows.length}`)
  ok('events: GET /events reads it back', (await ops.events(evCand.id) as any[]).some((e) => e.id === ev1.eventId))
  const employerEvents = await emp.events() as any[]
  ok('employer: events list is tenant-scoped', employerEvents.length > 0 && employerEvents.every((e) => e.employerId === employer.id) && !employerEvents.some((e) => e.employerId === otherEmployer.id))
  ok('employer: candidate events are filtered to own employer', (await emp.events(cand.id) as any[]).every((e) => e.employerId === employer.id))
  ok('employer: other employer candidate events denied', await expectStatus(emp.events(otherCand.id), 403))
  const employerLedger = await emp.ledger() as any[]
  ok('employer: ledger list is tenant-scoped', employerLedger.length > 0 && employerLedger.every((e) => e.employerId === employer.id) && !employerLedger.some((e) => e.employerId === otherEmployer.id))
  ok('employer: candidate ledger is filtered to own employer', (await emp.ledger(cand.id) as any[]).every((e) => e.employerId === employer.id))
  ok('employer: other employer candidate ledger denied', await expectStatus(emp.ledger(otherCand.id), 403))
  ok('employer: unscoped ledger forecast denied until scoped forecast exists', await expectStatus(emp.forecast(), 403))
  await new Promise((r) => setTimeout(r, 50))
  const denied = await store.audit.recent(200)
  ok('tenant-scope denials create audit events', denied.some((a) => a.action === 'tenant.access_denied' && [otherReq.id, otherPacket.id, otherProgram.id, otherCand.id].includes(a.entityId)))

  // ── Pricing: deterministic; FICA stays customer-side ────────────────────────
  const quote = await ops.priceQuote({ state: ST }) as { monthlyFeePerRnUsd: number; note: string }
  ok('pricing: returns a per-RN/month fee', quote.monthlyFeePerRnUsd > 0, `$${quote.monthlyFeePerRnUsd}`)
  ok('pricing: FICA framed as customer effective-cost, never FlorenceRN revenue', /effective-cost/i.test(quote.note) && /FICA/i.test(quote.note))

  server.close(); jwks.close()
  console.log(`\n${fail ? 'PLATFORM API SMOKE FAILED' : 'PLATFORM API SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
