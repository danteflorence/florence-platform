// Inbound ATS webhook security smoke (H04).
// Part 1 — pure signature checks (timestamped HMAC over the raw body).
// Part 2 — the LIVE route posture over real HTTP: a valid delivery applies once,
// a byte-identical replay hits the durable idempotency cache (original response,
// no re-apply), and a burst past the per-provider rate limit ⇒ 429. Audited.
// NOTE: static imports hoist above env assignments, so the route's module-scope
// rate-limit constant keeps its default (120/min) — the burst below simply exceeds
// it. ATS_WEBHOOK_SECRET works via env because the route reads it per-request.
process.env.ATS_WEBHOOK_SECRET = 'synthetic_webhook_secret_for_smoke'
import express from 'express'
import { api, signAtsWebhookPayload, verifyAtsWebhookSignature } from '../server/routes'
import { store, uid, now as nowIso } from '../server/db'
import type { ATSApplication } from '../shared/types'

let pass = 0
let fail = 0
const ok = (label: string, condition: boolean, detail?: string) => {
  console.log(`${condition ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
  condition ? (pass += 1) : (fail += 1)
}

const secret = 'synthetic_webhook_secret_for_smoke'
const now = Date.UTC(2026, 5, 25, 12, 0, 0)
const body = Buffer.from(JSON.stringify({ atsApplicationId: 'app_synthetic_1', status: 'interview' }))
const validHeader = signAtsWebhookPayload(body, secret, now)

ok('webhook: valid timestamped HMAC signature passes', verifyAtsWebhookSignature({ rawBody: body, secret, signatureHeader: validHeader, nowMs: now }).ok)
ok('webhook: mismatched body fails', !verifyAtsWebhookSignature({ rawBody: Buffer.from('{"changed":true}'), secret, signatureHeader: validHeader, nowMs: now }).ok)
ok('webhook: stale signature fails replay window', !verifyAtsWebhookSignature({ rawBody: body, secret, signatureHeader: validHeader, nowMs: now + 10 * 60 * 1000 }).ok)
ok('webhook: missing signature fails closed', !verifyAtsWebhookSignature({ rawBody: body, secret, nowMs: now }).ok)
ok('webhook: missing configured secret fails closed', !verifyAtsWebhookSignature({ rawBody: body, secret: undefined, signatureHeader: validHeader, nowMs: now }).ok)
ok('webhook: legacy shared-secret-only header is not accepted', !verifyAtsWebhookSignature({ rawBody: body, secret, signatureHeader: 'dev-webhook-secret', nowMs: now }).ok)

async function main() {
  // ── live route: idempotent replay + rate limit ─────────────────────────────
  const extId = `ext-${uid().slice(0, 8)}`
  const app: ATSApplication = {
    id: uid(), candidateId: `cand-${uid().slice(0, 6)}`, jobRequisitionId: `req-${uid().slice(0, 6)}`,
    employerId: `emp-${uid().slice(0, 6)}`, atsProvider: 'greenhouse', atsApplicationId: extId,
    status: 'submitted', createdAt: nowIso(), updatedAt: nowIso(),
  } as unknown as ATSApplication
  await store.atsApplications.insert(app)

  const server = express().use(express.json({
    verify: (req, _res, buf) => { (req as { rawBody?: Buffer }).rawBody = Buffer.from(buf) },
  })).use('/api', api).listen(0, '127.0.0.1')
  await new Promise<void>((r) => server.on('listening', () => r()))
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`

  const payload = Buffer.from(JSON.stringify({ atsApplicationId: extId, status: 'interview' }))
  const header = signAtsWebhookPayload(payload, secret, Date.now())
  const deliver = () => fetch(`${base}/api/webhooks/ats/greenhouse`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-florence-signature': header }, body: payload,
  })

  const first = await deliver()
  const firstBody = await first.json() as { applied?: boolean }
  ok('live: valid signed delivery ⇒ 200 + applied', first.status === 200 && firstBody.applied === true)
  const afterFirst = await store.atsApplications.get(app.id)
  ok('live: status mutated once', afterFirst?.status === 'interview')
  const syncCountAfterFirst = (await store.sync.all()).filter((s) => s.entityId === app.id).length

  const replay = await deliver()
  ok('live: byte-identical REPLAY ⇒ original response from the durable cache', replay.status === 200)
  const syncCountAfterReplay = (await store.sync.all()).filter((s) => s.entityId === app.id).length
  ok('live: replay did NOT re-apply (no second sync/ledger write)', syncCountAfterReplay === syncCountAfterFirst)

  const badSig = await fetch(`${base}/api/webhooks/ats/greenhouse`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-florence-signature': 't=1,v1=deadbeef' }, body: payload,
  })
  ok('live: bad signature ⇒ 401', badSig.status === 401)

  // Rate limit: burst past the default 120/min ⇒ 429 (replays are cheap — they
  // hit the idempotency cache — but they still count against the limiter).
  let limited = false
  for (let i = 0; i < 130; i++) {
    const r = await deliver()
    if (r.status === 429) { limited = true; break }
  }
  ok('live: burst past the per-provider rate limit ⇒ 429', limited)

  server.close()
  console.log(`\n${fail ? 'WEBHOOK SIGNATURE SMOKE FAILED' : 'WEBHOOK SIGNATURE SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
