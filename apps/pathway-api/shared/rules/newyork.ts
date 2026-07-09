import type { JurisdictionRule } from '../types'

export const newYorkRule: JurisdictionRule = {
  key: 'newyork_rn_exam',
  jurisdiction: 'New York State Education Department (NYSED)',
  title: 'New York RN Licensure by Examination',
  authority: 'NYSED Office of the Professions',
  summary:
    'NYSED RN applicants must be licensed and registered by NYSED, be of good moral character, be at least 18, graduate from an acceptable program, complete infection-control and child-abuse coursework, and pass the NCLEX-RN (or an acceptable exam). All applicants submit Form 1 with the fee; incomplete applications delay review.',
  estimatedTimelineDays: [60, 180],
  requirements: [
    { id: 'form1', label: 'Application Form 1 + fee', candidateActionRequired: true },
    { id: 'program', label: 'Graduation from an acceptable nursing program', documentNeeded: true },
    { id: 'infection_control', label: 'Infection-control coursework', candidateActionRequired: true },
    { id: 'child_abuse', label: 'Child-abuse identification coursework', candidateActionRequired: true },
    { id: 'nclex', label: 'Pass NCLEX-RN or acceptable exam' },
    { id: 'moral_character', label: 'Good moral character; at least 18' },
  ],
  guardrails: [
    'All RN applicants must submit Form 1 and the fee; incomplete applications delay review.',
    'Track infection-control and child-abuse coursework explicitly — they are common blockers for IEN applicants.',
    'Submit only after candidate review and attestation/signature.',
  ],
  citations: [
    { label: 'NYSED — RN license requirements', note: 'RN applicants must be of good moral character, ≥18, graduate an acceptable program, complete infection-control + child-abuse coursework, and pass the NCLEX-RN.', url: 'https://www.op.nysed.gov/professions/registered-professional-nursing/license-requirements' },
    { label: 'NYSED — Online Form 1', note: 'All applicants must submit Form 1 with the $143 licensure + first-registration fee; failing to accurately complete all parts delays review. Foreign-educated applicants include a copy of the nursing diploma.', url: 'https://www.op.nysed.gov/professions/registered-professional-nursing/application-forms/online-form-1' },
  ],
  officialResources: [
    { label: 'NYSED — How to apply (RN)', url: 'https://www.op.nysed.gov/professions/registered-professional-nursing/how-to-apply-for-licensure' },
    { label: 'NYSED — Online Form 1', url: 'https://www.op.nysed.gov/professions/registered-professional-nursing/application-forms/online-form-1' },
    { label: 'NYSED — RN license requirements', url: 'https://www.op.nysed.gov/professions/registered-professional-nursing/license-requirements' },
  ],
  steps: [
    { key: 'form1', title: 'Prefill Form 1', owner: 'agent', description: 'Prefill NYSED Form 1 from the profile.' },
    { key: 'coursework', title: 'Coursework tracking', owner: 'candidate', description: 'Infection-control + child-abuse coursework.' },
    { key: 'qa', title: 'Completeness QA', owner: 'qa', description: 'Verify completeness before submission.' },
    { key: 'submit', title: 'Candidate attests & submits', owner: 'candidate', description: 'Candidate signs and submits.' },
  ],
  milestones: ['NY application submitted', 'NY coursework complete', 'NY license issued'],
}
