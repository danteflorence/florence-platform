// ============================================================================
// FlorenceRN Demand Radar — the demand-intelligence + attribution model.
// Public/partner RN openings are ingested as RawJobPosting, normalized + deduped
// into a canonical FlorenceRNJob (with all discovered JobSources preserved),
// priced into JobEconomics via the Workforce Economist, surfaced through tracked
// links, and turned into nurse interest + attribution that feeds the Production
// Ledger. This is the PRE-ATS layer: it proves demand before native ATS submit.
// ============================================================================

// --- ingestion --------------------------------------------------------------

export type DemandSourceType =
  | 'greenhouse_board'
  | 'icims_portal'
  | 'career_page'
  | 'csv'
  | 'partner_feed'
  | 'manual'
  | 'lever_postings'
  | 'ashby'
  | 'smartrecruiters'

export type PayTransparencyJurisdiction = 'CA' | 'NY' | 'CO' | 'WA' | 'IL' | 'none'
export type CrawlCadence = 'daily' | 'weekly' | 'manual'

/** A registered place we pull demand from. Carries the compliance posture so the
 *  crawler can NEVER fetch a domain that hasn't been robots/ToS-reviewed. */
export interface DemandSource {
  id: string
  sourceType: DemandSourceType
  name: string
  baseUrl?: string // for greenhouse_board this is the board token; for partner_feed the feed URL
  careerSiteUrl?: string // the employer's public careers page (target-employer registry)
  atsProvider?: string
  publicApiAvailable?: boolean
  payTransparencyJurisdiction?: PayTransparencyJurisdiction
  crawlCadence?: CrawlCadence
  priority?: number // sales/data sequencing weight
  channelOwner?: string // 'AMN account' vs a direct-target owner
  /** Compliance gates — a career-page crawl runs ONLY when crawlAllowed === true. */
  robotsStatus: 'unknown' | 'reviewed_ok' | 'reviewed_blocked'
  tosStatus: 'unknown' | 'reviewed_ok' | 'reviewed_blocked'
  crawlAllowed: boolean
  rateLimitPerMin?: number
  lastReviewedAt?: string
  lastPulledAt?: string
  notes?: string
  createdAt: string
}

/** The unprocessed posting exactly as retrieved — the audit trail + reprocessing source. */
export interface RawJobPosting {
  id: string
  demandSourceId: string
  sourceType: DemandSourceType
  sourceUrl?: string
  atsProvider?: string
  atsRequisitionId?: string
  rawPayload: Record<string, unknown>
  contentHash: string
  firstSeenAt: string
  lastSeenAt: string
}

// --- canonical job ----------------------------------------------------------

export type NormalizedRole = 'registered_nurse' | 'licensed_vocational_nurse' | 'nurse_manager' | 'other'
export type DemandSpecialty =
  | 'med_surg' | 'icu' | 'er' | 'telemetry' | 'home_health' | 'dialysis'
  | 'hospice' | 'snf' | 'clinic' | 'l_and_d' | 'or' | 'peds' | 'psych' | 'other'
export type DemandSetting =
  | 'hospital' | 'home_health' | 'home_care' | 'snf' | 'asc' | 'dialysis'
  | 'hospice' | 'clinic' | 'physician_practice' | 'other'
export type DemandJobStatus = 'open' | 'closed' | 'stale' | 'unknown'
export type Confidence = 'high' | 'medium' | 'low'
export type PayUnit = 'hour' | 'year' | 'month'

/** The canonical, deduplicated FlorenceRN view of an RN opening. */
export interface FlorenceRNJob {
  id: string
  employerId?: string
  employerName: string
  facilityId?: string
  facilityName?: string
  fingerprint: string // dedup key (see fingerprint.ts)
  title: string
  normalizedRole: NormalizedRole
  specialty?: DemandSpecialty
  setting?: DemandSetting
  city?: string
  state?: string
  country?: string
  requiredLicenseState?: string
  shift?: 'day' | 'night' | 'variable' | 'unknown'
  employmentType?: 'full_time' | 'part_time' | 'per_diem' | 'contract' | 'unknown'
  openingsEstimate?: number
  // --- provenance (denormalized from the raw posting / best job source) ---
  sourceUrl?: string
  atsProvider?: string
  atsRequisitionId?: string
  // --- LISTED pay: parsed verbatim from the employer posting. NEVER inferred. ---
  listedPayMin?: number
  listedPayMax?: number
  listedPayUnit?: PayUnit
  // --- ESTIMATED pay: FlorenceRN local-market range (always hourly). NEVER shown as posted. ---
  estimatedPayMin?: number
  estimatedPayMax?: number
  estimatedPayConfidence?: Confidence
  // --- pay-transparency: a CA/etc posting that omitted a pay range (informational only) ---
  payTransparencyFlag?: boolean
  payTransparencyNote?: string
  // --- benefits (denormalized tags from the latest JobBenefits; see JobBenefits) ---
  benefitsExtracted?: JobBenefitTag[]
  benefitsSourceUrl?: string
  // --- Long-Tail Demand Radar (additive) ---
  /** Default-deny gate: a job is candidate-readable ONLY when true. Demand-Radar jobs are
   *  displayable; a claimed-signal job is set true at claim time. Unclaimed signals are NEVER jobs. */
  displayAllowed?: boolean
  /** Provenance class — 'claimed_signal' jobs are EXCLUDED from AMN/GTM aggregates (rankAccounts etc.). */
  origin?: 'demand_radar' | 'claimed_signal'
  employerClaimed?: boolean
  claimedJobId?: string // back-link to the ClaimedEmployerJob authorization record
  status: DemandJobStatus
  confidence: Confidence
  firstSeenAt: string
  lastSeenAt: string
}

// --- benefits ----------------------------------------------------------------

export type JobBenefitTag =
  | 'health_insurance' | 'retirement_401k' | 'pto' | 'tuition_support'
  | 'relocation' | 'shift_differential' | 'union'
export type JobBenefitsSourceType = 'job_posting' | 'employer_benefits_page' | 'manual_research'

/** Benefits attached to a job, with clean source attribution (never overpromised). */
export interface JobBenefits {
  id: string
  jobId: string
  benefits: JobBenefitTag[]
  sourceType: JobBenefitsSourceType
  sourceUrl?: string
  capturedAt: string
}

/** Every place a canonical job was discovered (career site + aggregator collapse to one job). */
export interface JobSource {
  id: string
  jobId: string
  rawJobPostingId: string
  demandSourceId: string
  sourceType: DemandSourceType
  sourceUrl?: string
  atsProvider?: string
  atsRequisitionId?: string
}

// --- economics (Workforce Economist) ----------------------------------------

export interface JobEconomics {
  id: string
  jobId: string
  estimatedStaffWageHourly?: number
  estimatedLoadedStaffCostHourly?: number
  estimatedPremiumLaborCostHourly?: number
  agencyPremiumHourly?: number
  recommendedGrossFeePerRnMonth?: number
  /** Appears ONLY in the customer's effective-cost view — never FlorenceRN revenue. */
  estimatedPayrollTaxOffsetPerRnMonth?: number
  effectiveCostPerRnMonth?: number
  estimatedNetValuePerRnMonth?: number
  amnMarkupPerRnMonth?: number
  channel?: string
  confidence: Confidence
  assumptions: string[]
  createdAt: string
}

// --- tracked links + clicks + attribution -----------------------------------

export type CampaignType = 'job_interest' | 'email' | 'partner' | 'ats_redirect' | 'university_affiliate'

export interface TrackingLink {
  id: string
  shortCode: string
  destinationUrl: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  campaignType?: CampaignType
  employerId?: string
  facilityId?: string
  jobId?: string
  universityId?: string
  cohortId?: string
  partnerId?: string
  createdBy?: string
  createdAt: string
}

/** A first-party click. The opaque frnClickId is the ONLY join key in URLs — no PII. */
export interface TrackingClick {
  id: string
  trackingLinkId: string
  frnClickId: string
  anonymousVisitorId?: string
  candidateId?: string
  employerUserId?: string
  ipHash?: string
  userAgentHash?: string
  referrer?: string
  clickedAt: string
}

// --- candidate interest -----------------------------------------------------

export type InterestStatus =
  | 'interested' | 'not_eligible' | 'licensed_packet_ready' | 'pathway_first' | 'withdrawn'

/** Candidate-curated bucket in the Opportunity Basket cockpit (the nurse's own triage). */
export type OpportunityBucket =
  | 'interested' | 'shortlisted' | 'apply_when_licensed' | 'apply_now' | 'not_eligible'

/** A nurse expressing interest — NOT an application. Gated by consent before any share. */
export interface CandidateJobInterest {
  id: string
  candidateId: string
  jobId: string
  trackingClickId?: string
  status: InterestStatus
  consentId?: string
  /** The nurse's own basket bucket (cockpit triage); independent of eligibility status. */
  bucket?: OpportunityBucket
  createdAt: string
}

// --- attribution ------------------------------------------------------------

/** The source→start spine: click → interest → packet → interview → offer → start. */
export interface AttributionEvent {
  id: string
  frnClickId?: string
  candidateId?: string
  employerId?: string
  facilityId?: string
  jobId?: string
  applicationPacketId?: string
  eventType: string
  sourceSystem: string
  metadata?: Record<string, unknown>
  occurredAt: string
}

// --- demand reservations ----------------------------------------------------
// A SOFT, priced, cancellable commitment of FlorenceRN capacity to an employer's
// demand — NOT a job status, NOT a billing event, NOT exclusive. Reservations are a
// demand-layer signal; verified starts (ledger) stay the billing-grade truth. A
// reservation never triggers billing, payment, or any employer-facing action.
//
// Attribution events (sourceSystem='demand_radar'; demand.* prefix — no ats.*/billing.* collision):
//   demand.reservation_created   { jobId, employerId?, perRnMonthlyFeeUsd, feeSource }
//   demand.reservation_cancelled { reservationId, reason? }
//   demand.reservation_filled    { reservationId, candidateId? }
export type ReservationStatus = 'live' | 'cancelled' | 'filled'
export type ReservationFeeSource = 'pricing_api' | 'fallback' | 'override'

export interface DemandReservation {
  id: string
  jobId: string
  employerId?: string
  employerName: string // denormalized for cockpit display
  nurseId?: string // OPTIONAL opaque candidate ref — NEVER name/email (no PII)
  perRnMonthlyFeeUsd: number // SNAPSHOT held at reservation time (market shifts don't mutate it)
  feeSource: ReservationFeeSource
  ficaOffsetPerRnUsd?: number // customer-side reducer snapshot; NEVER revenue
  status: ReservationStatus
  ttlDays?: number // soft TTL (advisory; null = until job closes)
  expiresAt?: string // reservedAt + ttlDays, advisory only (no auto-delete)
  // --- Richer capacity-reservation detail (all optional; additive, JSON blob) ---
  specialty?: DemandSpecialty
  region?: string // state or MSA the reservation targets
  volume?: number // # of RN starts reserved (default 1)
  startWindow?: string // e.g. 'Q3 2026'
  channel?: 'amn' | 'direct'
  slateStatus?: 'licensed' | 'near_licensed' | 'pathway_first' // supply maturity backing the reservation
  confidence?: Confidence
  gate?: string // the milestone that must clear before this converts (e.g. 'NCLEX pass')
  reservedAt: string
  cancelledAt?: string
  filledAt?: string
  cancelReason?: string
  notes?: string
}

// --- reconciliation ---------------------------------------------------------

export type ReconciliationStatus =
  | 'packet_shared' | 'packet_viewed' | 'interview_requested' | 'interview_scheduled'
  | 'interview_completed' | 'offer_made' | 'offer_accepted' | 'start_date_set'
  | 'started' | 'rejected' | 'withdrawn' | 'retained_30' | 'retained_60' | 'retained_90'

export interface ReconciliationEvent {
  id: string
  source: 'csv' | 'manual' | 'amn_update' | 'employer_update' | 'ats_webhook'
  candidateId?: string
  jobId?: string
  applicationPacketId?: string
  status: ReconciliationStatus
  occurredAt: string
  notes?: string
  createdAt: string
}

// --- Long-Tail Demand Radar -------------------------------------------------
// Extends Demand Radar into small/mid healthcare employers. Craigslist & local
// boards are a LEAD SIGNAL ONLY (never scraped/copied — ToS forbids it). A
// HiringSignal is never a FlorenceRNJob and has NO candidate-facing route; a real
// (displayable) FlorenceRNJob is minted ONLY at employer claim time.
//
// Attribution events (sourceSystem='long_tail_radar'; longtail.*/demand.market_* — no funnel collision):
//   longtail.signal_observed            { market, roleCategory, sourceType, displayAllowed }
//   longtail.claim_token_issued         { market, roleCategory, signalId? }
//   longtail.job_claimed                { employerId, florenceRnJobId, market, roleCategory }
//   demand.market_interest_registered   { market, roleCategory, readinessStatus, consent }  (NOT in the source→start FUNNEL)
//   longtail.outreach_drafted           { employerId?, market, roleCategory }

export type LongTailSourceType = 'craigslist_signal' | 'career_page' | 'job_api' | 'partner_feed' | 'manual'
export type RoleCategory =
  | 'home_health_rn' | 'dialysis_rn' | 'hospice_rn' | 'snf_rn' | 'clinic_rn' | 'asc_rn' | 'other_rn'
export type LeadTier = 'A' | 'B' | 'C' | 'D'
export type ClaimedJobStatus = 'draft' | 'live' | 'paused' | 'closed'
export type NurseReadinessStatus = 'licensed' | 'near_licensed' | 'pathway_first'

/** A pre-canonical hiring lead. NEVER displayed to candidates; only a human-transcribed
 *  audit trail (role/market/setting + URL as an INTERNAL reference) — never the posting body. */
export interface HiringSignal {
  id: string
  sourceType: LongTailSourceType
  employerName?: string
  market: string // normalized key from normalizeMarket()
  marketDisplay?: string // human-readable "City, ST"
  roleCategory: RoleCategory
  setting?: DemandSetting
  sourceUrl?: string // REQUIRED for craigslist_signal/career_page/job_api (internal reference)
  observedAt: string // REQUIRED (compliance: timestamp)
  reviewer?: string // REQUIRED for craigslist_signal (compliance: human reviewed)
  confidence: Confidence
  displayAllowed: boolean // default false; craigslist NEVER true unless authorized
  employerClaimed: boolean // default false; flips true when claimed
  claimTokenId?: string
  notes?: string
  createdAt: string
}

/** The employer's authorization record. Creating one mints a displayable FlorenceRNJob. */
export interface ClaimedEmployerJob {
  id: string
  hiringSignalId?: string
  employerId: string
  employerAuthorizedBy: string // person/role who certified (attestation)
  authorizationTimestamp: string
  certificationText: string // verbatim checkbox text accepted (audit)
  florenceRnJobId?: string // the minted FlorenceRNJob
  title: string
  description?: string
  location: string
  city?: string
  state?: string
  requiredLicenseState: string
  roleCategory: RoleCategory
  setting?: DemandSetting
  payMin?: number
  payMax?: number
  payUnit?: PayUnit
  benefits?: JobBenefitTag[]
  status: ClaimedJobStatus
  createdAt: string
  updatedAt: string
}

/** Category-level nurse interest by market×role (NOT per-job). Reuses the lead-candidate + consent pattern. */
export interface NurseMarketInterest {
  id: string
  candidateId: string // a lead candidate (sourceCandidateId:'market_interest')
  market: string
  marketDisplay?: string
  roleCategory: RoleCategory
  setting?: DemandSetting
  readinessStatus: NurseReadinessStatus
  consentToShareAggregate: boolean // gates counting in aggregate tiles
  consentToShareNamed?: boolean // separate, stricter consent for named sharing
  consentId?: string
  trackingClickId?: string
  createdAt: string
}

/** An opaque token backing the public /claim/:token deeplink (no PII). */
export interface ClaimToken {
  id: string
  token: string
  hiringSignalId?: string
  employerId?: string
  market: string
  marketDisplay?: string
  roleCategory: RoleCategory
  prefillTitle?: string
  status: 'issued' | 'claimed' | 'expired'
  issuedBy: string
  claimedAt?: string
  createdAt: string
}
