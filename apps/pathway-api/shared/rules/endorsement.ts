import type { JurisdictionRule } from '../types'

// A 50-state data model, launched for the first few states by employer demand.
// The engine is cheap; the real cost is rule freshness — hence the guardrails.
export const endorsementRule: JurisdictionRule = {
  key: 'endorsement',
  jurisdiction: 'State Boards of Nursing (50-state model)',
  title: 'RN Licensure by Endorsement',
  authority: 'Target-state Board of Nursing / Nursys',
  summary:
    'Endorse an existing U.S. RN license into the employer state. Requirements vary by state: license verification (Nursys or non-Nursys), fingerprints/background check, continuing education, jurisprudence exam, English, SSN/ITIN rules, and Nurse Licensure Compact eligibility.',
  estimatedTimelineDays: [30, 150],
  requirements: [
    { id: 'current_license', label: 'Current U.S. RN license', documentNeeded: true },
    { id: 'verification', label: 'License verification (Nursys / non-Nursys)' },
    { id: 'background', label: 'Fingerprints / background check', candidateActionRequired: true },
    { id: 'ce', label: 'Continuing education (state-specific)' },
    { id: 'jurisprudence', label: 'Jurisprudence exam (some states)' },
    { id: 'compact', label: 'Nurse Licensure Compact eligibility (if applicable)' },
  ],
  guardrails: [
    'State board rules change frequently — every jurisdiction rule needs a named owner and a freshness/verification SLA, or it rots.',
    'Do not file without candidate review and attestation/signature.',
    'Launch states by employer demand; the 50-state data model exists but only verified states should be active.',
  ],
  citations: [
    { label: 'Nursys', note: 'Primary-source license verification and license lookup used by many boards for endorsement.', url: 'https://www.nursys.com/' },
    { label: 'Nurse Licensure Compact (NCSBN)', note: 'A multistate license lets a nurse practice in other compact states; eligibility depends on the primary state of residence.', url: 'https://www.nursecompact.com/' },
  ],
  officialResources: [
    { label: 'Nursys — license verification & lookup', url: 'https://www.nursys.com/' },
    { label: 'Nurse Licensure Compact', url: 'https://www.nursecompact.com/' },
  ],
  steps: [
    { key: 'states', title: 'Identify current & target state', owner: 'agent', description: 'Determine endorsement availability and route.' },
    { key: 'requirements', title: 'Map state requirements', owner: 'agent', description: 'Verification, fingerprints, CE, jurisprudence, compact.' },
    { key: 'verify', title: 'License verification', owner: 'system', description: 'Nursys or non-Nursys verification.' },
    { key: 'submit', title: 'QA + candidate attests & submits', owner: 'qa', description: 'Reviewer signoff, then candidate submits.' },
  ],
  milestones: ['Endorsement submitted', 'Endorsement approved'],
}
