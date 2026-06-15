// Route recommender — the "production route optimizer for global nurses."
//
// Given a candidate, it generates the viable licensure routes to their destination
// state and scores them TRANSPARENTLY (every point has a stated reason — no black
// box). The signature insight it surfaces: for a no-SSN F-1 nurse, the fastest
// compliant route is often to take the NCLEX & first license where there's no SSN
// barrier (New York), then ENDORSE into the destination state where the job is —
// rather than fighting the destination board's SSN/processing friction head-on.
import type { CandidateDossier } from './types'
import { getSsnPolicy } from './ssn-policy'
import { getEndorsementState } from './endorsement'
import { getUsState } from './us-states'

const EXAM_WIRED = new Set(['florida', 'new york', 'texas', 'california', 'arizona'])
const NY = 'New York'
const EXAM_DAYS = 90 // ~NCLEX eligibility + scheduling + license issuance

export interface RouteOption {
  key: string
  label: string
  examState: string // where the NCLEX / first license is taken ('—' if already licensed)
  destinationState: string
  endorse: boolean
  estimatedDays: number
  score: number
  reasons: string[]
  blockers: string[]
  recommended: boolean
}

export interface RouteRecommendation {
  destinationState?: string
  hasUsLicense: boolean
  options: RouteOption[]
  rationale: string
}

function endorseDays(state: string): number {
  const t = getEndorsementState(state)?.timelineDays
  return t ? Math.round((t[0] + t[1]) / 2) : 30
}

/** SSN-friendliness of licensing in `state` → points + a reason. */
function ssnScore(state: string): { points: number; reason: string; blocker?: string } {
  const p = getSsnPolicy(state)
  switch (p.requirement) {
    case 'not_required': return { points: 25, reason: `${state} needs no SSN at all — the most F-1-friendly first license (auto-assigned identifier).` }
    case 'sevis_or_visa_ok': return { points: 22, reason: `${state} accepts your F-1 immigration documents in lieu of an SSN.` }
    case 'declaration_ok': return { points: 18, reason: `${state} accepts a no-SSN affidavit — licensable without an SSN.` }
    case 'itin_ok': return { points: 8, reason: `${state} accepts an ITIN (no work authorization required).` }
    case 'required': return { points: -12, reason: `${state} requires an SSN before licensing.`, blocker: `${state} requires an SSN — obtainable only via CPT, which adds time.` }
    default: return { points: 0, reason: `${state}'s SSN rule isn't confirmed — verify with the board.` }
  }
}

interface RouteSpec { examState: string; destinationState: string; endorse: boolean; alreadyLicensed?: boolean }

function scoreRoute(r: RouteSpec, d: CandidateDossier): RouteOption {
  const hasSsn = !!d.profile.hasSsn
  const hasOffer = d.employerOffers.some((o) => o.state?.toLowerCase() === r.destinationState.toLowerCase())
  const studyState = d.profile.studyState
  const reasons: string[] = []
  const blockers: string[] = []
  let score = 50
  let estimatedDays: number
  let label: string

  if (r.alreadyLicensed) {
    estimatedDays = endorseDays(r.destinationState)
    score += 25
    label = `Endorse your license into ${r.destinationState}`
    reasons.push(`You already hold a U.S. RN license — endorse directly into ${r.destinationState} (~${estimatedDays} days), no NCLEX needed.`)
    const dp = ssnScore(r.destinationState)
    if (dp.blocker && !hasSsn) blockers.push(dp.blocker)
  } else {
    const es = ssnScore(r.examState)
    score += es.points
    reasons.push(es.reason)
    if (es.blocker && !hasSsn) blockers.push(es.blocker)
    if (studyState && studyState.toLowerCase() === r.examState.toLowerCase()) {
      score += 18
      reasons.push(`You're already studying in ${r.examState} on your F-1 — license where you are.`)
    }
    if (r.endorse) {
      const ed = endorseDays(r.destinationState)
      estimatedDays = EXAM_DAYS + ed
      score -= 4 // a second (porting) step
      label = `${r.examState} licensure by exam → endorse into ${r.destinationState}`
      reasons.push(`Take the NCLEX & first license in ${r.examState}, then endorse into ${r.destinationState} where your job is (~${ed} days to port).`)
      const dp = ssnScore(r.destinationState)
      if (dp.blocker && !hasSsn) blockers.push(dp.blocker)
    } else {
      estimatedDays = EXAM_DAYS
      score += 8
      label = `${r.destinationState} licensure by exam`
      reasons.push(`License by exam directly in ${r.destinationState} — one license, no porting step.`)
    }
  }
  if (hasOffer) { score += 10; reasons.push(`You have an employer offer in ${r.destinationState} — demand is confirmed.`) }
  score += Math.max(0, 22 - Math.round(estimatedDays / 10)) // faster routes score higher

  return {
    key: `${r.examState}->${r.destinationState}${r.endorse ? ':endorse' : ''}`,
    label, examState: r.examState, destinationState: r.destinationState, endorse: r.endorse,
    estimatedDays, score: Math.round(score), reasons, blockers, recommended: false,
  }
}

export function recommendRoute(d: CandidateDossier): RouteRecommendation {
  const destination = d.employerOffers[0]?.state ?? d.profile.employmentState
  const hasUsLicense = d.licenses.some((l) => l.kind === 'us_state')
  if (!destination) {
    return { hasUsLicense, options: [], rationale: 'Choose a destination state to see your fastest compliant route.' }
  }
  const dl = destination.toLowerCase()
  const options: RouteOption[] = []

  if (hasUsLicense) {
    options.push(scoreRoute({ examState: '—', destinationState: destination, endorse: true, alreadyLicensed: true }, d))
  } else {
    // Direct licensure by exam in the destination (only where our exam flow is wired).
    if (EXAM_WIRED.has(dl)) options.push(scoreRoute({ examState: destination, destinationState: destination, endorse: false }, d))
    // The New York on-ramp: license by exam in NY (no SSN), then endorse to the destination.
    if (dl !== 'new york' && getUsState(destination)) options.push(scoreRoute({ examState: NY, destinationState: destination, endorse: true }, d))
  }

  options.sort((a, b) => b.score - a.score)
  if (options[0]) options[0].recommended = true
  const rec = options[0]
  const rationale = rec
    ? `Recommended: ${rec.label}. ${rec.reasons[0] ?? ''}`
    : `We don't yet have a wired route to ${destination} — verify the board's process directly.`
  return { destinationState: destination, hasUsLicense, options, rationale }
}
