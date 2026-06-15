// Long-Tail Demand Radar — signal capture + employer claim minting + category interest.
// COMPLIANCE CORE: a HiringSignal is a LEAD ONLY (Craigslist/local boards are never
// scraped/copied). It is NEVER a FlorenceRNJob and has no candidate-facing route. A real,
// displayable FlorenceRNJob is minted ONLY at employer claim time, after certification.
import { randomBytes } from 'node:crypto'
import { store, uid, now } from '../db'
import { ingestRows, type IngestRow } from './ingest'
import { jobFingerprint } from './fingerprint'
import { registerInterest } from './interest'
import { normalizeMarket, parseMarket, roleCategoryOf } from '../../shared/market'
import { emitPassport, passportEnabled } from '../passport'
import type {
  HiringSignal, ClaimedEmployerJob, NurseMarketInterest, ClaimToken,
  LongTailSourceType, RoleCategory, NurseReadinessStatus, Confidence, DemandSetting, DemandSource, FlorenceRNJob,
} from '../../shared/demand-types'
import type { EmployerAccount, FlorenceCandidate } from '../../shared/types'

const CERT_REQUIRED_SOURCES: LongTailSourceType[] = ['craigslist_signal', 'career_page', 'job_api']

// ── Hiring signals ──────────────────────────────────────────────────────────
export interface RecordSignalArgs {
  sourceType: LongTailSourceType
  employerName?: string
  city?: string
  state: string
  roleCategory?: RoleCategory
  setting?: DemandSetting
  sourceUrl?: string
  observedAt?: string
  reviewer?: string
  confidence?: Confidence
  notes?: string
}

/** Record a lead signal. Stores only transcribed lead facts (role/market/setting + URL as an
 *  INTERNAL reference) — NEVER the posting body. craigslist_signal is hard-locked to
 *  displayAllowed=false and requires sourceUrl + observedAt + reviewer (compliance). */
export async function recordHiringSignal(args: RecordSignalArgs): Promise<HiringSignal> {
  const m = normalizeMarket(args.city, args.state)
  const needsProvenance = CERT_REQUIRED_SOURCES.includes(args.sourceType)
  if (needsProvenance) {
    if (!args.sourceUrl?.trim()) throw new Error('sourceUrl is required for this source type (compliance)')
    if (!args.observedAt?.trim()) throw new Error('observedAt is required (compliance)')
    if (args.sourceType === 'craigslist_signal' && !args.reviewer?.trim()) throw new Error('reviewer is required for a craigslist_signal (compliance)')
  }
  const roleCategory = args.roleCategory ?? roleCategoryOf(undefined, args.setting)
  const signal: HiringSignal = {
    id: uid(), sourceType: args.sourceType, employerName: args.employerName?.trim() || undefined,
    market: m.key, marketDisplay: m.display, roleCategory, setting: args.setting,
    sourceUrl: args.sourceUrl?.trim() || undefined, observedAt: args.observedAt?.trim() || now(),
    reviewer: args.reviewer?.trim() || undefined, confidence: args.confidence ?? 'medium',
    displayAllowed: false, employerClaimed: false, notes: args.notes, createdAt: now(),
  }
  await store.hiringSignals.insert(signal)
  await store.attribution.insert({ id: uid(), eventType: 'longtail.signal_observed', sourceSystem: 'long_tail_radar', metadata: { market: m.key, roleCategory, sourceType: args.sourceType, displayAllowed: false }, occurredAt: now() })
  return signal
}

// ── Claim tokens (opaque, no PII — mirrors links.ts) ────────────────────────
const claimCode = (): string => `clm_${randomBytes(12).toString('base64url')}`

export async function issueClaimToken(args: { hiringSignalId?: string; market?: string; state?: string; city?: string; roleCategory?: RoleCategory; prefillTitle?: string; issuedBy: string }): Promise<ClaimToken & { claimUrl: string }> {
  let market = args.market, marketDisplay: string | undefined, roleCategory = args.roleCategory
  let signal: HiringSignal | null = null
  if (args.hiringSignalId) {
    signal = await store.hiringSignals.get(args.hiringSignalId)
    if (!signal) throw new Error('unknown hiringSignalId')
    market = signal.market; marketDisplay = signal.marketDisplay; roleCategory = signal.roleCategory
  } else {
    const m = normalizeMarket(args.city, args.state)
    market = m.key; marketDisplay = m.display
  }
  if (!market || !roleCategory) throw new Error('market + roleCategory (or a hiringSignalId) are required')
  const token: ClaimToken = {
    id: uid(), token: claimCode(), hiringSignalId: args.hiringSignalId, market, marketDisplay, roleCategory,
    prefillTitle: args.prefillTitle, status: 'issued', issuedBy: args.issuedBy, createdAt: now(),
  }
  await store.claimTokens.insert(token)
  if (signal) { signal.claimTokenId = token.id; await store.hiringSignals.update(signal) }
  await store.attribution.insert({ id: uid(), eventType: 'longtail.claim_token_issued', sourceSystem: 'long_tail_radar', metadata: { market, roleCategory, signalId: args.hiringSignalId }, occurredAt: now() })
  const base = process.env.ATS_CONNECT_BASE_URL ?? `http://localhost:${process.env.PORT ?? 8788}`
  return { ...token, claimUrl: `${base}/claim/${token.token}` }
}

/** Redacted prefill view for the public /claim/:token page (no PII, no Craigslist content). */
export async function claimPrefill(token: string): Promise<{ market: string; marketDisplay?: string; roleCategory: RoleCategory; prefillTitle?: string } | null> {
  const t = await store.claimTokens.byToken(token)
  if (!t || t.status !== 'issued') return null
  return { market: t.market, marketDisplay: t.marketDisplay, roleCategory: t.roleCategory, prefillTitle: t.prefillTitle }
}

// ── Claim → mint a displayable FlorenceRNJob ────────────────────────────────
const CLAIMS_SOURCE_NAME = 'longtail-claims'
async function getClaimsSourceId(): Promise<string> {
  const existing = (await store.demandSources.all()).find((s) => s.name === CLAIMS_SOURCE_NAME)
  if (existing) return existing.id
  const src: DemandSource = { id: uid(), sourceType: 'manual', name: CLAIMS_SOURCE_NAME, robotsStatus: 'reviewed_ok', tosStatus: 'reviewed_ok', crawlAllowed: false, createdAt: now() }
  await store.demandSources.insert(src)
  return src.id
}

async function upsertDirectEmployer(name: string): Promise<EmployerAccount> {
  const existing = (await store.employers.all()).find((e) => e.name.toLowerCase() === name.toLowerCase())
  if (existing) return existing
  const e: EmployerAccount = {
    id: uid(), name, atsProvider: 'manual', integrationStatus: 'manual',
    defaultBillingModel: 'direct', sourceChannel: 'direct', createdAt: now(), updatedAt: now(),
  }
  await store.employers.insert(e)
  return e
}

export interface AuthorizeClaimArgs {
  token: string
  certificationChecked: boolean
  certificationText: string
  employerName: string
  employerAuthorizedBy: string
  title: string
  description?: string
  location?: string
  requiredLicenseState?: string
  setting?: DemandSetting
  payMin?: number
  payMax?: number
  payUnit?: ClaimedEmployerJob['payUnit']
  benefits?: ClaimedEmployerJob['benefits']
}

export async function authorizeAndClaim(args: AuthorizeClaimArgs): Promise<{ claimedJob: ClaimedEmployerJob; jobId: string }> {
  const t = await store.claimTokens.byToken(args.token)
  if (!t || t.status !== 'issued') throw new Error('claim link is invalid or already used')
  if (args.certificationChecked !== true) throw new Error('authorization certification is required')
  if (!args.employerAuthorizedBy?.trim()) throw new Error('employerAuthorizedBy is required')
  if (!args.employerName?.trim()) throw new Error('employerName is required')
  if (!args.title?.trim()) throw new Error('title is required')

  const employer = await upsertDirectEmployer(args.employerName.trim())
  // Resolve the market: prefer the token's market (so the minted job lands in the SAME
  // market×role tile as the originating signal), else derive from the supplied location.
  const fromLoc = parseMarket(args.location)
  const marketDisplay = t.marketDisplay ?? fromLoc?.display
  const state = (args.requiredLicenseState?.trim() || fromLoc?.state || t.market.split('|')[1] || '').toUpperCase()
  if (!/^[A-Z]{2}$/.test(state)) throw new Error('a 2-letter requiredLicenseState (or "City, ST" location) is required')
  // City: explicit location → token market city → none (statewide). Keeps the tile key aligned.
  const locCity = args.location && args.location.includes(',') ? args.location.split(',')[0]?.trim() : undefined
  const tokenCity = t.market.includes('|') ? t.market.split('|')[0] : undefined
  const city = locCity || (tokenCity && tokenCity !== 'statewide' ? tokenCity : undefined)

  const claimId = uid()
  const claimed: ClaimedEmployerJob = {
    id: claimId, hiringSignalId: t.hiringSignalId, employerId: employer.id,
    employerAuthorizedBy: args.employerAuthorizedBy.trim(), authorizationTimestamp: now(), certificationText: args.certificationText,
    title: args.title.trim(), description: args.description, location: args.location ?? marketDisplay ?? state,
    city, state, requiredLicenseState: state,
    roleCategory: t.roleCategory, setting: args.setting,
    payMin: args.payMin, payMax: args.payMax, payUnit: args.payUnit, benefits: args.benefits,
    status: 'live', createdAt: now(), updatedAt: now(),
  }

  // Mint a real FlorenceRNJob via the standard ingest pipeline (req-keyed by the claim id
  // so its fingerprint can NEVER collide with a vague-employer signal fingerprint).
  const row: IngestRow = {
    employerName: employer.name, title: claimed.title, description: args.description,
    city: claimed.city, state, atsRequisitionId: `CLAIM-${claimId}`, atsProvider: 'manual',
    sourceUrl: undefined, // NEVER echo a Craigslist URL to candidates
  }
  await ingestRows(await getClaimsSourceId(), 'manual', [row])
  const fp = jobFingerprint({ employerName: employer.name, title: claimed.title, city: claimed.city, state, atsRequisitionId: `CLAIM-${claimId}` })
  const job = await store.demandJobs.byFingerprint(fp)
  if (!job) throw new Error('failed to mint job from claim (title may not classify as RN)')

  // Patch the minted job: partner relationship + displayable + claimed provenance + listed pay verbatim.
  job.employerId = employer.id
  job.origin = 'claimed_signal'
  job.displayAllowed = true
  job.employerClaimed = true
  job.claimedJobId = claimId
  if (args.setting) job.setting = args.setting
  if (args.payMin != null) { job.listedPayMin = args.payMin; job.listedPayMax = args.payMax; job.listedPayUnit = args.payUnit ?? 'hour' }
  if (args.benefits?.length) { job.benefitsExtracted = args.benefits }
  await store.demandJobs.update(job)
  if (args.benefits?.length) await store.jobBenefits.insert({ id: uid(), jobId: job.id, benefits: args.benefits, sourceType: 'manual_research', capturedAt: now() })

  claimed.florenceRnJobId = job.id
  await store.claimedJobs.insert(claimed)

  // Flip the signal + token.
  if (t.hiringSignalId) { const s = await store.hiringSignals.get(t.hiringSignalId); if (s) { s.employerClaimed = true; await store.hiringSignals.update(s) } }
  t.status = 'claimed'; t.claimedAt = now(); await store.claimTokens.update(t)

  await store.attribution.insert({ id: uid(), employerId: employer.id, jobId: job.id, eventType: 'longtail.job_claimed', sourceSystem: 'long_tail_radar', metadata: { employerId: employer.id, florenceRnJobId: job.id, market: t.market, roleCategory: t.roleCategory }, occurredAt: now() })
  return { claimedJob: claimed, jobId: job.id }
}

// ── Category-level nurse interest (NOT per-job) ─────────────────────────────
export interface MarketInterestArgs {
  market?: string
  city?: string
  state: string
  roleCategory: RoleCategory
  setting?: DemandSetting
  fullName: string
  email?: string
  phone?: string
  readinessStatus?: NurseReadinessStatus
  trackingClickId?: string
  consentToShareAggregate: boolean
}

/** A nurse expresses interest in a market×role category (no job yet). Reuses the lead-candidate
 *  + consent pattern; emits demand.market_interest_registered (NOT in the source→start funnel). */
export async function registerMarketInterest(args: MarketInterestArgs): Promise<NurseMarketInterest> {
  if (!args.fullName?.trim()) throw new Error('fullName is required')
  if (!args.email && !args.phone) throw new Error('email or phone is required')
  const m = normalizeMarket(args.city, args.state)
  const email = args.email?.trim().toLowerCase()
  let candidate: FlorenceCandidate | null = null
  if (email) candidate = (await store.candidates.all()).find((c) => c.email?.toLowerCase() === email) ?? null
  if (!candidate) {
    candidate = {
      id: uid(), sourceCandidateId: 'market_interest', fullName: args.fullName.trim(), email, phone: args.phone?.trim(),
      specialtyExperience: [], readinessBand: 'red', nclexStatus: 'unknown', licenseStatus: 'unknown',
      targetStates: [m.state], employerShareConsent: args.consentToShareAggregate ? 'granted' : 'not_requested',
      humanQaStatus: 'pending', createdAt: now(), updatedAt: now(),
    }
    await store.candidates.insert(candidate)
  }
  let consentId: string | undefined
  if (args.consentToShareAggregate) {
    consentId = uid()
    if (passportEnabled) void emitPassport({ email: candidate.email ?? undefined, ref: { app: 'demand_radar', externalId: candidate.id } }, 'consent.updated', { scope: 'demand_radar', status: 'granted' })
  }
  const interest: NurseMarketInterest = {
    id: uid(), candidateId: candidate.id, market: m.key, marketDisplay: m.display, roleCategory: args.roleCategory,
    setting: args.setting, readinessStatus: args.readinessStatus ?? 'pathway_first',
    consentToShareAggregate: args.consentToShareAggregate, consentId, trackingClickId: args.trackingClickId, createdAt: now(),
  }
  await store.marketInterest.insert(interest)
  // NEW event — deliberately NOT in the source→start FUNNEL (no double-count vs per-job interest).
  await store.attribution.insert({ id: uid(), candidateId: candidate.id, eventType: 'demand.market_interest_registered', sourceSystem: 'long_tail_radar', metadata: { market: m.key, roleCategory: args.roleCategory, readinessStatus: interest.readinessStatus, consent: args.consentToShareAggregate }, occurredAt: now() })
  return interest
}

export interface CategoryTile {
  market: string
  marketDisplay: string
  roleCategory: RoleCategory
  signalCount: number
  interestCount: number // consented aggregate only
  claimed: boolean
  claimedJobId?: string
  cta: 'im_interested' | 'view_role'
}

/** Aggregate category×market tiles. Counts ONLY — never PII. interestCount counts only
 *  consentToShareAggregate rows. Optionally filtered to a state. */
export async function listCategoryTiles(opts: { state?: string } = {}): Promise<CategoryTile[]> {
  const [signals, interests, claimed] = await Promise.all([store.hiringSignals.all(), store.marketInterest.all(), store.claimedJobs.all()])
  const claimedByKey = new Map<string, { c: ClaimedEmployerJob; display: string }>()
  for (const c of claimed) {
    const job = c.florenceRnJobId ? await store.demandJobs.get(c.florenceRnJobId) : null
    const m = job ? normalizeMarket(job.city, job.state ?? job.requiredLicenseState ?? '') : null
    if (m) claimedByKey.set(`${m.key}|${c.roleCategory}`, { c, display: m.display })
  }
  const tiles = new Map<string, CategoryTile>()
  const touch = (market: string, marketDisplay: string, roleCategory: RoleCategory): CategoryTile => {
    const k = `${market}|${roleCategory}`
    let t = tiles.get(k)
    if (!t) { t = { market, marketDisplay, roleCategory, signalCount: 0, interestCount: 0, claimed: false, cta: 'im_interested' }; tiles.set(k, t) }
    return t
  }
  for (const s of signals) {
    if (opts.state && !s.market.endsWith(`|${opts.state.toUpperCase()}`)) continue
    touch(s.market, s.marketDisplay ?? s.market, s.roleCategory).signalCount += 1
  }
  for (const i of interests) {
    if (!i.consentToShareAggregate) continue // aggregate counts only consented rows
    if (opts.state && !i.market.endsWith(`|${opts.state.toUpperCase()}`)) continue
    touch(i.market, i.marketDisplay ?? i.market, i.roleCategory).interestCount += 1
  }
  for (const [k, { c, display }] of claimedByKey) {
    const [market, roleCategory] = [k.slice(0, k.lastIndexOf('|')), k.slice(k.lastIndexOf('|') + 1) as RoleCategory]
    if (opts.state && !market.endsWith(`|${opts.state.toUpperCase()}`)) continue
    const t = touch(market, display, roleCategory)
    t.claimed = true; t.claimedJobId = c.florenceRnJobId; t.cta = 'view_role'
  }
  return [...tiles.values()].sort((a, b) => (b.interestCount + b.signalCount) - (a.interestCount + a.signalCount))
}
