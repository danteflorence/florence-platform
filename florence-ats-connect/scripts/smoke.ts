// End-to-end smoke test over the HTTP API: auth → jobs-in → match → consent →
// packet → QA → submit → status sync → ledger. Self-contained: it provisions its
// own employer + requisition so it's deterministic regardless of accumulated data.
// Also asserts the consent gate, data minimization, and the billing-status invariant.
// Run the server first (`npm run start`), then `npm run smoke`.
export {}
const BASE = process.env.ATS_CONNECT_BASE_URL ?? `http://localhost:${process.env.PORT ?? 8788}`
// Auth now comes from FlorenceRN Core SSO (local dev: the seeded password admin).
const CORE = process.env.CORE_ISSUER_URL ?? 'http://id.lvh.me:8080'
const SMOKE_EMAIL = process.env.SMOKE_EMAIL ?? 'dev@florenceeducation.com'
const SMOKE_PASSWORD = process.env.SMOKE_PASSWORD ?? 'florence-dev'
let jwt = ''

async function call(method: string, path: string, body?: unknown): Promise<{ status: number; body: any }> {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(jwt ? { authorization: `Bearer ${jwt}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let parsed: any = text
  try { parsed = JSON.parse(text) } catch { /* keep raw */ }
  return { status: res.status, body: parsed }
}

const ok = (label: string, cond: boolean, extra?: string) => {
  console.log(`${cond ? '✓' : '✗'} ${label}${extra ? ` — ${extra}` : ''}`)
  if (!cond) process.exitCode = 1
}

// --- auth (FlorenceRN Core SSO) ---------------------------------------------
{
  const r = await fetch(`${CORE}/auth/password`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: SMOKE_EMAIL, password: SMOKE_PASSWORD }) })
  jwt = (await r.json().catch(() => ({})))?.token ?? ''
  ok('auth: Core SSO login → token', r.status === 200 && !!jwt, jwt ? '' : `is florence-core up at ${CORE} with the seeded dev admin?`)
}
ok('no-token request rejected (401)', (await fetch(`${BASE}/api/ops/requisitions`)).status === 401)

const health = await call('GET', '/health')
ok('health', health.status === 200 && health.body.ok === true, JSON.stringify(health.body.counts))

// --- provision a dedicated employer + requisition (deterministic) ----------
const emp = (await call('POST', '/ops/employers', { name: 'Smoke Test Health', atsProvider: 'manual' })).body
ok('created employer', !!emp.id)
await call('POST', `/ops/employers/${emp.id}/requisitions/import`, {
  source: 'manual',
  jobs: [{ atsRequisitionId: 'SMOKE-REQ-1', title: 'Registered Nurse — Med Surg', specialty: 'Med Surg', setting: 'inpatient', city: 'Phoenix', state: 'AZ', requiredLicenseState: 'AZ', openings: 3, targetStartWindow: 'Q1 2027' }],
})
const req = (await call('GET', `/ops/employers/${emp.id}/requisitions`)).body[0]
ok('imported requisition', !!req?.id, `${req?.title} (${req?.requiredLicenseState})`)

const matches = (await call('POST', `/ops/requisitions/${req.id}/matches/run`)).body.matches
const top = matches[0]
ok('matching ranked candidates', matches.length > 0, top && `top: ${top.candidateName} score=${top.matchScore} category=${top.category}`)
ok('top match is ready_to_submit', top.category === 'ready_to_submit', top.category)

// Packet without consent for THIS employer should be blocked (409).
const noConsent = await call('POST', '/ops/application-packets', { candidateId: top.candidateId, jobRequisitionId: req.id })
ok('packet blocked without consent (409)', noConsent.status === 409, noConsent.body.error?.slice(0, 56))

const consent = await call('POST', `/candidates/${top.candidateId}/consents/employer-share`, { employerId: emp.id, jobRequisitionId: req.id })
ok('consent granted', consent.status === 200 && !!consent.body.consentTextHash)

const packet = (await call('POST', '/ops/application-packets', { candidateId: top.candidateId, jobRequisitionId: req.id })).body
ok('packet built', packet.status === 'qa_pending')
ok('data minimization enforced', packet.withheldFields.some((w: any) => w.field === 'nationality'), `${packet.withheldFields.length} fields withheld`)

const approved = await call('POST', `/ops/application-packets/${packet.id}/qa-approve`, { reviewer: 'smoke', decision: 'approve' })
ok('QA approved → ready_to_submit', approved.body.status === 'ready_to_submit')

const submit = await call('POST', `/ops/application-packets/${packet.id}/submit`)
const app = submit.body.application
ok('submitted via manual bridge', submit.status === 200 && app.submissionMode === 'manual_link', app && app.packetLink)

const interview = await call('PATCH', `/ops/ats-applications/${app.id}/status`, { status: 'interview', verifiedVia: 'ats' })
ok('interview status synced', interview.body.status === 'interview')

const badStart = await call('PATCH', `/ops/ats-applications/${app.id}/status`, { status: 'started', verifiedVia: 'ats' })
ok('bare ATS start rejected (409)', badStart.status === 409, badStart.body.error?.slice(0, 64))
const goodStart = await call('PATCH', `/ops/ats-applications/${app.id}/status`, { status: 'started', verifiedVia: 'employer_attestation' })
ok('attested start accepted', goodStart.body.status === 'started')

const ledger = (await call('GET', '/ops/dashboards/production-ledger')).body
ok('production ledger reflects start', ledger.funnel.find((f: any) => f.stage === 'started').candidates >= 1)

console.log(process.exitCode ? '\nSMOKE FAILED' : '\nSMOKE PASSED — auth, jobs in, Florence nurse out, status both ways.')
