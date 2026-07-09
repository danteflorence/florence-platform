import type { JurisdictionRule } from '../types'

// Generic RN-licensure-by-exam rule. State-agnostic — the per-state specifics
// (board, credential eval, coursework, jurisprudence) come from the data-driven
// exam engine (shared/exam-states.ts) via the form builder. The five flagship
// states (FL/NY/TX/CA/AZ) keep their own detailed rule files; every other state
// flows through this rule + the engine.
export const rnExamRule: JurisdictionRule = {
  key: 'rn_exam',
  jurisdiction: 'State Board of Nursing',
  title: 'RN Licensure by Examination',
  authority: 'State Board of Nursing · NCSBN (NCLEX-RN)',
  summary:
    'Licensure by examination for a new graduate: apply to the target state board, complete a credentials evaluation (CGFNS or board-approved) and a fingerprint background check, then pass the NCLEX-RN. Florence prefills the board application from the canonical profile and adapts to each state’s specifics.',
  estimatedTimelineDays: [60, 150],
  requirements: [
    { id: 'application', label: 'State board licensure-by-exam application' },
    { id: 'credential', label: 'Credentials evaluation (CGFNS or board-approved)', documentNeeded: true },
    { id: 'fingerprint', label: 'Fingerprint background check' },
    { id: 'nclex', label: 'Pass the NCLEX-RN' },
  ],
  guardrails: [
    'Exact requirements vary by state — Florence grounds each board as it is learned; always verify on the official board site.',
    'The NCLEX-RN is national, but eligibility, education review, coursework, and fees are set by each state board.',
  ],
  citations: [
    { label: 'NCSBN — NCLEX & licensure', note: 'Candidates apply to a state board, are declared eligible, register with Pearson VUE, receive an Authorization to Test (ATT), and schedule the NCLEX-RN.', url: 'https://www.ncsbn.org/exams.htm' },
  ],
  officialResources: [
    { label: 'NCSBN — Find your Board of Nursing', url: 'https://www.ncsbn.org/contact-bon.htm' },
    { label: 'NCSBN — NCLEX', url: 'https://www.ncsbn.org/nclex.htm' },
  ],
  steps: [
    { key: 'apply', title: 'Apply to the state board', owner: 'agent', description: 'Prefill the licensure-by-exam application from your profile.' },
    { key: 'verify', title: 'Credential evaluation & fingerprints', owner: 'system', description: 'CGFNS evaluation + background check.' },
    { key: 'nclex', title: 'NCLEX-RN', owner: 'candidate', description: 'Register, receive ATT, schedule, and pass.' },
  ],
  milestones: ['RN exam application submitted', 'License issued'],
}
