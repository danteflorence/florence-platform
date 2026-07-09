import { audit, store } from '../server/db'

let pass = 0
let fail = 0
const ok = (label: string, condition: boolean, detail?: string) => {
  console.log(`${condition ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
  condition ? (pass += 1) : (fail += 1)
}

await audit('candidate', 'ds160_confirmation_recorded', 'workflow', 'wf_audit_ds160', 'cand_audit_1', 'AA0099887766')
await audit('candidate', 'nclex_registered', 'workflow', 'wf_audit_nclex', 'cand_audit_1', 'Jane Example')
await audit('candidate', 'visa_appointment_scheduled', 'workflow', 'wf_audit_visa', 'cand_audit_1', 'Manila 2026-08-01')

const rows = await store.audit.recent(20)
const serialized = JSON.stringify(rows)

ok('audit: DS-160 confirmation value is absent', !/AA0099887766/.test(serialized))
ok('audit: candidate name detail is absent', !/Jane Example/.test(serialized))
ok('audit: appointment free text is absent', !/Manila 2026-08-01/.test(serialized))
ok('audit: DS-160 action is canonicalized', rows.some((row) => row.action === 'immigration.ds160_confirmation.recorded'))
ok('audit: redacted detail marker is retained for audit completeness', rows.some((row) => row.detail === 'detail=[REDACTED]'))

console.log(`\n${fail ? 'PATHWAY AUDIT REDACTION SMOKE FAILED' : 'PATHWAY AUDIT REDACTION SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
