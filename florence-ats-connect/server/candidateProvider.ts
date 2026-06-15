// ============================================================================
// CandidateProvider — sync the employer-relevant projection from the REAL
// florence-pathway-agent dossier (its node:sqlite db) into ATS Connect.
//
// This is the seam that replaces seeded candidates with live IEN data. We read
// pathway-agent's CandidateProfile + licenses + employment + nclex + education
// and derive the employer-safe FlorenceCandidate projection. We honor the
// 'employer' consent scope: employerShareConsent is 'granted' ONLY if the nurse
// granted employer sharing in pathway-agent (mirrors its canShare gate).
//
// Read-only: we never write to the pathway-agent database.
// ============================================================================
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
// @ts-ignore - node:sqlite typings vary by @types/node version.
import { DatabaseSync } from 'node:sqlite'
import { store, uid, now } from './db'
import type { FlorenceCandidate, NclexStatus, LicenseStatus, ReadinessBand, VisaStatus } from '../shared/types'

const here = dirname(fileURLToPath(import.meta.url))
const PATHWAY_DB = process.env.PATHWAY_DB_PATH
  ?? join(here, '..', '..', 'florence-pathway-agent', 'data', 'pathway.db')

const US_STATE_ABBR: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
  connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID',
  illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA',
  washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
}
const toStateCode = (s?: string): string | undefined => {
  if (!s) return undefined
  const t = s.trim()
  if (/^[A-Z]{2}$/.test(t)) return t
  return US_STATE_ABBR[t.toLowerCase()]
}

// Normalize pathway specialty labels to the canonical labels reqs use.
const SPECIALTY_NORM: Record<string, string> = {
  'med-surg': 'Med Surg', 'med surg': 'Med Surg', 'medical surgical': 'Med Surg',
  ed: 'Emergency', er: 'Emergency', emergency: 'Emergency',
  icu: 'ICU', 'critical care': 'ICU', 'l&d': 'Labor and Delivery',
}
const normSpecialty = (s?: string): string | undefined => s ? (SPECIALTY_NORM[s.trim().toLowerCase()] ?? s.trim()) : undefined

const quarter = (iso?: string): string | undefined => {
  if (!iso || !/^\d{4}-\d{2}/.test(iso)) return undefined
  const [y, m] = iso.split('-').map(Number)
  return `Q${Math.floor((m - 1) / 3) + 1} ${y}`
}

interface PathwayRow { json: string }
const parseAll = <T>(rows: PathwayRow[]): T[] => rows.map((r) => JSON.parse(r.json))

// Map a pathway visa/work-authorization signal → the internal VisaStatus gate input.
// FAIL-CLOSED: anything unrecognized ⇒ 'unknown' (blocks submission). The authoritative
// 'approved' outcome is populated by the pathway visa-result capture (AG0b); until then
// most candidates correctly read 'unknown' and cannot be submitted.
function deriveVisaStatus(p: any, workflows: any[]): VisaStatus {
  // 1) Explicit visa outcome on a workflow (AG0b emits {type:'visa_*', outcome}).
  const visaWf = workflows.find((w) => /visa|consular|work_auth/i.test(w.type ?? w.kind ?? ''))
  const raw = String(visaWf?.outcome ?? visaWf?.result ?? p.visaStatus ?? p.workAuthorizationStatus ?? p.workAuthorization ?? '').toLowerCase()
  if (/approved|issued|cleared/.test(raw)) return 'approved'
  if (/refus|denied/.test(raw)) return 'refused'
  if (/administrative/.test(raw)) return 'administrative_processing'
  if (/expired/.test(raw)) return 'expired'
  if (/citizen|green.?card|permanent.?resident|gc|work_authorized|authorized|not.?required|domestic/.test(raw)) return 'not_required'
  if (/pending|in.?progress|ds.?160|appointment|scheduled|submitted/.test(raw)) return 'pending'
  return 'unknown'
}

/** Read every pathway candidate dossier and project to FlorenceCandidate. */
export function readPathwayProjections(): FlorenceCandidate[] {
  if (!existsSync(PATHWAY_DB)) throw new Error(`pathway-agent db not found at ${PATHWAY_DB} (set PATHWAY_DB_PATH). Has pathway-agent been seeded/run?`)
  const db = new DatabaseSync(PATHWAY_DB, { readOnly: true }) as any
  try {
    const profiles: any[] = parseAll(db.prepare('SELECT json FROM candidates').all())
    const sub = (table: string, cid: string): any[] => parseAll(db.prepare(`SELECT json FROM ${table} WHERE candidate_id = ?`).all(cid))

    return profiles.map((p): FlorenceCandidate => {
      const licenses = sub('licenses', p.id)
      const employment = sub('employment', p.id)
      const nclex = sub('nclex_registrations', p.id)
      const education = sub('education', p.id)
      let workflows: any[] = []
      try { workflows = sub('workflows', p.id) } catch { workflows = [] } // table may not exist yet

      const usLicense = licenses.find((l) => l.kind === 'us_state' && /active|issued/i.test(l.status ?? ''))
      const reg = nclex[0]

      // NCLEX status: an active US license implies a pass; otherwise infer from the registration.
      const nclexStatus: NclexStatus = usLicense ? 'passed'
        : reg?.attIssued ? 'att_issued'
        : reg?.pearsonRegistered ? 'registered'
        : reg ? 'diagnostic'
        : 'not_started'

      const licenseStatus: LicenseStatus = usLicense ? 'issued'
        : reg?.attIssued ? 'application_draft'
        : 'not_started'

      const specialties = [...new Set(employment.map((e) => normSpecialty(e.specialty)).filter(Boolean))] as string[]

      // Earliest employment start → rough years of experience.
      const starts = employment.map((e) => e.startDate).filter(Boolean).sort()
      const yearsExperience = starts.length ? Math.max(1, new Date().getFullYear() - Number(starts[0].slice(0, 4))) : undefined

      const targetStates = [...new Set([
        toStateCode(p.employmentState),
        toStateCode(p.nclexState),
        ...licenses.filter((l) => l.kind === 'us_state').map((l) => toStateCode(l.jurisdiction)),
      ].filter(Boolean))] as string[]

      const englishPassed = sub('english_exams', p.id).some((e) => e.passed)
      const readinessBand: ReadinessBand = usLicense ? 'green'
        : (nclexStatus === 'att_issued' && englishPassed) ? 'yellow'
        : nclexStatus === 'att_issued' ? 'yellow'
        : nclexStatus === 'registered' ? 'orange'
        : 'red'

      const employerConsent = p.consents?.employer?.granted === true

      return {
        id: uid(),
        sourceCandidateId: p.id,
        fullName: [p.legalFirstName, p.legalMiddleName, p.legalLastName].filter(Boolean).join(' '),
        email: p.email,
        nationality: p.nationality,
        countryOfEducation: education[0]?.country,
        currentCountry: p.countryOfResidence,
        arrivalStatus: p.arrivalStatus,
        specialtyExperience: specialties,
        yearsExperience,
        readinessBand,
        nclexStatus,
        licenseStatus,
        visaStatus: deriveVisaStatus(p, workflows),
        targetStates,
        expectedStartWindow: quarter(p.targetStartDate),
        employerShareConsent: employerConsent ? 'granted' : 'not_requested',
        humanQaStatus: 'not_started',
        createdAt: now(),
        updatedAt: now(),
      }
    })
  } finally {
    db.close()
  }
}

/** Upsert pathway projections into ATS Connect (matched on sourceCandidateId). */
export async function syncFromPathway(): Promise<{ synced: number; inserted: number; updated: number; source: string }> {
  const projections = readPathwayProjections()
  const existing = new Map((await store.candidates.all()).filter((c) => c.sourceCandidateId).map((c) => [c.sourceCandidateId!, c]))
  let inserted = 0, updated = 0
  for (const proj of projections) {
    const prior = existing.get(proj.sourceCandidateId!)
    if (prior) {
      // Preserve the ATS Connect id and any consent already captured here.
      const merged: FlorenceCandidate = { ...proj, id: prior.id, createdAt: prior.createdAt, employerShareConsent: prior.employerShareConsent === 'granted' ? 'granted' : proj.employerShareConsent }
      await store.candidates.update(merged)
      updated++
    } else {
      await store.candidates.insert(proj)
      inserted++
    }
  }
  return { synced: projections.length, inserted, updated, source: PATHWAY_DB }
}
