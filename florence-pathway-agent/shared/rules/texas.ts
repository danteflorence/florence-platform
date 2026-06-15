import type { JurisdictionRule } from '../types'

export const texasRule: JurisdictionRule = {
  key: 'texas_rn_exam',
  jurisdiction: 'Texas Board of Nursing',
  title: 'Texas RN Licensure by Examination',
  authority: 'Texas Board of Nursing (BON)',
  summary:
    'Texas RN-by-exam applicants apply through the Texas Nurse Portal, submit fingerprints for a DPS/FBI criminal background check, and (for internationally-educated nurses) complete an independent credential review. The NCLEX-RN must be passed within four years of completing graduation requirements.',
  estimatedTimelineDays: [60, 180],
  requirements: [
    { id: 'portal', label: 'Texas Nurse Portal application', candidateActionRequired: true },
    { id: 'fingerprint', label: 'DPS/FBI fingerprinting', detail: 'Criminal background check via Texas DPS and the FBI.', candidateActionRequired: true },
    { id: 'credential', label: 'Independent credential evaluation (IEN)', documentNeeded: true },
    { id: 'program', label: 'Board-approved / verified nursing program', documentNeeded: true },
    { id: 'english', label: 'English proficiency (if required)' },
  ],
  guardrails: [
    'NCLEX must be passed within four years of completing graduation requirements, or a board-approved program must be completed to retake.',
    'Submit only after candidate review and attestation/signature.',
  ],
  citations: [
    { label: 'Texas BON — Examination information', note: 'Licensure by examination applies to graduates of an approved program taking the NCLEX for their first U.S. license; apply via the Texas Nurse Portal.', url: 'https://www.bon.texas.gov/licensure_examination.asp.html' },
    { label: 'Texas BON — Licensure eligibility', note: 'All applicants submit fingerprints for a criminal background check via Texas DPS and the FBI; NCLEX must be passed within four years of graduation requirements.', url: 'https://www.bon.texas.gov/licensure_eligibility.asp.html' },
  ],
  officialResources: [
    { label: 'Texas BON — Examination', url: 'https://www.bon.texas.gov/licensure_examination.asp.html' },
    { label: 'Texas BON — Licensure eligibility', url: 'https://www.bon.texas.gov/licensure_eligibility.asp.html' },
    { label: 'Texas BON — Forms', url: 'https://www.bon.texas.gov/forms.asp.html' },
    { label: 'Register with Pearson VUE (NCLEX)', url: 'https://home.pearsonvue.com/nclex' },
  ],
  steps: [
    { key: 'portal', title: 'Texas Nurse Portal application', owner: 'agent', description: 'Prefill the NCLEX application in the portal.' },
    { key: 'fingerprint', title: 'DPS/FBI fingerprinting', owner: 'candidate', description: 'Complete the criminal background check.' },
    { key: 'credential', title: 'Credential evaluation', owner: 'system', description: 'Independent review for IEN applicants.' },
    { key: 'submit', title: 'QA + candidate attests & submits', owner: 'qa', description: 'Completeness check, then candidate submits.' },
  ],
  milestones: ['TX application submitted', 'TX deficiency cleared', 'TX license issued'],
}
