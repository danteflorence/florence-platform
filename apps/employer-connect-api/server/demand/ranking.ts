// Account ranking — which employers to approach first. Scores each employer with
// open RN demand by demand size × FlorenceRN supply fit × economics, so go-to-market
// targets the highest-yield accounts (directly serving "maximize placements").
import { store } from '../db'

/** Employer Opportunity Value — the *quality* of an account's demand (separate from the
 *  placement-yield `score`): how concentrated, reachable, specialty-deep, and repeatable it is. */
export interface OpportunityValue {
  facilityDensity: number // open jobs per distinct facility (concentration)
  distinctFacilities: number
  channelAvailability: number // 0–1: how reachable (ATS-connected > direct > AMN > public)
  specialtyDepth: number // distinct specialties with open demand
  repeatability: number // 0–1: fraction of jobs re-seen across pulls (durable demand)
  /** 0–100 composite of the four dimensions + economics. */
  score: number
}

export interface RankedAccount {
  employer: string
  openJobs: number
  openings: number
  states: string[]
  specialties: string[]
  matchedLicensed: number
  matchedNearLicensed: number
  avgGrossFeePerRnMonth: number
  avgNetValuePerRnMonth: number
  /** Composite priority score (higher = approach first). */
  score: number
  /** Employer Opportunity Value breakdown (account-level quality of demand). */
  opportunityValue: OpportunityValue
}

export async function rankAccounts(limit = 25): Promise<RankedAccount[]> {
  const [openJobs, candidates, econ, employers] = await Promise.all([
    store.demandJobs.open(), store.candidates.all(), store.jobEconomics.all(), store.employers.all(),
  ])
  // Claimed long-tail jobs are a lead-gen object, NOT an AMN/GTM account target — exclude
  // them so a small claimed employer never competes with health-system accounts here.
  const jobs = openJobs.filter((j) => j.origin !== 'claimed_signal')
  const econByJob = new Map(econ.map((e) => [e.jobId, e]))
  const empByName = new Map(employers.map((e) => [e.name.toLowerCase(), e]))
  const isLicensed = (c: { licenseStatus: string }) => c.licenseStatus === 'issued' || c.licenseStatus === 'approved'

  // Channel reachability from the employer relationship (load-bearing GTM signal).
  const channelScore = (employerName: string): number => {
    const e = empByName.get(employerName.toLowerCase())
    if (!e) return 0.3
    if (e.integrationStatus === 'active') return 1
    if (e.sourceChannel === 'direct' && e.integrationStatus !== 'not_started' && e.integrationStatus !== 'error') return 0.8
    if (e.sourceChannel === 'amn') return 0.6
    return 0.3
  }

  const byEmployer = new Map<string, typeof jobs>()
  for (const j of jobs) {
    const arr = byEmployer.get(j.employerName) ?? []
    arr.push(j)
    byEmployer.set(j.employerName, arr)
  }

  const ranked: RankedAccount[] = []
  for (const [employer, ejobs] of byEmployer) {
    const states = [...new Set(ejobs.map((j) => j.requiredLicenseState ?? j.state).filter(Boolean) as string[])]
    const specialties = [...new Set(ejobs.map((j) => j.specialty).filter(Boolean) as string[])]
    const openings = ejobs.reduce((s, j) => s + (j.openingsEstimate ?? 1), 0)

    const matched = candidates.filter((c) => (c.targetStates ?? []).some((s) => states.includes(s)))
    const matchedLicensed = matched.filter(isLicensed).length
    const matchedNearLicensed = matched.filter((c) => !isLicensed(c) && c.nclexStatus === 'passed').length

    const fees = ejobs.map((j) => econByJob.get(j.id)?.recommendedGrossFeePerRnMonth).filter((x): x is number => typeof x === 'number')
    const nets = ejobs.map((j) => econByJob.get(j.id)?.estimatedNetValuePerRnMonth).filter((x): x is number => typeof x === 'number')
    const avgFee = fees.length ? Math.round(fees.reduce((a, b) => a + b, 0) / fees.length) : 0
    const avgNet = nets.length ? Math.round(nets.reduce((a, b) => a + b, 0) / nets.length) : 0

    // Score: deployable supply that maps to real openings, weighted by economics.
    // Licensed nurses count fully; near-licensed at half (need NCLEX→license first).
    const deployable = matchedLicensed + matchedNearLicensed * 0.5
    const fillable = Math.min(openings, deployable)
    const score = Math.round(fillable * (1 + avgNet / 5000) * 100) / 100

    // Employer Opportunity Value — quality of the demand (additive; independent of `score`).
    const distinctFacilities = new Set(ejobs.map((j) => j.facilityName ?? j.facilityId ?? employer)).size
    const facilityDensity = Math.round((ejobs.length / Math.max(1, distinctFacilities)) * 100) / 100
    const channelAvailability = channelScore(employer)
    const specialtyDepth = specialties.length
    const reseen = ejobs.filter((j) => j.lastSeenAt && j.firstSeenAt && j.lastSeenAt > j.firstSeenAt).length
    const repeatability = Math.round((reseen / Math.max(1, ejobs.length)) * 100) / 100
    const ovScore = Math.round(100 * (
      0.30 * Math.min(1, facilityDensity / 3) +
      0.25 * channelAvailability +
      0.20 * Math.min(1, specialtyDepth / 4) +
      0.15 * repeatability +
      0.10 * Math.min(1, avgNet / 4000)
    ))
    const opportunityValue: OpportunityValue = { facilityDensity, distinctFacilities, channelAvailability, specialtyDepth, repeatability, score: ovScore }

    ranked.push({ employer, openJobs: ejobs.length, openings, states, specialties, matchedLicensed, matchedNearLicensed, avgGrossFeePerRnMonth: avgFee, avgNetValuePerRnMonth: avgNet, score, opportunityValue })
  }

  return ranked.sort((a, b) => b.score - a.score || b.openings - a.openings).slice(0, limit)
}
