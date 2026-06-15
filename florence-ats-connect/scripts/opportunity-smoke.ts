// Opportunity Graph Phase 2 proof: opportunity STATE + CTA, per-job Candidate Fit
// Score, eligibility coaching, the Basket/Compare cockpit, and the Employer
// Opportunity Value Score. Run-scoped names so it's re-runnable against the shared
// store; runs on sqlite AND `ATS_DB=postgres`.
import { store, uid, now } from '../server/db'
import { ingestRows, type IngestRow } from '../server/demand/ingest'
import { registerPublicInterest, resolveOpportunityState } from '../server/demand/publicCard'
import { scoreCandidateForJob, eligibilityCoaching } from '../server/demand/opportunityFit'
import { setBucket, candidateBasket, compareOpportunities } from '../server/demand/basket'
import { rankAccounts } from '../server/demand/ranking'
import { createReservation, cancelReservation, reservationCockpit } from '../server/demand/reservations'
import { productionReport } from '../server/demand/productionReport'
import { pullSource } from '../server/demand/pull'
import { getDemandConnector } from '../server/connectors/demand'
import { selectSubmissionChannel } from '../server/submission'
import { forecastStarts } from '../server/demand/forecast'
import { buildProposal, renderProposalPdf } from '../server/demand/proposal'
import { opportunityStateFor, ctaForState } from '../shared/opportunityState'
import type { EmployerAccount, FlorenceCandidate } from '../shared/types'
import type { FlorenceRNJob, DemandSource } from '../shared/demand-types'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }
const run = uid().slice(0, 8)

// ── P2a: Opportunity STATE + CTA (pure) ─────────────────────────────────────
const jobStub = { employerId: undefined } as Pick<FlorenceRNJob, 'employerId'>
ok('state: no employer + no source → public', opportunityStateFor(jobStub) === 'public')
ok('state: AMN channel source → amn_channel', opportunityStateFor(jobStub, undefined, { channelOwner: 'AMN account' }) === 'amn_channel')
ok('state: direct engaged employer → direct_partner', opportunityStateFor(jobStub, { sourceChannel: 'direct', integrationStatus: 'manual' }) === 'direct_partner')
ok('state: live ATS integration → ats_connected', opportunityStateFor(jobStub, { sourceChannel: 'direct', integrationStatus: 'active' }) === 'ats_connected')
ok('state: cold prospect (not_started) → public (no false partnership)', opportunityStateFor(jobStub, { sourceChannel: 'direct', integrationStatus: 'not_started' }) === 'public')
ok('cta: apply ONLY for direct_partner / ats_connected', ctaForState('public') === 'express_interest' && ctaForState('amn_channel') === 'express_interest' && ctaForState('direct_partner') === 'apply_with_packet' && ctaForState('ats_connected') === 'apply_with_packet')

// Live state resolution via the employer relationship.
const EMP = `Oppco ${run}`
const emp: EmployerAccount = { id: uid(), name: EMP, atsProvider: 'workday', integrationStatus: 'active', defaultBillingModel: 'direct', sourceChannel: 'direct', createdAt: now(), updatedAt: now() }
await store.employers.insert(emp)
const caRows: IngestRow[] = [
  { employerName: EMP, facilityName: 'Oppco Med Center', title: 'RN - ICU', city: 'Los Angeles', state: 'CA', atsRequisitionId: `OPP-ICU-${run}`, sourceUrl: 'https://oppco.example/icu', description: 'ICU nights. $50-$70 per hour. Health insurance, 401(k).' },
  { employerName: EMP, facilityName: 'Oppco North', title: 'RN - Med Surg', city: 'San Jose', state: 'CA', atsRequisitionId: `OPP-MS-${run}`, sourceUrl: 'https://oppco.example/ms' },
]
await ingestRows(uid(), 'career_page', caRows)
const icu = (await store.demandJobs.all()).find((j) => j.employerName === EMP && j.title === 'RN - ICU')!
ok('state: resolved live → ats_connected (employer integration active)', (await resolveOpportunityState(icu)) === 'ats_connected')

// ── P2b: Candidate Fit Score per job ────────────────────────────────────────
const mk = (over: Partial<FlorenceCandidate>): FlorenceCandidate => ({
  id: uid(), fullName: `Nurse ${uid().slice(0, 5)}`, email: `n.${uid().slice(0, 6)}@t.dev`, specialtyExperience: ['icu'],
  readinessBand: 'green', nclexStatus: 'passed', licenseStatus: 'issued', targetStates: ['CA'],
  employerShareConsent: 'granted', humanQaStatus: 'approved', createdAt: now(), updatedAt: now(), ...over,
})
const licensedCa = mk({ targetStates: ['CA'], specialtyExperience: ['icu'], arrivalStatus: 'arrived' })
const pathwayTx = mk({ targetStates: ['TX'], nclexStatus: 'not_started', licenseStatus: 'not_started', readinessBand: 'orange', employerShareConsent: 'not_requested' })
for (const c of [licensedCa, pathwayTx]) await store.candidates.insert(c)
const fitCa = scoreCandidateForJob(licensedCa, icu)
const fitTx = scoreCandidateForJob(pathwayTx, icu)
ok('fit: licensed-CA ICU nurse scores higher than pathway-TX nurse for a CA ICU job', fitCa.matchScore > fitTx.matchScore, `CA=${fitCa.matchScore} vs TX=${fitTx.matchScore}`)
ok('fit: licensed-CA nurse is ready_to_submit; pathway-TX is not', fitCa.category === 'ready_to_submit' && fitTx.category !== 'ready_to_submit', `${fitCa.category} / ${fitTx.category}`)
ok('fit: returns the 7-signal breakdown', Array.isArray(fitCa.signals) && fitCa.signals.length === 7)

// ── P2c: Eligibility coaching ───────────────────────────────────────────────
const coachCa = eligibilityCoaching(licensedCa, icu)
const coachTx = eligibilityCoaching(pathwayTx, icu)
ok('coaching: licensed-CA → licensed_now', coachCa.state === 'licensed_now', coachCa.state)
ok('coaching: licensed-CA arrived → start feasibility "now"', coachCa.startFeasibility === 'now', coachCa.startFeasibility)
ok('coaching: pathway-TX → pathway_first + needs CA licensure first', coachTx.state === 'pathway_first' && coachTx.whatYouNeed.some((s) => /CA/.test(s)), JSON.stringify(coachTx.whatYouNeed.slice(0, 2)))
ok('coaching: every state carries an ETA note + fit score', !!coachCa.etaNote && typeof coachCa.fitScore === 'number')

// ── P2d: Opportunity Basket + Compare (consent-gated) ───────────────────────
// Public express-interest creates a consented lead; bucket + compare require consent.
const i1 = await registerPublicInterest({ jobId: icu.id, fullName: `Lead ${run}`, email: `lead.${run}@t.dev`, targetState: 'CA', consentGranted: true })
const ms = (await store.demandJobs.all()).find((j) => j.employerName === EMP && j.title === 'RN - Med Surg')!
await registerPublicInterest({ jobId: ms.id, fullName: `Lead ${run}`, email: `lead.${run}@t.dev`, consentGranted: true })
const leadRef = i1.candidateId
await setBucket(leadRef, icu.id, 'apply_when_licensed')
const basket = await candidateBasket(leadRef)
ok('basket: bucket set + grouped (apply_when_licensed has the ICU job)', basket.apply_when_licensed.some((e) => e.jobId === icu.id), JSON.stringify(Object.fromEntries(Object.entries(basket).map(([k, v]) => [k, v.length]))))
ok('basket: a non-consented job cannot be bucketed', await (async () => { try { await setBucket(leadRef, 'nonexistent-job', 'shortlisted'); return false } catch { return true } })())
const cmp = await compareOpportunities(leadRef, [icu.id, ms.id])
ok('compare: returns a row per consented job, fit-sorted', cmp.length === 2 && cmp[0].fitScore >= cmp[1].fitScore)
ok('compare: rows carry labeled pay (listed for ICU) + opportunity state', cmp.some((r) => r.jobId === icu.id && r.pay.kind === 'listed') && cmp.every((r) => !!r.opportunityState))
ok('compare: emits job.compared attribution', (await store.attribution.byCandidate(leadRef)).filter((a) => a.eventType === 'job.compared').length >= 2)

// ── P2e: Employer Opportunity Value Score ───────────────────────────────────
const ranked = await rankAccounts(50)
const oppAcct = ranked.find((r) => r.employer === EMP)
ok('value: ranked account carries an opportunityValue breakdown', !!oppAcct?.opportunityValue && typeof oppAcct!.opportunityValue.score === 'number', JSON.stringify(oppAcct?.opportunityValue))
ok('value: ATS-connected employer scores full channel availability (1)', oppAcct!.opportunityValue.channelAvailability === 1)
ok('value: facility density computed across distinct facilities', oppAcct!.opportunityValue.distinctFacilities >= 2)
ok('value: opportunityValue.score is 0–100', oppAcct!.opportunityValue.score >= 0 && oppAcct!.opportunityValue.score <= 100, String(oppAcct!.opportunityValue.score))
ok('value: legacy placement-yield score still present + ranking sorted by it', typeof oppAcct!.score === 'number' && ranked.every((r, i) => i === 0 || ranked[i - 1].score >= r.score))

// ── P3: new attribution events + richer reservations + production report ─────
const ogEvents = await store.attribution.all()
ok('P3: ingest emits demand.job_normalized', ogEvents.some((e) => e.eventType === 'demand.job_normalized' && e.jobId === icu.id))
ok('P3: compare emitted job.compared (carried from P2d)', ogEvents.some((e) => e.eventType === 'job.compared'))

// Richer capacity reservation: specialty/region/volume/channel/slateStatus/gate round-trip.
const resv = await createReservation(icu.id, { specialty: 'icu', region: 'CA', volume: 5, startWindow: 'Q3 2026', channel: 'amn', slateStatus: 'near_licensed', confidence: 'medium', gate: 'NCLEX pass' })
ok('P3: richer reservation round-trips all detail fields', resv.specialty === 'icu' && resv.region === 'CA' && resv.volume === 5 && resv.startWindow === 'Q3 2026' && resv.channel === 'amn' && resv.slateStatus === 'near_licensed' && resv.gate === 'NCLEX pass', JSON.stringify({ v: resv.volume, c: resv.channel, s: resv.slateStatus }))
ok('P3: reservation snapshots a fee + NO nurse PII', resv.perRnMonthlyFeeUsd > 0 && !/@|"email"/.test(JSON.stringify(resv)))
const cock = await reservationCockpit()
ok('P3: cockpit reports slate mix + reserved volume', (cock.slateMix.near_licensed ?? 0) >= 1 && cock.totalReservedVolume >= 5, JSON.stringify({ mix: cock.slateMix, vol: cock.totalReservedVolume }))
await cancelReservation(resv.id, 'smoke cleanup')

// Production report rolls the funnel + by-employer/source/campaign.
const report = await productionReport({ windowDays: 3650, nowMs: Date.parse('2026-06-14T00:00:00.000Z') })
ok('P3: production report has a funnel with the normalized rung', report.funnel.some((s) => s.stage === 'normalized'))
ok('P3: production report rolls by-employer with our Oppco account', report.byEmployer.some((r) => r.employer === EMP && r.detected >= 1), `employers=${report.byEmployer.length}`)
ok('P3: production report totals reflect detected jobs + interests', report.totals.jobsDetected >= 2 && report.totals.interests >= 1, JSON.stringify(report.totals))

// ── P4: more public connectors + generalized seam + native ATS gate + forecast + proposal ──
for (const st of ['lever_postings', 'ashby', 'smartrecruiters'] as const) {
  const src: DemandSource = { id: uid(), sourceType: st, name: `${st} ${run}`, robotsStatus: 'reviewed_ok', tosStatus: 'reviewed_ok', crawlAllowed: false, createdAt: now() }
  await store.demandSources.insert(src)
  const pull = await pullSource(src)
  ok(`P4: ${st} pull (mock) → RN rows + non-RN skipped`, pull.mode === 'mock' && pull.jobsCreated + pull.jobsUpdated >= 2 && pull.skippedNonRn >= 1, JSON.stringify({ mode: pull.mode, created: pull.jobsCreated, skipped: pull.skippedNonRn }))
  const conn = getDemandConnector(st)
  ok(`P4: ${st} connector exposes connectionType + test()`, conn?.connectionType === 'public_api' && typeof conn?.test === 'function')
}
// Ashby compensation flows into listedPay* via the description.
const ashbyJob = (await store.demandJobs.all()).find((j) => j.title.includes('ICU') && j.employerName.includes('Ashby'))
ok('P4: Ashby posted compensation → listedPay parsed ($55–$72/hr)', !!ashbyJob && ashbyJob.listedPayMin === 55 && ashbyJob.listedPayMax === 72, JSON.stringify({ min: ashbyJob?.listedPayMin, max: ashbyJob?.listedPayMax }))

// Native ATS write-sync gate: authorized + active → native; otherwise the manual bridge.
const gatedEmp: EmployerAccount = { id: uid(), name: `Gated ${run}`, atsProvider: 'workday', integrationStatus: 'active', defaultBillingModel: 'direct', sourceChannel: 'direct', createdAt: now(), updatedAt: now() }
ok('P4: ATS gate — active but NOT authorized → manual bridge (no live submit)', selectSubmissionChannel(gatedEmp).mode === 'manual_link')
ok('P4: ATS gate — active + atsAuthorized → native channel', selectSubmissionChannel({ ...gatedEmp, atsAuthorized: true }).mode === 'native_api')
ok('P4: ATS gate — authorized but NOT active → still manual', selectSubmissionChannel({ ...gatedEmp, integrationStatus: 'sandbox', atsAuthorized: true }).mode === 'manual_link')

// Forecast math: probability-weighted expected starts + recurring MRR.
const fc = await forecastStarts({ nowMs: Date.parse('2026-06-14T00:00:00.000Z'), monthlyFeeUsd: 1750 })
ok('P4: forecast returns expected starts + by-month MRR', fc.expectedStartsTotal >= 0 && Array.isArray(fc.byMonth) && fc.monthlyFeeUsd === 1750)
ok('P4: forecast MRR = expected starts × fee (FlorenceRN fee only)', fc.byMonth.every((m) => Math.abs(m.expectedMrrUsd - m.expectedStarts * 1750) <= 1))
ok('P4: forecast labels its conversion rates as conservative placeholders', fc.assumptions.some((a) => /placeholder|conservative/i.test(a)))

// Automated proposal: DRAFT only, renders a PDF, FICA stays customer-side.
const prop = await buildProposal(EMP, 'amn')
ok('P4: proposal is a DRAFT (human-review-gated, never auto-sent)', prop.status === 'draft' && prop.pilotPlan.length > 0 && prop.termsSummary.length > 0)
ok('P4: proposal terms keep FICA customer-side (not FlorenceRN revenue)', prop.termsSummary.some((t) => /NOT FlorenceRN revenue/i.test(t)))
const propPdf = renderProposalPdf(prop)
ok('P4: proposal renders a valid PDF', propPdf.length > 1000 && propPdf.subarray(0, 4).toString() === '%PDF', `${propPdf.length} bytes`)

console.log(`\n${fail ? 'OPPORTUNITY P2+P3+P4 FAILED' : 'OPPORTUNITY P2+P3+P4 PASSED'} — ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
