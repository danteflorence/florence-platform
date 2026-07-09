-- FlorenceRN Core — identity schema (Postgres). Idempotent (CREATE … IF NOT
-- EXISTS), safe to re-run via `npm run migrate`. Humans who sign in live in
-- `users` (distinct from Academy's `candidates`; the `cand_id` column bridges
-- the two). Generalizes labor-economics-agent/rbac.py and florenceos RBAC.

-- Humans who sign in (staff + external partners/end-users).
CREATE TABLE IF NOT EXISTS users (
  id            text PRIMARY KEY,
  email         text NOT NULL UNIQUE,            -- lowercased canonical
  name          text,
  google_sub    text UNIQUE,                     -- set for Google (staff) accounts
  password_hash text,                            -- scrypt "salt:hash" for external users
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','invited')),
  cand_id       text,                            -- optional link to a candidate record → emitted as `cand`
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

-- Employers / universities / (future) lenders. Staff roles use org_id NULL.
CREATE TABLE IF NOT EXISTS orgs (
  id           text PRIMARY KEY,
  kind         text NOT NULL CHECK (kind IN ('employer','university','lender','internal')),
  name         text NOT NULL,
  external_ref text,                             -- e.g. ATS employerId / school slug (cross-app join)
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orgs_external_ref_idx ON orgs (external_ref);

-- Partner tenant isolation: every external partner maps to one tenant scope, and
-- every program workspace declares its owner plus authorized partner orgs.
CREATE TABLE IF NOT EXISTS partner_orgs (
  id         text PRIMARY KEY,
  kind       text NOT NULL CHECK (kind IN ('amn','employer','lender','university','ats_vms','internal')),
  name       text NOT NULL,
  tenant_id  text NOT NULL,
  status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_orgs_tenant_idx ON partner_orgs (tenant_id);

CREATE TABLE IF NOT EXISTS tenant_scopes (
  id                  text PRIMARY KEY,
  org_id              text NOT NULL UNIQUE,
  tenant_id           text NOT NULL,
  partner_org_id      text NOT NULL REFERENCES partner_orgs (id),
  partner_kind        text NOT NULL CHECK (partner_kind IN ('amn','employer','lender','university','ats_vms','internal')),
  allowed_program_ids text[] NOT NULL DEFAULT '{}',
  allowed_purposes    text[] NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tenant_scopes_tenant_idx ON tenant_scopes (tenant_id);

CREATE TABLE IF NOT EXISTS program_scopes (
  id                         text PRIMARY KEY,
  name                       text NOT NULL,
  owner_org_id               text NOT NULL,
  employer_org_id            text,
  authorized_partner_org_ids text[] NOT NULL DEFAULT '{}',
  authorized_actions         text[] NOT NULL DEFAULT '{}',
  approved_packet_nurse_ids  text[] NOT NULL DEFAULT '{}',
  active_job_ids             text[] NOT NULL DEFAULT '{}',
  status                     text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','closed')),
  created_at                 timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS program_scopes_owner_idx ON program_scopes (owner_org_id);
ALTER TABLE program_scopes ADD COLUMN IF NOT EXISTS active_job_ids text[] NOT NULL DEFAULT '{}';

-- user ↔ org ↔ role. Staff grants have org_id NULL (global).
CREATE TABLE IF NOT EXISTS role_grants (
  id         text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role       text NOT NULL,
  org_id     text REFERENCES orgs (id),
  territory  text,                               -- optional rep scoping (mirrors rbac.py)
  granted_by text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, org_id)
);
CREATE INDEX IF NOT EXISTS role_grants_user_idx ON role_grants (user_id);
CREATE INDEX IF NOT EXISTS role_grants_role_idx ON role_grants (role);

-- M2M partner clients (client_credentials) — same shape as Academy's api_clients.
CREATE TABLE IF NOT EXISTS api_clients (
  client_id      text PRIMARY KEY,
  name           text NOT NULL,
  secret_hash    text NOT NULL,
  allowed_scopes text[] NOT NULL DEFAULT '{}',
  audience       text,                           -- which service this client may call
  org_id         text,                           -- org this client represents (partner bank / employer)
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- RS256 signing keys. Private PEM is encrypted at rest (crypto.ts makeFieldCrypto
-- envelope) — never plaintext. Keys persist so tokens survive restarts and rotate
-- via kid (active → retiring → revoked).
CREATE TABLE IF NOT EXISTS signing_keys (
  kid             text PRIMARY KEY,
  alg             text NOT NULL DEFAULT 'RS256',
  public_jwk      jsonb NOT NULL,
  private_pem_enc text NOT NULL,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','retiring','revoked')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Refresh sessions (the fl_refresh cookie). Stores only the SHA-256 of the
-- opaque token; rotated on every use; revoked on logout — this is what makes
-- logout real and lets access tokens stay short-lived.
CREATE TABLE IF NOT EXISTS sessions (
  id         text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

-- Append-only audit of identity events (login, grant, org create, key rotate).
CREATE TABLE IF NOT EXISTS audit_log (
  id        text PRIMARY KEY,
  at        timestamptz NOT NULL DEFAULT now(),
  actor     text NOT NULL,
  action    text NOT NULL,
  entity    text NOT NULL,
  entity_id text,
  detail    jsonb
);
CREATE INDEX IF NOT EXISTS audit_log_at_idx ON audit_log (at DESC);

-- Tamper-evidence: each row carries the hash of the previous row + a hash of
-- itself, forming a chain. A monotonic `seq` gives deterministic verify order.
-- Reads of sensitive data are logged here too (action='passport.read'). The
-- table is enforced append-only at the DB level (UPDATE/DELETE blocked).
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS seq       bigserial;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS prev_hash text;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS row_hash  text;
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only (tamper-evident)';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS audit_log_no_mutate ON audit_log;
CREATE TRIGGER audit_log_no_mutate BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

-- ────────────────────────────────────────────────────────────────────────────
-- THE NURSE PASSPORT SPINE
-- One canonical nurse identity + an append-only event log spanning every app.
-- The Passport (readiness, NCLEX, licensure, visa, docs, consents, placement) is
-- a PROJECTION folded from nurse_events — never edited directly. Each app keeps
-- its own DB; this is the cross-app read-model the roadmap calls for.
-- ────────────────────────────────────────────────────────────────────────────

-- The canonical nurse. Resolved primarily by email; optionally linked to a login.
CREATE TABLE IF NOT EXISTS nurses (
  id         text PRIMARY KEY,
  email      text UNIQUE,                       -- lowercased canonical resolution key
  name       text,
  user_id    text REFERENCES users (id),        -- optional link to a sign-in account
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Application Gate duplicate-submission lock. A nurse may express interest
-- anywhere, but a formal employer/ATS/VMS submission gets one active lock per
-- candidate + employer + channel until released, expired, rejected, or withdrawn.
CREATE TABLE IF NOT EXISTS application_submission_locks (
  id                 text PRIMARY KEY,
  nurse_id           text NOT NULL REFERENCES nurses (id) ON DELETE CASCADE,
  employer_id        text NOT NULL,
  program_id         text,
  job_requisition_id text,
  channel            text NOT NULL CHECK (channel IN ('direct','ats','vms','amn','other')),
  submission_id      text,
  status             text NOT NULL DEFAULT 'active' CHECK (status IN ('active','released','expired')),
  locked_at          timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz,
  released_at        timestamptz,
  released_by        text
);
CREATE UNIQUE INDEX IF NOT EXISTS application_submission_locks_active_idx
  ON application_submission_locks (nurse_id, employer_id, channel)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS application_submission_locks_lookup_idx
  ON application_submission_locks (nurse_id, employer_id, channel, status);

-- Per-app external id → canonical nurse (academy candidateId, pathway dossierId,
-- ats candidateId). This is how four disconnected records become one.
CREATE TABLE IF NOT EXISTS nurse_refs (
  app         text NOT NULL,                    -- 'academy' | 'pathway' | 'ats' | …
  external_id text NOT NULL,
  nurse_id    text NOT NULL REFERENCES nurses (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (app, external_id)
);
CREATE INDEX IF NOT EXISTS nurse_refs_nurse_idx ON nurse_refs (nurse_id);

-- Append-only journey events from every app. The Passport is a fold of these,
-- so the log is the source of truth and nothing is ever lost or overwritten.
CREATE TABLE IF NOT EXISTS nurse_events (
  id         text PRIMARY KEY,
  nurse_id   text NOT NULL REFERENCES nurses (id) ON DELETE CASCADE,
  type       text NOT NULL,                     -- e.g. 'academy.assessment_completed','ats.started'
  source     text NOT NULL,                     -- emitting app/service
  at         timestamptz NOT NULL DEFAULT now(),
  data       jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nurse_events_nurse_idx ON nurse_events (nurse_id, at);
CREATE INDEX IF NOT EXISTS nurse_events_type_idx ON nurse_events (type);

-- ────────────────────────────────────────────────────────────────────────────
-- CONSENT SERVICE (canonical)
-- First-class, versioned, granular, revocable consent — the source of truth for
-- "may this recipient see this candidate's data for this purpose?". Apps may keep
-- their own consent capture UIs but dual-write here; disclosure (passportView)
-- requires a LIVE row here (fail-closed). See docs/security/consent-model.md.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consents (
  id                   text PRIMARY KEY,
  nurse_id             text NOT NULL REFERENCES nurses (id) ON DELETE CASCADE,
  purpose              text NOT NULL,             -- 'employer_share'|'underwriting'|'education'|'visa'|'demand_radar'
  recipient_category   text NOT NULL,             -- 'employer'|'lender'|'university'|'internal'
  recipient_org_id     text,                      -- exact recipient org for external shares; null reserved for internal/aggregate cases
  recipient_program_id text,                      -- exact program/workspace for employer-share consent when applicable
  allowed_fields       text[] NOT NULL DEFAULT '{}',
  consent_text_version text NOT NULL,
  consent_text_hash    text NOT NULL,
  ip_hash              text,                       -- sha256(ip+salt) — never the raw IP
  device_hash          text,
  status               text NOT NULL DEFAULT 'granted' CHECK (status IN ('granted','revoked')),
  granted_at           timestamptz NOT NULL DEFAULT now(),
  granted_by           text NOT NULL,             -- actor (candidate sub / staff email)
  revoked_at           timestamptz,
  revoked_by           text
);
CREATE INDEX IF NOT EXISTS consents_nurse_idx ON consents (nurse_id, purpose);
CREATE INDEX IF NOT EXISTS consents_recipient_idx ON consents (recipient_org_id);
ALTER TABLE consents ADD COLUMN IF NOT EXISTS recipient_program_id text;
CREATE INDEX IF NOT EXISTS consents_program_idx ON consents (recipient_program_id);

-- ────────────────────────────────────────────────────────────────────────────
-- DOCUMENT VAULT
-- Restricted source documents are stored only as envelope-encrypted blobs and
-- accessed through short-lived opaque signed grants. Public URLs carry only a
-- random token, never nurse IDs, names, document IDs, passport numbers, or SEVIS.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restricted_documents (
  id                  text PRIMARY KEY,
  nurse_id            text NOT NULL REFERENCES nurses (id) ON DELETE CASCADE,
  document_type       text NOT NULL,
  data_class          text NOT NULL,
  owner_org_id        text,
  program_id          text,
  content_type        text NOT NULL,
  extension           text NOT NULL,
  size_bytes          integer NOT NULL,
  sha256              text NOT NULL,
  encrypted_blob      text NOT NULL,
  storage_key         text NOT NULL,
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','deleted')),
  retention_policy    text,
  retain_until        timestamptz,
  delete_after        timestamptz,
  malware_scan_status text NOT NULL DEFAULT 'pending' CHECK (malware_scan_status IN ('clean','blocked','pending')),
  created_by          text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  revoked_at          timestamptz,
  revoked_by          text,
  deleted_at          timestamptz,
  deleted_by          text
);
CREATE INDEX IF NOT EXISTS restricted_documents_nurse_idx ON restricted_documents (nurse_id, document_type);
CREATE INDEX IF NOT EXISTS restricted_documents_owner_idx ON restricted_documents (owner_org_id, program_id);
CREATE INDEX IF NOT EXISTS restricted_documents_status_idx ON restricted_documents (status);

CREATE TABLE IF NOT EXISTS document_access_grants (
  id               text PRIMARY KEY,
  token_hash       text NOT NULL UNIQUE,
  document_id      text NOT NULL REFERENCES restricted_documents (id) ON DELETE CASCADE,
  nurse_id         text NOT NULL REFERENCES nurses (id) ON DELETE CASCADE,
  recipient_view   text NOT NULL,
  recipient_org_id text,
  actor            text NOT NULL,
  purpose          text NOT NULL,
  action           text NOT NULL CHECK (action IN ('view','download')),
  expires_at       timestamptz NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  used_at          timestamptz,
  revoked_at       timestamptz
);
CREATE INDEX IF NOT EXISTS document_access_grants_document_idx ON document_access_grants (document_id);
CREATE INDEX IF NOT EXISTS document_access_grants_expiry_idx ON document_access_grants (expires_at);

-- ────────────────────────────────────────────────────────────────────────────
-- IDEMPOTENCY — gateway create routes replay the original response for a repeated
-- Idempotency-Key instead of double-applying. Caller-scoped key; only 2xx stored.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key        text PRIMARY KEY,
  status     integer NOT NULL,
  body       jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- OUTBOUND WEBHOOKS — partner subscriptions + an idempotent delivery log. Events
-- on the canonical stream fan out to subscribed endpoints with an HMAC signature.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id              text PRIMARY KEY,
  url             text NOT NULL,
  secret          text NOT NULL,
  event_types     text[] NOT NULL DEFAULT '{}',
  org_id          text,                              -- consent-scoped delivery (lenders)
  consent_purpose text,                              -- e.g. 'underwriting'
  active          boolean NOT NULL DEFAULT true,
  created_at      text NOT NULL
);
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id          text PRIMARY KEY,            -- `${sub_id}:${event_id}` (idempotency key)
  sub_id      text NOT NULL,
  event_id    text NOT NULL,
  event_type  text NOT NULL,
  status      text NOT NULL,
  signature   text NOT NULL,
  created_at  text NOT NULL
);

-- ────────────────────────────────────────────────────────────────────────────
-- LENDING — credit-decision records (a denial carries the ECOA/FCRA adverse-action
-- basis: reason_codes + adverse_action_at) + candidate data-accuracy disputes (FCRA).
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_decisions (
  id                text PRIMARY KEY,
  nurse_id          text NOT NULL,
  lender_org_id     text NOT NULL,
  decision          text NOT NULL,                  -- approved | denied | pending | withdrawn
  reason_codes      text[] NOT NULL DEFAULT '{}',
  amount_usd        numeric,
  decided_by        text NOT NULL,
  adverse_action_at text,
  created_at        text NOT NULL
);
CREATE INDEX IF NOT EXISTS credit_decisions_nurse_idx ON credit_decisions (nurse_id);
CREATE TABLE IF NOT EXISTS data_disputes (
  id          text PRIMARY KEY,
  nurse_id    text NOT NULL,
  field       text NOT NULL,
  claim       text NOT NULL,
  status      text NOT NULL DEFAULT 'open',          -- open | resolved | rejected
  raised_by   text NOT NULL,
  resolution  text,
  created_at  text NOT NULL,
  resolved_at text
);
CREATE INDEX IF NOT EXISTS data_disputes_nurse_idx ON data_disputes (nurse_id);
