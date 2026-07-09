import type { JurisdictionRule } from '../types'

// CGFNS Credentials Evaluation (CES) — a gating, long-lead step many state
// boards require for internationally-educated nurses before licensure.
export const cgfnsCesRule: JurisdictionRule = {
  key: 'cgfns_ces',
  jurisdiction: 'CGFNS International',
  title: 'CGFNS Credentials Evaluation Service (CES)',
  authority: 'CGFNS International',
  summary:
    'Many U.S. state boards require a CGFNS credentials evaluation for internationally-educated nurses before licensure. The CES compares the candidate’s education and licensure to U.S. standards and produces a report sent to the board.',
  estimatedTimelineDays: [60, 150],
  requirements: [
    { id: 'report_type', label: 'Correct CES report type for the target board' },
    { id: 'education', label: 'Education & transcripts to CGFNS', documentNeeded: true },
    { id: 'license_verify', label: 'Home-country license verification', documentNeeded: true },
    { id: 'english', label: 'English exam (if required)' },
  ],
  guardrails: [
    'Report type and board acceptance vary by state — confirm the exact CES product the target board requires before ordering.',
    'CGFNS turnaround depends on third-party verifications outside Florence’s control; track, do not promise dates.',
  ],
  citations: [
    { label: 'CGFNS / TruMerit — Credentials Evaluation', note: 'The CES Professional Report meets the specific requirements of individual state boards for licensure and includes a statement of comparability of the applicant’s education against U.S. standards.', url: 'https://www.cgfns.org/professions/registered-nurses/' },
  ],
  officialResources: [
    { label: 'CGFNS / TruMerit — Registered Nurses', url: 'https://www.cgfns.org/professions/registered-nurses/' },
    { label: 'CGFNS / TruMerit — Required documents', url: 'https://www.cgfns.org/required-documents/' },
    { label: 'CGFNS / TruMerit — official site', url: 'https://www.cgfns.org/' },
  ],
  steps: [
    { key: 'order', title: 'Determine report type', owner: 'agent', description: 'Select the CES product the target board requires.' },
    { key: 'docs', title: 'Document checklist', owner: 'candidate', description: 'Education, transcripts, license verification.' },
    { key: 'track', title: 'Submit & track', owner: 'system', description: 'Track processing and delivery to the board.' },
  ],
  milestones: ['CGFNS CES ordered', 'CGFNS CES delivered'],
}
