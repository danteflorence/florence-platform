import type { JurisdictionRule } from '../types'

// Pathway OS production domains. Unlike the regulatory workflows (DS-160, NCLEX,
// state boards), these are Florence-operated steps — university admission,
// financing-packet assembly under Florence Capital policy, and employer-ready
// packet preparation. All keep the same posture: AI assembles & validates,
// humans QA, candidates consent/attest, nothing is an automated decision.

export const universityAdmissionRule: JurisdictionRule = {
  key: 'university_admission',
  jurisdiction: 'SEVP-certified institution',
  title: 'University Admission (F-1 program)',
  authority: 'U.S. school (DSO) · ICE SEVP',
  summary:
    'Admission to a SEVP-certified program is the on-ramp to the F-1: the school’s DSO issues the I-20 (and SEVIS record) only after admission. Florence matches the candidate to a program and prepares the application from the canonical profile.',
  estimatedTimelineDays: [21, 60],
  requirements: [
    { id: 'program', label: 'SEVP-certified program selected' },
    { id: 'transcripts', label: 'Prior nursing transcripts', documentNeeded: true },
    { id: 'english', label: 'English proficiency (IELTS/TOEFL) where required' },
    { id: 'financial', label: 'Financial documentation for the I-20', documentNeeded: true },
  ],
  guardrails: [
    'Only SEVP-certified schools can issue an I-20 — verify certification before recommending a program.',
    'Florence prepares the application; the school makes the admission decision and the DSO issues the I-20.',
  ],
  citations: [
    { label: 'ICE — Study in the States: school search', note: 'Only schools certified by the Student and Exchange Visitor Program (SEVP) may enroll F-1 students and issue Form I-20.', url: 'https://studyinthestates.dhs.gov/school-search' },
  ],
  officialResources: [
    { label: 'ICE Study in the States — SEVP school search', url: 'https://studyinthestates.dhs.gov/school-search' },
    { label: 'Study in the States — Form I-20', url: 'https://studyinthestates.dhs.gov/students/get-started/the-form-i-20' },
  ],
  steps: [
    { key: 'shortlist', title: 'Match to a SEVP-certified program', owner: 'agent', description: 'Recommend by specialty, cost, and F-1/CPT fit.' },
    { key: 'packet', title: 'Prepare application packet', owner: 'agent', description: 'Prefill from the canonical profile.' },
    { key: 'submit', title: 'Submit & track admission', owner: 'system', description: 'Admission triggers the I-20.' },
  ],
  milestones: ['University application submitted', 'Admitted'],
}

export const financingPacketRule: JurisdictionRule = {
  key: 'financing_packet',
  jurisdiction: 'Florence Capital',
  title: 'Financing Packet (Florence Capital)',
  authority: 'Florence Capital (human-governed)',
  summary:
    'A financing packet assembled from the same pathway data — identity, admission, cost of attendance, I-20 readiness, employer offer, target state, expected wage, and start window. AI assembles and routes; a Florence Capital reviewer decides eligibility under policy. This is not an automated credit decision.',
  estimatedTimelineDays: [7, 21],
  requirements: [
    { id: 'consent', label: 'Borrower data-sharing consent (underwriting scope)' },
    { id: 'coa', label: 'Cost of attendance (COA) from the admitting school' },
    { id: 'offer', label: 'Employer offer status (readiness- or offer-backed)' },
    { id: 'start_window', label: 'Expected start window' },
  ],
  guardrails: [
    'Florence Capital sees profile data only when the candidate grants the underwriting consent scope.',
    'AI prepares and routes the packet; eligibility is decided by a human reviewer under Florence Capital policy — never a black-box model.',
    'Do not present a prepared packet as an approval or a guaranteed rate.',
  ],
  citations: [
    { label: 'CFPB — student loans (consumer guidance)', note: 'Borrowers should understand loan terms, repayment, and disclosures before borrowing.', url: 'https://www.consumerfinance.gov/consumer-tools/student-loans/' },
  ],
  officialResources: [
    { label: 'CFPB — Student loans', url: 'https://www.consumerfinance.gov/consumer-tools/student-loans/' },
  ],
  steps: [
    { key: 'assemble', title: 'Assemble packet from profile', owner: 'agent', description: 'COA, admission, I-20, offer, target state, start window.' },
    { key: 'qa', title: 'Human QA review', owner: 'qa', description: 'Packet completeness before routing.' },
    { key: 'route', title: 'Route to Florence Capital', owner: 'system', description: 'Under Capital policy and human governance.' },
  ],
  milestones: ['Financing packet complete', 'Financing routed'],
}

export const employerPacketRule: JurisdictionRule = {
  key: 'employer_packet',
  jurisdiction: 'Florence Pathway OS',
  title: 'Employer-Ready Packet',
  authority: 'Florence (human-governed) · employer ATS',
  summary:
    'Once licensure and visa are on track, Florence assembles an employer-ready packet — credential summary, readiness, licensure pathway, target start, visa status, specialty — and shares it with employers (Workday / Taleo / iCIMS) only when QA-approved and the candidate has consented.',
  estimatedTimelineDays: [7, 21],
  requirements: [
    { id: 'consent', label: 'Employer data-sharing consent (employer scope)' },
    { id: 'licensure', label: 'Licensure pathway on track' },
    { id: 'visa', label: 'Visa status on track' },
    { id: 'specialty', label: 'Specialty & experience summary' },
  ],
  guardrails: [
    'Employers see the packet only when the candidate grants the employer consent scope.',
    'A reviewer signs off before any employer or ATS receives the packet.',
    'Pathway OS gates eligibility to be pushed into employer workflows — it does not auto-submit to employers.',
  ],
  citations: [
    { label: 'Florence Pathway OS — employer readiness', note: 'Eligibility to be shared with employers is gated on licensure/visa progress, QA signoff, and explicit candidate consent.' },
  ],
  officialResources: [],
  steps: [
    { key: 'assemble', title: 'Assemble employer packet', owner: 'agent', description: 'Credentials, readiness, licensure, start window, specialty.' },
    { key: 'qa', title: 'Human QA review', owner: 'qa', description: 'Signoff before any employer sees the packet.' },
    { key: 'push', title: 'Share with employer / ATS', owner: 'system', description: 'Only when QA-approved and consented.' },
  ],
  milestones: ['Employer packet ready', 'Shared with employer'],
}
