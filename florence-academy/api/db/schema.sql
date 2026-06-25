-- Florence Academy Data API - Postgres schema (system of record)
--
-- Conventions:
--   • Sensitive columns (phone, payment refs, financial signals) are marked
--     ENCRYPTED - store ciphertext from app-side column encryption (KMS data
--     key), NOT plaintext. Postgres sees only bytea/text ciphertext.
--   • assessment_results and audit_log are APPEND-ONLY: the app role is granted
--     INSERT/SELECT only (see GRANTs at the end). Corrections are new rows.
--   • External IDs are opaque + prefixed (cand_, enr_, asr_, pay_) - safe to put
--     in URLs, webhooks, and logs.
--
-- Run: psql "$DATABASE_URL" -f db/schema.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- ── OAuth2 clients (machine-to-machine partners) ───────────────────────────
CREATE TABLE IF NOT EXISTS api_clients (
  client_id        text PRIMARY KEY,
  name             text NOT NULL,
  secret_hash      text NOT NULL,            -- scrypt(salt + secret); never plaintext
  allowed_scopes   text[] NOT NULL DEFAULT '{}',
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Candidates ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidates (
  id             text PRIMARY KEY,           -- cand_…
  external_ref   text,                       -- CRM foreign key
  full_name      text NOT NULL,
  email_enc      text,                        -- ENCRYPTED (PII): base64 envelope (AES-256-GCM)
  phone_enc      text,                        -- ENCRYPTED (PII): base64 envelope (AES-256-GCM)
  country        text,
  consent        jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {service,crm_sync,underwriting,updated_at}
  email_verified boolean NOT NULL DEFAULT false,      -- confirmed via verification link
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz                  -- soft delete (DSAR erasure)
);
-- Idempotent add for databases created before email_verified existed.
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_candidates_external_ref ON candidates (external_ref);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates (created_at);

-- ── Enrollments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
  id            text PRIMARY KEY,            -- enr_…
  candidate_id  text NOT NULL REFERENCES candidates (id),
  cohort        text NOT NULL,
  status        text NOT NULL DEFAULT 'registered'
                CHECK (status IN ('registered','deposit_paid','attending','completed','withdrawn')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enrollments_candidate ON enrollments (candidate_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_cohort ON enrollments (cohort);

-- ── Cohorts (scheduled classes; `code` is also the live room code) ──────────
CREATE TABLE IF NOT EXISTS cohorts (
  id             text PRIMARY KEY,           -- cohort_…
  code           text NOT NULL UNIQUE,       -- e.g. MNL-2026-07; matches enrollments.cohort
  name           text NOT NULL,
  starts_at      timestamptz,
  capacity       integer,
  instructor_ref text,
  status         text NOT NULL DEFAULT 'scheduled'
                 CHECK (status IN ('scheduled','active','completed','cancelled')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
-- Per-cohort coverage watermark, bumped by the instructor from /instructor
-- after each live class. Read by AcademyHome via /v1/me/cohort. Adding via
-- ALTER + IF NOT EXISTS so existing deploys upgrade cleanly.
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS covered_through_section integer;

-- ── Assessment results (APPEND-ONLY, underwriting-grade) ────────────────────
CREATE TABLE IF NOT EXISTS assessment_results (
  id              text PRIMARY KEY,          -- asr_…
  candidate_id    text NOT NULL REFERENCES candidates (id),
  kind            text NOT NULL
                  CHECK (kind IN ('tutor','nightly','adaptive_exam','timed','diagnostic')),
  readiness       double precision,          -- projected pass probability 0..1
  theta           double precision,          -- Rasch ability (logits)
  items_completed integer,
  by_client_need  jsonb,                      -- {clientNeed: meanScore}
  supersedes      text REFERENCES assessment_results (id),  -- correction chain
  content_hash    text NOT NULL,             -- SHA-256 of canonical payload
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asr_candidate ON assessment_results (candidate_id, created_at);

-- ── Payments (token references only - NO raw instrument data) ───────────────
CREATE TABLE IF NOT EXISTS payments (
  id            text PRIMARY KEY,            -- pay_…
  candidate_id  text NOT NULL REFERENCES candidates (id),
  kind          text NOT NULL CHECK (kind IN ('commitment_deposit','global_live_access','tuition','other')),
  amount_cents  integer NOT NULL,
  currency      text NOT NULL,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','paid','refunded','credited','failed')),
  processor     text,
  processor_ref_enc text,                     -- ENCRYPTED token/charge id: base64 AES-256-GCM
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_candidate ON payments (candidate_id);
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_kind_check;
ALTER TABLE payments ADD CONSTRAINT payments_kind_check
  CHECK (kind IN ('commitment_deposit','global_live_access','tuition','other'));

-- Sponsored Florence Academy Global Live NCLEX Access catalog and events.
CREATE TABLE IF NOT EXISTS academy_sponsors (
  id            text PRIMARY KEY,
  slug          text NOT NULL UNIQUE,
  name          text NOT NULL,
  status        text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','paused','ended')),
  brand_color   text,
  logo_url      text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academy_sponsorship_programs (
  id                  text PRIMARY KEY,
  sponsor_id          text NOT NULL REFERENCES academy_sponsors (id),
  name                text NOT NULL,
  program_type        text NOT NULL
                      CHECK (program_type IN ('global_live_access','live_session',
                                              'manila_residency','la_residency',
                                              'application_flow')),
  list_value_usd      integer NOT NULL,
  sponsor_subsidy_usd integer NOT NULL,
  student_price_usd   integer NOT NULL,
  budget_mode         text NOT NULL CHECK (budget_mode IN ('unlimited','capped')),
  budget_usd          integer,
  used_budget_usd     integer,
  status              text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','paused','ended')),
  default_apply_url   text NOT NULL,
  eligible_countries  text[],
  eligible_programs   text[],
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sponsorship_programs_sponsor ON academy_sponsorship_programs (sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsorship_programs_type_status ON academy_sponsorship_programs (program_type, status);

CREATE TABLE IF NOT EXISTS academy_access_passes (
  id                       text PRIMARY KEY,
  candidate_id             text NOT NULL REFERENCES candidates (id),
  sponsor_id               text NOT NULL REFERENCES academy_sponsors (id),
  sponsorship_program_id   text NOT NULL REFERENCES academy_sponsorship_programs (id),
  payment_id               text REFERENCES payments (id),
  status                   text NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','active','expired','cancelled')),
  starts_at                timestamptz,
  expires_at               timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_access_passes_candidate ON academy_access_passes (candidate_id, created_at);
CREATE INDEX IF NOT EXISTS idx_access_passes_payment ON academy_access_passes (payment_id);
CREATE INDEX IF NOT EXISTS idx_access_passes_sponsor ON academy_access_passes (sponsor_id);

CREATE TABLE IF NOT EXISTS academy_apply_ctas (
  id              text PRIMARY KEY,
  placement       text NOT NULL,
  label           text NOT NULL,
  subtext         text NOT NULL,
  destination_url text NOT NULL,
  sponsor_id      text REFERENCES academy_sponsors (id),
  campaign_id     text,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academy_apply_attributions (
  id              text PRIMARY KEY,
  candidate_id    text REFERENCES candidates (id),
  sponsor_id      text REFERENCES academy_sponsors (id),
  campaign_id     text NOT NULL,
  placement       text NOT NULL,
  event_type      text NOT NULL CHECK (event_type IN ('viewed','clicked')),
  safe_session_id text NOT NULL,
  destination_url text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_apply_attr_sponsor ON academy_apply_attributions (sponsor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_apply_attr_session ON academy_apply_attributions (safe_session_id);

CREATE TABLE IF NOT EXISTS academy_application_fee_coverages (
  id                   text PRIMARY KEY,
  candidate_id          text NOT NULL REFERENCES candidates (id),
  university_id         text NOT NULL,
  program_id            text,
  application_id        text,
  fee_amount_usd        integer NOT NULL,
  coverage_type         text NOT NULL
                        CHECK (coverage_type IN ('florence_paid','university_waived','sponsor_covered')),
  status                text NOT NULL DEFAULT 'eligible'
                        CHECK (status IN ('eligible','approved','paid','waived',
                                          'rejected','refunded','cancelled')),
  payment_reference_id  text,
  approved_by           text,
  approved_at           timestamptz,
  paid_at               timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fee_coverages_university ON academy_application_fee_coverages (university_id, created_at);

CREATE TABLE IF NOT EXISTS academy_events (
  id            text PRIMARY KEY,
  event_type    text NOT NULL,
  candidate_id  text REFERENCES candidates (id),
  sponsor_id    text REFERENCES academy_sponsors (id),
  campaign_id   text,
  payload       jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_academy_events_type ON academy_events (event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_academy_events_candidate ON academy_events (candidate_id, created_at);

INSERT INTO academy_sponsors (id, slug, name, status, created_at, updated_at)
VALUES
  ('avila-university', 'avila', 'Avila University', 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  ('webster-university', 'webster', 'Webster University', 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO academy_sponsorship_programs
  (id, sponsor_id, name, program_type, list_value_usd, sponsor_subsidy_usd,
   student_price_usd, budget_mode, status, default_apply_url, created_at, updated_at)
VALUES
  ('avila-global-live-access', 'avila-university', 'Avila University Sponsored Global Live Access',
   'global_live_access', 200, 100, 100, 'unlimited', 'active',
   'https://www.florenceedu.com/apply', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  ('webster-global-live-access', 'webster-university', 'Webster University Sponsored Global Live Access',
   'global_live_access', 200, 100, 100, 'unlimited', 'active',
   'https://www.florenceedu.com/apply', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO academy_apply_ctas
  (id, placement, label, subtext, destination_url, campaign_id, active, created_at, updated_at)
VALUES
  ('academy-global-live-apply', 'academy_home', 'Apply to U.S. Partner Programs',
   'Application fees are covered by Florence for eligible applicants.',
   'https://www.florenceedu.com/apply', 'global-live-access', true,
   '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ── Candidate credentials (end-user login; distinct from api_clients) ────────
-- Authenticates a NURSE signing into the learner app. password_hash is
-- scrypt(salt+password) - never plaintext. A successful login mints a
-- short-lived, candidate-BOUND session token (see src/auth.ts).
CREATE TABLE IF NOT EXISTS candidate_credentials (
  candidate_id  text NOT NULL REFERENCES candidates (id),
  email         text NOT NULL UNIQUE,         -- lowercased natural key
  password_hash text NOT NULL,                -- scrypt "salt:hash"
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidate_id)
);

-- ── Learner progress (mutable upsert, one row per candidate × section) ───────
CREATE TABLE IF NOT EXISTS candidate_progress (
  candidate_id  text NOT NULL REFERENCES candidates (id),
  section_slug  text NOT NULL,
  status        text NOT NULL DEFAULT 'in_progress'
                CHECK (status IN ('not_started','in_progress','completed')),
  percent       integer NOT NULL DEFAULT 0 CHECK (percent BETWEEN 0 AND 100),
  last_segment  text,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidate_id, section_slug)
);
CREATE INDEX IF NOT EXISTS idx_progress_candidate ON candidate_progress (candidate_id);

-- Auto-dispatched targeted-remediation assignments (one per weak subscale).
CREATE TABLE IF NOT EXISTS candidate_remediations (
  candidate_id  text NOT NULL REFERENCES candidates (id),
  dim           text NOT NULL CHECK (dim IN ('client_need','cjmm')),
  key           text NOT NULL,
  theta         double precision NOT NULL DEFAULT 0,
  pass_prob     double precision NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'assigned'
                CHECK (status IN ('assigned','in_progress','cleared')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidate_id, dim, key)
);
CREATE INDEX IF NOT EXISTS idx_remediation_candidate ON candidate_remediations (candidate_id);

-- Clinical Judgment Walkthroughs (per question): the 6 NCJMM steps + per-choice
-- analysis (why + error type) + linked content + QA workflow state. Audio is only
-- generated for status='approved' (templated rows are written approved).
CREATE TABLE IF NOT EXISTS question_walkthroughs (
  question_id            text PRIMARY KEY,
  client_need            text NOT NULL,
  cjmm                   text,
  standard_rationale     text NOT NULL DEFAULT '',
  clinical_judgment      jsonb NOT NULL DEFAULT '{}',
  answer_choice_analysis jsonb NOT NULL DEFAULT '[]',
  teach_back             text NOT NULL DEFAULT '',
  what_to_review_next    text NOT NULL DEFAULT '',
  linked_content         jsonb NOT NULL DEFAULT '{}',
  status                 text NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','sme_reviewed','approved','rejected')),
  provenance             text NOT NULL CHECK (provenance IN ('templated','ai_drafted')),
  model                  text,
  sme_reviewed_by        text,
  sme_reviewed_at        timestamptz,
  approved_by            text,
  approved_at            timestamptz,
  review_note            text,
  content_hash           text NOT NULL,
  generated_at           timestamptz NOT NULL DEFAULT now(),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_walkthrough_status ON question_walkthroughs (status);
CREATE INDEX IF NOT EXISTS idx_walkthrough_client_need ON question_walkthroughs (client_need);

-- Per-response signal (append-only) - item analytics + measurement substrate.
CREATE TABLE IF NOT EXISTS question_responses (
  id                   text PRIMARY KEY,
  candidate_id         text NOT NULL,
  question_id          text NOT NULL,
  chosen_option_index  integer,
  correct              boolean NOT NULL,
  spent_ms             integer,
  pre_reveal_reasoning text,
  walkthrough_seen     boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qresponse_question ON question_responses (question_id);
CREATE INDEX IF NOT EXISTS idx_qresponse_candidate ON question_responses (candidate_id);

-- ── Email verification tokens (single-use, expiring) ─────────────────────────
CREATE TABLE IF NOT EXISTS candidate_verifications (
  token         text PRIMARY KEY,
  candidate_id  text NOT NULL REFERENCES candidates (id),
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verifications_candidate ON candidate_verifications (candidate_id);

-- ── Production outcomes (APPEND-ONLY: NCLEX → licensure → start → repayment) ──
-- The conversion tail beyond education. Immutable like assessment_results;
-- corrections are new rows. occurred_at = when it happened; created_at = recorded.
CREATE TABLE IF NOT EXISTS outcome_events (
  id            text PRIMARY KEY,            -- oc_…
  candidate_id  text NOT NULL REFERENCES candidates (id),
  kind          text NOT NULL
                CHECK (kind IN ('nclex_result','att_issued','visa_step','licensure',
                                'employer_offer','start','retention_90d','repayment')),
  status        text,
  amount_cents  integer,
  detail        jsonb,
  occurred_at   timestamptz NOT NULL,
  content_hash  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outcomes_candidate ON outcome_events (candidate_id, created_at);
CREATE INDEX IF NOT EXISTS idx_outcomes_kind ON outcome_events (kind);

-- ── Live cohort / Live Lab attendance (APPEND-ONLY) ───────────────────────────
-- One row per candidate × session_date × cohort. location is set for Live Labs
-- (e.g. "Manila Hotel"); null/empty for fully-online sessions.
CREATE TABLE IF NOT EXISTS attendance_records (
  id            text PRIMARY KEY,            -- att_…
  candidate_id  text NOT NULL REFERENCES candidates (id),
  cohort        text,
  location      text,
  session_date  date NOT NULL,
  status        text NOT NULL CHECK (status IN ('present','absent','late')),
  content_hash  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attendance_candidate ON attendance_records (candidate_id, session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_location ON attendance_records (location);

-- ── University Affiliate Network ──────────────────────────────────────────────
-- Two tiers (load-bearing): an "eligible" school is just listed (no logo, no
-- "partner" claim); an "affiliate" has a signed agreement; "lab_partner" runs a
-- co-branded Live Lab. logo_use_granted gates name/logo rendering on partner
-- views - server-side enforced.
CREATE TABLE IF NOT EXISTS schools (
  id                text PRIMARY KEY,            -- sch_…
  slug              text NOT NULL UNIQUE,        -- FLORENCE-PH-UPMANILA
  name              text NOT NULL,
  country           text NOT NULL,
  city              text,
  programs          text[],
  tier              text NOT NULL DEFAULT 'eligible'
                    CHECK (tier IN ('eligible','affiliate','lab_partner')),
  logo_use_granted  boolean NOT NULL DEFAULT false,
  email_domains     text[],
  outreach_status   text NOT NULL DEFAULT 'eligible_listed'
                    CHECK (outreach_status IN ('eligible_listed','contacted','report_sent',
                                               'discussing','agreement_in_review',
                                               'signed_affiliate','lab_launching')),
  contact_email     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_schools_tier ON schools (tier);

-- Candidate ↔ school affiliations (a candidate may attest to >1 school; rare).
CREATE TABLE IF NOT EXISTS candidate_school_affiliations (
  candidate_id  text NOT NULL REFERENCES candidates (id),
  school_slug   text NOT NULL REFERENCES schools (slug),
  role          text NOT NULL CHECK (role IN ('student','alumni')),
  verification  text NOT NULL DEFAULT 'self_attested'
                CHECK (verification IN ('self_attested','email_domain','manual_qa')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidate_id, school_slug, role)
);
CREATE INDEX IF NOT EXISTS idx_csa_school ON candidate_school_affiliations (school_slug);

-- ── Pathway tasks (APPEND-ONLY status events from the Florence Pathway Agent) ──
-- Latest-per-(candidate,kind) wins for display. The Academy never generates
-- these; the Pathway Agent posts via POST /v1/candidates/:id/pathway-tasks.
CREATE TABLE IF NOT EXISTS pathway_task_events (
  id            text PRIMARY KEY,            -- pt_…
  candidate_id  text NOT NULL REFERENCES candidates (id),
  kind          text NOT NULL
                CHECK (kind IN ('university_app','financing_packet','i20_readiness',
                                'ds160_guidance','visa_appointment','nclex_registration',
                                'att_tracking','state_licensure','endorsement',
                                'employer_packet','human_qa')),
  status        text NOT NULL
                CHECK (status IN ('pending','in_progress','awaiting_candidate',
                                  'human_qa','completed','blocked')),
  note          text,
  content_hash  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pte_candidate ON pathway_task_events (candidate_id, created_at);

-- ── Idempotency keys ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key           text PRIMARY KEY,
  client_id     text NOT NULL,
  request_hash  text NOT NULL,               -- guards key reuse with a different body
  status_code   integer NOT NULL,
  response_body jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Audit log (APPEND-ONLY) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id            bigserial PRIMARY KEY,
  ts            timestamptz NOT NULL DEFAULT now(),
  request_id    text NOT NULL,
  actor         text,                         -- client_id
  action        text NOT NULL,                -- "POST /v1/assessment-results"
  resource_type text,
  resource_id   text,
  scope_used    text,
  ip            inet,
  outcome       integer,                      -- HTTP status
  -- Tamper-evidence: each row hash-chains the previous (see src/audit.ts).
  seq           bigint,
  prev_hash     text,
  hash          text
  -- NOTE: never store PII/financial VALUES here - IDs + field names only.
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log (ts);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log (resource_type, resource_id);

-- ── Webhook subscriptions + delivery log ────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id            text PRIMARY KEY,
  client_id     text NOT NULL,
  url           text NOT NULL,
  secret_enc    text NOT NULL,                -- ENCRYPTED HMAC signing secret: base64 AES-256-GCM
  events        text[] NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id            bigserial PRIMARY KEY,
  subscription  text NOT NULL REFERENCES webhook_subscriptions (id),
  event         text NOT NULL,
  payload       jsonb NOT NULL,
  attempts      integer NOT NULL DEFAULT 0,
  delivered     boolean NOT NULL DEFAULT false,
  last_error    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Leads (Florence core nurse pipeline mirror) ─────────────────────────────
-- A lead is a nurse known to Florence core but not yet enrolled in the Academy
-- (or enrolled, in which case they're cross-linked to a candidate). Mutable
-- projection - every change drops a row in lead_events for audit + drip-trigger.
CREATE TABLE IF NOT EXISTS leads (
  id                  text PRIMARY KEY,           -- ld_…
  email               text NOT NULL UNIQUE,       -- canonical, lowercased
  external_id         text,                       -- Florence core id (when surfaced)
  firstname           text,
  lastname            text,
  fullname            text,
  country             text,
  phone               text,
  job_unit            text,
  type                text,                       -- 'Imported Lead' | 'User' | 'Student Lead'
  nclex_status        text,                       -- 'Passed' | 'Not Passed' | 'Authorized' | 'Planned' | 'Not_planned'
  application_status  text,                       -- 'not_applied' | 'applied_not_accepted' | 'accepted' | 'draft'
  evaluation_status   text,                       -- 'N/A' | 'has_copy' | 'never_received' | 'no_access'
  assigned            text,                       -- ops advisor name
  video_screen        boolean,
  signup_at           timestamptz,                -- when they joined Florence core
  school_slug         text,                       -- FK-ish into schools(slug), set when core surfaces school
  source              text NOT NULL,              -- 'csv:2026-06-06' | 'api:v1' | 'manual'
  first_seen_at       timestamptz NOT NULL DEFAULT now(),
  last_seen_at        timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leads_country_idx ON leads (country);
CREATE INDEX IF NOT EXISTS leads_type_idx    ON leads (type);
CREATE INDEX IF NOT EXISTS leads_nclex_idx   ON leads (nclex_status);
CREATE INDEX IF NOT EXISTS leads_updated_idx ON leads (updated_at DESC);

-- ── Drip campaign (Phase 3) - lifecycle + consent + send-state on each lead ──
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lifecycle_stage   text NOT NULL DEFAULT 'new';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_marketing boolean;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS drip_step         integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS drip_enrolled_at  timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS unsubscribed_at   timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS unsubscribe_token text;
CREATE UNIQUE INDEX IF NOT EXISTS leads_unsub_token_idx ON leads (unsubscribe_token)
  WHERE unsubscribe_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_lifecycle_idx ON leads (lifecycle_stage);
-- Hot path for the drip tick scan (oldest-contacted active leads first).
CREATE INDEX IF NOT EXISTS leads_drip_due_idx ON leads (last_contacted_at)
  WHERE lifecycle_stage IN ('invited','engaged') AND unsubscribed_at IS NULL;

-- Append-only event log: one row per meaningful change to a lead.
CREATE TABLE IF NOT EXISTS lead_events (
  id           text PRIMARY KEY,                  -- le_…
  lead_id      text NOT NULL REFERENCES leads (id),
  kind         text NOT NULL
               CHECK (kind IN ('imported','status_change','merged','manual_edit',
                               'drip_send','drip_advance','drip_consent','drip_unsubscribe')),
  before_json  jsonb,
  after_json   jsonb,
  source       text NOT NULL,
  actor        text NOT NULL,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  prev_hash    text NOT NULL,
  content_hash text NOT NULL
);
CREATE INDEX IF NOT EXISTS lead_events_lead_idx     ON lead_events (lead_id, occurred_at);
CREATE INDEX IF NOT EXISTS lead_events_occurred_idx ON lead_events (occurred_at DESC);
-- Migrate the kind CHECK for databases created before the drip kinds existed
-- (idempotent: drop-if-exists then re-add the full set).
ALTER TABLE lead_events DROP CONSTRAINT IF EXISTS lead_events_kind_check;
ALTER TABLE lead_events ADD  CONSTRAINT lead_events_kind_check
  CHECK (kind IN ('imported','status_change','merged','manual_edit',
                  'drip_send','drip_advance','drip_consent','drip_unsubscribe'));

-- ── Outreach campaigns (Lob print + mail) ────────────────────────────────────
-- NOTE: api/src/store.postgres.ts currently delegates outreach to an in-process
-- MemoryStore. When prod migrates off MemoryStore, port this DDL into real
-- queries - the shape below is what the adapter will expect.
CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  kind         text NOT NULL
               CHECK (kind IN ('university','nursing_association','employer','hospital')),
  mail_format  text NOT NULL
               CHECK (mail_format IN ('postcard_6x11','letter_us')),
  status       text NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','queued','sending','sent','completed','cancelled')),
  theme        text NOT NULL DEFAULT 'teal'
               CHECK (theme IN ('teal','purple')),
  notes        text,
  totals_json  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outreach_targets (
  id              text PRIMARY KEY,
  campaign_id     text NOT NULL REFERENCES outreach_campaigns (id),
  school_slug     text,
  org_name        text NOT NULL,
  recipient_name  text,
  recipient_title text,
  address_line1   text NOT NULL,
  address_line2   text,
  city            text NOT NULL,
  state           text,
  postal_code     text NOT NULL,
  country         text NOT NULL,
  activation_code text NOT NULL,
  status          text NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','rendered','sent','in_transit','delivered','returned','activated','declined')),
  contact_notes   text,
  sent_at         timestamptz,
  delivered_at    timestamptz,
  activated_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, activation_code)
);
CREATE INDEX IF NOT EXISTS outreach_targets_campaign_idx ON outreach_targets (campaign_id);
CREATE INDEX IF NOT EXISTS outreach_targets_code_idx     ON outreach_targets (activation_code);

CREATE TABLE IF NOT EXISTS mail_pieces (
  id           text PRIMARY KEY,
  target_id    text NOT NULL REFERENCES outreach_targets (id),
  campaign_id  text NOT NULL REFERENCES outreach_campaigns (id),
  lob_id       text UNIQUE,
  format       text NOT NULL
               CHECK (format IN ('postcard_6x11','letter_us')),
  mode         text NOT NULL
               CHECK (mode IN ('test','live')),
  status       text NOT NULL DEFAULT 'rendered',
  cost_cents   integer,
  preview_url  text,
  sent_at      timestamptz,
  delivered_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mail_piece_events (
  id            text PRIMARY KEY,
  mail_piece_id text NOT NULL REFERENCES mail_pieces (id),
  lob_event_id  text UNIQUE,
  event_type    text NOT NULL,
  payload_json  jsonb NOT NULL,
  occurred_at   timestamptz NOT NULL,
  prev_hash     text NOT NULL,
  content_hash  text NOT NULL
);
CREATE INDEX IF NOT EXISTS mail_piece_events_piece_idx ON mail_piece_events (mail_piece_id, occurred_at);

COMMIT;

-- ── Least-privilege grants ──────────────────────────────────────────────────
-- The application connects as `florence_api` (NOT the table owner). Append-only
-- tables get INSERT + SELECT but no UPDATE/DELETE, enforcing immutability at the
-- database, not just the app layer.
--
--   CREATE ROLE florence_api LOGIN PASSWORD '…';
--   GRANT SELECT, INSERT, UPDATE        ON candidates, enrollments, payments TO florence_api;
--   GRANT SELECT, INSERT                ON assessment_results, audit_log     TO florence_api;
--   GRANT SELECT, INSERT                ON outcome_events                    TO florence_api;
--   GRANT SELECT, INSERT                ON attendance_records                TO florence_api;
--   GRANT SELECT, INSERT, UPDATE        ON schools                           TO florence_api;
--   GRANT SELECT, INSERT, UPDATE        ON candidate_school_affiliations     TO florence_api;
--   GRANT SELECT, INSERT                ON pathway_task_events               TO florence_api;
--   GRANT SELECT, INSERT                ON candidate_credentials             TO florence_api;
--   GRANT SELECT, INSERT, UPDATE        ON candidate_progress                TO florence_api;
--   GRANT SELECT, INSERT, DELETE        ON candidate_verifications           TO florence_api;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON idempotency_keys                 TO florence_api;
--   GRANT SELECT, INSERT, UPDATE        ON webhook_subscriptions, webhook_deliveries TO florence_api;
--   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO florence_api;
--
-- Row-Level Security can further scope multi-tenant partners; enable per table
-- and add policies keyed on the authenticated client_id if/when needed.
