// ============================================================================
// FlorenceRN ATS Connect — candidate ↔ requisition matching (V1, rules-based)
// ----------------------------------------------------------------------------
// Pure, transparent, operator-editable. No IO, no DB, no LLM — a deterministic
// function of (candidate, requisition) so it is trivially testable and stays
// correct at scale. The weights are the brief's first scoring model; tune them
// against real interview/offer outcomes later. We never surface a black-box
// number first: every score carries its per-signal breakdown + plain reasons.
// ============================================================================
import type {
  FlorenceCandidate, JobRequisition, MatchResult, MatchSignal,
  MatchCategory, RouteConfidence,
} from './types'

/** Signal weights — must sum to 1.0. */
export const MATCH_WEIGHTS = {
  readiness: 0.25,
  licensure: 0.2,
  specialty: 0.15,
  visaStart: 0.15,
  employerPref: 0.1,
  routeConfidence: 0.1,
  geography: 0.05,
} as const

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const norm = (s?: string) => (s ?? '').trim().toLowerCase()

// Loose specialty adjacency so a med-surg nurse isn't a hard zero for telemetry.
const SPECIALTY_ADJACENCY: Record<string, string[]> = {
  'med surg': ['medical surgical', 'telemetry', 'med-surg', 'medsurg'],
  'medical surgical': ['med surg', 'telemetry'],
  telemetry: ['med surg', 'medical surgical', 'cardiac'],
  icu: ['critical care', 'ccu', 'stepdown', 'pcu'],
  'critical care': ['icu', 'ccu', 'stepdown'],
  'emergency': ['ed', 'er', 'trauma'],
  er: ['emergency', 'ed', 'trauma'],
  'labor and delivery': ['l&d', 'postpartum', 'mother baby'],
  'home health': ['home care', 'community'],
}

function readinessScore(c: FlorenceCandidate): MatchSignal {
  const nclex: Record<string, number> = {
    passed: 1, scheduled: 0.8, att_issued: 0.7, registered: 0.5,
    diagnostic: 0.35, unknown: 0.3, failed: 0.2, not_started: 0.15,
  }
  const band: Record<string, number> = { green: 1, yellow: 0.7, orange: 0.4, red: 0.15 }
  const score = clamp01(0.6 * (nclex[c.nclexStatus] ?? 0.3) + 0.4 * (band[c.readinessBand] ?? 0.4))
  return {
    signal: 'Readiness / NCLEX',
    weight: MATCH_WEIGHTS.readiness,
    score,
    note: `NCLEX ${c.nclexStatus.replace(/_/g, ' ')}, readiness ${c.readinessBand}`,
  }
}

function licensureScore(c: FlorenceCandidate, r: JobRequisition): MatchSignal {
  const status: Record<string, number> = {
    issued: 1, approved: 0.9, endorsement_in_progress: 0.6, submitted: 0.5,
    application_draft: 0.3, deficiency: 0.3, unknown: 0.3, not_started: 0.15,
  }
  const need = r.requiredLicenseState
  const feasible = !need || c.targetStates.map(norm).includes(norm(need))
  let score = status[c.licenseStatus] ?? 0.3
  let note = `License ${c.licenseStatus.replace(/_/g, ' ')}`
  if (need) {
    if (feasible) {
      note += `; ${need} in scope`
    } else {
      score = Math.min(score, 0.2)
      note += `; NOT licensed/pursuing ${need} (needs ${need})`
    }
  } else {
    note += '; no specific state required'
  }
  return { signal: 'Licensure state feasibility', weight: MATCH_WEIGHTS.licensure, score: clamp01(score), note }
}

function specialtyScore(c: FlorenceCandidate, r: JobRequisition): MatchSignal {
  const want = norm(r.specialty)
  const have = c.specialtyExperience.map(norm)
  let score = 0.6
  let note = 'No specialty specified on the req (neutral)'
  if (want) {
    if (have.includes(want)) {
      score = 1
      note = `Direct ${r.specialty} experience`
    } else if (have.some((h) => (SPECIALTY_ADJACENCY[want] ?? []).includes(h) || (SPECIALTY_ADJACENCY[h] ?? []).includes(want))) {
      score = 0.6
      note = `Adjacent experience to ${r.specialty}`
    } else {
      score = 0.25
      note = `No ${r.specialty} experience on file`
    }
  }
  if ((c.yearsExperience ?? 0) >= 2 && score >= 0.6) score = clamp01(score + 0.05)
  return { signal: 'Specialty & work history', weight: MATCH_WEIGHTS.specialty, score: clamp01(score), note }
}

function visaStartScore(c: FlorenceCandidate, r: JobRequisition): MatchSignal {
  let score = c.arrivalStatus === 'arrived' ? 0.9 : 0.6
  let note = c.arrivalStatus === 'arrived' ? 'In the U.S.' : 'Abroad — visa/relocation lead time applies'
  if (c.expectedStartWindow) {
    note += `; available ${c.expectedStartWindow}`
    if (r.targetStartWindow && norm(c.expectedStartWindow) === norm(r.targetStartWindow)) {
      score = clamp01(score + 0.1)
      note += ' (matches req window)'
    }
  }
  return { signal: 'Visa / pathway / start window', weight: MATCH_WEIGHTS.visaStart, score: clamp01(score), note }
}

function geographyScore(c: FlorenceCandidate, r: JobRequisition): MatchSignal {
  const inState = r.state ? c.targetStates.map(norm).includes(norm(r.state)) : false
  return {
    signal: 'Candidate geography',
    weight: MATCH_WEIGHTS.geography,
    score: inState ? 1 : 0.5,
    note: r.state ? (inState ? `Targeting ${r.state}` : `${r.state} not in candidate's target states`) : 'No location preference',
  }
}

function confidenceLabel(score: number): RouteConfidence {
  return score >= 0.7 ? 'high' : score >= 0.4 ? 'medium' : 'low'
}

function categorize(c: FlorenceCandidate, r: JobRequisition, blockers: string[]): MatchCategory {
  const stateFeasible = !r.requiredLicenseState || c.targetStates.map(norm).includes(norm(r.requiredLicenseState))
  if (c.licenseStatus === 'deficiency' || c.nclexStatus === 'failed') return 'hold_for_credential_repair'
  if (c.readinessBand === 'red' || c.nclexStatus === 'not_started' || c.nclexStatus === 'diagnostic') return 'hold_for_academy'
  if (
    c.nclexStatus === 'passed' &&
    (c.licenseStatus === 'issued' || c.licenseStatus === 'approved') &&
    stateFeasible &&
    blockers.length === 0
  ) return 'ready_to_submit'
  return 'ready_after_milestone'
}

export function matchCandidateToRequisition(c: FlorenceCandidate, r: JobRequisition): MatchResult {
  const readiness = readinessScore(c)
  const licensure = licensureScore(c, r)
  const specialty = specialtyScore(c, r)
  const visaStart = visaStartScore(c, r)
  const geography = geographyScore(c, r)

  // Route confidence is derived from the two hardest gates (readiness + license).
  const routeRaw = clamp01(0.5 * readiness.score + 0.5 * licensure.score)
  const routeConfidence: MatchSignal = {
    signal: 'Route confidence',
    weight: MATCH_WEIGHTS.routeConfidence,
    score: routeRaw,
    note: `Derived from readiness + licensure (${confidenceLabel(routeRaw)})`,
  }
  // No employer-preference model yet — explicitly neutral so it's visible, not hidden.
  const employerPref: MatchSignal = {
    signal: 'Employer preference fit',
    weight: MATCH_WEIGHTS.employerPref,
    score: 0.7,
    note: 'No employer preferences configured (neutral)',
  }

  const signals = [readiness, licensure, specialty, visaStart, employerPref, routeConfidence, geography]
  const matchScore = Math.round(signals.reduce((acc, s) => acc + s.weight * s.score, 0) * 100)

  // Blockers — concrete, fixable obstacles to submitting now.
  const blockers: string[] = []
  if (r.requiredLicenseState && !c.targetStates.map(norm).includes(norm(r.requiredLicenseState))) {
    blockers.push(`Not licensed or pursuing ${r.requiredLicenseState}`)
  }
  if (c.licenseStatus === 'deficiency') blockers.push('Open licensure deficiency to clear')
  if (c.nclexStatus === 'failed') blockers.push('NCLEX retake required')
  if (c.nclexStatus === 'not_started' || c.nclexStatus === 'diagnostic') blockers.push('NCLEX not yet registered')
  if (c.humanQaStatus === 'blocked') blockers.push('Human QA hold on candidate file')
  if (c.employerShareConsent !== 'granted') blockers.push('Employer-share consent not yet granted')

  // Reasons — positive contributors (the explainable "why this match").
  const reasons: string[] = []
  if (specialty.score >= 0.6) reasons.push(specialty.note)
  if (licensure.score >= 0.6) reasons.push(licensure.note)
  if (readiness.score >= 0.6) reasons.push(`Readiness-cleared (${c.readinessBand})`)
  if (visaStart.score >= 0.7) reasons.push(visaStart.note)
  if (c.humanQaStatus === 'approved') reasons.push('Credential packet QA-approved')
  if (reasons.length === 0) reasons.push('Partial fit — see blockers for next steps')

  return {
    candidateId: c.id,
    candidateName: c.fullName,
    requisitionId: r.id,
    matchScore,
    category: categorize(c, r, blockers),
    routeConfidence: confidenceLabel(routeRaw),
    readinessBand: c.readinessBand,
    expectedStartWindow: c.expectedStartWindow,
    reasons,
    blockers,
    signals,
  }
}

/** Rank a candidate pool against one requisition, best first. */
export function runMatches(r: JobRequisition, candidates: FlorenceCandidate[]): MatchResult[] {
  return candidates
    .map((c) => matchCandidateToRequisition(c, r))
    .sort((a, b) => b.matchScore - a.matchScore)
}
