// ============================================================================
// Persistence — Postgres runtime adapter.
//
// The schema intentionally mirrors the legacy JSON-table shape so the runtime
// can move to networked Postgres without changing the domain model in this pass.
// ============================================================================

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  CandidateProfile, IdentityDocument, EducationRecord, EmploymentRecord,
  LicenseRecord, VisaHistoryRecord, TravelHistoryRecord, SchoolProgram,
  EmployerOffer, FinancingRecord, EnglishExam, NclexRegistration,
  PathwayDocument, WorkflowInstance, FormDraft, QaReview, CandidateAttestation,
  SubmissionEvent, AppointmentEvent, DeficiencyNotice, AuditEntry,
  LedgerMilestone, CandidateDossier, ConsularPaymentOrder, SevismateHandoff,
  I901Receipt, ConsularPaymentEvent, ConsularCase, DS160WorkbenchStatus,
  VisaAppointment, SevismateHandoffStatus, NotificationRecord,
} from '../shared/types'

interface PgResult<T = any> { rows: T[] }
interface PgClient {
  query<T = any>(text: string, params?: unknown[]): Promise<PgResult<T>>
}

async function connect(): Promise<{ client: PgClient; backend: 'postgres' | 'pglite-memory-dev' | 'pglite-file-dev' }> {
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl) {
    // @ts-ignore - pg is an optional runtime dependency installed for production.
    const pg = await import('pg').catch(() => {
      throw new Error("DATABASE_URL is set but the 'pg' package is not installed - run npm install in apps/pathway-api.")
    })
    const Pool = pg.default?.Pool ?? pg.Pool
    const pool = new Pool({ connectionString: databaseUrl })
    await pool.query('SELECT 1')
    return { client: pool, backend: 'postgres' }
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production; Pathway must use networked Postgres.')
  }

  const { PGlite } = await import('@electric-sql/pglite').catch(() => {
    throw new Error("DATABASE_URL is not set and '@electric-sql/pglite' is not installed - run npm install in apps/pathway-api.")
  })
  const dataDir = process.env.PGLITE_DATA_DIR
  const pglite = dataDir ? await PGlite.create(dataDir) : new PGlite()
  const schemaPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'schema.sql')
  await pglite.exec(await readFile(schemaPath, 'utf8'))
  await pglite.query('SELECT 1')
  return {
    client: {
      query: (text, params) => pglite.query(text, params as unknown[]),
    },
    backend: dataDir ? 'pglite-file-dev' : 'pglite-memory-dev',
  }
}

const connection = await connect()
const db = connection.client

export const databaseBackend = connection.backend
export async function migrationStatus() {
  try {
    const { rows } = await db.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('candidates', 'workflows', 'audit_log', 'consular_cases', 'ds160_workbench_statuses', 'visa_appointments')",
    )
    const found = new Set(rows.map((row) => row.table_name))
    return {
      ok: ['candidates', 'workflows', 'audit_log', 'consular_cases', 'ds160_workbench_statuses', 'visa_appointments'].every((table) => found.has(table)),
      schema: 'pathway-postgres-schema-v1',
    }
  } catch {
    return { ok: false, schema: 'pathway-postgres-schema-v1' }
  }
}

export const uid = (): string => (globalThis.crypto as Crypto).randomUUID()
export const now = (): string => new Date().toISOString()

const parseJson = <T>(value: unknown): T => {
  if (typeof value === 'string') return JSON.parse(value) as T
  return value as T
}
const one = async <T>(sql: string, params: unknown[]): Promise<T | null> => {
  const { rows } = await db.query<{ json: unknown }>(sql, params)
  return rows[0] ? parseJson<T>(rows[0].json) : null
}
const rows = async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
  const result = await db.query<{ json: unknown }>(sql, params)
  return result.rows.map((r) => parseJson<T>(r.json))
}

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

const FORCE_REDACTED_AUDIT_ACTIONS = new Set([
  'answer_provided',
  'attested',
  'reviewed_and_signed',
  'immigration.ds160_confirmation.recorded',
  'immigration.visa_outcome.recorded',
  'nclex.registration.recorded',
  'nclex.att.recorded',
  'visa_appointment_scheduled',
  'licensure.submission',
  'document.upload',
  'consular.i901_attestation',
  'consular.i901_receipt_qa',
])

function normalizeAuditAction(action: string): string {
  return AUDIT_ACTION_ALIASES[action] ?? action
}

function detailWithLegacyAction(action: string, canonicalAction: string, detail?: string): string | undefined {
  const prefix = action === canonicalAction ? '' : `legacyAction=${action};`
  if (!detail) return prefix ? prefix.slice(0, -1) : undefined
  return `${prefix}detail=[REDACTED]`
}

function subRepo<T extends { id: string; candidateId: string }>(table: string) {
  return {
    async insert(o: T) {
      await db.query(`INSERT INTO ${table}(id, candidate_id, json) VALUES($1, $2, $3::jsonb)`, [o.id, o.candidateId, JSON.stringify(o)])
    },
    async update(o: T) {
      await db.query(`UPDATE ${table} SET json = $1::jsonb WHERE id = $2`, [JSON.stringify(o), o.id])
    },
    byCandidate: (cid: string): Promise<T[]> => rows<T>(`SELECT json FROM ${table} WHERE candidate_id = $1`, [cid]),
    get: (id: string): Promise<T | null> => one<T>(`SELECT json FROM ${table} WHERE id = $1`, [id]),
    all: (): Promise<T[]> => rows<T>(`SELECT json FROM ${table}`),
  }
}

function subRepoWf<T extends { id: string; candidateId: string; workflowId: string }>(table: string) {
  return {
    async insert(o: T) {
      await db.query(`INSERT INTO ${table}(id, candidate_id, workflow_id, json) VALUES($1, $2, $3, $4::jsonb)`, [o.id, o.candidateId, o.workflowId, JSON.stringify(o)])
    },
    byWorkflow: (wid: string): Promise<T[]> => rows<T>(`SELECT json FROM ${table} WHERE workflow_id = $1`, [wid]),
    byCandidate: (cid: string): Promise<T[]> => rows<T>(`SELECT json FROM ${table} WHERE candidate_id = $1`, [cid]),
    all: (): Promise<T[]> => rows<T>(`SELECT json FROM ${table}`),
  }
}

export const store = {
  candidates: {
    async insert(c: CandidateProfile) {
      await db.query('INSERT INTO candidates(id, created_at, json) VALUES($1, $2, $3::jsonb)', [c.id, c.createdAt, JSON.stringify(c)])
    },
    async update(c: CandidateProfile) {
      await db.query('UPDATE candidates SET json = $1::jsonb WHERE id = $2', [JSON.stringify(c), c.id])
    },
    get: (id: string): Promise<CandidateProfile | null> => one<CandidateProfile>('SELECT json FROM candidates WHERE id = $1', [id]),
    all: (): Promise<CandidateProfile[]> => rows<CandidateProfile>('SELECT json FROM candidates ORDER BY created_at'),
    async count(): Promise<number> {
      const { rows } = await db.query<{ n: string | number }>('SELECT COUNT(*) AS n FROM candidates')
      return Number(rows[0]?.n ?? 0)
    },
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
    async insert(w: WorkflowInstance) {
      await db.query('INSERT INTO workflows(id, candidate_id, type, status, updated_at, json) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [w.id, w.candidateId, w.type, w.status, w.updatedAt, JSON.stringify(w)])
    },
    async update(w: WorkflowInstance) {
      await db.query('UPDATE workflows SET status = $1, updated_at = $2, json = $3::jsonb WHERE id = $4', [w.status, w.updatedAt, JSON.stringify(w), w.id])
    },
    get: (id: string): Promise<WorkflowInstance | null> => one<WorkflowInstance>('SELECT json FROM workflows WHERE id = $1', [id]),
    byCandidate: (cid: string): Promise<WorkflowInstance[]> => rows<WorkflowInstance>('SELECT json FROM workflows WHERE candidate_id = $1', [cid]),
    all: (): Promise<WorkflowInstance[]> => rows<WorkflowInstance>('SELECT json FROM workflows'),
  },

  formDrafts: {
    async insert(f: FormDraft) {
      await db.query('INSERT INTO form_drafts(id, candidate_id, workflow_id, form_type, json) VALUES($1,$2,$3,$4,$5::jsonb)', [f.id, f.candidateId, f.workflowId, f.formType, JSON.stringify(f)])
    },
    async update(f: FormDraft) {
      await db.query('UPDATE form_drafts SET json = $1::jsonb WHERE id = $2', [JSON.stringify(f), f.id])
    },
    get: (id: string): Promise<FormDraft | null> => one<FormDraft>('SELECT json FROM form_drafts WHERE id = $1', [id]),
    byWorkflow: (wid: string): Promise<FormDraft | null> => one<FormDraft>('SELECT json FROM form_drafts WHERE workflow_id = $1 LIMIT 1', [wid]),
  },

  qaReviews: {
    async insert(q: QaReview) {
      await db.query('INSERT INTO qa_reviews(id, candidate_id, workflow_id, status, created_at, json) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [q.id, q.candidateId, q.workflowId, q.status, q.createdAt, JSON.stringify(q)])
    },
    async update(q: QaReview) {
      await db.query('UPDATE qa_reviews SET status = $1, json = $2::jsonb WHERE id = $3', [q.status, JSON.stringify(q), q.id])
    },
    get: (id: string): Promise<QaReview | null> => one<QaReview>('SELECT json FROM qa_reviews WHERE id = $1', [id]),
    byWorkflow: (wid: string): Promise<QaReview | null> => one<QaReview>('SELECT json FROM qa_reviews WHERE workflow_id = $1 ORDER BY created_at DESC LIMIT 1', [wid]),
    pending: (): Promise<QaReview[]> => rows<QaReview>("SELECT json FROM qa_reviews WHERE status = 'pending' ORDER BY created_at"),
    all: (): Promise<QaReview[]> => rows<QaReview>('SELECT json FROM qa_reviews'),
  },

  attestations: subRepoWf<CandidateAttestation>('attestations'),
  submissions: subRepoWf<SubmissionEvent>('submissions'),
  appointments: subRepoWf<AppointmentEvent>('appointments'),
  consularCases: {
    async insert(c: ConsularCase) {
      await db.query('INSERT INTO consular_cases(id, candidate_id, status, updated_at, json) VALUES($1,$2,$3,$4,$5::jsonb)', [c.id, c.candidateId, c.status, c.updatedAt, JSON.stringify(c)])
    },
    async update(c: ConsularCase) {
      await db.query('UPDATE consular_cases SET status = $1, updated_at = $2, json = $3::jsonb WHERE id = $4', [c.status, c.updatedAt, JSON.stringify(c), c.id])
    },
    get: (id: string): Promise<ConsularCase | null> => one<ConsularCase>('SELECT json FROM consular_cases WHERE id = $1', [id]),
    byCandidate: (cid: string): Promise<ConsularCase[]> => rows<ConsularCase>('SELECT json FROM consular_cases WHERE candidate_id = $1 ORDER BY updated_at DESC', [cid]),
    all: (): Promise<ConsularCase[]> => rows<ConsularCase>('SELECT json FROM consular_cases ORDER BY updated_at DESC'),
  },
  ds160WorkbenchStatuses: {
    async insert(s: DS160WorkbenchStatus) {
      await db.query('INSERT INTO ds160_workbench_statuses(id, candidate_id, workflow_id, status, updated_at, json) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [s.id, s.candidateId, s.workflowId, s.status, s.updatedAt, JSON.stringify(s)])
    },
    async update(s: DS160WorkbenchStatus) {
      await db.query('UPDATE ds160_workbench_statuses SET status = $1, updated_at = $2, json = $3::jsonb WHERE id = $4', [s.status, s.updatedAt, JSON.stringify(s), s.id])
    },
    get: (id: string): Promise<DS160WorkbenchStatus | null> => one<DS160WorkbenchStatus>('SELECT json FROM ds160_workbench_statuses WHERE id = $1', [id]),
    byWorkflow: (wid: string): Promise<DS160WorkbenchStatus[]> => rows<DS160WorkbenchStatus>('SELECT json FROM ds160_workbench_statuses WHERE workflow_id = $1 ORDER BY updated_at DESC', [wid]),
    byCandidate: (cid: string): Promise<DS160WorkbenchStatus[]> => rows<DS160WorkbenchStatus>('SELECT json FROM ds160_workbench_statuses WHERE candidate_id = $1 ORDER BY updated_at DESC', [cid]),
    all: (): Promise<DS160WorkbenchStatus[]> => rows<DS160WorkbenchStatus>('SELECT json FROM ds160_workbench_statuses ORDER BY updated_at DESC'),
  },
  visaAppointments: {
    async insert(v: VisaAppointment) {
      await db.query('INSERT INTO visa_appointments(id, candidate_id, workflow_id, status, updated_at, json) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [v.id, v.candidateId, v.workflowId, v.status, v.updatedAt, JSON.stringify(v)])
    },
    async update(v: VisaAppointment) {
      await db.query('UPDATE visa_appointments SET status = $1, updated_at = $2, json = $3::jsonb WHERE id = $4', [v.status, v.updatedAt, JSON.stringify(v), v.id])
    },
    get: (id: string): Promise<VisaAppointment | null> => one<VisaAppointment>('SELECT json FROM visa_appointments WHERE id = $1', [id]),
    byWorkflow: (wid: string): Promise<VisaAppointment[]> => rows<VisaAppointment>('SELECT json FROM visa_appointments WHERE workflow_id = $1 ORDER BY updated_at DESC', [wid]),
    byCandidate: (cid: string): Promise<VisaAppointment[]> => rows<VisaAppointment>('SELECT json FROM visa_appointments WHERE candidate_id = $1 ORDER BY updated_at DESC', [cid]),
    all: (): Promise<VisaAppointment[]> => rows<VisaAppointment>('SELECT json FROM visa_appointments ORDER BY updated_at DESC'),
  },

  deficiencies: {
    async insert(d: DeficiencyNotice) {
      await db.query('INSERT INTO deficiencies(id, candidate_id, workflow_id, resolved, json) VALUES($1,$2,$3,$4,$5::jsonb)', [d.id, d.candidateId, d.workflowId, d.resolvedAt ? 1 : 0, JSON.stringify(d)])
    },
    async update(d: DeficiencyNotice) {
      await db.query('UPDATE deficiencies SET resolved = $1, json = $2::jsonb WHERE id = $3', [d.resolvedAt ? 1 : 0, JSON.stringify(d), d.id])
    },
    get: (id: string): Promise<DeficiencyNotice | null> => one<DeficiencyNotice>('SELECT json FROM deficiencies WHERE id = $1', [id]),
    byWorkflow: (wid: string): Promise<DeficiencyNotice[]> => rows<DeficiencyNotice>('SELECT json FROM deficiencies WHERE workflow_id = $1', [wid]),
    all: (): Promise<DeficiencyNotice[]> => rows<DeficiencyNotice>('SELECT json FROM deficiencies'),
  },

  notifications: {
    async insert(n: NotificationRecord) {
      await db.query('INSERT INTO notifications(id, candidate_id, dedupe_key, created_at, json) VALUES($1,$2,$3,$4,$5::jsonb)', [n.id, n.candidateId, n.dedupeKey ?? null, n.createdAt, JSON.stringify(n)])
    },
    byCandidate: (cid: string, limit = 50): Promise<NotificationRecord[]> => rows<NotificationRecord>('SELECT json FROM notifications WHERE candidate_id = $1 ORDER BY created_at DESC LIMIT $2', [cid, limit]),
    recent: (limit = 100): Promise<NotificationRecord[]> => rows<NotificationRecord>('SELECT json FROM notifications ORDER BY created_at DESC LIMIT $1', [limit]),
    byDedupeKey: (cid: string, key: string): Promise<NotificationRecord | null> => one<NotificationRecord>('SELECT json FROM notifications WHERE candidate_id = $1 AND dedupe_key = $2 LIMIT 1', [cid, key]),
  },

  ruleSnapshots: {
    get: (id: string): Promise<unknown | null> => one<unknown>('SELECT json FROM rule_snapshots WHERE id = $1', [id]),
    async upsert(id: string, snap: unknown) {
      await db.query('INSERT INTO rule_snapshots(id, json) VALUES($1,$2::jsonb) ON CONFLICT(id) DO UPDATE SET json = EXCLUDED.json', [id, JSON.stringify(snap)])
    },
    all: (): Promise<unknown[]> => rows<unknown>('SELECT json FROM rule_snapshots'),
  },

  intakeChecks: {
    get: (id: string): Promise<unknown | null> => one<unknown>('SELECT json FROM intake_checks WHERE id = $1', [id]),
    async upsert(id: string, check: unknown) {
      await db.query('INSERT INTO intake_checks(id, json) VALUES($1,$2::jsonb) ON CONFLICT(id) DO UPDATE SET json = EXCLUDED.json', [id, JSON.stringify(check)])
    },
    all: (): Promise<unknown[]> => rows<unknown>('SELECT json FROM intake_checks'),
  },

  audit: {
    async log(e: AuditEntry & { candidateId?: string }) {
      await db.query('INSERT INTO audit_log(id, candidate_id, at, actor, entity, json) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [e.id, e.candidateId ?? null, e.at, e.actor, e.entity, JSON.stringify(e)])
    },
    byCandidate: (cid: string): Promise<AuditEntry[]> => rows<AuditEntry>('SELECT json FROM audit_log WHERE candidate_id = $1 ORDER BY at DESC', [cid]),
    recent: (limit = 100): Promise<AuditEntry[]> => rows<AuditEntry>('SELECT json FROM audit_log ORDER BY at DESC LIMIT $1', [limit]),
  },

  ledger: {
    async insert(m: LedgerMilestone) {
      await db.query('INSERT INTO ledger_milestones(id, candidate_id, workflow_id, milestone, pushed, at, json) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)', [m.id, m.candidateId, m.workflowId ?? null, m.milestone, m.pushedToLedger ? 1 : 0, m.at, JSON.stringify(m)])
    },
    byCandidate: (cid: string): Promise<LedgerMilestone[]> => rows<LedgerMilestone>('SELECT json FROM ledger_milestones WHERE candidate_id = $1 ORDER BY at', [cid]),
    all: (): Promise<LedgerMilestone[]> => rows<LedgerMilestone>('SELECT json FROM ledger_milestones ORDER BY at DESC'),
  },

  consularPaymentOrders: {
    async insert(o: ConsularPaymentOrder) {
      await db.query('INSERT INTO consular_payment_orders(id, candidate_id, status, updated_at, json) VALUES($1,$2,$3,$4,$5::jsonb)', [o.id, o.candidateId, o.status, o.updatedAt, JSON.stringify(o)])
    },
    async update(o: ConsularPaymentOrder) {
      await db.query('UPDATE consular_payment_orders SET status = $1, updated_at = $2, json = $3::jsonb WHERE id = $4', [o.status, o.updatedAt, JSON.stringify(o), o.id])
    },
    get: (id: string): Promise<ConsularPaymentOrder | null> => one<ConsularPaymentOrder>('SELECT json FROM consular_payment_orders WHERE id = $1', [id]),
    byCandidate: (cid: string): Promise<ConsularPaymentOrder[]> => rows<ConsularPaymentOrder>('SELECT json FROM consular_payment_orders WHERE candidate_id = $1 ORDER BY updated_at DESC', [cid]),
    all: (): Promise<ConsularPaymentOrder[]> => rows<ConsularPaymentOrder>('SELECT json FROM consular_payment_orders ORDER BY updated_at DESC'),
  },

  sevismateHandoffs: {
    async insert(h: SevismateHandoff) {
      await db.query('INSERT INTO sevismate_handoffs(id, candidate_id, payment_order_id, status, created_at, json) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [h.id, h.candidateId, h.paymentOrderId, h.status, h.createdAt, JSON.stringify(h)])
    },
    async update(h: SevismateHandoff) {
      await db.query('UPDATE sevismate_handoffs SET status = $1, json = $2::jsonb WHERE id = $3', [h.status, JSON.stringify(h), h.id])
    },
    get: (id: string): Promise<SevismateHandoff | null> => one<SevismateHandoff>('SELECT json FROM sevismate_handoffs WHERE id = $1', [id]),
    byOrder: (oid: string): Promise<SevismateHandoff[]> => rows<SevismateHandoff>('SELECT json FROM sevismate_handoffs WHERE payment_order_id = $1 ORDER BY created_at DESC', [oid]),
    byCandidate: (cid: string): Promise<SevismateHandoff[]> => rows<SevismateHandoff>('SELECT json FROM sevismate_handoffs WHERE candidate_id = $1 ORDER BY created_at DESC', [cid]),
    all: (): Promise<SevismateHandoff[]> => rows<SevismateHandoff>('SELECT json FROM sevismate_handoffs ORDER BY created_at DESC'),
  },

  sevismateHandoffStatuses: {
    async insert(s: SevismateHandoffStatus) {
      await db.query('INSERT INTO sevismate_handoff_statuses(id, candidate_id, payment_order_id, handoff_id, status, updated_at, json) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)', [s.id, s.candidateId, s.paymentOrderId, s.handoffId, s.status, s.updatedAt, JSON.stringify(s)])
    },
    async update(s: SevismateHandoffStatus) {
      await db.query('UPDATE sevismate_handoff_statuses SET status = $1, updated_at = $2, json = $3::jsonb WHERE id = $4', [s.status, s.updatedAt, JSON.stringify(s), s.id])
    },
    get: (id: string): Promise<SevismateHandoffStatus | null> => one<SevismateHandoffStatus>('SELECT json FROM sevismate_handoff_statuses WHERE id = $1', [id]),
    byHandoff: (hid: string): Promise<SevismateHandoffStatus | null> => one<SevismateHandoffStatus>('SELECT json FROM sevismate_handoff_statuses WHERE handoff_id = $1 LIMIT 1', [hid]),
    byOrder: (oid: string): Promise<SevismateHandoffStatus[]> => rows<SevismateHandoffStatus>('SELECT json FROM sevismate_handoff_statuses WHERE payment_order_id = $1 ORDER BY updated_at DESC', [oid]),
    byCandidate: (cid: string): Promise<SevismateHandoffStatus[]> => rows<SevismateHandoffStatus>('SELECT json FROM sevismate_handoff_statuses WHERE candidate_id = $1 ORDER BY updated_at DESC', [cid]),
    all: (): Promise<SevismateHandoffStatus[]> => rows<SevismateHandoffStatus>('SELECT json FROM sevismate_handoff_statuses ORDER BY updated_at DESC'),
  },

  i901Receipts: {
    async insert(r: I901Receipt) {
      await db.query('INSERT INTO i901_receipts(id, candidate_id, payment_order_id, qa_status, json) VALUES($1,$2,$3,$4,$5::jsonb)', [r.id, r.candidateId, r.paymentOrderId, r.qaStatus, JSON.stringify(r)])
    },
    async update(r: I901Receipt) {
      await db.query('UPDATE i901_receipts SET qa_status = $1, json = $2::jsonb WHERE id = $3', [r.qaStatus, JSON.stringify(r), r.id])
    },
    get: (id: string): Promise<I901Receipt | null> => one<I901Receipt>('SELECT json FROM i901_receipts WHERE id = $1', [id]),
    byOrder: (oid: string): Promise<I901Receipt[]> => rows<I901Receipt>("SELECT json FROM i901_receipts WHERE payment_order_id = $1 ORDER BY COALESCE(json->>'receivedAt', '') DESC, id DESC", [oid]),
    byCandidate: (cid: string): Promise<I901Receipt[]> => rows<I901Receipt>("SELECT json FROM i901_receipts WHERE candidate_id = $1 ORDER BY COALESCE(json->>'receivedAt', '') DESC, id DESC", [cid]),
    all: (): Promise<I901Receipt[]> => rows<I901Receipt>('SELECT json FROM i901_receipts'),
  },

  consularPaymentEvents: {
    async insert(e: ConsularPaymentEvent) {
      await db.query('INSERT INTO consular_payment_events(id, candidate_id, payment_order_id, event_type, occurred_at, json) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [e.id, e.candidateId, e.paymentOrderId, e.eventType, e.occurredAt, JSON.stringify(e)])
    },
    byOrder: (oid: string): Promise<ConsularPaymentEvent[]> => rows<ConsularPaymentEvent>('SELECT json FROM consular_payment_events WHERE payment_order_id = $1 ORDER BY occurred_at', [oid]),
    byCandidate: (cid: string): Promise<ConsularPaymentEvent[]> => rows<ConsularPaymentEvent>('SELECT json FROM consular_payment_events WHERE candidate_id = $1 ORDER BY occurred_at DESC', [cid]),
    all: (): Promise<ConsularPaymentEvent[]> => rows<ConsularPaymentEvent>('SELECT json FROM consular_payment_events ORDER BY occurred_at DESC'),
  },
}

export async function getDossier(candidateId: string): Promise<CandidateDossier | null> {
  const profile = await store.candidates.get(candidateId)
  if (!profile) return null
  const [
    identityDocuments,
    education,
    employment,
    licenses,
    visaHistory,
    travelHistory,
    schoolPrograms,
    employerOffers,
    financing,
    englishExams,
    nclex,
    documents,
    workflows,
    appointments,
    consularCases,
    ds160WorkbenchStatuses,
    visaAppointments,
    consularPaymentOrders,
    sevismateHandoffs,
    sevismateHandoffStatuses,
    i901Receipts,
  ] = await Promise.all([
    store.identityDocuments.byCandidate(candidateId),
    store.education.byCandidate(candidateId),
    store.employment.byCandidate(candidateId),
    store.licenses.byCandidate(candidateId),
    store.visaHistory.byCandidate(candidateId),
    store.travelHistory.byCandidate(candidateId),
    store.schoolPrograms.byCandidate(candidateId),
    store.employerOffers.byCandidate(candidateId),
    store.financing.byCandidate(candidateId),
    store.englishExams.byCandidate(candidateId),
    store.nclex.byCandidate(candidateId),
    store.documents.byCandidate(candidateId),
    store.workflows.byCandidate(candidateId),
    store.appointments.byCandidate(candidateId),
    store.consularCases.byCandidate(candidateId),
    store.ds160WorkbenchStatuses.byCandidate(candidateId),
    store.visaAppointments.byCandidate(candidateId),
    store.consularPaymentOrders.byCandidate(candidateId),
    store.sevismateHandoffs.byCandidate(candidateId),
    store.sevismateHandoffStatuses.byCandidate(candidateId),
    store.i901Receipts.byCandidate(candidateId),
  ])
  return {
    profile,
    identityDocuments,
    education,
    employment,
    licenses,
    visaHistory,
    travelHistory,
    schoolPrograms,
    employerOffers,
    financing,
    englishExams,
    nclex,
    documents,
    workflows,
    appointments,
    consularCases,
    ds160WorkbenchStatuses,
    visaAppointments,
    consularPaymentOrders,
    sevismateHandoffs,
    sevismateHandoffStatuses,
    i901Receipts,
  }
}

export async function audit(actor: AuditEntry['actor'], action: string, entity: string, entityId: string, candidateId?: string, detail?: string): Promise<void> {
  const canonicalAction = normalizeAuditAction(action)
  await store.audit.log({
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
