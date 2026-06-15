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
  LedgerMilestone, CandidateDossier,
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
CREATE INDEX IF NOT EXISTS idx_wf_candidate ON workflows(candidate_id);
CREATE INDEX IF NOT EXISTS idx_qa_status ON qa_reviews(status);
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
  }
}

/** Convenience audit helper. */
export function audit(actor: AuditEntry['actor'], action: string, entity: string, entityId: string, candidateId?: string, detail?: string) {
  store.audit.log({ id: uid(), at: now(), actor, action, entity, entityId, detail, ...(candidateId ? { candidateId } : {}) } as AuditEntry & { candidateId?: string })
}
