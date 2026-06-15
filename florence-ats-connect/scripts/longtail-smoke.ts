// Long-Tail Demand Radar proof: lead signals (never candidate-readable), the employer
// claim flow (mints a displayable job), category interest tiles, Tier A–D lead scoring,
// DRAFT-only outreach, and the displayAllowed / origin-exclusion compliance invariants.
// Run-scoped (unique market per run); runs on sqlite AND ATS_DB=postgres.
import { store, uid } from '../server/db'
import { recordHiringSignal, issueClaimToken, claimPrefill, authorizeAndClaim, registerMarketInterest, listCategoryTiles } from '../server/demand/longTail'
import { rankLongTailLeads } from '../server/demand/longTailLeads'
import { buildOutreachDraft, renderOutreachPdf } from '../server/demand/outreach'
import { buildPublicCard, resolveOpportunityState } from '../server/demand/publicCard'
import { rankAccounts } from '../server/demand/ranking'
import { dashboardSummary } from '../server/demand/attribution'
import { normalizeMarket, roleCategoryOf, tileCta } from '../shared/market'
import type { FlorenceCandidate } from '../shared/types'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }
const run = uid().slice(0, 8)
const CITY = `lttest${run}`
const ST = 'NV'
const market = normalizeMarket(CITY, ST)

// ── L0: pure helpers ─────────────────────────────────────────────────────────
ok('market: normalizeMarket lowercases city + requires 2-letter state', market.key === `${CITY.toLowerCase()}|NV` && market.display === `${CITY.charAt(0).toUpperCase()}${CITY.slice(1)}, NV`, market.display)
ok('market: alias collapses "LA" → Los Angeles', normalizeMarket('LA', 'CA').key === 'los angeles|CA')
ok('market: a non-2-letter state throws', (() => { try { normalizeMarket('Reno', 'Nevada'); return false } catch { return true } })())
ok('market: roleCategoryOf maps specialty/setting', roleCategoryOf('home_health', undefined) === 'home_health_rn' && roleCategoryOf(undefined, 'asc') === 'asc_rn' && roleCategoryOf(undefined, undefined) === 'other_rn')
ok('market: tileCta — unclaimed=im_interested, claimed=view_role', tileCta(false) === 'im_interested' && tileCta(true) === 'view_role')

// ── L1a: hiring signal (lead-only) ──────────────────────────────────────────
const signal = await recordHiringSignal({ sourceType: 'craigslist_signal', employerName: `ABC Home Health ${run}`, city: CITY, state: ST, roleCategory: 'home_health_rn', sourceUrl: 'https://craigslist.example/x', observedAt: new Date().toISOString(), reviewer: 'ops-tester' })
ok('signal: craigslist signal is displayAllowed=false (lead only)', signal.displayAllowed === false && signal.employerClaimed === false)
ok('signal: craigslist signal throws without sourceUrl/observedAt/reviewer', await (async () => { try { await recordHiringSignal({ sourceType: 'craigslist_signal', city: CITY, state: ST, roleCategory: 'home_health_rn' }); return false } catch { return true } })())
ok('signal: a signal is NOT a FlorenceRNJob (no candidate route)', (await store.demandJobs.get(signal.id)) === null)
ok('signal: emits longtail.signal_observed', (await store.attribution.all()).some((e) => e.eventType === 'longtail.signal_observed' && e.metadata?.market === market.key))

// ── L1b: claim flow → mints a displayable job ───────────────────────────────
const tok = await issueClaimToken({ hiringSignalId: signal.id, issuedBy: 'ops' })
ok('claim: token issued with a claimUrl (opaque, no PII)', !!tok.token && tok.claimUrl.includes(`/claim/${tok.token}`) && !/@/.test(tok.claimUrl))
ok('claim: prefill view is redacted (market/role only, no employer body)', await (async () => { const v = await claimPrefill(tok.token); return !!v && v.roleCategory === 'home_health_rn' && !('description' in (v as any)) })())
ok('claim: rejected without certification', await (async () => { try { await authorizeAndClaim({ token: tok.token, certificationChecked: false, certificationText: 'x', employerName: 'ABC', employerAuthorizedBy: 'Jane', title: 'Registered Nurse - Home Health', requiredLicenseState: ST }); return false } catch { return true } })())
const claim = await authorizeAndClaim({ token: tok.token, certificationChecked: true, certificationText: 'I am authorized…', employerName: `ABC Home Health ${run}`, employerAuthorizedBy: 'Jane Doe, DON', title: 'Registered Nurse - Home Health', description: 'Full-time. Day shift.', requiredLicenseState: ST, setting: 'home_health', payMin: 38, payMax: 50, payUnit: 'hour', benefits: ['health_insurance', 'pto'] })
const minted = (await store.demandJobs.get(claim.jobId))!
ok('claim: ClaimedEmployerJob records authorization (who + cert text)', !!claim.claimedJob.employerAuthorizedBy && !!claim.claimedJob.certificationText && claim.claimedJob.florenceRnJobId === claim.jobId)
ok('claim: minted job is origin=claimed_signal + displayAllowed + employerClaimed + back-linked', minted.origin === 'claimed_signal' && minted.displayAllowed === true && minted.employerClaimed === true && minted.claimedJobId === claim.claimedJob.id)
ok('claim: minted job carries listed pay verbatim from the employer ($38–$50/hr)', minted.listedPayMin === 38 && minted.listedPayMax === 50)
ok('claim: signal flipped employerClaimed; token consumed', (await store.hiringSignals.get(signal.id))!.employerClaimed === true && (await store.claimTokens.byToken(tok.token))!.status === 'claimed')
ok('claim: re-using a consumed token is rejected', await (async () => { try { await authorizeAndClaim({ token: tok.token, certificationChecked: true, certificationText: 'x', employerName: 'ABC', employerAuthorizedBy: 'Jane', title: 'RN', requiredLicenseState: ST }); return false } catch { return true } })())

// ── L2: minted job flows through the Opportunity Graph as a partner ──────────
const card = await buildPublicCard(minted)
ok('claim: minted job renders a public card (Apply-with-packet partner state)', card.opportunityState === 'direct_partner' && card.cta === 'apply_with_packet', `${card.opportunityState}/${card.cta}`)
ok('claim: resolveOpportunityState = direct_partner (employer upserted as direct)', (await resolveOpportunityState(minted)) === 'direct_partner')

// ── content-leak guard: a non-displayable job is refused by the card builder ─
ok('guard: buildPublicCard refuses a non-displayable job', await (async () => { try { await buildPublicCard({ ...minted, displayAllowed: false }); return false } catch { return true } })())

// ── L3: category interest tiles ─────────────────────────────────────────────
const I_CITY = `inttest${run}`
const im = normalizeMarket(I_CITY, ST)
await registerMarketInterest({ city: I_CITY, state: ST, roleCategory: 'dialysis_rn', fullName: `Nurse ${run}`, email: `n.${run}@t.dev`, readinessStatus: 'near_licensed', consentToShareAggregate: true })
await registerMarketInterest({ city: I_CITY, state: ST, roleCategory: 'dialysis_rn', fullName: `NoConsent ${run}`, email: `nc.${run}@t.dev`, readinessStatus: 'pathway_first', consentToShareAggregate: false })
const tiles = await listCategoryTiles({ state: ST })
const dialysisTile = tiles.find((t) => t.market === im.key && t.roleCategory === 'dialysis_rn')
ok('tiles: consented interest counted; non-consented excluded (1, not 2)', dialysisTile?.interestCount === 1, String(dialysisTile?.interestCount))
ok('tiles: unclaimed tile CTA is im_interested', dialysisTile?.cta === 'im_interested')
ok('interest: emits demand.market_interest_registered (NOT a per-job interest)', (await store.attribution.all()).some((e) => e.eventType === 'demand.market_interest_registered' && e.metadata?.market === im.key))
const claimedTile = tiles.find((t) => t.roleCategory === 'home_health_rn' && t.market === market.key)
ok('tiles: a claimed market×role tile flips to view_role', claimedTile?.claimed === true && claimedTile?.cta === 'view_role')

// ── L4: lead scoring tiers ──────────────────────────────────────────────────
// Add state-licensed supply for the dialysis market → expect Tier A (demand+interest+supply).
const lic: FlorenceCandidate = { id: uid(), fullName: `Lic ${run}`, email: `lic.${run}@t.dev`, specialtyExperience: ['dialysis'], readinessBand: 'green', nclexStatus: 'passed', licenseStatus: 'issued', targetStates: [ST], employerShareConsent: 'granted', humanQaStatus: 'approved', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
await store.candidates.insert(lic)
// A signal in the dialysis market so it has demand too.
await recordHiringSignal({ sourceType: 'manual', city: I_CITY, state: ST, roleCategory: 'dialysis_rn' })
const leads = await rankLongTailLeads(100)
const dialysisLead = leads.find((l) => l.market === im.key && l.roleCategory === 'dialysis_rn')
ok('leads: dialysis market (demand+interest+state supply) → Tier A', dialysisLead?.tier === 'A', JSON.stringify({ tier: dialysisLead?.tier, sig: dialysisLead?.signalCount, int: dialysisLead?.interestCount, lic: dialysisLead?.licensedSupply }))
ok('leads: supply is labeled state-level in the rationale (not city)', !!dialysisLead?.rationale.some((r) => /state-level/.test(r)))
// A demand-only signal in a fresh market → Tier C.
const C_CITY = `ctest${run}`; const cm = normalizeMarket(C_CITY, ST)
await recordHiringSignal({ sourceType: 'manual', city: C_CITY, state: ST, roleCategory: 'hospice_rn' })
const cLead = (await rankLongTailLeads(200)).find((l) => l.market === cm.key && l.roleCategory === 'hospice_rn')
ok('leads: demand-only market → Tier C', cLead?.tier === 'C', cLead?.tier)

// ── L5: outreach DRAFT ──────────────────────────────────────────────────────
const draft = await buildOutreachDraft({ employerName: `ABC Home Health ${run}`, city: CITY, state: ST, roleCategory: 'home_health_rn', issuedBy: 'ops' })
ok('outreach: 4-step DRAFT cadence', draft.status === 'draft' && draft.sequence.length === 4)
ok('outreach: references the claim link + per-RN/month model', !!draft.claimUrl && /per-RN\/month|per RN/i.test(draft.sequence.map((s) => s.body).join(' ')))
ok('outreach: NO FICA/tax/visa language anywhere', !/fica|payroll.?tax|visa|immigration/i.test(JSON.stringify(draft)))
ok('outreach: emits longtail.outreach_drafted', (await store.attribution.all()).some((e) => e.eventType === 'longtail.outreach_drafted'))
const opdf = renderOutreachPdf(draft)
ok('outreach: renders a valid PDF', opdf.length > 1000 && opdf.subarray(0, 4).toString() === '%PDF', `${opdf.length} bytes`)

// ── L7: claimed_signal excluded from GTM aggregates ─────────────────────────
const ranked = await rankAccounts(500)
ok('exclusion: claimed long-tail employer is NOT in rankAccounts (no GTM pollution)', !ranked.some((r) => r.employer === `ABC Home Health ${run}`))
const dash = await dashboardSummary()
const claimedStillExists = !!(await store.demandJobs.get(claim.jobId))
ok('exclusion: claimed job exists but Demand Radar dashboard excludes its origin', claimedStillExists && typeof dash.jobs.open === 'number')

console.log(`\n${fail ? 'LONG-TAIL SMOKE FAILED' : 'LONG-TAIL SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
