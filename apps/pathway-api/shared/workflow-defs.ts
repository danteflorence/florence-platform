import type { WorkflowType, WorkflowStep } from './types'

type StepDef = Omit<WorkflowStep, 'status'>

interface WorkflowTemplate {
  title: string
  steps: StepDef[]
}

// Step templates per workflow. The Workflow Agent instantiates these into a
// live WorkflowInstance and the engine advances step status as data, QA, and
// candidate actions complete. `owner` makes the human-in-the-loop explicit.
export const WORKFLOW_TEMPLATES: Record<WorkflowType, WorkflowTemplate> = {
  sevis_i20: {
    title: 'SEVIS / Form I-20 & I-901 Fee',
    steps: [
      { key: 'acceptance', title: 'Confirm school acceptance', owner: 'candidate', description: 'Admission to a SEVP-certified school.' },
      { key: 'i20', title: 'Receive Form I-20 from the school (DSO)', owner: 'system', description: 'The school’s DSO issues the I-20 with your SEVIS ID; you (and a parent, if under 18) sign it.' },
      { key: 'fee', title: 'Pay the I-901 SEVIS fee', owner: 'candidate', description: 'Pay at the official FMJfee.com using the School Code and SEVIS ID from your I-20.' },
      { key: 'receipt', title: 'Keep the payment receipt', owner: 'system', description: 'Show proof of the I-901 payment at your visa interview.' },
    ],
  },
  ds160: {
    title: 'DS-160 Visa Application',
    steps: [
      { key: 'extract', title: 'Extract identity & travel data', owner: 'agent', description: 'Pull from passport, I-20, employment, and travel history.' },
      { key: 'map', title: 'Map data into DS-160 fields', owner: 'agent', description: 'Section-by-section field mapping with provenance.' },
      { key: 'missing', title: 'Collect missing data', owner: 'candidate', description: 'Travel history (5y), prior visa history, family details.' },
      { key: 'consistency', title: 'Run consistency checks', owner: 'agent', description: 'Name, passport validity, dates, prior refusals.' },
      { key: 'qa', title: 'Human QA review', owner: 'qa', description: 'Reviewer approves answers, sources, and risk flags.' },
      { key: 'candidate_review', title: 'Candidate review', owner: 'candidate', description: 'Candidate reviews the draft in plain language.' },
      { key: 'sign', title: 'Applicant signs in CEAC', owner: 'candidate', description: 'Applicant must personally click "Sign Application" — required by law.' },
      { key: 'confirm', title: 'Record confirmation', owner: 'system', description: 'Capture the DS-160 confirmation barcode for the appointment.' },
    ],
  },
  visa_appointment: {
    title: 'Visa Appointment Scheduling',
    steps: [
      { key: 'prereq', title: 'Confirm DS-160 signed', owner: 'system', description: 'Appointment requires a signed DS-160 confirmation page.' },
      { key: 'consulate', title: 'Select consulate', owner: 'agent', description: 'Recommend post by residence and wait times.' },
      { key: 'fees', title: 'Fee payment checklist', owner: 'candidate', description: 'MRV fee / SEVIS I-901 where applicable.' },
      { key: 'schedule', title: 'Guided scheduling', owner: 'candidate', description: 'Step-by-step on the official portal. No automation/scraping.' },
      { key: 'docs', title: 'Interview document checklist', owner: 'agent', description: 'Assemble interview-day documents.' },
      { key: 'prep', title: 'Interview preparation', owner: 'agent', description: 'Plain-language prep tailored to the candidate.' },
    ],
  },
  nclex_att: {
    title: 'NCLEX Registration & ATT',
    steps: [
      { key: 'nrb', title: 'Identify NRB / state board', owner: 'agent', description: 'Determine the regulatory body for the target state.' },
      { key: 'namematch', title: 'Exact name-match validation', owner: 'agent', description: 'Passport ↔ ID ↔ board app ↔ Pearson must match exactly.' },
      { key: 'register', title: 'Pearson registration checklist', owner: 'candidate', description: 'Program code, email, payment, exact name.' },
      { key: 'eligibility', title: 'Track NRB eligibility', owner: 'system', description: 'Candidate-reported status until board declares eligible.' },
      { key: 'att', title: 'ATT issued', owner: 'system', description: 'Authorization to Test received (avg ~90-day validity).' },
      { key: 'schedule', title: 'Schedule exam', owner: 'candidate', description: 'Readiness-gated: schedule when cleared or QA-approved exception.' },
    ],
  },
  florida_rn_exam: {
    title: 'Florida RN Licensure by Exam',
    steps: [
      { key: 'eligibility', title: 'Eligibility logic', owner: 'agent', description: 'Florida BON requirements for IEN applicants.' },
      { key: 'packet', title: 'Application packet prefill', owner: 'agent', description: 'Prefill from the candidate profile.' },
      { key: 'fingerprint', title: 'Livescan fingerprinting', owner: 'candidate', description: 'Electronic fingerprints to FDLE/FBI.' },
      { key: 'edu_verify', title: 'Education verification', owner: 'system', description: 'Request and track program verification.' },
      { key: 'qa', title: 'Human QA review', owner: 'qa', description: 'Completeness check — complete apps process faster.' },
      { key: 'sign', title: 'Candidate attestation & submit', owner: 'candidate', description: 'Candidate attests and submits.' },
    ],
  },
  newyork_rn_exam: {
    title: 'New York RN Licensure by Exam',
    steps: [
      { key: 'eligibility', title: 'Eligibility logic', owner: 'agent', description: 'NYSED requirements: age, good moral character, acceptable program.' },
      { key: 'form1', title: 'Form 1 packet prefill', owner: 'agent', description: 'Prefill NYSED Form 1.' },
      { key: 'coursework', title: 'Coursework tracking', owner: 'candidate', description: 'Infection-control + child-abuse coursework.' },
      { key: 'edu_verify', title: 'Education verification', owner: 'system', description: 'Track acceptable-program verification.' },
      { key: 'qa', title: 'Human QA review', owner: 'qa', description: 'Incomplete applications delay review.' },
      { key: 'sign', title: 'Candidate attestation & submit', owner: 'candidate', description: 'Candidate attests and submits.' },
    ],
  },
  texas_rn_exam: {
    title: 'Texas RN Licensure by Examination',
    steps: [
      { key: 'eligibility', title: 'Eligibility logic', owner: 'agent', description: 'Texas BON requirements; board-approved or independently-verified program.' },
      { key: 'portal', title: 'Texas Nurse Portal application', owner: 'agent', description: 'Prefill the NCLEX application in the Texas Nurse Portal.' },
      { key: 'fingerprint', title: 'DPS/FBI fingerprinting', owner: 'candidate', description: 'Criminal background check via Texas DPS and the FBI.' },
      { key: 'credential', title: 'Credential evaluation', owner: 'system', description: 'Independent credential review for internationally-educated applicants.' },
      { key: 'qa', title: 'Human QA review', owner: 'qa', description: 'Completeness check before submission.' },
      { key: 'sign', title: 'Candidate attestation & submit', owner: 'candidate', description: 'Candidate attests and submits.' },
    ],
  },
  california_rn_exam: {
    title: 'California RN Licensure by Examination',
    steps: [
      { key: 'eligibility', title: 'Eligibility logic', owner: 'agent', description: 'California BRN program-equivalency requirements.' },
      { key: 'application', title: 'BRN application', owner: 'agent', description: 'Prefill the BRN application (apply online to reduce deficiency letters).' },
      { key: 'transcripts', title: 'International transcripts', owner: 'candidate', description: 'Official transcripts mailed to the Board; certified English translation if needed.' },
      { key: 'fingerprint', title: 'Live Scan fingerprinting', owner: 'candidate', description: 'Background check.' },
      { key: 'qa', title: 'Human QA review', owner: 'qa', description: 'Completeness check before submission.' },
      { key: 'sign', title: 'Candidate attestation & submit', owner: 'candidate', description: 'Candidate attests and submits.' },
    ],
  },
  arizona_rn_exam: {
    title: 'Arizona RN Licensure by Examination',
    steps: [
      { key: 'eligibility', title: 'Eligibility logic', owner: 'agent', description: 'Arizona BON requirements for internationally-educated applicants.' },
      { key: 'credential', title: 'Credential & English review', owner: 'system', description: 'TruMerit/CGFNS, ERES, or Josef Silny report + English (IELTS/PTE) validation.' },
      { key: 'application', title: 'AZBN application', owner: 'agent', description: 'Prefill the AZBN application.' },
      { key: 'fingerprint', title: 'Fingerprint clearance', owner: 'candidate', description: 'Background check.' },
      { key: 'qa', title: 'Human QA review', owner: 'qa', description: 'Completeness check before submission.' },
      { key: 'sign', title: 'Candidate attestation & submit', owner: 'candidate', description: 'Candidate attests and submits.' },
    ],
  },
  rn_exam: {
    title: 'RN Licensure by Examination',
    steps: [
      { key: 'eligibility', title: 'Eligibility logic', owner: 'agent', description: 'Determine the target state board’s requirements for internationally-educated applicants.' },
      { key: 'application', title: 'Board application prefill', owner: 'agent', description: 'Prefill the state board’s licensure-by-exam application from your profile.' },
      { key: 'credential', title: 'Credential evaluation', owner: 'system', description: 'CGFNS or board-approved credentials evaluation for IEN applicants.' },
      { key: 'fingerprint', title: 'Fingerprint background check', owner: 'candidate', description: 'In-person fingerprinting after you arrive.' },
      { key: 'qa', title: 'Human QA review', owner: 'qa', description: 'Completeness check before submission.' },
      { key: 'sign', title: 'Candidate attestation & submit', owner: 'candidate', description: 'Candidate attests and submits.' },
    ],
  },
  endorsement: {
    title: 'Licensure by Endorsement',
    steps: [
      { key: 'states', title: 'Identify current & target state', owner: 'agent', description: 'Determine endorsement availability.' },
      { key: 'requirements', title: 'Map requirements', owner: 'agent', description: 'Verification, fingerprints, CE, jurisprudence, compact.' },
      { key: 'verify', title: 'License verification', owner: 'system', description: 'Nursys or non-Nursys verification request.' },
      { key: 'packet', title: 'Application prefill', owner: 'agent', description: 'Prefill the endorsement application.' },
      { key: 'qa', title: 'Human QA review', owner: 'qa', description: 'Reviewer signoff before filing.' },
      { key: 'sign', title: 'Candidate attestation & submit', owner: 'candidate', description: 'Candidate attests and submits.' },
    ],
  },
  cgfns_ces: {
    title: 'CGFNS Credentials Evaluation',
    steps: [
      { key: 'order', title: 'Determine required CES report', owner: 'agent', description: 'Report type by target board.' },
      { key: 'docs', title: 'Document checklist', owner: 'candidate', description: 'Education, transcripts, license verification to CGFNS.' },
      { key: 'english', title: 'English exam check', owner: 'agent', description: 'IELTS/OET status where required.' },
      { key: 'submit', title: 'Submit & track', owner: 'system', description: 'Track CGFNS processing and report delivery.' },
    ],
  },
  university_admission: {
    title: 'University Admission (F-1 program)',
    steps: [
      { key: 'shortlist', title: 'Match to a SEVP-certified program', owner: 'agent', description: 'Recommend a program by specialty, cost, and F-1/CPT fit.' },
      { key: 'packet', title: 'Prepare application packet', owner: 'agent', description: 'Prefill the school application from your profile.' },
      { key: 'docs', title: 'Collect required documents', owner: 'candidate', description: 'Transcripts, English scores, financial documentation.' },
      { key: 'qa', title: 'Human QA review', owner: 'qa', description: 'Completeness check before submission.' },
      { key: 'submit', title: 'Submit & track admission', owner: 'system', description: 'Track the admission decision — admission triggers the I-20.' },
    ],
  },
  financing_packet: {
    title: 'Financing Packet (Florence Capital)',
    steps: [
      { key: 'consent', title: 'Confirm financing consent', owner: 'candidate', description: 'Grant Florence Capital data-sharing to assemble your packet.' },
      { key: 'assemble', title: 'Assemble packet from profile', owner: 'agent', description: 'COA, admission, I-20, employer offer, target state, start window.' },
      { key: 'qa', title: 'Human QA review', owner: 'qa', description: 'Packet completeness before routing.' },
      { key: 'route', title: 'Route to Florence Capital', owner: 'system', description: 'AI-assisted routing under Capital policy — never an automated credit decision.' },
    ],
  },
  employer_packet: {
    title: 'Employer-Ready Packet',
    steps: [
      { key: 'gate', title: 'Confirm employer-ready', owner: 'system', description: 'Eligible once licensure & visa are on track and consent is granted.' },
      { key: 'assemble', title: 'Assemble employer packet', owner: 'agent', description: 'Credentials, readiness, licensure pathway, start window, specialty.' },
      { key: 'qa', title: 'Human QA review', owner: 'qa', description: 'Reviewer signoff before any employer sees the packet.' },
      { key: 'push', title: 'Share with employer / ATS', owner: 'system', description: 'Push to Workday / Taleo / iCIMS only when QA-approved and consented.' },
    ],
  },
}
