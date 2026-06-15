import type { JurisdictionRule } from '../types'

export const floridaRule: JurisdictionRule = {
  key: 'florida_rn_exam',
  jurisdiction: 'Florida Board of Nursing',
  title: 'Florida RN Licensure by Examination',
  authority: 'Florida Board of Nursing / FDLE',
  summary:
    'Florida applications can take two to six months; complete applications process more efficiently and incomplete ones trigger deficiency letters. Initial applicants must complete electronic (Livescan) fingerprinting submitted to FDLE for national criminal-history review.',
  estimatedTimelineDays: [60, 180],
  requirements: [
    { id: 'application', label: 'RN-by-exam application', candidateActionRequired: true },
    { id: 'fingerprint', label: 'Electronic (Livescan) fingerprints', detail: 'Submitted to FDLE for state + national criminal-history check.', candidateActionRequired: true },
    { id: 'edu_verify', label: 'Education / program verification', documentNeeded: true },
    { id: 'fees', label: 'Application fees', candidateActionRequired: true },
    { id: 'english', label: 'English proficiency (if required for IEN)' },
  ],
  guardrails: [
    'Complete applications are processed more efficiently — front-load completeness to avoid deficiency letters.',
    'Deficiency letters are issued for anything missing; intake and respond promptly.',
    'Submit only after candidate review and attestation/signature.',
  ],
  citations: [
    { label: 'Florida BON — Licensing', note: 'Applications take ~2–6 months; complete applications process more efficiently; deficiency letters are issued when incomplete.', url: 'https://floridasnursing.gov/licensing/' },
    { label: 'Florida BON — RN-by-Exam application', note: 'The name on the application must match your Pearson VUE NCLEX name exactly or you will not be allowed to test; all applicants are background-screened.', url: 'https://floridasnursing.gov/forms/lpn-rn-exam-app.pdf' },
  ],
  officialResources: [
    { label: 'Florida BON — Licensing', url: 'https://floridasnursing.gov/licensing/' },
    { label: 'Florida RN-by-Exam application (PDF)', url: 'https://floridasnursing.gov/forms/lpn-rn-exam-app.pdf' },
    { label: 'Register with Pearson VUE (NCLEX)', url: 'https://home.pearsonvue.com/nclex' },
  ],
  steps: [
    { key: 'packet', title: 'Prefill application packet', owner: 'agent', description: 'Prefill from the candidate profile.' },
    { key: 'fingerprint', title: 'Livescan fingerprinting', owner: 'candidate', description: 'Complete electronic fingerprints to FDLE.' },
    { key: 'qa', title: 'Completeness QA', owner: 'qa', description: 'Verify completeness before submission.' },
    { key: 'submit', title: 'Candidate attests & submits', owner: 'candidate', description: 'Candidate signs and submits.' },
  ],
  milestones: ['FL application submitted', 'FL deficiency cleared', 'FL license issued'],
}
