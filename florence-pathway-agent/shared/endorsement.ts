// ============================================================================
// Licensure-by-endorsement rules engine (data-driven, per state).
// Endorsement = transferring an existing U.S. RN license into a new state.
// Grounded in each board's own instructions (see citations). This is the
// "50-state model" from the brief — populated for the states we have sourced;
// getEndorsementState() returns null for the rest (UI falls back to generic).
// ============================================================================
import type { OfficialResource } from './types'
import { getUsState, usStateList, boardResource, compactNote, getStateFees } from './us-states'

export interface EndorsementStep {
  key: string
  title: string
  detail: string
  /** A blocker the candidate must complete before the application is "complete". */
  blocker?: boolean
}

export interface EndorsementState {
  state: string
  code: string
  board: string
  /** Nurse Licensure Compact member — a multistate license may avoid endorsement. */
  compact: boolean
  feeUsd?: number
  /** How the existing license is verified. */
  verification: string
  /** Background check / fingerprinting method. */
  fingerprints: string
  jurisprudence?: string
  continuingEd?: string
  practiceHours?: string
  highlights: string[]
  steps: EndorsementStep[]
  officialResources: OfficialResource[]
  citations: { label: string; note: string; url?: string }[]
  timelineDays?: [number, number]
}

const NURSYS: OfficialResource = { label: 'Nursys — license verification for endorsement', url: 'https://www.nursys.com/' }

export const ENDORSEMENT_STATES: Record<string, EndorsementState> = {
  hawaii: {
    state: 'Hawaii', code: 'HI', board: 'Hawaii Board of Nursing', compact: false,
    verification: 'License verification via Nursys where the issuing board participates; otherwise a direct verification request to that board.',
    fingerprints: 'National (FBI) + state criminal-history-record check; the license application must be filed within 30 days of fingerprinting or you fingerprint again.',
    highlights: [
      'Not a Nurse Licensure Compact state — you need a Hawaii license to practice in Hawaii.',
      'Board fees prorate across the biennium (every license expires June 30 of an odd-numbered year): about $236 in the first year of the biennium — Application $40 + License $36 + Compliance Resolution Fund $100 + Center for Nursing $60 — and about $168 in the second year (½ License $18 + ½ CRF $50). Fingerprint/criminal-history-record check is paid separately.',
    ],
    steps: [],
    officialResources: [
      { label: 'Hawaii Board of Nursing — application forms, fees & instructions', url: 'https://cca.hawaii.gov/pvl/boards/nursing/application_publications/' },
      { label: 'Hawaii BON — licensure by endorsement / without exam (fee box)', url: 'https://cca.hawaii.gov/wp-content/uploads/2026/01/RN-LPN-Nursing-endorsement-or-without-exam_02.24R.pdf', note: 'Same board fee codes: App $40, Lic $36 (½ Ren $18), Compliance Resolution Fund $100/$50, Center for Nursing $60.' },
      NURSYS,
    ],
    citations: [
      { label: 'Hawaii State Center for Nursing fee (Act 66, SLH 2022)', note: 'The Center for Nursing fee increased from $40 to $60 for all initial, renewal and restoration nurse licenses issued on or after July 1, 2022.', url: 'https://cca.hawaii.gov/pvl/boards/nursing/' },
    ],
  },
  texas: {
    state: 'Texas', code: 'TX', board: 'Texas Board of Nursing', compact: true,
    verification: 'Nursys (effective July 2025, all U.S. states/territories except Puerto Rico verify via Nursys for endorsement).',
    fingerprints: 'Fingerprints for a Criminal Background Check via Texas DPS and the FBI.',
    jurisprudence: 'Texas Nursing Jurisprudence Exam (NJE) is required.',
    timelineDays: [15, 60],
    highlights: [
      'Apply via the online endorsement application in the Texas Nurse Portal.',
      'Compact state — a multistate license from your compact home state may let you practice without endorsement.',
      'Processing is ~15 working days from receipt of all required documents.',
    ],
    steps: [
      { key: 'verify', title: 'Order Nursys license verification', detail: 'Request verification of your original (exam-state) license to Texas.', blocker: true },
      { key: 'portal', title: 'Submit the Texas Nurse Portal endorsement application', detail: 'Complete the online endorsement application + fee.', blocker: true },
      { key: 'fingerprint', title: 'DPS/FBI fingerprinting', detail: 'Complete the criminal background check.', blocker: true },
      { key: 'nje', title: 'Pass the Texas Nursing Jurisprudence Exam', detail: 'Required online exam on Texas nursing law.', blocker: true },
    ],
    officialResources: [
      { label: 'Texas BON — Endorsement information', url: 'https://www.bon.texas.gov/licensure_endorsement.asp.html' },
      { label: 'Texas BON — Endorsement application forms', url: 'https://www.bon.texas.gov/applications_endorsement.asp.html' },
      NURSYS,
    ],
    citations: [
      { label: 'Texas BON — Endorsement', note: 'Apply via the Texas Nurse Portal; effective July 2025 all U.S. states verify via Nursys; DPS/FBI fingerprints; ~15 working days.', url: 'https://www.bon.texas.gov/licensure_endorsement.asp.html' },
    ],
  },
  florida: {
    state: 'Florida', code: 'FL', board: 'Florida Board of Nursing', compact: true,
    verification: 'License verification of the active out-of-state license (Nursys where available).',
    fingerprints: 'Fingerprints for background screening if required.',
    jurisprudence: 'A jurisprudence exam on Florida law may be required.',
    practiceHours: 'At least three years of active practice within the preceding four years.',
    timelineDays: [30, 90],
    highlights: [
      'Florida’s MOBILE Act (SB 1600, effective July 1, 2024) created uniform endorsement requirements across health professions.',
      'Requires an active, unencumbered license in another state with a similar scope of practice, and a passed national exam / national certification.',
      'No pending discipline anywhere, and no disciplinary action in the 5 years before applying.',
    ],
    steps: [
      { key: 'eligibility', title: 'Confirm MOBILE Act eligibility', detail: 'Active unencumbered license, ≥3 yrs practice in the last 4, clean 5-yr discipline history.', blocker: true },
      { key: 'verify', title: 'Verify your out-of-state license', detail: 'Request verification (Nursys).', blocker: true },
      { key: 'apply', title: 'Submit the Florida endorsement application + fee', detail: 'Through the Florida BON / DOH portal.', blocker: true },
      { key: 'background', title: 'Fingerprint background screening', detail: 'If required for your profession.', blocker: false },
    ],
    officialResources: [
      { label: 'Florida BON — Licensing', url: 'https://floridasnursing.gov/licensing/' },
      { label: 'Florida MOBILE Act (SB 1600) overview', url: 'https://www.dinsmore.com/publications/floridas-new-simplified-licensure-by-endorsement-law-for-health-care-professions/' },
      NURSYS,
    ],
    citations: [
      { label: 'Florida MOBILE Act (SB 1600)', note: 'Effective July 1, 2024: active unencumbered out-of-state license with similar scope, passed national exam/cert, ≥3 yrs active practice in the preceding 4 yrs, no pending discipline, no discipline in the prior 5 yrs, fingerprints if required, possible jurisprudence exam.', url: 'https://www.dinsmore.com/publications/floridas-new-simplified-licensure-by-endorsement-law-for-health-care-professions/' },
    ],
  },
  colorado: {
    state: 'Colorado', code: 'CO', board: 'Colorado State Board of Nursing', compact: true,
    verification: 'Nursys verification ($30 per license type per board).',
    fingerprints: 'Fingerprint background check sent to CBI (Colorado Bureau of Investigation).',
    highlights: [
      'Apply online through DORA (Division of Professions and Occupations).',
      'Compact state — all applicants must complete a fingerprint background check to license in Colorado.',
      'Use the "Registered Nurse — Original License by Examination or Endorsement" application.',
    ],
    steps: [
      { key: 'verify', title: 'Complete Nursys verification', detail: '$30 per license type to Colorado.', blocker: true },
      { key: 'apply', title: 'Submit the DORA online endorsement application', detail: 'RN original-by-endorsement application + fee.', blocker: true },
      { key: 'fingerprint', title: 'Fingerprint background check (CBI)', detail: 'Have fingerprints taken and sent to CBI.', blocker: true },
    ],
    officialResources: [
      { label: 'Colorado DORA — Nursing applications', url: 'https://dpo.colorado.gov/Nursing/Applications' },
      { label: 'Colorado — Nurse Licensure Compact', url: 'https://dpo.colorado.gov/Nursing/Compact' },
      NURSYS,
    ],
    citations: [
      { label: 'Colorado DORA — Nursing', note: 'Apply online via DORA; Nursys verification ($30); fingerprint background check to CBI; compact member.', url: 'https://dpo.colorado.gov/Nursing/Applications' },
    ],
  },
  arizona: {
    state: 'Arizona', code: 'AZ', board: 'Arizona State Board of Nursing', compact: true,
    verification: 'Nursys verification ($30); PA or CA-LPN must request directly from the state.',
    fingerprints: 'Arizona-specific fingerprints (FD-258 blue/white card) — you may NOT reuse fingerprints from a prior agency.',
    feeUsd: 150,
    practiceHours: 'Minimum 960 practice hours and/or six months of nursing employment if the program was completed more than 5 years ago.',
    highlights: [
      'Apply online via the AZBN portal; upload citizenship documentation.',
      'A temporary license can be requested while the application is processed.',
      'Compact state.',
    ],
    steps: [
      { key: 'verify', title: 'Order Nursys verification of your original license', detail: '$30 via Nursys.', blocker: true },
      { key: 'apply', title: 'Submit the AZBN endorsement application ($150)', detail: 'Online; upload citizenship docs; request a temporary license if needed.', blocker: true },
      { key: 'fingerprint', title: 'Arizona fingerprints (FD-258 card)', detail: 'Obtain and submit AZ-specific fingerprint card — prior agency prints are not accepted.', blocker: true },
    ],
    officialResources: [
      { label: 'AZBN — Endorsement (RN/PN)', url: 'https://azbn.gov/licensure-certification/registered-nurse-practical-nurse/licensure-by-endorsement' },
      { label: 'AZBN — Apply for a license', url: 'https://azbn.gov/licenses-and-certifications/apply-license' },
      NURSYS,
    ],
    citations: [
      { label: 'Arizona RN endorsement process', note: 'Nursys verification ($30); AZBN online application ($150) with citizenship docs; AZ-specific FD-258 fingerprints (no reuse); 960 hrs / 6 months if program >5 yrs ago; temporary license available.', url: 'https://azbn.gov/licensure-certification/registered-nurse-practical-nurse/licensure-by-endorsement' },
    ],
  },
  california: {
    state: 'California', code: 'CA', board: 'California Board of Registered Nursing', compact: false,
    verification: 'Nursys verification ($30); a prior Pennsylvania license must be verified from the PA portal ($50).',
    fingerprints: 'California fingerprints AFTER the online application: Live Scan (only within CA) or an Applicant Fingerprint Card (out-of-state), requested via the BRN.',
    feeUsd: 350,
    highlights: [
      'Apply online through BreEZe ($350).',
      'NOT a compact state — endorsement is required to practice in California.',
      'Out-of-state applicants use the hard-card fingerprint process.',
    ],
    steps: [
      { key: 'apply', title: 'Submit the California endorsement application via BreEZe ($350)', detail: 'Register/sign in to BreEZe and complete the application in full.', blocker: true },
      { key: 'verify', title: 'Submit license verification(s)', detail: 'Nursys ($30) for the original and any other states; PA verified from the PA portal.', blocker: true },
      { key: 'fingerprint', title: 'California fingerprints (after applying)', detail: 'Live Scan (in CA) or Applicant Fingerprint Card (out of state) — request the form from the BRN.', blocker: true },
    ],
    officialResources: [
      { label: 'California BRN — Applicants', url: 'https://www.rn.ca.gov/applicants/index.shtml' },
      { label: 'BreEZe — online application', url: 'https://www.breeze.ca.gov/' },
      { label: 'BRN — fingerprint request', url: 'https://www.dca.ca.gov/webapps/rn/requests.php' },
      NURSYS,
    ],
    citations: [
      { label: 'California RN endorsement process', note: 'Apply online via BreEZe ($350); Nursys verification ($30, PA from PA portal $50); CA fingerprints after applying — Live Scan in-state or Applicant Fingerprint Card out-of-state.', url: 'https://www.rn.ca.gov/applicants/index.shtml' },
    ],
  },
  nevada: {
    state: 'Nevada', code: 'NV', board: 'Nevada State Board of Nursing', compact: false,
    verification: 'License verification of your active out-of-state license.',
    fingerprints: 'Fingerprint-based criminal background check.',
    feeUsd: 100,
    highlights: [
      'Apply via the Nevada Nurse Portal ($100 RN / $90 LPN; fees non-refundable).',
      'Submit evidence of graduation (diploma or official transcript with degree + graduation date posted).',
      'NOT a compact state.',
    ],
    steps: [
      { key: 'apply', title: 'Submit the Nevada Nurse Portal endorsement application ($100)', detail: 'Pay by debit/credit card; fees are non-refundable.', blocker: true },
      { key: 'education', title: 'Provide evidence of graduation', detail: 'Official transcript or diploma with degree and graduation date.', blocker: true },
      { key: 'verify', title: 'License verification', detail: 'Verify your original license to Nevada (Nursys where available).', blocker: true },
      { key: 'fingerprint', title: 'Fingerprint background check', detail: 'Complete the criminal background check.', blocker: true },
    ],
    officialResources: [
      { label: 'Nevada State Board of Nursing', url: 'https://www.nevadanursingboard.org/' },
      NURSYS,
    ],
    citations: [
      { label: 'Nevada Board of Nursing — Endorsement instructions', note: 'Apply via the Nevada Nurse Portal ($100 RN, non-refundable); evidence of graduation; license verification; fingerprint background check.', url: 'https://www.nevadanursingboard.org/' },
    ],
  },
  oregon: {
    state: 'Oregon', code: 'OR', board: 'Oregon State Board of Nursing (OSBN)', compact: false,
    verification: 'License verification of your active/previous out-of-state license.',
    fingerprints: 'Criminal background check / fingerprints.',
    feeUsd: 195,
    continuingEd: 'Required continuing education per OAR 851-031-0008, plus 1 hour of Pain Management training from the OR Pain Management Commission within the last 36 months.',
    highlights: [
      'Apply through the OSBN online system ($195) — the site does not work on phones/tablets.',
      'Answer the background-disclosure questions truthfully.',
      'NOT a compact state.',
    ],
    steps: [
      { key: 'account', title: 'Create your OSBN account', detail: 'Validate your email; enter your legal name exactly as on your government ID.', blocker: false },
      { key: 'pain', title: 'Complete 1-hour Pain Management training', detail: 'From the OR Pain Management Commission, within the last 36 months.', blocker: true },
      { key: 'apply', title: 'Submit the OSBN endorsement application ($195)', detail: 'Select the correct license level and education source; answer disclosure questions truthfully.', blocker: true },
      { key: 'verify', title: 'License verification + background check', detail: 'Verify your license and complete the background check.', blocker: true },
    ],
    officialResources: [
      { label: 'Oregon State Board of Nursing', url: 'https://www.oregon.gov/osbn' },
      NURSYS,
    ],
    citations: [
      { label: 'OSBN — LPN/RN by Endorsement steps', note: 'OSBN online application ($195); CE per OAR 851-031-0008; 1-hr Pain Management training within 36 months; truthful disclosure questions.', url: 'https://www.oregon.gov/osbn' },
    ],
  },
  washington: {
    state: 'Washington', code: 'WA', board: 'Washington State Department of Health', compact: false,
    verification: 'Nursys for the original (exam-state) license, EXCEPT Pennsylvania, Michigan, and California — those must be requested directly from the state.',
    fingerprints: 'Background check (and supporting documents for any "yes" disclosure answers).',
    highlights: [
      'Submit a complete application + non-refundable fee (incomplete applications delay processing).',
      'If you changed your name after a prior DOH license, include the legal name-change document.',
      'NOT a compact state.',
    ],
    steps: [
      { key: 'apply', title: 'Submit the WA DOH endorsement application + fee', detail: 'Fill in all applicable fields; attach supporting docs for any “yes” answers.', blocker: true },
      { key: 'verify', title: 'Verify your initial U.S. license', detail: 'Nursys (Licensure Verification for Endorsement) — PA/MI/CA request directly.', blocker: true },
      { key: 'name', title: 'Name-change documentation (if applicable)', detail: 'Marriage certificate, divorce decree, or court document.', blocker: false },
    ],
    officialResources: [
      { label: 'Washington DOH — Nursing licensing', url: 'https://doh.wa.gov/licenses-permits-and-certificates/professions-new-renew-or-update/nursing-commission' },
      { label: 'Nursys — Licensure Verification for Endorsement', url: 'https://www.nursys.com/' },
    ],
    citations: [
      { label: 'Washington DOH — RN/LPN endorsement requirements', note: 'Complete application + non-refundable fee; Nursys verification (PA/MI/CA direct); name-change docs if applicable; supporting docs for any “yes” disclosure.', url: 'https://doh.wa.gov/' },
    ],
  },
  michigan: {
    state: 'Michigan', code: 'MI', board: 'Michigan Board of Nursing (LARA)', compact: false,
    verification: 'License verification requested directly from the original state (Michigan is one of the states that does not use Nursys for outgoing verification).',
    fingerprints: 'Criminal background check — instructions emailed after the online application is submitted.',
    feeUsd: 208.8,
    highlights: [
      'Apply online via MiPLUS ($208.80; valid 2 years from issuance).',
      'Answer the Good Moral Character questions; attach documentation for any "yes".',
      'NOT a compact state.',
    ],
    steps: [
      { key: 'apply', title: 'Submit the MiPLUS endorsement application ($208.80)', detail: 'Complete all fields and upload supporting documentation.', blocker: true },
      { key: 'background', title: 'Complete the criminal background check', detail: 'Follow the instructions emailed after you submit.', blocker: true },
      { key: 'verify', title: 'License verification', detail: 'Request verification of your original license to Michigan.', blocker: true },
    ],
    officialResources: [
      { label: 'Michigan MiPLUS — apply online', url: 'https://www.michigan.gov/miplus' },
      { label: 'Michigan LARA — Nursing', url: 'https://www.michigan.gov/lara/bureau-list/bpl/health/hp-lic-health-prof/nursing' },
    ],
    citations: [
      { label: 'Michigan Nursing Licensing Guide', note: 'Apply online via MiPLUS ($208.80); criminal background check (instructions emailed after submission); Good Moral Character questions.', url: 'https://www.michigan.gov/miplus' },
    ],
  },
  massachusetts: {
    state: 'Massachusetts', code: 'MA', board: 'Massachusetts Board of Registration in Nursing', compact: false,
    verification: 'License verification of the out-of-state license.',
    fingerprints: 'Criminal background check.',
    highlights: [
      'Reciprocal (endorsement) applications are processed through Professional Credential Services (PCS) online.',
      'During a declared public-health emergency the Board can expedite reciprocal processing (Policy 10-03).',
      'NOT a compact state.',
    ],
    steps: [
      { key: 'apply', title: 'Apply for reciprocal licensure (PCS online)', detail: 'Submit application + documents + fee (credit card) via PCS.', blocker: true },
      { key: 'verify', title: 'License verification', detail: 'Verify your out-of-state license to Massachusetts.', blocker: true },
      { key: 'background', title: 'Background check', detail: 'Complete the required criminal background check.', blocker: true },
    ],
    officialResources: [
      { label: 'Massachusetts Board of Registration in Nursing', url: 'https://www.mass.gov/orgs/board-of-registration-in-nursing' },
      NURSYS,
    ],
    citations: [
      { label: 'MA Board of Nursing — Reciprocal licensure (Policy 10-03)', note: 'Reciprocal/endorsement applications processed via Professional Credential Services (PCS); expedited processing available during declared public-health emergencies.', url: 'https://www.mass.gov/orgs/board-of-registration-in-nursing' },
    ],
  },
  georgia: {
    state: 'Georgia', code: 'GA', board: 'Georgia Board of Nursing', compact: true,
    verification: 'Nursys verification of your original license to Georgia.',
    fingerprints: 'Fingerprint-based criminal background check.',
    highlights: [
      'Apply online through the Georgia Board of Nursing (Secretary of State) portal.',
      'Compact state — a multistate license may let you practice without a separate Georgia license.',
    ],
    steps: [
      { key: 'verify', title: 'Order Nursys verification', detail: 'Verify your original license to Georgia.', blocker: true },
      { key: 'apply', title: 'Submit the Georgia endorsement application + fee', detail: 'Online via the GA Board of Nursing.', blocker: true },
      { key: 'background', title: 'Fingerprint background check', detail: 'Complete the criminal background check.', blocker: true },
    ],
    officialResources: [
      { label: 'Georgia Board of Nursing', url: 'https://sos.ga.gov/georgia-board-nursing' },
      NURSYS,
    ],
    citations: [
      { label: 'Georgia Board of Nursing', note: 'Online endorsement application; Nursys verification; fingerprint background check; compact member. (Details to be confirmed against the board’s current instructions.)', url: 'https://sos.ga.gov/georgia-board-nursing' },
    ],
  },
  illinois: {
    state: 'Illinois', code: 'IL', board: 'Illinois Dept. of Financial & Professional Regulation (IDFPR)', compact: false,
    verification: 'License verification from your original/current state (Nursys where available).',
    fingerprints: 'Fingerprint-based criminal background check via an approved Illinois or out-of-state vendor.',
    highlights: ['Apply through IDFPR; foreign-language documents require an original notarized English translation.', 'NOT a compact state.'],
    steps: [
      { key: 'apply', title: 'Submit the IDFPR RN endorsement application + fee', detail: 'Read each step before applying to avoid delays.', blocker: true },
      { key: 'fingerprint', title: 'Fingerprint background check', detail: 'Approved Illinois or out-of-state fingerprint vendor.', blocker: true },
      { key: 'verify', title: 'License verification', detail: 'Verify your original/current license to Illinois.', blocker: true },
    ],
    officialResources: [{ label: 'Illinois IDFPR — Nursing', url: 'https://idfpr.illinois.gov/profs/nursing.html' }, NURSYS],
    citations: [{ label: 'Illinois IDFPR — RN application guide', note: 'IDFPR application + fingerprint-based background check; notarized English translations for foreign documents.', url: 'https://idfpr.illinois.gov/' }],
  },
  virginia: {
    state: 'Virginia', code: 'VA', board: 'Virginia Board of Nursing', compact: true, feeUsd: 190,
    verification: 'License verification (Nursys where available).',
    fingerprints: 'Criminal background check.',
    highlights: [
      'RN endorsement fee $190 ($170 LPN); apply online to the VBON.',
      'Compact state — multistate privilege requires meeting the Uniform Licensure Requirements with Virginia as your primary state of residence.',
      'Applicants without an SSN may receive a single-state temporary license (90 days).',
    ],
    steps: [
      { key: 'apply', title: 'Submit the VBON endorsement application ($190)', detail: 'Online (credit/debit) or by mail.', blocker: true },
      { key: 'verify', title: 'License verification', detail: 'Verify your original/current license to Virginia.', blocker: true },
      { key: 'background', title: 'Criminal background check', detail: 'Complete the required background check.', blocker: true },
    ],
    officialResources: [{ label: 'Virginia Board of Nursing', url: 'https://www.dhp.virginia.gov/Boards/Nursing/' }, { label: 'Nurse Licensure Compact', url: 'https://www.nursecompact.com/' }, NURSYS],
    citations: [{ label: 'Virginia BON — Endorsement instructions', note: 'RN $190; compact state (ULR/PSOR rules); SSN/temporary single-state license (90 days); criminal background check.', url: 'https://www.dhp.virginia.gov/Boards/Nursing/' }],
  },
  minnesota: {
    state: 'Minnesota', code: 'MN', board: 'Minnesota Board of Nursing', compact: false,
    verification: 'Verification from the state where first licensed (Nursys where available); two verifications if the initial and current states differ.',
    fingerprints: 'Criminal background check — a fingerprint packet is emailed the business day after you apply.',
    highlights: ['Apply online (register an account); paper option available.', 'Your employer completes a Confirmation of Nursing Employment form.', 'NOT a compact state.'],
    steps: [
      { key: 'apply', title: 'Submit the MN endorsement application', detail: 'Register an online account and apply.', blocker: true },
      { key: 'verify', title: 'Submit license verification(s)', detail: 'From the first-licensed state (and current, if different).', blocker: true },
      { key: 'fingerprint', title: 'Fingerprint criminal background check', detail: 'Complete the packet emailed after you apply.', blocker: true },
    ],
    officialResources: [{ label: 'Minnesota Board of Nursing — Endorsement', url: 'https://mn.gov/boards/nursing/licensure/apply-for-a-license/lic-by-end-process.jsp' }, NURSYS],
    citations: [{ label: 'Minnesota Board of Nursing — Endorsement process', note: 'Online application; verification from first-licensed state via Nursys; fingerprint background check (packet emailed next business day); employer Confirmation of Nursing Employment.', url: 'https://mn.gov/boards/nursing/licensure/apply-for-a-license/lic-by-end-process.jsp' }],
  },
  utah: {
    state: 'Utah', code: 'UT', board: 'Utah Division of Professional Licensing (DOPL)', compact: true,
    verification: 'Nursys verification where the prior state participates; otherwise the prior board sends verification directly.',
    fingerprints: 'Fingerprinting is mandatory — schedule with DOPL after applying, or submit fingerprint cards from an outside agency.',
    highlights: ['Apply online (utahdoc.mylicenseone.com) or by manual form.', 'Compact state.'],
    steps: [
      { key: 'apply', title: 'Submit the Utah DOPL endorsement application', detail: 'Online at utahdoc.mylicenseone.com.', blocker: true },
      { key: 'verify', title: 'Nursys (or direct) verification', detail: 'Have your prior license verified to Utah.', blocker: true },
      { key: 'fingerprint', title: 'Fingerprinting (after applying)', detail: 'Schedule with DOPL or mail outside-agency fingerprint cards.', blocker: true },
    ],
    officialResources: [{ label: 'Utah DOPL — RN/LPN licensing', url: 'https://commerce.utah.gov/dopl/nursing/apply-for-a-license/registered-nurse-or-licensed-practical-nurse/' }, NURSYS],
    citations: [{ label: 'Utah DOPL — RN/LPN by endorsement', note: 'Apply online; Nursys verification (or direct); mandatory fingerprinting via DOPL or outside-agency cards; compact member.', url: 'https://commerce.utah.gov/dopl/nursing/apply-for-a-license/registered-nurse-or-licensed-practical-nurse/' }],
  },
  maryland: {
    state: 'Maryland', code: 'MD', board: 'Maryland Board of Nursing', compact: true, feeUsd: 230,
    verification: 'Nursys — your original state of licensure must be verified (immediate on completion).',
    fingerprints: 'Live Scan fingerprinting (Agency Authorization #9300000850); out-of-state applicants request CJIS fingerprint cards.',
    highlights: [
      'Apply online at license.mdbon.org/nets ($230 permanent; $70 temporary 90-day); submit within 48 hours of fingerprinting.',
      'Compact state.',
      'Foreign-educated: TruMerit credentials evaluation + English exam (TOEFL iBT 26+, IELTS 7 speaking / 6.5 overall, or PTE).',
    ],
    steps: [
      { key: 'verify', title: 'Nursys verification of your original license', detail: 'Immediate on completion.', blocker: true },
      { key: 'fingerprint', title: 'Live Scan fingerprinting', detail: 'Agency Authorization #9300000850; out-of-state via CJIS cards.', blocker: true },
      { key: 'apply', title: 'Submit the MBON endorsement application ($230)', detail: 'Online at license.mdbon.org/nets within 48 hours of fingerprinting.', blocker: true },
    ],
    officialResources: [{ label: 'Maryland Board of Nursing — Endorsement', url: 'https://health.maryland.gov/mbon/pages/licensure-by-endorsement.aspx' }, NURSYS],
    citations: [{ label: 'Maryland BON — Endorsement', note: 'Nursys verification; Live Scan fingerprints (#9300000850); $230 permanent / $70 temp; foreign-educated need TruMerit CES + English (TOEFL 26+ / IELTS 7 speaking, 6.5 overall / PTE).', url: 'https://health.maryland.gov/mbon/pages/licensure-by-endorsement.aspx' }],
  },
  wisconsin: {
    state: 'Wisconsin', code: 'WI', board: 'Wisconsin Dept. of Safety & Professional Services (DSPS)', compact: true,
    verification: 'Verification of initial + current license (Nursys → often a single verification); temporary permit available if a state does not use Nursys.',
    fingerprints: 'Background check per DSPS requirements.',
    highlights: ['Apply online via the LicensE platform (license.wi.gov).', 'Compact state — a multistate license requires Wisconsin as your primary state of residence.'],
    steps: [
      { key: 'apply', title: 'Submit the WI DSPS endorsement application', detail: 'Online via LicensE (license.wi.gov).', blocker: true },
      { key: 'verify', title: 'License verification (initial + current)', detail: 'Nursys where available; temporary permit otherwise.', blocker: true },
    ],
    officialResources: [{ label: 'Wisconsin DSPS — RN', url: 'https://dsps.wi.gov/Pages/Professions/RN/Default.aspx' }, NURSYS],
    citations: [{ label: 'Wisconsin DSPS — RN endorsement', note: 'Apply via LicensE; verification of initial + current license (Nursys); temporary permit if non-Nursys; compact member.', url: 'https://dsps.wi.gov/Pages/Professions/RN/Default.aspx' }],
  },
  'new york': {
    state: 'New York', code: 'NY', board: 'NYSED Office of the Professions', compact: false,
    verification: 'New York does not use Nursys — request license verification directly from the other state (NYSED Form 3).',
    fingerprints: 'Not a standard NYSED RN requirement; good-moral-character review applies.',
    continuingEd: 'Mandatory NYSED coursework: infection control and child-abuse identification.',
    highlights: ['Endorse via NYSED Form 1 + the verification form; NOT a compact state.', 'The infection-control and child-abuse coursework is required for endorsement too.'],
    steps: [
      { key: 'apply', title: 'Submit NYSED Form 1 + fee', detail: 'Apply for RN licensure by endorsement.', blocker: true },
      { key: 'verify', title: 'Out-of-state license verification', detail: 'Request verification directly from the other board (Form 3).', blocker: true },
      { key: 'coursework', title: 'Infection-control + child-abuse coursework', detail: 'Complete the required NYSED coursework.', blocker: true },
    ],
    officialResources: [{ label: 'NYSED — Endorsement of nursing licenses', url: 'https://www.op.nysed.gov/professions/registered-professional-nursing/license-requirements' }, { label: 'NYSED — Online Form 1', url: 'https://www.op.nysed.gov/professions/registered-professional-nursing/application-forms/online-form-1' }],
    citations: [{ label: 'NYSED — Endorsement of nursing licenses', note: 'NYSED Form 1 + direct verification (no Nursys); infection-control + child-abuse coursework required.', url: 'https://www.op.nysed.gov/professions/clinical-nurse-specialists/endorsement-nursing-licenses' }],
  },
  'north carolina': {
    state: 'North Carolina', code: 'NC', board: 'North Carolina Board of Nursing', compact: true,
    verification: 'Nursys verification of your license.', fingerprints: 'Fingerprint-based criminal background check.',
    highlights: ['Apply online via the NC Board of Nursing; compact state.'],
    steps: [
      { key: 'apply', title: 'Submit the NCBON endorsement application + fee', detail: 'Online via the NC Board of Nursing.', blocker: true },
      { key: 'verify', title: 'Nursys verification', detail: 'Verify your license to North Carolina.', blocker: true },
      { key: 'background', title: 'Criminal background check', detail: 'Complete the fingerprint-based check.', blocker: true },
    ],
    officialResources: [{ label: 'NC Board of Nursing — RN/LPN endorsement', url: 'https://www.ncbon.com/rn-lpn-endorsement' }, NURSYS],
    citations: [{ label: 'NC Board of Nursing — Endorsement', note: 'Online endorsement application; Nursys verification; fingerprint-based background check; compact member. (Confirm current specifics with the board.)', url: 'https://www.ncbon.com/rn-lpn-endorsement' }],
  },
  ohio: {
    state: 'Ohio', code: 'OH', board: 'Ohio Board of Nursing', compact: true,
    verification: 'Nursys verification of your license.', fingerprints: 'BCI & FBI criminal records check (WebCheck).',
    highlights: ['Apply online via eLicense Ohio; compact state (implemented 2023).'],
    steps: [
      { key: 'apply', title: 'Submit the eLicense Ohio endorsement application + fee', detail: 'Online via eLicense Ohio.', blocker: true },
      { key: 'verify', title: 'Nursys verification', detail: 'Verify your license to Ohio.', blocker: true },
      { key: 'background', title: 'BCI & FBI background check (WebCheck)', detail: 'Complete the fingerprint records check.', blocker: true },
    ],
    officialResources: [{ label: 'Ohio Board of Nursing — Endorsement/Reciprocity', url: 'https://nursing.ohio.gov/licensing-and-certification/licensing-forms-and-guidelines/02-rn-and-lpn-licensure-by-endorsement-reciprocity-application' }, NURSYS],
    citations: [{ label: 'Ohio Board of Nursing — Endorsement', note: 'eLicense Ohio application; Nursys verification; BCI & FBI WebCheck; compact member. (Confirm current specifics with the board.)', url: 'https://nursing.ohio.gov/licensing-and-certification/licensing-forms-and-guidelines/02-rn-and-lpn-licensure-by-endorsement-reciprocity-application' }],
  },
  kentucky: {
    state: 'Kentucky', code: 'KY', board: 'Kentucky Board of Nursing (KBN)', compact: true,
    verification: 'Nursys verification of your license.', fingerprints: 'Fingerprint-based criminal background check.',
    highlights: ['Apply via the KBN online portal; compact state. International applicants follow KBN’s outside-U.S. endorsement track.'],
    steps: [
      { key: 'apply', title: 'Submit the KBN endorsement application + fee', detail: 'Online via the KBN portal.', blocker: true },
      { key: 'verify', title: 'Nursys verification', detail: 'Verify your license to Kentucky.', blocker: true },
      { key: 'background', title: 'Criminal background check', detail: 'Complete the fingerprint-based check.', blocker: true },
    ],
    officialResources: [{ label: 'Kentucky Board of Nursing — Endorsement', url: 'https://kbn.ky.gov/Registered-Nurse/Pages/Endorsement-RN-Outside-United-States.aspx' }, NURSYS],
    citations: [{ label: 'Kentucky Board of Nursing — Endorsement', note: 'KBN online application; Nursys verification; criminal background check; compact member. (Confirm current specifics with the board.)', url: 'https://kbn.ky.gov/Registered-Nurse/Pages/Endorsement-RN-Outside-United-States.aspx' }],
  },
  indiana: {
    state: 'Indiana', code: 'IN', board: 'Indiana State Board of Nursing (PLA)', compact: true,
    verification: 'Nursys verification of your license.', fingerprints: 'Criminal background check.',
    highlights: ['Apply online via the Indiana Professional Licensing Agency (PLA); compact state.'],
    steps: [
      { key: 'apply', title: 'Submit the Indiana PLA endorsement application + fee', detail: 'Online via the PLA.', blocker: true },
      { key: 'verify', title: 'Nursys verification', detail: 'Verify your license to Indiana.', blocker: true },
      { key: 'background', title: 'Criminal background check', detail: 'Complete the required check.', blocker: true },
    ],
    officialResources: [{ label: 'Indiana PLA — Nursing licensing', url: 'https://www.in.gov/pla/professions/nursing-home/nursing-licensing-information/' }, NURSYS],
    citations: [{ label: 'Indiana PLA — Nursing', note: 'Indiana PLA application; Nursys verification; background check; compact member. (Confirm current specifics with the board.)', url: 'https://www.in.gov/pla/professions/nursing-home/nursing-licensing-information/' }],
  },
  'new jersey': {
    state: 'New Jersey', code: 'NJ', board: 'New Jersey Board of Nursing (Division of Consumer Affairs)', compact: true,
    verification: 'License verification (Nursys where available).', fingerprints: 'Criminal history background check (IdentoGO fingerprinting).',
    highlights: ['Apply via the NJ Division of Consumer Affairs; compact state.'],
    steps: [
      { key: 'apply', title: 'Submit the NJ Board of Nursing endorsement application + fee', detail: 'Via NJ Division of Consumer Affairs.', blocker: true },
      { key: 'verify', title: 'License verification', detail: 'Verify your license to New Jersey.', blocker: true },
      { key: 'background', title: 'Fingerprint background check', detail: 'Complete IdentoGO fingerprinting.', blocker: true },
    ],
    officialResources: [{ label: 'NJ Board of Nursing — Applications', url: 'https://www.njconsumeraffairs.gov/nur/pages/applications.aspx' }, NURSYS],
    citations: [{ label: 'NJ Board of Nursing — Applications', note: 'NJ Division of Consumer Affairs application; license verification; IdentoGO fingerprint background check; compact member. (Confirm current specifics with the board.)', url: 'https://www.njconsumeraffairs.gov/nur/pages/applications.aspx' }],
  },
  connecticut: {
    state: 'Connecticut', code: 'CT', board: 'Connecticut Department of Public Health', compact: false,
    verification: 'Verification of licensure sent directly from the other state (CT does not participate in the compact).', fingerprints: 'Per CT DPH requirements.',
    highlights: ['Apply via CT DPH; NOT a compact state — endorsement is required to practice in Connecticut.'],
    steps: [
      { key: 'apply', title: 'Submit the CT DPH endorsement application + fee', detail: 'Via the CT Department of Public Health.', blocker: true },
      { key: 'verify', title: 'License verification', detail: 'Have your license verified directly to CT DPH.', blocker: true },
    ],
    officialResources: [{ label: 'Connecticut DPH — RN licensure by endorsement', url: 'https://portal.ct.gov/dph/practitioner-licensing--investigations/registered-nurse/rn-licensure-by-endorsement' }],
    citations: [{ label: 'Connecticut DPH — RN endorsement', note: 'CT DPH application; direct license verification; non-compact. (Confirm current specifics with the department.)', url: 'https://portal.ct.gov/dph/practitioner-licensing--investigations/registered-nurse/rn-licensure-by-endorsement' }],
  },
  pennsylvania: {
    state: 'Pennsylvania', code: 'PA', board: 'Pennsylvania State Board of Nursing', compact: false,
    verification: 'License verification sent directly (Pennsylvania verifications are requested from the PA portal rather than Nursys).', fingerprints: 'Criminal background check; PA does not currently issue Nursys outgoing verifications.',
    highlights: ['Apply via PALS (Pennsylvania Licensing System); compact enacted but not yet implemented — treat as a single-state license.'],
    steps: [
      { key: 'apply', title: 'Submit the PALS endorsement application + fee', detail: 'Via the Pennsylvania Licensing System (PALS).', blocker: true },
      { key: 'verify', title: 'License verification', detail: 'Verify your out-of-state license to Pennsylvania.', blocker: true },
      { key: 'background', title: 'Criminal background check', detail: 'Complete the required check.', blocker: true },
    ],
    officialResources: [{ label: 'PA State Board of Nursing — Application information', url: 'https://www.pa.gov/agencies/dos/department-and-offices/bpoa/boards-commissions/nursing/application-information' }],
    citations: [{ label: 'PA State Board of Nursing — Applications', note: 'PALS application; license verification; criminal background check; compact enacted but not yet implemented. (Confirm current specifics with the board.)', url: 'https://www.pa.gov/agencies/dos/department-and-offices/bpoa/boards-commissions/nursing/application-information' }],
  },
}

/** Look up a state's endorsement rule by state name or 2-letter code. */
export function getEndorsementState(target?: string): EndorsementState | null {
  if (!target) return null
  const t = target.trim().toLowerCase()
  if (ENDORSEMENT_STATES[t]) return ENDORSEMENT_STATES[t]
  return Object.values(ENDORSEMENT_STATES).find((s) => s.code.toLowerCase() === t || s.state.toLowerCase() === t) ?? null
}

/** A complete endorsement entry derived from the base table for any jurisdiction
 *  we haven't individually grounded — standard Nursys + fingerprint pathway. */
function deriveEndorsement(target: string): EndorsementState {
  const base = getUsState(target)
  const stateName = base?.name ?? target.replace(/\b\w/g, (c) => c.toUpperCase())
  return {
    state: stateName,
    code: base?.code ?? '',
    board: base?.board ?? `${stateName} Board of Nursing`,
    compact: base?.compact === 'member',
    verification: 'License verification via Nursys where the issuing board participates; otherwise a direct verification request to that board.',
    fingerprints: 'Fingerprint-based criminal background check (completed in person after you arrive).',
    highlights: [
      base ? compactNote(base) ?? `Standard endorsement pathway — confirm ${stateName}'s specifics on the board's site.` : `Confirm ${stateName}'s endorsement requirements on the board's official site.`,
    ].filter(Boolean) as string[],
    steps: [],
    officialResources: base ? [boardResource(base)] : [{ label: 'NCSBN — Find your Board of Nursing', url: 'https://www.ncsbn.org/contact-bon.htm' }],
    citations: [],
  }
}

/** Always returns a complete endorsement entry — grounded override or derived,
 *  with the authoritative board as the primary official source and grounded fee. */
export function resolveEndorsement(target?: string): EndorsementState {
  const base = getEndorsementState(target) ?? deriveEndorsement(target ?? 'your state')
  const us = getUsState(target)
  const fee = getStateFees(target).endorsementUsd
  const officialResources = us
    ? [boardResource(us), ...base.officialResources.filter((r) => r.url !== us.boardUrl)]
    : base.officialResources
  return { ...base, officialResources, feeUsd: fee ?? base.feeUsd }
}

/** Every jurisdiction (all 50 + DC) — drives the state picker. */
export const ENDORSEMENT_STATE_LIST = usStateList()
