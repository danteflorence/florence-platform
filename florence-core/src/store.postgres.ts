// Postgres-backed Store (production). Activated when DATABASE_URL is set. Uses
// the optional `pg` driver — same approach as florence-academy/api. Apply the
// schema first with `npm run migrate`.

import type { ApiClient, AuditRow, ConsentRow, Nurse, NurseEvent, NurseRef, Org, RoleGrant, SessionRow, SigningKeyRow, Store, User } from "./store.ts";
import type { Role } from "./roles.ts";

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : (v as string));
function consentRow(r: any): ConsentRow {
  return {
    id: r.id,
    nurse_id: r.nurse_id,
    purpose: r.purpose,
    recipient_category: r.recipient_category,
    recipient_org_id: r.recipient_org_id ?? undefined,
    allowed_fields: r.allowed_fields ?? [],
    consent_text_version: r.consent_text_version,
    consent_text_hash: r.consent_text_hash,
    ip_hash: r.ip_hash ?? undefined,
    device_hash: r.device_hash ?? undefined,
    status: r.status,
    granted_at: iso(r.granted_at),
    granted_by: r.granted_by,
    revoked_at: r.revoked_at ? iso(r.revoked_at) : undefined,
    revoked_by: r.revoked_by ?? undefined,
  };
}
function nurseRow(r: any): Nurse {
  return {
    id: r.id,
    email: r.email ?? undefined,
    name: r.name ?? undefined,
    user_id: r.user_id ?? undefined,
    created_at: iso(r.created_at),
    updated_at: iso(r.updated_at),
  };
}
function nurseEventRow(r: any): NurseEvent {
  return { id: r.id, nurse_id: r.nurse_id, type: r.type, source: r.source, at: iso(r.at), data: r.data ?? {}, created_at: iso(r.created_at) };
}
function auditRowMap(r: any): AuditRow {
  return {
    id: r.id,
    at: iso(r.at),
    actor: r.actor,
    action: r.action,
    entity: r.entity,
    entity_id: r.entity_id ?? undefined,
    detail: r.detail ?? undefined,
    prev_hash: r.prev_hash ?? undefined,
    row_hash: r.row_hash ?? undefined,
  };
}

export interface SqlClient {
  query(text: string, params?: unknown[]): Promise<{ rows: any[] }>;
  end?(): Promise<void>;
}

/** Open a connection pool to Postgres via the optional `pg` driver. */
export async function connect(connectionString: string): Promise<SqlClient> {
  let pg: any;
  try {
    // @ts-ignore optional dependency — types not required at build time
    pg = await import("pg");
  } catch {
    throw new Error("DATABASE_URL is set but the 'pg' package is not installed — run `npm i pg`.");
  }
  const Pool = pg.default?.Pool ?? pg.Pool;
  const pool = new Pool({ connectionString });
  await pool.query("select 1");
  return pool as SqlClient;
}

function userRow(r: any): User {
  return {
    id: r.id,
    email: r.email,
    name: r.name ?? undefined,
    google_sub: r.google_sub ?? undefined,
    password_hash: r.password_hash ?? undefined,
    status: r.status,
    cand_id: r.cand_id ?? undefined,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
    last_login_at: r.last_login_at ? (r.last_login_at instanceof Date ? r.last_login_at.toISOString() : r.last_login_at) : undefined,
  };
}
function orgRow(r: any): Org {
  return {
    id: r.id,
    kind: r.kind,
    name: r.name,
    external_ref: r.external_ref ?? undefined,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}
function grantRow(r: any): RoleGrant {
  return {
    id: r.id,
    user_id: r.user_id,
    role: r.role,
    org_id: r.org_id ?? undefined,
    territory: r.territory ?? undefined,
    granted_by: r.granted_by ?? undefined,
    granted_at: r.granted_at instanceof Date ? r.granted_at.toISOString() : r.granted_at,
  };
}

export class PostgresStore implements Store {
  private sql: SqlClient;
  constructor(sql: SqlClient) {
    this.sql = sql;
  }

  async getUserById(id: string) {
    const { rows } = await this.sql.query("select * from users where id=$1", [id]);
    return rows[0] ? userRow(rows[0]) : undefined;
  }
  async getUserByEmail(email: string) {
    const { rows } = await this.sql.query("select * from users where email=$1", [email.toLowerCase()]);
    return rows[0] ? userRow(rows[0]) : undefined;
  }
  async getUserByGoogleSub(sub: string) {
    const { rows } = await this.sql.query("select * from users where google_sub=$1", [sub]);
    return rows[0] ? userRow(rows[0]) : undefined;
  }
  async insertUser(u: User) {
    await this.sql.query(
      `insert into users (id,email,name,google_sub,password_hash,status,cand_id,created_at,updated_at,last_login_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [u.id, u.email, u.name ?? null, u.google_sub ?? null, u.password_hash ?? null, u.status, u.cand_id ?? null, u.created_at, u.updated_at, u.last_login_at ?? null],
    );
  }
  async updateUser(id: string, patch: Partial<User>) {
    const fields: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    for (const [k, v] of Object.entries({ ...patch, updated_at: new Date().toISOString() })) {
      if (k === "id") continue;
      fields.push(`${k}=$${i++}`);
      vals.push(v ?? null);
    }
    vals.push(id);
    await this.sql.query(`update users set ${fields.join(",")} where id=$${i}`, vals);
  }
  async listUsers() {
    const { rows } = await this.sql.query("select * from users order by created_at");
    return rows.map(userRow);
  }

  async getOrgById(id: string) {
    const { rows } = await this.sql.query("select * from orgs where id=$1", [id]);
    return rows[0] ? orgRow(rows[0]) : undefined;
  }
  async getOrgByExternalRef(ref: string) {
    const { rows } = await this.sql.query("select * from orgs where external_ref=$1", [ref]);
    return rows[0] ? orgRow(rows[0]) : undefined;
  }
  async insertOrg(o: Org) {
    await this.sql.query(
      "insert into orgs (id,kind,name,external_ref,created_at) values ($1,$2,$3,$4,$5)",
      [o.id, o.kind, o.name, o.external_ref ?? null, o.created_at],
    );
  }
  async listOrgs() {
    const { rows } = await this.sql.query("select * from orgs order by name");
    return rows.map(orgRow);
  }

  async grantsByUser(userId: string) {
    const { rows } = await this.sql.query("select * from role_grants where user_id=$1", [userId]);
    return rows.map(grantRow);
  }
  async insertGrant(g: RoleGrant) {
    await this.sql.query(
      `insert into role_grants (id,user_id,role,org_id,territory,granted_by,granted_at)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (user_id,role,org_id) do update set territory=excluded.territory, granted_by=excluded.granted_by, granted_at=excluded.granted_at`,
      [g.id, g.user_id, g.role, g.org_id ?? null, g.territory ?? null, g.granted_by ?? null, g.granted_at],
    );
  }
  async deleteGrant(id: string) {
    await this.sql.query("delete from role_grants where id=$1", [id]);
  }
  async anyGrantWithRole(role: Role) {
    const { rows } = await this.sql.query("select 1 from role_grants where role=$1 limit 1", [role]);
    return rows.length > 0;
  }
  async listGrants() {
    const { rows } = await this.sql.query("select * from role_grants order by granted_at");
    return rows.map(grantRow);
  }

  async getClient(clientId: string) {
    const { rows } = await this.sql.query("select * from api_clients where client_id=$1", [clientId]);
    const r = rows[0];
    if (!r) return undefined;
    return {
      client_id: r.client_id,
      name: r.name,
      secret_hash: r.secret_hash,
      allowed_scopes: r.allowed_scopes ?? [],
      audience: r.audience ?? undefined,
      org_id: r.org_id ?? undefined,
      active: r.active,
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    } satisfies ApiClient;
  }
  async insertClient(c: ApiClient) {
    await this.sql.query(
      `insert into api_clients (client_id,name,secret_hash,allowed_scopes,audience,org_id,active,created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (client_id) do nothing`,
      [c.client_id, c.name, c.secret_hash, c.allowed_scopes, c.audience ?? null, c.org_id ?? null, c.active, c.created_at],
    );
  }
  async listClients() {
    const { rows } = await this.sql.query("select * from api_clients order by created_at");
    return rows.map((r): ApiClient => ({
      client_id: r.client_id,
      name: r.name,
      secret_hash: r.secret_hash,
      allowed_scopes: r.allowed_scopes ?? [],
      audience: r.audience ?? undefined,
      org_id: r.org_id ?? undefined,
      active: r.active,
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    }));
  }

  async listSigningKeys() {
    const { rows } = await this.sql.query("select * from signing_keys where status <> 'revoked'");
    return rows.map(
      (r): SigningKeyRow => ({
        kid: r.kid,
        alg: r.alg,
        public_jwk: r.public_jwk,
        private_pem_enc: r.private_pem_enc,
        status: r.status,
        created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
      }),
    );
  }
  async insertSigningKey(k: SigningKeyRow) {
    await this.sql.query(
      `insert into signing_keys (kid,alg,public_jwk,private_pem_enc,status,created_at)
       values ($1,$2,$3,$4,$5,$6)`,
      [k.kid, k.alg, JSON.stringify(k.public_jwk), k.private_pem_enc, k.status, k.created_at],
    );
  }
  async updateSigningKeyStatus(kid: string, status: SigningKeyRow["status"]) {
    await this.sql.query("update signing_keys set status=$1 where kid=$2", [status, kid]);
  }

  async appendAudit(a: AuditRow) {
    await this.sql.query(
      `insert into audit_log (id,at,actor,action,entity,entity_id,detail,prev_hash,row_hash) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [a.id, a.at, a.actor, a.action, a.entity, a.entity_id ?? null, a.detail ? JSON.stringify(a.detail) : null, a.prev_hash ?? null, a.row_hash ?? null],
    );
  }
  async recentAudit(limit: number) {
    const { rows } = await this.sql.query("select * from audit_log order by seq desc limit $1", [limit]);
    return rows.map(auditRowMap);
  }
  async lastAuditHash() {
    const { rows } = await this.sql.query("select row_hash from audit_log order by seq desc limit 1");
    return rows[0]?.row_hash ?? null;
  }
  async allAuditOrdered() {
    const { rows } = await this.sql.query("select * from audit_log order by seq asc");
    return rows.map(auditRowMap);
  }

  async insertSession(s: SessionRow) {
    await this.sql.query(
      `insert into sessions (id,user_id,token_hash,created_at,expires_at,revoked_at) values ($1,$2,$3,$4,$5,$6)`,
      [s.id, s.user_id, s.token_hash, s.created_at, s.expires_at, s.revoked_at ?? null],
    );
  }
  async getSessionByHash(hash: string) {
    const { rows } = await this.sql.query("select * from sessions where token_hash=$1", [hash]);
    const r = rows[0];
    if (!r) return undefined;
    return {
      id: r.id,
      user_id: r.user_id,
      token_hash: r.token_hash,
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
      expires_at: r.expires_at instanceof Date ? r.expires_at.toISOString() : r.expires_at,
      revoked_at: r.revoked_at
        ? r.revoked_at instanceof Date
          ? r.revoked_at.toISOString()
          : r.revoked_at
        : undefined,
    } satisfies SessionRow;
  }
  async revokeSession(id: string) {
    await this.sql.query("update sessions set revoked_at=now() where id=$1 and revoked_at is null", [id]);
  }
  async revokeUserSessions(userId: string) {
    await this.sql.query("update sessions set revoked_at=now() where user_id=$1 and revoked_at is null", [userId]);
  }

  // ── Nurse Passport spine ──────────────────────────────────────────────────
  async getNurseById(id: string) {
    const { rows } = await this.sql.query("select * from nurses where id=$1", [id]);
    return rows[0] ? nurseRow(rows[0]) : undefined;
  }
  async getNurseByEmail(email: string) {
    const { rows } = await this.sql.query("select * from nurses where email=$1", [email.toLowerCase()]);
    return rows[0] ? nurseRow(rows[0]) : undefined;
  }
  async getNurseByRef(app: string, externalId: string) {
    const { rows } = await this.sql.query(
      "select n.* from nurses n join nurse_refs r on r.nurse_id = n.id where r.app=$1 and r.external_id=$2",
      [app, externalId],
    );
    return rows[0] ? nurseRow(rows[0]) : undefined;
  }
  async insertNurse(n: Nurse) {
    await this.sql.query(
      "insert into nurses (id,email,name,user_id) values ($1,$2,$3,$4) on conflict (id) do nothing",
      [n.id, n.email?.toLowerCase() ?? null, n.name ?? null, n.user_id ?? null],
    );
  }
  async updateNurse(id: string, patch: Partial<Nurse>) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (patch.email !== undefined) { sets.push(`email=$${i++}`); vals.push(patch.email?.toLowerCase() ?? null); }
    if (patch.name !== undefined) { sets.push(`name=$${i++}`); vals.push(patch.name ?? null); }
    if (patch.user_id !== undefined) { sets.push(`user_id=$${i++}`); vals.push(patch.user_id ?? null); }
    if (!sets.length) return;
    sets.push("updated_at=now()");
    vals.push(id);
    await this.sql.query(`update nurses set ${sets.join(",")} where id=$${i}`, vals);
  }
  async linkNurseRef(ref: NurseRef) {
    await this.sql.query(
      "insert into nurse_refs (app,external_id,nurse_id) values ($1,$2,$3) on conflict (app,external_id) do update set nurse_id=excluded.nurse_id",
      [ref.app, ref.external_id, ref.nurse_id],
    );
  }
  async refsByNurse(nurseId: string) {
    const { rows } = await this.sql.query("select * from nurse_refs where nurse_id=$1", [nurseId]);
    return rows.map((r) => ({ app: r.app, external_id: r.external_id, nurse_id: r.nurse_id, created_at: iso(r.created_at) }));
  }
  async appendNurseEvent(e: NurseEvent) {
    await this.sql.query(
      "insert into nurse_events (id,nurse_id,type,source,at,data) values ($1,$2,$3,$4,$5,$6)",
      [e.id, e.nurse_id, e.type, e.source, e.at, JSON.stringify(e.data ?? {})],
    );
  }
  async eventsByNurse(nurseId: string) {
    const { rows } = await this.sql.query("select * from nurse_events where nurse_id=$1 order by at asc", [nurseId]);
    return rows.map(nurseEventRow);
  }
  async allNurseBundles() {
    const [nurses, refs, events] = await Promise.all([
      this.sql.query("select * from nurses"),
      this.sql.query("select * from nurse_refs"),
      this.sql.query("select * from nurse_events order by at asc"),
    ]);
    const refsByNurse = new Map<string, NurseRef[]>();
    for (const r of refs.rows) {
      const ref: NurseRef = { app: r.app, external_id: r.external_id, nurse_id: r.nurse_id, created_at: iso(r.created_at) };
      const a = refsByNurse.get(ref.nurse_id) ?? [];
      a.push(ref);
      refsByNurse.set(ref.nurse_id, a);
    }
    const eventsByNurse = new Map<string, NurseEvent[]>();
    for (const e of events.rows) {
      const ev = nurseEventRow(e);
      const a = eventsByNurse.get(ev.nurse_id) ?? [];
      a.push(ev);
      eventsByNurse.set(ev.nurse_id, a);
    }
    return nurses.rows.map((r) => {
      const nurse = nurseRow(r);
      return { nurse, refs: refsByNurse.get(nurse.id) ?? [], events: eventsByNurse.get(nurse.id) ?? [] };
    });
  }

  // ── Consent service ───────────────────────────────────────────────────────
  async insertConsent(c: ConsentRow) {
    await this.sql.query(
      `insert into consents (id,nurse_id,purpose,recipient_category,recipient_org_id,allowed_fields,
        consent_text_version,consent_text_hash,ip_hash,device_hash,status,granted_at,granted_by,revoked_at,revoked_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        c.id, c.nurse_id, c.purpose, c.recipient_category, c.recipient_org_id ?? null, c.allowed_fields,
        c.consent_text_version, c.consent_text_hash, c.ip_hash ?? null, c.device_hash ?? null,
        c.status, c.granted_at, c.granted_by, c.revoked_at ?? null, c.revoked_by ?? null,
      ],
    );
  }
  async revokeConsent(id: string, by: string) {
    await this.sql.query(
      "update consents set status='revoked', revoked_at=now(), revoked_by=$1 where id=$2 and status<>'revoked'",
      [by, id],
    );
  }
  async consentsByNurse(nurseId: string) {
    const { rows } = await this.sql.query("select * from consents where nurse_id=$1 order by granted_at desc", [nurseId]);
    return rows.map(consentRow);
  }
  async liveConsent(nurseId: string, purpose: string, recipientOrgId?: string) {
    const { rows } = await this.sql.query(
      `select * from consents
       where nurse_id=$1 and purpose=$2 and status='granted'
         and (recipient_org_id is null or $3::text is null or recipient_org_id=$3)
       order by granted_at desc limit 1`,
      [nurseId, purpose, recipientOrgId ?? null],
    );
    return rows[0] ? consentRow(rows[0]) : undefined;
  }

  async getIdempotency(key: string) {
    const { rows } = await this.sql.query("select status, body from idempotency_keys where key=$1", [key]);
    return rows[0] ? { status: rows[0].status as number, body: rows[0].body } : undefined;
  }
  async putIdempotency(key: string, status: number, body: unknown) {
    await this.sql.query(
      "insert into idempotency_keys (key, status, body, created_at) values ($1,$2,$3::jsonb,now()) on conflict (key) do update set status=$2, body=$3::jsonb",
      [key, status, JSON.stringify(body ?? null)],
    );
  }

  async insertWebhookSub(s: import("./store.ts").WebhookSub) {
    await this.sql.query(
      "insert into webhook_subscriptions (id, url, secret, event_types, org_id, consent_purpose, active, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (id) do nothing",
      [s.id, s.url, s.secret, s.event_types, s.org_id ?? null, s.consent_purpose ?? null, s.active, s.created_at],
    );
  }
  async listWebhookSubs() {
    const { rows } = await this.sql.query("select * from webhook_subscriptions order by created_at");
    return rows as import("./store.ts").WebhookSub[];
  }
  async recordWebhookDelivery(d: import("./store.ts").WebhookDelivery) {
    const { rows } = await this.sql.query(
      "insert into webhook_deliveries (id, sub_id, event_id, event_type, status, signature, created_at) values ($1,$2,$3,$4,$5,$6,$7) on conflict (id) do nothing returning id",
      [d.id, d.sub_id, d.event_id, d.event_type, d.status, d.signature, d.created_at],
    );
    return rows.length > 0; // empty when the (sub,event) delivery already existed (idempotent)
  }
  async webhookDeliveries() {
    const { rows } = await this.sql.query("select * from webhook_deliveries order by created_at");
    return rows as import("./store.ts").WebhookDelivery[];
  }

  async insertCreditDecision(d: import("./store.ts").CreditDecision) {
    await this.sql.query(
      `insert into credit_decisions (id, nurse_id, lender_org_id, decision, reason_codes, amount_usd, decided_by, adverse_action_at, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict (id) do nothing`,
      [d.id, d.nurse_id, d.lender_org_id, d.decision, d.reason_codes, d.amount_usd ?? null, d.decided_by, d.adverse_action_at ?? null, d.created_at],
    );
  }
  async getCreditDecision(id: string) {
    const { rows } = await this.sql.query("select * from credit_decisions where id=$1", [id]);
    return rows[0] ? (rows[0] as import("./store.ts").CreditDecision) : undefined;
  }
  async updateCreditDecision(id: string, patch: Partial<import("./store.ts").CreditDecision>) {
    if (patch.adverse_action_at !== undefined) await this.sql.query("update credit_decisions set adverse_action_at=$1 where id=$2", [patch.adverse_action_at, id]);
    if (patch.decision !== undefined) await this.sql.query("update credit_decisions set decision=$1 where id=$2", [patch.decision, id]);
  }
  async creditDecisionsByNurse(nurseId: string) {
    const { rows } = await this.sql.query("select * from credit_decisions where nurse_id=$1 order by created_at", [nurseId]);
    return rows as import("./store.ts").CreditDecision[];
  }
  async insertDataDispute(d: import("./store.ts").DataDispute) {
    await this.sql.query(
      `insert into data_disputes (id, nurse_id, field, claim, status, raised_by, resolution, created_at, resolved_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict (id) do nothing`,
      [d.id, d.nurse_id, d.field, d.claim, d.status, d.raised_by, d.resolution ?? null, d.created_at, d.resolved_at ?? null],
    );
  }
  async updateDataDispute(id: string, patch: Partial<import("./store.ts").DataDispute>) {
    if (patch.status !== undefined) await this.sql.query("update data_disputes set status=$1 where id=$2", [patch.status, id]);
    if (patch.resolution !== undefined) await this.sql.query("update data_disputes set resolution=$1 where id=$2", [patch.resolution, id]);
    if (patch.resolved_at !== undefined) await this.sql.query("update data_disputes set resolved_at=$1 where id=$2", [patch.resolved_at, id]);
  }
  async disputesByNurse(nurseId: string) {
    const { rows } = await this.sql.query("select * from data_disputes where nurse_id=$1 order by created_at", [nurseId]);
    return rows as import("./store.ts").DataDispute[];
  }
}
