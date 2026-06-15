import type {
  EmployerAccount, Facility, JobRequisition, FlorenceCandidate, MatchResult,
  ApplicationPacket, ATSApplication, EmployerShareConsent, ProductionLedgerEvent,
  Program, ProgramWave, ProgramSlate,
} from '@shared/types'
import type { FlorenceRNJob as DemandJob } from '@shared/demand-types'

// ── Program Workspace view shapes (server-derived) ──
export interface ProgramOverview { program: Program; waves: ProgramWave[]; slates: ProgramSlate[]; lockedCandidates: number }
export interface SlateCandidate { candidateId: string; fullName: string; matchScore: number; requisitionId: string }
export interface LicensedSlateData { programId: string; employerId: string; eligible: SlateCandidate[]; consentPending: SlateCandidate[]; lockedCount: number }
export interface WaveTrackerRow { waveId: string; waveNumber: number; targetCount: number; locked: number; packetShared: number; interview: number; offer: number; started: number; retained90: number }
export interface ProgramScorecard { packetsShared: number; interviews: number; offers: number; starts: number; retained30: number; retained90: number }
export interface InvoiceMonth { month: string; verifiedStarts: number; perRnMonthlyFeeUsd: number; grossUsd: number; ficaOffsetPerRnUsd: number; customerEffectiveCostUsd: number }
export interface InvoiceRollup { programId: string; employerId: string; perRnMonthlyFeeUsd: number; ficaOffsetPerRnUsd: number; feeSource: string; months: InvoiceMonth[]; cumulative: { verifiedStarts: number; grossUsd: number; customerEffectiveCostUsd: number } }
export interface ExpansionGateRow { waveNumber: number; targetCount: number; started: number; fillPct: number; readyToAdvance: boolean }

export interface DemandFunnel {
  stages: { stage: string; events: number; candidates: number; jobs: number }[]
  bySource: Record<string, number>
  total: number
}
export interface DemandDash {
  jobs: { total: number; open: number; stale: number; priced: number; byState: Record<string, number>; bySpecialty: Record<string, number>; topEmployers: { employer: string; count: number }[] }
  pay?: { listed: number; estimated: number; noPay: number; transparencyGap: number; withBenefits: number }
  opportunityStates?: { public: number; amn_channel: number; direct_partner: number; ats_connected: number }
  links: { total: number; clicks: number }
  interests: { total: number; byStatus: Record<string, number> }
  funnel: DemandFunnel
}
export interface DemandBriefData {
  employer: string; route: string; generatedAt: string
  jobs: { total: number; bySpecialty: Record<string, number>; states: string[] }
  supply: { licensed: number; nearLicensed: number; total: number; sample: { specialty?: string; state?: string; readiness: string; status: string }[] }
  economics: { avgGrossFeePerRnMonth: number; avgEffectiveCostPerRnMonth: number; avgNetValuePerRnMonth: number; avgPayrollTaxOffsetPerRnMonth: number; n: number }
  compensation?: { listedCount: number; estimatedCount: number; samples: string[]; benefits: { tag: string; count: number }[] }
  pilot: { topSpecialties: string[]; recommendedFirstWaveStarts: number }
}
export interface ApplicationQueueRow {
  candidateId: string; candidate: string; jobId: string; job: string; employer: string
  interestAt: string; channel: string; visaStatus: string; licenseStatus: string; consent: string
  applicationGateStatus: string; missing: string[]; readyToSubmit: boolean; expectedRelease: string
}
export interface RankedAccountData {
  employer: string; openJobs: number; openings: number; states: string[]; specialties: string[]
  matchedLicensed: number; matchedNearLicensed: number; avgGrossFeePerRnMonth: number; avgNetValuePerRnMonth: number
  score: number; recommendedPilotStarts: number
  opportunityValue: { facilityDensity: number; distinctFacilities: number; channelAvailability: number; specialtyDepth: number; repeatability: number; score: number }
}
// ── Long-Tail Demand Radar ───────────────────────────────────────────────────
export interface ClaimPrefillData { market: string; marketDisplay?: string; roleCategory: string; prefillTitle?: string }
export interface CategoryTileData { market: string; marketDisplay: string; roleCategory: string; signalCount: number; interestCount: number; claimed: boolean; claimedJobId?: string; cta: 'im_interested' | 'view_role' }
export interface HiringSignalData { id: string; sourceType: string; employerName?: string; market: string; marketDisplay?: string; roleCategory: string; setting?: string; sourceUrl?: string; observedAt: string; reviewer?: string; confidence: string; displayAllowed: boolean; employerClaimed: boolean; createdAt: string }
export interface LongTailLeadData { key: string; employerName?: string; market: string; marketDisplay: string; roleCategory: string; tier: 'A' | 'B' | 'C' | 'D'; signalCount: number; interestCount: number; licensedSupply: number; nearLicensedSupply: number; claimed: boolean; confidence: string; rationale: string[] }
export interface OutreachStepData { step: number; label: string; subject: string; body: string; mailto: string }
export interface OutreachDraftData { status: 'draft'; employerName: string; market: string; marketDisplay?: string; roleCategory: string; aggregateInterestCount: number; claimUrl?: string; email: { subjects: string[]; subject: string; body: string; mailto: string }; sequence: OutreachStepData[] }
export interface PublicJobCardData {
  id: string; title: string; normalizedRole?: string; employerName: string
  city?: string; state?: string; requiredLicenseState?: string; specialty?: string; setting?: string; shift?: string
  pay: { kind: 'listed' | 'estimated' | 'none'; label: string; source: string; amount: string; text: string; confidence?: string }
  benefits: string[]; readinessNote: string
  opportunityState: 'public' | 'amn_channel' | 'direct_partner' | 'ats_connected'
  opportunityStateLabel: string
  cta: 'express_interest' | 'apply_with_packet'
  postedSourceUrl?: string; firstSeenAt: string
}
export interface EligibilityCoachingData {
  state: 'licensed_now' | 'near_licensed' | 'pathway_first' | 'not_eligible'
  startFeasibility: 'now' | 'd30_60' | 'd60_120' | 'longer'
  whatYouNeed: string[]; etaNote: string; fitScore: number
}
export interface BasketEntryData { jobId: string; title: string; employerName: string; state?: string; bucket: string; fitScore: number }
export interface CompareRowData {
  jobId: string; title: string; employerName: string; state?: string; specialty?: string
  pay: { kind: string; label: string; source: string; amount: string; text: string }
  benefits: string[]; opportunityState: string; fitScore: number; eligibilityState: string; startFeasibility: string
}

// FlorenceRN Core SSO. /ops, /candidates, /ledger are gated server-side on a Core
// role; the shared fl_session cookie rides these same-origin /api calls.
const CORE_URL = (import.meta as any).env?.VITE_CORE_URL ?? 'http://id.lvh.me:8080'
export interface Session { authenticated: boolean; role: 'ops' | 'employer' | null; employerId: string | null; staff: boolean }
let session: Session = { authenticated: false, role: null, employerId: null, staff: false }
function headers(): Record<string, string> { return { 'content-type': 'application/json' } }
export function isStaff(): boolean { return session.staff }
export function getSession(): Session { return session }
const listeners = new Set<() => void>()
export function onStaffChange(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn) } }
function notify(): void { listeners.forEach((f) => f()) }
export async function refreshSession(): Promise<Session> {
  try {
    const s = await fetch('/api/session', { credentials: 'include' }).then((r) => r.json())
    session = { authenticated: !!s?.authenticated, role: s?.role ?? null, employerId: s?.employerId ?? null, staff: !!s?.staff }
  } catch { session = { authenticated: false, role: null, employerId: null, staff: false } }
  notify(); return session
}
export function staffLogin(): void { window.location.href = `${CORE_URL}/login?redirect=${encodeURIComponent(location.href)}` }
export function staffLogout(): void { session = { authenticated: false, role: null, employerId: null, staff: false }; notify(); window.location.href = `${CORE_URL}/logout?redirect=${encodeURIComponent(location.origin)}` }

async function j<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error((body as any).error ? (typeof (body as any).error === 'string' ? (body as any).error : JSON.stringify((body as any).error)) : r.statusText)
  }
  return r.json() as Promise<T>
}
const get = <T>(url: string) => fetch(url, { credentials: 'include', headers: headers() }).then(j<T>)
const post = <T>(url: string, body?: unknown) => fetch(url, { method: 'POST', credentials: 'include', headers: headers(), body: JSON.stringify(body ?? {}) }).then(j<T>)
const patch = <T>(url: string, body?: unknown) => fetch(url, { method: 'PATCH', credentials: 'include', headers: headers(), body: JSON.stringify(body ?? {}) }).then(j<T>)

export interface IntegrationHealth { employers: { id: string; name: string; atsProvider: string; integrationStatus: string; lastSyncAt: string | null; syncCount: number; failed: number }[]; recentSync: any[]; failed: any[] }
export interface EmployerDemand { openRequisitions: number; totalOpenings: number; byState: Record<string, { reqs: number; openings: number }>; bySpecialty: Record<string, { reqs: number; openings: number }>; bySetting: Record<string, { reqs: number; openings: number }>; submittedApplications: number }
export interface SubmissionsDash { packetsByStatus: Record<string, number>; applicationsByStatus: Record<string, number>; rates: { interview: number; offer: number; started: number } }
export interface LedgerDash { funnel: { stage: string; candidates: number }[]; forecast: { assumedMonthlyFeeUsd: number | null; note: string; expectedStartsByMonth: { month: string; scheduled: number; started: number; cohortAnnualizedUsd: number | null }[] } }

export const api = {
  meta: () => get<{ matchWeights: Record<string, number>; baseUrl: string }>('/api/meta'),
  health: () => get<{ ok: boolean; counts: Record<string, number> }>('/api/health'),

  employers: () => get<EmployerAccount[]>('/api/ops/employers'),
  employer: (id: string) => get<{ employer: EmployerAccount; facilities: Facility[]; requisitions: JobRequisition[] }>(`/api/ops/employers/${id}`),
  importReqs: (employerId: string, body: unknown) => post<{ imported: number; requisitions: JobRequisition[] }>(`/api/ops/employers/${employerId}/requisitions/import`, body),
  connectConnector: (employerId: string, provider: string) => post<{ employer: EmployerAccount; test: { ok: boolean; mode: string; detail: string } }>(`/api/ops/employers/${employerId}/connectors/${provider}/connect`),
  pullConnector: (employerId: string, provider: string) => post<{ pulled: number; imported: number }>(`/api/ops/employers/${employerId}/connectors/${provider}/pull`),

  requisitions: () => get<JobRequisition[]>('/api/ops/requisitions'),
  requisition: (id: string) => get<JobRequisition>(`/api/ops/requisitions/${id}`),
  matches: (reqId: string) => get<{ requisitionId: string; matches: MatchResult[] }>(`/api/ops/requisitions/${reqId}/matches`),

  candidates: () => get<FlorenceCandidate[]>('/api/candidates'),
  syncCandidates: () => post<{ synced: number; inserted: number; updated: number; source: string }>('/api/ops/candidates/sync'),
  candidate: (id: string) => get<{ candidate: FlorenceCandidate; consents: EmployerShareConsent[]; packets: ApplicationPacket[]; ledger: ProductionLedgerEvent[] }>(`/api/candidates/${id}`),
  candidateMatches: (id: string) => get<{ candidateId: string; matches: { requisition: JobRequisition; match: MatchResult }[] }>(`/api/candidates/${id}/matched-requisitions`),

  grantConsent: (candidateId: string, body: { employerId: string; jobRequisitionId?: string }) => post<EmployerShareConsent>(`/api/candidates/${candidateId}/consents/employer-share`, body),

  createPacket: (body: { candidateId: string; jobRequisitionId: string }) => post<ApplicationPacket>('/api/ops/application-packets', body),
  packet: (id: string) => get<ApplicationPacket>(`/api/ops/application-packets/${id}`),
  qaApprove: (id: string, body: { reviewer: string; decision: 'approve' | 'block'; notes?: string }) => post<ApplicationPacket>(`/api/ops/application-packets/${id}/qa-approve`, body),
  submitPacket: (id: string) => post<{ application: ATSApplication; detail: string }>(`/api/ops/application-packets/${id}/submit`),

  atsApplications: () => get<ATSApplication[]>('/api/ops/ats-applications'),
  syncHris: () => post<{ provider: string; mode: string; events: number; applied: number }>('/api/ops/hris/sync'),
  updateStatus: (id: string, body: { status: string; verifiedVia?: string; statusReason?: string }) => patch<ATSApplication>(`/api/ops/ats-applications/${id}/status`, body),

  dashIntegration: () => get<IntegrationHealth>('/api/ops/dashboards/integration-health'),
  dashDemand: () => get<EmployerDemand>('/api/ops/dashboards/employer-demand'),
  dashSubmissions: () => get<SubmissionsDash>('/api/ops/dashboards/submissions'),
  dashLedger: () => get<LedgerDash>('/api/ops/dashboards/production-ledger'),

  packets: () => get<ApplicationPacket[]>('/api/ops/application-packets'),

  // ── Demand Radar ──────────────────────────────────────────────────────────
  demandDashboard: () => get<DemandDash>('/api/ops/demand/dashboard'),
  demandFunnel: () => get<DemandFunnel>('/api/ops/demand/attribution/funnel'),
  demandJobs: () => get<DemandJob[]>('/api/ops/demand/jobs'),
  demandImport: (body: { csv?: string; jobs?: unknown[]; sourceType?: string }) => post<{ demandSourceId: string; received: number; rawNew: number; jobsCreated: number; jobsUpdated: number; skippedNonRn: number }>('/api/ops/demand/jobs/import', body),
  demandPriceAll: (force = false) => post<{ priced: number; skipped: number }>(`/api/ops/demand/economics/run-all${force ? '?force=1' : ''}`, {}),
  demandBrief: (employerName: string, route: 'direct' | 'amn' = 'direct') => post<DemandBriefData>('/api/ops/demand/briefs', { employerName, route }),

  // ── AMN Account Radar ───────────────────────────────────────────────────────
  amnAccounts: () => get<RankedAccountData[]>('/api/ops/amn/accounts'),

  // ── Interest-to-Application Queue ─────────────────────────────────────────────
  applicationQueue: () => get<ApplicationQueueRow[]>('/api/ops/application-queue'),

  // ── Long-Tail Demand Radar ──────────────────────────────────────────────────
  longTailSignals: () => get<HiringSignalData[]>('/api/ops/longtail/signals'),
  longTailSignalCreate: (body: Record<string, unknown>) => post<HiringSignalData>('/api/ops/longtail/signals', body),
  longTailTiles: () => get<CategoryTileData[]>('/api/ops/longtail/tiles'),
  longTailLeads: () => get<LongTailLeadData[]>('/api/ops/longtail/leads'),
  longTailClaimToken: (body: Record<string, unknown>) => post<{ token: string; claimUrl: string }>('/api/ops/longtail/claim-tokens', body),
  longTailOutreach: (body: { employerName: string; market?: string; state?: string; city?: string; roleCategory: string }) => post<OutreachDraftData>('/api/ops/longtail/outreach', body),
  // PUBLIC (no auth)
  publicClaimView: (token: string) => fetch(`/api/public/claim/${encodeURIComponent(token)}`).then(j<ClaimPrefillData>),
  publicClaim: (token: string, body: Record<string, unknown>) => fetch(`/api/public/claim/${encodeURIComponent(token)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(j<{ ok: boolean; jobId: string; claimedJobId: string }>),
  publicTiles: (state?: string) => fetch(`/api/public/longtail/tiles${state ? `?state=${encodeURIComponent(state)}` : ''}`).then(j<CategoryTileData[]>),
  publicMarketInterest: (body: Record<string, unknown>) => fetch('/api/public/longtail/interest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(j<{ ok: boolean; ref: string }>),

  // ── PUBLIC candidate-facing job card (no auth; reached via a FlorenceRN link) ──
  publicJob: (code: string) => fetch(`/api/public/jobs/${encodeURIComponent(code)}`).then(j<PublicJobCardData>),
  publicInterest: (id: string, body: { fullName: string; email?: string; phone?: string; targetState?: string; trackingClickId?: string; consentGranted: boolean }) =>
    fetch(`/api/public/jobs/${encodeURIComponent(id)}/interest`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(j<{ ok: boolean; status: string; ref: string }>),
  publicFit: (code: string, candidateRef: string) => fetch(`/api/public/jobs/${encodeURIComponent(code)}/fit?candidateRef=${encodeURIComponent(candidateRef)}`).then(j<{ coaching: EligibilityCoachingData }>),
  publicSetBucket: (id: string, candidateRef: string, bucket: string) => fetch(`/api/public/jobs/${encodeURIComponent(id)}/bucket`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ candidateRef, bucket }) }).then(j<{ ok: boolean; bucket: string }>),
  publicBasket: (ref: string) => fetch(`/api/public/candidates/${encodeURIComponent(ref)}/basket`).then(j<Record<string, BasketEntryData[]>>),
  publicCompare: (candidateRef: string, jobIds: string[]) => fetch('/api/public/opportunities/compare', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ candidateRef, jobIds }) }).then(j<CompareRowData[]>),

  // ── AMN/Kaiser Program Workspace ────────────────────────────────────────────
  programs: () => get<Program[]>('/api/ops/programs'),
  createProgram: (body: { employerId: string; name: string; targetCount: number; waveStructure: number[]; channel?: 'amn' | 'direct'; perRnMonthlyFeeUsd?: number; ownerNames?: string[] }) => post<ProgramOverview>('/api/ops/programs', body),
  program: (id: string) => get<ProgramOverview>(`/api/ops/programs/${id}`),
  programSlate: (id: string) => get<LicensedSlateData>(`/api/ops/programs/${id}/slate`),
  buildProgramPackets: (id: string, candidateIds: string[]) => post<{ packets: ApplicationPacket[]; skipped: { candidateId: string; reason: string }[] }>(`/api/ops/programs/${id}/packets`, { candidateIds }),
  lockWave: (id: string, waveId: string, candidateIds: string[]) => post<ProgramSlate>(`/api/ops/programs/${id}/waves/${waveId}/lock`, { candidateIds }),
  programWaveTracker: (id: string) => get<WaveTrackerRow[]>(`/api/ops/programs/${id}/wave-tracker`),
  programScorecard: (id: string) => get<ProgramScorecard>(`/api/ops/programs/${id}/scorecard`),
  programInvoices: (id: string) => get<InvoiceRollup>(`/api/ops/programs/${id}/invoices`),
  programExpansion: (id: string) => get<ExpansionGateRow[]>(`/api/ops/programs/${id}/expansion-gate`),

  // Self-serve connect. Employer-role users derive employerId from their Core org;
  // ops may pass employerId to connect on an employer's behalf.
  mergeLinkToken: (employerId?: string) => post<{ linkToken: string; mode: string }>('/api/connect/merge/link-token', employerId ? { employerId } : {}),
  mergeCallback: (body: { publicToken: string; employerId?: string; employerName?: string }) => post<{ connectionId: string; employerId: string; imported: number }>('/api/connect/merge/callback', body),
  greenhouseConnect: (body: { apiKey: string; employerId?: string; employerName?: string }) => post<{ connectionId: string; employerId: string; imported: number }>('/api/connect/greenhouse', body),
}
