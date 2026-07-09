// Data-driven licensure-by-exam engine — parallel to the endorsement engine, so a
// new graduate can target ANY state, not just the five with hand-built rules. Each
// state carries its board + the IEN exam-pathway specifics; any state not grounded
// here falls back to a correct generic pathway (NCSBN board directory) rather than
// a hard 409. The five flagship states (FL/NY/TX/CA/AZ) keep their detailed rule
// files; everything else flows through this engine via the generic `rn_exam` workflow.
import type { OfficialResource } from './types'
import { getUsState, boardResource, getStateFees } from './us-states'

export interface ExamState {
  state: string
  board: string
  /** Credential-evaluation requirement for internationally-educated nurses. */
  credentialEval: string
  /** Background check / fingerprinting method. */
  fingerprints: string
  /** State-specific coursework (e.g., NY infection control + child abuse). */
  coursework?: string
  /** State nursing jurisprudence exam, where required. */
  jurisprudence?: string
  /** Licensure-by-exam application fee (USD), where grounded. */
  feeUsd?: number
  highlights: string[]
  officialResources: OfficialResource[]
  /** True when this is the generic fallback (not individually grounded). */
  generic?: boolean
}

const CGFNS_EVAL = 'A credentials evaluation (CGFNS Professional Report or a board-approved equivalent) is required for internationally-educated nurses.'
const STD_PRINTS = 'Fingerprint-based criminal background check (completed in person after you arrive).'

function S(state: string, board: string, url: string, extra: Partial<ExamState> = {}): ExamState {
  return {
    state, board, credentialEval: CGFNS_EVAL, fingerprints: STD_PRINTS,
    highlights: extra.highlights ?? [`Apply to the ${board} for licensure by examination; sit the NCLEX-RN once declared eligible.`],
    officialResources: extra.officialResources ?? [{ label: `${board} — licensure`, url }],
    coursework: extra.coursework, jurisprudence: extra.jurisprudence, feeUsd: extra.feeUsd,
  }
}

// Grounded set — the 20 endorsement-engine states that aren't flagship-exam-wired
// (boards + URLs reused from the SSN/endorsement grounding). Keyed by lowercase name.
export const EXAM_STATES: Record<string, ExamState> = {
  colorado: S('Colorado', 'Colorado Board of Nursing (DORA)', 'https://dpo.colorado.gov/Nursing'),
  nevada: S('Nevada', 'Nevada State Board of Nursing', 'https://nevadanursingboard.org/'),
  oregon: S('Oregon', 'Oregon State Board of Nursing', 'https://www.oregon.gov/osbn/'),
  washington: S('Washington', 'Washington Nursing Care Quality Assurance Commission', 'https://nursing.wa.gov/'),
  michigan: S('Michigan', 'Michigan Board of Nursing (LARA)', 'https://www.michigan.gov/lara/bureau-list/bpl/health/hp-lic-health-prof/nursing'),
  massachusetts: S('Massachusetts', 'Massachusetts Board of Registration in Nursing', 'https://www.mass.gov/orgs/board-of-registration-in-nursing'),
  georgia: S('Georgia', 'Georgia Board of Nursing', 'https://sos.ga.gov/georgia-board-nursing'),
  hawaii: S('Hawaii', 'Hawaii Board of Nursing', 'https://cca.hawaii.gov/pvl/boards/nursing/', {
    highlights: [
      'Apply to the Hawaii Board of Nursing for licensure by examination; sit the NCLEX-RN once declared eligible.',
      'Hawaii board fees prorate across the biennium (every license expires June 30 of an odd-numbered year): about $236 if you apply in the first year of the biennium — Application $40 + License $36 + Compliance Resolution Fund $100 + Hawaii State Center for Nursing $60 — and about $168 in the second year (½ License $18 + ½ CRF $50). The fingerprint/criminal-history-record check and the $200 NCLEX-RN registration are paid separately to those vendors.',
    ],
    officialResources: [
      { label: 'Hawaii Board of Nursing — application forms, fees & instructions', url: 'https://cca.hawaii.gov/pvl/boards/nursing/application_publications/' },
      { label: 'Hawaii BON — RN/LPN licensure by examination (fee box)', url: 'https://cca.hawaii.gov/pvl/files/2024/02/RN-LPN-Nursing-by-exam_02.24-R.pdf', note: 'Official fee codes: App $40, Lic $36 (½ Ren $18), Compliance Resolution Fund $100/$50, Center for Nursing $60.' },
    ],
  }),
  illinois: S('Illinois', 'Illinois Board of Nursing (IDFPR)', 'https://idfpr.illinois.gov/profs/nursing.html'),
  virginia: S('Virginia', 'Virginia Board of Nursing', 'https://www.dhp.virginia.gov/Boards/Nursing/'),
  minnesota: S('Minnesota', 'Minnesota Board of Nursing', 'https://mn.gov/boards/nursing/'),
  utah: S('Utah', 'Utah Board of Nursing (DOPL)', 'https://dopl.utah.gov/nursing/'),
  maryland: S('Maryland', 'Maryland Board of Nursing', 'https://health.maryland.gov/mbon/'),
  wisconsin: S('Wisconsin', 'Wisconsin Board of Nursing (DSPS)', 'https://dsps.wi.gov/Pages/Professions/RN/Default.aspx'),
  'north carolina': S('North Carolina', 'North Carolina Board of Nursing', 'https://www.ncbon.com/', {
    highlights: ['NC requires an SSN before the license is issued — you may sit the NCLEX while your SSN application is pending.'],
    officialResources: [{ label: 'North Carolina Board of Nursing — licensure by exam', url: 'https://www.ncbon.com/rnlpn-examination' }],
  }),
  ohio: S('Ohio', 'Ohio Board of Nursing', 'https://nursing.ohio.gov/'),
  kentucky: S('Kentucky', 'Kentucky Board of Nursing', 'https://kbn.ky.gov/'),
  indiana: S('Indiana', 'Indiana State Board of Nursing (PLA)', 'https://www.in.gov/pla/professions/nursing-home/'),
  'new jersey': S('New Jersey', 'New Jersey Board of Nursing', 'https://www.njconsumeraffairs.gov/nur/'),
  connecticut: S('Connecticut', 'Connecticut Board of Examiners for Nursing (DPH)', 'https://portal.ct.gov/dph/practitioner-licensing--investigations/registered-nurse/registered-nurse-licensure'),
  pennsylvania: S('Pennsylvania', 'Pennsylvania State Board of Nursing', 'https://www.pa.gov/agencies/dos/department-and-offices/bpoa/boards-commissions/nursing.html'),
  vermont: S('Vermont', 'Vermont State Board of Nursing', 'https://sos.vermont.gov/nursing/', {
    jurisprudence: 'Vermont requires a State Jurisprudence Exam (an open-book self-test on Vermont’s nurse practice act); the completed answer sheet is submitted with your application.',
  }),
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Standard pathway for any state without individually-grounded exam specifics —
 *  the board name + URL still come from the authoritative base table (all 51). */
function genericExamState(state: string): ExamState {
  const base = getUsState(state)
  const name = base?.name ?? titleCase(state)
  return {
    state: name,
    board: base?.board ?? `${name} Board of Nursing`,
    credentialEval: CGFNS_EVAL,
    fingerprints: STD_PRINTS,
    highlights: [`Apply to the ${base?.board ?? `${name} Board of Nursing`} for licensure by examination; sit the NCLEX-RN once declared eligible.`],
    officialResources: base ? [boardResource(base)] : [{ label: 'NCSBN — Find your Board of Nursing', url: 'https://www.ncsbn.org/contact-bon.htm', note: `Locate the ${name} Board of Nursing and its NCLEX application.` }],
    generic: true,
  }
}

export function getExamState(state?: string): ExamState {
  const base = !state ? genericExamState('your state') : EXAM_STATES[state.toLowerCase()] ?? genericExamState(state)
  const fee = getStateFees(state).examUsd // grounded board fee is the single source
  return fee != null ? { ...base, feeUsd: fee } : base
}
