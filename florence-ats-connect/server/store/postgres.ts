// Postgres backend — same Store contract as sqlite, on Postgres SQL ($n params,
// jsonb). jsonb columns come back already parsed, so reads return row.json
// directly. Runs on embedded PGlite (dev/verify) or a networked server
// (DATABASE_URL) with identical SQL.
import { createPgClient, type PgClient } from './pgClient'
import type { DocumentAccessGrantRecord, RestrictedDocumentRecord, Store } from './types'
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
import type { SubmissionLock } from '../../shared/vms-types'

const DDL = `
CREATE TABLE IF NOT EXISTS employers (id text PRIMARY KEY, created_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS facilities (id text PRIMARY KEY, employer_id text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS requisitions (id text PRIMARY KEY, employer_id text, status text, state text, specialty text, imported_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS candidates (id text PRIMARY KEY, readiness_band text, employer_share_consent text, human_qa_status text, created_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS consents (id text PRIMARY KEY, candidate_id text, employer_id text, granted_at text, revoked_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS packets (id text PRIMARY KEY, candidate_id text, requisition_id text, employer_id text, status text, created_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS ats_applications (id text PRIMARY KEY, packet_id text, candidate_id text, requisition_id text, employer_id text, status text, created_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS submission_locks (id text PRIMARY KEY, candidate_id text, employer_id text, requisition_id text, channel text, submission_id text, status text, locked_at text, expires_at text, json jsonb NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sublock_active_unique ON submission_locks(candidate_id, employer_id, channel) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_sublock_active_candidate_employer ON submission_locks(candidate_id, employer_id) WHERE status = 'active';
CREATE TABLE IF NOT EXISTS ledger_events (id text PRIMARY KEY, candidate_id text, employer_id text, requisition_id text, stage text, at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS sync_events (id text PRIMARY KEY, employer_id text, entity_type text, direction text, status text, at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS audit_log (id text PRIMARY KEY, at text, actor text, entity text, entity_id text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS restricted_documents (id text PRIMARY KEY, candidate_id text, employer_id text, packet_id text, document_type text, status text, created_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS document_access_grants (id text PRIMARY KEY, token_hash text UNIQUE, document_id text, candidate_id text, employer_id text, expires_at text, revoked_at text, created_at text, json jsonb NOT NULL);
ALTER TABLE document_access_grants ADD COLUMN IF NOT EXISTS created_at text;
CREATE TABLE IF NOT EXISTS idempotency_keys (key text PRIMARY KEY, status integer, body jsonb NOT NULL, created_at text);
CREATE INDEX IF NOT EXISTS idx_req_employer ON requisitions(employer_id);
CREATE INDEX IF NOT EXISTS idx_app_employer ON ats_applications(employer_id);
CREATE INDEX IF NOT EXISTS idx_sublock_candidate_employer ON submission_locks(candidate_id, employer_id, status);
CREATE INDEX IF NOT EXISTS idx_ledger_candidate ON ledger_events(candidate_id);
CREATE INDEX IF NOT EXISTS idx_consent_pair ON consents(candidate_id, employer_id);
CREATE INDEX IF NOT EXISTS idx_restricted_doc_packet ON restricted_documents(packet_id);
CREATE INDEX IF NOT EXISTS idx_restricted_doc_employer ON restricted_documents(employer_id, status);
CREATE INDEX IF NOT EXISTS idx_doc_grant_hash ON document_access_grants(token_hash);
CREATE INDEX IF NOT EXISTS idx_doc_grant_doc ON document_access_grants(document_id);
CREATE TABLE IF NOT EXISTS connections (id text PRIMARY KEY, employer_id text, provider text, status text, created_at text, json jsonb NOT NULL, secret text);
CREATE INDEX IF NOT EXISTS idx_conn_employer ON connections(employer_id);
CREATE TABLE IF NOT EXISTS demand_sources (id text PRIMARY KEY, source_type text, created_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS raw_jobs (id text PRIMARY KEY, demand_source_id text, content_hash text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS demand_jobs (id text PRIMARY KEY, fingerprint text, employer_id text, status text, state text, specialty text, first_seen_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS job_sources (id text PRIMARY KEY, job_id text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS job_economics (id text PRIMARY KEY, job_id text, created_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS job_benefits (id text PRIMARY KEY, job_id text, source_type text, captured_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS tracking_links (id text PRIMARY KEY, short_code text UNIQUE, job_id text, created_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS tracking_clicks (id text PRIMARY KEY, tracking_link_id text, frn_click_id text UNIQUE, clicked_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS job_interests (id text PRIMARY KEY, candidate_id text, job_id text, created_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS attribution_events (id text PRIMARY KEY, frn_click_id text, candidate_id text, job_id text, occurred_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS reconciliation_events (id text PRIMARY KEY, created_at text, json jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS idx_demandjobs_fp ON demand_jobs(fingerprint);
CREATE INDEX IF NOT EXISTS idx_jobsrc_job ON job_sources(job_id);
CREATE INDEX IF NOT EXISTS idx_interest_job ON job_interests(job_id);
CREATE INDEX IF NOT EXISTS idx_attr_click ON attribution_events(frn_click_id);
CREATE INDEX IF NOT EXISTS idx_benefits_job ON job_benefits(job_id);
CREATE TABLE IF NOT EXISTS programs (id text PRIMARY KEY, employer_id text, status text, created_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS program_waves (id text PRIMARY KEY, program_id text, wave_number integer, status text, created_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS program_slates (id text PRIMARY KEY, program_id text, wave_id text, submitted_at text, created_at text, json jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS idx_program_employer ON programs(employer_id);
CREATE INDEX IF NOT EXISTS idx_wave_program ON program_waves(program_id);
CREATE INDEX IF NOT EXISTS idx_slate_program ON program_slates(program_id);
CREATE TABLE IF NOT EXISTS demand_reservations (id text PRIMARY KEY, job_id text, employer_id text, nurse_id text, status text, reserved_at text, json jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS idx_resv_job ON demand_reservations(job_id);
CREATE INDEX IF NOT EXISTS idx_resv_status ON demand_reservations(status);
CREATE TABLE IF NOT EXISTS hiring_signals (id text PRIMARY KEY, source_type text, market text, role_category text, display_allowed boolean, employer_claimed boolean, observed_at text, created_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS claimed_employer_jobs (id text PRIMARY KEY, hiring_signal_id text, employer_id text, florence_rn_job_id text, status text, created_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS nurse_market_interest (id text PRIMARY KEY, candidate_id text, market text, role_category text, created_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS claim_tokens (id text PRIMARY KEY, token text UNIQUE, hiring_signal_id text, status text, created_at text, json jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS idx_signal_market ON hiring_signals(market, role_category);
CREATE INDEX IF NOT EXISTS idx_claimed_employer ON claimed_employer_jobs(employer_id);
CREATE INDEX IF NOT EXISTS idx_nmi_market ON nurse_market_interest(market, role_category);
CREATE INDEX IF NOT EXISTS idx_claimtoken_token ON claim_tokens(token);
`

export async function createPostgresStore(): Promise<Store> {
  const c: PgClient = await createPgClient()
  await c.exec(DDL)
  const rows = async <T>(text: string, params: unknown[] = []): Promise<T[]> => (await c.query(text, params)).rows.map((r) => r.json as T)
  const one = async <T>(text: string, params: unknown[]): Promise<T | null> => { const r = await c.query(text, params); return r.rows[0] ? (r.rows[0].json as T) : null }

  return {
    employers: {
      async insert(e: EmployerAccount) { await c.query('INSERT INTO employers(id, created_at, json) VALUES($1,$2,$3::jsonb)', [e.id, e.createdAt, JSON.stringify(e)]) },
      async update(e: EmployerAccount) { await c.query('UPDATE employers SET json = $1::jsonb WHERE id = $2', [JSON.stringify(e), e.id]) },
      get: (id) => one<EmployerAccount>('SELECT json FROM employers WHERE id = $1', [id]),
      all: () => rows<EmployerAccount>('SELECT json FROM employers ORDER BY created_at'),
    },
    facilities: {
      async insert(f: Facility) { await c.query('INSERT INTO facilities(id, employer_id, json) VALUES($1,$2,$3::jsonb)', [f.id, f.employerId, JSON.stringify(f)]) },
      get: (id) => one<Facility>('SELECT json FROM facilities WHERE id = $1', [id]),
      byEmployer: (eid) => rows<Facility>('SELECT json FROM facilities WHERE employer_id = $1', [eid]),
      all: () => rows<Facility>('SELECT json FROM facilities'),
    },
    requisitions: {
      async insert(r: JobRequisition) { await c.query('INSERT INTO requisitions(id, employer_id, status, state, specialty, imported_at, json) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)', [r.id, r.employerId, r.status, r.state ?? null, r.specialty ?? null, r.importedAt, JSON.stringify(r)]) },
      async update(r: JobRequisition) { await c.query('UPDATE requisitions SET status = $1, json = $2::jsonb WHERE id = $3', [r.status, JSON.stringify(r), r.id]) },
      get: (id) => one<JobRequisition>('SELECT json FROM requisitions WHERE id = $1', [id]),
      byEmployer: (eid) => rows<JobRequisition>('SELECT json FROM requisitions WHERE employer_id = $1 ORDER BY imported_at DESC', [eid]),
      open: () => rows<JobRequisition>("SELECT json FROM requisitions WHERE status = 'open'"),
      all: () => rows<JobRequisition>('SELECT json FROM requisitions ORDER BY imported_at DESC'),
    },
    candidates: {
      async insert(c2: FlorenceCandidate) { await c.query('INSERT INTO candidates(id, readiness_band, employer_share_consent, human_qa_status, created_at, json) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [c2.id, c2.readinessBand, c2.employerShareConsent, c2.humanQaStatus, c2.createdAt, JSON.stringify(c2)]) },
      async update(c2: FlorenceCandidate) { await c.query('UPDATE candidates SET readiness_band = $1, employer_share_consent = $2, human_qa_status = $3, json = $4::jsonb WHERE id = $5', [c2.readinessBand, c2.employerShareConsent, c2.humanQaStatus, JSON.stringify(c2), c2.id]) },
      get: (id) => one<FlorenceCandidate>('SELECT json FROM candidates WHERE id = $1', [id]),
      all: () => rows<FlorenceCandidate>('SELECT json FROM candidates ORDER BY created_at'),
    },
    consents: {
      async insert(x: EmployerShareConsent) { await c.query('INSERT INTO consents(id, candidate_id, employer_id, granted_at, revoked_at, json) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [x.id, x.candidateId, x.employerId, x.grantedAt, x.revokedAt ?? null, JSON.stringify(x)]) },
      async update(x: EmployerShareConsent) { await c.query('UPDATE consents SET revoked_at = $1, json = $2::jsonb WHERE id = $3', [x.revokedAt ?? null, JSON.stringify(x), x.id]) },
      get: (id) => one<EmployerShareConsent>('SELECT json FROM consents WHERE id = $1', [id]),
      live: (candidateId, employerId) => one<EmployerShareConsent>('SELECT json FROM consents WHERE candidate_id = $1 AND employer_id = $2 AND revoked_at IS NULL ORDER BY granted_at DESC LIMIT 1', [candidateId, employerId]),
      byCandidate: (cid) => rows<EmployerShareConsent>('SELECT json FROM consents WHERE candidate_id = $1', [cid]),
    },
    packets: {
      async insert(p: ApplicationPacket) { await c.query('INSERT INTO packets(id, candidate_id, requisition_id, employer_id, status, created_at, json) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)', [p.id, p.candidateId, p.jobRequisitionId, p.employerId, p.status, p.createdAt, JSON.stringify(p)]) },
      async update(p: ApplicationPacket) { await c.query('UPDATE packets SET status = $1, json = $2::jsonb WHERE id = $3', [p.status, JSON.stringify(p), p.id]) },
      get: (id) => one<ApplicationPacket>('SELECT json FROM packets WHERE id = $1', [id]),
      byCandidate: (cid) => rows<ApplicationPacket>('SELECT json FROM packets WHERE candidate_id = $1', [cid]),
      all: () => rows<ApplicationPacket>('SELECT json FROM packets ORDER BY created_at DESC'),
    },
    atsApplications: {
      async insert(a: ATSApplication) { await c.query('INSERT INTO ats_applications(id, packet_id, candidate_id, requisition_id, employer_id, status, created_at, json) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)', [a.id, a.packetId, a.candidateId, a.jobRequisitionId, a.employerId, a.status, a.createdAt, JSON.stringify(a)]) },
      async update(a: ATSApplication) { await c.query('UPDATE ats_applications SET status = $1, json = $2::jsonb WHERE id = $3', [a.status, JSON.stringify(a), a.id]) },
      get: (id) => one<ATSApplication>('SELECT json FROM ats_applications WHERE id = $1', [id]),
      byEmployer: (eid) => rows<ATSApplication>('SELECT json FROM ats_applications WHERE employer_id = $1 ORDER BY created_at DESC', [eid]),
      all: () => rows<ATSApplication>('SELECT json FROM ats_applications ORDER BY created_at DESC'),
    },
    submissionLocks: {
      async insert(l: SubmissionLock) { await c.query('INSERT INTO submission_locks(id, candidate_id, employer_id, requisition_id, channel, submission_id, status, locked_at, expires_at, json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)', [l.id, l.candidateId, l.employerId, l.requisitionId ?? null, l.channel, l.submissionId ?? null, l.status, l.lockedAt, l.expiresAt ?? null, JSON.stringify(l)]) },
      async update(l: SubmissionLock) { await c.query('UPDATE submission_locks SET status = $1, submission_id = $2, expires_at = $3, json = $4::jsonb WHERE id = $5', [l.status, l.submissionId ?? null, l.expiresAt ?? null, JSON.stringify(l), l.id]) },
      get: (id) => one<SubmissionLock>('SELECT json FROM submission_locks WHERE id = $1', [id]),
      active: (candidateId, employerId) => one<SubmissionLock>("SELECT json FROM submission_locks WHERE candidate_id = $1 AND employer_id = $2 AND status = 'active' AND (expires_at IS NULL OR expires_at > $3) ORDER BY locked_at DESC LIMIT 1", [candidateId, employerId, new Date().toISOString()]),
      byCandidate: (candidateId) => rows<SubmissionLock>('SELECT json FROM submission_locks WHERE candidate_id = $1 ORDER BY locked_at DESC', [candidateId]),
      bySubmission: (submissionId) => one<SubmissionLock>('SELECT json FROM submission_locks WHERE submission_id = $1 ORDER BY locked_at DESC LIMIT 1', [submissionId]),
      all: () => rows<SubmissionLock>('SELECT json FROM submission_locks ORDER BY locked_at DESC'),
    },
    ledger: {
      async insert(e: ProductionLedgerEvent) { await c.query('INSERT INTO ledger_events(id, candidate_id, employer_id, requisition_id, stage, at, json) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)', [e.id, e.candidateId, e.employerId ?? null, e.jobRequisitionId ?? null, e.stage, e.at, JSON.stringify(e)]) },
      byCandidate: (cid) => rows<ProductionLedgerEvent>('SELECT json FROM ledger_events WHERE candidate_id = $1 ORDER BY at', [cid]),
      byEmployer: (eid) => rows<ProductionLedgerEvent>('SELECT json FROM ledger_events WHERE employer_id = $1 ORDER BY at', [eid]),
      all: () => rows<ProductionLedgerEvent>('SELECT json FROM ledger_events ORDER BY at DESC'),
    },
    sync: {
      async insert(s: SyncEvent) { await c.query('INSERT INTO sync_events(id, employer_id, entity_type, direction, status, at, json) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)', [s.id, s.employerId, s.entityType, s.direction, s.status, s.createdAt, JSON.stringify(s)]) },
      recent: (limit = 100) => rows<SyncEvent>('SELECT json FROM sync_events ORDER BY at DESC LIMIT $1', [limit]),
      failed: () => rows<SyncEvent>("SELECT json FROM sync_events WHERE status = 'failed' ORDER BY at DESC"),
      all: () => rows<SyncEvent>('SELECT json FROM sync_events ORDER BY at DESC'),
    },
    audit: {
      async log(e: AuditEntry) { await c.query('INSERT INTO audit_log(id, at, actor, entity, entity_id, json) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [e.id, e.at, e.actor, e.entity, e.entityId, JSON.stringify(e)]) },
      recent: (limit = 150) => rows<AuditEntry>('SELECT json FROM audit_log ORDER BY at DESC LIMIT $1', [limit]),
    },
    restrictedDocuments: {
      async insert(d: RestrictedDocumentRecord) {
        await c.query('INSERT INTO restricted_documents(id, candidate_id, employer_id, packet_id, document_type, status, created_at, json) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)', [d.id, d.candidateId, d.employerId, d.packetId ?? null, d.documentType, d.status, d.createdAt, JSON.stringify(d)])
      },
      async update(d: RestrictedDocumentRecord) {
        await c.query('UPDATE restricted_documents SET status = $1, json = $2::jsonb WHERE id = $3', [d.status, JSON.stringify(d), d.id])
      },
      get: (id) => one<RestrictedDocumentRecord>('SELECT json FROM restricted_documents WHERE id = $1', [id]),
      byPacket: (packetId) => rows<RestrictedDocumentRecord>('SELECT json FROM restricted_documents WHERE packet_id = $1 ORDER BY created_at DESC', [packetId]),
      all: () => rows<RestrictedDocumentRecord>('SELECT json FROM restricted_documents ORDER BY created_at DESC'),
    },
    documentAccessGrants: {
      async insert(g: DocumentAccessGrantRecord) {
        await c.query('INSERT INTO document_access_grants(id, token_hash, document_id, candidate_id, employer_id, expires_at, revoked_at, created_at, json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)', [g.id, g.tokenHash, g.documentId, g.candidateId, g.employerId, g.expiresAt, g.revokedAt ?? null, g.createdAt, JSON.stringify(g)])
      },
      async update(g: DocumentAccessGrantRecord) {
        await c.query('UPDATE document_access_grants SET revoked_at = $1, json = $2::jsonb WHERE id = $3', [g.revokedAt ?? null, JSON.stringify(g), g.id])
      },
      get: (id) => one<DocumentAccessGrantRecord>('SELECT json FROM document_access_grants WHERE id = $1', [id]),
      byTokenHash: (tokenHash) => one<DocumentAccessGrantRecord>('SELECT json FROM document_access_grants WHERE token_hash = $1', [tokenHash]),
      byDocument: (documentId) => rows<DocumentAccessGrantRecord>('SELECT json FROM document_access_grants WHERE document_id = $1 ORDER BY created_at DESC', [documentId]),
    },
    idempotency: {
      async get(key) { const r = await c.query('SELECT status, body FROM idempotency_keys WHERE key = $1', [key]); return r.rows[0] ? { status: r.rows[0].status as number, body: r.rows[0].body } : null },
      async put(key, status, body) { await c.query('INSERT INTO idempotency_keys(key, status, body, created_at) VALUES($1,$2,$3::jsonb,$4) ON CONFLICT (key) DO UPDATE SET status = $2, body = $3::jsonb', [key, status, JSON.stringify(body ?? null), new Date().toISOString()]) },
    },
    connections: {
      async insert(x: AtsConnection, encryptedSecret: string) { await c.query('INSERT INTO connections(id, employer_id, provider, status, created_at, json, secret) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)', [x.id, x.employerId, x.provider, x.status, x.createdAt, JSON.stringify(x), encryptedSecret]) },
      async update(x: AtsConnection) { await c.query('UPDATE connections SET status = $1, json = $2::jsonb WHERE id = $3', [x.status, JSON.stringify(x), x.id]) },
      get: (id) => one<AtsConnection>('SELECT json FROM connections WHERE id = $1', [id]),
      async secret(id) { const r = await c.query('SELECT secret FROM connections WHERE id = $1', [id]); return r.rows[0] ? (r.rows[0].secret as string) : null },
      byEmployer: (eid) => rows<AtsConnection>('SELECT json FROM connections WHERE employer_id = $1 ORDER BY created_at DESC', [eid]),
      all: () => rows<AtsConnection>('SELECT json FROM connections ORDER BY created_at DESC'),
    },
    demandSources: {
      async insert(s: DemandSource) { await c.query('INSERT INTO demand_sources(id, source_type, created_at, json) VALUES($1,$2,$3,$4::jsonb)', [s.id, s.sourceType, s.createdAt, JSON.stringify(s)]) },
      async update(s: DemandSource) { await c.query('UPDATE demand_sources SET json = $1::jsonb WHERE id = $2', [JSON.stringify(s), s.id]) },
      get: (id) => one<DemandSource>('SELECT json FROM demand_sources WHERE id = $1', [id]),
      all: () => rows<DemandSource>('SELECT json FROM demand_sources ORDER BY created_at DESC'),
    },
    rawJobs: {
      async insert(j: RawJobPosting) { await c.query('INSERT INTO raw_jobs(id, demand_source_id, content_hash, json) VALUES($1,$2,$3,$4::jsonb)', [j.id, j.demandSourceId, j.contentHash, JSON.stringify(j)]) },
      async update(j: RawJobPosting) { await c.query('UPDATE raw_jobs SET content_hash = $1, json = $2::jsonb WHERE id = $3', [j.contentHash, JSON.stringify(j), j.id]) },
      byContentHash: (hash) => one<RawJobPosting>('SELECT json FROM raw_jobs WHERE content_hash = $1 LIMIT 1', [hash]),
      bySource: (sid) => rows<RawJobPosting>('SELECT json FROM raw_jobs WHERE demand_source_id = $1', [sid]),
      all: () => rows<RawJobPosting>('SELECT json FROM raw_jobs'),
    },
    demandJobs: {
      async insert(j: FlorenceRNJob) { await c.query('INSERT INTO demand_jobs(id, fingerprint, employer_id, status, state, specialty, first_seen_at, json) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)', [j.id, j.fingerprint, j.employerId ?? null, j.status, j.state ?? null, j.specialty ?? null, j.firstSeenAt, JSON.stringify(j)]) },
      async update(j: FlorenceRNJob) { await c.query('UPDATE demand_jobs SET status = $1, state = $2, specialty = $3, json = $4::jsonb WHERE id = $5', [j.status, j.state ?? null, j.specialty ?? null, JSON.stringify(j), j.id]) },
      get: (id) => one<FlorenceRNJob>('SELECT json FROM demand_jobs WHERE id = $1', [id]),
      byFingerprint: (fp) => one<FlorenceRNJob>('SELECT json FROM demand_jobs WHERE fingerprint = $1 LIMIT 1', [fp]),
      open: () => rows<FlorenceRNJob>("SELECT json FROM demand_jobs WHERE status = 'open' ORDER BY first_seen_at DESC"),
      all: () => rows<FlorenceRNJob>('SELECT json FROM demand_jobs ORDER BY first_seen_at DESC'),
    },
    jobSources: {
      async insert(s: JobSource) { await c.query('INSERT INTO job_sources(id, job_id, json) VALUES($1,$2,$3::jsonb)', [s.id, s.jobId, JSON.stringify(s)]) },
      byJob: (jid) => rows<JobSource>('SELECT json FROM job_sources WHERE job_id = $1', [jid]),
    },
    jobEconomics: {
      async insert(e: JobEconomics) { await c.query('INSERT INTO job_economics(id, job_id, created_at, json) VALUES($1,$2,$3,$4::jsonb)', [e.id, e.jobId, e.createdAt, JSON.stringify(e)]) },
      latestByJob: (jid) => one<JobEconomics>('SELECT json FROM job_economics WHERE job_id = $1 ORDER BY created_at DESC LIMIT 1', [jid]),
      all: () => rows<JobEconomics>('SELECT json FROM job_economics'),
    },
    jobBenefits: {
      async insert(b: JobBenefits) { await c.query('INSERT INTO job_benefits(id, job_id, source_type, captured_at, json) VALUES($1,$2,$3,$4,$5::jsonb)', [b.id, b.jobId, b.sourceType, b.capturedAt, JSON.stringify(b)]) },
      byJob: (jid) => rows<JobBenefits>('SELECT json FROM job_benefits WHERE job_id = $1 ORDER BY captured_at DESC', [jid]),
      all: () => rows<JobBenefits>('SELECT json FROM job_benefits'),
    },
    trackingLinks: {
      async insert(l: TrackingLink) { await c.query('INSERT INTO tracking_links(id, short_code, job_id, created_at, json) VALUES($1,$2,$3,$4,$5::jsonb)', [l.id, l.shortCode, l.jobId ?? null, l.createdAt, JSON.stringify(l)]) },
      get: (id) => one<TrackingLink>('SELECT json FROM tracking_links WHERE id = $1', [id]),
      byShortCode: (code) => one<TrackingLink>('SELECT json FROM tracking_links WHERE short_code = $1', [code]),
      byJob: (jid) => rows<TrackingLink>('SELECT json FROM tracking_links WHERE job_id = $1', [jid]),
      all: () => rows<TrackingLink>('SELECT json FROM tracking_links ORDER BY created_at DESC'),
    },
    trackingClicks: {
      async insert(x: TrackingClick) { await c.query('INSERT INTO tracking_clicks(id, tracking_link_id, frn_click_id, clicked_at, json) VALUES($1,$2,$3,$4,$5::jsonb)', [x.id, x.trackingLinkId, x.frnClickId, x.clickedAt, JSON.stringify(x)]) },
      byLink: (lid) => rows<TrackingClick>('SELECT json FROM tracking_clicks WHERE tracking_link_id = $1', [lid]),
      recent: (limit = 100) => rows<TrackingClick>('SELECT json FROM tracking_clicks ORDER BY clicked_at DESC LIMIT $1', [limit]),
      all: () => rows<TrackingClick>('SELECT json FROM tracking_clicks'),
    },
    jobInterests: {
      async insert(i: CandidateJobInterest) { await c.query('INSERT INTO job_interests(id, candidate_id, job_id, created_at, json) VALUES($1,$2,$3,$4,$5::jsonb)', [i.id, i.candidateId, i.jobId, i.createdAt, JSON.stringify(i)]) },
      async update(i: CandidateJobInterest) { await c.query('UPDATE job_interests SET json = $1::jsonb WHERE id = $2', [JSON.stringify(i), i.id]) },
      byCandidate: (cid) => rows<CandidateJobInterest>('SELECT json FROM job_interests WHERE candidate_id = $1', [cid]),
      byJob: (jid) => rows<CandidateJobInterest>('SELECT json FROM job_interests WHERE job_id = $1', [jid]),
      all: () => rows<CandidateJobInterest>('SELECT json FROM job_interests'),
    },
    attribution: {
      async insert(e: AttributionEvent) { await c.query('INSERT INTO attribution_events(id, frn_click_id, candidate_id, job_id, occurred_at, json) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [e.id, e.frnClickId ?? null, e.candidateId ?? null, e.jobId ?? null, e.occurredAt, JSON.stringify(e)]) },
      byClick: (cid) => rows<AttributionEvent>('SELECT json FROM attribution_events WHERE frn_click_id = $1 ORDER BY occurred_at', [cid]),
      byCandidate: (cid) => rows<AttributionEvent>('SELECT json FROM attribution_events WHERE candidate_id = $1 ORDER BY occurred_at', [cid]),
      all: () => rows<AttributionEvent>('SELECT json FROM attribution_events ORDER BY occurred_at DESC'),
    },
    reconciliations: {
      async insert(e: ReconciliationEvent) { await c.query('INSERT INTO reconciliation_events(id, created_at, json) VALUES($1,$2,$3::jsonb)', [e.id, e.createdAt, JSON.stringify(e)]) },
      all: () => rows<ReconciliationEvent>('SELECT json FROM reconciliation_events ORDER BY created_at DESC'),
    },
    reservations: {
      async insert(r: DemandReservation) { await c.query('INSERT INTO demand_reservations(id, job_id, employer_id, nurse_id, status, reserved_at, json) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)', [r.id, r.jobId, r.employerId ?? null, r.nurseId ?? null, r.status, r.reservedAt, JSON.stringify(r)]) },
      async update(r: DemandReservation) { await c.query('UPDATE demand_reservations SET status = $1, json = $2::jsonb WHERE id = $3', [r.status, JSON.stringify(r), r.id]) },
      get: (id) => one<DemandReservation>('SELECT json FROM demand_reservations WHERE id = $1', [id]),
      byJob: (jid) => rows<DemandReservation>('SELECT json FROM demand_reservations WHERE job_id = $1', [jid]),
      byEmployer: (eid) => rows<DemandReservation>('SELECT json FROM demand_reservations WHERE employer_id = $1', [eid]),
      live: () => rows<DemandReservation>("SELECT json FROM demand_reservations WHERE status = 'live'"),
      all: () => rows<DemandReservation>('SELECT json FROM demand_reservations ORDER BY reserved_at DESC'),
    },
    programs: {
      async insert(p: Program) { await c.query('INSERT INTO programs(id, employer_id, status, created_at, json) VALUES($1,$2,$3,$4,$5::jsonb)', [p.id, p.employerId, p.status, p.createdAt, JSON.stringify(p)]) },
      async update(p: Program) { await c.query('UPDATE programs SET status = $1, json = $2::jsonb WHERE id = $3', [p.status, JSON.stringify(p), p.id]) },
      get: (id) => one<Program>('SELECT json FROM programs WHERE id = $1', [id]),
      byEmployer: (eid) => rows<Program>('SELECT json FROM programs WHERE employer_id = $1 ORDER BY created_at DESC', [eid]),
      all: () => rows<Program>('SELECT json FROM programs ORDER BY created_at DESC'),
    },
    programWaves: {
      async insert(w: ProgramWave) { await c.query('INSERT INTO program_waves(id, program_id, wave_number, status, created_at, json) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [w.id, w.programId, w.waveNumber, w.status, w.createdAt, JSON.stringify(w)]) },
      async update(w: ProgramWave) { await c.query('UPDATE program_waves SET status = $1, json = $2::jsonb WHERE id = $3', [w.status, JSON.stringify(w), w.id]) },
      get: (id) => one<ProgramWave>('SELECT json FROM program_waves WHERE id = $1', [id]),
      byProgram: (pid) => rows<ProgramWave>('SELECT json FROM program_waves WHERE program_id = $1 ORDER BY wave_number', [pid]),
    },
    programSlates: {
      async insert(s: ProgramSlate) { await c.query('INSERT INTO program_slates(id, program_id, wave_id, submitted_at, created_at, json) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [s.id, s.programId, s.waveId, s.submittedAt ?? null, s.createdAt, JSON.stringify(s)]) },
      async update(s: ProgramSlate) { await c.query('UPDATE program_slates SET submitted_at = $1, json = $2::jsonb WHERE id = $3', [s.submittedAt ?? null, JSON.stringify(s), s.id]) },
      get: (id) => one<ProgramSlate>('SELECT json FROM program_slates WHERE id = $1', [id]),
      byProgram: (pid) => rows<ProgramSlate>('SELECT json FROM program_slates WHERE program_id = $1 ORDER BY created_at', [pid]),
      all: () => rows<ProgramSlate>('SELECT json FROM program_slates ORDER BY created_at'),
    },
    hiringSignals: {
      async insert(s: HiringSignal) { await c.query('INSERT INTO hiring_signals(id, source_type, market, role_category, display_allowed, employer_claimed, observed_at, created_at, json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)', [s.id, s.sourceType, s.market, s.roleCategory, s.displayAllowed, s.employerClaimed, s.observedAt, s.createdAt, JSON.stringify(s)]) },
      async update(s: HiringSignal) { await c.query('UPDATE hiring_signals SET display_allowed = $1, employer_claimed = $2, json = $3::jsonb WHERE id = $4', [s.displayAllowed, s.employerClaimed, JSON.stringify(s), s.id]) },
      get: (id) => one<HiringSignal>('SELECT json FROM hiring_signals WHERE id = $1', [id]),
      byMarket: (market, roleCategory) => roleCategory ? rows<HiringSignal>('SELECT json FROM hiring_signals WHERE market = $1 AND role_category = $2', [market, roleCategory]) : rows<HiringSignal>('SELECT json FROM hiring_signals WHERE market = $1', [market]),
      unclaimed: () => rows<HiringSignal>('SELECT json FROM hiring_signals WHERE employer_claimed = false ORDER BY observed_at DESC'),
      all: () => rows<HiringSignal>('SELECT json FROM hiring_signals ORDER BY observed_at DESC'),
    },
    claimedJobs: {
      async insert(j: ClaimedEmployerJob) { await c.query('INSERT INTO claimed_employer_jobs(id, hiring_signal_id, employer_id, florence_rn_job_id, status, created_at, json) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)', [j.id, j.hiringSignalId ?? null, j.employerId, j.florenceRnJobId ?? null, j.status, j.createdAt, JSON.stringify(j)]) },
      async update(j: ClaimedEmployerJob) { await c.query('UPDATE claimed_employer_jobs SET florence_rn_job_id = $1, status = $2, json = $3::jsonb WHERE id = $4', [j.florenceRnJobId ?? null, j.status, JSON.stringify(j), j.id]) },
      get: (id) => one<ClaimedEmployerJob>('SELECT json FROM claimed_employer_jobs WHERE id = $1', [id]),
      byEmployer: (eid) => rows<ClaimedEmployerJob>('SELECT json FROM claimed_employer_jobs WHERE employer_id = $1 ORDER BY created_at DESC', [eid]),
      bySignal: (sid) => rows<ClaimedEmployerJob>('SELECT json FROM claimed_employer_jobs WHERE hiring_signal_id = $1', [sid]),
      all: () => rows<ClaimedEmployerJob>('SELECT json FROM claimed_employer_jobs ORDER BY created_at DESC'),
    },
    marketInterest: {
      async insert(i: NurseMarketInterest) { await c.query('INSERT INTO nurse_market_interest(id, candidate_id, market, role_category, created_at, json) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [i.id, i.candidateId, i.market, i.roleCategory, i.createdAt, JSON.stringify(i)]) },
      async update(i: NurseMarketInterest) { await c.query('UPDATE nurse_market_interest SET json = $1::jsonb WHERE id = $2', [JSON.stringify(i), i.id]) },
      byMarket: (market, roleCategory) => roleCategory ? rows<NurseMarketInterest>('SELECT json FROM nurse_market_interest WHERE market = $1 AND role_category = $2', [market, roleCategory]) : rows<NurseMarketInterest>('SELECT json FROM nurse_market_interest WHERE market = $1', [market]),
      byCandidate: (cid) => rows<NurseMarketInterest>('SELECT json FROM nurse_market_interest WHERE candidate_id = $1', [cid]),
      all: () => rows<NurseMarketInterest>('SELECT json FROM nurse_market_interest ORDER BY created_at DESC'),
    },
    claimTokens: {
      async insert(t: ClaimToken) { await c.query('INSERT INTO claim_tokens(id, token, hiring_signal_id, status, created_at, json) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [t.id, t.token, t.hiringSignalId ?? null, t.status, t.createdAt, JSON.stringify(t)]) },
      async update(t: ClaimToken) { await c.query('UPDATE claim_tokens SET status = $1, json = $2::jsonb WHERE id = $3', [t.status, JSON.stringify(t), t.id]) },
      byToken: (token) => one<ClaimToken>('SELECT json FROM claim_tokens WHERE token = $1', [token]),
      get: (id) => one<ClaimToken>('SELECT json FROM claim_tokens WHERE id = $1', [id]),
      all: () => rows<ClaimToken>('SELECT json FROM claim_tokens ORDER BY created_at DESC'),
    },
    async counts() {
      const t = ['employers', 'facilities', 'requisitions', 'candidates', 'packets', 'ats_applications', 'submission_locks', 'ledger_events', 'restricted_documents', 'document_access_grants', 'raw_jobs', 'demand_jobs', 'job_benefits', 'tracking_clicks', 'job_interests', 'programs', 'program_slates', 'demand_reservations', 'hiring_signals', 'claimed_employer_jobs', 'nurse_market_interest', 'claim_tokens']
      const out: Record<string, number> = {}
      for (const name of t) out[name] = Number((await c.query(`SELECT COUNT(*)::int AS n FROM ${name}`)).rows[0].n)
      return out
    },
  }
}
