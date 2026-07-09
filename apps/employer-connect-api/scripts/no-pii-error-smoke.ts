import { internalErrorBody, logInternalError } from '../server/safeErrors'

let pass = 0
let fail = 0
const ok = (label: string, condition: boolean, detail?: string) => {
  console.log(`${condition ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
  condition ? (pass += 1) : (fail += 1)
}

const entries: unknown[] = []
const originalError = console.error
console.error = (...args: unknown[]) => { entries.push(args) }

const eventId = logInternalError(
  '[test error]',
  new Error('passport=P1234567 email=nurse@example.test signedUrl=https://app.florenceedu.com/vault?token=secret'),
)
const body = internalErrorBody(eventId)

console.error = originalError

const serializedLog = JSON.stringify(entries)
const serializedBody = JSON.stringify(body)

ok('errors: response uses generic error code', body.error === 'internal_server_error')
ok('errors: response includes opaque event id', /^err_[a-f0-9]{16}$/.test(body.eventId))
ok('errors: log omits raw passport-like value', !/P1234567/.test(serializedLog))
ok('errors: log omits raw email', !/nurse@example\.test/i.test(serializedLog))
ok('errors: log omits raw URL/token', !/https:\/\/app\.florenceedu\.com|secret/i.test(serializedLog))
ok('errors: response body omits raw sensitive values', !/P1234567|nurse@example\.test|token=secret/i.test(serializedBody))

console.log(`\n${fail ? 'NO-PII ERROR SMOKE FAILED' : 'NO-PII ERROR SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
