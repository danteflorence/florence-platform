import type { JurisdictionRule } from '../types'

export const californiaRule: JurisdictionRule = {
  key: 'california_rn_exam',
  jurisdiction: 'California Board of Registered Nursing',
  title: 'California RN Licensure by Examination',
  authority: 'California Board of Registered Nursing (BRN)',
  summary:
    'California BRN applicants must complete an education program meeting California requirements (international graduates are evaluated for equivalency), pass the NCLEX-RN, and submit official transcripts by mail with a certified English translation where needed. The Board recommends applying online to reduce deficiency letters.',
  estimatedTimelineDays: [90, 210],
  requirements: [
    { id: 'application', label: 'BRN application (apply online)', candidateActionRequired: true },
    { id: 'transcripts', label: 'Official international transcripts by mail', detail: 'Certified English translation if not in English.', documentNeeded: true },
    { id: 'equivalency', label: 'Program equivalency (California requirements)', documentNeeded: true },
    { id: 'fingerprint', label: 'Live Scan fingerprinting', candidateActionRequired: true },
    { id: 'nclex', label: 'Pass NCLEX-RN' },
  ],
  guardrails: [
    'International programs are reviewed for California equivalency; missing content may require coursework before the exam.',
    'Apply online and attach as much as possible to reduce deficiency letters.',
    'Submit only after candidate review and attestation/signature.',
  ],
  citations: [
    { label: 'California BRN — Licensure by Examination', note: 'Applicants must complete a program meeting California requirements and take the NCLEX-RN if not previously licensed elsewhere; missing requirements must be completed before the exam.', url: 'https://www.rn.ca.gov/applicants/lic-exam.shtml' },
    { label: 'California BRN — International graduates', note: 'Official transcripts must be mailed to the Board; non-English transcripts require a certified English translation.', url: 'https://www.rn.ca.gov/pdfs/education/edp-i-35.pdf' },
  ],
  officialResources: [
    { label: 'California BRN — Licensure by Examination', url: 'https://www.rn.ca.gov/applicants/lic-exam.shtml' },
    { label: 'California BRN — International applicant qualifications (PDF)', url: 'https://www.rn.ca.gov/pdfs/education/edp-i-35.pdf' },
    { label: 'California BRN — Applicants', url: 'https://www.rn.ca.gov/applicants/index.shtml' },
    { label: 'Register with Pearson VUE (NCLEX)', url: 'https://home.pearsonvue.com/nclex' },
  ],
  steps: [
    { key: 'application', title: 'BRN application', owner: 'agent', description: 'Prefill; apply online to reduce deficiency letters.' },
    { key: 'transcripts', title: 'Transcripts & translation', owner: 'candidate', description: 'Mail official transcripts; certified translation if needed.' },
    { key: 'fingerprint', title: 'Live Scan', owner: 'candidate', description: 'Background check.' },
    { key: 'submit', title: 'QA + candidate attests & submits', owner: 'qa', description: 'Completeness check, then candidate submits.' },
  ],
  milestones: ['CA application submitted', 'CA deficiency cleared', 'CA license issued'],
}
