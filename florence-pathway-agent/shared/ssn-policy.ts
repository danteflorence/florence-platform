// SSN policy engine for internationally-educated nurses.
//
// Two hard truths shape this:
//   1. We NEVER collect or store the SSN itself. We help the nurse APPLY for one
//      where a state requires it, and we track only a boolean — "do they have it
//      yet?" — never the nine digits.
//   2. Obtaining an SSN is entirely off-platform: in person at a Social Security
//      office, after arrival, and (for F-1) generally only once the nurse is
//      work-authorized. There is a wait for the card.
//
// The decisive distinction this engine encodes: some boards REQUIRE an SSN, while
// others accept the SEVIS ID / visa documents or a sworn "no SSN" declaration — so
// the nurse can be licensed without one. Steering to the right path is the point.
import type { OfficialResource } from './types'

export type SsnRequirement =
  | 'required' // an SSN is required to be licensed — must apply in person at SSA
  | 'declaration_ok' // a sworn "I have no SSN" declaration/affidavit is accepted
  | 'sevis_or_visa_ok' // SEVIS ID / visa / immigration documents accepted in lieu of an SSN
  | 'itin_ok' // an ITIN may be used in place of an SSN
  | 'not_required' // the application does not require an SSN at all
  | 'unverified' // not yet grounded — verify on the board's official site

export interface SsnPolicy {
  requirement: SsnRequirement
  /** One-line summary for the state picker. */
  summary: string
  /** Longer plain-language explanation for the candidate. */
  detail?: string
  citation?: OfficialResource
}

/** True when the nurse must actually OBTAIN an SSN before this state will license them. */
export function ssnBlocks(p: SsnPolicy): boolean {
  return p.requirement === 'required'
}

/** True when the state breaks the SSN deadlock — SEVIS ID / declaration / no SSN needed. */
export function ssnFriendly(p: SsnPolicy): boolean {
  return p.requirement === 'sevis_or_visa_ok' || p.requirement === 'declaration_ok' || p.requirement === 'not_required'
}

const UNVERIFIED: SsnPolicy = {
  requirement: 'unverified',
  summary: 'We’re confirming this state’s SSN requirement — verify on the board’s official site.',
}

/**
 * Per-state SSN policy for RN licensure, keyed by lowercase state name. A board's
 * SSN rule applies to BOTH exam and endorsement applicants, so this is the single
 * source of truth consulted by every pathway. Entries are grounded in official
 * board / .gov sources; anything not yet verified falls back to UNVERIFIED rather
 * than guessing.
 */
export const STATE_SSN_POLICY: Record<string, SsnPolicy> = {
  // ---- No SSN needed at all -------------------------------------------------
  'new york': {
    requirement: 'not_required',
    summary: 'New York does not require an SSN — applicants without one are assigned a computer-generated identifier.',
    detail:
      'NYSED assigns a random nine-digit identifier to applicants without an SSN — no SSN, ITIN, or affidavit needed. The most F-1-friendly path.',
    citation: { label: 'NYSED Office of the Professions — General information & policies', url: 'https://www.op.nysed.gov/about/general-information-policies' },
  },
  oregon: {
    requirement: 'sevis_or_visa_ok',
    summary: 'Oregon accepts your F-1 immigration documents (I-20 + I-94) in lieu of an SSN.',
    detail:
      'Oregon rule OAR 851-001-0030(5) lets applicants without an SSN provide immigration documents instead — for F-1 students specifically, a valid I-94 and an I-20 signed by your DSO (the I-20 carries your SEVIS ID). No SSN or ITIN required.',
    citation: { label: 'Oregon State Board of Nursing — OAR 851-001-0030', url: 'https://secure.sos.state.or.us/oard/viewSingleRule.action?ruleVrsnRsn=279842' },
  },
  // ---- A sworn "no SSN" affidavit / declaration is accepted -----------------
  arizona: {
    requirement: 'declaration_ok',
    summary: 'Arizona accepts a signed affidavit in place of an SSN — including a version for applicants living abroad.',
    detail:
      'If you meet every other requirement, Arizona licenses you on a sworn “Affidavit Re: Social Security Number.” A separate lawful-presence affidavit covers foreign-national applicants still abroad (a foreign passport with a U.S. visa is accepted as lawful-presence evidence).',
    citation: { label: 'Arizona State Board of Nursing — SSN affidavit', url: 'https://azbn.gov/sites/default/files/2023-04/LIC-Affidavit-SSN.pdf' },
  },
  colorado: {
    requirement: 'declaration_ok',
    summary: 'Colorado accepts an “Affidavit of Social Security” — explicitly covering nonimmigrants on a student visa.',
    detail:
      'Colorado normally requires an SSN, but applicants without one complete an Affidavit of Social Security. The form explicitly applies to people not physically in the U.S., or here as nonimmigrants on a student (F-1) visa.',
    citation: { label: 'Colorado Board of Nursing (DORA) — Nursing applications', url: 'https://dpo.colorado.gov/Nursing/Applications' },
  },
  washington: {
    requirement: 'declaration_ok',
    summary: 'Washington does not require an SSN — you file a sworn “Declaration of No Social Security Number.”',
    detail:
      'Washington DOH: “You are not required to have or obtain a Social Security Number to apply for or obtain a license.” Applicants without one file the Declaration of No SSN with their application.',
    citation: { label: 'Washington Nursing Commission — Declaration of No SSN', url: 'https://nursing.wa.gov/sites/default/files/2022-09/No%20Social%20Security%20Number%20Document%20(PDF).pdf' },
  },
  michigan: {
    requirement: 'declaration_ok',
    summary: 'Michigan accepts a notarized SSN affidavit if you have no SSN (provide one later if you obtain it).',
    detail:
      'Michigan (LARA) requests an SSN at application, but an applicant with none submits a notarized “Social Security Number Affidavit” stating the reason; the license can issue, and you agree to provide an SSN if you later obtain one.',
    citation: { label: 'Michigan LARA — Social Security Number Affidavit', url: 'https://www.michigan.gov/lara/-/media/Project/Websites/lara/bpl/Shared-Files/Social-Security-Number-Affidavit.pdf' },
  },
  massachusetts: {
    requirement: 'declaration_ok',
    summary: 'Massachusetts licenses you on a no-SSN affidavit; you then have one year after licensure to obtain an SSN.',
    detail:
      'An applicant who has no SSN and is ineligible for one files the Board’s affidavit and can be licensed, then has one year after licensure to obtain and report an SSN once eligible.',
    citation: { label: 'Massachusetts Board of Registration in Nursing — license by exam', url: 'https://www.mass.gov/how-to/apply-for-a-nursing-license-by-exam' },
  },
  minnesota: {
    requirement: 'declaration_ok',
    summary: 'Minnesota accepts a checkbox attestation that you do not currently have a U.S. SSN.',
    detail:
      'The Minnesota application has a box: “I do not have a US Social Security number at this time but will notify the Board if/when I obtain one.” That attestation lets licensure proceed without an SSN.',
    citation: { label: 'Minnesota Board of Nursing — Licensure', url: 'https://mn.gov/boards/nursing/licensure/' },
  },
  maryland: {
    requirement: 'declaration_ok',
    summary: 'Maryland accepts a signed no-SSN affidavit (paper application); an ITIN also works but yields a Maryland-only license.',
    detail:
      'Applicants with neither an SSN nor an ITIN file a paper application with a signed affidavit under the Social Security Act §466(A)(13) exception. An ITIN may be entered instead, but produces a “Maryland Only” (non-compact) license.',
    citation: { label: 'Maryland Board of Nursing — ITIN / no-SSN guidance', url: 'https://health.maryland.gov/mbon/pages/individual-taxpayer-identification-numbers.aspx' },
  },
  wisconsin: {
    requirement: 'declaration_ok',
    summary: 'Wisconsin accepts a sworn affidavit (DCF-F-2462) if you have no SSN.',
    detail:
      'Wisconsin DSPS: applicants without an SSN complete the Department of Children and Families affidavit (Form DCF-F-2462) and upload it with the online application.',
    citation: { label: 'Wisconsin DSPS — nursing application (no-SSN affidavit)', url: 'https://dsps.wi.gov/Credentialing/Business/fm1051.pdf' },
  },
  'new jersey': {
    requirement: 'declaration_ok',
    summary: 'New Jersey does not require an SSN for a single-state license — you sign a no-SSN/ITIN certification.',
    detail:
      'NJ law: “A social security number is not required for licensure.” Applicants without one sign a certification affidavit and receive a single-state NJ license. (An SSN is required only for the multistate/compact license.)',
    citation: { label: 'New Jersey Division of Consumer Affairs — applying for a license', url: 'https://www.njconsumeraffairs.gov/Pages/Applying-For-A-License.aspx' },
  },
  pennsylvania: {
    requirement: 'declaration_ok',
    summary: 'Pennsylvania issues an initial single-state license on a “Waiver of SSN Verification”; the SSN is required at renewal.',
    detail:
      'Pennsylvania accepts a sworn “Waiver of Social Security Number Verification” for initial single-state licensure. You agree to provide the SSN once obtained — and it becomes required at your first renewal. (Multistate license requires an SSN.)',
    citation: { label: 'Pennsylvania State Board of Nursing — SSN waiver form', url: 'https://www.pa.gov/content/dam/copapwp-pagov/en/dos/department-and-offices/bpoa/nursing/SSN-WAIVER-FORM-03.2024%20.pdf' },
  },
  texas: {
    requirement: 'declaration_ok',
    summary: 'Texas has a dedicated “Applicants Without a Social Security Number” process, so you can apply without one.',
    detail:
      'Texas requests an SSN but publishes a no-SSN applicant track, including an alternate criminal-background/fingerprint procedure (FBI card with ORI TX923672Z). Confirm the final license-issuance step with the Board directly.',
    citation: { label: 'Texas BON — applicants without an SSN (background-check form)', url: 'https://www.bon.texas.gov/pdfs/forms_pdfs/applications_pdfs/CBCFPNOSSN.pdf' },
  },
  // ---- SSN or ITIN (ITIN needs no work authorization) -----------------------
  california: {
    requirement: 'itin_ok',
    summary: 'California requires an SSN or an ITIN — without one, the BRN will not process your application.',
    detail:
      'Disclosure of an SSN or IRS ITIN is mandatory (Business & Professions Code §30). With no SSN you obtain an ITIN via IRS Form W-7 — an ITIN does not require work authorization, so you can get one on F-1.',
    citation: { label: 'California BRN — exam application instructions (SSN/ITIN mandatory)', url: 'https://www.rn.ca.gov/pdfs/applicants/exam-app-instructions.pdf' },
  },
  florida: {
    requirement: 'itin_ok',
    summary: 'Florida lets you sit the NCLEX without an SSN, but won’t issue the license until you provide an SSN or ITIN.',
    detail:
      'A Social Security Number is not required to take the exam; however Florida law prohibits issuing the license until you provide an SSN — or an ITIN if you cannot legally obtain an SSN.',
    citation: { label: 'Florida Dept. of Health — what if I don’t have an SSN?', url: 'https://flhealthsource.gov/faq/what-do-i-need-to-know-if-i-do-not-have-a-social-security-number/' },
  },
  nevada: {
    requirement: 'itin_ok',
    summary: 'Nevada requires a valid SSN or an ITIN before any license is issued.',
    detail:
      'Nevada can issue a license to applicants with a valid SSN or an ITIN. An F-1 nurse without an SSN obtains an ITIN (IRS Form W-7 — no work authorization required) before Nevada will issue the license.',
    citation: { label: 'Nevada State Board of Nursing — general FAQs', url: 'https://nevadanursingboard.org/wp-content/uploads/2023/01/General-FAQs.pdf' },
  },
  illinois: {
    requirement: 'itin_ok',
    summary: 'Illinois accepts an SSN or ITIN; with neither, you submit a sworn SSN affidavit.',
    detail:
      'The Illinois application requires an SSN or ITIN. An applicant with neither submits the IDFPR SSN affidavit certifying they have no Social Security number.',
    citation: { label: 'Illinois IDFPR — SSN certification affidavit', url: 'https://idfpr.illinois.gov/content/dam/soi/en/web/idfpr/forms/dpr/certification-of-ssn.pdf' },
  },
  utah: {
    requirement: 'itin_ok',
    summary: 'Utah accepts an ITIN or A-number instead of an SSN (or, failing those, a passport + Utah job offer).',
    detail:
      'Utah (DOPL) lets applicants without an SSN provide an ITIN or Alien Registration (A-number). With none of those, you may apply using an unexpired foreign passport plus an intent-to-hire letter from a Utah employer. (This does not replace proving lawful presence.)',
    citation: { label: 'Utah DOPL — internationally-trained applicant FAQ', url: 'https://commerce.utah.gov/dopl/internationally-trained-applicant-information/frequently-asked-questions/' },
  },
  // ---- An SSN is required (obtained via your F-1 program's CPT) --------------
  'north carolina': {
    requirement: 'required',
    summary: 'North Carolina requires an SSN before the license is issued — your F-1 program’s CPT already makes you eligible to apply.',
    detail:
      'NC law requires a valid SSN to be issued a license (NCGS §93B-14). You may take the NCLEX while your SSN application is pending. Your F-1 program already includes CPT work authorization (your university handles it), so you’re SSN-eligible — you simply apply in person at SSA once you arrive.',
    citation: { label: 'North Carolina Board of Nursing — licensure by exam', url: 'https://www.ncbon.com/rnlpn-examination' },
  },
  ohio: {
    requirement: 'required',
    summary: 'Ohio law requires your SSN on every nursing license application, with no published no-SSN alternative.',
    detail:
      'Ohio Revised Code §3123.50 requires each license application to include the applicant’s SSN; no ITIN/affidavit/SEVIS accommodation is published. Your F-1 program’s CPT makes you SSN-eligible — apply in person at SSA after you arrive.',
    citation: { label: 'Ohio Revised Code §3123.50', url: 'https://codes.ohio.gov/ohio-revised-code/section-3123.50' },
  },
  virginia: {
    requirement: 'required',
    summary: 'Virginia needs an SSN for a permanent license, but issues a 90-day single-state temporary license without one.',
    detail:
      'If you qualify but have no SSN, Virginia issues a single-state temporary license (active 90 days) and lets you sit the NCLEX; it converts to permanent once you provide an SSN. Your F-1 program’s CPT makes you SSN-eligible (apply at SSA in person). (Va. Code §54.1-116.)',
    citation: { label: 'Virginia Board of Nursing — RN/LPN exam instructions', url: 'https://www.license.dhp.virginia.gov/apply/Forms/Nursing/RNLPN_Exam_Instr.pdf' },
  },
  indiana: {
    requirement: 'required',
    summary: 'Indiana requires an SSN for full licensure, but offers a 180-day Provisional RN license for no-SSN candidates.',
    detail:
      'Indiana makes SSN disclosure mandatory for a full license, but issues a 180-day Provisional RN license for candidates who don’t yet have an SSN and are seeking work authorization — upgraded to full licensure once you provide an SSN. Your F-1 program’s CPT makes you SSN-eligible (apply at SSA in person).',
    citation: { label: 'Indiana Professional Licensing Agency — nursing licensing', url: 'https://www.in.gov/pla/professions/nursing-home/nursing-licensing-information/' },
  },
  connecticut: {
    requirement: 'required',
    summary: 'Connecticut makes SSN disclosure mandatory for licensure, with no documented no-SSN alternative.',
    detail:
      'Connecticut DPH: disclosure of the SSN is mandatory (Conn. Gen. Stat. §17b-137a). No affidavit/ITIN/SEVIS alternative is published — confirm with DPH. Your F-1 program’s CPT makes you SSN-eligible (apply at SSA in person).',
    citation: { label: 'Connecticut DPH — practitioner licensure policies', url: 'https://portal.ct.gov/dph/practitioner-licensing--investigations/plis/practitioner-licensure-general-policies-and-procedures' },
  },
  // ---- Not yet officially confirmed — verify with the board -----------------
  georgia: {
    requirement: 'unverified',
    summary: 'Georgia’s nursing regulations contain no SSN requirement, but the board’s official FAQ/application couldn’t be read — confirm with GBON.',
    detail:
      'The binding Georgia Administrative Code (Ch. 410-1, 410-2) contains no Social Security number requirement for licensure; however the official Georgia Board of Nursing FAQ and international-graduate application — which would state the actual issuance policy — are not publicly readable (HTTP 403), so we can’t confirm whether an SSN is required at issuance or whether a no-SSN option exists. Confirm directly with the Georgia Board of Nursing. (Georgia’s lawful-presence affidavit under O.C.G.A. §50-36-1 is an immigration check, not an SSN substitute.)',
    citation: { label: 'Georgia Administrative Code — Nursing (Ch. 410-2, licensure by exam)', url: 'https://rules.sos.ga.gov/gac/410-2' },
  },
  kentucky: {
    requirement: 'required',
    summary: 'Kentucky lets you sit the NCLEX without an SSN, but won’t issue the license until you provide one (no affidavit/ITIN alternative).',
    detail:
      'Kentucky regulation 201 KAR 20:480 §1(5): a foreign-educated applicant “may be made eligible to take the NCLEX examination prior to obtaining a Social Security number. However, the applicant shall not be licensed until he provides a Social Security number.” No no-SSN substitute exists. Your F-1 program’s CPT makes you SSN-eligible (apply at SSA in person).',
    citation: { label: 'Kentucky 201 KAR 20:480 §1(5) — foreign-graduate licensure', url: 'https://apps.legislature.ky.gov/law/kar/titles/201/020/480/2364/' },
  },
}

export function getSsnPolicy(state?: string): SsnPolicy {
  if (!state) return UNVERIFIED
  return STATE_SSN_POLICY[state.toLowerCase()] ?? UNVERIFIED
}

/** What the candidate needs to DO about the SSN for their target state. */
export type SsnAction = 'none' | 'apply_ssn' | 'apply_itin' | 'sign_affidavit'

/** The concrete action for a state's policy given whether the nurse already has an SSN. */
export function ssnAction(p: SsnPolicy, hasSsn: boolean): SsnAction {
  if (hasSsn) return 'none'
  switch (p.requirement) {
    case 'required': return 'apply_ssn' // must obtain an SSN — needs work authorization first
    case 'itin_ok': return 'apply_itin' // get an ITIN (no work authorization required)
    case 'declaration_ok': return 'sign_affidavit' // sworn "no SSN" affidavit
    default: return 'none' // not_required, sevis_or_visa_ok, unverified — nothing to obtain
  }
}

/** CPT is the F-1 work authorization that makes a student SSN-eligible. It comes
 *  with the program — the university authorizes it on the I-20, so it's not a step
 *  Florence tracks; it simply means an "SSN required" state is an achievable path. */
export const CPT_RESOURCE: OfficialResource = {
  label: 'ICE Study in the States — Curricular Practical Training (CPT)',
  url: 'https://studyinthestates.dhs.gov/students/training-opportunities-in-the-united-states/curricular-practical-training',
  note: 'CPT comes with your F-1 program (your university authorizes it on your I-20) — it makes you eligible to apply for an SSN.',
}

/** Official SSA guidance for applying for an SSN. Off-platform and in person. */
export const SSA_RESOURCES: OfficialResource[] = [
  {
    label: 'SSA — International Students and Social Security Numbers (Pub. 05-10181)',
    url: 'https://www.ssa.gov/pubs/EN-05-10181.pdf',
    note: 'Your F-1 program’s CPT (handled by your university) makes you SSN-eligible — then you apply in person at SSA after you arrive.',
  },
  {
    label: 'SSA — Apply for a Social Security number (in person)',
    url: 'https://www.ssa.gov/number-card',
    note: 'F-1 students must apply in person at a Social Security office; the card typically arrives ~1–2 weeks after SSA has all documents.',
  },
]

/** ITIN route — for states (CA, FL) that accept an ITIN in lieu of an SSN. An ITIN
 *  does NOT require work authorization, so an F-1 nurse can obtain one. */
export const ITIN_RESOURCES: OfficialResource[] = [
  {
    label: 'IRS — Individual Taxpayer Identification Number (ITIN)',
    url: 'https://www.irs.gov/individuals/individual-taxpayer-identification-number',
    note: 'An ITIN does not require work authorization — available to F-1 nurses who can’t yet get an SSN.',
  },
  { label: 'IRS — About Form W-7 (Application for ITIN)', url: 'https://www.irs.gov/forms-pubs/about-form-w-7' },
]

/** The federal floor: an SSN is not a condition of licensure; a sworn affidavit substitutes. */
export const FEDERAL_SSN_RESOURCE: OfficialResource = {
  label: 'HHS/ACF — Social Security Numbers on License Applications (affidavit option)',
  url: 'https://acf.gov/css/policy-guidance/social-security-numbers-license-applications-and-other-documents',
  note: '42 U.S.C. §666(a)(13) requires states to record an SSN if you have one — it does not require you to obtain one to be licensed.',
}

/** Resources matched to the action the candidate must take. */
export function ssnResources(action: SsnAction, policy: SsnPolicy): OfficialResource[] {
  switch (action) {
    case 'apply_ssn': return [CPT_RESOURCE, ...SSA_RESOURCES, FEDERAL_SSN_RESOURCE]
    case 'apply_itin': return [...ITIN_RESOURCES, ...(policy.citation ? [policy.citation] : [])]
    case 'sign_affidavit': return [...(policy.citation ? [policy.citation] : []), FEDERAL_SSN_RESOURCE]
    default: return policy.citation ? [policy.citation] : []
  }
}

/** Shown anywhere the SSN is discussed — the non-negotiable privacy posture. */
export const SSN_PRIVACY_NOTE =
  'Florence never asks for or stores your Social Security Number. Where a state requires one, ' +
  'we help you apply at the Social Security Administration and simply track whether you’ve received it — ' +
  'you enter the number only on the official application, never with us.'
