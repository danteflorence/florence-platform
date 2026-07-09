import type { EnglishExam, OfficialResource } from './types'
import { getUsState, usStateList } from './us-states'

export type EnglishRequirementDisposition =
  | 'not_required'
  | 'not_required_for_endorsement'
  | 'documentation_required'
  | 'required'
  | 'route_dependent'

export type EnglishRoutingImpact =
  | 'clear'
  | 'needs_documentation'
  | 'requires_exam'
  | 'route_confirm'

export type EnglishTestName = 'TOEFL' | 'IELTS' | 'OET' | 'PTE' | 'MET'

export interface AcceptedEnglishScore {
  exam: EnglishTestName
  score: string
}

export interface EnglishRequirementRule {
  state: string
  code: string
  disposition: EnglishRequirementDisposition
  routingImpact: EnglishRoutingImpact
  label: string
  summary: string
  florenceAction: string
  acceptedScores: AcceptedEnglishScore[]
  source: OfficialResource
  counselReviewRequired: boolean
  currentAsOf: string
}

type RuleConfig = Omit<EnglishRequirementRule, 'state' | 'code' | 'source' | 'currentAsOf'> & {
  source?: OfficialResource
}

const CURRENT_AS_OF = '2026-06-01'

function slug(state: string): string {
  return state.toLowerCase().replace(/\./g, '').replace(/&/g, 'and').replace(/\s+/g, '-')
}

function trumerit(state: string): OfficialResource {
  return {
    label: `TruMerit - ${state} RN licensure services`,
    url: `https://www.trumerit.org/licensure/${slug(state)}/`,
  }
}

function board(label: string, url: string): OfficialResource {
  return { label, url }
}

function stateOrThrow(state: string) {
  const us = getUsState(state)
  if (!us) throw new Error(`Missing US state metadata for English requirement: ${state}`)
  return us
}

function mk(state: string, config: RuleConfig): EnglishRequirementRule {
  const us = stateOrThrow(state)
  return {
    state: us.name,
    code: us.code,
    ...config,
    source: config.source ?? trumerit(us.name),
    currentAsOf: CURRENT_AS_OF,
  }
}

function noExam(state: string, summary?: string): [string, EnglishRequirementRule] {
  const us = stateOrThrow(state)
  return [us.name.toLowerCase(), mk(us.name, {
    disposition: 'not_required',
    routingImpact: 'clear',
    label: 'No English exam identified for the reviewed endorsement route',
    summary: summary ?? 'RN endorsement source reviewed; no IELTS, OET, TOEFL, or PTE score submission is identified for this reviewed route.',
    florenceAction: 'Proceed with endorsement routing, but keep the route-specific source and monthly surveillance date attached.',
    acceptedScores: [],
    counselReviewRequired: false,
  })]
}

function noForEndorsement(state: string, summary: string): [string, EnglishRequirementRule] {
  const us = stateOrThrow(state)
  return [us.name.toLowerCase(), mk(us.name, {
    disposition: 'not_required_for_endorsement',
    routingImpact: 'clear',
    label: 'No English exam for the reviewed RN endorsement route',
    summary,
    florenceAction: 'Route as endorsement-specific. Do not reuse this as an initial-licensure conclusion.',
    acceptedScores: [],
    counselReviewRequired: false,
  })]
}

function englishDoc(state: string, summary: string, acceptedScores: AcceptedEnglishScore[] = [], source?: OfficialResource): [string, EnglishRequirementRule] {
  const us = stateOrThrow(state)
  return [us.name.toLowerCase(), mk(us.name, {
    disposition: 'documentation_required',
    routingImpact: 'needs_documentation',
    label: 'No exam if English-instruction documentation is on file',
    summary,
    florenceAction: 'Collect school letter, transcript notation, or credentials-evaluation language-of-instruction evidence before clearing the English gate.',
    acceptedScores,
    source,
    counselReviewRequired: false,
  })]
}

function required(state: string, summary: string, acceptedScores: AcceptedEnglishScore[], source?: OfficialResource): [string, EnglishRequirementRule] {
  const us = stateOrThrow(state)
  return [us.name.toLowerCase(), mk(us.name, {
    disposition: 'required',
    routingImpact: 'requires_exam',
    label: 'English exam required unless a board-specific exemption applies',
    summary,
    florenceAction: 'Create an English-score task and prefer OET where accepted because it is healthcare-oriented. Do not mark the license path clear until the board-compatible evidence is on file.',
    acceptedScores,
    source,
    counselReviewRequired: false,
  })]
}

function routeDependent(state: string, summary: string, acceptedScores: AcceptedEnglishScore[], source?: OfficialResource): [string, EnglishRequirementRule] {
  const us = stateOrThrow(state)
  return [us.name.toLowerCase(), mk(us.name, {
    disposition: 'route_dependent',
    routingImpact: 'route_confirm',
    label: 'Route-dependent English gate',
    summary,
    florenceAction: 'Confirm CES versus CP/VisaScreen route with licensure ops or counsel before clearing the pathway. If using CES and no exemption applies, collect a board-compatible English score.',
    acceptedScores,
    source,
    counselReviewRequired: true,
  })]
}

const OET_300_EACH: AcceptedEnglishScore = { exam: 'OET', score: '300 each module' }
const OET_350_300: AcceptedEnglishScore = { exam: 'OET', score: '350 speaking; 300 reading/listening/writing' }
const TOEFL_83_26: AcceptedEnglishScore = { exam: 'TOEFL', score: '83 overall; 26 speaking' }
const IELTS_65_7: AcceptedEnglishScore = { exam: 'IELTS', score: '6.5 overall; 7 speaking' }

const ENTRIES: [string, EnglishRequirementRule][] = [
  noExam('Alabama', 'RN endorsement: English scores not required for CES and not resubmitted for CP in the reviewed TruMerit route.'),
  noExam('Alaska', 'RN endorsement English proficiency is marked not required in the reviewed TruMerit route.'),
  noExam('Arizona'),
  required('Arkansas', 'Internationally educated RN endorsement applicants require English scores unless educated in listed exempt countries; Kenya, Ghana, and the Philippines are not listed in the reviewed source.', [
    TOEFL_83_26,
    { exam: 'IELTS', score: '6.5 overall; 6.0 each module' },
    OET_300_EACH,
    { exam: 'PTE', score: '55 overall; 50 each module' },
    { exam: 'MET', score: '55 overall; 55 speaking' },
  ], board('Arkansas Department of Health - Arkansas State Board of Nursing', 'https://healthy.arkansas.gov/boards-commissions/arkansas-state-board-of-nursing/')),
  noExam('California'),
  noExam('Colorado', 'RN endorsement shows English service not required; Colorado also recognizes applicants taught in English.'),
  noExam('Connecticut', 'RN endorsement: English scores are not required to be resubmitted for the CP Verification Letter in the reviewed route.'),
  englishDoc('Delaware', 'Delaware accepts a waiver where the nursing program and textbooks were in English; scores are required when the waiver evidence is missing.', [
    TOEFL_83_26,
    IELTS_65_7,
    OET_350_300,
  ]),
  noExam('Florida', 'Florida waives English competency where nursing coursework and textbooks were in English. This fits the Florence English-medium nursing education fact pattern when documented.'),
  noExam('Georgia'),
  noExam('Hawaii'),
  noExam('Idaho'),
  englishDoc('Illinois', 'Illinois may waive the English exam if the CES report indicates the nursing program was conducted in English using English textbooks.', [], board('Illinois Department of Financial and Professional Regulation - Nursing', 'https://idfpr.illinois.gov/profs/nursing.html')),
  noExam('Indiana', 'RN endorsement source reviewed; no English resubmission requirement through the reviewed CP/CES route.'),
  routeDependent('Iowa', 'RN endorsement through CES requires English scores. CP/VisaScreen verification may be available as a route alternative, but the route must be confirmed before clearing the gate.', [
    { exam: 'TOEFL', score: '81 overall; 57 reading/listening/writing; 24 speaking' },
    IELTS_65_7,
    OET_350_300,
    { exam: 'PTE', score: '55 overall; no subscore below 50' },
  ]),
  noExam('Kansas'),
  englishDoc('Kentucky', 'Kentucky says an applicant taught in English does not need an English exam or ELP report; scores are required if that evidence is not available.', [
    { exam: 'TOEFL', score: '84 overall; 26 speaking' },
    { exam: 'IELTS', score: '6.5 overall' },
    OET_350_300,
  ]),
  englishDoc('Louisiana', 'Louisiana requires CES English scores if the program was not taught in English; English-medium BSN evidence clears this gate for the Florence fact pattern.'),
  noExam('Maine', 'RN endorsement: English scores are not required to be submitted to TruMerit for CES; Maine also notes English-taught applicants do not need the exam.'),
  noForEndorsement('Maryland', 'Initial RN licensure can be more difficult, but the reviewed NY/FL-license-to-endorsement route does not require English scores through TruMerit.'),
  englishDoc('Massachusetts', 'Massachusetts requires an English proficiency exam if nursing education was not provided in English; English-provided nursing education must be documented.', [], board('Massachusetts Board of Registration in Nursing', 'https://www.mass.gov/orgs/board-of-registration-in-nursing')),
  englishDoc('Michigan', 'English-taught program and textbook evidence removes the English testing need in the reviewed route.'),
  noExam('Minnesota'),
  noExam('Mississippi'),
  required('Missouri', 'Missouri requires English scores unless educated in listed exempt countries; Kenya, Ghana, and the Philippines are not listed in the reviewed source.', [
    TOEFL_83_26,
    IELTS_65_7,
    { exam: 'OET', score: '360 speaking; 340 reading; 320 listening; 350 writing' },
    { exam: 'PTE', score: '56 overall; 76 speaking' },
    { exam: 'MET', score: '58 overall; 59 speaking' },
  ]),
  noExam('Montana'),
  noExam('Nebraska'),
  noExam('Nevada'),
  routeDependent('New Hampshire', 'RN endorsement through CES requires English scores. CP/VisaScreen may be available as a route alternative, but confirm before clearing.', [
    TOEFL_83_26,
    IELTS_65_7,
    OET_300_EACH,
  ]),
  noForEndorsement('New Jersey', 'New Jersey can require English for initial RN licensure, but the reviewed RN endorsement route does not require English scores through TruMerit.'),
  noExam('New Mexico'),
  noExam('New York', 'New York CVS route does not require English scores in the reviewed TruMerit route.'),
  noForEndorsement('North Carolina', 'North Carolina initial licensure can require English, but RN endorsement via the reviewed CES/VisaScreen route does not require English scores through TruMerit.'),
  englishDoc('North Dakota', 'North Dakota endorsement requires the credential evaluation to state that language of instruction was English with English textbooks; if not, English proficiency is required.', [], board('North Dakota Board of Nursing', 'https://www.ndbon.org/')),
  noExam('Ohio'),
  noExam('Oklahoma'),
  noExam('Oregon'),
  noExam('Pennsylvania'),
  noExam('Rhode Island'),
  required('South Carolina', 'South Carolina requires an applicant whose native language is not English to submit evidence of passing a board-approved English proficiency exam.', [], board('South Carolina Board of Nursing - Internationally Educated Applicants', 'https://llr.sc.gov/nurse/feducation.aspx')),
  englishDoc('South Dakota', 'English-taught program and textbook evidence removes the English testing need in the reviewed route.'),
  englishDoc('Tennessee', 'English testing is tied to program and textbook language in the reviewed route.'),
  noExam('Texas'),
  englishDoc('Utah', 'Utah requires an English exam only if the language of instruction was not English.', [
    TOEFL_83_26,
    { exam: 'IELTS', score: '6.0 overall; 7 speaking' },
    OET_350_300,
  ]),
  englishDoc('Vermont', 'English-taught program evidence removes the exam need in the reviewed route.'),
  routeDependent('Virginia', 'Virginia endorsement route treatment depends on native-language evidence or CP/VisaScreen. With only English-medium degree evidence, do not clear without route confirmation.', [
    TOEFL_83_26,
    IELTS_65_7,
    OET_350_300,
  ]),
  required('Washington', 'Washington Board materials require English proficiency for RN/LPN applicants educated outside the United States except listed jurisdictions. The board rule controls even when scores are not submitted to CES.', [
    { exam: 'TOEFL', score: '84 overall; 26 speaking' },
    { exam: 'IELTS', score: '6.5 overall; 6.0 listening/reading/writing/speaking' },
    { exam: 'OET', score: '300 listening/reading/writing; 280 speaking' },
  ], board('Washington State Board of Nursing - Educated Outside the United States', 'https://nursing.wa.gov/licensing/apply-license/educated-outside-united-states')),
  noExam('District of Columbia'),
  required('West Virginia', 'West Virginia requires English scores for the reviewed route.', [
    { exam: 'TOEFL', score: '84 overall; 26 speaking' },
    { exam: 'IELTS', score: '6.5 overall; 6.0 speaking' },
    OET_350_300,
    { exam: 'PTE', score: '55 overall; 63 speaking; 50 reading/listening/writing' },
    { exam: 'MET', score: '55 overall; 55 speaking' },
  ]),
  required('Wisconsin', 'Wisconsin requires English scores through the reviewed TruMerit route.', [
    TOEFL_83_26,
    IELTS_65_7,
    OET_350_300,
    { exam: 'MET', score: '58 overall; 59 speaking; 58 reading/listening/writing' },
  ]),
  englishDoc('Wyoming', 'Language-of-instruction and English-textbook documentation removes the English testing need in the reviewed route.'),
]

export const ENGLISH_REQUIREMENT_RULES: Record<string, EnglishRequirementRule> = Object.fromEntries(ENTRIES)

export const ENGLISH_REQUIREMENT_STATE_LIST = usStateList()

export function getEnglishRequirement(target?: string): EnglishRequirementRule {
  if (!target) return unknownEnglishRequirement('your target state')
  const t = target.trim().toLowerCase()
  const normalized =
    t === 'washington state' ? 'washington'
      : ['washington dc', 'washington d.c.', 'd.c.', 'dc'].includes(t) ? 'district of columbia'
        : t
  const us = getUsState(normalized)
  const key = us?.name.toLowerCase() ?? normalized
  return ENGLISH_REQUIREMENT_RULES[key] ?? unknownEnglishRequirement(target)
}

export function hasPassingEnglishExam(exams: EnglishExam[]): boolean {
  return exams.some((exam) => exam.passed === true)
}

export function englishRequirementNeedsEvidence(rule: EnglishRequirementRule): boolean {
  return rule.routingImpact === 'needs_documentation' || rule.routingImpact === 'requires_exam' || rule.routingImpact === 'route_confirm'
}

function unknownEnglishRequirement(target: string): EnglishRequirementRule {
  return {
    state: target,
    code: '',
    disposition: 'route_dependent',
    routingImpact: 'route_confirm',
    label: 'English requirement not verified',
    summary: 'No maintained English requirement rule was found for this target.',
    florenceAction: 'Fail closed: confirm the board route before marking the pathway clear.',
    acceptedScores: [],
    source: { label: 'NCSBN - Find your Board of Nursing', url: 'https://www.ncsbn.org/contact-bon.htm' },
    counselReviewRequired: true,
    currentAsOf: CURRENT_AS_OF,
  }
}
