import { store, uid, now } from '../server/db'
import type { EmployerAccount, Facility, FlorenceCandidate } from '../shared/types'
import type { FlorenceRNJob } from '../shared/demand-types'

const employerId = 'local-demo-employer'
const facilityId = 'local-demo-facility'
const jobId = 'local-demo-rn-job'
const candidateId = 'local-demo-interest-candidate'

if (!(await store.employers.get(employerId))) {
  const employer: EmployerAccount = {
    id: employerId,
    name: 'Local Demo Health System',
    atsProvider: 'manual',
    integrationStatus: 'manual',
    defaultBillingModel: 'direct',
    sourceChannel: 'direct',
    createdAt: now(),
    updatedAt: now(),
  }
  await store.employers.insert(employer)
}

if (!(await store.facilities.get(facilityId))) {
  const facility: Facility = {
    id: facilityId,
    employerId,
    name: 'Local Demo Medical Center',
    facilityType: 'hospital',
    city: 'Austin',
    state: 'TX',
    country: 'US',
    createdAt: now(),
  }
  await store.facilities.insert(facility)
}

if (!(await store.demandJobs.get(jobId))) {
  const job: FlorenceRNJob = {
    id: jobId,
    employerId,
    employerName: 'Local Demo Health System',
    facilityId,
    facilityName: 'Local Demo Medical Center',
    fingerprint: 'local-demo-rn-job',
    title: 'Registered Nurse - Local Demo',
    normalizedRole: 'registered_nurse',
    specialty: 'med_surg',
    setting: 'hospital',
    city: 'Austin',
    state: 'TX',
    country: 'US',
    requiredLicenseState: 'TX',
    shift: 'day',
    employmentType: 'full_time',
    openingsEstimate: 2,
    displayAllowed: true,
    origin: 'demand_radar',
    status: 'open',
    confidence: 'high',
    firstSeenAt: now(),
    lastSeenAt: now(),
  }
  await store.demandJobs.insert(job)
}

if (!(await store.candidates.get(candidateId))) {
  const candidate: FlorenceCandidate = {
    id: candidateId,
    sourceCandidateId: 'local_seed',
    fullName: 'Local Demo Nurse',
    email: 'employer-local@example.invalid',
    specialtyExperience: ['Med Surg'],
    yearsExperience: 3,
    readinessBand: 'red',
    nclexStatus: 'unknown',
    licenseStatus: 'unknown',
    visaStatus: 'unknown',
    targetStates: ['TX'],
    employerShareConsent: 'not_requested',
    humanQaStatus: 'pending',
    createdAt: now(),
    updatedAt: now(),
  }
  await store.candidates.insert(candidate)
}

console.log(`[ats-connect] seeded fake local employer job: ${jobId}`)
