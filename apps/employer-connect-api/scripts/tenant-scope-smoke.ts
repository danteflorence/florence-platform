// ============================================================================
// Employer Connect tenant-scope smoke (C03 regression).
// Boots the real Express `api` router behind a throwaway in-process RS256/JWKS
// (stands in for Core) and proves the deny-by-default tenant gate:
//   • an employer token reaches ONLY the allowlisted, tenant-scoped GET routes;
//     every other /ops path (and any non-existent one) is 403 — fail-closed.
//   • the /ledger BOLA is closed: an employer is hard-scoped to its own tenant
//     regardless of caller-supplied employerId/candidateId filters.
//   • ops keeps full cross-tenant access.
// Runs on sqlite AND ATS_DB=postgres. Mock-by-default; synthetic data only.
// ============================================================================
import { createServer } from 'node:http'
import { generateKeyPairSync, createSign } from 'node:crypto'
import express from 'express'
import { store, uid, now } from '../server/db'
import { configureCoreAuth } from '../server/coreAuth'
import { api } from '../server/routes'
import type { EmployerAccount, JobRequisition, ProductionLedgerEvent } from '../shared/types'

let pass = 0, fail = 0
const ok = (label: string, condition: boolean, extra?: string) => {
  console.log(`${condition ? '✓' : '✗'} ${label}${extra ? ` — ${extra}` : ''}`)
  condition ? (pass += 1) : (fail += 1)
}

const run = uid().slice(0, 8)
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

const mkEmployer = (id: string, name: string): EmployerAccount => ({
  id, name, atsProvider: 'manual', integrationStatus: 'manual',
  defaultBillingModel: 'direct', sourceChannel: 'direct', createdAt: now(), updatedAt: now(),
})
const mkReq = (employerId: string): JobRequisition => ({
  id: uid(), employerId, atsProvider: 'manual', title: 'Registered Nurse', specialty: 'med_surg',
  setting: 'inpatient', city: 'Reno', state: 'NV', requiredLicenseState: 'NV', status: 'open',
  sourceChannel: 'direct', importedAt: now(), lastSyncedAt: now(),
})
const mkLedger = (employerId: string, candidateId: string): ProductionLedgerEvent => ({
  id: uid(), candidateId, stage: 'matched', sourceType: 'ats_connect', employerId, at: now(),
})

async function main() {
  const jwks = createServer((req, res) => {
    if (req.url?.startsWith('/.well-known/jwks.json')) { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ keys: [jwk] })) }
    else { res.statusCode = 404; res.end('{}') }
  })
  await new Promise<void>((r) => jwks.listen(0, '127.0.0.1', () => r()))
  const jwksPort = (jwks.address() as { port: number }).port
  configureCoreAuth({ issuerUrl: `http://127.0.0.1:${jwksPort}`, issuer: 'florence-auth', audience: 'florence' })

  // Two tenants, distinct org ids. An employer token's org_id == the ATS employerId.
  const empA = `empA-${run}`, empB = `empB-${run}`
  const candA = `candA-${run}`, candB = `candB-${run}`
  await store.employers.insert(mkEmployer(empA, 'Tenant A Health'))
  await store.employers.insert(mkEmployer(empB, 'Tenant B Health'))
  const reqA = mkReq(empA); const reqB = mkReq(empB)
  await store.requisitions.insert(reqA)
  await store.requisitions.insert(reqB)
  await store.ledger.insert(mkLedger(empA, candA))
  await store.ledger.insert(mkLedger(empA, candA))
  await store.ledger.insert(mkLedger(empB, candB))
  await store.ledger.insert(mkLedger(empB, candB))

  const opsToken = mintToken({ role: 'ops', name: 'Ops', email: `ops.${run}@florence.dev` })
  const empAToken = mintToken({ role: 'employer', org_id: empA, email: `a.${run}@partner.dev` })

  const app = express()
  app.use(express.json())
  app.use('/api', api)
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>((r) => server.on('listening', () => r()))
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`

  const call = async (token: string, path: string, method = 'GET') => {
    const r = await fetch(`${base}/api${path}`, {
      method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: method === 'GET' ? undefined : '{}',
    })
    const text = await r.text()
    let body: unknown = null
    try { body = text ? JSON.parse(text) : null } catch { body = text } // 404s render Express' HTML body
    return { status: r.status, body }
  }
  const rows = (b: unknown): ProductionLedgerEvent[] => Array.isArray(b) ? b as ProductionLedgerEvent[] : []

  // ── Allowlisted employer GETs work and are tenant-scoped ──────────────────
  const reqs = await call(empAToken, '/ops/requisitions')
  ok('employer GET /ops/requisitions ⇒ 200, only own tenant', reqs.status === 200
    && (reqs.body as JobRequisition[]).length >= 1
    && (reqs.body as JobRequisition[]).every((r) => r.employerId === empA))

  const emps = await call(empAToken, '/ops/employers')
  ok('employer GET /ops/employers ⇒ only own employer visible', emps.status === 200
    && (emps.body as EmployerAccount[]).every((e) => e.id === empA))

  // ── /ledger BOLA closed ───────────────────────────────────────────────────
  const led = await call(empAToken, '/ledger')
  ok('employer GET /ledger ⇒ ONLY own-tenant events (was store.ledger.all())',
    led.status === 200 && rows(led.body).length === 2 && rows(led.body).every((e) => e.employerId === empA))

  const ledSpoofEmp = await call(empAToken, `/ledger?employerId=${empB}`)
  ok('employer GET /ledger?employerId=<other> ⇒ caller-supplied employerId cannot widen the read',
    ledSpoofEmp.status === 200 && rows(ledSpoofEmp.body).length === 2 && rows(ledSpoofEmp.body).every((e) => e.employerId === empA))

  const ledSpoofCand = await call(empAToken, `/ledger?candidateId=${candB}`)
  ok('employer GET /ledger?candidateId=<other-tenant candidate> ⇒ empty (no cross-tenant candidate read)',
    ledSpoofCand.status === 200 && rows(ledSpoofCand.body).length === 0)

  const opsLed = await call(opsToken, '/ledger')
  ok('ops GET /ledger ⇒ full cross-tenant view (both tenants present)',
    opsLed.status === 200 && rows(opsLed.body).some((e) => e.employerId === empA) && rows(opsLed.body).some((e) => e.employerId === empB))

  // ── Deny-by-default posture ───────────────────────────────────────────────
  const denyProbeEmp = await call(empAToken, '/ops/__deny_probe__')
  ok('employer GET a non-allowlisted /ops path ⇒ 403 (deny-by-default, before routing)', denyProbeEmp.status === 403)
  const denyProbeOps = await call(opsToken, '/ops/__deny_probe__')
  ok('ops GET the same non-existent path ⇒ 404 (ops passes the gate; no route)', denyProbeOps.status === 404)

  const dashEmp = await call(empAToken, '/ops/demand/dashboard')
  ok('employer GET an ops-only surface (/ops/demand/dashboard) ⇒ 403', dashEmp.status === 403)

  const writeEmp = await call(empAToken, '/ops/employers', 'POST')
  ok('employer POST /ops/employers ⇒ 403 (read-only)', writeEmp.status === 403)

  server.close(); jwks.close()
  console.log(`\n${pass} passed, ${fail} failed`)
  if (fail > 0) process.exit(1)
}

main().catch((err) => { console.error(err); process.exit(1) })
