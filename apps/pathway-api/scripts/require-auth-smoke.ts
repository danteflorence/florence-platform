// C01 flip-on regression — the PATHWAY_REQUIRE_AUTH=1 posture over REAL HTTP.
// Proves that once candidate sign-in exists and the switch flips ON:
//   • anonymous access to EVERY candidate-data surface is 401 (dossier, workflow,
//     the cross-candidate list, body-bound workflow creation)
//   • a signed-in candidate reaches ONLY their own records (own 200, other 403,
//     body-spoofed workflow create 403)
//   • staff keep full access; health stays public; INTAKE (signup) stays open so a
//     new candidate can register before they can sign in.
// The switch is read at module load, so env is set BEFORE the dynamic imports.
process.env.PATHWAY_REQUIRE_AUTH = '1'

import { createServer } from 'node:http'
import { generateKeyPairSync, createSign } from 'node:crypto'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const kid = 'test-require-auth'
const jwk = { ...(publicKey.export({ format: 'jwk' }) as Record<string, unknown>), kid, use: 'sig', alg: 'RS256' }
const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
function mint(claims: Record<string, unknown>): string {
  const header = { alg: 'RS256', typ: 'JWT', kid }
  const t = Math.floor(Date.now() / 1000)
  const payload = { iss: 'florence-auth', aud: 'florence', sub: 'u-test', iat: t, exp: t + 3600, ...claims }
  const input = `${b64url(header)}.${b64url(payload)}`
  return `${input}.${createSign('RSA-SHA256').update(input).end().sign(privateKey).toString('base64url')}`
}

async function main() {
  // Dynamic imports AFTER the env flip so REQUIRE_AUTH captures '1'.
  const { store, uid, now } = await import('../server/db')
  const { configureCoreAuth } = await import('../server/coreAuth')
  const { api } = await import('../server/routes')
  const { default: express } = await import('express')

  const nowIso = () => new Date().toISOString()
  const candA = `cand-a-${uid().slice(0, 6)}`, candB = `cand-b-${uid().slice(0, 6)}`
  const mkCand = (id: string) => ({
    id, aliases: [], legalFirstName: 'Test', legalLastName: 'RN', dateOfBirth: '1990-01-01',
    citizenship: 'PH', nationality: 'PH', countryOfResidence: 'PH', email: `${id}@x.dev`,
    createdAt: nowIso(), updatedAt: nowIso(),
  }) as any
  await store.candidates.insert(mkCand(candA))
  await store.candidates.insert(mkCand(candB))
  const wfA = { id: `wf-${uid().slice(0, 6)}`, candidateId: candA, type: 'ds160', title: 'DS-160', status: 'in_progress', steps: [], createdAt: now(), updatedAt: now() } as any
  await store.workflows.insert(wfA)

  const jwks = createServer((req, res) => {
    if (req.url?.startsWith('/.well-known/jwks.json')) { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ keys: [jwk] })) }
    else { res.statusCode = 404; res.end('{}') }
  })
  await new Promise<void>((r) => jwks.listen(0, '127.0.0.1', () => r()))
  configureCoreAuth({ issuerUrl: `http://127.0.0.1:${(jwks.address() as { port: number }).port}`, issuer: 'florence-auth', audience: 'florence' })

  const app = express()
  app.use(express.json())
  app.use('/api', api)
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>((r) => server.on('listening', () => r()))
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`

  const selfTok = mint({ role: 'candidate', roles: ['candidate'], cand: candA, email: `${candA}@x.dev` })
  const staffTok = mint({ role: 'ops', roles: ['ops'], email: 'ops@florence.dev' })
  const call = async (method: string, path: string, token?: string, body?: unknown) => {
    const r = await fetch(`${base}/api${path}`, {
      method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const t = await r.text(); let parsed: unknown = null
    try { parsed = t ? JSON.parse(t) : null } catch { parsed = t }
    return { status: r.status, body: parsed as any }
  }

  // ── anonymous: every candidate-data surface fails closed ────────────────────
  ok('anon GET /candidates/:id ⇒ 401', (await call('GET', `/candidates/${candA}`)).status === 401)
  ok('anon GET /candidates/:id/view ⇒ 401', (await call('GET', `/candidates/${candA}/view`)).status === 401)
  ok('anon GET /workflows/:id ⇒ 401', (await call('GET', `/workflows/${wfA.id}`)).status === 401)
  ok('anon GET /candidates (cross-candidate list) ⇒ 401', (await call('GET', '/candidates')).status === 401)
  ok('anon POST /workflows ⇒ 401', (await call('POST', '/workflows', undefined, { candidateId: candA, type: 'ds160' })).status === 401)
  ok('anon POST /deficiencies/:id/resolve ⇒ 401', (await call('POST', '/deficiencies/whatever/resolve')).status === 401)
  ok('health stays public ⇒ 200', (await call('GET', '/health')).status === 200)

  // ── intake (signup) deliberately stays open ─────────────────────────────────
  const signup = await call('POST', '/candidates', undefined, {
    legalFirstName: 'New', legalLastName: 'Nurse', dateOfBirth: '1992-02-02',
    citizenship: 'NG', nationality: 'NG', countryOfResidence: 'NG', email: `new.${uid().slice(0, 6)}@x.dev`,
  })
  ok('anon POST /candidates (INTAKE/signup) stays open ⇒ 200', signup.status === 200 && typeof signup.body.id === 'string')

  // ── a signed-in candidate reaches only their own records ────────────────────
  ok('candidate GET own /candidates/:id ⇒ 200', (await call('GET', `/candidates/${candA}`, selfTok)).status === 200)
  ok('candidate GET ANOTHER candidate ⇒ 403', (await call('GET', `/candidates/${candB}`, selfTok)).status === 403)
  ok('candidate GET own /workflows/:id ⇒ 200', (await call('GET', `/workflows/${wfA.id}`, selfTok)).status === 200)
  ok('candidate GET /candidates (list) ⇒ 403 (staff only)', (await call('GET', '/candidates', selfTok)).status === 403)
  ok('candidate POST /workflows for ANOTHER candidate ⇒ 403 (body binding)', (await call('POST', '/workflows', selfTok, { candidateId: candB, type: 'ds160' })).status === 403)

  // ── staff keep full access ──────────────────────────────────────────────────
  ok('staff GET /candidates ⇒ 200', (await call('GET', '/candidates', staffTok)).status === 200)
  ok('staff GET any candidate ⇒ 200', (await call('GET', `/candidates/${candB}`, staffTok)).status === 200)

  server.close(); jwks.close()
  console.log(`\n${fail ? 'REQUIRE-AUTH SMOKE FAILED' : 'REQUIRE-AUTH SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
