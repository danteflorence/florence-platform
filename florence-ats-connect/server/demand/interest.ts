// Candidate interest capture — a nurse EXPRESSES INTEREST in a FlorenceRN-matched
// opportunity. This is NOT an application: nothing is submitted to an ATS, and no
// packet is shared until separate consent is granted. Interest routes the nurse
// by readiness (licensed → packet-ready; passed-NCLEX → near-licensed; otherwise
// pathway-first) and records demand.interest_registered for source→start attribution.
import { store, uid, now } from '../db'
import { emitPassport, passportEnabled } from '../passport'
import type { FlorenceCandidate } from '../../shared/types'
import type { CandidateJobInterest, InterestStatus } from '../../shared/demand-types'

/** Route a candidate to the right next step based on licensure/NCLEX readiness. */
export function routeEligibility(c: FlorenceCandidate): InterestStatus {
  if (c.licenseStatus === 'issued' || c.licenseStatus === 'approved') return 'licensed_packet_ready'
  if (c.nclexStatus === 'passed') return 'interested' // near-licensed: passed NCLEX, license in progress
  return 'pathway_first' // needs Academy/Pathway before an employer packet
}

export interface RegisterInterestArgs {
  candidateId: string
  jobId: string
  trackingClickId?: string
  consentGranted?: boolean
}

export async function registerInterest(args: RegisterInterestArgs): Promise<CandidateJobInterest> {
  const c = await store.candidates.get(args.candidateId)
  if (!c) throw new Error('unknown candidate')
  const job = await store.demandJobs.get(args.jobId)
  if (!job) throw new Error('unknown job')

  const status = routeEligibility(c)

  // Consent gates ALL downstream sharing (packet, resume, credentials). Recorded
  // to the Passport spine as a demand_radar consent; sharing checks read it.
  let consentId: string | undefined
  if (args.consentGranted) {
    consentId = uid()
    if (passportEnabled) {
      void emitPassport({ email: c.email ?? undefined, ref: { app: 'demand_radar', externalId: c.id } }, 'consent.updated', { scope: 'demand_radar', status: 'granted' })
    }
  }

  const interest: CandidateJobInterest = {
    id: uid(), candidateId: c.id, jobId: job.id, trackingClickId: args.trackingClickId, status, consentId, createdAt: now(),
  }
  await store.jobInterests.insert(interest)

  // Attribution (job-centric) + Passport spine (nurse-centric).
  await store.attribution.insert({
    id: uid(), candidateId: c.id, jobId: job.id, employerId: job.employerId,
    eventType: 'demand.interest_registered', sourceSystem: 'demand_radar',
    metadata: { status, employer: job.employerName, trackingClickId: args.trackingClickId }, occurredAt: now(),
  })
  if (passportEnabled) {
    void emitPassport({ email: c.email ?? undefined, ref: { app: 'demand_radar', externalId: c.id } }, 'demand.interest_registered', { jobId: job.id, employer: job.employerName })
  }
  return interest
}
