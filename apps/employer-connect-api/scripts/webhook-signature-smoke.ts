import { signAtsWebhookPayload, verifyAtsWebhookSignature } from '../server/routes'

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

console.log(`\n${fail ? 'WEBHOOK SIGNATURE SMOKE FAILED' : 'WEBHOOK SIGNATURE SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
