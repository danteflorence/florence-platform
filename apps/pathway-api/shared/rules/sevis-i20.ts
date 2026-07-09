import type { JurisdictionRule } from '../types'

// The front door of the F-1 journey: the school issues the Form I-20 (SEVIS ID),
// and the student pays the I-901 SEVIS fee before the visa is issued.
export const sevisI20Rule: JurisdictionRule = {
  key: 'sevis_i20',
  jurisdiction: 'DHS / ICE — Student and Exchange Visitor Program (SEVP)',
  title: 'SEVIS / Form I-20 & I-901 Fee',
  authority: 'U.S. Immigration and Customs Enforcement (SEVP)',
  summary:
    'After a SEVP-certified school admits the student, its DSO issues the Form I-20 (which carries the SEVIS ID and School Code). Every prospective F student must pay the I-901 SEVIS fee at the official FMJfee.com before the Department of State issues the visa, and must show proof of payment at the visa interview.',
  estimatedTimelineDays: [3, 30],
  requirements: [
    { id: 'acceptance', label: 'Admission to a SEVP-certified school', candidateActionRequired: true },
    { id: 'i20', label: 'Form I-20 from the school’s DSO', detail: 'Carries the SEVIS ID and School Code; signed by the student (and a parent if under 18).', documentNeeded: true },
    { id: 'i901', label: 'I-901 SEVIS fee payment', detail: 'Paid at FMJfee.com using the School Code + SEVIS ID.', candidateActionRequired: true },
    { id: 'receipt', label: 'I-901 payment receipt', detail: 'Required proof at the visa interview.', documentNeeded: true },
  ],
  guardrails: [
    'The Form I-20 is issued by the school’s DSO, not by Florence — we organize and verify the data and track it.',
    'Pay the I-901 SEVIS fee only at the official FMJfee.com.',
    'The I-901 fee must be paid before the Department of State issues the visa, and proof shown at the interview.',
  ],
  citations: [
    { label: 'Study in the States — Students and the Form I-20', note: 'Before paying the I-901 fee you must receive the Form I-20 from a DSO; you and your DSO sign it (a parent signs if you are under 18).', url: 'https://studyinthestates.dhs.gov/students/prepare/students-and-the-form-i-20' },
    { label: 'Study in the States — Paying the I-901 SEVIS Fee', note: 'All prospective F and M students must pay the I-901 SEVIS fee before DoS issues the visa; pay at FMJfee.com using the School Code and SEVIS ID from the I-20, and present proof at the interview.', url: 'https://studyinthestates.dhs.gov/students/prepare/paying-the-i-901-sevis-fee' },
  ],
  officialResources: [
    { label: 'Pay the I-901 SEVIS fee (official)', url: 'https://www.fmjfee.com/', note: 'The only official site to pay the I-901 fee.' },
    { label: 'Study in the States — Form I-20', url: 'https://studyinthestates.dhs.gov/students/prepare/students-and-the-form-i-20' },
    { label: 'Study in the States — Paying the I-901 SEVIS Fee', url: 'https://studyinthestates.dhs.gov/students/prepare/paying-the-i-901-sevis-fee' },
    { label: 'ICE — I-901 SEVIS Fee', url: 'https://www.ice.gov/sevis/i901' },
    { label: 'Study in the States — F-1 Postsecondary guide', url: 'https://studyinthestates.dhs.gov/guide/f-1/f-1-postsecondary' },
  ],
  steps: [
    { key: 'i20', title: 'Receive & verify the I-20', owner: 'system', description: 'Confirm the SEVIS ID and School Code match the candidate profile.' },
    { key: 'fee', title: 'Guide the I-901 payment', owner: 'candidate', description: 'Walk the candidate through FMJfee.com.' },
    { key: 'receipt', title: 'Track the receipt', owner: 'system', description: 'Store proof for the visa interview.' },
  ],
  milestones: ['I-20 issued', 'SEVIS I-901 fee paid'],
}
