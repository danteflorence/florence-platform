// Program Workspace proof: a Kaiser-like 200-RN program → licensed slate (only
// licensed+consented; CA nurse excluded for a TX req) → redacted packet → lock wave
// → ledger stages → wave tracker + invoice rollup (gross = starts × fee, FICA
// customer-side only; bare-ATS start excluded). Run-scoped names; both backends.
import { store, uid, now } from '../server/db'
import { generateLicensedSlate, buildSlatePackets, lockSlate } from '../server/program/slate'
import { rollupProgramInvoices } from '../server/program/billing'
import { waveTracker } from '../server/program/workspace'
import { recordLedger, HRIS_GRADE_STAGES } from '../server/ledger'
import { mockHrisProvider } from '../server/hris'
import type { EmployerAccount, EmployerShareConsent, FlorenceCandidate, JobRequisition, Program } from '../shared/types'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }
const run = uid().slice(0, 8)

// Run-scoped license states so the slate is deterministic regardless of candidates
// accumulated by prior runs on the same sqlite file (ready_to_submit keys off the
// candidate's employerShareConsent field, so a plain 'TX' would also match old rows).
const TXSTATE = `TX_${run}`
const CASTATE = `CA_${run}`

const cand = (name: string, o: Partial<FlorenceCandidate>): FlorenceCandidate => ({
  id: uid(), fullName: `${name} ${run}`, specialtyExperience: ['med_surg'], yearsExperience: 4,
  readinessBand: 'green', nclexStatus: 'passed', licenseStatus: 'issued', visaStatus: 'approved', targetStates: [TXSTATE],
  expectedStartWindow: '2027-Q1', employerShareConsent: 'granted', humanQaStatus: 'approved',
  createdAt: now(), updatedAt: now(), ...o,
})
const grantConsent = async (candidateId: string, employerId: string) => {
  const c: EmployerShareConsent = { id: uid(), candidateId, employerId, purpose: 'employer review', allowedData: ['resume', 'readiness_summary'], consentTextVersion: 'v1', consentTextHash: 'h', grantedAt: now() }
  await store.consents.insert(c)
}

async function main() {
  // Employer + a TX open requisition (the load-bearing state constraint).
  const employer: EmployerAccount = { id: uid(), name: `Kaiser ${run}`, atsProvider: 'oracle_taleo', integrationStatus: 'manual', defaultBillingModel: 'channel', sourceChannel: 'amn', createdAt: now(), updatedAt: now() }
  await store.employers.insert(employer)
  const req: JobRequisition = { id: uid(), employerId: employer.id, atsProvider: 'oracle_taleo', title: 'RN - Med Surg', setting: 'inpatient', state: TXSTATE, requiredLicenseState: TXSTATE, status: 'open', sourceChannel: 'amn', importedAt: now(), lastSyncedAt: now() }
  await store.requisitions.insert(req)

  // Candidates: licensed+consented (TX); licensed-no-consent (TX); CA nurse (wrong state); pathway (not passed).
  const cLicensed = cand('Licensed Consented', {})
  const cNoConsent = cand('Licensed NoConsent', { employerShareConsent: 'not_requested' })
  const cCA = cand('CA Nurse', { targetStates: [CASTATE] })
  const cPathway = cand('Pathway', { nclexStatus: 'not_started', licenseStatus: 'not_started', readinessBand: 'orange' })
  for (const c of [cLicensed, cNoConsent, cCA, cPathway]) await store.candidates.insert(c)
  await grantConsent(cLicensed.id, employer.id)
  await grantConsent(cCA.id, employer.id) // consented, but wrong state → still excluded

  // Program + waves.
  const program: Program = { id: uid(), employerId: employer.id, name: `Kaiser 200-RN ${run}`, targetCount: 200, waveStructure: [50, 50, 100], status: 'active', channel: 'amn', createdAt: now(), updatedAt: now() }
  await store.programs.insert(program)
  for (let i = 0; i < program.waveStructure.length; i++) await store.programWaves.insert({ id: uid(), programId: program.id, waveNumber: i + 1, targetCount: program.waveStructure[i]!, status: 'planned', createdAt: now() })
  const waves = await store.programWaves.byProgram(program.id)

  // 1) Licensed slate
  const slate = await generateLicensedSlate(program.id)
  const eligIds = slate.eligible.map((e) => e.candidateId)
  ok('eligible = licensed + consented + state-feasible (only 1)', eligIds.length === 1 && eligIds[0] === cLicensed.id, eligIds.join(','))
  ok('CA nurse EXCLUDED for a TX req (per-real-req state gate)', !eligIds.includes(cCA.id))
  ok('pathway (not-passed) excluded', !eligIds.includes(cPathway.id))
  ok('licensed-no-consent surfaced as consentPending', slate.consentPending.some((c) => c.candidateId === cNoConsent.id))

  // 2) Redacted packet
  const built = await buildSlatePackets(program.id, [cLicensed.id])
  const packet = built.packets[0]
  ok('packet built for the licensed+consented candidate', !!packet)
  const withheld = (packet?.withheldFields ?? []).map((w) => w.field)
  ok('packet withholds visa + financing (Kaiser redaction)', withheld.some((f) => /visa/i.test(f)) && withheld.some((f) => /financ/i.test(f)), withheld.join(','))
  ok('shared fields carry NO visa/financing', !Object.keys(packet?.sharedFields ?? {}).some((k) => /visa|financ|national/i.test(k)))

  // 3) Lock wave 1 → freeze + exclude from re-run
  const locked = await lockSlate(program.id, waves[0]!.id, [cLicensed.id])
  ok('slate locked (submittedAt set, candidate frozen)', !!locked.submittedAt && locked.candidateIds.includes(cLicensed.id))
  const slate2 = await generateLicensedSlate(program.id)
  ok('locked candidate no longer in eligible', !slate2.eligible.some((e) => e.candidateId === cLicensed.id))

  // 4) Ledger stages → started (attested) + a CA bare-ATS start that must NOT bill
  await recordLedger({ candidateId: cLicensed.id, stage: 'interview_scheduled', employerId: employer.id })
  await recordLedger({ candidateId: cLicensed.id, stage: 'offer_made', employerId: employer.id })
  await recordLedger({ candidateId: cLicensed.id, stage: 'started', employerId: employer.id, verifiedVia: 'employer_attestation' })
  await recordLedger({ candidateId: cCA.id, stage: 'started', employerId: employer.id, verifiedVia: 'ats' }) // bare ATS → not billable

  const tracker = await waveTracker(program.id)
  ok('wave tracker shows 1 started in wave 1', tracker[0]?.started === 1, JSON.stringify(tracker[0]))

  // 5) Invoice rollup — gross = starts × fee (FICA customer-side only); bare-ATS start excluded
  const inv = await rollupProgramInvoices(program.id)
  ok('invoice counts only the attested start (bare-ATS excluded)', inv.cumulative.verifiedStarts === 1, String(inv.cumulative.verifiedStarts))
  ok('gross = verifiedStarts × fee (no FICA added)', inv.cumulative.grossUsd === inv.cumulative.verifiedStarts * inv.perRnMonthlyFeeUsd, `${inv.cumulative.grossUsd} vs ${inv.cumulative.verifiedStarts}×${inv.perRnMonthlyFeeUsd}`)
  ok('customer effective cost < gross (FICA offset applied customer-side only)', inv.ficaOffsetPerRnUsd > 0 ? inv.cumulative.customerEffectiveCostUsd < inv.cumulative.grossUsd : inv.cumulative.customerEffectiveCostUsd === inv.cumulative.grossUsd)

  // ── 6) Retention tail (Phase 1): record 30/60/90d (attested) for the started RN ──
  await recordLedger({ candidateId: cLicensed.id, stage: 'retention_30d', employerId: employer.id, verifiedVia: 'employer_attestation' })
  await recordLedger({ candidateId: cLicensed.id, stage: 'retention_60d', employerId: employer.id, verifiedVia: 'employer_attestation' })
  await recordLedger({ candidateId: cLicensed.id, stage: 'retention_90d', employerId: employer.id, verifiedVia: 'employer_attestation' })
  const tracker2 = await waveTracker(program.id)
  ok('wave tracker shows retained60 + retained90 in wave 1', tracker2[0]?.retained60 === 1 && tracker2[0]?.retained90 === 1, JSON.stringify(tracker2[0]))

  const inv2 = await rollupProgramInvoices(program.id)
  ok('recurring rollup: recurringRnCount ≥ 1 in the active month', inv2.months.some((m) => m.recurringRnCount >= 1), JSON.stringify(inv2.months))
  ok('recurring rollup: lifetimeBookedUsd === verifiedStarts × fee × 24', inv2.cumulative.lifetimeBookedUsd === inv2.cumulative.verifiedStarts * inv2.perRnMonthlyFeeUsd * 24 && inv2.recurringMonths === 24, String(inv2.cumulative.lifetimeBookedUsd))
  ok('recurring rollup: each month grossUsd === recurringRnCount × fee (no FICA)', inv2.months.every((m) => m.grossUsd === m.recurringRnCount * inv2.perRnMonthlyFeeUsd))
  ok('billing invariant: new retention stages are HRIS-grade (would 409 via bare ATS)', HRIS_GRADE_STAGES.has('retention_60d') && HRIS_GRADE_STAGES.has('term_complete'))
  ok('bare-ATS CA start STILL excluded from billing (verifiedStarts === 1)', inv2.cumulative.verifiedStarts === 1)

  // ── 7) Mock HRIS idempotency (no double-bill) ──────────────────────────────
  const oldApp = { id: uid(), packetId: uid(), candidateId: cLicensed.id, jobRequisitionId: req.id, employerId: employer.id, atsProvider: 'oracle_taleo', submissionMode: 'manual_link', status: 'started', submittedAt: new Date(Date.now() - 95 * 86_400_000).toISOString(), createdAt: now() } as any
  const sync1 = await mockHrisProvider.fetchEmployment([oldApp])
  const sync2 = await mockHrisProvider.fetchEmployment([oldApp])
  ok('mock HRIS: 95d-old started app derives retained_90d', sync1.some((e) => e.type === 'retained_90d'))
  ok('mock HRIS: re-sync yields identical event set (idempotent, no double-bill)', JSON.stringify(sync1.map((e) => e.type).sort()) === JSON.stringify(sync2.map((e) => e.type).sort()))

  console.log(`\n${fail ? 'PROGRAM SMOKE FAILED' : 'PROGRAM SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
