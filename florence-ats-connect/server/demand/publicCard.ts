// Candidate-facing job card + public "express interest" path. ATS Connect has no
// candidate login (candidates are synced projections), so the nurse reaches a job
// through a FlorenceRN tracked link → this PUBLIC, redacted landing card. Compliance:
// "express interest" (never "apply"), NO PII in the URL (contact comes in the POST body
// with explicit consent), listed-vs-estimated pay labeled, source URL + capture time kept.
import { store, uid, now } from '../db'
import { payDisplay, type PayDisplay } from '../../shared/payDisplay'
import { opportunityStateFor, ctaForState, opportunityStateLabel, type OpportunityState, type OpportunityCta } from '../../shared/opportunityState'
import { registerInterest } from './interest'
import type { FlorenceCandidate } from '../../shared/types'
import type { FlorenceRNJob, JobBenefitTag, CandidateJobInterest } from '../../shared/demand-types'

export interface PublicJobCard {
  id: string
  title: string
  normalizedRole?: string
  employerName: string
  city?: string
  state?: string
  requiredLicenseState?: string
  specialty?: string
  setting?: string
  shift?: string
  pay: PayDisplay
  benefits: JobBenefitTag[]
  /** Plain-language guidance for the nurse — never an application/endorsement claim. */
  readinessNote: string
  /** Opportunity reachability + the matching CTA (apply only for authorized states). */
  opportunityState: OpportunityState
  opportunityStateLabel: string
  cta: OpportunityCta
  postedSourceUrl?: string
  firstSeenAt: string
}

/** Redacted, candidate-safe projection of a canonical job. No internal economics/revenue.
 *  State defaults to 'public' for the pure form; buildPublicCard resolves the real state. */
export function publicJobCard(job: FlorenceRNJob, state: OpportunityState = 'public'): PublicJobCard {
  const licState = job.requiredLicenseState ?? job.state
  const readinessNote = licState
    ? `This opportunity needs an active ${licState} RN license. Express interest and a FlorenceRN advisor will map your fastest licensure + start path — no application is submitted until you're licensed and you've given consent.`
    : `Express interest and a FlorenceRN advisor will map your fastest licensure + start path — no application is submitted until you're licensed and you've given consent.`
  return {
    id: job.id,
    title: job.title,
    normalizedRole: job.normalizedRole,
    employerName: job.employerName,
    city: job.city,
    state: job.state,
    requiredLicenseState: job.requiredLicenseState,
    specialty: job.specialty,
    setting: job.setting,
    shift: job.shift,
    pay: payDisplay(job),
    benefits: job.benefitsExtracted ?? [],
    readinessNote,
    opportunityState: state,
    opportunityStateLabel: opportunityStateLabel(state),
    cta: ctaForState(state),
    postedSourceUrl: job.sourceUrl,
    firstSeenAt: job.firstSeenAt,
  }
}

/** Resolve the opportunity state from the employer relationship + discovering source,
 *  then build the redacted card. Used by the public route. Defense-in-depth: refuses to
 *  build a card for a non-displayable job even if a caller forgets the route gate. */
export async function buildPublicCard(job: FlorenceRNJob): Promise<PublicJobCard> {
  if (job.displayAllowed !== true) throw new Error('job is not candidate-displayable')
  return publicJobCard(job, await resolveOpportunityState(job))
}

/** Look up the employer (by id, else by name) + a discovering source, derive the state. */
export async function resolveOpportunityState(job: FlorenceRNJob): Promise<OpportunityState> {
  let employer = job.employerId ? await store.employers.get(job.employerId) : null
  if (!employer) employer = (await store.employers.all()).find((e) => e.name.toLowerCase() === job.employerName.toLowerCase()) ?? null
  const jobSources = await store.jobSources.byJob(job.id)
  let source = null
  for (const js of jobSources) {
    const s = await store.demandSources.get(js.demandSourceId)
    if (s?.channelOwner) { source = s; break }
  }
  return opportunityStateFor(job, employer ?? undefined, source ?? undefined)
}

export interface PublicInterestArgs {
  jobId: string
  fullName: string
  email?: string
  phone?: string
  targetState?: string
  trackingClickId?: string
  consentGranted?: boolean
}

/** Public lead capture: finds/creates a lightweight lead candidate (de-duped by email),
 *  then runs the standard interest path. The lead defaults to the lowest readiness band
 *  so it can never be auto-matched into an employer packet — interest ≠ application. */
export async function registerPublicInterest(args: PublicInterestArgs): Promise<CandidateJobInterest> {
  if (!args.fullName?.trim()) throw new Error('fullName is required')
  if (!args.email && !args.phone) throw new Error('email or phone is required')
  const job = await store.demandJobs.get(args.jobId)
  if (!job) throw new Error('unknown job')

  const email = args.email?.trim().toLowerCase()
  let candidate: FlorenceCandidate | null = null
  if (email) {
    candidate = (await store.candidates.all()).find((c) => c.email?.toLowerCase() === email) ?? null
  }
  if (!candidate) {
    candidate = {
      id: uid(),
      sourceCandidateId: 'public_interest',
      fullName: args.fullName.trim(),
      email,
      phone: args.phone?.trim(),
      specialtyExperience: [],
      readinessBand: 'red',
      nclexStatus: 'unknown',
      licenseStatus: 'unknown',
      targetStates: args.targetState ? [args.targetState] : [],
      employerShareConsent: args.consentGranted ? 'granted' : 'not_requested',
      humanQaStatus: 'pending',
      createdAt: now(),
      updatedAt: now(),
    }
    await store.candidates.insert(candidate)
  }

  return registerInterest({
    candidateId: candidate.id,
    jobId: job.id,
    trackingClickId: args.trackingClickId,
    consentGranted: args.consentGranted === true,
  })
}
