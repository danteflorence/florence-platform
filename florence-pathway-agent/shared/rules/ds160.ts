import type { JurisdictionRule } from '../types'

export const ds160Rule: JurisdictionRule = {
  key: 'ds160',
  jurisdiction: 'U.S. Department of State (CEAC)',
  title: 'DS-160 Online Nonimmigrant Visa Application',
  authority: 'U.S. Department of State — Consular Electronic Application Center',
  summary:
    'Florence prepares and quality-checks the DS-160 draft from data already collected, then guides the applicant through final review and signature. The applicant must electronically sign and submit their own DS-160.',
  estimatedTimelineDays: [1, 7],
  requirements: [
    { id: 'passport', label: 'Valid passport', detail: 'Number, issue/expiry, issuing authority.', documentNeeded: true },
    { id: 'photo', label: 'Compliant digital photo', candidateActionRequired: true },
    { id: 'i20', label: 'SEVIS I-20 (F-1)', detail: 'SEVIS ID and program data for student visas.', documentNeeded: true },
    { id: 'travel_history', label: 'Five-year travel history', candidateActionRequired: true },
    { id: 'visa_history', label: 'Prior U.S. visa & refusal history', candidateActionRequired: true },
    { id: 'employment', label: 'Employment & education history' },
    { id: 'contact', label: 'Contact, social-media, and family details', candidateActionRequired: true },
  ],
  guardrails: [
    'Others may assist in completing the DS-160, but under U.S. law the applicant must electronically sign and submit it — the applicant must personally click "Sign Application."',
    'The electronic signature certifies the applicant read and understood the questions and that the answers are true and correct.',
    'The system must never fabricate an answer or answer a sensitive question "No" without explicit candidate confirmation.',
    'Do not market this as "we submit your DS-160 for you."',
  ],
  citations: [
    { label: 'U.S. Dept. of State — DS-160 FAQs', note: 'A third party may assist, but must instruct the applicant to endorse the application on their own behalf by clicking "Sign Application." For an applicant under 16 or physically incapable, a parent/guardian may complete and click it.', url: 'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/forms/ds-160-online-nonimmigrant-visa-application/ds-160-faqs.html' },
    { label: 'U.S. Dept. of State — DS-160 FAQs', note: 'The electronic signature certifies the applicant has read and understood the questions and that the answers are true and correct to the best of their knowledge and belief; false or misleading statements may result in permanent visa refusal or denial of entry.', url: 'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/forms/ds-160-online-nonimmigrant-visa-application/ds-160-faqs.html' },
  ],
  officialResources: [
    { label: 'Apply for the DS-160 (CEAC)', url: 'https://ceac.state.gov/genniv/', note: 'The official portal where the applicant completes, signs, and submits the DS-160.' },
    { label: 'DS-160 FAQs (U.S. Dept. of State)', url: 'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/forms/ds-160-online-nonimmigrant-visa-application/ds-160-faqs.html' },
    { label: 'U.S. Visas — official information', url: 'https://travel.state.gov/content/travel/en/us-visas.html' },
  ],
  steps: [
    { key: 'prepare', title: 'Prepare draft from profile', owner: 'agent', description: 'Map identity, passport, I-20, travel, and employment into DS-160 sections.' },
    { key: 'missing', title: 'Collect missing data', owner: 'candidate', description: 'Travel history, prior visa/refusal history, family and social-media details.' },
    { key: 'qa', title: 'Human QA review', owner: 'qa', description: 'Reviewer checks answers, sources, and risk flags.' },
    { key: 'sign', title: 'Applicant reviews and signs', owner: 'candidate', description: 'Applicant personally signs and submits in CEAC.' },
  ],
  milestones: ['DS-160 draft ready', 'DS-160 candidate signed'],
}
