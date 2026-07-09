import {
  ENGLISH_REQUIREMENT_STATE_LIST,
  getEnglishRequirement,
  hasPassingEnglishExam,
} from '../shared/english-requirements'
import { usStateList } from '../shared/us-states'
import { resolveEndorsement } from '../shared/endorsement'
import { recommendRoute } from '../shared/route-recommender'
import { mapForm } from '../server/agents/formMapping'
import type { CandidateDossier, CandidateProfile, EnglishExam, EmployerOffer, LicenseRecord } from '../shared/types'

let pass = 0
let fail = 0
const ok = (label: string, condition: boolean, detail?: string) => {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${detail ? ` - ${detail}` : ''}`)
  condition ? (pass += 1) : (fail += 1)
}

const now = new Date().toISOString()
const profile: CandidateProfile = {
  id: 'candidate-english-smoke',
  legalFirstName: 'Test',
  legalLastName: 'Nurse',
  aliases: [],
  dateOfBirth: '1990-01-01',
  citizenship: 'PH',
  nationality: 'PH',
  countryOfResidence: 'PH',
  email: 'candidate.english-smoke@example.invalid',
  employmentState: 'Iowa',
  createdAt: now,
  updatedAt: now,
}

const license: LicenseRecord = {
  id: 'license-english-smoke',
  candidateId: profile.id,
  kind: 'us_state',
  jurisdiction: 'New York',
  status: 'active',
  disciplinaryAction: false,
}

const offer: EmployerOffer = {
  id: 'offer-english-smoke',
  candidateId: profile.id,
  employer: 'Synthetic Hospital',
  state: 'Iowa',
  role: 'Registered Nurse',
  contingent: true,
}

function dossier(englishExams: EnglishExam[] = []): CandidateDossier {
  return {
    profile,
    identityDocuments: [],
    education: [],
    employment: [],
    licenses: [license],
    visaHistory: [],
    travelHistory: [],
    schoolPrograms: [],
    employerOffers: [offer],
    financing: [],
    englishExams,
    nclex: [],
    documents: [],
    workflows: [],
    appointments: [],
    consularCases: [],
    ds160WorkbenchStatuses: [],
    visaAppointments: [],
    consularPaymentOrders: [],
    sevismateHandoffs: [],
    sevismateHandoffStatuses: [],
    i901Receipts: [],
  }
}

const allStates = usStateList()
ok('English requirement table covers every state plus D.C.', ENGLISH_REQUIREMENT_STATE_LIST.length === allStates.length && allStates.every((s) => getEnglishRequirement(s).state === s))

const iowa = getEnglishRequirement('Iowa')
ok('Iowa is route-dependent and counsel-confirmed', iowa.routingImpact === 'route_confirm' && iowa.counselReviewRequired)
ok('Iowa OET threshold is encoded', iowa.acceptedScores.some((s) => s.exam === 'OET' && s.score.includes('350 speaking')))

const washington = getEnglishRequirement('Washington State')
ok('Washington board-controlled English gate is encoded', washington.state === 'Washington' && washington.routingImpact === 'requires_exam' && washington.source.url.includes('nursing.wa.gov'))

const maryland = getEnglishRequirement('Maryland')
ok('Maryland is endorsement-specific no-exam, not a blanket English requirement', maryland.disposition === 'not_required_for_endorsement' && maryland.routingImpact === 'clear')

const endorsement = resolveEndorsement('Iowa')
ok('Endorsement resolver attaches English requirement', endorsement.englishRequirement?.state === 'Iowa' && endorsement.englishRequirement.routingImpact === 'route_confirm')

const draft = mapForm('endorsement', dossier(), {} as never, 'wf-english-smoke')
const englishAnswer = draft.sections.flatMap((s) => s.answers).find((a) => a.fieldId === 'english_route_confirmation')
ok('Endorsement form includes the Iowa English route confirmation gate', !!englishAnswer && englishAnswer.status === 'missing' && !!englishAnswer.source?.url)

const route = recommendRoute(dossier())
ok('Route recommender blocks Iowa until English route is confirmed', route.options[0]?.blockers.some((b) => b.includes('Iowa route-dependent English gate')) === true)

const oet: EnglishExam = {
  id: 'english-english-smoke',
  candidateId: profile.id,
  exam: 'OET',
  overall: 380,
  passed: true,
  date: '2026-01-01',
}
ok('Passing English score helper recognizes score evidence', hasPassingEnglishExam([oet]))

console.log(`\n${fail ? 'ENGLISH REQUIREMENTS SMOKE FAILED' : 'ENGLISH REQUIREMENTS SMOKE PASSED'} - ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
