// Storage seam. Core runs on an in-memory store by default (optionally persisted
// to a JSON file for local dev) and on Postgres when DATABASE_URL is set —
// mirroring florence-academy/api's MemoryStore / PostgresStore split. Nothing
// above this file knows which backend is live.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Config } from "./config.ts";
import type { Role } from "./roles.ts";

export interface User {
  id: string;
  email: string;
  name?: string;
  google_sub?: string;
  password_hash?: string;
  status: "active" | "suspended" | "invited";
  /** Optional link to a candidate record (Academy/Pathway) — emitted as `cand`. */
  cand_id?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface Org {
  id: string;
  kind: "employer" | "university" | "lender" | "internal";
  name: string;
  /** e.g. an ATS employerId or school slug, for cross-app joins. */
  external_ref?: string;
  created_at: string;
}

export interface RoleGrant {
  id: string;
  user_id: string;
  role: Role;
  org_id?: string;
  territory?: string;
  granted_by?: string;
  granted_at: string;
}

export interface ApiClient {
  client_id: string;
  name: string;
  secret_hash: string;
  allowed_scopes: string[];
  /** Target service this client may call (florenceos SERVICE_AUTH aud). */
  audience?: string;
  /** Org this client represents (a partner bank / employer / university). Emitted as
   *  the `org_id` claim so a partner M2M token resolves to its org-scoped audience. */
  org_id?: string;
  active: boolean;
  created_at: string;
}

export interface SigningKeyRow {
  kid: string;
  alg: string;
  public_jwk: Record<string, unknown>;
  private_pem_enc: string;
  status: "active" | "retiring" | "revoked";
  created_at: string;
}

export interface AuditRow {
  id: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
  entity_id?: string;
  detail?: Record<string, unknown>;
  /** Tamper-evidence chain: hash of the previous row + hash of this row. */
  prev_hash?: string;
  row_hash?: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  /** SHA-256 of the opaque refresh token (never the token itself). */
  token_hash: string;
  created_at: string;
  expires_at: string;
  revoked_at?: string;
}

// ── Nurse Passport spine ────────────────────────────────────────────────────
export interface Nurse {
  id: string;
  /** Lowercased canonical resolution key. */
  email?: string;
  name?: string;
  /** Optional link to a sign-in account. */
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface NurseRef {
  app: string; // 'academy' | 'pathway' | 'ats' | …
  external_id: string;
  nurse_id: string;
  created_at: string;
}

export interface NurseEvent {
  id: string;
  nurse_id: string;
  type: string; // canonical vocabulary in passport.ts
  source: string; // emitting app/service
  at: string;
  data: Record<string, unknown>;
  created_at: string;
}

/** Canonical, versioned consent record. The source of truth for disclosure. */
export interface ConsentRow {
  id: string;
  nurse_id: string;
  purpose: string; // employer_share | underwriting | education | visa | demand_radar
  recipient_category: string; // employer | lender | university | internal
  recipient_org_id?: string; // null = category-wide
  allowed_fields: string[];
  consent_text_version: string;
  consent_text_hash: string;
  ip_hash?: string;
  device_hash?: string;
  status: "granted" | "revoked";
  granted_at: string;
  granted_by: string;
  revoked_at?: string;
  revoked_by?: string;
}

export interface Store {
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleSub(sub: string): Promise<User | undefined>;
  insertUser(u: User): Promise<void>;
  updateUser(id: string, patch: Partial<User>): Promise<void>;
  listUsers(): Promise<User[]>;

  getOrgById(id: string): Promise<Org | undefined>;
  getOrgByExternalRef(ref: string): Promise<Org | undefined>;
  insertOrg(o: Org): Promise<void>;
  listOrgs(): Promise<Org[]>;

  grantsByUser(userId: string): Promise<RoleGrant[]>;
  insertGrant(g: RoleGrant): Promise<void>;
  deleteGrant(id: string): Promise<void>;
  anyGrantWithRole(role: Role): Promise<boolean>;
  listGrants(): Promise<RoleGrant[]>;

  getClient(clientId: string): Promise<ApiClient | undefined>;
  insertClient(c: ApiClient): Promise<void>;
  listClients(): Promise<ApiClient[]>;

  listSigningKeys(): Promise<SigningKeyRow[]>;
  insertSigningKey(k: SigningKeyRow): Promise<void>;
  updateSigningKeyStatus(kid: string, status: SigningKeyRow["status"]): Promise<void>;

  appendAudit(a: AuditRow): Promise<void>;
  recentAudit(limit: number): Promise<AuditRow[]>;
  /** The row_hash of the most recently appended audit row (for chaining). */
  lastAuditHash(): Promise<string | null>;
  /** All audit rows in append order (for chain verification). */
  allAuditOrdered(): Promise<AuditRow[]>;

  insertSession(s: SessionRow): Promise<void>;
  getSessionByHash(hash: string): Promise<SessionRow | undefined>;
  revokeSession(id: string): Promise<void>;
  revokeUserSessions(userId: string): Promise<void>;

  // Nurse Passport spine
  getNurseById(id: string): Promise<Nurse | undefined>;
  getNurseByEmail(email: string): Promise<Nurse | undefined>;
  getNurseByRef(app: string, externalId: string): Promise<Nurse | undefined>;
  insertNurse(n: Nurse): Promise<void>;
  updateNurse(id: string, patch: Partial<Nurse>): Promise<void>;
  linkNurseRef(ref: NurseRef): Promise<void>;
  refsByNurse(nurseId: string): Promise<NurseRef[]>;
  /** All events for a nurse, oldest first (the fold order). */
  appendNurseEvent(e: NurseEvent): Promise<void>;
  eventsByNurse(nurseId: string): Promise<NurseEvent[]>;
  /** Every nurse with its refs + events (oldest-first), for cross-nurse aggregation
   *  (the Control Tower). Single-pass per backend — not N+1. */
  allNurseBundles(): Promise<{ nurse: Nurse; refs: NurseRef[]; events: NurseEvent[] }[]>;

  // Consent service (canonical)
  insertConsent(c: ConsentRow): Promise<void>;
  revokeConsent(id: string, by: string): Promise<void>;
  consentsByNurse(nurseId: string): Promise<ConsentRow[]>;
  /** The newest live (status='granted') consent for (purpose, recipient), if any. */
  liveConsent(nurseId: string, purpose: string, recipientOrgId?: string): Promise<ConsentRow | undefined>;

  // Durable idempotency for gateway create routes — a retried create replays the
  // original response instead of double-applying. Caller-scoped key; only 2xx stored.
  getIdempotency(key: string): Promise<{ status: number; body: unknown } | undefined>;
  putIdempotency(key: string, status: number, body: unknown): Promise<void>;

  // Outbound webhooks: partner subscriptions + an idempotent delivery log.
  insertWebhookSub(s: WebhookSub): Promise<void>;
  listWebhookSubs(): Promise<WebhookSub[]>;
  /** Records a delivery; returns false if (subId,eventId) was already delivered (idempotent). */
  recordWebhookDelivery(d: WebhookDelivery): Promise<boolean>;
  webhookDeliveries(): Promise<WebhookDelivery[]>;

  // Lending: credit-decision records (carry adverse-action) + candidate data disputes.
  insertCreditDecision(d: CreditDecision): Promise<void>;
  getCreditDecision(id: string): Promise<CreditDecision | undefined>;
  updateCreditDecision(id: string, patch: Partial<CreditDecision>): Promise<void>;
  creditDecisionsByNurse(nurseId: string): Promise<CreditDecision[]>;
  insertDataDispute(d: DataDispute): Promise<void>;
  updateDataDispute(id: string, patch: Partial<DataDispute>): Promise<void>;
  disputesByNurse(nurseId: string): Promise<DataDispute[]>;
}

/** A lender's credit decision for a nurse. A `denied` decision is the basis of an
 *  ECOA/FCRA adverse-action notice (reason_codes required; adverse_action_at stamps it). */
export interface CreditDecision {
  id: string;
  nurse_id: string;
  lender_org_id: string;
  decision: "approved" | "denied" | "pending" | "withdrawn";
  reason_codes: string[];
  amount_usd?: number;
  decided_by: string;
  adverse_action_at?: string;
  created_at: string;
}

/** A candidate-raised data-accuracy dispute (FCRA): a contested Passport field + its
 *  resolution. Underwriting data a candidate disputes can be flagged/corrected. */
export interface DataDispute {
  id: string;
  nurse_id: string;
  field: string;
  claim: string;
  status: "open" | "resolved" | "rejected";
  raised_by: string;
  resolution?: string;
  created_at: string;
  resolved_at?: string;
}

export interface WebhookSub {
  id: string;
  url: string;
  /** HMAC signing secret (server-to-server). */
  secret: string;
  /** Event types this endpoint receives ('*' = all). */
  event_types: string[];
  /** Consent-scoped delivery (lenders): when both are set, an event for nurse N is
   *  delivered ONLY if a live consent for (consent_purpose, org_id) exists for N. */
  org_id?: string;
  consent_purpose?: string;
  active: boolean;
  created_at: string;
}

export interface WebhookDelivery {
  /** `${sub_id}:${event_id}` — the natural idempotency key. */
  id: string;
  sub_id: string;
  event_id: string;
  event_type: string;
  status: "recorded" | "sent" | "failed";
  signature: string;
  created_at: string;
}

interface Snapshot {
  users: User[];
  orgs: Org[];
  grants: RoleGrant[];
  clients: ApiClient[];
  keys: SigningKeyRow[];
  audit: AuditRow[];
  sessions: SessionRow[];
  nurses?: Nurse[];
  nurseRefs?: NurseRef[];
  nurseEvents?: NurseEvent[];
  consents?: ConsentRow[];
}

export class MemoryStore implements Store {
  private users = new Map<string, User>();
  private orgs = new Map<string, Org>();
  private grants = new Map<string, RoleGrant>();
  private clients = new Map<string, ApiClient>();
  private keys = new Map<string, SigningKeyRow>();
  private audit: AuditRow[] = [];
  private sessions = new Map<string, SessionRow>();
  private nurses = new Map<string, Nurse>();
  private nurseRefs = new Map<string, NurseRef>(); // key: `${app} ${external_id}`
  private nurseEvents: NurseEvent[] = [];
  private consents = new Map<string, ConsentRow>();
  private idempotency = new Map<string, { status: number; body: unknown }>();
  private webhookSubs = new Map<string, WebhookSub>();
  private webhookDelivs = new Map<string, WebhookDelivery>();
  private creditDecisions = new Map<string, CreditDecision>();
  private dataDisputes = new Map<string, DataDispute>();
  private file?: string;

  constructor(file?: string) {
    if (file) {
      this.file = file;
      this.load();
    }
  }

  private load(): void {
    if (!this.file || !existsSync(this.file)) return;
    try {
      const s = JSON.parse(readFileSync(this.file, "utf8")) as Snapshot;
      for (const u of s.users ?? []) this.users.set(u.id, u);
      for (const o of s.orgs ?? []) this.orgs.set(o.id, o);
      for (const g of s.grants ?? []) this.grants.set(g.id, g);
      for (const c of s.clients ?? []) this.clients.set(c.client_id, c);
      for (const k of s.keys ?? []) this.keys.set(k.kid, k);
      for (const se of s.sessions ?? []) this.sessions.set(se.id, se);
      for (const n of s.nurses ?? []) this.nurses.set(n.id, n);
      for (const r of s.nurseRefs ?? []) this.nurseRefs.set(`${r.app} ${r.external_id}`, r);
      this.nurseEvents = s.nurseEvents ?? [];
      for (const c of s.consents ?? []) this.consents.set(c.id, c);
      this.audit = s.audit ?? [];
    } catch {
      /* corrupt dev state — start fresh */
    }
  }

  private persist(): void {
    if (!this.file) return;
    const snap: Snapshot = {
      users: [...this.users.values()],
      orgs: [...this.orgs.values()],
      grants: [...this.grants.values()],
      clients: [...this.clients.values()],
      keys: [...this.keys.values()],
      audit: this.audit.slice(-2000),
      sessions: [...this.sessions.values()],
      nurses: [...this.nurses.values()],
      nurseRefs: [...this.nurseRefs.values()],
      nurseEvents: this.nurseEvents,
      consents: [...this.consents.values()],
    };
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(snap, null, 2));
  }

  async getUserById(id: string) {
    return this.users.get(id);
  }
  async getUserByEmail(email: string) {
    const e = email.toLowerCase();
    return [...this.users.values()].find((u) => u.email === e);
  }
  async getUserByGoogleSub(sub: string) {
    return [...this.users.values()].find((u) => u.google_sub === sub);
  }
  async insertUser(u: User) {
    this.users.set(u.id, u);
    this.persist();
  }
  async updateUser(id: string, patch: Partial<User>) {
    const u = this.users.get(id);
    if (!u) return;
    this.users.set(id, { ...u, ...patch, updated_at: new Date().toISOString() });
    this.persist();
  }
  async listUsers() {
    return [...this.users.values()];
  }

  async getOrgById(id: string) {
    return this.orgs.get(id);
  }
  async getOrgByExternalRef(ref: string) {
    return [...this.orgs.values()].find((o) => o.external_ref === ref);
  }
  async insertOrg(o: Org) {
    this.orgs.set(o.id, o);
    this.persist();
  }
  async listOrgs() {
    return [...this.orgs.values()];
  }

  async grantsByUser(userId: string) {
    return [...this.grants.values()].filter((g) => g.user_id === userId);
  }
  async insertGrant(g: RoleGrant) {
    this.grants.set(g.id, g);
    this.persist();
  }
  async deleteGrant(id: string) {
    this.grants.delete(id);
    this.persist();
  }
  async anyGrantWithRole(role: Role) {
    return [...this.grants.values()].some((g) => g.role === role);
  }
  async listGrants() {
    return [...this.grants.values()];
  }

  async getClient(clientId: string) {
    return this.clients.get(clientId);
  }
  async insertClient(c: ApiClient) {
    this.clients.set(c.client_id, c);
    this.persist();
  }
  async listClients() {
    return [...this.clients.values()];
  }

  async listSigningKeys() {
    return [...this.keys.values()].filter((k) => k.status !== "revoked");
  }
  async insertSigningKey(k: SigningKeyRow) {
    this.keys.set(k.kid, k);
    this.persist();
  }
  async updateSigningKeyStatus(kid: string, status: SigningKeyRow["status"]) {
    const k = this.keys.get(kid);
    if (!k) return;
    this.keys.set(kid, { ...k, status });
    this.persist();
  }

  async appendAudit(a: AuditRow) {
    this.audit.push(a);
    this.persist();
  }
  async recentAudit(limit: number) {
    return this.audit.slice(-limit).reverse();
  }
  async lastAuditHash() {
    const last = this.audit[this.audit.length - 1];
    return last?.row_hash ?? null;
  }
  async allAuditOrdered() {
    return [...this.audit];
  }

  async insertSession(s: SessionRow) {
    this.sessions.set(s.id, s);
    this.persist();
  }
  async getSessionByHash(hash: string) {
    return [...this.sessions.values()].find((s) => s.token_hash === hash);
  }
  async revokeSession(id: string) {
    const s = this.sessions.get(id);
    if (s && !s.revoked_at) {
      this.sessions.set(id, { ...s, revoked_at: new Date().toISOString() });
      this.persist();
    }
  }
  async revokeUserSessions(userId: string) {
    let changed = false;
    for (const [k, s] of this.sessions) {
      if (s.user_id === userId && !s.revoked_at) {
        this.sessions.set(k, { ...s, revoked_at: new Date().toISOString() });
        changed = true;
      }
    }
    if (changed) this.persist();
  }

  async getNurseById(id: string) {
    return this.nurses.get(id);
  }
  async getNurseByEmail(email: string) {
    const e = email.toLowerCase();
    return [...this.nurses.values()].find((n) => n.email === e);
  }
  async getNurseByRef(app: string, externalId: string) {
    const ref = this.nurseRefs.get(`${app} ${externalId}`);
    return ref ? this.nurses.get(ref.nurse_id) : undefined;
  }
  async insertNurse(n: Nurse) {
    this.nurses.set(n.id, { ...n, email: n.email?.toLowerCase() });
    this.persist();
  }
  async updateNurse(id: string, patch: Partial<Nurse>) {
    const n = this.nurses.get(id);
    if (!n) return;
    this.nurses.set(id, {
      ...n,
      ...patch,
      ...(patch.email ? { email: patch.email.toLowerCase() } : {}),
      updated_at: new Date().toISOString(),
    });
    this.persist();
  }
  async linkNurseRef(ref: NurseRef) {
    this.nurseRefs.set(`${ref.app} ${ref.external_id}`, ref);
    this.persist();
  }
  async refsByNurse(nurseId: string) {
    return [...this.nurseRefs.values()].filter((r) => r.nurse_id === nurseId);
  }
  async appendNurseEvent(e: NurseEvent) {
    this.nurseEvents.push(e);
    this.persist();
  }
  async eventsByNurse(nurseId: string) {
    return this.nurseEvents
      .filter((e) => e.nurse_id === nurseId)
      .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  }
  async allNurseBundles() {
    const refs = new Map<string, NurseRef[]>();
    for (const r of this.nurseRefs.values()) {
      const a = refs.get(r.nurse_id) ?? [];
      a.push(r);
      refs.set(r.nurse_id, a);
    }
    const events = new Map<string, NurseEvent[]>();
    for (const e of [...this.nurseEvents].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))) {
      const a = events.get(e.nurse_id) ?? [];
      a.push(e);
      events.set(e.nurse_id, a);
    }
    return [...this.nurses.values()].map((n) => ({ nurse: n, refs: refs.get(n.id) ?? [], events: events.get(n.id) ?? [] }));
  }

  async insertConsent(c: ConsentRow) {
    this.consents.set(c.id, c);
    this.persist();
  }
  async revokeConsent(id: string, by: string) {
    const c = this.consents.get(id);
    if (c && c.status !== "revoked") {
      this.consents.set(id, { ...c, status: "revoked", revoked_at: new Date().toISOString(), revoked_by: by });
      this.persist();
    }
  }
  async consentsByNurse(nurseId: string) {
    return [...this.consents.values()]
      .filter((c) => c.nurse_id === nurseId)
      .sort((a, b) => (a.granted_at < b.granted_at ? 1 : -1));
  }
  async liveConsent(nurseId: string, purpose: string, recipientOrgId?: string) {
    return [...this.consents.values()]
      .filter(
        (c) =>
          c.nurse_id === nurseId &&
          c.purpose === purpose &&
          c.status === "granted" &&
          // org-specific consent matches its org; category-wide (no org) matches any.
          (!c.recipient_org_id || !recipientOrgId || c.recipient_org_id === recipientOrgId),
      )
      .sort((a, b) => (a.granted_at < b.granted_at ? 1 : -1))[0];
  }

  async getIdempotency(key: string) {
    return this.idempotency.get(key);
  }
  async putIdempotency(key: string, status: number, body: unknown) {
    this.idempotency.set(key, { status, body });
  }

  async insertWebhookSub(s: WebhookSub) {
    this.webhookSubs.set(s.id, s);
  }
  async listWebhookSubs() {
    return [...this.webhookSubs.values()];
  }
  async recordWebhookDelivery(d: WebhookDelivery) {
    if (this.webhookDelivs.has(d.id)) return false;
    this.webhookDelivs.set(d.id, d);
    return true;
  }
  async webhookDeliveries() {
    return [...this.webhookDelivs.values()];
  }

  async insertCreditDecision(d: CreditDecision) {
    this.creditDecisions.set(d.id, d);
  }
  async getCreditDecision(id: string) {
    return this.creditDecisions.get(id);
  }
  async updateCreditDecision(id: string, patch: Partial<CreditDecision>) {
    const d = this.creditDecisions.get(id);
    if (d) this.creditDecisions.set(id, { ...d, ...patch });
  }
  async creditDecisionsByNurse(nurseId: string) {
    return [...this.creditDecisions.values()].filter((d) => d.nurse_id === nurseId);
  }
  async insertDataDispute(d: DataDispute) {
    this.dataDisputes.set(d.id, d);
  }
  async updateDataDispute(id: string, patch: Partial<DataDispute>) {
    const d = this.dataDisputes.get(id);
    if (d) this.dataDisputes.set(id, { ...d, ...patch });
  }
  async disputesByNurse(nurseId: string) {
    return [...this.dataDisputes.values()].filter((d) => d.nurse_id === nurseId);
  }
}

/** Pick the store backend from config. */
export async function createStore(config: Config): Promise<Store> {
  if (config.databaseUrl) {
    const { PostgresStore, connect } = await import("./store.postgres.ts");
    const sql = await connect(config.databaseUrl);
    return new PostgresStore(sql);
  }
  return new MemoryStore(config.stateFile);
}
