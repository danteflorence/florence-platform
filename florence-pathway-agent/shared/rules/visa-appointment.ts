import type { JurisdictionRule } from '../types'

export const visaAppointmentRule: JurisdictionRule = {
  key: 'visa_appointment',
  jurisdiction: 'U.S. Embassy / Consulate (varies by country & contractor)',
  title: 'Visa Appointment Scheduling (Guided)',
  authority: 'Department of State / local appointment contractor',
  summary:
    'Guided, step-by-step scheduling with the candidate in control. The agent tells the nurse exactly what to click, enter, and upload — it does not scrape, bypass CAPTCHA, bulk-reserve, or automate portal actions against site terms.',
  estimatedTimelineDays: [7, 120],
  requirements: [
    { id: 'ds160_signed', label: 'Signed DS-160 confirmation page', detail: 'Prerequisite for scheduling.', documentNeeded: true },
    { id: 'mrv_fee', label: 'MRV visa fee payment', candidateActionRequired: true },
    { id: 'sevis', label: 'SEVIS I-901 fee (F-1)', candidateActionRequired: true },
    { id: 'interview_docs', label: 'Interview-day document checklist' },
  ],
  guardrails: [
    'Do not scrape, bypass CAPTCHA, bulk-reserve appointments, or automate portal actions in violation of site terms.',
    'v1 is guided co-browsing / step-by-step instruction with the candidate in control.',
    'Only build automated scheduling where an official API or counsel-approved, user-authorized automation path exists.',
  ],
  citations: [
    { label: 'U.S. Dept. of State — Student Visa', note: 'After completing the DS-160, applicants schedule and attend an interview at a U.S. embassy/consulate; the process and wait times vary by country and contractor.', url: 'https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html' },
  ],
  officialResources: [
    { label: 'U.S. Student Visa (F/M) — Dept. of State', url: 'https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html' },
    { label: 'Find a U.S. Embassy or Consulate', url: 'https://www.usembassy.gov/' },
    { label: 'Pay the SEVIS I-901 fee (official)', url: 'https://www.fmjfee.com/' },
  ],
  steps: [
    { key: 'consulate', title: 'Select consulate', owner: 'agent', description: 'Recommend post by residence and wait times.' },
    { key: 'fees', title: 'Pay fees', owner: 'candidate', description: 'MRV and SEVIS fees as applicable.' },
    { key: 'schedule', title: 'Guided scheduling', owner: 'candidate', description: 'Step-by-step on the official portal.' },
    { key: 'prep', title: 'Interview prep', owner: 'agent', description: 'Document checklist and plain-language preparation.' },
  ],
  milestones: ['Visa appointment scheduled', 'Visa approved'],
}
