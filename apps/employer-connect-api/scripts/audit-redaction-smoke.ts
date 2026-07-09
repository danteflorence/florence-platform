import { audit, store } from '../server/db'

let pass = 0
let fail = 0
const ok = (label: string, condition: boolean, detail?: string) => {
  console.log(`${condition ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
  condition ? (pass += 1) : (fail += 1)
}

audit(
  'ops',
  'longtail_outreach_drafted',
  'employer',
  'Kaiser Northern California',
  'email=nurse@example.test;claimUrl=https://app.florenceedu.com/claim/claim_secret_123;passport=P1234567;status=ready',
)
audit(
  'connector',
  'webhook_status',
  'application',
  'app_audit_redaction',
  'provider=workday;candidate=cand_sensitive_123;status=started',
)

await new Promise((resolve) => setTimeout(resolve, 80))

const rows = await store.audit.recent(20)
const employerAudit = rows.find((row) => row.action === 'longtail_outreach_drafted')
const webhookAudit = rows.find((row) => row.action === 'webhook.received' && row.entityId === 'app_audit_redaction')

ok('audit: employer free-text entity id is converted to an opaque key', !!employerAudit?.entityId.startsWith('employer_'), employerAudit?.entityId)
ok('audit: raw partner name is absent', !JSON.stringify(employerAudit).includes('Kaiser Northern California'))
ok('audit: raw email is absent', !/nurse@example\.test/i.test(JSON.stringify(employerAudit)))
ok('audit: raw URL is absent', !/https:\/\/app\.florenceedu\.com\/claim/i.test(JSON.stringify(employerAudit)))
ok('audit: raw passport-like value is absent', !/P1234567/.test(JSON.stringify(employerAudit)))
ok('audit: webhook legacy action maps to canonical action', !!webhookAudit)
ok('audit: sensitive candidate detail value is redacted', !/cand_sensitive_123/.test(JSON.stringify(webhookAudit)))

console.log(`\n${fail ? 'AUDIT REDACTION SMOKE FAILED' : 'AUDIT REDACTION SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
