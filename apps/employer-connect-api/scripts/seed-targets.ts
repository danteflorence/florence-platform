// ============================================================================
// Seed the target health-system pipeline: each prospect lands as an employer
// account with its (researched) ATS provider and integrationStatus
// 'not_started' — the connector slot is pre-assigned and flips
// not_started → credentials_pending → sandbox → active as the system grants
// permission. Idempotent: existing employers (matched by name) are skipped.
//
//   npm run seed:targets
//
// ATS evidence is from each system's public careers site (June 2026):
//   verified = career-site host names the platform; verify = confirm at
//   permission time (front-end portal hides the ATS, or platform migration
//   in progress — always confirm the live tenant before building).
// ============================================================================
import { store, uid, now } from '../server/db'
import type { ATSProvider, EmployerAccount } from '../shared/types'
import type { DemandSource, DemandSourceType, PayTransparencyJurisdiction } from '../shared/demand-types'

interface Target {
  name: string
  atsProvider: ATSProvider
  atsTenantId?: string // evidence host / tenant hint
  confidence: 'verified' | 'probable' | 'verify'
  note: string
  careerSiteUrl?: string
  jurisdiction?: PayTransparencyJurisdiction
  channelOwner?: string // 'AMN account' vs a direct-target owner
}

const TARGETS: Target[] = [
  { name: 'Tenet Healthcare', atsProvider: 'oracle_taleo', atsTenantId: 'tenet.taleo.net', confidence: 'verified', note: 'Taleo live; Oracle Recruiting Cloud (eodr.fa.us2.oraclecloud.com) also live — confirm which tenant at permission time' },
  { name: 'CommonSpirit Health', atsProvider: 'icims', atsTenantId: 'careers-commonspirit.icims.com', confidence: 'verified', note: 'iCIMS career portal' },
  { name: 'Kaiser Permanente', atsProvider: 'oracle_taleo', atsTenantId: 'kp.taleo.net', confidence: 'verified', note: 'Taleo career section' },
  { name: 'Sutter Health', atsProvider: 'workday', atsTenantId: 'sutterhealth.wd1.myworkdayjobs.com', confidence: 'verified', note: 'Workday primary; iCIMS used for admin/APC subsets' },
  { name: 'Providence', atsProvider: 'manual', confidence: 'verify', note: 'ATS unconfirmed — confirm at permission time' },
  { name: 'Cedars-Sinai', atsProvider: 'manual', confidence: 'verify', note: 'careers.cshs.org front end; underlying ATS unconfirmed' },
  { name: 'Scripps Health', atsProvider: 'manual', confidence: 'verify', note: 'careers.scripps.org front end; ATS unconfirmed' },
  { name: 'Sharp HealthCare', atsProvider: 'workday', confidence: 'probable', note: 'Careers site: offer letters delivered in Workday — confirm Recruiting module tenant' },
  { name: 'Ascension', atsProvider: 'manual', confidence: 'verify', note: 'jobs.ascension.org (Phenom front end); ATS unconfirmed' },
  { name: 'Trinity Health (Novi, MI)', atsProvider: 'workday', atsTenantId: 'trinityhealth.wd1.myworkdayjobs.com', confidence: 'verified', note: 'Workday career site' },
  { name: 'Advocate Health', atsProvider: 'workday', atsTenantId: 'aah.wd5.myworkdayjobs.com', confidence: 'verified', note: 'Workday career site (Advocate Aurora tenant)' },
  { name: 'Adventist Health', atsProvider: 'manual', confidence: 'verify', note: 'ATS unconfirmed — confirm at permission time' },
  { name: 'CHRISTUS Health', atsProvider: 'manual', confidence: 'verify', note: 'careers.christushealth.org front end; likely Infor (no native connector — use Merge/manual until confirmed)' },
  { name: 'Baylor Scott & White Health', atsProvider: 'manual', confidence: 'verify', note: 'jobs.bswhealth.com (Phenom front end); ATS unconfirmed' },
  { name: 'Grady Health System', atsProvider: 'manual', confidence: 'verify', note: 'ATS unconfirmed — confirm at permission time' },
  { name: 'BJC HealthCare', atsProvider: 'icims', atsTenantId: 'careers-bjc.icims.com', confidence: 'verified', note: 'iCIMS career portal' },
  // --- Newly added systems (ATS UNCONFIRMED — do NOT assign a connector-capable
  //     provider without confirmation; 'manual' until a live tenant is verified) ---
  { name: 'HCA Healthcare', atsProvider: 'manual', confidence: 'verify', note: 'ATS unconfirmed — careers.hcahealthcare.com front end; Oracle Taleo suspected but NOT verified. Confirm live tenant at permission time.', careerSiteUrl: 'https://careers.hcahealthcare.com', channelOwner: 'direct-target' },
  { name: 'Methodist Le Bonheur Healthcare', atsProvider: 'manual', confidence: 'verify', note: 'ATS unconfirmed — confirm live tenant at permission time.', careerSiteUrl: 'https://www.methodisthealth.org/careers', channelOwner: 'direct-target' },
  { name: 'Prime Healthcare', atsProvider: 'manual', confidence: 'verify', note: 'ATS unconfirmed — careers at prime; many CA facilities (pay-transparency state). Confirm live tenant at permission time.', careerSiteUrl: 'https://www.primehealthcare.com/careers', jurisdiction: 'CA', channelOwner: 'direct-target' },
  { name: 'Universal Health Services (UHS)', atsProvider: 'manual', confidence: 'verify', note: 'ATS unconfirmed — jobs.uhsinc.com front end. Confirm live tenant at permission time.', careerSiteUrl: 'https://jobs.uhsinc.com', channelOwner: 'direct-target' },
]

const existing = await store.employers.all()
const byName = new Map(existing.map((e) => [e.name.toLowerCase(), e]))
let added = 0
const rows: { name: string; provider: string; status: string; confidence: string }[] = []

for (const t of TARGETS) {
  const hit = byName.get(t.name.toLowerCase())
  if (hit) {
    rows.push({ name: t.name, provider: hit.atsProvider, status: `${hit.integrationStatus} (already present)`, confidence: t.confidence })
    continue
  }
  const e: EmployerAccount = {
    id: uid(), name: t.name, atsProvider: t.atsProvider,
    ...(t.atsTenantId ? { atsTenantId: t.atsTenantId } : {}),
    integrationStatus: 'not_started', defaultBillingModel: 'direct', sourceChannel: 'direct',
    createdAt: now(), updatedAt: now(),
  }
  await store.employers.insert(e)
  added += 1
  rows.push({ name: t.name, provider: t.atsProvider, status: 'not_started (seeded)', confidence: t.confidence })
}

console.log(`[ats-connect] target pipeline seeded — ${added} added, ${TARGETS.length - added} already present\n`)
const w = Math.max(...rows.map((r) => r.name.length)) + 2
for (const r of rows) console.log(`  ${r.name.padEnd(w)} ${r.provider.padEnd(14)} ${r.confidence.padEnd(9)} ${r.status}`)

// ── Target Employer Registry: a DemandSource row per target, with the crawl gate
//    CLOSED (crawlAllowed:false, robots/tos 'unknown'). Counsel + per-domain review
//    flips crawlAllowed at permission time; nothing is fetched until then. icims
//    targets map to the icims_portal connector; everything else to career_page.
const sourceTypeFor = (p: ATSProvider): DemandSourceType => (p === 'icims' ? 'icims_portal' : 'career_page')
const existingSources = await store.demandSources.all()
const sourceByName = new Map(existingSources.map((s) => [s.name.toLowerCase(), s]))
let srcAdded = 0
for (let i = 0; i < TARGETS.length; i += 1) {
  const t = TARGETS[i]
  const srcName = `${t.name} (careers)`
  if (sourceByName.has(srcName.toLowerCase())) continue
  const src: DemandSource = {
    id: uid(), sourceType: sourceTypeFor(t.atsProvider), name: srcName,
    careerSiteUrl: t.careerSiteUrl, atsProvider: t.atsProvider,
    publicApiAvailable: false,
    payTransparencyJurisdiction: t.jurisdiction ?? 'none',
    crawlCadence: 'manual',
    priority: TARGETS.length - i, // descending: earlier targets weighted higher
    channelOwner: t.channelOwner ?? 'direct-target',
    robotsStatus: 'unknown', tosStatus: 'unknown', crawlAllowed: false,
    notes: `Crawl gate CLOSED — ${t.note}`,
    createdAt: now(),
  }
  await store.demandSources.insert(src)
  srcAdded += 1
}
console.log(`\n[ats-connect] demand-source registry seeded — ${srcAdded} added (crawl gate CLOSED on all; robots/ToS review required to enable).`)

console.log(`\nNext per system: get written permission → customer provisions credentials (Workday ISU / iCIMS customer-specific / Taleo or Oracle service account) → store via the connect flow (vault) → integrationStatus credentials_pending → sandbox test → active. Career-page crawl: counsel + per-domain robots/ToS review → flip crawlAllowed.`)
process.exit(0)
