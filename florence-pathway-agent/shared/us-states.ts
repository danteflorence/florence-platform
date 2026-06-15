// The factual backbone for all 50 states + D.C. — board name, official URL, and
// Nurse Licensure Compact (NLC) status. The endorsement and exam engines derive a
// complete pathway for ANY jurisdiction from this table (standard Nursys + fingerprint
// pathway) and layer grounded, state-specific overrides on top where we have them.
// This is what makes coverage comprehensive: no jurisdiction returns "not supported."
import type { OfficialResource } from './types'

export type CompactStatus = 'member' | 'pending' | 'none'

export interface UsState {
  name: string
  code: string
  board: string
  boardUrl: string
  /** Nurse Licensure Compact (NLC) membership. */
  compact: CompactStatus
}

// Populated from the NCSBN Boards-of-Nursing directory + the official NLC member
// list. `compact` reflects current multistate-license issuance.
// NLC membership reflects the NCSBN / nursecompact.com member list (FY2025–26).
// MA, RI, WA are enacted-but-pending full implementation. Verify the live NLC map
// before relying on a pending status.
const ST = (name: string, code: string, board: string, boardUrl: string, compact: CompactStatus): [string, UsState] => [name.toLowerCase(), { name, code, board, boardUrl, compact }]
export const US_STATES: Record<string, UsState> = Object.fromEntries([
  ST('Alabama', 'AL', 'Alabama Board of Nursing', 'https://www.abn.alabama.gov', 'member'),
  ST('Alaska', 'AK', 'Alaska Board of Nursing', 'https://www.commerce.alaska.gov/web/cbpl/professionallicensing/boardofnursing.aspx', 'none'),
  ST('Arizona', 'AZ', 'Arizona State Board of Nursing', 'https://azbn.gov', 'member'),
  ST('Arkansas', 'AR', 'Arkansas State Board of Nursing', 'https://www.arsbn.org', 'member'),
  ST('California', 'CA', 'California Board of Registered Nursing', 'https://www.rn.ca.gov', 'none'),
  ST('Colorado', 'CO', 'Colorado State Board of Nursing', 'https://dpo.colorado.gov/Nursing', 'member'),
  ST('Connecticut', 'CT', 'Connecticut Board of Examiners for Nursing', 'https://portal.ct.gov/dph/public-health-hearing-office/board-of-examiners-for-nursing', 'member'),
  ST('Delaware', 'DE', 'Delaware Board of Nursing', 'https://dpr.delaware.gov/boards/nursing/', 'member'),
  ST('Florida', 'FL', 'Florida Board of Nursing', 'https://floridasnursing.gov', 'member'),
  ST('Georgia', 'GA', 'Georgia Board of Nursing', 'https://sos.ga.gov/georgia-board-nursing', 'member'),
  ST('Hawaii', 'HI', 'Hawaii Board of Nursing', 'https://cca.hawaii.gov/pvl/boards/nursing/', 'none'),
  ST('Idaho', 'ID', 'Idaho Board of Nursing', 'https://ibn.idaho.gov', 'member'),
  ST('Illinois', 'IL', 'Illinois Board of Nursing (IDFPR)', 'https://idfpr.illinois.gov/profs/nursing.html', 'none'),
  ST('Indiana', 'IN', 'Indiana State Board of Nursing', 'https://www.in.gov/pla/professions/indiana-state-board-of-nursing/', 'member'),
  ST('Iowa', 'IA', 'Iowa Board of Nursing', 'https://nursing.iowa.gov', 'member'),
  ST('Kansas', 'KS', 'Kansas State Board of Nursing', 'https://ksbn.kansas.gov', 'member'),
  ST('Kentucky', 'KY', 'Kentucky Board of Nursing', 'https://kbn.ky.gov', 'member'),
  ST('Louisiana', 'LA', 'Louisiana State Board of Nursing', 'https://www.lsbn.state.la.us', 'member'),
  ST('Maine', 'ME', 'Maine State Board of Nursing', 'https://www.maine.gov/boardofnursing/', 'member'),
  ST('Maryland', 'MD', 'Maryland Board of Nursing', 'https://mbon.maryland.gov', 'member'),
  ST('Massachusetts', 'MA', 'Massachusetts Board of Registration in Nursing', 'https://www.mass.gov/orgs/board-of-registration-in-nursing', 'pending'),
  ST('Michigan', 'MI', 'Michigan Board of Nursing (LARA)', 'https://www.michigan.gov/lara/bureau-list/bpl/health/hp-lic-health-prof/nursing', 'none'),
  ST('Minnesota', 'MN', 'Minnesota Board of Nursing', 'https://mn.gov/boards/nursing/', 'none'),
  ST('Mississippi', 'MS', 'Mississippi Board of Nursing', 'https://www.msbn.ms.gov', 'member'),
  ST('Missouri', 'MO', 'Missouri State Board of Nursing', 'https://pr.mo.gov/nursing.asp', 'member'),
  ST('Montana', 'MT', 'Montana Board of Nursing', 'https://boards.bsd.dli.mt.gov/nursing/', 'member'),
  ST('Nebraska', 'NE', 'Nebraska Board of Nursing (DHHS)', 'https://dhhs.ne.gov/licensure/pages/nurse-licensing.aspx', 'member'),
  ST('Nevada', 'NV', 'Nevada State Board of Nursing', 'https://nevadanursingboard.org', 'none'),
  ST('New Hampshire', 'NH', 'New Hampshire Board of Nursing', 'https://www.oplc.nh.gov/new-hampshire-board-nursing', 'member'),
  ST('New Jersey', 'NJ', 'New Jersey Board of Nursing', 'https://www.njconsumeraffairs.gov/nur', 'member'),
  ST('New Mexico', 'NM', 'New Mexico Board of Nursing', 'https://www.bon.nm.gov', 'member'),
  ST('New York', 'NY', 'New York State Board for Nursing (NYSED)', 'https://www.op.nysed.gov/professions-index/nursing', 'none'),
  ST('North Carolina', 'NC', 'North Carolina Board of Nursing', 'https://www.ncbon.com', 'member'),
  ST('North Dakota', 'ND', 'North Dakota Board of Nursing', 'https://www.ndbon.org', 'member'),
  ST('Ohio', 'OH', 'Ohio Board of Nursing', 'https://nursing.ohio.gov', 'member'),
  ST('Oklahoma', 'OK', 'Oklahoma Board of Nursing', 'https://oklahoma.gov/nursing.html', 'member'),
  ST('Oregon', 'OR', 'Oregon State Board of Nursing', 'https://www.oregon.gov/osbn/', 'none'),
  ST('Pennsylvania', 'PA', 'Pennsylvania State Board of Nursing', 'https://www.pa.gov/agencies/dos/department-and-offices/bpoa/boards-commissions/nursing', 'member'),
  ST('Rhode Island', 'RI', 'Rhode Island Board of Nurse Registration & Nursing Education', 'https://health.ri.gov/licensing/nurses', 'pending'),
  ST('South Carolina', 'SC', 'South Carolina Board of Nursing', 'https://llr.sc.gov/nurse/', 'member'),
  ST('South Dakota', 'SD', 'South Dakota Board of Nursing', 'https://www.sdbon.org', 'member'),
  ST('Tennessee', 'TN', 'Tennessee Board of Nursing', 'https://www.tn.gov/health/health-program-areas/health-professional-boards/nursing-board.html', 'member'),
  ST('Texas', 'TX', 'Texas Board of Nursing', 'https://www.bon.texas.gov', 'member'),
  ST('Utah', 'UT', 'Utah State Board of Nursing', 'https://dopl.utah.gov/nurse/', 'member'),
  ST('Vermont', 'VT', 'Vermont State Board of Nursing', 'https://sos.vermont.gov/nursing/', 'member'),
  ST('Virginia', 'VA', 'Virginia Board of Nursing', 'https://www.dhp.virginia.gov/nursing/', 'member'),
  ST('Washington', 'WA', 'Washington State Board of Nursing', 'https://doh.wa.gov/licenses-permits-and-certificates/nursing-commission/nurse-licensing', 'pending'),
  ST('West Virginia', 'WV', 'West Virginia RN Board', 'https://wvrnboard.wv.gov', 'member'),
  ST('Wisconsin', 'WI', 'Wisconsin Board of Nursing', 'https://dsps.wi.gov/pages/BoardsCouncils/Nursing/Default.aspx', 'member'),
  ST('Wyoming', 'WY', 'Wyoming State Board of Nursing', 'https://wsbn.wyo.gov', 'member'),
  ST('District of Columbia', 'DC', 'District of Columbia Board of Nursing', 'https://dchealth.dc.gov/bon', 'none'),
])

// Grounded RN-licensure fees (USD) from official board fee schedules. examUsd =
// licensure-by-examination application fee; endorsementUsd = licensure-by-endorsement
// application fee. The board URL (above) is always the source of truth; where a board
// hides the number behind a portal/PDF we omit it and the UI says "see fee schedule."
export interface StateFees { examUsd?: number; endorsementUsd?: number }
export const STATE_FEES: Record<string, StateFees> = {
  alabama: { examUsd: 125, endorsementUsd: 125 },
  alaska: { examUsd: 375, endorsementUsd: 375 },
  arkansas: { examUsd: 75, endorsementUsd: 100 },
  'district of columbia': { examUsd: 187, endorsementUsd: 230 },
  idaho: { examUsd: 102, endorsementUsd: 102 },
  iowa: { examUsd: 143, endorsementUsd: 169 },
  kansas: { examUsd: 75 },
  louisiana: { examUsd: 100, endorsementUsd: 100 },
  maine: { examUsd: 75, endorsementUsd: 75 },
  mississippi: { examUsd: 100, endorsementUsd: 100 },
  missouri: { examUsd: 40, endorsementUsd: 105 },
  montana: { examUsd: 100, endorsementUsd: 200 },
  nebraska: { examUsd: 123, endorsementUsd: 123 },
  'new mexico': { examUsd: 150, endorsementUsd: 150 },
  'north dakota': { examUsd: 145, endorsementUsd: 170 },
  oklahoma: { examUsd: 85, endorsementUsd: 85 },
  'rhode island': { examUsd: 135, endorsementUsd: 135 },
  'south carolina': { examUsd: 90, endorsementUsd: 100 },
  'south dakota': { examUsd: 100, endorsementUsd: 100 },
  tennessee: { examUsd: 100, endorsementUsd: 115 },
  vermont: { examUsd: 60, endorsementUsd: 150 },
  // Hawaii fees prorate across the biennium (all licenses expire Jun 30 of odd-numbered years). $236 = first
  // year of the biennium (Application $40 + License $36 + Compliance Resolution Fund $100 + Center for Nursing
  // $60); ~$168 in the second year (½ License $18 + ½ CRF $50 + App $40 + CFN $60). Same board fee box applies
  // to exam and endorsement. Source: Hawaii BON RN/LPN application fee box (cca.hawaii.gov, by-exam PDF).
  hawaii: { examUsd: 236, endorsementUsd: 236 },
  // delaware, new hampshire, west virginia, wyoming: fee behind a portal/PDF — see board fee schedule.
  // ── flagship + key destination states (single-state fee where a state splits single/multistate) ──
  florida: { examUsd: 110, endorsementUsd: 110 },
  'new york': { examUsd: 143, endorsementUsd: 143 },
  texas: { examUsd: 186, endorsementUsd: 186 },
  california: { examUsd: 350, endorsementUsd: 350 }, // out-of-state grad; internationally-educated ~$750 — verify
  arizona: { examUsd: 300, endorsementUsd: 150 },
  colorado: { examUsd: 125, endorsementUsd: 125 },
  nevada: { examUsd: 100, endorsementUsd: 100 },
  oregon: { examUsd: 260, endorsementUsd: 295 },
  washington: { examUsd: 138, endorsementUsd: 138 },
  michigan: { examUsd: 54, endorsementUsd: 54 },
  massachusetts: { examUsd: 230, endorsementUsd: 275 },
  georgia: { examUsd: 40, endorsementUsd: 75 },
  illinois: { examUsd: 50, endorsementUsd: 50 },
  virginia: { examUsd: 190, endorsementUsd: 190 },
  minnesota: { examUsd: 105, endorsementUsd: 105 },
  utah: { examUsd: 90, endorsementUsd: 90 },
  maryland: { examUsd: 187, endorsementUsd: 230 },
  wisconsin: { examUsd: 60, endorsementUsd: 60 },
  'north carolina': { examUsd: 75, endorsementUsd: 150 },
  ohio: { examUsd: 75, endorsementUsd: 75 },
  'new jersey': { examUsd: 225, endorsementUsd: 200 },
  pennsylvania: { examUsd: 115, endorsementUsd: 120 },
  connecticut: { examUsd: 180, endorsementUsd: 180 },
  kentucky: { examUsd: 125, endorsementUsd: 165 },
  indiana: { examUsd: 50, endorsementUsd: 50 },
}

export function getStateFees(name?: string): StateFees {
  return name ? STATE_FEES[name.toLowerCase()] ?? {} : {}
}

export function getUsState(nameOrCode?: string): UsState | null {
  if (!nameOrCode) return null
  const t = nameOrCode.trim().toLowerCase()
  return US_STATES[t] ?? Object.values(US_STATES).find((s) => s.code.toLowerCase() === t || s.name.toLowerCase() === t) ?? null
}

/** All jurisdiction names, sorted — drives the state pickers. */
export function usStateList(): string[] {
  return Object.values(US_STATES).map((s) => s.name).sort()
}

/** The board as an official resource link (used by derived pathways). */
export function boardResource(s: UsState): OfficialResource {
  return { label: `${s.board} — licensure`, url: s.boardUrl }
}

/** A plain-language note on the compact, where relevant. */
export function compactNote(s: UsState): string | undefined {
  if (s.compact === 'member') return `${s.name} is a Nurse Licensure Compact state — a multistate license from your compact home state may let you practice here without a separate license.`
  if (s.compact === 'pending') return `${s.name} has enacted the Nurse Licensure Compact but is not yet issuing multistate licenses — confirm current status.`
  return undefined
}
