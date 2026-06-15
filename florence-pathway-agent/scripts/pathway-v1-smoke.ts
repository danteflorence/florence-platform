// Pathway /v1 capability module smoke — proves the scoped read surface over REAL
// HTTP behind a self-minted RS256 token (throwaway in-process JWKS, no Core needed).
// Asserts: public OpenAPI 3.1; staff/self auth (no token ⇒ 401; wrong candidate ⇒
// 403; staff any ⇒ ok); status/tasks/readiness over the existing handlers; visa
// outcome surfaced to staff/self only (there is NO employer audience here).
import { createServer } from 'node:http'
import { generateKeyPairSync, createSign } from 'node:crypto'
import express from 'express'
import { store, uid } from '../server/db'
import { configureCoreAuth } from '../server/coreAuth'
import { apiV1 } from '../server/api/v1'
import type { CandidateProfile, WorkflowInstance } from '../shared/types'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }
const run = uid().slice(0, 8)
const nowIso = () => new Date().toISOString()

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const kid = `test-${run}`
const jwk = { ...(publicKey.export({ format: 'jwk' }) as Record<string, unknown>), kid, use: 'sig', alg: 'RS256' }
const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
function mint(claims: Record<string, unknown>): string {
  const header = { alg: 'RS256', typ: 'JWT', kid }
  const t = Math.floor(Date.now() / 1000)
  const payload = { iss: 'florence-auth', aud: 'florence', sub: `u-${uid().slice(0, 6)}`, iat: t, exp: t + 3600, ...claims }
  const input = `${b64url(header)}.${b64url(payload)}`
  return `${input}.${createSign('RSA-SHA256').update(input).end().sign(privateKey).toString('base64url')}`
}

async function main() {
  // Seed ONE candidate + a visa workflow with an attested outcome.
  const candId = `cand-${run}`
  const profile = {
    id: candId, legalFirstName: 'Test', legalLastName: 'RN', aliases: [], dateOfBirth: '1990-01-01',
    citizenship: 'NG', nationality: 'NG', countryOfResidence: 'NG', email: `t.${run}@x.dev`,
    arrivalStatus: 'abroad', createdAt: nowIso(), updatedAt: nowIso(),
  } as unknown as CandidateProfile
  store.candidates.insert(profile)
  const wf = { id: `wf-${run}`, candidateId: candId, type: 'ds160', title: 'DS-160', status: 'in_progress', steps: [], visaOutcome: 'approved', createdAt: nowIso(), updatedAt: nowIso() } as unknown as WorkflowInstance
  store.workflows.insert(wf)

  // JWKS server + coreAuth config.
  const jwks = createServer((req, res) => {
    if (req.url?.startsWith('/.well-known/jwks.json')) { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ keys: [jwk] })) }
    else { res.statusCode = 404; res.end('{}') }
  })
  await new Promise<void>((r) => jwks.listen(0, '127.0.0.1', () => r()))
  const jp = (jwks.address() as { port: number }).port
  configureCoreAuth({ issuerUrl: `http://127.0.0.1:${jp}`, issuer: 'florence-auth', audience: 'florence' })

  const app = express()
  app.use(express.json())
  app.use('/v1', apiV1)
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>((r) => server.on('listening', () => r()))
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`

  const staff = mint({ role: 'ops', roles: ['ops'], email: `ops.${run}@florence.dev` })
  const selfTok = mint({ role: 'candidate', roles: ['candidate'], cand: candId })
  const otherTok = mint({ role: 'candidate', roles: ['candidate'], cand: 'someone-else' })
  const call = async (path: string, token?: string) => {
    const r = await fetch(`${base}${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} })
    const t = await r.text(); return { status: r.status, body: t ? JSON.parse(t) : null }
  }

  // Contract + auth.
  const oa = await call('/v1/openapi.json')
  ok('openapi.json public + 3.1 + pathway paths', oa.status === 200 && oa.body.openapi === '3.1.0' && !!oa.body.paths?.['/pathway/{id}/status'])
  ok('no token ⇒ 401', (await call(`/v1/pathway/${candId}/status`)).status === 401)
  ok('candidate token for a DIFFERENT candidate ⇒ 403', (await call(`/v1/pathway/${candId}/status`, otherTok)).status === 403)
  ok('staff token, unknown candidate ⇒ 404', (await call('/v1/pathway/does-not-exist/status', staff)).status === 404)

  // Status (staff + self).
  const st = await call(`/v1/pathway/${candId}/status`, staff)
  ok('staff status ⇒ 200 + workflow listed', st.status === 200 && Array.isArray(st.body.workflows) && st.body.workflows.some((w: { id: string }) => w.id === wf.id))
  ok('status surfaces visaOutcome to staff (internal-only; no employer audience here)', st.body.workflows.some((w: { visaOutcome?: string }) => w.visaOutcome === 'approved'))
  const stSelf = await call(`/v1/pathway/${candId}/status`, selfTok)
  ok('candidate-self status ⇒ 200', stSelf.status === 200)

  // Tasks + readiness.
  const tasks = await call(`/v1/pathway/${candId}/tasks`, staff)
  ok('tasks ⇒ 200 + array', tasks.status === 200 && Array.isArray(tasks.body.tasks))
  const rd = await call(`/v1/pathway/${candId}/readiness`, staff)
  ok('readiness ⇒ 200 + decision (shadow/allowed when spine off)', rd.status === 200 && typeof rd.body.allowed === 'boolean')

  server.close(); jwks.close()
  console.log(`\n${fail ? 'PATHWAY V1 SMOKE FAILED' : 'PATHWAY V1 SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
