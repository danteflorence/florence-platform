// Per-job Candidate Fit Score + eligibility coaching. Reuses the SAME 7-signal,
// operator-editable matcher (shared/matching.ts) that drives the ATS slate — so a
// nurse's fit for a Demand-Radar opportunity is scored exactly like a real
// requisition. Pure: a deterministic function of (candidate, job). No IO.
import { matchCandidateToRequisition } from '../../shared/matching'
import { routeEligibility } from './interest'
import type { FlorenceCandidate, JobRequisition, MatchResult, CareSetting } from '../../shared/types'
import type { FlorenceRNJob, DemandSpecialty, DemandSetting } from '../../shared/demand-types'

// DemandSpecialty (canonical, snake_case) → the human specialty string the matcher's
// adjacency map understands ('med surg', 'emergency', …).
const SPECIALTY_TO_TEXT: Record<DemandSpecialty, string> = {
  med_surg: 'med surg', icu: 'icu', er: 'emergency', telemetry: 'telemetry', home_health: 'home health',
  dialysis: 'dialysis', hospice: 'hospice', snf: 'snf', clinic: 'clinic', l_and_d: 'labor and delivery',
  or: 'operating room', peds: 'pediatrics', psych: 'psychiatric', other: '',
}
const SETTING_TO_CARE: Record<DemandSetting, CareSetting> = {
  hospital: 'inpatient', home_health: 'home_health', home_care: 'home_care', snf: 'post_acute',
  asc: 'outpatient', dialysis: 'outpatient', hospice: 'post_acute', clinic: 'outpatient',
  physician_practice: 'outpatient', other: 'inpatient',
}

/** Build a synthetic requisition view of a Demand-Radar job so the existing matcher
 *  can score it. Only the fields the matcher reads carry meaning; the rest are
 *  sensible defaults (this is never persisted). */
export function jobToRequisitionShape(job: FlorenceRNJob): JobRequisition {
  const nowIso = '1970-01-01T00:00:00.000Z' // unused by the matcher; kept stable for purity
  return {
    id: `oppfit:${job.id}`,
    employerId: job.employerId ?? job.employerName,
    facilityId: job.facilityId,
    atsProvider: 'manual',
    atsRequisitionId: job.atsRequisitionId,
    title: job.title,
    specialty: job.specialty ? SPECIALTY_TO_TEXT[job.specialty] || undefined : undefined,
    setting: job.setting ? SETTING_TO_CARE[job.setting] : 'inpatient',
    city: job.city,
    state: job.state,
    country: job.country,
    requiredLicenseState: job.requiredLicenseState ?? job.state,
    shift: undefined,
    employmentType: undefined,
    openings: job.openingsEstimate,
    status: 'open',
    sourceChannel: 'direct',
    importedAt: nowIso,
    lastSyncedAt: nowIso,
  }
}

/** Score a candidate against a single Demand-Radar job (the 7-signal MatchResult). */
export function scoreCandidateForJob(candidate: FlorenceCandidate, job: FlorenceRNJob): MatchResult {
  return matchCandidateToRequisition(candidate, jobToRequisitionShape(job))
}

// ── Eligibility coaching (P2c) ───────────────────────────────────────────────
export type EligibilityState = 'licensed_now' | 'near_licensed' | 'pathway_first' | 'not_eligible'
export type StartFeasibility = 'now' | 'd30_60' | 'd60_120' | 'longer'

export interface EligibilityCoaching {
  state: EligibilityState
  startFeasibility: StartFeasibility
  /** Concrete, ordered next steps the nurse needs to become submittable for THIS job. */
  whatYouNeed: string[]
  etaNote: string
  fitScore: number
}

const norm = (s?: string) => (s ?? '').trim().toLowerCase()

/** Translate (candidate, job) into plain next-steps + an honest ETA. Built on the
 *  same routeEligibility + matcher blockers used elsewhere — never overpromising. */
export function eligibilityCoaching(candidate: FlorenceCandidate, job: FlorenceRNJob): EligibilityCoaching {
  const match = scoreCandidateForJob(candidate, job)
  const route = routeEligibility(candidate)
  const need = job.requiredLicenseState ?? job.state
  const stateInScope = !need || candidate.targetStates.map(norm).includes(norm(need))

  let state: EligibilityState
  if (candidate.nclexStatus === 'failed' || candidate.licenseStatus === 'deficiency') state = 'not_eligible'
  else if (route === 'licensed_packet_ready' && stateInScope) state = 'licensed_now'
  else if (route === 'interested') state = 'near_licensed' // passed NCLEX, license in progress
  else state = 'pathway_first'

  // Start feasibility is gated by the slowest of: license state scope, NCLEX, arrival/visa.
  let startFeasibility: StartFeasibility
  if (state === 'licensed_now' && candidate.arrivalStatus === 'arrived') startFeasibility = 'now'
  else if (state === 'licensed_now') startFeasibility = 'd30_60' // licensed but relocating
  else if (state === 'near_licensed') startFeasibility = 'd60_120'
  else startFeasibility = 'longer'

  // whatYouNeed: lead with the matcher's concrete blockers, then route guidance.
  const whatYouNeed: string[] = [...match.blockers]
  if (need && !stateInScope) whatYouNeed.unshift(`Begin ${need} RN licensure (endorsement or exam)`) // most important first
  if (state === 'pathway_first' && (candidate.nclexStatus === 'not_started' || candidate.nclexStatus === 'diagnostic')) whatYouNeed.push('Complete FlorenceRN Academy readiness, then register for NCLEX')
  if (candidate.employerShareConsent !== 'granted') whatYouNeed.push('Grant consent so FlorenceRN can prepare your packet')
  if (whatYouNeed.length === 0) whatYouNeed.push('You meet the core requirements — a FlorenceRN advisor will finalize your packet')

  const ETA: Record<StartFeasibility, string> = {
    now: 'Ready to be submitted now — packet preparation only.',
    d30_60: 'Roughly 30–60 days, mostly relocation + onboarding.',
    d60_120: 'Roughly 60–120 days after your NCLEX pass + license issuance.',
    longer: 'Typically 4+ months through Academy → NCLEX → licensure → packet.',
  }
  return { state, startFeasibility, whatYouNeed: dedupe(whatYouNeed), etaNote: ETA[startFeasibility], fitScore: match.matchScore }
}

const dedupe = (xs: string[]) => Array.from(new Set(xs))
