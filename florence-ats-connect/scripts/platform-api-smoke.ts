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
import { apiV1 } from '../server/api/v1'
import { OPENAPI_V1 } from '../server/api/v1/openapi'
import { buildPacket } from '../shared/packet'
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

  // Boot the /v1 app (openapi public, everything else authed) ------------------
  const app = express()
  app.use(express.json())
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

  // ── Seed fixtures (same store the routes read) ──────────────────────────────
  const employer: EmployerAccount = { id: `emp-${run}`, name: `Partner ${run}`, atsProvider: 'manual', integrationStatus: 'manual', defaultBillingModel: 'direct', sourceChannel: 'direct', createdAt: now(), updatedAt: now() }
  await store.employers.insert(employer)
  const mkCand = (over: Partial<FlorenceCandidate>): FlorenceCandidate => ({
    id: uid(), fullName: `Nurse ${uid().slice(0, 5)}`, email: `n.${uid().slice(0, 6)}@t.dev`, specialtyExperience: ['med_surg'],
    readinessBand: 'green', nclexStatus: 'passed', licenseStatus: 'issued', visaStatus: 'approved', targetStates: [ST],
    employerShareConsent: 'granted', humanQaStatus: 'approved', createdAt: now(), updatedAt: now(), ...over,
  })
  const cand = mkCand({}); await store.candidates.insert(cand)
  const job: FlorenceRNJob = { id: uid(), employerId: employer.id, employerName: employer.name, fingerprint: `fp_${run}`, title: 'Registered Nurse', normalizedRole: 'registered_nurse', specialty: 'med_surg', setting: 'hospital', status: 'open', displayAllowed: true, confidence: 'low', firstSeenAt: now(), lastSeenAt: now(), state: ST, requiredLicenseState: ST }
  await store.demandJobs.insert(job)
  const req2: JobRequisition = { id: `req-${run}`, employerId: employer.id, atsProvider: 'manual', title: 'RN', setting: 'inpatient', status: 'open', requiredLicenseState: ST, sourceChannel: 'direct', importedAt: now(), lastSyncedAt: now() }
  await store.requisitions.insert(req2)
  const program: Program = { id: `prog-${run}`, employerId: employer.id, name: `Prog ${run}`, targetCount: 5, waveStructure: [5], status: 'active', channel: 'direct', createdAt: now(), updatedAt: now() } as Program
  await store.programs.insert(program)
  const mkConsent = (candidateId: string): EmployerShareConsent => ({ id: uid(), candidateId, employerId: employer.id, purpose: 'employer_share', allowedData: ['resume', 'credential_summary', 'readiness_summary', 'video_profile'], consentTextVersion: 'v1', consentTextHash: 'hash', grantedAt: now() })
  const mkReadyPacket = (c: FlorenceCandidate) => { const p = buildPacket({ candidate: { ...c, employerShareConsent: 'granted' }, requisition: req2, consent: mkConsent(c.id), newId: uid, nowIso: now }); p.status = 'ready_to_submit'; p.humanQaStatus = 'approved'; return p }
  const readyPacket = mkReadyPacket(cand); await store.packets.insert(readyPacket)
  const blockedCand = mkCand({ visaStatus: 'unknown' }); await store.candidates.insert(blockedCand)
  const blockedPacket = mkReadyPacket(blockedCand); await store.packets.insert(blockedPacket)

  // ── Auth gate ───────────────────────────────────────────────────────────────
  ok('no token ⇒ 401', (await fetch(`${base}/v1/`)).status === 401)
  ok('openapi.json is PUBLIC (no auth) ⇒ 200', (await fetch(`${base}/v1/openapi.json`)).status === 200)

  // ── ops reaches every module ────────────────────────────────────────────────
  const meta = await ops.meta() as { modules: string[] }
  ok('ops: meta lists all modules', ['nurses', 'opportunities', 'applications', 'pricing', 'programs', 'ledger', 'events'].every((m) => meta.modules.includes(m)))
  const opps = await ops.opportunities() as any[]
  ok('ops: opportunities reachable + includes the open job', opps.some((o) => o.id === job.id))
  ok('ops: single opportunity card builds', !!(await ops.opportunity(job.id)))
  ok('ops: programs reachable + includes the program', (await ops.programs() as any[]).some((p) => p.id === program.id))
  ok('ops: forecast reachable', !!(await ops.forecast()))

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

  // ── Scope 403s: employer is redacted + can't act ────────────────────────────
  ok('employer ⇒ 403 on the INTERNAL nurse record (missing passport:read:internal)', await expectStatus(emp.nurse(cand.id), 403))
  ok('employer ⇒ 403 requesting the internal passport view', (await fetch(`${base}/v1/nurses/${cand.id}/passport?view=internal`, { headers: { authorization: `Bearer ${empToken}` } })).status === 403)
  ok('employer ⇒ 403 on submit (missing applications:submit)', await expectStatus(emp.submitApplication(readyPacket.id), 403))

  // ── Gate endpoint: express_interest + the missing[] list ────────────────────
  const elig = await ops.eligibilityCheck(cand.id, job.id) as { allowedAction: string; missing: string[]; applicationGateStatus: string; subjectTo: string[] }
  ok('gate endpoint: not-yet-QA candidate ⇒ express_interest', elig.allowedAction === 'express_interest')
  ok('gate endpoint: surfaces the post-QA missing gates (packet QA + docs)', elig.missing.includes('employer_packet_qa_approved') && elig.missing.includes('documents_complete'))
  const eligBlocked = await ops.eligibilityCheck(blockedCand.id, job.id) as { missing: string[] }
  ok('gate endpoint: visa-unknown candidate ⇒ visa_approved in missing[] (fail-closed)', eligBlocked.missing.includes('visa_approved'))

  // ── Submit: hard-gated (409) + idempotent (one ledger row) ──────────────────
  ok('submit: visa-unknown packet ⇒ 409 (hard block)', await expectStatus(ops.submitApplication(blockedPacket.id), 409))
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

  // ── Pricing: deterministic; FICA stays customer-side ────────────────────────
  const quote = await ops.priceQuote({ state: ST }) as { monthlyFeePerRnUsd: number; note: string }
  ok('pricing: returns a per-RN/month fee', quote.monthlyFeePerRnUsd > 0, `$${quote.monthlyFeePerRnUsd}`)
  ok('pricing: FICA framed as customer effective-cost, never FlorenceRN revenue', /effective-cost/i.test(quote.note) && /FICA/i.test(quote.note))

  server.close(); jwks.close()
  console.log(`\n${fail ? 'PLATFORM API SMOKE FAILED' : 'PLATFORM API SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
