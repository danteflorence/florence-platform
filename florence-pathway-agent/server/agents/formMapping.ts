import type {
  CandidateDossier, FormAnswer, FormDraft, FormSection, WorkflowType,
  FieldStatus, Confidence, EvidenceRef, OfficialResource,
} from '../../shared/types'
import { WORKFLOW_META } from '../../shared/constants'
import { resolveEndorsement } from '../../shared/endorsement'
import { getExamState } from '../../shared/exam-states'
import { canShare } from '../../shared/consent'
import type { ExtractedFacts } from './dataExtraction'
import { uid, now } from './util'

// Form Mapping Agent
// ------------------
// Maps the canonical profile into jurisdiction-specific form fields. Never
// guesses: a field with no backing value is emitted as `missing`, not invented.
// Sensitive fields (refusals, criminal, overstay) are flagged so the Compliance
// Agent and human QA must handle them.

interface AnswerOpts {
  sensitive?: boolean
  afterArrival?: boolean
  needsSsn?: boolean
  source?: OfficialResource
  feeUsd?: number
  note?: string
}

function ans(
  fieldId: string,
  label: string,
  value: string | null | undefined,
  evidence: EvidenceRef[],
  confidence: Confidence,
  opts: AnswerOpts = {},
): FormAnswer {
  let status: FieldStatus
  if (opts.sensitive) status = 'legally_sensitive'
  else if (value == null || value === '') status = 'missing'
  else status = evidence.some((e) => e.sourceType === 'candidate_input') ? 'user_entered' : 'document_extracted'
  return {
    fieldId,
    label,
    value: value ?? null,
    status,
    confidence: value == null ? 'unknown' : confidence,
    evidence: value == null ? [] : evidence,
    sensitive: opts.sensitive,
    afterArrival: opts.afterArrival,
    needsSsn: opts.needsSsn,
    source: opts.source,
    feeUsd: opts.feeUsd,
    note: opts.note,
  }
}

const ev = (sourceType: EvidenceRef['sourceType'], detail: string): EvidenceRef[] => [{ sourceType, detail }]

export function mapForm(type: WorkflowType, d: CandidateDossier, facts: ExtractedFacts, workflowId: string): FormDraft {
  const sections = BUILDERS[type](d, facts)
  return {
    id: uid(),
    candidateId: d.profile.id,
    workflowId,
    formType: type,
    title: WORKFLOW_META[type].label,
    sections,
    generatedAt: now(),
  }
}

type Builder = (d: CandidateDossier, f: ExtractedFacts) => FormSection[]

// Mirrors the real DS-160 screen flow for an F-1 (principal) applicant, per the
// U.S. Dept. of State DS-160 exemplar. Maps the candidate profile where we have
// data and emits the rest as missing/sensitive — the applicant completes & signs.
const ds160: Builder = (d) => {
  const p = d.profile
  const passport = d.identityDocuments.find((x) => x.kind === 'passport')
  const natId = d.identityDocuments.find((x) => x.kind === 'national_id')
  const school = d.schoolPrograms[0]
  const edu = d.education[0]
  const sorted = [...d.employment].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
  const emp = sorted[0]
  const prevEmp = sorted[1]
  const visa = d.visaHistory[0]
  const refusal = d.visaHistory.find((v) => v.priorRefusal)
  const yn = (b?: boolean): string | null => (b === undefined ? null : b ? 'Yes' : 'No')

  return [
    {
      key: 'personal1', title: 'Personal Information 1',
      answers: [
        ans('surname', 'Surnames', p.legalLastName, ev('passport_scan', 'Passport MRZ'), 'high'),
        ans('given_names', 'Given names', [p.legalFirstName, p.legalMiddleName].filter(Boolean).join(' '), ev('passport_scan', 'Passport MRZ'), 'high'),
        ans('full_name_native', 'Full name in native alphabet', null, [], 'unknown', { note: 'Enter “Does Not Apply” only if your language has no native script.' }),
        ans('other_names', 'Other names used (maiden / aliases)', p.aliases.length ? p.aliases.join(', ') : null, ev('candidate_input', 'Profile'), 'medium'),
        ans('sex', 'Sex', p.gender, ev('candidate_input', 'Candidate'), 'medium'),
        ans('marital_status', 'Marital status', null, [], 'unknown'),
        ans('dob', 'Date of birth', p.dateOfBirth, ev('passport_scan', 'Passport'), 'high'),
        ans('birth_city', 'City of birth', null, [], 'unknown'),
        ans('birth_country', 'Country/Region of birth', p.nationality, ev('passport_scan', 'Passport'), 'medium'),
      ],
    },
    {
      key: 'personal2', title: 'Personal Information 2',
      answers: [
        ans('nationality', 'Country/Region of origin (nationality)', p.nationality, ev('passport_scan', 'Passport'), 'high'),
        ans('other_nationality', 'Hold or held any other nationality?', null, [], 'unknown'),
        ans('national_id', 'National identification number', natId?.documentNumber, ev('national_id', 'National ID'), 'medium', { note: 'Enter “Does Not Apply” if you have none.' }),
        ans('us_ssn', 'U.S. Social Security Number', null, [], 'unknown', { note: 'Enter “Does Not Apply” if you have none.' }),
        ans('us_itin', 'U.S. Taxpayer ID Number', null, [], 'unknown', { note: 'Enter “Does Not Apply” if you have none.' }),
      ],
    },
    {
      key: 'travel', title: 'Travel Information',
      answers: [
        ans('purpose', 'Purpose of trip to the U.S.', 'Academic Student (F-1)', ev('derived', 'F-1 pathway'), 'high'),
        ans('specific_plans', 'Have you made specific travel plans?', null, [], 'unknown'),
        ans('arrival_date', 'Intended date of arrival', p.targetStartDate, ev('candidate_input', 'Target start'), 'medium'),
        ans('stay_length', 'Intended length of stay', null, [], 'unknown'),
        ans('us_stay_address', 'Address where you will stay in the U.S.', school?.schoolName, ev('i20', 'I-20 school'), 'low', { note: 'Confirm the school or housing address.' }),
        ans('who_pays', 'Person/Entity paying for your trip', null, [], 'unknown', { note: 'Self, a sponsor, or an organization — the candidate must specify.' }),
      ],
    },
    {
      key: 'companions', title: 'Travel Companions',
      answers: [
        ans('traveling_with', 'Are you traveling with other persons?', null, [], 'unknown'),
      ],
    },
    {
      key: 'prev_us_travel', title: 'Previous U.S. Travel',
      answers: [
        ans('been_to_us', 'Have you ever been to the U.S.?', yn(visa?.priorUsTravel), ev('prior_visa', 'Visa history'), 'medium'),
        ans('prior_visa', 'Have you ever been issued a U.S. visa?', null, [], 'unknown'),
        ans('prior_refusal', 'Ever been refused a U.S. visa or denied admission?', refusal ? 'YES — requires candidate confirmation' : null, ev('prior_visa', 'Visa history'), 'low', { sensitive: true, note: refusal ? 'Prior refusal on record — escalate to counsel; the candidate must confirm and explain.' : 'Sensitive — the candidate must answer truthfully; never auto-answer “No.”' }),
      ],
    },
    {
      key: 'address_phone', title: 'Address and Phone',
      answers: [
        ans('home_address', 'Home address', p.countryOfResidence, ev('candidate_input', 'Residence'), 'low', { note: 'Confirm the full street address.' }),
        ans('email', 'Email address', p.email, ev('candidate_input', 'Profile'), 'high'),
        ans('phone', 'Primary phone number', p.phone, ev('candidate_input', 'Profile'), 'medium'),
        ans('social_media', 'Social media — platform & handle', null, [], 'unknown', { note: 'Required since 2019 — list your social-media presence from the last 5 years.' }),
      ],
    },
    {
      key: 'passport', title: 'Passport / Travel Document',
      answers: [
        ans('passport_number', 'Passport number', passport?.documentNumber, ev('passport_scan', 'MRZ extraction'), 'high'),
        ans('passport_country', 'Country/Authority that issued passport', passport?.issuingAuthority, ev('passport_scan', 'Passport'), 'high'),
        ans('passport_issue', 'Issuance date', passport?.issueDate, ev('passport_scan', 'Passport'), 'high'),
        ans('passport_expiry', 'Expiration date', passport?.expirationDate, ev('passport_scan', 'Passport'), 'high'),
      ],
    },
    {
      key: 'us_contact', title: 'U.S. Point of Contact',
      answers: [
        ans('contact_name', 'Contact person or organization', school?.schoolName ?? edu?.school, ev('i20', 'School (I-20)'), 'medium'),
        ans('contact_address', 'U.S. contact address', null, [], 'unknown', { note: 'The school address from the I-20.' }),
      ],
    },
    {
      key: 'family', title: 'Family Information: Relatives',
      answers: [
        ans('father_surname', 'Father’s surnames', null, [], 'unknown'),
        ans('father_given', 'Father’s given names', null, [], 'unknown'),
        ans('mother_surname', 'Mother’s surnames', null, [], 'unknown'),
        ans('mother_given', 'Mother’s given names', null, [], 'unknown'),
        ans('relatives_in_us', 'Do you have immediate relatives in the U.S.?', null, [], 'unknown'),
      ],
    },
    {
      key: 'present_work', title: 'Present Work / Education / Training',
      answers: [
        ans('primary_occupation', 'Primary occupation', emp?.role, ev('offer_letter', 'Employment record'), 'medium'),
        ans('present_employer', 'Present employer / school name', emp?.employer, ev('offer_letter', 'Employment record'), 'medium'),
        ans('present_duties', 'Briefly describe your duties', emp?.specialty, ev('offer_letter', 'Employment record'), 'low'),
      ],
    },
    {
      key: 'prev_work', title: 'Previous Work / Education / Training',
      answers: [
        ans('prev_employer', 'Previous employer', prevEmp?.employer, ev('offer_letter', 'Employment record'), 'medium'),
        ans('education_institution', 'Educational institution attended', edu?.school, ev('transcript', 'Transcript'), 'high'),
      ],
    },
    {
      key: 'security', title: 'Security and Background (Parts 1–5)',
      answers: [
        ans('sec_health', 'Part 1 — Medical/health (communicable disease, disorder, drug abuse)', null, [], 'unknown', { sensitive: true, note: 'The candidate must answer all Part 1 questions personally.' }),
        ans('sec_criminal', 'Part 2 — Criminal (arrests, convictions, controlled substances)', null, [], 'unknown', { sensitive: true, note: 'Never auto-answered. The candidate must answer personally.' }),
        ans('sec_security', 'Part 3 — Security (espionage, terrorism, genocide)', null, [], 'unknown', { sensitive: true, note: 'The candidate must answer personally.' }),
        ans('sec_immigration', 'Part 4 — Immigration violations (fraud/misrepresentation, removal, overstay)', null, [], 'unknown', { sensitive: true, note: 'The candidate must answer personally; any prior overstay/refusal must be disclosed.' }),
        ans('sec_misc', 'Part 5 — Miscellaneous (child custody, unlawful voting, renunciation)', null, [], 'unknown', { sensitive: true, note: 'The candidate must answer personally.' }),
      ],
    },
    {
      key: 'sevis', title: 'Student/Exchange Visa (SEVIS) Information',
      answers: [
        ans('sevis_id', 'SEVIS ID', school?.i20Number ?? edu?.sevisId, ev('i20', 'I-20 / SEVIS'), 'high'),
        ans('sevis_school', 'School name', school?.schoolName, ev('i20', 'I-20'), 'high'),
        ans('course_of_study', 'Course of study', school?.programName, ev('i20', 'I-20'), 'medium'),
        ans('school_address', 'School address', null, [], 'unknown', { note: 'From the I-20.' }),
      ],
    },
  ]
}

/** Common identity answers reused by the licensure/credentialing forms. */
function identityAnswers(d: CandidateDossier): FormAnswer[] {
  const p = d.profile
  const passport = d.identityDocuments.find((x) => x.kind === 'passport')
  return [
    ans('legal_name', 'Legal name (exact)', [p.legalFirstName, p.legalMiddleName, p.legalLastName].filter(Boolean).join(' '), ev('passport_scan', 'Passport'), 'high'),
    ans('dob', 'Date of birth', p.dateOfBirth, ev('passport_scan', 'Passport'), 'high'),
    ans('passport_number', 'Passport number', passport?.documentNumber, ev('passport_scan', 'Passport'), 'high'),
  ]
}

const nclex: Builder = (d) => {
  const reg = d.nclex[0]
  const edu = d.education[0]
  return [
    { key: 'identity', title: 'Identity (must match exactly at the exam)', answers: identityAnswers(d) },
    {
      key: 'registration', title: 'Pearson VUE Registration',
      answers: [
        ans('nrb', 'Nursing regulatory body / state', reg?.nrb ?? d.profile.nclexState, ev('candidate_input', 'Target state'), 'medium'),
        ans('program_code', 'Program code', reg?.programCode, ev('candidate_input', 'Candidate'), 'medium'),
        ans('email', 'Registration email', reg?.email ?? d.profile.email, ev('candidate_input', 'Candidate'), 'high'),
        ans('pearson_name', 'Name as entered with Pearson', reg?.nameOnPearson, ev('derived', 'Pearson record'), 'high', { note: 'Must match the identification presented at the appointment exactly.' }),
        ans('education', 'Nursing program', edu?.school, ev('transcript', 'Transcript'), 'high'),
      ],
    },
  ]
}

const florida: Builder = (d) => [
  { key: 'identity', title: 'Applicant Identity', answers: identityAnswers(d) },
  {
    key: 'application', title: 'Florida RN-by-Exam Application',
    answers: [
      ans('education', 'Nursing program', d.education[0]?.school, ev('transcript', 'Transcript'), 'high'),
      ans('fingerprint', 'Livescan fingerprinting (FDLE)', null, [], 'unknown', { afterArrival: true, note: 'In-person Live Scan — done after you arrive in the U.S.' }),
      ans('english', 'English proficiency', d.englishExams.find((x) => x.passed)?.exam ?? null, ev('english_score', 'Score report'), 'medium'),
    ],
  },
]

const newyork: Builder = (d) => [
  { key: 'identity', title: 'Applicant Identity', answers: identityAnswers(d) },
  {
    key: 'form1', title: 'NYSED Form 1',
    answers: [
      ans('education', 'Acceptable nursing program', d.education[0]?.school, ev('transcript', 'Transcript'), 'high'),
      ans('infection_control', 'Infection-control coursework', null, [], 'unknown', { note: 'Required NY coursework — candidate must complete.' }),
      ans('child_abuse', 'Child-abuse identification coursework', null, [], 'unknown', { note: 'Required NY coursework — candidate must complete.' }),
    ],
  },
]

const texas: Builder = (d) => [
  { key: 'identity', title: 'Applicant Identity', answers: identityAnswers(d) },
  {
    key: 'application', title: 'Texas RN-by-Exam (Nurse Portal)',
    answers: [
      ans('education', 'Nursing program', d.education[0]?.school, ev('transcript', 'Transcript'), 'high'),
      ans('fingerprint', 'DPS/FBI fingerprinting', null, [], 'unknown', { afterArrival: true, note: 'In-person fingerprinting via Texas DPS/FBI — done after you arrive in the U.S.' }),
      ans('credential', 'Credential evaluation (IEN)', null, [], 'unknown', { note: 'Independent credential review for internationally-educated applicants.' }),
    ],
  },
]

const california: Builder = (d) => [
  { key: 'identity', title: 'Applicant Identity', answers: identityAnswers(d) },
  {
    key: 'application', title: 'California BRN Application',
    answers: [
      ans('education', 'Nursing program', d.education[0]?.school, ev('transcript', 'Transcript'), 'high'),
      ans('transcripts', 'Official transcripts (mailed)', null, [], 'unknown', { note: 'Mail official transcripts; certified English translation if not in English.' }),
      ans('english', 'English proficiency', d.englishExams.find((x) => x.passed)?.exam ?? null, ev('english_score', 'Score report'), 'medium'),
    ],
  },
]

const arizona: Builder = (d) => [
  { key: 'identity', title: 'Applicant Identity', answers: identityAnswers(d) },
  {
    key: 'application', title: 'Arizona BON Application',
    answers: [
      ans('education', 'Nursing program', d.education[0]?.school, ev('transcript', 'Transcript'), 'high'),
      ans('credential', 'Credential review (to AZBN)', null, [], 'unknown', { note: 'TruMerit/CGFNS, ERES, or Josef Silny report sent directly to AZBN (post-9/15/2006 graduates).' }),
      ans('english', 'English validation', d.englishExams.find((x) => x.passed)?.exam ?? null, ev('english_score', 'Score report'), 'medium'),
    ],
  },
]

const endorsement: Builder = (d) => {
  const usLicense = d.licenses.find((l) => l.kind === 'us_state')
  const target = resolveEndorsement(d.profile.employmentState) // complete entry for any of the 51 jurisdictions
  const src = target.officialResources[0] // every requirement ties back to the board's official page
  const answers: FormAnswer[] = [
    ans('current_license', 'Current U.S. RN license', usLicense ? `${usLicense.jurisdiction} #${usLicense.licenseNumber ?? '—'}` : null, ev('license_doc', 'License'), 'high'),
    ans('target_state', 'Target state', d.profile.employmentState, ev('candidate_input', 'Employer offer'), 'high'),
    ans('endorse_application', `${target.board} application`, null, [], 'unknown', { source: src, feeUsd: target.feeUsd, note: `Submit the ${target.state} endorsement application.` }),
    ans('verification', 'License verification', null, [], 'unknown', { source: src, note: target.verification }),
    ans('fingerprints', 'Background check / fingerprints', null, [], 'unknown', { afterArrival: true, source: src, note: target.fingerprints }),
  ]
  if (target.jurisprudence) answers.push(ans('jurisprudence', 'Jurisprudence exam', null, [], 'unknown', { source: src, note: target.jurisprudence }))
  if (target.continuingEd) answers.push(ans('continuing_ed', 'Continuing education', null, [], 'unknown', { source: src, note: target.continuingEd }))
  return [
    { key: 'identity', title: 'Applicant Identity', answers: identityAnswers(d) },
    { key: 'endorsement', title: `Endorsement → ${target.state}`, answers },
  ]
}

const cgfns: Builder = (d) => [
  { key: 'identity', title: 'Applicant Identity', answers: identityAnswers(d) },
  {
    key: 'ces', title: 'CGFNS Credentials Evaluation',
    answers: [
      ans('education', 'Nursing education', d.education[0]?.school, ev('transcript', 'Transcript'), 'high'),
      ans('home_license', 'Home-country license', d.licenses.find((l) => l.kind === 'home_country')?.licenseNumber, ev('license_doc', 'License'), 'medium'),
      ans('report_type', 'Required report type', d.profile.nclexState ? `Board-specific (${d.profile.nclexState})` : null, ev('derived', 'Rule engine'), 'medium'),
    ],
  },
]

const visaAppt: Builder = (d) => {
  const ds = d.workflows.find((w) => w.type === 'ds160')
  const signed = !!ds && ['candidate_signed', 'submitted', 'completed'].includes(ds.status)
  const conf = ds?.confirmationNumber ?? (signed ? 'On file' : null)
  const i901 = d.consularPaymentOrders.find((o) => o.paymentType === 'i901_sevis')
  const receipt = i901 ? d.i901Receipts.find((r) => r.paymentOrderId === i901.id && r.qaStatus === 'approved') : undefined
  return [
    {
      key: 'appointment', title: 'Visa Appointment (guided)',
      answers: [
        ans('consulate', 'Consulate', d.profile.countryOfResidence, ev('candidate_input', 'Residence'), 'medium'),
        ans('ds160_confirmation', 'Signed DS-160 confirmation number', conf, ev('derived', 'DS-160 workflow'), 'medium', { note: 'Required to schedule the interview — captured from CEAC after you submit.' }),
        ans('i901_receipt', 'I-901 receipt QA approved', receipt ? 'Verified by Florence QA' : null, receipt ? ev('i901_receipt', 'I-901 receipt') : [], receipt ? 'high' : 'unknown', { note: 'Required before Florence marks visa appointment readiness.' }),
      ],
    },
  ]
}

const sevisI20: Builder = (d) => {
  const sp = d.schoolPrograms[0]
  const i901 = d.consularPaymentOrders.find((o) => o.paymentType === 'i901_sevis')
  const receipt = i901 ? d.i901Receipts.find((r) => r.paymentOrderId === i901.id && r.qaStatus === 'approved') : undefined
  return [
    { key: 'identity', title: 'Applicant Identity', answers: identityAnswers(d) },
    {
      key: 'sevis', title: 'SEVIS / Form I-20',
      answers: [
        ans('school', 'SEVP-certified school', sp?.schoolName, ev('i20', 'I-20'), 'medium'),
        ans('program', 'Program', sp?.programName, ev('i20', 'I-20'), 'medium'),
        ans('sevis_id', 'SEVIS ID / I-20 number', sp?.i20Number, ev('i20', 'I-20'), 'high'),
        ans('school_code', 'School Code', sp?.sevisSchoolCode, ev('i20', 'I-20'), 'medium'),
        ans('i901', 'I-901 SEVIS fee', receipt ? 'Receipt verified' : i901?.status ?? null, receipt ? ev('i901_receipt', 'I-901 receipt') : [], receipt ? 'high' : i901 ? 'medium' : 'unknown', { note: 'Pay through the approved SEVISmate handoff or official path; Florence verifies the receipt before visa appointment readiness.' }),
      ],
    },
  ]
}

const fullName = (d: CandidateDossier) => [d.profile.legalFirstName, d.profile.legalLastName].filter(Boolean).join(' ')

const universityAdmission: Builder = (d) => {
  const sp = d.schoolPrograms[0]
  const eng = d.englishExams[0]
  return [
    { key: 'identity', title: 'Applicant Identity', answers: identityAnswers(d) },
    {
      key: 'admission', title: 'University Admission (F-1 program)',
      answers: [
        ans('school', 'SEVP-certified school', sp?.schoolName, ev('candidate_input', 'Program'), 'medium'),
        ans('program', 'Program', sp?.programName, ev('candidate_input', 'Program'), 'medium'),
        ans('start', 'Program start', sp?.startDate, ev('candidate_input', 'Program'), 'medium'),
        ans('prior_education', 'Prior nursing degree', d.education[0] ? `${d.education[0].degree}, ${d.education[0].school}` : null, ev('transcript', 'Transcript'), 'high'),
        ans('english', 'English proficiency', eng ? `${eng.exam} ${eng.overall ?? ''}`.trim() : null, ev('english_score', 'Score report'), 'medium'),
        ans('admission_decision', 'Admission decision', null, [], 'unknown', { note: 'Captured when the school issues an acceptance — admission triggers the I-20.' }),
      ],
    },
  ]
}

// Financing packet — assembled from the SAME profile, but ONLY when the candidate
// has granted the `underwriting` consent scope. Otherwise we emit a consent gate.
const financingPacket: Builder = (d) => {
  if (!canShare(d.profile, 'underwriting')) {
    return [{
      key: 'consent', title: 'Financing packet — consent required',
      answers: [ans('consent', 'Florence Capital data-sharing', null, [], 'unknown', { sensitive: true, note: 'Turn on “Florence Capital (financing)” sharing to let Florence assemble your financing packet from your profile. We never share it otherwise.' })],
    }]
  }
  const off = d.employerOffers[0]
  const fin = d.financing[0]
  const sp = d.schoolPrograms[0]
  return [
    {
      key: 'borrower', title: 'Borrower packet (from your profile)',
      answers: [
        ans('legal_name', 'Legal name', fullName(d), ev('passport_scan', 'Passport'), 'high'),
        ans('target_state', 'Target state', d.profile.employmentState, ev('candidate_input', 'Profile'), 'medium'),
        ans('admission', 'Admission status', sp?.schoolName ? `Admitted — ${sp.schoolName}` : null, ev('derived', 'Admission workflow'), 'medium'),
        ans('coa', 'Cost of attendance (COA)', fin?.coaPackage, ev('candidate_input', 'Financing'), 'medium', { note: 'COA package from the admitting school.' }),
        ans('i20_ready', 'I-20 readiness', sp?.i20Number ? 'I-20 issued' : null, ev('derived', 'I-20 workflow'), 'medium'),
        ans('offer', 'Employer offer', off ? `${off.employer} (${off.contingent ? 'contingent' : 'firm'})` : null, ev('offer_letter', 'Offer'), 'medium'),
        ans('start_window', 'Expected start window', off?.startWindow ?? d.profile.targetStartDate, ev('derived', 'Pathway clock'), 'medium'),
      ],
    },
    {
      key: 'governance', title: 'Underwriting (human governance)',
      answers: [
        ans('eligibility', 'Financing eligibility', null, [], 'unknown', { sensitive: true, note: 'AI assembles & routes the packet; a Florence Capital reviewer decides eligibility under policy. Not an automated credit decision.' }),
        ans('consent_record', 'Borrower consent on file', fin?.borrowerConsent ? 'Yes' : null, ev('candidate_input', 'Consent'), 'high'),
      ],
    },
  ]
}

// Employer-ready packet — gated on the `employer` consent scope.
const employerPacket: Builder = (d) => {
  if (!canShare(d.profile, 'employer')) {
    return [{
      key: 'consent', title: 'Employer-ready packet — consent required',
      answers: [ans('consent', 'Employer data-sharing', null, [], 'unknown', { sensitive: true, note: 'Turn on “Employer matching” sharing to let Florence prepare an employer-ready packet. Employers see it only with your consent.' })],
    }]
  }
  const off = d.employerOffers[0]
  const emp = d.employment[0]
  return [
    {
      key: 'profile', title: 'Candidate (employer-ready)',
      answers: [
        ans('name', 'Name', fullName(d), ev('passport_scan', 'Passport'), 'high'),
        ans('specialty', 'Specialty & experience', emp ? `${emp.specialty ?? emp.role}${emp.employer ? ` — ${emp.employer}` : ''}` : null, ev('candidate_input', 'Employment'), 'medium'),
        ans('credentials', 'Credential summary', d.education[0] ? `${d.education[0].degree}, ${d.education[0].school}` : null, ev('transcript', 'Transcript'), 'high'),
        ans('licensure', 'Licensure pathway', d.profile.employmentState ? `${d.profile.employmentState} RN` : null, ev('derived', 'Licensure workflow'), 'medium'),
        ans('visa', 'Visa status', d.profile.visaTarget, ev('derived', 'Visa workflow'), 'medium'),
        ans('start_window', 'Target start window', off?.startWindow ?? d.profile.targetStartDate, ev('derived', 'Pathway clock'), 'medium'),
        ans('match', 'Recommended employer match', off ? `${off.employer} — ${off.role} (${off.state})` : null, ev('offer_letter', 'Offer'), 'medium'),
        ans('ats', 'ATS reference', off?.atsRef, ev('candidate_input', 'ATS'), 'low', { note: 'Pushed to the employer ATS (Workday / Taleo / iCIMS) only when QA-approved and consented.' }),
      ],
    },
  ]
}

// Generic, data-driven licensure-by-exam for ANY state (the five flagship states
// keep their own detailed builders above). Reads shared/exam-states.ts.
const rnExam: Builder = (d) => {
  const st = getExamState(d.profile.nclexState ?? d.profile.employmentState)
  const src = st.officialResources[0] // every requirement ties back to the board's official page
  const answers: FormAnswer[] = [
    ans('board_application', `${st.state} board application`, null, [], 'unknown', { source: src, feeUsd: st.feeUsd, note: `Apply to the ${st.board} for licensure by examination.` }),
    ans('credential', 'Credentials evaluation', null, [], 'unknown', { source: src, note: st.credentialEval }),
    ans('fingerprint', 'Fingerprint background check', null, [], 'unknown', { afterArrival: true, source: src, note: st.fingerprints }),
  ]
  if (st.coursework) answers.push(ans('coursework', 'Required coursework', null, [], 'unknown', { source: src, note: st.coursework }))
  if (st.jurisprudence) answers.push(ans('jurisprudence', 'Jurisprudence exam', null, [], 'unknown', { source: src, note: st.jurisprudence }))
  answers.push(ans('nclex', 'NCLEX-RN', null, [], 'unknown', { source: { label: 'NCSBN — NCLEX', url: 'https://www.ncsbn.org/nclex.htm' }, note: 'Register with Pearson VUE, receive your ATT, schedule, and pass the NCLEX-RN.' }))
  return [
    { key: 'identity', title: 'Applicant Identity', answers: identityAnswers(d) },
    { key: 'exam', title: `RN Licensure by Exam → ${st.state}`, answers },
  ]
}

const BUILDERS: Record<WorkflowType, Builder> = {
  sevis_i20: sevisI20,
  ds160,
  visa_appointment: visaAppt,
  nclex_att: nclex,
  florida_rn_exam: florida,
  newyork_rn_exam: newyork,
  texas_rn_exam: texas,
  california_rn_exam: california,
  arizona_rn_exam: arizona,
  rn_exam: rnExam,
  endorsement,
  cgfns_ces: cgfns,
  university_admission: universityAdmission,
  financing_packet: financingPacket,
  employer_packet: employerPacket,
}
