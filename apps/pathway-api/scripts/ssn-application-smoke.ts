import {
  applyF1SsnApplicationPatch,
  buildF1SsnApplicationView,
  payloadContainsSsn,
  sanitizeF1SsnApplicationPatch,
} from '../shared/ssn-application'
import { getSsnPolicy, ssnAction } from '../shared/ssn-policy'
import type { CandidateProfile } from '../shared/types'
import { store } from '../server/db'
import { assembleAdminMetrics } from '../server/views'

let pass = 0
let fail = 0
const ok = (label: string, condition: boolean, detail?: string) => {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${detail ? ` - ${detail}` : ''}`)
  condition ? (pass += 1) : (fail += 1)
}

const throws = (label: string, fn: () => unknown) => {
  try {
    fn()
    ok(label, false)
  } catch {
    ok(label, true)
  }
}

const now = '2026-07-01T00:00:00.000Z'
const profile: CandidateProfile = {
  id: 'candidate-ssn-smoke',
  legalFirstName: 'Synthetic',
  legalLastName: 'Candidate',
  aliases: [],
  dateOfBirth: 'REDACTED',
  citizenship: 'XX',
  nationality: 'XX',
  countryOfResidence: 'XX',
  email: 'candidate.ssn-smoke@example.invalid',
  employmentState: 'North Carolina',
  arrivalStatus: 'abroad',
  hasSsn: false,
  createdAt: now,
  updatedAt: now,
}

const policy = getSsnPolicy(profile.employmentState)
const action = ssnAction(policy, !!profile.hasSsn)
let view = buildF1SsnApplicationView(profile, action, policy)

ok('North Carolina policy requires an SSN application', action === 'apply_ssn' && view.applicable)
ok('F-1 SSN workflow starts blocked before arrival', view.nextStep?.key === 'arrive_us' && view.nextStep.status === 'blocked')

profile.arrivalStatus = 'arrived'
view = buildF1SsnApplicationView(profile, action, policy)
ok('Arrival opens the work-authorization confirmation step', view.nextStep?.key === 'confirm_work_authorization' && view.nextStep.status === 'ready')

applyF1SsnApplicationPatch(profile, { action: 'confirm_work_authorization', workAuthorizationKind: 'cpt_i20' }, '2026-07-02T00:00:00.000Z')
view = buildF1SsnApplicationView(profile, action, policy)
ok('CPT/I-20 evidence confirmation opens the SSA online start step', view.nextStep?.key === 'start_online_application')

applyF1SsnApplicationPatch(profile, { action: 'start_online_application' }, now)
view = buildF1SsnApplicationView(profile, action, policy)
ok('Online start creates the 45-day SSA office visit deadline', view.officeVisitDueDate === '2026-08-15')
ok('Online start opens SSA visit scheduling', view.nextStep?.key === 'schedule_ssa_visit')

const scheduled = sanitizeF1SsnApplicationPatch({
  action: 'schedule_ssa_visit',
  scheduledFor: '2026-07-15',
  officeName: 'SSA Card Center',
  officeCity: 'Los Angeles',
  officeState: 'CA',
})
applyF1SsnApplicationPatch(profile, scheduled, '2026-07-03T00:00:00.000Z')
view = buildF1SsnApplicationView(profile, action, policy)
ok('SSA visit scheduling stores only process metadata', profile.ssnApplication?.ssaVisit?.scheduledFor === '2026-07-15')
ok('Scheduled SSA visit opens visit-complete step', view.nextStep?.key === 'attend_ssa_visit')

applyF1SsnApplicationPatch(profile, { action: 'complete_ssa_visit' }, '2026-07-15T00:00:00.000Z')
view = buildF1SsnApplicationView(profile, action, policy)
ok('Completed SSA visit opens card-received step', view.nextStep?.key === 'receive_card')

applyF1SsnApplicationPatch(profile, { action: 'mark_card_received' }, '2026-07-29T00:00:00.000Z')
ok('Card received sets the licensure gate boolean only', profile.hasSsn === true && profile.ssnApplication?.status === 'card_received')
ok('Having the card clears the required SSN action', ssnAction(policy, !!profile.hasSsn) === 'none')

const ssnShapedRuntimeValue = ['123', '45', '6789'].join('-')
ok('Detector flags SSN-shaped values', payloadContainsSsn({ value: ssnShapedRuntimeValue }))
throws('Sanitizer rejects SSN-shaped values', () => sanitizeF1SsnApplicationPatch({ action: 'start_online_application', value: ssnShapedRuntimeValue }))
throws('Sanitizer rejects SSN fragment fields', () => sanitizeF1SsnApplicationPatch({ action: 'start_online_application', ssnLast4: '6789' }))
throws('Sanitizer rejects SSA confirmation fields', () => sanitizeF1SsnApplicationPatch({ action: 'start_online_application', ssaConfirmation: 'synthetic-reference' }))

const serialized = JSON.stringify(profile)
ok('Stored progress contains no raw SSN-shaped value', !serialized.includes(ssnShapedRuntimeValue))
ok('Stored progress contains no SSA confirmation/reference fields', !/(ssaConfirmation|confirmationNumber|referenceNumber|ssnLast4|socialSecurityNumber)/i.test(serialized))

const queueProfile: CandidateProfile = {
  ...profile,
  id: 'candidate-ssn-ops-queue-smoke',
  legalLastName: 'Queue',
  hasSsn: false,
  arrivalStatus: 'arrived',
  ssnApplication: {
    status: 'online_application_started',
    onlineApplicationStartedAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
  },
}
await store.candidates.insert(queueProfile)
const metrics = await assembleAdminMetrics()
const opsRow = metrics.ssnApplications.rows.find((r) => r.candidateId === queueProfile.id)
ok('Operations metrics include required-state SSN application queue', metrics.ssnApplications.required >= 1 && !!opsRow)
ok('Operations queue flags overdue SSA office completion', metrics.ssnApplications.overdueOfficeVisit >= 1 && opsRow?.risk === 'red')
ok('Operations queue exposes next Navigator action without SSN data', !!opsRow?.nextAction && !/(ssaConfirmation|confirmationNumber|referenceNumber|ssnLast4|socialSecurityNumber|\d{3}-\d{2}-\d{4})/i.test(JSON.stringify(opsRow)))

console.log(`\n${fail ? 'F-1 SSN APPLICATION SMOKE FAILED' : 'F-1 SSN APPLICATION SMOKE PASSED'} - ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
