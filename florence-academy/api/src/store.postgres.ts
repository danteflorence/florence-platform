// Production storage adapter. Implements the async `Store` interface against
// Postgres (db/schema.sql), with column encryption for PII/financial fields.
//
// It talks to a minimal `SqlClient` so it's driver-agnostic and unit-testable
// with a fake (see test/postgres.ts). `createPgClient` wires the real `pg`
// driver, lazily imported so the reference build needs no dependency.

import type { FieldCrypto } from "./crypto.ts";
import type {
  ApiClient,
  AssessmentResult,
  AttendanceRecord,
  AttendanceStatus,
  Candidate,
  CandidateCredential,
  CandidateSchoolAffiliation,
  Cohort,
  Enrollment,
  EnrollmentStatus,
  OutcomeEvent,
  OutcomeKind,
  OutreachStatus,
  PathwayTaskEvent,
  PathwayTaskKind,
  PathwayTaskStatus,
  Payment,
  ProgressRecord,
  School,
  SchoolTier,
} from "./types.ts";
import type {
  AffiliationInput,
  AssessmentInput,
  AttendanceInput,
  CandidateInput,
  CandidatePatch,
  CohortInput,
  CohortPatch,
  CredentialInput,
  EnrollmentInput,
  LeadInput,
  LeadListFilters,
  LeadRollup,
  OutcomeInput,
  Page,
  PathwayTaskInput,
  PaymentInput,
  ProgressInput,
  RemediationInput,
  ResponseInput,
  SchoolInput,
  SchoolPatch,
  Store,
} from "./store.ts";
import { walkthroughBodyHash, contentHash, rollupAnalytics } from "./store.ts";
import type { Lead, LeadEvent, RemediationAssignment, RemediationStatus } from "./types.ts";
import type { Walkthrough, WalkthroughStatus, WalkthroughUpsertInput } from "./walkthroughTypes.ts";
import { emptyLinkedContent } from "./walkthroughTypes.ts";
import type { QuestionResponse, QuestionAnalytics } from "./types.ts";
import {
  buildAssessment,
  buildAttendance,
  buildOutcome,
  buildPathwayTask,
  clampPct,
  computeAttendanceRollup,
  computeOutcomeFunnel,
  MemoryStore,
  newId,
  newToken,
} from "./store.ts";

export interface SqlClient {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

/** Wire the real `pg` driver. `pg` is imported lazily so it's optional. */
export async function createPgClient(connectionString: string): Promise<SqlClient> {
  let pg: any;
  try {
    const spec = "pg"; // non-literal: keeps tsc from requiring @types/pg
    pg = await import(spec);
  } catch {
    throw new Error("the 'pg' package is not installed — run `npm i pg` in api/");
  }
  const Pool = pg.default?.Pool ?? pg.Pool;
  const pool = new Pool({ connectionString });
  return {
    query: async <T>(text: string, params?: unknown[]) =>
      (await pool.query(text, params)).rows as T[],
  };
}

const iso = (v: unknown): string => new Date(v as string | number | Date).toISOString();

export class PostgresStore implements Store {
  private sql: SqlClient;
  private fc: FieldCrypto;

  constructor(sql: SqlClient, fieldCrypto: FieldCrypto) {
    this.sql = sql;
    this.fc = fieldCrypto;
  }

  // ── cursor (keyset on created_at, id) ──────────────────────────────────────
  private decodeCursor(c?: string): { ts: string; id: string } | null {
    if (!c) return null;
    try {
      const [ts, id] = Buffer.from(c, "base64url").toString("utf8").split("|");
      return ts && id ? { ts, id } : null;
    } catch {
      return null;
    }
  }
  private encodeCursor(row: { created_at: string; id: string }): string {
    return Buffer.from(`${row.created_at}|${row.id}`).toString("base64url");
  }

  private async listTable<T extends { id: string; created_at: string }>(
    table: string,
    mapRow: (r: Record<string, unknown>) => T | Promise<T>,
    cursor: string | undefined,
    limit: number,
    candidateId?: string,
  ): Promise<Page<T>> {
    const k = this.decodeCursor(cursor);
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (candidateId) {
      params.push(candidateId);
      clauses.push(`candidate_id = $${params.length}`);
    }
    if (k) {
      params.push(k.ts);
      const a = params.length;
      params.push(k.id);
      const b = params.length;
      clauses.push(`(created_at, id) > ($${a}, $${b})`);
    }
    params.push(limit + 1);
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = await this.sql.query<Record<string, unknown>>(
      `SELECT * FROM ${table} ${where} ORDER BY created_at, id LIMIT $${params.length}`,
      params,
    );
    const more = rows.length > limit;
    const data = await Promise.all(rows.slice(0, limit).map(mapRow));
    const last = data.length > 0 ? data[data.length - 1] : undefined;
    return { data, next_cursor: more && last ? this.encodeCursor(last) : null };
  }

  // ── row mappers ────────────────────────────────────────────────────────────
  private toCandidate = async (r: Record<string, unknown>): Promise<Candidate> => ({
    id: String(r["id"]),
    full_name: String(r["full_name"]),
    consent: (r["consent"] as Candidate["consent"]) ?? {},
    email_verified: Boolean(r["email_verified"]),
    created_at: iso(r["created_at"]),
    updated_at: iso(r["updated_at"]),
    ...(r["external_ref"] != null && { external_ref: String(r["external_ref"]) }),
    ...(r["email_enc"] != null && { email: await this.fc.decrypt(String(r["email_enc"])) }),
    ...(r["phone_enc"] != null && { phone: await this.fc.decrypt(String(r["phone_enc"])) }),
    ...(r["country"] != null && { country: String(r["country"]) }),
  });
  private toEnrollment = (r: Record<string, unknown>): Enrollment => ({
    id: String(r["id"]),
    candidate_id: String(r["candidate_id"]),
    cohort: String(r["cohort"]),
    status: String(r["status"]) as EnrollmentStatus,
    created_at: iso(r["created_at"]),
    updated_at: iso(r["updated_at"]),
  });
  private toAssessment = (r: Record<string, unknown>): AssessmentResult => ({
    id: String(r["id"]),
    candidate_id: String(r["candidate_id"]),
    kind: String(r["kind"]) as AssessmentResult["kind"],
    content_hash: String(r["content_hash"]),
    created_at: iso(r["created_at"]),
    ...(r["readiness"] != null && { readiness: Number(r["readiness"]) }),
    ...(r["theta"] != null && { theta: Number(r["theta"]) }),
    ...(r["items_completed"] != null && { items_completed: Number(r["items_completed"]) }),
    ...(r["by_client_need"] != null && {
      by_client_need: r["by_client_need"] as Record<string, number>,
    }),
    ...(r["supersedes"] != null && { supersedes: String(r["supersedes"]) }),
  });
  private toPayment = async (r: Record<string, unknown>): Promise<Payment> => ({
    id: String(r["id"]),
    candidate_id: String(r["candidate_id"]),
    kind: String(r["kind"]) as Payment["kind"],
    amount_cents: Number(r["amount_cents"]),
    currency: String(r["currency"]),
    status: String(r["status"]) as Payment["status"],
    created_at: iso(r["created_at"]),
    updated_at: iso(r["updated_at"]),
    ...(r["processor"] != null && { processor: String(r["processor"]) }),
    ...(r["processor_ref_enc"] != null && {
      processor_ref: await this.fc.decrypt(String(r["processor_ref_enc"])),
    }),
  });
  private toCohort = (r: Record<string, unknown>): Cohort => ({
    id: String(r["id"]),
    code: String(r["code"]),
    name: String(r["name"]),
    status: String(r["status"]) as Cohort["status"],
    created_at: iso(r["created_at"]),
    updated_at: iso(r["updated_at"]),
    ...(r["starts_at"] != null && { starts_at: iso(r["starts_at"]) }),
    ...(r["capacity"] != null && { capacity: Number(r["capacity"]) }),
    ...(r["instructor_ref"] != null && { instructor_ref: String(r["instructor_ref"]) }),
    ...(r["covered_through_section"] != null && {
      covered_through_section: Number(r["covered_through_section"]),
    }),
  });
  private toClient = (r: Record<string, unknown>): ApiClient => ({
    client_id: String(r["client_id"]),
    name: String(r["name"]),
    secret_hash: String(r["secret_hash"]),
    allowed_scopes: (r["allowed_scopes"] as ApiClient["allowed_scopes"]) ?? [],
    active: Boolean(r["active"]),
  });
  private toCredential = (r: Record<string, unknown>): CandidateCredential => ({
    candidate_id: String(r["candidate_id"]),
    email: String(r["email"]),
    password_hash: String(r["password_hash"]),
    created_at: iso(r["created_at"]),
  });
  private toProgress = (r: Record<string, unknown>): ProgressRecord => ({
    candidate_id: String(r["candidate_id"]),
    section_slug: String(r["section_slug"]),
    status: String(r["status"]) as ProgressRecord["status"],
    percent: Number(r["percent"]),
    updated_at: iso(r["updated_at"]),
    ...(r["last_segment"] != null && { last_segment: String(r["last_segment"]) }),
  });
  private toSchool = (r: Record<string, unknown>): School => ({
    id: String(r["id"]),
    slug: String(r["slug"]),
    name: String(r["name"]),
    country: String(r["country"]),
    tier: String(r["tier"]) as SchoolTier,
    logo_use_granted: Boolean(r["logo_use_granted"]),
    outreach_status: String(r["outreach_status"]) as OutreachStatus,
    created_at: iso(r["created_at"]),
    updated_at: iso(r["updated_at"]),
    ...(r["city"] != null && { city: String(r["city"]) }),
    ...(r["programs"] != null && { programs: r["programs"] as string[] }),
    ...(r["email_domains"] != null && { email_domains: r["email_domains"] as string[] }),
    ...(r["contact_email"] != null && { contact_email: String(r["contact_email"]) }),
  });
  private toPathwayTask = (r: Record<string, unknown>): PathwayTaskEvent => ({
    id: String(r["id"]),
    candidate_id: String(r["candidate_id"]),
    kind: String(r["kind"]) as PathwayTaskKind,
    status: String(r["status"]) as PathwayTaskStatus,
    content_hash: String(r["content_hash"]),
    created_at: iso(r["created_at"]),
    ...(r["note"] != null && { note: String(r["note"]) }),
  });
  private toAffiliation = (r: Record<string, unknown>): CandidateSchoolAffiliation => ({
    candidate_id: String(r["candidate_id"]),
    school_slug: String(r["school_slug"]),
    role: String(r["role"]) as CandidateSchoolAffiliation["role"],
    verification: String(r["verification"]) as CandidateSchoolAffiliation["verification"],
    created_at: iso(r["created_at"]),
  });
  private toAttendance = (r: Record<string, unknown>): AttendanceRecord => ({
    id: String(r["id"]),
    candidate_id: String(r["candidate_id"]),
    session_date: iso(r["session_date"]).slice(0, 10),
    status: String(r["status"]) as AttendanceStatus,
    content_hash: String(r["content_hash"]),
    created_at: iso(r["created_at"]),
    ...(r["cohort"] != null && { cohort: String(r["cohort"]) }),
    ...(r["location"] != null && { location: String(r["location"]) }),
  });
  private toOutcome = (r: Record<string, unknown>): OutcomeEvent => ({
    id: String(r["id"]),
    candidate_id: String(r["candidate_id"]),
    kind: String(r["kind"]) as OutcomeKind,
    content_hash: String(r["content_hash"]),
    occurred_at: iso(r["occurred_at"]),
    created_at: iso(r["created_at"]),
    ...(r["status"] != null && { status: String(r["status"]) }),
    ...(r["amount_cents"] != null && { amount_cents: Number(r["amount_cents"]) }),
    ...(r["detail"] != null && { detail: r["detail"] as Record<string, unknown> }),
  });

  // ── clients ────────────────────────────────────────────────────────────────
  clients = {
    get: async (clientId: string): Promise<ApiClient | undefined> => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM api_clients WHERE client_id = $1`,
        [clientId],
      );
      return rows[0] ? this.toClient(rows[0]) : undefined;
    },
    create: async (client: ApiClient): Promise<ApiClient> => {
      await this.sql.query(
        `INSERT INTO api_clients (client_id, name, secret_hash, allowed_scopes, active)
         VALUES ($1, $2, $3, $4, $5)`,
        [client.client_id, client.name, client.secret_hash, client.allowed_scopes, client.active],
      );
      return client;
    },
    rotateSecret: async (clientId: string, secretHash: string) => {
      await this.sql.query(`UPDATE api_clients SET secret_hash = $2 WHERE client_id = $1`, [
        clientId,
        secretHash,
      ]);
      return this.clients.get(clientId);
    },
    list: async (): Promise<ApiClient[]> => {
      const rows = await this.sql.query<Record<string, unknown>>(`SELECT * FROM api_clients`);
      return rows.map(this.toClient);
    },
  };

  // ── cohorts ─────────────────────────────────────────────────────────────
  cohorts = {
    create: async (input: CohortInput): Promise<Cohort> => {
      const now = new Date().toISOString();
      const c: Cohort = {
        id: newId("cohort"),
        code: input.code,
        name: input.name,
        status: input.status ?? "scheduled",
        created_at: now,
        updated_at: now,
        ...(input.starts_at !== undefined && { starts_at: input.starts_at }),
        ...(input.capacity !== undefined && { capacity: input.capacity }),
        ...(input.instructor_ref !== undefined && { instructor_ref: input.instructor_ref }),
        ...(input.covered_through_section !== undefined && {
          covered_through_section: input.covered_through_section,
        }),
      };
      await this.sql.query(
        `INSERT INTO cohorts (id, code, name, starts_at, capacity, instructor_ref, status, covered_through_section, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [c.id, c.code, c.name, c.starts_at ?? null, c.capacity ?? null, c.instructor_ref ?? null, c.status, c.covered_through_section ?? null, now, now],
      );
      return c;
    },
    get: async (id: string): Promise<Cohort | undefined> => {
      const rows = await this.sql.query<Record<string, unknown>>(`SELECT * FROM cohorts WHERE id = $1`, [id]);
      return rows[0] ? this.toCohort(rows[0]) : undefined;
    },
    getByCode: async (code: string): Promise<Cohort | undefined> => {
      const rows = await this.sql.query<Record<string, unknown>>(`SELECT * FROM cohorts WHERE code = $1`, [code]);
      return rows[0] ? this.toCohort(rows[0]) : undefined;
    },
    patch: async (id: string, patch: CohortPatch): Promise<Cohort | undefined> => {
      const existing = await this.cohorts.get(id);
      if (!existing) return undefined;
      const next: Cohort = {
        ...existing,
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.starts_at !== undefined && { starts_at: patch.starts_at }),
        ...(patch.capacity !== undefined && { capacity: patch.capacity }),
        ...(patch.instructor_ref !== undefined && { instructor_ref: patch.instructor_ref }),
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.covered_through_section !== undefined && {
          covered_through_section: patch.covered_through_section,
        }),
        updated_at: new Date().toISOString(),
      };
      await this.sql.query(
        `UPDATE cohorts SET name=$2, starts_at=$3, capacity=$4, instructor_ref=$5, status=$6, covered_through_section=$7, updated_at=$8 WHERE id=$1`,
        [id, next.name, next.starts_at ?? null, next.capacity ?? null, next.instructor_ref ?? null, next.status, next.covered_through_section ?? null, next.updated_at],
      );
      return next;
    },
    list: (cursor: string | undefined, limit: number) =>
      this.listTable("cohorts", this.toCohort, cursor, limit),
  };

  // ── candidates ───────────────────────────────────────────────────────────
  candidates = {
    create: async (input: CandidateInput): Promise<Candidate> => {
      const now = new Date().toISOString();
      const c: Candidate = {
        id: newId("cand"),
        full_name: input.full_name,
        consent: { ...(input.consent ?? {}), updated_at: now },
        email_verified: false,
        created_at: now,
        updated_at: now,
        ...(input.external_ref !== undefined && { external_ref: input.external_ref }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.country !== undefined && { country: input.country }),
      };
      await this.sql.query(
        `INSERT INTO candidates
           (id, external_ref, full_name, email_enc, phone_enc, country, consent, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)`,
        [
          c.id,
          c.external_ref ?? null,
          c.full_name,
          c.email != null ? await this.fc.encrypt(c.email) : null,
          c.phone != null ? await this.fc.encrypt(c.phone) : null,
          c.country ?? null,
          JSON.stringify(c.consent),
          now,
          now,
        ],
      );
      return c;
    },
    get: async (id: string): Promise<Candidate | undefined> => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM candidates WHERE id = $1 AND deleted_at IS NULL`,
        [id],
      );
      return rows[0] ? this.toCandidate(rows[0]) : undefined;
    }, // toCandidate returns a Promise — callers await it
    patch: async (id: string, patch: CandidatePatch): Promise<Candidate | undefined> => {
      const existing = await this.candidates.get(id);
      if (!existing) return undefined;
      const next: Candidate = {
        ...existing,
        ...(patch.email !== undefined && { email: patch.email }),
        ...(patch.phone !== undefined && { phone: patch.phone }),
        ...(patch.country !== undefined && { country: patch.country }),
        consent:
          patch.consent !== undefined
            ? { ...existing.consent, ...patch.consent, updated_at: new Date().toISOString() }
            : existing.consent,
        updated_at: new Date().toISOString(),
      };
      await this.sql.query(
        `UPDATE candidates
           SET email_enc=$2, phone_enc=$3, country=$4, consent=$5::jsonb, updated_at=$6
         WHERE id=$1`,
        [
          id,
          next.email != null ? await this.fc.encrypt(next.email) : null,
          next.phone != null ? await this.fc.encrypt(next.phone) : null,
          next.country ?? null,
          JSON.stringify(next.consent),
          next.updated_at,
        ],
      );
      return next;
    },
    markEmailVerified: async (id: string): Promise<Candidate | undefined> => {
      const existing = await this.candidates.get(id);
      if (!existing) return undefined;
      const updated_at = new Date().toISOString();
      await this.sql.query(
        `UPDATE candidates SET email_verified = true, updated_at = $2 WHERE id = $1`,
        [id, updated_at],
      );
      return { ...existing, email_verified: true, updated_at };
    },
    list: (cursor: string | undefined, limit: number) =>
      this.listTable("candidates", this.toCandidate, cursor, limit),
  };

  // ── enrollments ────────────────────────────────────────────────────────────
  enrollments = {
    create: async (input: EnrollmentInput): Promise<Enrollment> => {
      const now = new Date().toISOString();
      const e: Enrollment = {
        id: newId("enr"),
        candidate_id: input.candidate_id,
        cohort: input.cohort,
        status: input.status ?? "registered",
        created_at: now,
        updated_at: now,
      };
      await this.sql.query(
        `INSERT INTO enrollments (id, candidate_id, cohort, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [e.id, e.candidate_id, e.cohort, e.status, now, now],
      );
      return e;
    },
    get: async (id: string): Promise<Enrollment | undefined> => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM enrollments WHERE id = $1`,
        [id],
      );
      return rows[0] ? this.toEnrollment(rows[0]) : undefined;
    },
    setStatus: async (id: string, status: EnrollmentStatus): Promise<Enrollment | undefined> => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `UPDATE enrollments SET status=$2, updated_at=now() WHERE id=$1 RETURNING *`,
        [id, status],
      );
      return rows[0] ? this.toEnrollment(rows[0]) : undefined;
    },
    list: (cursor: string | undefined, limit: number) =>
      this.listTable("enrollments", this.toEnrollment, cursor, limit),
    byCohort: async (code: string): Promise<Enrollment[]> => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM enrollments WHERE cohort = $1 ORDER BY created_at`,
        [code],
      );
      return rows.map(this.toEnrollment);
    },
    byCandidate: async (candidateId: string): Promise<Enrollment[]> => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM enrollments WHERE candidate_id = $1 ORDER BY created_at`,
        [candidateId],
      );
      return rows.map(this.toEnrollment);
    },
  };

  // ── assessment results (append-only) ─────────────────────────────────────
  assessmentResults = {
    create: async (input: AssessmentInput): Promise<AssessmentResult> => {
      const r = buildAssessment(input); // hash computed app-side
      await this.sql.query(
        `INSERT INTO assessment_results
           (id, candidate_id, kind, readiness, theta, items_completed, by_client_need, supersedes, content_hash, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)`,
        [
          r.id,
          r.candidate_id,
          r.kind,
          r.readiness ?? null,
          r.theta ?? null,
          r.items_completed ?? null,
          r.by_client_need != null ? JSON.stringify(r.by_client_need) : null,
          r.supersedes ?? null,
          r.content_hash,
          r.created_at,
        ],
      );
      return r;
    },
    get: async (id: string): Promise<AssessmentResult | undefined> => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM assessment_results WHERE id = $1`,
        [id],
      );
      return rows[0] ? this.toAssessment(rows[0]) : undefined;
    },
    list: (candidateId: string | undefined, cursor: string | undefined, limit: number) =>
      this.listTable("assessment_results", this.toAssessment, cursor, limit, candidateId),
  };

  // ── payments (token refs only, encrypted) ─────────────────────────────────
  payments = {
    create: async (input: PaymentInput): Promise<Payment> => {
      const now = new Date().toISOString();
      const p: Payment = {
        id: newId("pay"),
        candidate_id: input.candidate_id,
        kind: input.kind,
        amount_cents: input.amount_cents,
        currency: input.currency,
        status: input.status ?? "pending",
        created_at: now,
        updated_at: now,
        ...(input.processor !== undefined && { processor: input.processor }),
        ...(input.processor_ref !== undefined && { processor_ref: input.processor_ref }),
      };
      await this.sql.query(
        `INSERT INTO payments
           (id, candidate_id, kind, amount_cents, currency, status, processor, processor_ref_enc, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          p.id,
          p.candidate_id,
          p.kind,
          p.amount_cents,
          p.currency,
          p.status,
          p.processor ?? null,
          p.processor_ref != null ? await this.fc.encrypt(p.processor_ref) : null,
          now,
          now,
        ],
      );
      return p;
    },
    get: async (id: string): Promise<Payment | undefined> => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM payments WHERE id = $1`,
        [id],
      );
      return rows[0] ? this.toPayment(rows[0]) : undefined;
    },
    update: async (
      id: string,
      patch: { status?: Payment["status"]; processor_ref?: string },
    ): Promise<Payment | undefined> => {
      const existing = await this.payments.get(id);
      if (!existing) return undefined;
      const next: Payment = {
        ...existing,
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.processor_ref !== undefined && { processor_ref: patch.processor_ref }),
        updated_at: new Date().toISOString(),
      };
      await this.sql.query(
        `UPDATE payments SET status=$2, processor_ref_enc=$3, updated_at=$4 WHERE id=$1`,
        [
          id,
          next.status,
          next.processor_ref != null ? await this.fc.encrypt(next.processor_ref) : null,
          next.updated_at,
        ],
      );
      return next;
    },
    list: (candidateId: string | undefined, cursor: string | undefined, limit: number) =>
      this.listTable("payments", this.toPayment, cursor, limit, candidateId),
  };

  // ── candidate credentials (end-user login) ───────────────────────────────
  credentials = {
    getByEmail: async (email: string): Promise<CandidateCredential | undefined> => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM candidate_credentials WHERE email = $1`,
        [email.toLowerCase()],
      );
      return rows[0] ? this.toCredential(rows[0]) : undefined;
    },
    create: async (input: CredentialInput): Promise<CandidateCredential> => {
      const cred: CandidateCredential = {
        candidate_id: input.candidate_id,
        email: input.email.toLowerCase(),
        password_hash: input.password_hash,
        created_at: new Date().toISOString(),
      };
      await this.sql.query(
        `INSERT INTO candidate_credentials (candidate_id, email, password_hash, created_at)
         VALUES ($1,$2,$3,$4)`,
        [cred.candidate_id, cred.email, cred.password_hash, cred.created_at],
      );
      return cred;
    },
  };

  // ── learner progress (mutable upsert; merge preserves omitted fields) ──────
  progress = {
    upsert: async (input: ProgressInput): Promise<ProgressRecord> => {
      const now = new Date().toISOString();
      const existingRows = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM candidate_progress WHERE candidate_id = $1 AND section_slug = $2`,
        [input.candidate_id, input.section_slug],
      );
      const prev = existingRows[0] ? this.toProgress(existingRows[0]) : undefined;
      const last_segment = input.last_segment ?? prev?.last_segment;
      const rec: ProgressRecord = {
        candidate_id: input.candidate_id,
        section_slug: input.section_slug,
        status: input.status ?? prev?.status ?? "in_progress",
        percent: input.percent !== undefined ? clampPct(input.percent) : prev?.percent ?? 0,
        updated_at: now,
        ...(last_segment !== undefined && { last_segment }),
      };
      await this.sql.query(
        `INSERT INTO candidate_progress (candidate_id, section_slug, status, percent, last_segment, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (candidate_id, section_slug)
         DO UPDATE SET status = $3, percent = $4, last_segment = $5, updated_at = $6`,
        [rec.candidate_id, rec.section_slug, rec.status, rec.percent, rec.last_segment ?? null, now],
      );
      return rec;
    },
    listByCandidate: async (candidateId: string): Promise<ProgressRecord[]> => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM candidate_progress WHERE candidate_id = $1 ORDER BY section_slug`,
        [candidateId],
      );
      return rows.map(this.toProgress);
    },
  };

  private toRemediation = (r: Record<string, unknown>): RemediationAssignment => ({
    candidate_id: String(r["candidate_id"]),
    dim: r["dim"] as RemediationAssignment["dim"],
    key: String(r["key"]),
    theta: Number(r["theta"]),
    pass_prob: Number(r["pass_prob"]),
    status: r["status"] as RemediationStatus,
    created_at: iso(r["created_at"]),
    updated_at: iso(r["updated_at"]),
  });

  remediations = {
    dispatch: async (input: RemediationInput): Promise<RemediationAssignment> => {
      const now = new Date().toISOString();
      const existing = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM candidate_remediations WHERE candidate_id=$1 AND dim=$2 AND key=$3`,
        [input.candidate_id, input.dim, input.key],
      );
      const prev = existing[0] ? this.toRemediation(existing[0]) : undefined;
      // Preserve a cleared assignment's history by re-opening it; refresh metrics.
      const status: RemediationStatus = prev && prev.status !== "cleared" ? prev.status : "assigned";
      await this.sql.query(
        `INSERT INTO candidate_remediations (candidate_id, dim, key, theta, pass_prob, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (candidate_id, dim, key)
         DO UPDATE SET theta=$4, pass_prob=$5, status=$6, updated_at=$8`,
        [input.candidate_id, input.dim, input.key, input.theta, input.pass_prob, status, prev?.created_at ?? now, now],
      );
      return { candidate_id: input.candidate_id, dim: input.dim, key: input.key, theta: input.theta, pass_prob: input.pass_prob, status, created_at: prev?.created_at ?? now, updated_at: now };
    },
    listByCandidate: async (candidateId: string): Promise<RemediationAssignment[]> => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM candidate_remediations WHERE candidate_id=$1 ORDER BY theta ASC`,
        [candidateId],
      );
      return rows.map(this.toRemediation);
    },
    setStatus: async (candidateId: string, dim: string, key: string, status: RemediationStatus) => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `UPDATE candidate_remediations SET status=$4, updated_at=now() WHERE candidate_id=$1 AND dim=$2 AND key=$3 RETURNING *`,
        [candidateId, dim, key, status],
      );
      return rows[0] ? this.toRemediation(rows[0]) : undefined;
    },
  };

  private toWalkthrough = (r: Record<string, unknown>): Walkthrough => {
    const j = (v: unknown, fallback: unknown) => (typeof v === "string" ? JSON.parse(v) : (v ?? fallback));
    return {
      question_id: String(r["question_id"]),
      client_need: String(r["client_need"]),
      cjmm: (r["cjmm"] as string | null) ?? null,
      standard_rationale: String(r["standard_rationale"] ?? ""),
      clinical_judgment: j(r["clinical_judgment"], {}) as Walkthrough["clinical_judgment"],
      answer_choice_analysis: j(r["answer_choice_analysis"], []) as Walkthrough["answer_choice_analysis"],
      teach_back: String(r["teach_back"] ?? ""),
      what_to_review_next: String(r["what_to_review_next"] ?? ""),
      linked_content: j(r["linked_content"], emptyLinkedContent()) as Walkthrough["linked_content"],
      status: r["status"] as WalkthroughStatus,
      provenance: r["provenance"] as Walkthrough["provenance"],
      model: (r["model"] as string | null) ?? null,
      sme_reviewed_by: (r["sme_reviewed_by"] as string | null) ?? null,
      sme_reviewed_at: r["sme_reviewed_at"] ? iso(r["sme_reviewed_at"]) : null,
      approved_by: (r["approved_by"] as string | null) ?? null,
      approved_at: r["approved_at"] ? iso(r["approved_at"]) : null,
      review_note: (r["review_note"] as string | null) ?? null,
      content_hash: String(r["content_hash"]),
      generated_at: iso(r["generated_at"]),
      created_at: iso(r["created_at"]),
      updated_at: iso(r["updated_at"]),
    };
  };

  walkthroughs = {
    upsert: async (input: WalkthroughUpsertInput): Promise<Walkthrough> => {
      const existingRows = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM question_walkthroughs WHERE question_id=$1`, [input.question_id],
      );
      const prev = existingRows[0] ? this.toWalkthrough(existingRows[0]) : undefined;
      const hash = walkthroughBodyHash(input);
      if (prev && prev.content_hash === hash) return prev; // idempotent
      const status: WalkthroughStatus = input.status ?? (input.provenance === "templated" ? "approved" : "draft");
      const lc = { ...emptyLinkedContent(), ...(input.linked_content ?? {}) };
      const now = new Date().toISOString();
      const rows = await this.sql.query<Record<string, unknown>>(
        `INSERT INTO question_walkthroughs
           (question_id, client_need, cjmm, standard_rationale, clinical_judgment, answer_choice_analysis,
            teach_back, what_to_review_next, linked_content, status, provenance, model, content_hash,
            generated_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15)
         ON CONFLICT (question_id) DO UPDATE SET
           client_need=$2, cjmm=$3, standard_rationale=$4, clinical_judgment=$5, answer_choice_analysis=$6,
           teach_back=$7, what_to_review_next=$8, linked_content=$9, status=$10, provenance=$11, model=$12,
           content_hash=$13, updated_at=$15,
           approved_by = CASE WHEN $10='approved' THEN question_walkthroughs.approved_by ELSE NULL END,
           approved_at = CASE WHEN $10='approved' THEN question_walkthroughs.approved_at ELSE NULL END
         RETURNING *`,
        [
          input.question_id, input.client_need, input.cjmm, input.standard_rationale,
          JSON.stringify(input.clinical_judgment), JSON.stringify(input.answer_choice_analysis),
          input.teach_back, input.what_to_review_next, JSON.stringify(lc), status, input.provenance,
          input.model, hash, prev?.generated_at ?? now, now,
        ],
      );
      return this.toWalkthrough(rows[0]!);
    },
    get: async (questionId: string) => {
      const rows = await this.sql.query<Record<string, unknown>>(`SELECT * FROM question_walkthroughs WHERE question_id=$1`, [questionId]);
      return rows[0] ? this.toWalkthrough(rows[0]) : undefined;
    },
    listByStatus: async (status: WalkthroughStatus, limit = 200) => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM question_walkthroughs WHERE status=$1 ORDER BY updated_at DESC LIMIT $2`, [status, limit],
      );
      return rows.map(this.toWalkthrough);
    },
    listApproved: async () => {
      const rows = await this.sql.query<Record<string, unknown>>(`SELECT * FROM question_walkthroughs WHERE status='approved'`);
      return rows.map(this.toWalkthrough);
    },
    setStatus: async (questionId: string, status: WalkthroughStatus, reviewer: string, note?: string) => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `UPDATE question_walkthroughs SET
           status=$2,
           review_note = COALESCE($3, review_note),
           sme_reviewed_by = CASE WHEN $2='sme_reviewed' THEN $4 ELSE sme_reviewed_by END,
           sme_reviewed_at = CASE WHEN $2='sme_reviewed' THEN now() ELSE sme_reviewed_at END,
           approved_by = CASE WHEN $2='approved' THEN $4 ELSE approved_by END,
           approved_at = CASE WHEN $2='approved' THEN now() ELSE approved_at END,
           updated_at = now()
         WHERE question_id=$1 RETURNING *`,
        [questionId, status, note ?? null, reviewer],
      );
      return rows[0] ? this.toWalkthrough(rows[0]) : undefined;
    },
    patchBody: async (
      questionId: string,
      patch: Partial<Pick<Walkthrough, "clinical_judgment" | "answer_choice_analysis" | "teach_back" | "what_to_review_next" | "standard_rationale">>,
      reviewer: string,
    ) => {
      const cur = await this.walkthroughs.get(questionId);
      if (!cur) return undefined;
      const merged = { ...cur, ...patch };
      const hash = contentHash({
        clinical_judgment: merged.clinical_judgment, answer_choice_analysis: merged.answer_choice_analysis,
        teach_back: merged.teach_back, what_to_review_next: merged.what_to_review_next, standard_rationale: merged.standard_rationale,
      });
      const rows = await this.sql.query<Record<string, unknown>>(
        `UPDATE question_walkthroughs SET
           clinical_judgment=$2, answer_choice_analysis=$3, teach_back=$4, what_to_review_next=$5, standard_rationale=$6,
           content_hash=$7, status='draft', approved_by=NULL, approved_at=NULL, review_note=$8, updated_at=now()
         WHERE question_id=$1 RETURNING *`,
        [questionId, JSON.stringify(merged.clinical_judgment), JSON.stringify(merged.answer_choice_analysis),
         merged.teach_back, merged.what_to_review_next, merged.standard_rationale, hash, `edited by ${reviewer}`],
      );
      return rows[0] ? this.toWalkthrough(rows[0]) : undefined;
    },
  };

  questionResponses = {
    record: async (input: ResponseInput): Promise<QuestionResponse> => {
      const rec: QuestionResponse = {
        id: newId("qr"),
        candidate_id: input.candidate_id,
        question_id: input.question_id,
        chosen_option_index: input.chosen_option_index ?? null,
        correct: input.correct,
        spent_ms: input.spent_ms ?? null,
        pre_reveal_reasoning: input.pre_reveal_reasoning ?? null,
        walkthrough_seen: input.walkthrough_seen ?? false,
        created_at: new Date().toISOString(),
      };
      await this.sql.query(
        `INSERT INTO question_responses (id, candidate_id, question_id, chosen_option_index, correct, spent_ms, pre_reveal_reasoning, walkthrough_seen, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [rec.id, rec.candidate_id, rec.question_id, rec.chosen_option_index, rec.correct, rec.spent_ms, rec.pre_reveal_reasoning, rec.walkthrough_seen, rec.created_at],
      );
      return rec;
    },
    analytics: async (questionId: string): Promise<QuestionAnalytics> => {
      const rows = await this.sql.query<Record<string, unknown>>(`SELECT * FROM question_responses WHERE question_id=$1`, [questionId]);
      return rollupAnalytics(questionId, rows.map((r): QuestionResponse => ({
        id: String(r["id"]), candidate_id: String(r["candidate_id"]), question_id: String(r["question_id"]),
        chosen_option_index: r["chosen_option_index"] == null ? null : Number(r["chosen_option_index"]),
        correct: Boolean(r["correct"]), spent_ms: r["spent_ms"] == null ? null : Number(r["spent_ms"]),
        pre_reveal_reasoning: (r["pre_reveal_reasoning"] as string | null) ?? null,
        walkthrough_seen: Boolean(r["walkthrough_seen"]), created_at: iso(r["created_at"]),
      })));
    },
  };

  // ── email verification tokens (single-use, expiring) ──────────────────────
  verifications = {
    create: async (candidateId: string, ttlSec = 86_400) => {
      const token = newToken();
      const expires_at = new Date(Date.now() + ttlSec * 1000).toISOString();
      await this.sql.query(
        `INSERT INTO candidate_verifications (token, candidate_id, expires_at) VALUES ($1,$2,$3)`,
        [token, candidateId, expires_at],
      );
      return { token, expires_at };
    },
    consume: async (token: string): Promise<string | null> => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `DELETE FROM candidate_verifications WHERE token = $1 RETURNING candidate_id, expires_at`,
        [token],
      );
      const row = rows[0];
      if (!row) return null;
      if (new Date(String(row["expires_at"])).getTime() < Date.now()) return null;
      return String(row["candidate_id"]);
    },
  };

  // ── outcomes (append-only) ────────────────────────────────────────────────
  outcomes = {
    create: async (input: OutcomeInput): Promise<OutcomeEvent> => {
      const o = buildOutcome(input);
      await this.sql.query(
        `INSERT INTO outcome_events
           (id, candidate_id, kind, status, amount_cents, detail, occurred_at, content_hash, created_at)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)`,
        [
          o.id,
          o.candidate_id,
          o.kind,
          o.status ?? null,
          o.amount_cents ?? null,
          o.detail != null ? JSON.stringify(o.detail) : null,
          o.occurred_at,
          o.content_hash,
          o.created_at,
        ],
      );
      return o;
    },
    list: (candidateId: string | undefined, cursor: string | undefined, limit: number) =>
      this.listTable("outcome_events", this.toOutcome, cursor, limit, candidateId),
    funnel: async () => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `SELECT candidate_id, kind, status FROM outcome_events`,
      );
      return computeOutcomeFunnel(
        rows.map((r) => ({
          candidate_id: String(r["candidate_id"]),
          kind: String(r["kind"]) as OutcomeKind,
          ...(r["status"] != null && { status: String(r["status"]) }),
        })),
      );
    },
  };

  // ── Live cohort / Live Lab attendance (append-only) ──────────────────────
  attendance = {
    create: async (input: AttendanceInput): Promise<AttendanceRecord> => {
      const a = buildAttendance(input);
      await this.sql.query(
        `INSERT INTO attendance_records
           (id, candidate_id, cohort, location, session_date, status, content_hash, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          a.id,
          a.candidate_id,
          a.cohort ?? null,
          a.location ?? null,
          a.session_date,
          a.status,
          a.content_hash,
          a.created_at,
        ],
      );
      return a;
    },
    list: (candidateId: string | undefined, cursor: string | undefined, limit: number) =>
      this.listTable("attendance_records", this.toAttendance, cursor, limit, candidateId),
    rollup: async () => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `SELECT candidate_id, location, status FROM attendance_records`,
      );
      return computeAttendanceRollup(
        rows.map((r) => ({
          candidate_id: String(r["candidate_id"]),
          status: String(r["status"]) as AttendanceStatus,
          ...(r["location"] != null && { location: String(r["location"]) }),
        })),
      );
    },
  };

  // ── University Affiliate Network ──────────────────────────────────────────
  schools = {
    create: async (input: SchoolInput): Promise<School> => {
      const now = new Date().toISOString();
      const s: School = {
        id: newId("sch"),
        slug: input.slug.toUpperCase(),
        name: input.name,
        country: input.country,
        tier: input.tier ?? "eligible",
        logo_use_granted: input.logo_use_granted ?? false,
        outreach_status: input.outreach_status ?? "eligible_listed",
        created_at: now,
        updated_at: now,
        ...(input.city !== undefined && { city: input.city }),
        ...(input.programs !== undefined && { programs: input.programs }),
        ...(input.email_domains !== undefined && { email_domains: input.email_domains }),
        ...(input.contact_email !== undefined && { contact_email: input.contact_email }),
      };
      await this.sql.query(
        `INSERT INTO schools
           (id, slug, name, country, city, programs, tier, logo_use_granted,
            email_domains, outreach_status, contact_email, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          s.id, s.slug, s.name, s.country, s.city ?? null,
          s.programs ?? null, s.tier, s.logo_use_granted,
          s.email_domains ?? null, s.outreach_status, s.contact_email ?? null, now, now,
        ],
      );
      return s;
    },
    get: async (slug: string): Promise<School | undefined> => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM schools WHERE slug = $1`,
        [slug.toUpperCase()],
      );
      return rows[0] ? this.toSchool(rows[0]) : undefined;
    },
    patch: async (slug: string, patch: SchoolPatch): Promise<School | undefined> => {
      const existing = await this.schools.get(slug);
      if (!existing) return undefined;
      const next: School = {
        ...existing,
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.country !== undefined && { country: patch.country }),
        ...(patch.city !== undefined && { city: patch.city }),
        ...(patch.programs !== undefined && { programs: patch.programs }),
        ...(patch.tier !== undefined && { tier: patch.tier }),
        ...(patch.logo_use_granted !== undefined && { logo_use_granted: patch.logo_use_granted }),
        ...(patch.email_domains !== undefined && { email_domains: patch.email_domains }),
        ...(patch.outreach_status !== undefined && { outreach_status: patch.outreach_status }),
        ...(patch.contact_email !== undefined && { contact_email: patch.contact_email }),
        updated_at: new Date().toISOString(),
      };
      await this.sql.query(
        `UPDATE schools SET
           name=$2, country=$3, city=$4, programs=$5, tier=$6, logo_use_granted=$7,
           email_domains=$8, outreach_status=$9, contact_email=$10, updated_at=$11
         WHERE slug=$1`,
        [
          existing.slug, next.name, next.country, next.city ?? null,
          next.programs ?? null, next.tier, next.logo_use_granted,
          next.email_domains ?? null, next.outreach_status, next.contact_email ?? null, next.updated_at,
        ],
      );
      return next;
    },
    list: async (): Promise<School[]> => {
      const rows = await this.sql.query<Record<string, unknown>>(`SELECT * FROM schools ORDER BY name`);
      return rows.map(this.toSchool);
    },
  };

  affiliations = {
    upsert: async (input: AffiliationInput): Promise<CandidateSchoolAffiliation> => {
      const slug = input.school_slug.toUpperCase();
      const verification = input.verification ?? "self_attested";
      const now = new Date().toISOString();
      await this.sql.query(
        `INSERT INTO candidate_school_affiliations
           (candidate_id, school_slug, role, verification, created_at)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (candidate_id, school_slug, role)
         DO UPDATE SET verification = $4`,
        [input.candidate_id, slug, input.role, verification, now],
      );
      return { candidate_id: input.candidate_id, school_slug: slug, role: input.role, verification, created_at: now };
    },
    listByCandidate: async (candidateId: string): Promise<CandidateSchoolAffiliation[]> => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM candidate_school_affiliations WHERE candidate_id = $1`,
        [candidateId],
      );
      return rows.map(this.toAffiliation);
    },
    listBySchool: async (slug: string): Promise<CandidateSchoolAffiliation[]> => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM candidate_school_affiliations WHERE school_slug = $1`,
        [slug.toUpperCase()],
      );
      return rows.map(this.toAffiliation);
    },
  };

  // ── Pathway-task status events (append-only) ─────────────────────────────
  pathwayTasks = {
    create: async (input: PathwayTaskInput): Promise<PathwayTaskEvent> => {
      const e = buildPathwayTask(input);
      await this.sql.query(
        `INSERT INTO pathway_task_events
           (id, candidate_id, kind, status, note, content_hash, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [e.id, e.candidate_id, e.kind, e.status, e.note ?? null, e.content_hash, e.created_at],
      );
      return e;
    },
    listByCandidate: async (candidateId: string): Promise<PathwayTaskEvent[]> => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM pathway_task_events WHERE candidate_id = $1 ORDER BY created_at`,
        [candidateId],
      );
      return rows.map(this.toPathwayTask);
    },
  };

  // ── Leads + Lead events (Florence core nurse mirror) ─────────────────────
  private toLead = (r: Record<string, unknown>): Lead => ({
    id: String(r["id"]),
    email: String(r["email"]),
    source: String(r["source"]),
    first_seen_at: iso(r["first_seen_at"]),
    last_seen_at: iso(r["last_seen_at"]),
    created_at: iso(r["created_at"]),
    updated_at: iso(r["updated_at"]),
    ...(r["external_id"] != null && { external_id: String(r["external_id"]) }),
    ...(r["firstname"] != null && { firstname: String(r["firstname"]) }),
    ...(r["lastname"] != null && { lastname: String(r["lastname"]) }),
    ...(r["fullname"] != null && { fullname: String(r["fullname"]) }),
    ...(r["country"] != null && { country: String(r["country"]) }),
    ...(r["phone"] != null && { phone: String(r["phone"]) }),
    ...(r["job_unit"] != null && { job_unit: String(r["job_unit"]) }),
    ...(r["type"] != null && { type: String(r["type"]) as Lead["type"] }),
    ...(r["nclex_status"] != null && {
      nclex_status: String(r["nclex_status"]) as Lead["nclex_status"],
    }),
    ...(r["application_status"] != null && {
      application_status: String(r["application_status"]) as Lead["application_status"],
    }),
    ...(r["evaluation_status"] != null && {
      evaluation_status: String(r["evaluation_status"]) as Lead["evaluation_status"],
    }),
    ...(r["assigned"] != null && { assigned: String(r["assigned"]) }),
    ...(r["video_screen"] != null && { video_screen: Boolean(r["video_screen"]) }),
    ...(r["signup_at"] != null && { signup_at: iso(r["signup_at"]) }),
    ...(r["school_slug"] != null && { school_slug: String(r["school_slug"]) }),
  });

  leads = {
    upsert: async (
      input: LeadInput,
      source: string,
      actor: string,
    ): Promise<{
      lead: Lead;
      changes: Record<string, { before: unknown; after: unknown }>;
      created: boolean;
    }> => {
      const email = input.email.trim().toLowerCase();
      const now = new Date().toISOString();
      const existingRow = (
        await this.sql.query<Record<string, unknown>>(
          `SELECT * FROM leads WHERE email = $1`,
          [email],
        )
      )[0];

      if (!existingRow) {
        const id = newId("ld");
        const lead: Lead = {
          id,
          email,
          source,
          first_seen_at: now,
          last_seen_at: now,
          created_at: now,
          updated_at: now,
          ...stripUndefined(input),
        };
        await this.sql.query(
          `INSERT INTO leads
            (id, email, external_id, firstname, lastname, fullname, country, phone,
             job_unit, type, nclex_status, application_status, evaluation_status,
             assigned, video_screen, signup_at, school_slug,
             source, first_seen_at, last_seen_at, created_at, updated_at)
           VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
          [
            lead.id, lead.email, lead.external_id ?? null, lead.firstname ?? null,
            lead.lastname ?? null, lead.fullname ?? null, lead.country ?? null,
            lead.phone ?? null, lead.job_unit ?? null, lead.type ?? null,
            lead.nclex_status ?? null, lead.application_status ?? null,
            lead.evaluation_status ?? null, lead.assigned ?? null,
            lead.video_screen ?? null, lead.signup_at ?? null, lead.school_slug ?? null,
            lead.source, lead.first_seen_at, lead.last_seen_at,
            lead.created_at, lead.updated_at,
          ],
        );
        await this.writeLeadEvent({
          lead_id: id,
          kind: "imported",
          after: snapshotForEvent(lead),
          source,
          actor,
          occurred_at: now,
        });
        return { lead, changes: {}, created: true };
      }

      const existing = this.toLead(existingRow);
      const stripped = stripUndefined(input);
      const candidate = { ...existing, ...stripped };
      const changes: Record<string, { before: unknown; after: unknown }> = {};
      for (const k of WATCHED_LEAD_KEYS) {
        const before = existing[k] as unknown;
        const after = candidate[k] as unknown;
        if ((stripped as Record<string, unknown>)[k] !== undefined && before !== after) {
          changes[k] = { before, after };
        }
      }
      const hadChanges = Object.keys(changes).length > 0;
      const updated: Lead = {
        ...candidate,
        last_seen_at: now,
        updated_at: hadChanges ? now : existing.updated_at,
        source: hadChanges ? source : existing.source,
      };
      await this.sql.query(
        `UPDATE leads SET
          external_id=$2, firstname=$3, lastname=$4, fullname=$5, country=$6,
          phone=$7, job_unit=$8, type=$9, nclex_status=$10, application_status=$11,
          evaluation_status=$12, assigned=$13, video_screen=$14, signup_at=$15,
          school_slug=$16, source=$17, last_seen_at=$18, updated_at=$19
         WHERE id=$1`,
        [
          updated.id, updated.external_id ?? null, updated.firstname ?? null,
          updated.lastname ?? null, updated.fullname ?? null, updated.country ?? null,
          updated.phone ?? null, updated.job_unit ?? null, updated.type ?? null,
          updated.nclex_status ?? null, updated.application_status ?? null,
          updated.evaluation_status ?? null, updated.assigned ?? null,
          updated.video_screen ?? null, updated.signup_at ?? null,
          updated.school_slug ?? null, updated.source, updated.last_seen_at,
          updated.updated_at,
        ],
      );
      if (hadChanges) {
        await this.writeLeadEvent({
          lead_id: updated.id,
          kind: "status_change",
          before: Object.fromEntries(
            Object.entries(changes).map(([k, v]) => [k, v.before]),
          ),
          after: Object.fromEntries(
            Object.entries(changes).map(([k, v]) => [k, v.after]),
          ),
          source,
          actor,
          occurred_at: now,
        });
      }
      return { lead: updated, changes, created: false };
    },
    get: async (id: string): Promise<Lead | undefined> => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM leads WHERE id = $1`,
        [id],
      );
      return rows[0] ? this.toLead(rows[0]) : undefined;
    },
    getByEmail: async (email: string): Promise<Lead | undefined> => {
      const rows = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM leads WHERE email = $1`,
        [email.trim().toLowerCase()],
      );
      return rows[0] ? this.toLead(rows[0]) : undefined;
    },
    list: async (
      filters: LeadListFilters,
      cursor: string | undefined,
      limit: number,
    ): Promise<Page<Lead>> => {
      const conds: string[] = [];
      const params: unknown[] = [];
      const p = (v: unknown) => {
        params.push(v);
        return `$${params.length}`;
      };
      if (filters.country) conds.push(`country = ${p(filters.country)}`);
      if (filters.type) conds.push(`type = ${p(filters.type)}`);
      if (filters.nclex_status) conds.push(`nclex_status = ${p(filters.nclex_status)}`);
      if (filters.application_status)
        conds.push(`application_status = ${p(filters.application_status)}`);
      if (filters.q) {
        const q = `%${filters.q.trim().toLowerCase()}%`;
        conds.push(`(lower(email) LIKE ${p(q)} OR lower(fullname) LIKE ${p(q)})`);
      }
      const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
      const all = await this.sql.query<Record<string, unknown>>(
        `SELECT * FROM leads ${where} ORDER BY updated_at DESC, id`,
        params,
      );
      const data = all.map(this.toLead);
      let start = 0;
      if (cursor) {
        const idx = data.findIndex((x) => x.id === cursor);
        start = idx >= 0 ? idx + 1 : 0;
      }
      const page = data.slice(start, start + limit);
      const more = start + limit < data.length;
      return {
        data: page,
        next_cursor: more && page.length > 0 ? page[page.length - 1].id : null,
      };
    },
    rollup: async (): Promise<LeadRollup> => {
      const totalRow = (
        await this.sql.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM leads`)
      )[0];
      const byCountry = await this.sql.query<{ k: string; n: string }>(
        `SELECT COALESCE(country, 'Unknown') AS k, COUNT(*)::text AS n FROM leads GROUP BY 1`,
      );
      const byType = await this.sql.query<{ k: string; n: string }>(
        `SELECT type AS k, COUNT(*)::text AS n FROM leads WHERE type IS NOT NULL GROUP BY 1`,
      );
      const byNclex = await this.sql.query<{ k: string; n: string }>(
        `SELECT nclex_status AS k, COUNT(*)::text AS n FROM leads WHERE nclex_status IS NOT NULL GROUP BY 1`,
      );
      const byApp = await this.sql.query<{ k: string; n: string }>(
        `SELECT application_status AS k, COUNT(*)::text AS n FROM leads WHERE application_status IS NOT NULL GROUP BY 1`,
      );
      const mapOf = (rows: { k: string; n: string }[]) =>
        Object.fromEntries(rows.map((r) => [r.k, Number(r.n)]));
      return {
        total: Number(totalRow?.n ?? 0),
        by_country: mapOf(byCountry),
        by_type: mapOf(byType),
        by_nclex_status: mapOf(byNclex),
        by_application_status: mapOf(byApp),
      };
    },
    events: {
      listByLead: async (leadId: string): Promise<LeadEvent[]> => {
        const rows = await this.sql.query<Record<string, unknown>>(
          `SELECT * FROM lead_events WHERE lead_id = $1 ORDER BY occurred_at`,
          [leadId],
        );
        return rows.map(rowToLeadEvent);
      },
      listRecent: async (
        since: string | undefined,
        limit: number,
      ): Promise<LeadEvent[]> => {
        const rows = since
          ? await this.sql.query<Record<string, unknown>>(
              `SELECT * FROM lead_events WHERE occurred_at >= $1 ORDER BY occurred_at DESC LIMIT $2`,
              [since, limit],
            )
          : await this.sql.query<Record<string, unknown>>(
              `SELECT * FROM lead_events ORDER BY occurred_at DESC LIMIT $1`,
              [limit],
            );
        return rows.map(rowToLeadEvent);
      },
    },
  };

  // Tail of the chain so each new event chains forward in stored insertion order.
  private async leadEventsLastHash(): Promise<string> {
    const r = await this.sql.query<{ h: string }>(
      `SELECT content_hash AS h FROM lead_events ORDER BY occurred_at DESC LIMIT 1`,
    );
    return r[0]?.h ?? "0".repeat(64);
  }
  private async writeLeadEvent(
    e: Omit<LeadEvent, "id" | "prev_hash" | "content_hash">,
  ): Promise<void> {
    const id = newId("le");
    const prev_hash = await this.leadEventsLastHash();
    const payload = JSON.stringify({
      id,
      lead_id: e.lead_id,
      kind: e.kind,
      before: e.before ?? null,
      after: e.after ?? null,
      source: e.source,
      actor: e.actor,
      occurred_at: e.occurred_at,
      prev_hash,
    });
    const content_hash = (await import("node:crypto"))
      .createHash("sha256")
      .update(payload)
      .digest("hex");
    await this.sql.query(
      `INSERT INTO lead_events
        (id, lead_id, kind, before_json, after_json, source, actor, occurred_at, prev_hash, content_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        id, e.lead_id, e.kind,
        e.before ? JSON.stringify(e.before) : null,
        e.after ? JSON.stringify(e.after) : null,
        e.source, e.actor, e.occurred_at, prev_hash, content_hash,
      ],
    );
  }

  // ── Outreach (TODO: port to real SQL when prod migrates off MemoryStore) ──
  // We delegate outreach to an in-process MemoryStore alongside the
  // postgres adapter so the operator can drive the Lob workflow today.
  // The leads pattern above is the template for porting to real SQL later.
  private _outreachShim = new MemoryStore();
  outreach: Store["outreach"] = this._outreachShim.outreach;
}

// ── Lead helpers shared with the postgres adapter ───────────────────────────
const WATCHED_LEAD_KEYS = [
  "country",
  "phone",
  "type",
  "nclex_status",
  "application_status",
  "evaluation_status",
  "assigned",
  "job_unit",
  "video_screen",
  "school_slug",
  "fullname",
  "firstname",
  "lastname",
  "external_id",
] as const satisfies readonly (keyof LeadInput)[];

function snapshotForEvent(l: Lead): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of WATCHED_LEAD_KEYS) {
    const v = l[k as keyof Lead];
    if (v !== undefined) out[k] = v;
  }
  return out;
}
function stripUndefined(input: LeadInput): Partial<Lead> {
  const out: Partial<Lead> = {};
  for (const k of Object.keys(input) as (keyof LeadInput)[]) {
    const v = input[k];
    if (v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    (out as Record<string, unknown>)[k] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}
function rowToLeadEvent(r: Record<string, unknown>): LeadEvent {
  return {
    id: String(r["id"]),
    lead_id: String(r["lead_id"]),
    kind: String(r["kind"]) as LeadEvent["kind"],
    ...(r["before_json"] != null && {
      before: JSON.parse(String(r["before_json"])) as Record<string, unknown>,
    }),
    ...(r["after_json"] != null && {
      after: JSON.parse(String(r["after_json"])) as Record<string, unknown>,
    }),
    source: String(r["source"]),
    actor: String(r["actor"]),
    occurred_at: iso(r["occurred_at"]),
    prev_hash: String(r["prev_hash"]),
    content_hash: String(r["content_hash"]),
  };
}
