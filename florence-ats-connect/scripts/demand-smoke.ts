// Demand Radar P1 proof: ingest the same RN jobs from two sources and confirm
// they collapse to ONE canonical FlorenceRNJob (all sources preserved), non-RN
// roles are skipped, re-pulls are idempotent, and the CSV parser works.
// Run-scoped employer names make it re-runnable against the shared store.
import { store, uid, now } from '../server/db'
import { ingestRows, rowsFromCsv, type IngestRow } from '../server/demand/ingest'
import { parsePay, extractBenefits } from '../server/demand/normalize'
import { parseJobPostingLd } from '../server/demand/jobPostingLd'
import { publicJobCard, registerPublicInterest } from '../server/demand/publicCard'
import { payDisplay } from '../shared/payDisplay'
import { pullSource, refreshStale } from '../server/demand/pull'
import { runEconomics } from '../server/demand/economics'
import { createLink, recordClick } from '../server/links'
import { registerInterest, routeEligibility } from '../server/demand/interest'
import { buildDemandBrief, renderBriefPdf } from '../server/demand/brief'
import { ingestReconciliation, reconRowsFromCsv } from '../server/demand/reconciliation'
import { attributionFunnel, dashboardSummary } from '../server/demand/attribution'
import { rankAccounts } from '../server/demand/ranking'
import { createReservation, cancelReservation, markReservationFilled, reservationCockpit } from '../server/demand/reservations'
import { writeFileSync } from 'node:fs'
import type { DemandSource } from '../shared/demand-types'
import type { FlorenceCandidate } from '../shared/types'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }

const run = uid().slice(0, 8)
const SUTTER = `Sutter Health ${run}`
const KAISER = `Kaiser Permanente ${run}`

// Source A — employer career page (Sutter carries an ATS req id)
const A: IngestRow[] = [
  { employerName: SUTTER, facilityName: 'Sutter Medical Center', title: 'RN - Med Surg', city: 'Sacramento', state: 'CA', atsRequisitionId: `R-MS-${run}`, sourceUrl: 'https://careers.sutter.org/x' },
  { employerName: KAISER, title: 'RN - ICU', city: 'Oakland', state: 'CA', sourceUrl: 'https://kp.org/icu' },
  { employerName: `Big Hospital ${run}`, title: 'Chief Financial Officer', city: 'Reno', state: 'NV' }, // non-RN → skip
  { employerName: `SNF Co ${run}`, title: 'LPN - Long Term Care', city: 'Mesa', state: 'AZ' }, // LPN → skip
]
// Source B — aggregator (same two RN jobs, should collapse onto A)
const B: IngestRow[] = [
  { employerName: SUTTER, title: 'Registered Nurse, Medical Surgical', city: 'Sacramento', state: 'CA', atsRequisitionId: `R-MS-${run}`, sourceUrl: 'https://aggregator.com/abc' }, // same req id
  { employerName: KAISER, title: 'RN - ICU', city: 'Oakland', state: 'CA', sourceUrl: 'https://aggregator.com/def' }, // same attrs
]

const srcA = uid() // a stable source id, so a re-pull of A is genuinely the same source
const r1 = await ingestRows(srcA, 'career_page', A)
ok('source A: 2 RN jobs created, 2 non-RN skipped', r1.jobsCreated === 2 && r1.skippedNonRn === 2, JSON.stringify(r1))

const r2 = await ingestRows(uid(), 'partner_feed', B)
ok('source B: 0 created, 2 collapsed onto existing jobs', r2.jobsCreated === 0 && r2.jobsUpdated === 2, JSON.stringify(r2))

const all = await store.demandJobs.all()
const sutter = all.filter((j) => j.employerName === SUTTER)
ok('Sutter med-surg collapsed to ONE job (req-id match across sources)', sutter.length === 1, `${sutter.length} job(s)`)
if (sutter[0]) {
  const srcs = await store.jobSources.byJob(sutter[0].id)
  ok('…preserving BOTH discovered sources', srcs.length === 2, `${srcs.length} sources`)
  ok('…normalized: specialty=med_surg, state=CA', sutter[0].specialty === 'med_surg' && sutter[0].requiredLicenseState === 'CA')
}
const kaiser = all.filter((j) => j.employerName === KAISER)
ok('Kaiser ICU collapsed to ONE job (attribute match, no req id)', kaiser.length === 1 && kaiser[0]?.specialty === 'icu')

// idempotent re-pull: SAME source + same content → no new raw rows
const r3 = await ingestRows(srcA, 'career_page', A)
ok('re-pull is idempotent (0 new raw postings)', r3.rawNew === 0, JSON.stringify(r3))

// CSV parser
const csv = `employer,title,city,state,reqId\n"${KAISER}","RN - Telemetry","Fresno","CA","R-TEL-${run}"\n"${KAISER}","Registered Nurse — Emergency","Fresno","CA","R-ER-${run}"\n`
const rows = rowsFromCsv(csv)
ok('CSV parsed into 2 rows with mapped fields', rows.length === 2 && rows[0].employerName === KAISER && rows[0].title === 'RN - Telemetry')
const r4 = await ingestRows(uid(), 'csv', rows)
ok('CSV ingest created 2 new jobs (tele + er)', r4.jobsCreated === 2, JSON.stringify(r4))

// ── P2: connectors + compliance gate + freshness ───────────────────────────
const ghSource: DemandSource = { id: uid(), sourceType: 'greenhouse_board', name: `GH ${run}`, robotsStatus: 'reviewed_ok', tosStatus: 'reviewed_ok', crawlAllowed: false, createdAt: now() }
await store.demandSources.insert(ghSource)
const gh = await pullSource(ghSource)
ok('greenhouse_board pull (mock) → 2 RN jobs processed, 1 non-RN skipped', gh.mode === 'mock' && gh.jobsCreated + gh.jobsUpdated === 2 && gh.skippedNonRn === 1, JSON.stringify({ mode: gh.mode, created: gh.jobsCreated, updated: gh.jobsUpdated, skipped: gh.skippedNonRn }))

const cpBlocked: DemandSource = { id: uid(), sourceType: 'career_page', name: `Blocked ${run}`, robotsStatus: 'unknown', tosStatus: 'unknown', crawlAllowed: false, createdAt: now() }
await store.demandSources.insert(cpBlocked)
const blocked = await pullSource(cpBlocked)
ok('career_page crawl BLOCKED until robots/ToS reviewed + crawlAllowed', blocked.mode === 'blocked' && blocked.jobsCreated === 0, blocked.note.slice(0, 60))

// ── P3: economics via the Workforce Economist pricing-api ───────────────────
// Uses the Sutter med-surg job (CA). With the pricing-api on :8000 this is a
// LIVE price; without it, the graceful fallback still returns a costed estimate.
const sutterJob = (await store.demandJobs.all()).find((j) => j.employerName === SUTTER)
if (sutterJob) {
  const econ = await runEconomics(sutterJob)
  const fee = econ.recommendedGrossFeePerRnMonth ?? 0
  const offset = econ.estimatedPayrollTaxOffsetPerRnMonth ?? 0
  const eff = econ.effectiveCostPerRnMonth ?? 0
  ok('economics: positive per-RN/month fee', fee > 0, `$${fee.toFixed(0)}/mo`)
  ok('economics: effective cost = fee − FICA offset (accounting identity)', Math.abs(eff - (fee - offset)) < 1.5, `eff=$${eff.toFixed(0)} fee=$${fee.toFixed(0)} offset=$${offset.toFixed(0)}`)
  ok('economics: FICA recorded as customer-side reducer only (assumptions note it)', econ.assumptions.some((a) => /FICA.*revenue|revenue = subscription/i.test(a)))
  ok('economics: persisted + retrievable', !!(await store.jobEconomics.latestByJob(sutterJob.id)))
} else ok('economics: found a job to price', false)

// ── P4: tracked links + click capture + attribution (no PII) ────────────────
const targetJob = (await store.demandJobs.all()).find((j) => j.employerName === KAISER)
const link = await createLink({
  destinationUrl: 'https://go.example.com/jobs/kaiser-icu',
  utmSource: 'florencern_demand_radar', utmMedium: 'job_interest', utmCampaign: `kaiser_${run}`,
  utmContent: 'wave1_icu', utmTerm: 'licensed_rn', campaignType: 'job_interest', jobId: targetJob?.id,
})
ok('tracked link minted with short code + shortUrl', !!link.shortCode && link.shortUrl.includes(`/l/${link.shortCode}`), link.shortUrl)

const PII_EMAIL = 'nurse.pii@example.com'
const clicked = await recordClick(link.shortCode, { ip: '203.0.113.7', userAgent: 'Mozilla/5.0', referrer: 'https://wa.me', candidateId: undefined })
ok('click → redirect destination returned', !!clicked, clicked?.destination.slice(0, 50))
if (clicked) {
  ok('destination carries UTMs + opaque frn_click_id', /utm_source=florencern_demand_radar/.test(clicked.destination) && /frn_click_id=clk_/.test(clicked.destination))
  ok('NO PII in the URL (no email/name)', !clicked.destination.includes(PII_EMAIL) && !/email=|name=/.test(clicked.destination))
}
const clicks = await store.trackingClicks.byLink(link.id)
ok('click logged first-party (1)', clicks.length === 1)
ok('click stores IP HASH, not raw IP', clicks[0]?.ipHash !== '203.0.113.7' && (clicks[0]?.ipHash?.length ?? 0) > 0)
const attr = (await store.attribution.all()).filter((a) => a.eventType === 'demand.link_clicked' && a.frnClickId === clicks[0]?.frnClickId)
ok('attribution event recorded (demand.link_clicked)', attr.length === 1 && attr[0]?.jobId === targetJob?.id)
ok('unknown short code → null (404 path)', (await recordClick('nope-nope', {})) === null)

// ── P5: candidate interest + eligibility routing + consent ──────────────────
const mkCand = (over: Partial<FlorenceCandidate>): FlorenceCandidate => ({
  id: uid(), fullName: `Nurse ${run}`, email: `nurse.${uid().slice(0, 6)}@test.dev`, specialtyExperience: ['icu'],
  readinessBand: 'green', nclexStatus: 'passed', licenseStatus: 'issued', targetStates: ['CA'],
  employerShareConsent: 'not_requested', humanQaStatus: 'approved', createdAt: now(), updatedAt: now(), ...over,
})
const licensed = mkCand({ licenseStatus: 'issued', nclexStatus: 'passed' })
const nearLic = mkCand({ licenseStatus: 'submitted', nclexStatus: 'passed' })
const pathwayFirst = mkCand({ licenseStatus: 'not_started', nclexStatus: 'not_started', readinessBand: 'orange' })
for (const c of [licensed, nearLic, pathwayFirst]) await store.candidates.insert(c)
ok('eligibility: licensed → licensed_packet_ready', routeEligibility(licensed) === 'licensed_packet_ready')
ok('eligibility: passed-NCLEX, license pending → interested (near-licensed)', routeEligibility(nearLic) === 'interested')
ok('eligibility: not-ready → pathway_first', routeEligibility(pathwayFirst) === 'pathway_first')

const ijob = (await store.demandJobs.all()).find((j) => j.employerName === KAISER)!
const interest = await registerInterest({ candidateId: licensed.id, jobId: ijob.id, consentGranted: true })
ok('interest registered with eligibility status + consent', interest.status === 'licensed_packet_ready' && !!interest.consentId)
ok('interest retrievable by job', (await store.jobInterests.byJob(ijob.id)).some((i) => i.id === interest.id))
ok('interest emits demand.interest_registered attribution', (await store.attribution.byCandidate(licensed.id)).some((a) => a.eventType === 'demand.interest_registered' && a.jobId === ijob.id))

// ── P6: employer/AMN demand brief + PDF ─────────────────────────────────────
const brief = await buildDemandBrief(KAISER, 'amn')
ok('brief: observed Kaiser demand (≥1 open job)', brief.jobs.total >= 1, `${brief.jobs.total} jobs in ${brief.jobs.states.join(',')}`)
ok('brief: matched FlorenceRN supply counted', brief.supply.total >= 1, `${brief.supply.licensed} licensed / ${brief.supply.total} total`)
ok('brief: economics populated (gross fee + effective cost + offset)', brief.economics.avgGrossFeePerRnMonth > 0 && brief.economics.avgEffectiveCostPerRnMonth > 0)
const pdf = renderBriefPdf(brief)
ok('brief: renders a valid PDF', pdf.length > 1000 && pdf.subarray(0, 4).toString() === '%PDF', `${pdf.length} bytes`)
writeFileSync('/tmp/demand-brief.pdf', pdf)

// ── P7: reconciliation → Production Ledger (attested start/retention) ────────
const recon = await ingestReconciliation('amn_update', [{ candidateId: licensed.id, jobId: ijob.id, status: 'started' }])
ok('reconciliation recorded + ledger event', recon.recorded === 1 && recon.ledgerEvents === 1, JSON.stringify(recon))
ok('ledger has an ATTESTED started event (not bare ATS status)', (await store.ledger.byCandidate(licensed.id)).some((e) => e.stage === 'started' && e.verifiedVia === 'employer_attestation'))
ok('attribution has recon.started', (await store.attribution.byCandidate(licensed.id)).some((a) => a.eventType === 'recon.started'))
const beforePacketShareLedger = (await store.ledger.byCandidate(licensed.id)).filter((e) => e.stage === 'ats_application_submitted').length
const reconPacketShare = await ingestReconciliation('employer_update', [{ candidateId: licensed.id, jobId: ijob.id, status: 'packet_shared' }])
const afterPacketShareLedger = (await store.ledger.byCandidate(licensed.id)).filter((e) => e.stage === 'ats_application_submitted').length
ok('reconciliation packet_shared is attribution-only, not a formal submission', reconPacketShare.recorded === 1 && reconPacketShare.ledgerEvents === 0 && afterPacketShareLedger === beforePacketShareLedger)
const rrows = reconRowsFromCsv(`candidateId,jobId,status,notes\n${licensed.id},${ijob.id},retained_90,"90-day confirmed"\n`)
ok('reconciliation CSV parsed', rrows.length === 1 && rrows[0].status === 'retained_90')
const recon2 = await ingestReconciliation('csv', rrows)
ok('CSV reconciliation → retention_90d ledger event', recon2.ledgerEvents === 1 && (await store.ledger.byCandidate(licensed.id)).some((e) => e.stage === 'retention_90d'))

// ── P9: end-to-end source→start attribution + dashboard ─────────────────────
const funnel = await attributionFunnel()
const stg = (s: string) => funnel.stages.find((x) => x.stage === s)?.events ?? 0
ok('funnel: jobs_detected > 0', stg('jobs_detected') > 0)
ok('funnel: priced > 0 (P3/P6)', stg('priced') > 0)
ok('funnel: clicks > 0 (P4)', stg('clicks') > 0)
ok('funnel: interests > 0 (P5)', stg('interests') > 0)
ok('funnel: starts > 0 (P7 reconciliation)', stg('starts') > 0)
ok('funnel: retained_90 > 0 (P7)', stg('retained_90') > 0)
ok('funnel: bySource attribution present', Object.keys(funnel.bySource).length > 0, Object.keys(funnel.bySource).join(','))
const dash = await dashboardSummary()
ok('dashboard summary: jobs + links + interests + funnel', dash.jobs.total > 0 && typeof dash.links.clicks === 'number' && Array.isArray(dash.funnel.stages))

// ── v2: account ranking (demand × fit × economics) ──────────────────────────
const ranked = await rankAccounts(10)
ok('account ranking returns scored accounts (highest-yield first)', ranked.length > 0 && typeof ranked[0].score === 'number', ranked[0] ? `top: ${ranked[0].employer} score=${ranked[0].score}` : 'none')
ok('ranking is sorted descending by score', ranked.every((r, i) => i === 0 || ranked[i - 1].score >= r.score))

// ── reservations: soft, priced, cancellable demand commitments ──────────────
const resvJob = (await store.demandJobs.all())[0]!
const rv1 = await createReservation(resvJob.id)
const rv2 = await createReservation(resvJob.id)
ok('reservation: fee snapshot + no nurse PII', rv1.perRnMonthlyFeeUsd > 0 && !/"email"|@/.test(JSON.stringify(rv1)))
let resvCockpit = await reservationCockpit()
ok('reservation cockpit: job reserved = 2', resvCockpit.reservedByJob[resvJob.id]?.count === 2, String(resvCockpit.reservedByJob[resvJob.id]?.count))
const rvCancelled = await cancelReservation(rv1.id, 'paused')
resvCockpit = await reservationCockpit()
ok('reservation cancel → tombstone, reserved = 1', rvCancelled.status === 'cancelled' && resvCockpit.reservedByJob[resvJob.id]?.count === 1)
const beforeF = resvCockpit.totalFilled
await markReservationFilled(rv2.id)
resvCockpit = await reservationCockpit()
ok('reservation fill → reserved = 0, filled +1', (resvCockpit.reservedByJob[resvJob.id]?.count ?? 0) === 0 && resvCockpit.totalFilled === beforeF + 1)

// ── Opportunity Graph P1 (Gap A–F): pay, benefits, provenance, registry, parser, card ──
const OG = `OppGraph ${run}`

// (Gap A.a) Listed pay range in a posting (TX = NOT a transparency state) → listedPay* set,
// no CA flag; running economics must NOT overwrite a listed range with an estimate.
const listedRow: IngestRow[] = [{ employerName: OG, title: 'RN - Med Surg', city: 'Dallas', state: 'TX', atsRequisitionId: `OG-LIS-${run}`, atsProvider: 'workday', sourceUrl: 'https://careers.og.example/listed', description: 'Full-time day shift. Pay range $38.00 - $52.00 per hour. Health insurance, 401(k), tuition reimbursement, paid time off.' }]
await ingestRows(uid(), 'career_page', listedRow)
const listedJob = (await store.demandJobs.all()).find((j) => j.employerName === OG && j.title === 'RN - Med Surg')!
ok('Gap A: listed pay parsed from posting ($38–$52/hr)', listedJob.listedPayMin === 38 && listedJob.listedPayMax === 52 && listedJob.listedPayUnit === 'hour', JSON.stringify({ min: listedJob.listedPayMin, max: listedJob.listedPayMax, unit: listedJob.listedPayUnit }))
ok('Gap A: TX listed posting → no pay-transparency flag', !listedJob.payTransparencyFlag)
await runEconomics(listedJob)
const listedAfter = (await store.demandJobs.get(listedJob.id))!
ok('Gap A: economics does NOT overwrite a listed range with an estimate', listedAfter.estimatedPayMin == null && listedAfter.listedPayMin === 38)
ok('Gap A: payDisplay labels listed pay as employer-sourced', payDisplay(listedAfter).kind === 'listed' && /employer posting/.test(payDisplay(listedAfter).source))

// (Gap A.b) No listed pay (TX) → after economics, an estimated band + confidence is written.
const noPayRow: IngestRow[] = [{ employerName: OG, title: 'RN - PCU', city: 'Houston', state: 'TX', atsRequisitionId: `OG-EST-${run}`, sourceUrl: 'https://careers.og.example/est', description: 'Progressive care unit. Day shift.' }]
await ingestRows(uid(), 'career_page', noPayRow)
const estJob = (await store.demandJobs.all()).find((j) => j.employerName === OG && j.title === 'RN - PCU')!
ok('Gap A: no-pay posting starts with no listed pay', estJob.listedPayMin == null)
await runEconomics(estJob)
const estAfter = (await store.demandJobs.get(estJob.id))!
const econMissing = !estAfter.estimatedPayMin // pricing-api down + no wage → no estimate (acceptable)
ok('Gap A: economics writes a labeled estimated band (or skips when no wage)', econMissing || (estAfter.estimatedPayMin! > 0 && estAfter.estimatedPayMax! >= estAfter.estimatedPayMin! && !!estAfter.estimatedPayConfidence), JSON.stringify({ min: estAfter.estimatedPayMin, max: estAfter.estimatedPayMax, conf: estAfter.estimatedPayConfidence }))
if (!econMissing) ok('Gap A: payDisplay labels estimate as FlorenceRN local-market', payDisplay(estAfter).kind === 'estimated' && /FlorenceRN estimate/.test(payDisplay(estAfter).source))

// (Gap A.c) CA posting w/o pay → pay-transparency flag + note (informational, non-blocking).
const caRow: IngestRow[] = [{ employerName: OG, title: 'RN - Telemetry', city: 'San Diego', state: 'CA', atsRequisitionId: `OG-CA-${run}`, sourceUrl: 'https://careers.og.example/ca' }]
await ingestRows(uid(), 'career_page', caRow)
const caJob = (await store.demandJobs.all()).find((j) => j.employerName === OG && j.title === 'RN - Telemetry')!
ok('Gap A: CA posting w/o pay → payTransparencyFlag + note', caJob.payTransparencyFlag === true && !!caJob.payTransparencyNote, caJob.payTransparencyNote)

// (Gap A unit) parsePay regex: k-suffix annual + sanity guards.
ok('Gap A: parsePay reads "$95k–$120k per year"', (() => { const p = parsePay('Salary $95k - $120k per year, plus bonus'); return p.listedPayMin === 95000 && p.listedPayMax === 120000 && p.listedPayUnit === 'year' })())
ok('Gap A: parsePay rejects a bare ZIP/phone (no pay anchor)', Object.keys(parsePay('Located in 90210, call 800-555-1212')).length === 0)

// (Gap B) extractBenefits + job_benefits round-trip + idempotent ingest + counts().
ok('Gap B: extractBenefits tags health/401k/tuition/pto', (() => { const b = extractBenefits('We offer health insurance, 401(k) match, tuition reimbursement, and generous PTO'); return ['health_insurance', 'retirement_401k', 'tuition_support', 'pto'].every((t) => b.includes(t as any)) })())
const benRows = await store.jobBenefits.byJob(listedJob.id)
ok('Gap B: posting benefits persisted as a job_posting row', benRows.some((b) => b.sourceType === 'job_posting' && b.benefits.includes('health_insurance')))
await ingestRows(uid(), 'partner_feed', listedRow) // re-ingest same job → benefits must NOT duplicate
const benRows2 = await store.jobBenefits.byJob(listedJob.id)
ok('Gap B: benefits ingest is idempotent (one job_posting row)', benRows2.filter((b) => b.sourceType === 'job_posting').length === 1, String(benRows2.length))
const benCounts = await store.counts()
ok('Gap B: counts() exposes job_benefits ≥ 1 (both backends)', (benCounts.job_benefits ?? 0) >= 1, String(benCounts.job_benefits))

// (Gap C) Denormalized provenance on the canonical job.
ok('Gap C: provenance denormalized onto job (sourceUrl/atsProvider/atsRequisitionId)', listedJob.sourceUrl === 'https://careers.og.example/listed' && listedJob.atsProvider === 'workday' && listedJob.atsRequisitionId === `OG-LIS-${run}`)

// (Gap D) New DemandSource registry fields round-trip.
const regSrc: DemandSource = { id: uid(), sourceType: 'career_page', name: `Reg ${run}`, careerSiteUrl: 'https://careers.reg.example', publicApiAvailable: false, payTransparencyJurisdiction: 'CA', crawlCadence: 'manual', priority: 7, channelOwner: 'direct-target', robotsStatus: 'unknown', tosStatus: 'unknown', crawlAllowed: false, createdAt: now() }
await store.demandSources.insert(regSrc)
const regBack = (await store.demandSources.all()).find((s) => s.id === regSrc.id)!
ok('Gap D: DemandSource registry fields round-trip', regBack.careerSiteUrl === 'https://careers.reg.example' && regBack.payTransparencyJurisdiction === 'CA' && regBack.crawlCadence === 'manual' && regBack.priority === 7 && regBack.channelOwner === 'direct-target')
ok('Gap D: seeded registry sources keep the crawl gate CLOSED', regBack.crawlAllowed === false)

// (Gap E) partner-feed connector (mock) + JobPosting JSON-LD parser.
const pfSrc: DemandSource = { id: uid(), sourceType: 'partner_feed', name: `PF ${run}`, robotsStatus: 'reviewed_ok', tosStatus: 'reviewed_ok', crawlAllowed: false, createdAt: now() }
await store.demandSources.insert(pfSrc)
const pf = await pullSource(pfSrc)
ok('Gap E: partner_feed pull (mock) → RN rows processed, non-RN skipped', pf.mode === 'mock' && pf.jobsCreated + pf.jobsUpdated >= 2 && pf.skippedNonRn >= 1, JSON.stringify({ mode: pf.mode, created: pf.jobsCreated, updated: pf.jobsUpdated, skipped: pf.skippedNonRn }))
const ld = parseJobPostingLd({ '@context': 'https://schema.org', '@graph': [{ '@type': 'JobPosting', title: 'Registered Nurse - ICU', identifier: 'LD-1', hiringOrganization: { '@type': 'Organization', name: 'LD Health' }, jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: 'Phoenix', addressRegion: 'AZ' } }, baseSalary: { '@type': 'MonetaryAmount', currency: 'USD', value: { '@type': 'QuantitativeValue', minValue: 45, maxValue: 60, unitText: 'HOUR' } }, url: 'https://ld.example/1' }] })
ok('Gap E: parseJobPostingLd → one IngestRow with employer/title/location', ld.length === 1 && ld[0].employerName === 'LD Health' && ld[0].title === 'Registered Nurse - ICU' && ld[0].state === 'AZ' && ld[0].atsRequisitionId === 'LD-1')
const ldNorm = parsePay(ld[0].description ?? '')
ok('Gap E: JSON-LD baseSalary flows into the parseable description ($45–$60/hr)', ldNorm.listedPayMin === 45 && ldNorm.listedPayMax === 60 && ldNorm.listedPayUnit === 'hour', ld[0].description)

// (Gap F) Public candidate card (redacted) + public express-interest (lead capture + consent).
const card = publicJobCard(listedAfter)
ok('Gap F: public card carries labeled pay + benefits + express-interest CTA', card.cta === 'express_interest' && card.pay.kind === 'listed' && card.benefits.includes('health_insurance'))
ok('Gap F: public card is redacted (no economics/revenue fields)', !/recommendedGrossFee|estimatedNetValue|effectiveCost/.test(JSON.stringify(card)))
const pubInterest = await registerPublicInterest({ jobId: listedAfter.id, fullName: `Lead Nurse ${run}`, email: `lead.${run}@test.dev`, targetState: 'TX', trackingClickId: 'clk_smoketest', consentGranted: true })
ok('Gap F: public express-interest creates a lead + routes eligibility', !!pubInterest.id && pubInterest.status === 'pathway_first')
const leadCand = (await store.candidates.all()).find((c) => c.email === `lead.${run}@test.dev`)!
ok('Gap F: lead candidate captured (lowest readiness, cannot auto-match)', leadCand.sourceCandidateId === 'public_interest' && leadCand.readinessBand === 'red')
ok('Gap F: interest carries the opaque frn_click_id (no PII in the join key)', pubInterest.trackingClickId === 'clk_smoketest')

// Dashboard pay rollup reflects the new fields.
const dash2 = await dashboardSummary()
ok('Gap A/B: dashboard pay rollup present (listed + estimated + transparencyGap + benefits)', !!dash2.pay && dash2.pay.listed >= 1 && dash2.pay.transparencyGap >= 1 && dash2.pay.withBenefits >= 1, JSON.stringify(dash2.pay))

// ── freshness (run last) ────────────────────────────────────────────────────
const stale = await refreshStale(0) // cutoff = now → every just-seen open job ages out
ok('freshness pass marks not-recently-seen jobs stale', stale.markedStale > 0, JSON.stringify(stale))

console.log(`\n${fail ? 'DEMAND P1-P9 + OPPGRAPH-P1 FAILED' : 'DEMAND P1-P9 + OPPGRAPH-P1 PASSED'} — ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
