// Turn a raw posting into the canonical FlorenceRN view. RN-only by default:
// leadership-only, non-clinical, and LPN/LVN roles are flagged so the pipeline
// can exclude them unless explicitly selected. Specialty/setting/state/shift are
// inferred from the title + description with conservative confidence.
import type { NormalizedRole, DemandSpecialty, DemandSetting, Confidence, PayUnit, JobBenefitTag } from '../../shared/demand-types'

export interface NormalizeInput {
  employerName: string
  facilityName?: string
  title: string
  description?: string
  city?: string
  state?: string
  country?: string
  shift?: string
  employmentType?: string
  openings?: number
}

const SPECIALTY_MAP: [RegExp, DemandSpecialty][] = [
  [/med.?surg|medical.?surgical/, 'med_surg'],
  [/\bicu\b|intensive care|critical care|\bccu\b/, 'icu'],
  [/\b(er|ed)\b|emergency/, 'er'],
  [/tele(metry)?|\bpcu\b/, 'telemetry'],
  [/home health/, 'home_health'],
  [/dialysis|nephrology/, 'dialysis'],
  [/hospice|palliative/, 'hospice'],
  [/\bsnf\b|skilled nursing|long.?term care|\bltc\b/, 'snf'],
  [/clinic|ambulatory|outpatient/, 'clinic'],
  [/labor|delivery|\bl&d\b|postpartum|mother.?baby|\bnicu\b/, 'l_and_d'],
  [/\bor\b|operating room|perioperative|surgical services|\bpacu\b/, 'or'],
  [/pediatric|\bpeds\b|\bpicu\b/, 'peds'],
  [/psych|behavioral health|mental health/, 'psych'],
]

const SETTING_MAP: [RegExp, DemandSetting][] = [
  [/home health/, 'home_health'],
  [/home care/, 'home_care'],
  [/\bsnf\b|skilled nursing|nursing home/, 'snf'],
  [/\basc\b|ambulatory surgery|surgery center/, 'asc'],
  [/dialysis/, 'dialysis'],
  [/hospice/, 'hospice'],
  [/physician (practice|office)|medical group|private practice/, 'physician_practice'],
  [/clinic|ambulatory|outpatient/, 'clinic'],
  [/hospital|medical center|health system/, 'hospital'],
]

const US_STATE = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/

// States whose pay-transparency laws require employers (15+ staff) to post a pay scale.
const PAY_TRANSPARENCY_STATES = ['CA', 'CO', 'NY', 'WA', 'IL']

// Benefit tags extracted from posting text (source-attributed; never overpromised).
const BENEFIT_MAP: [RegExp, JobBenefitTag][] = [
  [/health (insurance|benefits|coverage|plan)|medical[,/ ]+dental|medical\/dental|dental.{0,8}vision/i, 'health_insurance'],
  [/401\s*\(?k\)?|403\s*\(?b\)?|retirement (plan|savings|benefits)|pension/i, 'retirement_401k'],
  [/\bpto\b|paid time off|paid (vacation|leave)|vacation days/i, 'pto'],
  [/tuition (reimbursement|assistance|support)|student loan (repayment|forgiveness)|loan (repayment|forgiveness)/i, 'tuition_support'],
  [/relocation (assistance|bonus|package|support)|sign.?on bonus/i, 'relocation'],
  [/shift differential|night differential|weekend differential|shift premium/i, 'shift_differential'],
  [/\bunion\b|collective bargaining|represented (role|position)|\bcna\b contract/i, 'union'],
]

/** Extract benefit tags from posting text. Pure; reused by ingest + manual re-extraction. */
export function extractBenefits(text: string): JobBenefitTag[] {
  const out: JobBenefitTag[] = []
  for (const [re, tag] of BENEFIT_MAP) if (re.test(text) && !out.includes(tag)) out.push(tag)
  return out
}

const PAY_UNIT: [RegExp, PayUnit][] = [
  [/^(hour|hr|hourly)$/i, 'hour'],
  [/^(year|yr|annual|annually)$/i, 'year'],
  [/^(month|mo)$/i, 'month'],
]
const num = (s: string): number => Number(s.replace(/,/g, ''))
const unitOf = (raw: string): PayUnit | undefined => PAY_UNIT.find(([re]) => re.test(raw))?.[1]
const saneFor = (v: number, u: PayUnit): boolean =>
  u === 'hour' ? v >= 10 && v <= 400 : u === 'year' ? v >= 20000 && v <= 400000 : v >= 1500 && v <= 60000

export interface ParsedPay { listedPayMin?: number; listedPayMax?: number; listedPayUnit?: PayUnit }

/** Parse a LISTED pay range from posting text. Conservative: requires an explicit
 *  /hr|/yr|per-unit anchor and passes sanity bounds (filters bonuses/ZIPs/phones). */
export function parsePay(text: string): ParsedPay {
  // $120k–$140k (k-suffix, no explicit unit → annual)
  const kRange = /\$\s*([\d.]+)\s*k\s*(?:-|–|—|to)\s*\$?\s*([\d.]+)\s*k\b/i.exec(text)
  if (kRange) {
    const min = num(kRange[1]) * 1000, max = num(kRange[2]) * 1000
    if (saneFor(min, 'year') && saneFor(max, 'year')) return { listedPayMin: min, listedPayMax: max, listedPayUnit: 'year' }
  }
  // $X–$Y per <unit>
  const range = /\$\s*([\d,]+(?:\.\d{1,2})?)\s*(?:-|–|—|to)\s*\$?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:\/|per\s+)\s*(hour|hr|hourly|year|yr|annual(?:ly)?|month|mo)\b/i.exec(text)
  if (range) {
    const u = unitOf(range[3])
    if (u) { const min = num(range[1]), max = num(range[2]); if (saneFor(min, u) && saneFor(max, u)) return { listedPayMin: min, listedPayMax: max, listedPayUnit: u } }
  }
  // $X per <unit> (single value)
  const single = /\$\s*([\d,]+(?:\.\d{1,2})?)\s*(?:\/|per\s+)\s*(hour|hr|hourly|year|yr|annual(?:ly)?|month|mo)\b/i.exec(text)
  if (single) {
    const u = unitOf(single[2])
    if (u) { const v = num(single[1]); if (saneFor(v, u)) return { listedPayMin: v, listedPayMax: v, listedPayUnit: u } }
  }
  return {}
}

function roleOf(title: string): NormalizedRole {
  const t = title.toLowerCase()
  if (/nurse manager|director of nursing|\bcno\b|nurse director|charge nurse|nurse supervisor/.test(t)) return 'nurse_manager'
  if (/\blpn\b|\blvn\b|licensed (practical|vocational)/.test(t)) return 'licensed_vocational_nurse'
  if (/\brn\b|registered nurse/.test(t)) return 'registered_nurse'
  if (/\bnurse\b|nursing/.test(t)) return 'registered_nurse'
  return 'other'
}

export interface Normalized {
  /** RN-only filter: true keeps the job in the canonical pool. */
  keep: boolean
  normalizedRole: NormalizedRole
  specialty?: DemandSpecialty
  setting?: DemandSetting
  requiredLicenseState?: string
  shift?: 'day' | 'night' | 'variable' | 'unknown'
  employmentType?: 'full_time' | 'part_time' | 'per_diem' | 'contract' | 'unknown'
  listedPayMin?: number
  listedPayMax?: number
  listedPayUnit?: PayUnit
  payTransparencyFlag?: boolean
  payTransparencyNote?: string
  benefitsExtracted?: JobBenefitTag[]
  confidence: Confidence
}

export function normalizeJob(i: NormalizeInput): Normalized {
  const hay = `${i.title} ${i.description ?? ''}`.toLowerCase()
  const normalizedRole = roleOf(i.title)
  const keep = normalizedRole === 'registered_nurse'

  const specialty = SPECIALTY_MAP.find(([re]) => re.test(hay))?.[1]
  const setting = SETTING_MAP.find(([re]) => re.test(hay))?.[1] ?? 'hospital'
  const stateRaw = (i.state ?? '').trim().toUpperCase()
  const requiredLicenseState =
    stateRaw.length === 2 && US_STATE.test(stateRaw) ? stateRaw : US_STATE.exec(`${i.state ?? ''} ${i.city ?? ''}`)?.[1]

  const shift: Normalized['shift'] = /night|noc\b/.test(hay)
    ? 'night'
    : /\bday\b|7a-7p/.test(hay)
      ? 'day'
      : /variable|rotating/.test(hay)
        ? 'variable'
        : 'unknown'
  const employmentType: Normalized['employmentType'] = /per.?diem|\bprn\b/.test(hay)
    ? 'per_diem'
    : /part.?time/.test(hay)
      ? 'part_time'
      : /contract|travel/.test(hay)
        ? 'contract'
        : /full.?time|\bft\b/.test(hay)
          ? 'full_time'
          : 'unknown'

  const confidence: Confidence = specialty && requiredLicenseState ? 'high' : requiredLicenseState ? 'medium' : 'low'

  // Pay + benefits parsed from the ORIGINAL-case posting text (case-insensitive regex).
  const text = `${i.title} ${i.description ?? ''}`
  const pay = parsePay(text)
  const benefits = extractBenefits(text)
  // CA/etc posting that omitted a pay range → informational transparency flag (never blocks).
  const payTransparencyFlag = pay.listedPayMin == null && !!requiredLicenseState && PAY_TRANSPARENCY_STATES.includes(requiredLicenseState)
  const payTransparencyNote = payTransparencyFlag ? `${requiredLicenseState} posting lacked a pay range (pay-transparency jurisdiction)` : undefined

  return {
    keep, normalizedRole, specialty, setting, requiredLicenseState, shift, employmentType, confidence,
    ...pay,
    ...(payTransparencyFlag ? { payTransparencyFlag, payTransparencyNote } : {}),
    ...(benefits.length ? { benefitsExtracted: benefits } : {}),
  }
}
