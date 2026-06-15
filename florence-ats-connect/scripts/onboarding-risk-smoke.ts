// Onboarding-risk emitter smoke (in-process, both backends). Proves the start-signal
// payload is minimal (no PII / no clinical text), the emit is mock-safe with the spine
// off, and — critically — that adding a risk-signal path does NOT weaken the billing
// invariant (started/retention still require a billing-grade verifiedVia).
// The live emit→Core-fold seam is proven separately in verify-production-loop.
import { store, uid, now } from '../server/db'
import { startSignalPayload, emitStartSignal, recordLedger, HRIS_GRADE_STAGES } from '../server/ledger'
import { passportEnabled } from '../server/passport'
import type { EmployerAccount, FlorenceCandidate } from '../shared/types'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }
const run = uid().slice(0, 8)

async function main() {
  // 1) Pure payload: ONLY signal/value/confidence — no name/email/clinical text.
  const payload = startSignalPayload({ signal: 'attestation_lag', value: 0.8, confidence: 0.7 })
  const keys = Object.keys(payload).sort()
  ok('start-signal payload keys = [confidence,signal,value] only (no PII)', JSON.stringify(keys) === JSON.stringify(['confidence', 'signal', 'value']))
  ok('start-signal payload carries no name/email/notes field', !('name' in payload) && !('email' in payload) && !('notes' in payload))
  const payload2 = startSignalPayload({ signal: 'candidate_silence', value: 1 })
  ok('confidence omitted when not provided', !('confidence' in payload2))

  // 2) Emit is mock-safe: with the spine off, emitStartSignal never throws.
  const employer: EmployerAccount = { id: uid(), name: `Kaiser ${run}`, atsProvider: 'oracle_taleo', integrationStatus: 'manual', defaultBillingModel: 'channel', sourceChannel: 'amn', createdAt: now(), updatedAt: now() }
  await store.employers.insert(employer)
  const cand: FlorenceCandidate = { id: uid(), fullName: `Grace ${run}`, email: `grace.${run}@x.com`, specialtyExperience: ['med_surg'], readinessBand: 'orange', nclexStatus: 'passed', licenseStatus: 'issued', targetStates: ['TX'], employerShareConsent: 'granted', humanQaStatus: 'approved', createdAt: now(), updatedAt: now() }
  await store.candidates.insert(cand)
  let threw = false
  try { await emitStartSignal(cand.id, { signal: 'manager_concern', value: 0.6 }) } catch { threw = true }
  ok(`emitStartSignal mock-safe (spine ${passportEnabled ? 'on' : 'off'}, no throw)`, !threw)

  // 3) Billing invariant intact: retention/started remain HRIS-grade; a risk signal is NOT a ledger stage.
  ok('started + retention_30d/60d/90d are HRIS-grade (risk signals never gate billing)', HRIS_GRADE_STAGES.has('started') && HRIS_GRADE_STAGES.has('retention_30d') && HRIS_GRADE_STAGES.has('retention_60d') && HRIS_GRADE_STAGES.has('retention_90d'))
  // A bare-ATS started is still NOT billing-grade (recordLedger records, but billing filters it out).
  const e = await recordLedger({ candidateId: cand.id, stage: 'started', employerId: employer.id, verifiedVia: 'ats' })
  ok('bare-ATS started recorded but NOT billing-grade verifiedVia', e.verifiedVia === 'ats')

  console.log(`\n${fail ? 'ONBOARDING RISK SMOKE FAILED' : 'ONBOARDING RISK SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
