// node:sqlite backend — the V1 default. Synchronous engine wrapped to satisfy the
// async Store contract (each method is async but resolves immediately). Scalar
// columns for filtering + a `json` TEXT column holding the full typed object.
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
// @ts-ignore - node:sqlite typings vary by @types/node version; runtime is fine under Node 22+/24.
import { DatabaseSync } from 'node:sqlite'
import type { Store } from './types'
import type {
  EmployerAccount, Facility, JobRequisition, FlorenceCandidate, EmployerShareConsent,
  ApplicationPacket, ATSApplication, ProductionLedgerEvent, SyncEvent, AuditEntry, AtsConnection,
  Program, ProgramWave, ProgramSlate,
} from '../../shared/types'
import type {
  DemandSource, RawJobPosting, FlorenceRNJob, JobSource, JobEconomics,
  TrackingLink, TrackingClick, CandidateJobInterest, AttributionEvent, ReconciliationEvent,
  DemandReservation, JobBenefits,
  HiringSignal, ClaimedEmployerJob, NurseMarketInterest, ClaimToken,
} from '../../shared/demand-types'

interface Stmt { run(...p: unknown[]): unknown; get(...p: unknown[]): any; all(...p: unknown[]): any[] }
interface DB { exec(s: string): void; prepare(s: string): Stmt; close(): void }

export function createSqliteStore(): Store {
  const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data')
  mkdirSync(dataDir, { recursive: true })
  const db: DB = new DatabaseSync(join(dataDir, 'ats-connect.db')) as unknown as DB
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec(`
CREATE TABLE IF NOT EXISTS employers (id TEXT PRIMARY KEY, created_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS facilities (id TEXT PRIMARY KEY, employer_id TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS requisitions (id TEXT PRIMARY KEY, employer_id TEXT, status TEXT, state TEXT, specialty TEXT, imported_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS candidates (id TEXT PRIMARY KEY, readiness_band TEXT, employer_share_consent TEXT, human_qa_status TEXT, created_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS consents (id TEXT PRIMARY KEY, candidate_id TEXT, employer_id TEXT, granted_at TEXT, revoked_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS packets (id TEXT PRIMARY KEY, candidate_id TEXT, requisition_id TEXT, employer_id TEXT, status TEXT, created_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ats_applications (id TEXT PRIMARY KEY, packet_id TEXT, candidate_id TEXT, requisition_id TEXT, employer_id TEXT, status TEXT, created_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ledger_events (id TEXT PRIMARY KEY, candidate_id TEXT, employer_id TEXT, requisition_id TEXT, stage TEXT, at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sync_events (id TEXT PRIMARY KEY, employer_id TEXT, entity_type TEXT, direction TEXT, status TEXT, at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, at TEXT, actor TEXT, entity TEXT, entity_id TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS idempotency_keys (key TEXT PRIMARY KEY, status INTEGER, body TEXT NOT NULL, created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_req_employer ON requisitions(employer_id);
CREATE INDEX IF NOT EXISTS idx_app_employer ON ats_applications(employer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_candidate ON ledger_events(candidate_id);
CREATE INDEX IF NOT EXISTS idx_consent_pair ON consents(candidate_id, employer_id);
CREATE TABLE IF NOT EXISTS connections (id TEXT PRIMARY KEY, employer_id TEXT, provider TEXT, status TEXT, created_at TEXT, json TEXT NOT NULL, secret TEXT);
CREATE INDEX IF NOT EXISTS idx_conn_employer ON connections(employer_id);
-- Demand Radar
CREATE TABLE IF NOT EXISTS demand_sources (id TEXT PRIMARY KEY, source_type TEXT, created_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS raw_jobs (id TEXT PRIMARY KEY, demand_source_id TEXT, content_hash TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS demand_jobs (id TEXT PRIMARY KEY, fingerprint TEXT, employer_id TEXT, status TEXT, state TEXT, specialty TEXT, first_seen_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS job_sources (id TEXT PRIMARY KEY, job_id TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS job_economics (id TEXT PRIMARY KEY, job_id TEXT, created_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS job_benefits (id TEXT PRIMARY KEY, job_id TEXT, source_type TEXT, captured_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tracking_links (id TEXT PRIMARY KEY, short_code TEXT UNIQUE, job_id TEXT, created_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tracking_clicks (id TEXT PRIMARY KEY, tracking_link_id TEXT, frn_click_id TEXT UNIQUE, clicked_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS job_interests (id TEXT PRIMARY KEY, candidate_id TEXT, job_id TEXT, created_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS attribution_events (id TEXT PRIMARY KEY, frn_click_id TEXT, candidate_id TEXT, job_id TEXT, occurred_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reconciliation_events (id TEXT PRIMARY KEY, created_at TEXT, json TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_demandjobs_fp ON demand_jobs(fingerprint);
CREATE INDEX IF NOT EXISTS idx_rawjobs_hash ON raw_jobs(content_hash);
CREATE INDEX IF NOT EXISTS idx_jobsrc_job ON job_sources(job_id);
CREATE INDEX IF NOT EXISTS idx_interest_job ON job_interests(job_id);
CREATE INDEX IF NOT EXISTS idx_attr_click ON attribution_events(frn_click_id);
CREATE INDEX IF NOT EXISTS idx_benefits_job ON job_benefits(job_id);
-- Program Workspace
CREATE TABLE IF NOT EXISTS programs (id TEXT PRIMARY KEY, employer_id TEXT, status TEXT, created_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS program_waves (id TEXT PRIMARY KEY, program_id TEXT, wave_number INTEGER, status TEXT, created_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS program_slates (id TEXT PRIMARY KEY, program_id TEXT, wave_id TEXT, submitted_at TEXT, created_at TEXT, json TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_program_employer ON programs(employer_id);
CREATE INDEX IF NOT EXISTS idx_wave_program ON program_waves(program_id);
CREATE INDEX IF NOT EXISTS idx_slate_program ON program_slates(program_id);
-- Demand Reservations (soft, priced, cancellable demand-layer signal)
CREATE TABLE IF NOT EXISTS demand_reservations (id TEXT PRIMARY KEY, job_id TEXT, employer_id TEXT, nurse_id TEXT, status TEXT, reserved_at TEXT, json TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_resv_job ON demand_reservations(job_id);
CREATE INDEX IF NOT EXISTS idx_resv_status ON demand_reservations(status);
-- Long-Tail Demand Radar (signals are lead-only, never candidate-readable)
CREATE TABLE IF NOT EXISTS hiring_signals (id TEXT PRIMARY KEY, source_type TEXT, market TEXT, role_category TEXT, display_allowed INTEGER, employer_claimed INTEGER, observed_at TEXT, created_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS claimed_employer_jobs (id TEXT PRIMARY KEY, hiring_signal_id TEXT, employer_id TEXT, florence_rn_job_id TEXT, status TEXT, created_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS nurse_market_interest (id TEXT PRIMARY KEY, candidate_id TEXT, market TEXT, role_category TEXT, created_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS claim_tokens (id TEXT PRIMARY KEY, token TEXT UNIQUE, hiring_signal_id TEXT, status TEXT, created_at TEXT, json TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_signal_market ON hiring_signals(market, role_category);
CREATE INDEX IF NOT EXISTS idx_claimed_employer ON claimed_employer_jobs(employer_id);
CREATE INDEX IF NOT EXISTS idx_nmi_market ON nurse_market_interest(market, role_category);
CREATE INDEX IF NOT EXISTS idx_claimtoken_token ON claim_tokens(token);
`)
  const parse = <T>(r: any): T => JSON.parse(r.json)
  const parseAll = <T>(rows: any[]): T[] => rows.map((r) => JSON.parse(r.json))

  return {
    employers: {
      async insert(e: EmployerAccount) { db.prepare('INSERT INTO employers(id, created_at, json) VALUES(?,?,?)').run(e.id, e.createdAt, JSON.stringify(e)) },
      async update(e: EmployerAccount) { db.prepare('UPDATE employers SET json = ? WHERE id = ?').run(JSON.stringify(e), e.id) },
      async get(id) { const r = db.prepare('SELECT json FROM employers WHERE id = ?').get(id); return r ? parse<EmployerAccount>(r) : null },
      async all() { return parseAll<EmployerAccount>(db.prepare('SELECT json FROM employers ORDER BY created_at').all()) },
    },
    facilities: {
      async insert(f: Facility) { db.prepare('INSERT INTO facilities(id, employer_id, json) VALUES(?,?,?)').run(f.id, f.employerId, JSON.stringify(f)) },
      async get(id) { const r = db.prepare('SELECT json FROM facilities WHERE id = ?').get(id); return r ? parse<Facility>(r) : null },
      async byEmployer(eid) { return parseAll<Facility>(db.prepare('SELECT json FROM facilities WHERE employer_id = ?').all(eid)) },
      async all() { return parseAll<Facility>(db.prepare('SELECT json FROM facilities').all()) },
    },
    requisitions: {
      async insert(r: JobRequisition) { db.prepare('INSERT INTO requisitions(id, employer_id, status, state, specialty, imported_at, json) VALUES(?,?,?,?,?,?,?)').run(r.id, r.employerId, r.status, r.state ?? null, r.specialty ?? null, r.importedAt, JSON.stringify(r)) },
      async update(r: JobRequisition) { db.prepare('UPDATE requisitions SET status = ?, json = ? WHERE id = ?').run(r.status, JSON.stringify(r), r.id) },
      async get(id) { const r = db.prepare('SELECT json FROM requisitions WHERE id = ?').get(id); return r ? parse<JobRequisition>(r) : null },
      async byEmployer(eid) { return parseAll<JobRequisition>(db.prepare('SELECT json FROM requisitions WHERE employer_id = ? ORDER BY imported_at DESC').all(eid)) },
      async open() { return parseAll<JobRequisition>(db.prepare("SELECT json FROM requisitions WHERE status = 'open'").all()) },
      async all() { return parseAll<JobRequisition>(db.prepare('SELECT json FROM requisitions ORDER BY imported_at DESC').all()) },
    },
    candidates: {
      async insert(c: FlorenceCandidate) { db.prepare('INSERT INTO candidates(id, readiness_band, employer_share_consent, human_qa_status, created_at, json) VALUES(?,?,?,?,?,?)').run(c.id, c.readinessBand, c.employerShareConsent, c.humanQaStatus, c.createdAt, JSON.stringify(c)) },
      async update(c: FlorenceCandidate) { db.prepare('UPDATE candidates SET readiness_band = ?, employer_share_consent = ?, human_qa_status = ?, json = ? WHERE id = ?').run(c.readinessBand, c.employerShareConsent, c.humanQaStatus, JSON.stringify(c), c.id) },
      async get(id) { const r = db.prepare('SELECT json FROM candidates WHERE id = ?').get(id); return r ? parse<FlorenceCandidate>(r) : null },
      async all() { return parseAll<FlorenceCandidate>(db.prepare('SELECT json FROM candidates ORDER BY created_at').all()) },
    },
    consents: {
      async insert(c: EmployerShareConsent) { db.prepare('INSERT INTO consents(id, candidate_id, employer_id, granted_at, revoked_at, json) VALUES(?,?,?,?,?,?)').run(c.id, c.candidateId, c.employerId, c.grantedAt, c.revokedAt ?? null, JSON.stringify(c)) },
      async update(c: EmployerShareConsent) { db.prepare('UPDATE consents SET revoked_at = ?, json = ? WHERE id = ?').run(c.revokedAt ?? null, JSON.stringify(c), c.id) },
      async get(id) { const r = db.prepare('SELECT json FROM consents WHERE id = ?').get(id); return r ? parse<EmployerShareConsent>(r) : null },
      async live(candidateId, employerId) { const r = db.prepare('SELECT json FROM consents WHERE candidate_id = ? AND employer_id = ? AND revoked_at IS NULL ORDER BY granted_at DESC LIMIT 1').get(candidateId, employerId); return r ? parse<EmployerShareConsent>(r) : null },
      async byCandidate(cid) { return parseAll<EmployerShareConsent>(db.prepare('SELECT json FROM consents WHERE candidate_id = ?').all(cid)) },
    },
    packets: {
      async insert(p: ApplicationPacket) { db.prepare('INSERT INTO packets(id, candidate_id, requisition_id, employer_id, status, created_at, json) VALUES(?,?,?,?,?,?,?)').run(p.id, p.candidateId, p.jobRequisitionId, p.employerId, p.status, p.createdAt, JSON.stringify(p)) },
      async update(p: ApplicationPacket) { db.prepare('UPDATE packets SET status = ?, json = ? WHERE id = ?').run(p.status, JSON.stringify(p), p.id) },
      async get(id) { const r = db.prepare('SELECT json FROM packets WHERE id = ?').get(id); return r ? parse<ApplicationPacket>(r) : null },
      async byCandidate(cid) { return parseAll<ApplicationPacket>(db.prepare('SELECT json FROM packets WHERE candidate_id = ?').all(cid)) },
      async all() { return parseAll<ApplicationPacket>(db.prepare('SELECT json FROM packets ORDER BY created_at DESC').all()) },
    },
    atsApplications: {
      async insert(a: ATSApplication) { db.prepare('INSERT INTO ats_applications(id, packet_id, candidate_id, requisition_id, employer_id, status, created_at, json) VALUES(?,?,?,?,?,?,?,?)').run(a.id, a.packetId, a.candidateId, a.jobRequisitionId, a.employerId, a.status, a.createdAt, JSON.stringify(a)) },
      async update(a: ATSApplication) { db.prepare('UPDATE ats_applications SET status = ?, json = ? WHERE id = ?').run(a.status, JSON.stringify(a), a.id) },
      async get(id) { const r = db.prepare('SELECT json FROM ats_applications WHERE id = ?').get(id); return r ? parse<ATSApplication>(r) : null },
      async byEmployer(eid) { return parseAll<ATSApplication>(db.prepare('SELECT json FROM ats_applications WHERE employer_id = ? ORDER BY created_at DESC').all(eid)) },
      async all() { return parseAll<ATSApplication>(db.prepare('SELECT json FROM ats_applications ORDER BY created_at DESC').all()) },
    },
    ledger: {
      async insert(e: ProductionLedgerEvent) { db.prepare('INSERT INTO ledger_events(id, candidate_id, employer_id, requisition_id, stage, at, json) VALUES(?,?,?,?,?,?,?)').run(e.id, e.candidateId, e.employerId ?? null, e.jobRequisitionId ?? null, e.stage, e.at, JSON.stringify(e)) },
      async byCandidate(cid) { return parseAll<ProductionLedgerEvent>(db.prepare('SELECT json FROM ledger_events WHERE candidate_id = ? ORDER BY at').all(cid)) },
      async byEmployer(eid) { return parseAll<ProductionLedgerEvent>(db.prepare('SELECT json FROM ledger_events WHERE employer_id = ? ORDER BY at').all(eid)) },
      async all() { return parseAll<ProductionLedgerEvent>(db.prepare('SELECT json FROM ledger_events ORDER BY at DESC').all()) },
    },
    sync: {
      async insert(s: SyncEvent) { db.prepare('INSERT INTO sync_events(id, employer_id, entity_type, direction, status, at, json) VALUES(?,?,?,?,?,?,?)').run(s.id, s.employerId, s.entityType, s.direction, s.status, s.createdAt, JSON.stringify(s)) },
      async recent(limit = 100) { return parseAll<SyncEvent>(db.prepare('SELECT json FROM sync_events ORDER BY at DESC LIMIT ?').all(limit)) },
      async failed() { return parseAll<SyncEvent>(db.prepare("SELECT json FROM sync_events WHERE status = 'failed' ORDER BY at DESC").all()) },
      async all() { return parseAll<SyncEvent>(db.prepare('SELECT json FROM sync_events ORDER BY at DESC').all()) },
    },
    audit: {
      async log(e: AuditEntry) { db.prepare('INSERT INTO audit_log(id, at, actor, entity, entity_id, json) VALUES(?,?,?,?,?,?)').run(e.id, e.at, e.actor, e.entity, e.entityId, JSON.stringify(e)) },
      async recent(limit = 150) { return parseAll<AuditEntry>(db.prepare('SELECT json FROM audit_log ORDER BY at DESC LIMIT ?').all(limit)) },
    },
    idempotency: {
      async get(key) { const r = db.prepare('SELECT status, body FROM idempotency_keys WHERE key = ?').get(key); return r ? { status: (r as any).status as number, body: JSON.parse((r as any).body) } : null },
      async put(key, status, body) { db.prepare('INSERT OR REPLACE INTO idempotency_keys(key, status, body, created_at) VALUES(?,?,?,?)').run(key, status, JSON.stringify(body ?? null), new Date().toISOString()) },
    },
    connections: {
      async insert(c: AtsConnection, encryptedSecret: string) { db.prepare('INSERT INTO connections(id, employer_id, provider, status, created_at, json, secret) VALUES(?,?,?,?,?,?,?)').run(c.id, c.employerId, c.provider, c.status, c.createdAt, JSON.stringify(c), encryptedSecret) },
      async update(c: AtsConnection) { db.prepare('UPDATE connections SET status = ?, json = ? WHERE id = ?').run(c.status, JSON.stringify(c), c.id) },
      async get(id) { const r = db.prepare('SELECT json FROM connections WHERE id = ?').get(id); return r ? parse<AtsConnection>(r) : null },
      async secret(id) { const r = db.prepare('SELECT secret FROM connections WHERE id = ?').get(id); return r ? ((r as any).secret as string) : null },
      async byEmployer(eid) { return parseAll<AtsConnection>(db.prepare('SELECT json FROM connections WHERE employer_id = ? ORDER BY created_at DESC').all(eid)) },
      async all() { return parseAll<AtsConnection>(db.prepare('SELECT json FROM connections ORDER BY created_at DESC').all()) },
    },
    demandSources: {
      async insert(s: DemandSource) { db.prepare('INSERT INTO demand_sources(id, source_type, created_at, json) VALUES(?,?,?,?)').run(s.id, s.sourceType, s.createdAt, JSON.stringify(s)) },
      async update(s: DemandSource) { db.prepare('UPDATE demand_sources SET json = ? WHERE id = ?').run(JSON.stringify(s), s.id) },
      async get(id) { const r = db.prepare('SELECT json FROM demand_sources WHERE id = ?').get(id); return r ? parse<DemandSource>(r) : null },
      async all() { return parseAll<DemandSource>(db.prepare('SELECT json FROM demand_sources ORDER BY created_at DESC').all()) },
    },
    rawJobs: {
      async insert(j: RawJobPosting) { db.prepare('INSERT INTO raw_jobs(id, demand_source_id, content_hash, json) VALUES(?,?,?,?)').run(j.id, j.demandSourceId, j.contentHash, JSON.stringify(j)) },
      async update(j: RawJobPosting) { db.prepare('UPDATE raw_jobs SET content_hash = ?, json = ? WHERE id = ?').run(j.contentHash, JSON.stringify(j), j.id) },
      async byContentHash(hash) { const r = db.prepare('SELECT json FROM raw_jobs WHERE content_hash = ? LIMIT 1').get(hash); return r ? parse<RawJobPosting>(r) : null },
      async bySource(sid) { return parseAll<RawJobPosting>(db.prepare('SELECT json FROM raw_jobs WHERE demand_source_id = ?').all(sid)) },
      async all() { return parseAll<RawJobPosting>(db.prepare('SELECT json FROM raw_jobs').all()) },
    },
    demandJobs: {
      async insert(j: FlorenceRNJob) { db.prepare('INSERT INTO demand_jobs(id, fingerprint, employer_id, status, state, specialty, first_seen_at, json) VALUES(?,?,?,?,?,?,?,?)').run(j.id, j.fingerprint, j.employerId ?? null, j.status, j.state ?? null, j.specialty ?? null, j.firstSeenAt, JSON.stringify(j)) },
      async update(j: FlorenceRNJob) { db.prepare('UPDATE demand_jobs SET status = ?, state = ?, specialty = ?, json = ? WHERE id = ?').run(j.status, j.state ?? null, j.specialty ?? null, JSON.stringify(j), j.id) },
      async get(id) { const r = db.prepare('SELECT json FROM demand_jobs WHERE id = ?').get(id); return r ? parse<FlorenceRNJob>(r) : null },
      async byFingerprint(fp) { const r = db.prepare('SELECT json FROM demand_jobs WHERE fingerprint = ? LIMIT 1').get(fp); return r ? parse<FlorenceRNJob>(r) : null },
      async open() { return parseAll<FlorenceRNJob>(db.prepare("SELECT json FROM demand_jobs WHERE status = 'open' ORDER BY first_seen_at DESC").all()) },
      async all() { return parseAll<FlorenceRNJob>(db.prepare('SELECT json FROM demand_jobs ORDER BY first_seen_at DESC').all()) },
    },
    jobSources: {
      async insert(s: JobSource) { db.prepare('INSERT INTO job_sources(id, job_id, json) VALUES(?,?,?)').run(s.id, s.jobId, JSON.stringify(s)) },
      async byJob(jid) { return parseAll<JobSource>(db.prepare('SELECT json FROM job_sources WHERE job_id = ?').all(jid)) },
    },
    jobEconomics: {
      async insert(e: JobEconomics) { db.prepare('INSERT INTO job_economics(id, job_id, created_at, json) VALUES(?,?,?,?)').run(e.id, e.jobId, e.createdAt, JSON.stringify(e)) },
      async latestByJob(jid) { const r = db.prepare('SELECT json FROM job_economics WHERE job_id = ? ORDER BY created_at DESC LIMIT 1').get(jid); return r ? parse<JobEconomics>(r) : null },
      async all() { return parseAll<JobEconomics>(db.prepare('SELECT json FROM job_economics').all()) },
    },
    jobBenefits: {
      async insert(b: JobBenefits) { db.prepare('INSERT INTO job_benefits(id, job_id, source_type, captured_at, json) VALUES(?,?,?,?,?)').run(b.id, b.jobId, b.sourceType, b.capturedAt, JSON.stringify(b)) },
      async byJob(jid) { return parseAll<JobBenefits>(db.prepare('SELECT json FROM job_benefits WHERE job_id = ? ORDER BY captured_at DESC').all(jid)) },
      async all() { return parseAll<JobBenefits>(db.prepare('SELECT json FROM job_benefits').all()) },
    },
    trackingLinks: {
      async insert(l: TrackingLink) { db.prepare('INSERT INTO tracking_links(id, short_code, job_id, created_at, json) VALUES(?,?,?,?,?)').run(l.id, l.shortCode, l.jobId ?? null, l.createdAt, JSON.stringify(l)) },
      async get(id) { const r = db.prepare('SELECT json FROM tracking_links WHERE id = ?').get(id); return r ? parse<TrackingLink>(r) : null },
      async byShortCode(code) { const r = db.prepare('SELECT json FROM tracking_links WHERE short_code = ?').get(code); return r ? parse<TrackingLink>(r) : null },
      async byJob(jid) { return parseAll<TrackingLink>(db.prepare('SELECT json FROM tracking_links WHERE job_id = ?').all(jid)) },
      async all() { return parseAll<TrackingLink>(db.prepare('SELECT json FROM tracking_links ORDER BY created_at DESC').all()) },
    },
    trackingClicks: {
      async insert(c: TrackingClick) { db.prepare('INSERT INTO tracking_clicks(id, tracking_link_id, frn_click_id, clicked_at, json) VALUES(?,?,?,?,?)').run(c.id, c.trackingLinkId, c.frnClickId, c.clickedAt, JSON.stringify(c)) },
      async byLink(lid) { return parseAll<TrackingClick>(db.prepare('SELECT json FROM tracking_clicks WHERE tracking_link_id = ?').all(lid)) },
      async recent(limit = 100) { return parseAll<TrackingClick>(db.prepare('SELECT json FROM tracking_clicks ORDER BY clicked_at DESC LIMIT ?').all(limit)) },
      async all() { return parseAll<TrackingClick>(db.prepare('SELECT json FROM tracking_clicks').all()) },
    },
    jobInterests: {
      async insert(i: CandidateJobInterest) { db.prepare('INSERT INTO job_interests(id, candidate_id, job_id, created_at, json) VALUES(?,?,?,?,?)').run(i.id, i.candidateId, i.jobId, i.createdAt, JSON.stringify(i)) },
      async update(i: CandidateJobInterest) { db.prepare('UPDATE job_interests SET json = ? WHERE id = ?').run(JSON.stringify(i), i.id) },
      async byCandidate(cid) { return parseAll<CandidateJobInterest>(db.prepare('SELECT json FROM job_interests WHERE candidate_id = ?').all(cid)) },
      async byJob(jid) { return parseAll<CandidateJobInterest>(db.prepare('SELECT json FROM job_interests WHERE job_id = ?').all(jid)) },
      async all() { return parseAll<CandidateJobInterest>(db.prepare('SELECT json FROM job_interests').all()) },
    },
    attribution: {
      async insert(e: AttributionEvent) { db.prepare('INSERT INTO attribution_events(id, frn_click_id, candidate_id, job_id, occurred_at, json) VALUES(?,?,?,?,?,?)').run(e.id, e.frnClickId ?? null, e.candidateId ?? null, e.jobId ?? null, e.occurredAt, JSON.stringify(e)) },
      async byClick(cid) { return parseAll<AttributionEvent>(db.prepare('SELECT json FROM attribution_events WHERE frn_click_id = ? ORDER BY occurred_at').all(cid)) },
      async byCandidate(cid) { return parseAll<AttributionEvent>(db.prepare('SELECT json FROM attribution_events WHERE candidate_id = ? ORDER BY occurred_at').all(cid)) },
      async all() { return parseAll<AttributionEvent>(db.prepare('SELECT json FROM attribution_events ORDER BY occurred_at DESC').all()) },
    },
    reconciliations: {
      async insert(e: ReconciliationEvent) { db.prepare('INSERT INTO reconciliation_events(id, created_at, json) VALUES(?,?,?)').run(e.id, e.createdAt, JSON.stringify(e)) },
      async all() { return parseAll<ReconciliationEvent>(db.prepare('SELECT json FROM reconciliation_events ORDER BY created_at DESC').all()) },
    },
    reservations: {
      async insert(r: DemandReservation) { db.prepare('INSERT INTO demand_reservations(id, job_id, employer_id, nurse_id, status, reserved_at, json) VALUES(?,?,?,?,?,?,?)').run(r.id, r.jobId, r.employerId ?? null, r.nurseId ?? null, r.status, r.reservedAt, JSON.stringify(r)) },
      async update(r: DemandReservation) { db.prepare('UPDATE demand_reservations SET status = ?, json = ? WHERE id = ?').run(r.status, JSON.stringify(r), r.id) },
      async get(id) { const r = db.prepare('SELECT json FROM demand_reservations WHERE id = ?').get(id); return r ? parse<DemandReservation>(r) : null },
      async byJob(jid) { return parseAll<DemandReservation>(db.prepare('SELECT json FROM demand_reservations WHERE job_id = ?').all(jid)) },
      async byEmployer(eid) { return parseAll<DemandReservation>(db.prepare('SELECT json FROM demand_reservations WHERE employer_id = ?').all(eid)) },
      async live() { return parseAll<DemandReservation>(db.prepare("SELECT json FROM demand_reservations WHERE status = 'live'").all()) },
      async all() { return parseAll<DemandReservation>(db.prepare('SELECT json FROM demand_reservations ORDER BY reserved_at DESC').all()) },
    },
    programs: {
      async insert(p: Program) { db.prepare('INSERT INTO programs(id, employer_id, status, created_at, json) VALUES(?,?,?,?,?)').run(p.id, p.employerId, p.status, p.createdAt, JSON.stringify(p)) },
      async update(p: Program) { db.prepare('UPDATE programs SET status = ?, json = ? WHERE id = ?').run(p.status, JSON.stringify(p), p.id) },
      async get(id) { const r = db.prepare('SELECT json FROM programs WHERE id = ?').get(id); return r ? parse<Program>(r) : null },
      async byEmployer(eid) { return parseAll<Program>(db.prepare('SELECT json FROM programs WHERE employer_id = ? ORDER BY created_at DESC').all(eid)) },
      async all() { return parseAll<Program>(db.prepare('SELECT json FROM programs ORDER BY created_at DESC').all()) },
    },
    programWaves: {
      async insert(w: ProgramWave) { db.prepare('INSERT INTO program_waves(id, program_id, wave_number, status, created_at, json) VALUES(?,?,?,?,?,?)').run(w.id, w.programId, w.waveNumber, w.status, w.createdAt, JSON.stringify(w)) },
      async update(w: ProgramWave) { db.prepare('UPDATE program_waves SET status = ?, json = ? WHERE id = ?').run(w.status, JSON.stringify(w), w.id) },
      async get(id) { const r = db.prepare('SELECT json FROM program_waves WHERE id = ?').get(id); return r ? parse<ProgramWave>(r) : null },
      async byProgram(pid) { return parseAll<ProgramWave>(db.prepare('SELECT json FROM program_waves WHERE program_id = ? ORDER BY wave_number').all(pid)) },
    },
    programSlates: {
      async insert(s: ProgramSlate) { db.prepare('INSERT INTO program_slates(id, program_id, wave_id, submitted_at, created_at, json) VALUES(?,?,?,?,?,?)').run(s.id, s.programId, s.waveId, s.submittedAt ?? null, s.createdAt, JSON.stringify(s)) },
      async update(s: ProgramSlate) { db.prepare('UPDATE program_slates SET submitted_at = ?, json = ? WHERE id = ?').run(s.submittedAt ?? null, JSON.stringify(s), s.id) },
      async get(id) { const r = db.prepare('SELECT json FROM program_slates WHERE id = ?').get(id); return r ? parse<ProgramSlate>(r) : null },
      async byProgram(pid) { return parseAll<ProgramSlate>(db.prepare('SELECT json FROM program_slates WHERE program_id = ? ORDER BY created_at').all(pid)) },
      async all() { return parseAll<ProgramSlate>(db.prepare('SELECT json FROM program_slates ORDER BY created_at').all()) },
    },
    hiringSignals: {
      async insert(s: HiringSignal) { db.prepare('INSERT INTO hiring_signals(id, source_type, market, role_category, display_allowed, employer_claimed, observed_at, created_at, json) VALUES(?,?,?,?,?,?,?,?,?)').run(s.id, s.sourceType, s.market, s.roleCategory, s.displayAllowed ? 1 : 0, s.employerClaimed ? 1 : 0, s.observedAt, s.createdAt, JSON.stringify(s)) },
      async update(s: HiringSignal) { db.prepare('UPDATE hiring_signals SET display_allowed = ?, employer_claimed = ?, json = ? WHERE id = ?').run(s.displayAllowed ? 1 : 0, s.employerClaimed ? 1 : 0, JSON.stringify(s), s.id) },
      async get(id) { const r = db.prepare('SELECT json FROM hiring_signals WHERE id = ?').get(id); return r ? parse<HiringSignal>(r) : null },
      async byMarket(market, roleCategory) { return parseAll<HiringSignal>(roleCategory ? db.prepare('SELECT json FROM hiring_signals WHERE market = ? AND role_category = ?').all(market, roleCategory) : db.prepare('SELECT json FROM hiring_signals WHERE market = ?').all(market)) },
      async unclaimed() { return parseAll<HiringSignal>(db.prepare('SELECT json FROM hiring_signals WHERE employer_claimed = 0 ORDER BY observed_at DESC').all()) },
      async all() { return parseAll<HiringSignal>(db.prepare('SELECT json FROM hiring_signals ORDER BY observed_at DESC').all()) },
    },
    claimedJobs: {
      async insert(j: ClaimedEmployerJob) { db.prepare('INSERT INTO claimed_employer_jobs(id, hiring_signal_id, employer_id, florence_rn_job_id, status, created_at, json) VALUES(?,?,?,?,?,?,?)').run(j.id, j.hiringSignalId ?? null, j.employerId, j.florenceRnJobId ?? null, j.status, j.createdAt, JSON.stringify(j)) },
      async update(j: ClaimedEmployerJob) { db.prepare('UPDATE claimed_employer_jobs SET florence_rn_job_id = ?, status = ?, json = ? WHERE id = ?').run(j.florenceRnJobId ?? null, j.status, JSON.stringify(j), j.id) },
      async get(id) { const r = db.prepare('SELECT json FROM claimed_employer_jobs WHERE id = ?').get(id); return r ? parse<ClaimedEmployerJob>(r) : null },
      async byEmployer(eid) { return parseAll<ClaimedEmployerJob>(db.prepare('SELECT json FROM claimed_employer_jobs WHERE employer_id = ? ORDER BY created_at DESC').all(eid)) },
      async bySignal(sid) { return parseAll<ClaimedEmployerJob>(db.prepare('SELECT json FROM claimed_employer_jobs WHERE hiring_signal_id = ?').all(sid)) },
      async all() { return parseAll<ClaimedEmployerJob>(db.prepare('SELECT json FROM claimed_employer_jobs ORDER BY created_at DESC').all()) },
    },
    marketInterest: {
      async insert(i: NurseMarketInterest) { db.prepare('INSERT INTO nurse_market_interest(id, candidate_id, market, role_category, created_at, json) VALUES(?,?,?,?,?,?)').run(i.id, i.candidateId, i.market, i.roleCategory, i.createdAt, JSON.stringify(i)) },
      async update(i: NurseMarketInterest) { db.prepare('UPDATE nurse_market_interest SET json = ? WHERE id = ?').run(JSON.stringify(i), i.id) },
      async byMarket(market, roleCategory) { return parseAll<NurseMarketInterest>(roleCategory ? db.prepare('SELECT json FROM nurse_market_interest WHERE market = ? AND role_category = ?').all(market, roleCategory) : db.prepare('SELECT json FROM nurse_market_interest WHERE market = ?').all(market)) },
      async byCandidate(cid) { return parseAll<NurseMarketInterest>(db.prepare('SELECT json FROM nurse_market_interest WHERE candidate_id = ?').all(cid)) },
      async all() { return parseAll<NurseMarketInterest>(db.prepare('SELECT json FROM nurse_market_interest ORDER BY created_at DESC').all()) },
    },
    claimTokens: {
      async insert(t: ClaimToken) { db.prepare('INSERT INTO claim_tokens(id, token, hiring_signal_id, status, created_at, json) VALUES(?,?,?,?,?,?)').run(t.id, t.token, t.hiringSignalId ?? null, t.status, t.createdAt, JSON.stringify(t)) },
      async update(t: ClaimToken) { db.prepare('UPDATE claim_tokens SET status = ?, json = ? WHERE id = ?').run(t.status, JSON.stringify(t), t.id) },
      async byToken(token) { const r = db.prepare('SELECT json FROM claim_tokens WHERE token = ?').get(token); return r ? parse<ClaimToken>(r) : null },
      async get(id) { const r = db.prepare('SELECT json FROM claim_tokens WHERE id = ?').get(id); return r ? parse<ClaimToken>(r) : null },
      async all() { return parseAll<ClaimToken>(db.prepare('SELECT json FROM claim_tokens ORDER BY created_at DESC').all()) },
    },
    async counts() {
      const t = ['employers', 'facilities', 'requisitions', 'candidates', 'packets', 'ats_applications', 'ledger_events', 'raw_jobs', 'demand_jobs', 'job_benefits', 'tracking_clicks', 'job_interests', 'programs', 'program_slates', 'demand_reservations', 'hiring_signals', 'claimed_employer_jobs', 'nurse_market_interest', 'claim_tokens']
      const out: Record<string, number> = {}
      for (const name of t) out[name] = (db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get() as any).n
      return out
    },
  }
}
