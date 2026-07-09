// Country (corridor) playbooks. Source-country-specific knowledge that compounds:
// every time Florence learns a corridor, it gets faster for the next candidate.
// Common document gaps, consular timing, education-verification norms, English
// expectations, and honest source-country risk flags — grounded, not stereotyped.
import type { OfficialResource } from './types'

export interface CountryPlaybook {
  country: string
  nationality: string
  consularPosts: string[]
  visaTimingNote: string
  /** Documents that are most often missing or slow for this corridor. */
  documentGaps: string[]
  educationVerification: string
  englishNote: string
  /** Honest, professional flags — operational, not stereotyping. */
  riskFlags: string[]
  officialResources: OfficialResource[]
}

export const COUNTRY_PLAYBOOKS: Record<string, CountryPlaybook> = {
  philippines: {
    country: 'Philippines', nationality: 'Filipino',
    consularPosts: ['U.S. Embassy Manila'],
    visaTimingNote: 'Manila is a high-volume F-1 post; book the interview early and prepare strong study-intent and ties evidence (INA 214(b)).',
    documentGaps: ['PRC license verification', 'NBI clearance (police certificate)', 'Authenticated transcript of records & nursing program documents'],
    educationVerification: 'CGFNS verifies the nursing program directly with the school; PRC license verified with the Professional Regulation Commission.',
    englishNote: 'Nursing education is English-medium; IELTS/OET is often still required by the board even where strong — confirm the target board.',
    riskFlags: ['214(b) intent scrutiny — study-abroad rationale must be coherent', 'PRC verification can lag — start it early'],
    officialResources: [
      { label: 'U.S. Embassy in the Philippines — Visas', url: 'https://ph.usembassy.gov/visas/' },
      { label: 'Professional Regulation Commission (PRC)', url: 'https://www.prc.gov.ph/' },
    ],
  },
  india: {
    country: 'India', nationality: 'Indian',
    consularPosts: ['U.S. Consulate Mumbai', 'U.S. Embassy New Delhi', 'U.S. Consulate Chennai', 'U.S. Consulate Hyderabad', 'U.S. Consulate Kolkata'],
    visaTimingNote: 'High F-1 volume; appointment waits vary by post — check multiple consulates. Demonstrate funding and study intent clearly.',
    documentGaps: ['Indian Nursing Council / State Nursing Council verification', 'University transcript attestation', 'Name-order / single-name normalization across documents'],
    educationVerification: 'INC / State Nursing Council license verification; university verifies transcripts. Name order (given vs surname) is a frequent QA flag.',
    englishNote: 'IELTS Academic or OET typically required by the board even for English-medium graduates.',
    riskFlags: ['Name-order and single-name passports cause exact-match failures — normalize early', 'Council verification timelines vary by state'],
    officialResources: [
      { label: 'U.S. Embassy & Consulates in India — Visas', url: 'https://in.usembassy.gov/visas/' },
      { label: 'Indian Nursing Council', url: 'https://www.indiannursingcouncil.org/' },
    ],
  },
  kenya: {
    country: 'Kenya', nationality: 'Kenyan',
    consularPosts: ['U.S. Embassy Nairobi'],
    visaTimingNote: 'Single post (Nairobi); prepare clear study-intent and funding evidence for the F-1 interview (214(b)).',
    documentGaps: ['Nursing Council of Kenya (NCK) license verification', 'KCSE certificate', 'Authenticated transcripts'],
    educationVerification: 'Nursing Council of Kenya verifies licensure; CGFNS verifies the education program with the institution.',
    englishNote: 'English is an official language and the medium of instruction; the board may still require IELTS/OET — confirm.',
    riskFlags: ['214(b) ties scrutiny', 'NCK verification can be slow — initiate early'],
    officialResources: [
      { label: 'U.S. Embassy in Kenya — Visas', url: 'https://ke.usembassy.gov/visas/' },
      { label: 'Nursing Council of Kenya', url: 'https://nckenya.com/' },
    ],
  },
  nepal: {
    country: 'Nepal', nationality: 'Nepali',
    consularPosts: ['U.S. Embassy Kathmandu'],
    visaTimingNote: 'Single post (Kathmandu); F-1 interviews emphasize funding and genuine study intent.',
    documentGaps: ['Nepal Nursing Council verification', 'Transcript & character certificate', 'English exam scores'],
    educationVerification: 'Nepal Nursing Council license verification; CGFNS program verification with the institution.',
    englishNote: 'IELTS/OET generally required; confirm minimums with the target board.',
    riskFlags: ['214(b) intent and funding scrutiny', 'Document verification timelines can be long'],
    officialResources: [
      { label: 'U.S. Embassy in Nepal — Visas', url: 'https://np.usembassy.gov/visas/' },
      { label: 'Nepal Nursing Council', url: 'https://nnc.org.np/' },
    ],
  },
  nigeria: {
    country: 'Nigeria', nationality: 'Nigerian',
    consularPosts: ['U.S. Consulate Lagos', 'U.S. Embassy Abuja'],
    visaTimingNote: 'Two posts (Lagos, Abuja); prepare thorough documentation and clear study-intent for the F-1 interview.',
    documentGaps: ['Nursing and Midwifery Council of Nigeria (NMCN) verification', 'Document authentication / notarization', 'Name-variation reconciliation across documents'],
    educationVerification: 'NMCN license verification (known to take time — start early); CGFNS verifies the program with the school.',
    englishNote: 'English is the official language and medium of instruction; some boards still require IELTS/OET — confirm.',
    riskFlags: ['Allow extra time for NMCN verification', 'Rigorous document-authentication diligence expected — ensure every record is verifiable'],
    officialResources: [
      { label: 'U.S. Mission Nigeria — Visas', url: 'https://ng.usembassy.gov/visas/' },
      { label: 'Nursing and Midwifery Council of Nigeria', url: 'https://www.nmcn.gov.ng/' },
    ],
  },
  ghana: {
    country: 'Ghana', nationality: 'Ghanaian',
    consularPosts: ['U.S. Embassy Accra'],
    visaTimingNote: 'Single post (Accra); F-1 interview emphasizes funding and study intent.',
    documentGaps: ['Nursing and Midwifery Council of Ghana verification', 'Authenticated transcripts', 'English exam scores where required'],
    educationVerification: 'Nursing and Midwifery Council (Ghana) license verification; CGFNS program verification with the institution.',
    englishNote: 'English is the official language and medium of instruction; confirm board IELTS/OET requirements.',
    riskFlags: ['214(b) ties scrutiny', 'Council verification timelines — initiate early'],
    officialResources: [
      { label: 'U.S. Embassy in Ghana — Visas', url: 'https://gh.usembassy.gov/visas/' },
      { label: 'Nursing & Midwifery Council of Ghana', url: 'https://nmc.gov.gh/' },
    ],
  },
}

export function getCountryPlaybook(country?: string): CountryPlaybook | null {
  if (!country) return null
  return COUNTRY_PLAYBOOKS[country.toLowerCase()] ?? null
}
