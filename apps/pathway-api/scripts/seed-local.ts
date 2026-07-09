import { store, uid, now } from '../server/db'
import type { CandidateProfile } from '../shared/types'

const existing = (await store.candidates.all()).find((candidate) => candidate.email === 'pathway-local@example.invalid')
if (existing) {
  console.log(`[pathway] local fake candidate already exists: ${existing.id}`)
  process.exit(0)
}

const candidate: CandidateProfile = {
  id: uid(),
  aliases: [],
  legalFirstName: 'Local',
  legalLastName: 'Pathway',
  dateOfBirth: '1990-01-01',
  citizenship: 'Exampleland',
  nationality: 'Exampleland',
  countryOfResidence: 'Exampleland',
  email: 'pathway-local@example.invalid',
  phone: '+15550101010',
  visaTarget: 'F-1',
  nclexState: 'Texas',
  employmentState: 'Texas',
  targetStartDate: '2027-01-15',
  arrivalStatus: 'abroad',
  hasSsn: false,
  consents: {
    visa: { granted: true, grantedAt: now(), via: 'local_seed' },
    education: { granted: true, grantedAt: now(), via: 'local_seed' },
  },
  createdAt: now(),
  updatedAt: now(),
}

await store.candidates.insert(candidate)
await store.audit.log({
  id: uid(),
  at: now(),
  actor: 'system',
  action: 'candidate_created',
  entity: 'candidate',
  entityId: candidate.id,
  candidateId: candidate.id,
  detail: 'type=local_fake',
})

console.log(`[pathway] seeded local fake candidate: ${candidate.id}`)
