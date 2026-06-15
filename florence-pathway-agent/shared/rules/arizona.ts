import type { JurisdictionRule } from '../types'

export const arizonaRule: JurisdictionRule = {
  key: 'arizona_rn_exam',
  jurisdiction: 'Arizona State Board of Nursing',
  title: 'Arizona RN Licensure by Examination',
  authority: 'Arizona State Board of Nursing (AZBN)',
  summary:
    'Internationally-educated nurses who have not passed the NCLEX apply to the AZBN for licensure by examination. Graduates after Sept 15, 2006 must send an independent credential review (TruMerit/CGFNS, ERES, or Josef Silny) directly to AZBN and validate English proficiency (e.g., IELTS or PTE Academic). A passing NCLEX score is required.',
  estimatedTimelineDays: [60, 180],
  requirements: [
    { id: 'credential', label: 'Independent credential review to AZBN', detail: 'TruMerit/CGFNS, ERES, or Josef Silny (post-9/15/2006 graduates).', documentNeeded: true },
    { id: 'english', label: 'English proficiency validation', detail: 'IELTS or PTE Academic, if the country language was not English.', documentNeeded: true },
    { id: 'application', label: 'AZBN application', candidateActionRequired: true },
    { id: 'fingerprint', label: 'Fingerprint clearance', candidateActionRequired: true },
    { id: 'nclex', label: 'Pass NCLEX-RN' },
  ],
  guardrails: [
    'Post-9/15/2006 international graduates must submit the credential review and English validation directly to AZBN.',
    'Submit only after candidate review and attestation/signature.',
  ],
  citations: [
    { label: 'AZBN — Licensure by Examination', note: 'Foreign-educated nurses who have not passed the NCLEX apply by examination; post-9/15/2006 graduates submit a TruMerit/CGFNS, ERES, or Josef Silny report and validate English (IELTS/PTE Academic).', url: 'https://azbn.gov/licensure-certification/registered-nurse-practical-nurse/licensure-by-examination' },
  ],
  officialResources: [
    { label: 'AZBN — Licensure by Examination', url: 'https://azbn.gov/licensure-certification/registered-nurse-practical-nurse/licensure-by-examination' },
    { label: 'AZBN — Apply for a license', url: 'https://azbn.gov/licenses-and-certifications/apply-license' },
    { label: 'AZBN — Forms & documents', url: 'https://www.azbn.gov/licenses-and-certifications/forms-and-documents' },
    { label: 'Register with Pearson VUE (NCLEX)', url: 'https://home.pearsonvue.com/nclex' },
  ],
  steps: [
    { key: 'credential', title: 'Credential & English review', owner: 'system', description: 'Independent review + English validation to AZBN.' },
    { key: 'application', title: 'AZBN application', owner: 'agent', description: 'Prefill the application.' },
    { key: 'fingerprint', title: 'Fingerprint clearance', owner: 'candidate', description: 'Background check.' },
    { key: 'submit', title: 'QA + candidate attests & submits', owner: 'qa', description: 'Completeness check, then candidate submits.' },
  ],
  milestones: ['AZ application submitted', 'AZ deficiency cleared', 'AZ license issued'],
}
