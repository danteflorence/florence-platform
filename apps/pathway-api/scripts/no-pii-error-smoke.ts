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
  new Error('DS-160 confirmation AA0099887766 for Jane Example at Manila 2026-08-01'),
)
const body = internalErrorBody(eventId)

console.error = originalError

const serializedLog = JSON.stringify(entries)
const serializedBody = JSON.stringify(body)

ok('errors: response uses generic error code', body.error === 'internal_server_error')
ok('errors: response includes opaque event id', /^err_[a-f0-9]{16}$/.test(body.eventId))
ok('errors: log omits DS-160 value', !/AA0099887766/.test(serializedLog))
ok('errors: log omits candidate name', !/Jane Example/.test(serializedLog))
ok('errors: log omits appointment free text', !/Manila 2026-08-01/.test(serializedLog))
ok('errors: response body omits raw sensitive values', !/AA0099887766|Jane Example|Manila 2026-08-01/i.test(serializedBody))

console.log(`\n${fail ? 'NO-PII ERROR SMOKE FAILED' : 'NO-PII ERROR SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
