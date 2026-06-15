// Opportunity Basket + Compare cockpit (candidate-curated). Buckets are the nurse's
// own triage; they ride on the existing CandidateJobInterest (consent-gated — a nurse
// can only bucket/compare a job they've expressed consented interest in). Compare emits
// job.compared for source→start attribution. Pure-ish: DB reads + one update/event.
import { store, uid, now } from '../db'
import { payDisplay } from '../../shared/payDisplay'
import { resolveOpportunityState } from './publicCard'
import { eligibilityCoaching, scoreCandidateForJob } from './opportunityFit'
import type { CandidateJobInterest, OpportunityBucket } from '../../shared/demand-types'

const VALID_BUCKETS: OpportunityBucket[] = ['interested', 'shortlisted', 'apply_when_licensed', 'apply_now', 'not_eligible']
export const isBucket = (b: string): b is OpportunityBucket => (VALID_BUCKETS as string[]).includes(b)

/** A consented interest record for (candidate, job), or null. */
async function consentedInterest(candidateId: string, jobId: string): Promise<CandidateJobInterest | null> {
  return (await store.jobInterests.byCandidate(candidateId)).find((i) => i.jobId === jobId && !!i.consentId) ?? null
}

/** Set the candidate's basket bucket for a job they've consented-interested in. */
export async function setBucket(candidateId: string, jobId: string, bucket: OpportunityBucket): Promise<CandidateJobInterest> {
  const interest = await consentedInterest(candidateId, jobId)
  if (!interest) throw new Error('no consented interest for this job — express interest with consent first')
  interest.bucket = bucket
  await store.jobInterests.update(interest)
  return interest
}

export interface BasketEntry {
  jobId: string
  title: string
  employerName: string
  state?: string
  bucket: OpportunityBucket
  fitScore: number
}

/** The candidate's interests grouped by bucket (cockpit view). Consent-gated upstream. */
export async function candidateBasket(candidateId: string): Promise<Record<OpportunityBucket, BasketEntry[]>> {
  const out: Record<OpportunityBucket, BasketEntry[]> = { interested: [], shortlisted: [], apply_when_licensed: [], apply_now: [], not_eligible: [] }
  const candidate = await store.candidates.get(candidateId)
  if (!candidate) return out
  const interests = (await store.jobInterests.byCandidate(candidateId)).filter((i) => !!i.consentId)
  for (const i of interests) {
    const job = await store.demandJobs.get(i.jobId)
    if (!job) continue
    const bucket = i.bucket ?? 'interested'
    out[bucket].push({ jobId: job.id, title: job.title, employerName: job.employerName, state: job.requiredLicenseState ?? job.state, bucket, fitScore: scoreCandidateForJob(candidate, job).matchScore })
  }
  return out
}

export interface CompareRow {
  jobId: string
  title: string
  employerName: string
  state?: string
  specialty?: string
  pay: ReturnType<typeof payDisplay>
  benefits: string[]
  opportunityState: string
  fitScore: number
  eligibilityState: string
  startFeasibility: string
}

/** Side-by-side comparison of 2–10 opportunities for one consented candidate.
 *  Emits job.compared per job (attribution). Skips jobs without consented interest. */
export async function compareOpportunities(candidateId: string, jobIds: string[]): Promise<CompareRow[]> {
  const candidate = await store.candidates.get(candidateId)
  if (!candidate) throw new Error('unknown candidate')
  const ids = Array.from(new Set(jobIds)).slice(0, 10)
  const rows: CompareRow[] = []
  for (const jobId of ids) {
    if (!(await consentedInterest(candidateId, jobId))) continue // consent-gated per job
    const job = await store.demandJobs.get(jobId)
    if (!job) continue
    const coaching = eligibilityCoaching(candidate, job)
    rows.push({
      jobId: job.id, title: job.title, employerName: job.employerName, state: job.requiredLicenseState ?? job.state,
      specialty: job.specialty, pay: payDisplay(job), benefits: job.benefitsExtracted ?? [],
      opportunityState: await resolveOpportunityState(job), fitScore: coaching.fitScore,
      eligibilityState: coaching.state, startFeasibility: coaching.startFeasibility,
    })
    await store.attribution.insert({ id: uid(), candidateId, jobId: job.id, employerId: job.employerId, eventType: 'job.compared', sourceSystem: 'opportunity_graph', metadata: { employer: job.employerName }, occurredAt: now() })
  }
  return rows.sort((a, b) => b.fitScore - a.fitScore)
}
