import type { CandidateDossier, FormDraft, MissingItem, WorkflowType } from '../../shared/types'

// Missing Data Agent
// ------------------
// Finds fields that cannot be completed from existing data and turns them into
// targeted, plain-language questions for the candidate.

const QUESTION: Record<string, string> = {
  gender: 'What sex/gender should appear on the visa form (as on your passport)?',
  arrival: 'What is your intended date of arrival in the U.S.?',
  prior_refusal: 'Have you ever been refused a U.S. visa? You must answer this yourself.',
  prior_overstay: 'Have you ever stayed in the U.S. longer than permitted?',
  criminal: 'Have you ever been arrested or convicted of any offense? You must answer this yourself.',
  fingerprint: 'Florida requires electronic (Livescan) fingerprinting — shall I show you the nearest location and steps?',
  infection_control: 'New York requires infection-control coursework. Would you like the approved course list?',
  child_abuse: 'New York requires child-abuse identification coursework. Would you like the approved course list?',
  pearson_name: 'Confirm the exact first and last name you will use to register with Pearson (must match your ID).',
  program_code: 'What is the program code for your NCLEX registration?',
  english: 'Have you taken an approved English exam (IELTS/OET/TOEFL)? Please share your scores.',
  sex: 'What sex should appear on the form (as on your passport)?',
  arrival_date: 'What is your intended date of arrival in the U.S.?',
  social_media: 'List your social-media presence over the last 5 years (platform + your handle). The DS-160 requires this.',
  who_pays: 'Who will pay for your trip — you, a sponsor, or an organization?',
  marital_status: 'What is your current marital status?',
  relatives_in_us: 'Do you have immediate relatives (parents, siblings, spouse, children) in the U.S.?',
  traveling_with: 'Will you travel with anyone? If so, who?',
  prior_visa: 'Have you ever been issued a U.S. visa before?',
  full_name_native: 'How is your full name written in your native alphabet? (If your language uses Latin letters, enter “Does Not Apply.”)',
  home_address: 'What is your full home street address?',
  course_of_study: 'What is your course/program of study (from your I-20)?',
  school_address: 'What is your school’s address (from your I-20)?',
  sec_health: 'DS-160 health questions — you must answer these yourself, truthfully.',
  sec_criminal: 'DS-160 criminal-history questions — you must answer these yourself, truthfully.',
  sec_security: 'DS-160 security questions — you must answer these yourself, truthfully.',
  sec_immigration: 'DS-160 immigration-violation questions — you must answer these yourself (disclose any prior overstay or refusal).',
  sec_misc: 'DS-160 miscellaneous questions — you must answer these yourself, truthfully.',
}

const HARD_BLOCKERS = new Set([
  'passport_number', 'sevis_id', 'legal_name', 'surname', 'given_names',
  'fingerprint', 'infection_control', 'child_abuse', 'pearson_name',
  'social_media', 'who_pays', 'i901',
  'verification', 'fingerprints', 'endorse_application', 'jurisprudence',
])

export function findMissing(type: WorkflowType, d: CandidateDossier, draft: FormDraft): MissingItem[] {
  const items: MissingItem[] = []

  for (const section of draft.sections) {
    for (const a of section.answers) {
      if (a.value != null && a.value !== '') continue
      items.push({
        fieldId: a.fieldId,
        label: a.label,
        reason: a.sensitive ? 'Legally sensitive — the candidate must answer personally.' : 'Not present in the profile or extracted documents.',
        question: QUESTION[a.fieldId] ?? `Please provide: ${a.label}.`,
        blocker: HARD_BLOCKERS.has(a.fieldId) || !!a.sensitive,
        sensitive: !!a.sensitive,
      })
    }
  }

  // Workflow-specific requirements not expressed as a single form field.
  if (type === 'ds160' && d.travelHistory.length === 0) {
    items.push({ fieldId: 'travel_history', label: 'Five-year travel history', reason: 'Required by the DS-160.', question: 'List your international trips over the last five years (country + approximate dates).', blocker: true })
  }
  if (type === 'cgfns_ces' && !d.englishExams.some((x) => x.passed)) {
    items.push({ fieldId: 'english', label: 'English exam', reason: 'Often required for the CES / target board.', question: QUESTION.english, blocker: false })
  }

  // De-dup by fieldId.
  const seen = new Set<string>()
  return items.filter((i) => (seen.has(i.fieldId) ? false : (seen.add(i.fieldId), true)))
}
