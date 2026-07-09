import type { JurisdictionRule } from '../types'

export const nclexRule: JurisdictionRule = {
  key: 'nclex_att',
  jurisdiction: 'NCSBN / Pearson VUE',
  title: 'NCLEX-RN Registration & Authorization to Test (ATT)',
  authority: 'National Council of State Boards of Nursing (NCSBN)',
  summary:
    'Register with Pearson VUE, get declared eligible by the nursing regulatory body (NRB), receive the ATT, then schedule. The single highest-leverage check is exact name matching across passport, ID, board application, and Pearson.',
  estimatedTimelineDays: [30, 120],
  requirements: [
    { id: 'program_code', label: 'Program code', detail: 'Required to register with Pearson.' },
    { id: 'email', label: 'Email address' },
    { id: 'payment', label: 'Acceptable payment', candidateActionRequired: true },
    { id: 'exact_name', label: 'Exact first/last name match', detail: 'Must match the identification presented at the exam appointment.' },
    { id: 'nrb_eligibility', label: 'NRB eligibility declaration' },
  ],
  guardrails: [
    'The ATT is issued after the NRB declares the candidate eligible AND the candidate has registered with Pearson; ATT validity is set by the NRB (averages ~90 days).',
    'Exact name match is mandatory — the first and last name registered with Pearson must match the ID presented at the appointment exactly.',
    'Do not encourage scheduling unless the candidate is readiness-cleared or has a human-approved exception.',
    'Warn the candidate before ATT expiration.',
  ],
  citations: [
    { label: 'NCSBN — NCLEX registration', note: 'Apply with your nursing regulatory body, then register with Pearson; after the NRB declares you eligible and you have registered, you receive the ATT email — which you must have to schedule.', url: 'https://www.ncsbn.org/exams/application-and-registration.page' },
    { label: 'NCSBN — Authorization to Test', note: 'Each ATT is valid for a period set by the NRB (the average length is 90 days); candidates must test within the validity dates.', url: 'https://www.ncsbn.org/exams.page' },
  ],
  officialResources: [
    { label: 'NCLEX registration steps (NCSBN)', url: 'https://www.ncsbn.org/exams/application-and-registration.page', note: 'Official process to register and obtain your ATT.' },
    { label: 'Register & schedule with Pearson VUE', url: 'https://home.pearsonvue.com/nclex', note: 'Payment and scheduling for the NCLEX are done through Pearson VUE.' },
    { label: 'NCLEX overview (NCSBN)', url: 'https://www.ncsbn.org/exams.page' },
  ],
  steps: [
    { key: 'namematch', title: 'Exact name-match validation', owner: 'agent', description: 'Compare passport, ID, board app, and Pearson names.' },
    { key: 'register', title: 'Pearson registration', owner: 'candidate', description: 'Register with program code, email, payment, exact name.' },
    { key: 'att', title: 'Track ATT issuance', owner: 'system', description: 'Detect ATT and start the expiry clock.' },
    { key: 'schedule', title: 'Readiness-gated scheduling', owner: 'candidate', description: 'Schedule when readiness-cleared.' },
  ],
  milestones: ['NCLEX registered', 'ATT received', 'NCLEX scheduled', 'NCLEX passed'],
}
