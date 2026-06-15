// CSV/SFTP bridge smoke: partner "jobs in" parses + validates (bad rows flagged), and
// "status out" exports IDs + status ONLY (no candidate PII). Pure — runs without a DB.
import { importPartnerJobsCsv, toApplicationStatusCsv } from '../server/csvBridge'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }

// jobs in
const csv = [
  'external_req_id,title,city,state,required_license_state,setting,pay_min,pay_max',
  'REQ-1,Registered Nurse,Reno,NV,NV,hospital,42,55',
  'REQ-2,RN Med/Surg,Dallas,TX,TX,hospital,,',
  ',Missing ID,Austin,TX,TX,,,', // invalid — no external_req_id
].join('\n')
const imp = importPartnerJobsCsv(csv)
ok('jobs-in: 2 valid rows parsed', imp.valid.length === 2 && imp.valid[0].externalReqId === 'REQ-1' && imp.valid[0].requiredLicenseState === 'NV')
ok('jobs-in: listed pay parsed when present', imp.valid[0].payMin === 42 && imp.valid[0].payMax === 55)
ok('jobs-in: invalid row (no external_req_id) flagged, not imported', imp.errors.length === 1 && imp.valid.every((r) => r.title !== 'Missing ID'))

// status out
const out = toApplicationStatusCsv([
  { externalReqId: 'REQ-1', applicationId: 'app_abc', stage: 'started', status: 'started', updatedAt: '2026-06-15' },
  { externalReqId: 'REQ-2', applicationId: 'app_def', stage: 'interview_scheduled', status: 'interview', updatedAt: '2026-06-15' },
])
ok('status-out: header + one line per application', out.split('\n').filter(Boolean).length === 3 && out.startsWith('external_req_id,application_id,stage,status,updated_at'))
ok('status-out: contains NO candidate PII (no name/email/visa)', !/@|visa|nationality|"name"|first_name|last_name/i.test(out))

console.log(`\n${fail ? 'CSV BRIDGE SMOKE FAILED' : 'CSV BRIDGE SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
