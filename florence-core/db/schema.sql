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
  recipient_org_id     text,                      -- null = category-wide; else the specific org
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
