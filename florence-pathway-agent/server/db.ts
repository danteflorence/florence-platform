// ============================================================================
// Persistence — Node's built-in node:sqlite (no native deps).
// The canonical Phase-0 data model lives here as real SQL tables. Entities keep
// the scalar columns the UI filters/sorts on; the full typed object is stored in
// a `json` column. Every mutation that matters is mirrored into audit_log.
// ============================================================================
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
// @ts-ignore - node:sqlite typings vary by @types/node version; runtime is fine under Node 24.
import { DatabaseSync } from 'node:sqlite'

import type {
  CandidateProfile, IdentityDocument, EducationRecord, EmploymentRecord,
  LicenseRecord, VisaHistoryRecord, TravelHistoryRecord, SchoolProgram,
  EmployerOffer, FinancingRecord, EnglishExam, NclexRegistration,
  PathwayDocument, WorkflowInstance, FormDraft, QaReview, CandidateAttestation,
  SubmissionEvent, AppointmentEvent, DeficiencyNotice, AuditEntry,
  LedgerMilestone, CandidateDossier, ConsularPaymentOrder, SevismateHandoff,
  I901Receipt, ConsularPaymentEvent,
} from '../shared/types'

interface Stmt { run(...p: unknown[]): unknown; get(...p: unknown[]): any; all(...p: unknown[]): any[] }
interface DB { exec(s: string): void; prepare(s: string): Stmt; close(): void }

// Resolve the data dir relative to this module (not process.cwd()) so the DB
// path is stable no matter where the process is launched from (the preview
// harness launches the dev stack from the home directory).
const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data')
mkdirSync(dataDir, { recursive: true })
const db: DB = new DatabaseSync(join(dataDir, 'pathway.db')) as unknown as DB
db.exec('PRAGMA journal_mode = WAL;')

export const uid = (): string => (globalThis.crypto as Crypto).randomUUID()
export const now = (): string => new Date().toISOString()

function redactAuditDetail(value: string | undefined): string | undefined {
  if (!value) return value
  const redacted = value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED]')
    .replace(/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, '[REDACTED]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED]')
    .replace(/\b(?:ssn|itin)\s*(?::|=|\s)\s*\d{9}\b/gi, '[REDACTED]')
    .replace(/\bN\d{10}\b/g, '[REDACTED]')
    .replace(/\b(?:passport|sevis|ssn|itin|ds-?160|i-?20|credit|loan|lender(?:\s+application)?|token|secret|api[_ -]?key)(?:\s+(?:number|id|confirmation|application|value))?\s*(?::|=|\s)\s*[A-Z0-9][A-Z0-9_-]{2,}/gi, '[REDACTED]')
    .replace(/\b(?:dob|date\s+of\s+birth|birthDate)\s*(?::|=|\s)\s*[^;,\n]+/gi, '[REDACTED]')
    .replace(/\baddress\s*(?::|=|\s)\s*[^;\n]+/gi, '[REDACTED]')
    .replace(/https?:\/\/[^\s"'<>]*(?:X-Amz-Signature|Signature|token|signed)[^\s"'<>]*/gi, '[REDACTED]')
    .replace(/(?:\/(?:private|tmp|var|Users|vault|documents|restricted-documents)\/[^\s"'<>]+)/g, '[REDACTED]')
  return redacted === value && /passport|sevis|ssn|itin|ds160|i20|visa|dob|address|phone|credit|loan|underwriting|signature|name|document|token|secret/i.test(value)
    ? '[REDACTED]'
    : redacted
}

const AUDIT_ACTION_ALIASES: Record<string, string> = {
  document_uploaded: 'document.upload',
  ds160_confirmation_recorded: 'immigration.ds160_confirmation.recorded',
  visa_outcome_recorded: 'immigration.visa_outcome.recorded',
  nclex_registered: 'nclex.registration.recorded',
  nclex_att: 'nclex.att.recorded',
  licensure_submitted: 'licensure.submission',
  i901_payment_order_created: 'consular.i901_payment_order',
  i901_payment_order_updated: 'consular.i901_payment_order',
  i901_candidate_attested: 'consular.i901_attestation',
  i901_handoff_sent: 'sevismate.handoff',
  i901_receipt_received: 'document.upload',
  i901_receipt_qa_approved: 'consular.i901_receipt_qa',
  i901_receipt_rejected: 'consular.i901_receipt_qa',
}

function normalizeAuditAction(action: string): string {
  return AUDIT_ACTION_ALIASES[action] ?? action
}

function detailWithLegacyAction(action: string, canonicalAction: string, detail?: string): string | undefined {
  const prefix = action === canonicalAction ? '' : `legacyAction=${action};`
  if (!detail) return prefix ? prefix.slice(0, -1) : undefined
  return `${prefix}detail=[REDACTED]`
}

// --- schema ----------------------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS candidates (id TEXT PRIMARY KEY, created_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS identity_documents (id TEXT PRIMARY KEY, candidate_id TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS education (id TEXT PRIMARY KEY, candidate_id TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS employment (id TEXT PRIMARY KEY, candidate_id TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS licenses (id TEXT PRIMARY KEY, candidate_id TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS visa_history (id TEXT PRIMARY KEY, candidate_id TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS travel_history (id TEXT PRIMARY KEY, candidate_id TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS school_programs (id TEXT PRIMARY KEY, candidate_id TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS employer_offers (id TEXT PRIMARY KEY, candidate_id TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS financing (id TEXT PRIMARY KEY, candidate_id TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS english_exams (id TEXT PRIMARY KEY, candidate_id TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS nclex_registrations (id TEXT PRIMARY KEY, candidate_id TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, candidate_id TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS workflows (id TEXT PRIMARY KEY, candidate_id TEXT, type TEXT, status TEXT, updated_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS form_drafts (id TEXT PRIMARY KEY, candidate_id TEXT, workflow_id TEXT, form_type TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS qa_reviews (id TEXT PRIMARY KEY, candidate_id TEXT, workflow_id TEXT, status TEXT, created_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS attestations (id TEXT PRIMARY KEY, candidate_id TEXT, workflow_id TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY, candidate_id TEXT, workflow_id TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS appointments (id TEXT PRIMARY KEY, candidate_id TEXT, workflow_id TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS deficiencies (id TEXT PRIMARY KEY, candidate_id TEXT, workflow_id TEXT, resolved INTEGER, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, candidate_id TEXT, at TEXT, actor TEXT, entity TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ledger_milestones (id TEXT PRIMARY KEY, candidate_id TEXT, workflow_id TEXT, milestone TEXT, pushed INTEGER, at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS consular_payment_orders (id TEXT PRIMARY KEY, candidate_id TEXT, status TEXT, updated_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sevismate_handoffs (id TEXT PRIMARY KEY, candidate_id TEXT, payment_order_id TEXT, status TEXT, created_at TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS i901_receipts (id TEXT PRIMARY KEY, candidate_id TEXT, payment_order_id TEXT, qa_status TEXT, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS consular_payment_events (id TEXT PRIMARY KEY, candidate_id TEXT, payment_order_id TEXT, event_type TEXT, occurred_at TEXT, json TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_wf_candidate ON workflows(candidate_id);
CREATE INDEX IF NOT EXISTS idx_qa_status ON qa_reviews(status);
CREATE INDEX IF NOT EXISTS idx_cpo_candidate ON consular_payment_orders(candidate_id);
CREATE INDEX IF NOT EXISTS idx_cpo_status ON consular_payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_i901_order ON i901_receipts(payment_order_id);
`)

const parse = <T>(r: any): T => JSON.parse(r.json)
const parseAll = <T>(rows: any[]): T[] => rows.map((r) => JSON.parse(r.json))

/** Generic repo for the simple (id, candidate_id, json) sub-record tables. */
function subRepo<T extends { id: string; candidateId: string }>(table: string) {
  const insert = db.prepare(`INSERT INTO ${table}(id, candidate_id, json) VALUES(?, ?, ?)`)
  const update = db.prepare(`UPDATE ${table} SET json = ? WHERE id = ?`)
  const byCand = db.prepare(`SELECT json FROM ${table} WHERE candidate_id = ?`)
  const byId = db.prepare(`SELECT json FROM ${table} WHERE id = ?`)
  const allRows = db.prepare(`SELECT json FROM ${table}`)
  return {
    insert: (o: T) => { insert.run(o.id, o.candidateId, JSON.stringify(o)) },
    update: (o: T) => { update.run(JSON.stringify(o), o.id) },
    byCandidate: (cid: string): T[] => parseAll<T>(byCand.all(cid)),
    get: (id: string): T | null => { const r = byId.get(id); return r ? parse<T>(r) : null },
    all: (): T[] => parseAll<T>(allRows.all()),
  }
}

const candidatesIns = db.prepare('INSERT INTO candidates(id, created_at, json) VALUES(?, ?, ?)')
const candidatesUpd = db.prepare('UPDATE candidates SET json = ? WHERE id = ?')

export const store = {
  candidates: {
    insert(c: CandidateProfile) { candidatesIns.run(c.id, c.createdAt, JSON.stringify(c)) },
    update(c: CandidateProfile) { candidatesUpd.run(JSON.stringify(c), c.id) },
    get: (id: string): CandidateProfile | null => { const r = db.prepare('SELECT json FROM candidates WHERE id = ?').get(id); return r ? parse(r) : null },
    all: (): CandidateProfile[] => parseAll(db.prepare('SELECT json FROM candidates ORDER BY created_at').all()),
    count: (): number => (db.prepare('SELECT COUNT(*) AS n FROM candidates').get() as any).n,
  },

  identityDocuments: subRepo<IdentityDocument>('identity_documents'),
  education: subRepo<EducationRecord>('education'),
  employment: subRepo<EmploymentRecord>('employment'),
  licenses: subRepo<LicenseRecord>('licenses'),
  visaHistory: subRepo<VisaHistoryRecord>('visa_history'),
  travelHistory: subRepo<TravelHistoryRecord>('travel_history'),
  schoolPrograms: subRepo<SchoolProgram>('school_programs'),
  employerOffers: subRepo<EmployerOffer>('employer_offers'),
  financing: subRepo<FinancingRecord>('financing'),
  englishExams: subRepo<EnglishExam>('english_exams'),
  nclex: subRepo<NclexRegistration>('nclex_registrations'),
  documents: subRepo<PathwayDocument>('documents'),

  workflows: {
    insert(w: WorkflowInstance) { db.prepare('INSERT INTO workflows(id, candidate_id, type, status, updated_at, json) VALUES(?,?,?,?,?,?)').run(w.id, w.candidateId, w.type, w.status, w.updatedAt, JSON.stringify(w)) },
    update(w: WorkflowInstance) { db.prepare('UPDATE workflows SET status = ?, updated_at = ?, json = ? WHERE id = ?').run(w.status, w.updatedAt, JSON.stringify(w), w.id) },
    get: (id: string): WorkflowInstance | null => { const r = db.prepare('SELECT json FROM workflows WHERE id = ?').get(id); return r ? parse(r) : null },
    byCandidate: (cid: string): WorkflowInstance[] => parseAll(db.prepare('SELECT json FROM workflows WHERE candidate_id = ?').all(cid)),
    all: (): WorkflowInstance[] => parseAll(db.prepare('SELECT json FROM workflows').all()),
  },

  formDrafts: {
    insert(f: FormDraft) { db.prepare('INSERT INTO form_drafts(id, candidate_id, workflow_id, form_type, json) VALUES(?,?,?,?,?)').run(f.id, f.candidateId, f.workflowId, f.formType, JSON.stringify(f)) },
    update(f: FormDraft) { db.prepare('UPDATE form_drafts SET json = ? WHERE id = ?').run(JSON.stringify(f), f.id) },
    get: (id: string): FormDraft | null => { const r = db.prepare('SELECT json FROM form_drafts WHERE id = ?').get(id); return r ? parse(r) : null },
    byWorkflow: (wid: string): FormDraft | null => { const r = db.prepare('SELECT json FROM form_drafts WHERE workflow_id = ? ORDER BY rowid DESC LIMIT 1').get(wid); return r ? parse(r) : null },
  },

  qaReviews: {
    insert(q: QaReview) { db.prepare('INSERT INTO qa_reviews(id, candidate_id, workflow_id, status, created_at, json) VALUES(?,?,?,?,?,?)').run(q.id, q.candidateId, q.workflowId, q.status, q.createdAt, JSON.stringify(q)) },
    update(q: QaReview) { db.prepare('UPDATE qa_reviews SET status = ?, json = ? WHERE id = ?').run(q.status, JSON.stringify(q), q.id) },
    get: (id: string): QaReview | null => { const r = db.prepare('SELECT json FROM qa_reviews WHERE id = ?').get(id); return r ? parse(r) : null },
    byWorkflow: (wid: string): QaReview | null => { const r = db.prepare('SELECT json FROM qa_reviews WHERE workflow_id = ? ORDER BY created_at DESC LIMIT 1').get(wid); return r ? parse(r) : null },
    pending: (): QaReview[] => parseAll(db.prepare("SELECT json FROM qa_reviews WHERE status = 'pending' ORDER BY created_at").all()),
    all: (): QaReview[] => parseAll(db.prepare('SELECT json FROM qa_reviews').all()),
  },

  attestations: subRepoWf<CandidateAttestation>('attestations'),
  submissions: subRepoWf<SubmissionEvent>('submissions'),
  appointments: subRepoWf<AppointmentEvent>('appointments'),

  deficiencies: {
    insert(d: DeficiencyNotice) { db.prepare('INSERT INTO deficiencies(id, candidate_id, workflow_id, resolved, json) VALUES(?,?,?,?,?)').run(d.id, d.candidateId, d.workflowId, d.resolvedAt ? 1 : 0, JSON.stringify(d)) },
    update(d: DeficiencyNotice) { db.prepare('UPDATE deficiencies SET resolved = ?, json = ? WHERE id = ?').run(d.resolvedAt ? 1 : 0, JSON.stringify(d), d.id) },
    get: (id: string): DeficiencyNotice | null => { const r = db.prepare('SELECT json FROM deficiencies WHERE id = ?').get(id); return r ? parse(r) : null },
    byWorkflow: (wid: string): DeficiencyNotice[] => parseAll(db.prepare('SELECT json FROM deficiencies WHERE workflow_id = ?').all(wid)),
    all: (): DeficiencyNotice[] => parseAll(db.prepare('SELECT json FROM deficiencies').all()),
  },

  audit: {
    log(e: AuditEntry) { db.prepare('INSERT INTO audit_log(id, candidate_id, at, actor, entity, json) VALUES(?,?,?,?,?,?)').run(e.id, (e as any).candidateId ?? null, e.at, e.actor, e.entity, JSON.stringify(e)) },
    byCandidate: (cid: string): AuditEntry[] => parseAll(db.prepare('SELECT json FROM audit_log WHERE candidate_id = ? ORDER BY at DESC').all(cid)),
    recent: (limit = 100): AuditEntry[] => parseAll(db.prepare('SELECT json FROM audit_log ORDER BY at DESC LIMIT ?').all(limit)),
  },

  ledger: {
    insert(m: LedgerMilestone) { db.prepare('INSERT INTO ledger_milestones(id, candidate_id, workflow_id, milestone, pushed, at, json) VALUES(?,?,?,?,?,?,?)').run(m.id, m.candidateId, m.workflowId ?? null, m.milestone, m.pushedToLedger ? 1 : 0, m.at, JSON.stringify(m)) },
    byCandidate: (cid: string): LedgerMilestone[] => parseAll(db.prepare('SELECT json FROM ledger_milestones WHERE candidate_id = ? ORDER BY at').all(cid)),
    all: (): LedgerMilestone[] => parseAll(db.prepare('SELECT json FROM ledger_milestones ORDER BY at DESC').all()),
  },

  consularPaymentOrders: {
    insert(o: ConsularPaymentOrder) { db.prepare('INSERT INTO consular_payment_orders(id, candidate_id, status, updated_at, json) VALUES(?,?,?,?,?)').run(o.id, o.candidateId, o.status, o.updatedAt, JSON.stringify(o)) },
    update(o: ConsularPaymentOrder) { db.prepare('UPDATE consular_payment_orders SET status = ?, updated_at = ?, json = ? WHERE id = ?').run(o.status, o.updatedAt, JSON.stringify(o), o.id) },
    get: (id: string): ConsularPaymentOrder | null => { const r = db.prepare('SELECT json FROM consular_payment_orders WHERE id = ?').get(id); return r ? parse(r) : null },
    byCandidate: (cid: string): ConsularPaymentOrder[] => parseAll(db.prepare('SELECT json FROM consular_payment_orders WHERE candidate_id = ? ORDER BY updated_at DESC').all(cid)),
    all: (): ConsularPaymentOrder[] => parseAll(db.prepare('SELECT json FROM consular_payment_orders ORDER BY updated_at DESC').all()),
  },

  sevismateHandoffs: {
    insert(h: SevismateHandoff) { db.prepare('INSERT INTO sevismate_handoffs(id, candidate_id, payment_order_id, status, created_at, json) VALUES(?,?,?,?,?,?)').run(h.id, h.candidateId, h.paymentOrderId, h.status, h.createdAt, JSON.stringify(h)) },
    update(h: SevismateHandoff) { db.prepare('UPDATE sevismate_handoffs SET status = ?, json = ? WHERE id = ?').run(h.status, JSON.stringify(h), h.id) },
    get: (id: string): SevismateHandoff | null => { const r = db.prepare('SELECT json FROM sevismate_handoffs WHERE id = ?').get(id); return r ? parse(r) : null },
    byOrder: (oid: string): SevismateHandoff[] => parseAll(db.prepare('SELECT json FROM sevismate_handoffs WHERE payment_order_id = ? ORDER BY created_at DESC').all(oid)),
    byCandidate: (cid: string): SevismateHandoff[] => parseAll(db.prepare('SELECT json FROM sevismate_handoffs WHERE candidate_id = ? ORDER BY created_at DESC').all(cid)),
    all: (): SevismateHandoff[] => parseAll(db.prepare('SELECT json FROM sevismate_handoffs ORDER BY created_at DESC').all()),
  },

  i901Receipts: {
    insert(r: I901Receipt) { db.prepare('INSERT INTO i901_receipts(id, candidate_id, payment_order_id, qa_status, json) VALUES(?,?,?,?,?)').run(r.id, r.candidateId, r.paymentOrderId, r.qaStatus, JSON.stringify(r)) },
    update(r: I901Receipt) { db.prepare('UPDATE i901_receipts SET qa_status = ?, json = ? WHERE id = ?').run(r.qaStatus, JSON.stringify(r), r.id) },
    get: (id: string): I901Receipt | null => { const row = db.prepare('SELECT json FROM i901_receipts WHERE id = ?').get(id); return row ? parse(row) : null },
    byOrder: (oid: string): I901Receipt[] => parseAll(db.prepare('SELECT json FROM i901_receipts WHERE payment_order_id = ? ORDER BY rowid DESC').all(oid)),
    byCandidate: (cid: string): I901Receipt[] => parseAll(db.prepare('SELECT json FROM i901_receipts WHERE candidate_id = ? ORDER BY rowid DESC').all(cid)),
    all: (): I901Receipt[] => parseAll(db.prepare('SELECT json FROM i901_receipts').all()),
  },

  consularPaymentEvents: {
    insert(e: ConsularPaymentEvent) { db.prepare('INSERT INTO consular_payment_events(id, candidate_id, payment_order_id, event_type, occurred_at, json) VALUES(?,?,?,?,?,?)').run(e.id, e.candidateId, e.paymentOrderId, e.eventType, e.occurredAt, JSON.stringify(e)) },
    byOrder: (oid: string): ConsularPaymentEvent[] => parseAll(db.prepare('SELECT json FROM consular_payment_events WHERE payment_order_id = ? ORDER BY occurred_at').all(oid)),
    byCandidate: (cid: string): ConsularPaymentEvent[] => parseAll(db.prepare('SELECT json FROM consular_payment_events WHERE candidate_id = ? ORDER BY occurred_at DESC').all(cid)),
    all: (): ConsularPaymentEvent[] => parseAll(db.prepare('SELECT json FROM consular_payment_events ORDER BY occurred_at DESC').all()),
  },
}

/** Repo for tables keyed by candidate + workflow. */
function subRepoWf<T extends { id: string; candidateId: string; workflowId: string }>(table: string) {
  return {
    insert: (o: T) => { db.prepare(`INSERT INTO ${table}(id, candidate_id, workflow_id, json) VALUES(?,?,?,?)`).run(o.id, o.candidateId, o.workflowId, JSON.stringify(o)) },
    byWorkflow: (wid: string): T[] => parseAll<T>(db.prepare(`SELECT json FROM ${table} WHERE workflow_id = ?`).all(wid)),
    byCandidate: (cid: string): T[] => parseAll<T>(db.prepare(`SELECT json FROM ${table} WHERE candidate_id = ?`).all(cid)),
    all: (): T[] => parseAll<T>(db.prepare(`SELECT json FROM ${table}`).all()),
  }
}

/** Assemble the full read model for one candidate. */
export function getDossier(candidateId: string): CandidateDossier | null {
  const profile = store.candidates.get(candidateId)
  if (!profile) return null
  return {
    profile,
    identityDocuments: store.identityDocuments.byCandidate(candidateId),
    education: store.education.byCandidate(candidateId),
    employment: store.employment.byCandidate(candidateId),
    licenses: store.licenses.byCandidate(candidateId),
    visaHistory: store.visaHistory.byCandidate(candidateId),
    travelHistory: store.travelHistory.byCandidate(candidateId),
    schoolPrograms: store.schoolPrograms.byCandidate(candidateId),
    employerOffers: store.employerOffers.byCandidate(candidateId),
    financing: store.financing.byCandidate(candidateId),
    englishExams: store.englishExams.byCandidate(candidateId),
    nclex: store.nclex.byCandidate(candidateId),
    documents: store.documents.byCandidate(candidateId),
    workflows: store.workflows.byCandidate(candidateId),
    appointments: store.appointments.byCandidate(candidateId),
    consularPaymentOrders: store.consularPaymentOrders.byCandidate(candidateId),
    sevismateHandoffs: store.sevismateHandoffs.byCandidate(candidateId),
    i901Receipts: store.i901Receipts.byCandidate(candidateId),
  }
}

/** Convenience audit helper. */
export function audit(actor: AuditEntry['actor'], action: string, entity: string, entityId: string, candidateId?: string, detail?: string) {
  const canonicalAction = normalizeAuditAction(action)
  store.audit.log({
    id: uid(),
    at: now(),
    actor,
    action: canonicalAction,
    entity,
    entityId,
    detail: detailWithLegacyAction(action, canonicalAction, detail),
    ...(candidateId ? { candidateId } : {}),
  } as AuditEntry & { candidateId?: string })
}
