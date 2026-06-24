// ── FlorenceRN — End-to-end Production Loop (the "Definition of Done") ───────
// ONE nurse, three apps, one Passport, one Control Tower. Proves FlorenceRN
// repeatably turns global supply into a LICENSED, employer-ready, *started*,
// *billing* RN with measurable revenue + forecast — in a single run.
//
//   Academy readiness  ─┐
//   Pathway license     ─┼─► Core Nurse Passport (folded, by email)
//   ATS placement/billing┘            │
//                                      ▼
//   ATS Program Workspace: licensed slate → redacted packet → lock wave →
//   ledger interview→offer→started(attested) → monthly invoice rollup
//                                      │
//                                      ▼
//   Core Control Tower: the start + MRR + pipeline forecast
//
// Core runs as a LIVE child process (the .sh wrapper boots it). Academy +
// Pathway signals are emitted through Core's real /v1/nurse/event spine API.
// The ATS half runs IN-PROCESS through the real program modules with passport
// emits ENABLED, so the attested 'started' propagates to Core exactly as in
// production. Mock-by-default: no audio, model-provider, or pricing API needed.
import { store, uid, now } from '../server/db'
import { passportEnabled } from '../server/passport'
import { generateLicensedSlate, buildSlatePackets, lockSlate } from '../server/program/slate'
import { rollupProgramInvoices } from '../server/program/billing'
import { programOverview, waveTracker } from '../server/program/workspace'
import { recordLedger, emitStartSignal } from '../server/ledger'
import type { EmployerAccount, EmployerShareConsent, FlorenceCandidate, JobRequisition, Program } from '../shared/types'

const CORE = process.env.PRODLOOP_CORE ?? 'http://127.0.0.1:8091'
const run = uid().slice(0, 8)
const EMAIL = process.env.PRODLOOP_EMAIL ?? `grace.loop.${run}@floretest.com`

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

let TOK = ''
async function mintToken(): Promise<string> {
  const r = await fetch(`${CORE}/oauth/token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ grant_type: 'client_credentials', client_id: 'florence-core-demo', client_secret: 'devsecret', scope: 'passport:read passport:write control-tower:read' }) })
  const j = (await r.json()) as { access_token?: string }
  return j.access_token ?? ''
}
const emitEvent = async (type: string, data: Record<string, unknown>, app?: string): Promise<boolean> => {
  const body: Record<string, unknown> = { type, email: EMAIL, data }
  if (app) body.ref = { app, externalId: `${app}:${run}` }
  const r = await fetch(`${CORE}/v1/nurse/event`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${TOK}` }, body: JSON.stringify(body) })
  return r.ok
}
const readPassport = async (): Promise<any | null> => {
  const r = await fetch(`${CORE}/v1/nurse/passport?email=${encodeURIComponent(EMAIL)}`, { headers: { authorization: `Bearer ${TOK}` } })
  return r.ok ? r.json() : null
}
const readControlTower = async (): Promise<any | null> => {
  const r = await fetch(`${CORE}/v1/control-tower?roster=1`, { headers: { authorization: `Bearer ${TOK}` } })
  return r.ok ? r.json() : null
}

async function main() {
  // The whole loop is meaningless if the ATS→Core spine is off — fail loudly.
  ok('ATS passport spine ENABLED (Core creds present)', passportEnabled)
  if (!passportEnabled) { console.log('\nPRODUCTION LOOP FAILED — spine off; run via scripts/verify-production-loop.sh'); process.exit(1) }
  TOK = await mintToken()
  ok('Core M2M token minted (passport + control-tower scopes)', !!TOK)

  // ── Steps 1–2: Academy readiness + Pathway license verified → Core Passport ─
  await emitEvent('academy.enrolled', { cohort: `loop-${run}` }, 'academy')
  await emitEvent('academy.assessment_completed', { theta: 0.74, passProbability: 0.87, band: 'green' }, 'academy')
  await emitEvent('pathway.nclex_status', { status: 'passed' }, 'pathway')
  await emitEvent('pathway.licensure_status', { status: 'issued', state: 'TX' }, 'pathway')
  await emitEvent('consent.updated', { scope: 'employer', status: 'granted' }, 'pathway')
  const p1 = await readPassport()
  ok('Core Passport: readiness folded from Academy (band green, pPass 0.87)', p1?.readiness?.band === 'green' && p1?.readiness?.passProbability === 0.87)
  ok('Core Passport: NCLEX passed + RN license issued (TX) from Pathway', p1?.nclex?.status === 'passed' && p1?.licensure?.status === 'issued' && p1?.licensure?.state === 'TX')

  // ── Step 3: ATS — productize the program for the SAME nurse (by email) ──────
  const employer: EmployerAccount = { id: uid(), name: `Kaiser ${run}`, atsProvider: 'oracle_taleo', integrationStatus: 'manual', defaultBillingModel: 'channel', sourceChannel: 'amn', createdAt: now(), updatedAt: now() }
  await store.employers.insert(employer)
  const req: JobRequisition = { id: uid(), employerId: employer.id, atsProvider: 'oracle_taleo', title: 'RN - Med Surg', setting: 'inpatient', state: 'TX', requiredLicenseState: 'TX', status: 'open', sourceChannel: 'amn', importedAt: now(), lastSyncedAt: now() }
  await store.requisitions.insert(req)
  const candId = uid()
  const cand: FlorenceCandidate = { id: candId, fullName: `Grace Loop ${run}`, email: EMAIL, specialtyExperience: ['med_surg'], yearsExperience: 5, readinessBand: 'green', nclexStatus: 'passed', licenseStatus: 'issued', targetStates: ['TX'], expectedStartWindow: '2027-Q1', employerShareConsent: 'granted', humanQaStatus: 'approved', createdAt: now(), updatedAt: now() }
  await store.candidates.insert(cand)
  await store.consents.insert({ id: uid(), candidateId: candId, employerId: employer.id, purpose: 'employer review', allowedData: ['resume', 'readiness_summary'], consentTextVersion: 'v1', consentTextHash: 'h', grantedAt: now() } as EmployerShareConsent)
  const program: Program = { id: uid(), employerId: employer.id, name: `Kaiser 200-RN ${run}`, targetCount: 200, waveStructure: [50, 50, 100], status: 'active', channel: 'amn', createdAt: now(), updatedAt: now() }
  await store.programs.insert(program)
  for (let i = 0; i < program.waveStructure.length; i++) await store.programWaves.insert({ id: uid(), programId: program.id, waveNumber: i + 1, targetCount: program.waveStructure[i]!, status: 'planned', createdAt: now() })
  const waves = await store.programWaves.byProgram(program.id)
  ok('Program created with 3 waves (50+50+100)', waves.length === 3)

  // ── Step 4: Licensed slate (the gate) ──────────────────────────────────────
  const slate = await generateLicensedSlate(program.id)
  ok('Licensed slate: the nurse is eligible (licensed + consented + TX-feasible)', slate.eligible.some((e) => e.candidateId === candId))

  // ── Step 5: Redacted packet (Kaiser sees only this) ────────────────────────
  const built = await buildSlatePackets(program.id, [candId])
  const packet = built.packets[0]
  const withheld = (packet?.withheldFields ?? []).map((w: { field: string }) => w.field)
  ok('Packet built + redacted (visa + financing withheld)', !!packet && withheld.some((f: string) => /visa/i.test(f)) && withheld.some((f: string) => /financ/i.test(f)))

  // ── Step 6: Lock wave 1 ────────────────────────────────────────────────────
  const locked = await lockSlate(program.id, waves[0]!.id, [candId])
  ok('Wave 1 locked (slate frozen, application submitted to ledger)', !!locked.submittedAt && locked.candidateIds.includes(candId))

  // ── Step 7: Ledger interview → offer → started (employer-attested) ──────────
  await recordLedger({ candidateId: candId, stage: 'interview_scheduled', employerId: employer.id, jobRequisitionId: req.id })
  await recordLedger({ candidateId: candId, stage: 'offer_made', employerId: employer.id, jobRequisitionId: req.id })
  await recordLedger({ candidateId: candId, stage: 'started', employerId: employer.id, jobRequisitionId: req.id, verifiedVia: 'employer_attestation' })

  // ── Step 8: Monthly invoice rollup (gross = starts × fee; FICA customer-side) ─
  const inv = await rollupProgramInvoices(program.id)
  ok('Invoice: 1 verified start → gross = starts × fee (no FICA in revenue)', inv.cumulative.verifiedStarts === 1 && inv.cumulative.grossUsd === inv.cumulative.verifiedStarts * inv.perRnMonthlyFeeUsd)
  ok('Invoice: customer effective cost ≤ gross (FICA offset customer-side only)', inv.cumulative.customerEffectiveCostUsd <= inv.cumulative.grossUsd)

  // ── Step 9: Wave tracker reflects the start ────────────────────────────────
  const tracker = await waveTracker(program.id)
  const overview = await programOverview(program.id)
  ok('Wave tracker: wave 1 shows the start; program overview locked=1', tracker[0]?.started === 1 && overview.lockedCandidates === 1)

  // ── Steps 10–11: Core Control Tower sees the start + MRR + forecast ─────────
  // Wait for the fire-and-forget ATS→Core emit (started + billing) to flush —
  // poll the UNCACHED passport so we never prime the control-tower cache stale.
  let pp: any = null
  for (let i = 0; i < 20; i++) { pp = await readPassport(); if (pp?.billing?.subscriptionStartedAt && pp?.placement?.stage === 'started') break; await sleep(500) }
  ok('Core Passport: ATS placement started + billing opened (attested start)', pp?.placement?.stage === 'started' && !!pp?.billing?.subscriptionStartedAt)
  const apps = (pp?.refs ?? []).map((r: { app: string }) => r.app).sort().join('+')
  ok('Identity converged by email across all three apps', apps === 'academy+ats+pathway', apps)

  const ct = await readControlTower()
  ok('Control Tower reachable (control-tower:read scope)', !!ct)
  ok('Control Tower: this run’s ONE nurse is the whole cohort', ct?.totalNurses === 1, String(ct?.totalNurses))
  ok('Control Tower: employer-ready supply counts the licensed nurse', ct?.employerReadyCount === 1)
  ok('Control Tower: 1 started to date + 1 billing-active', ct?.forecast?.startedToDate === 1 && ct?.forecast?.billingActive === 1)
  ok('Control Tower: positive MRR = billingActive × fee', ct?.forecast?.monthlyRecurringUsd === ct?.forecast?.billingActive * ct?.forecast?.perRnMonthlyFeeUsd && ct?.forecast?.monthlyRecurringUsd > 0, `$${ct?.forecast?.monthlyRecurringUsd}/mo`)
  ok('Control Tower: annualized = MRR × 12', ct?.forecast?.annualizedUsd === ct?.forecast?.monthlyRecurringUsd * 12)
  const rosterRow = (ct?.roster ?? []).find((r: { email?: string }) => r.email === EMAIL)
  ok('Control Tower roster: the nurse is at canonical stage billing_active', rosterRow?.stage === 'billing_active', rosterRow?.stage)

  // ── Retention tail (Phase 1): attested 30/60/90d → Core Passport.retention ──
  // (Asserted via the UNCACHED passport read; the cohort/curve aggregation is proven
  //  separately by verify-retention + verify-control-tower, which avoid the CT cache.)
  await recordLedger({ candidateId: candId, stage: 'retention_30d', employerId: employer.id, jobRequisitionId: req.id, verifiedVia: 'employer_attestation' })
  await recordLedger({ candidateId: candId, stage: 'retention_60d', employerId: employer.id, jobRequisitionId: req.id, verifiedVia: 'employer_attestation' })
  await recordLedger({ candidateId: candId, stage: 'retention_90d', employerId: employer.id, jobRequisitionId: req.id, verifiedVia: 'employer_attestation' })
  let rp: any = null
  for (let i = 0; i < 20; i++) { rp = await readPassport(); if (rp?.retention?.retained90dAt) break; await sleep(500) }
  ok('Core Passport: retention 30/60/90d folded from attested ATS milestones', !!rp?.retention?.retained30dAt && !!rp?.retention?.retained60dAt && !!rp?.retention?.retained90dAt)

  // ── Onboarding-risk signal (Phase 2): ATS emit → Core onboarding facet fold ──
  await emitStartSignal(candId, { signal: 'attestation_lag', value: 0.8, confidence: 0.6 })
  let op: any = null
  for (let i = 0; i < 20; i++) { op = await readPassport(); if (op?.onboarding?.startSignals?.length) break; await sleep(500) }
  ok('Core Passport: onboarding start-signal folded (ATS → Core, minimal payload)', (op?.onboarding?.startSignals?.length ?? 0) >= 1 && op.onboarding.startSignals[0]?.signal === 'attestation_lag')

  console.log(`\n${fail ? 'PRODUCTION LOOP FAILED' : 'PRODUCTION LOOP PASSED — one nurse, three apps, one Passport, one Control Tower'} — ${pass} passed, ${fail} failed`)
  console.log(fail ? '' : `   licensed → packet (redacted) → started (attested) → $${ct?.forecast?.monthlyRecurringUsd}/mo MRR → $${ct?.forecast?.annualizedUsd}/yr, visible in the cockpit.`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
