-- Florence Pathway Postgres schema.
-- This mirrors the legacy SQLite table shape while preserving Postgres JSONB
-- storage. All restricted fields remain inside jsonb until field-level tables
-- are split under Core governance.

CREATE TABLE IF NOT EXISTS candidates (id text PRIMARY KEY, created_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS identity_documents (id text PRIMARY KEY, candidate_id text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS education (id text PRIMARY KEY, candidate_id text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS employment (id text PRIMARY KEY, candidate_id text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS licenses (id text PRIMARY KEY, candidate_id text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS visa_history (id text PRIMARY KEY, candidate_id text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS travel_history (id text PRIMARY KEY, candidate_id text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS school_programs (id text PRIMARY KEY, candidate_id text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS employer_offers (id text PRIMARY KEY, candidate_id text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS financing (id text PRIMARY KEY, candidate_id text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS english_exams (id text PRIMARY KEY, candidate_id text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS nclex_registrations (id text PRIMARY KEY, candidate_id text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS documents (id text PRIMARY KEY, candidate_id text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS workflows (id text PRIMARY KEY, candidate_id text, type text, status text, updated_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS form_drafts (id text PRIMARY KEY, candidate_id text, workflow_id text, form_type text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS qa_reviews (id text PRIMARY KEY, candidate_id text, workflow_id text, status text, created_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS attestations (id text PRIMARY KEY, candidate_id text, workflow_id text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS submissions (id text PRIMARY KEY, candidate_id text, workflow_id text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS appointments (id text PRIMARY KEY, candidate_id text, workflow_id text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS deficiencies (id text PRIMARY KEY, candidate_id text, workflow_id text, resolved integer, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS audit_log (id text PRIMARY KEY, candidate_id text, at text, actor text, entity text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS ledger_milestones (id text PRIMARY KEY, candidate_id text, workflow_id text, milestone text, pushed integer, at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS consular_cases (id text PRIMARY KEY, candidate_id text, status text, updated_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS ds160_workbench_statuses (id text PRIMARY KEY, candidate_id text, workflow_id text, status text, updated_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS visa_appointments (id text PRIMARY KEY, candidate_id text, workflow_id text, status text, updated_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS consular_payment_orders (id text PRIMARY KEY, candidate_id text, status text, updated_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS sevismate_handoffs (id text PRIMARY KEY, candidate_id text, payment_order_id text, status text, created_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS sevismate_handoff_statuses (id text PRIMARY KEY, candidate_id text, payment_order_id text, handoff_id text, status text, updated_at text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS i901_receipts (id text PRIMARY KEY, candidate_id text, payment_order_id text, qa_status text, json jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS consular_payment_events (id text PRIMARY KEY, candidate_id text, payment_order_id text, event_type text, occurred_at text, json jsonb NOT NULL);

CREATE INDEX IF NOT EXISTS idx_pathway_wf_candidate ON workflows(candidate_id);
CREATE INDEX IF NOT EXISTS idx_pathway_qa_status ON qa_reviews(status);
CREATE INDEX IF NOT EXISTS idx_pathway_consular_cases_candidate ON consular_cases(candidate_id);
CREATE INDEX IF NOT EXISTS idx_pathway_consular_cases_status ON consular_cases(status);
CREATE INDEX IF NOT EXISTS idx_pathway_ds160_candidate ON ds160_workbench_statuses(candidate_id);
CREATE INDEX IF NOT EXISTS idx_pathway_ds160_workflow ON ds160_workbench_statuses(workflow_id);
CREATE INDEX IF NOT EXISTS idx_pathway_ds160_status ON ds160_workbench_statuses(status);
CREATE INDEX IF NOT EXISTS idx_pathway_visa_appt_candidate ON visa_appointments(candidate_id);
CREATE INDEX IF NOT EXISTS idx_pathway_visa_appt_workflow ON visa_appointments(workflow_id);
CREATE INDEX IF NOT EXISTS idx_pathway_visa_appt_status ON visa_appointments(status);
CREATE INDEX IF NOT EXISTS idx_pathway_cpo_candidate ON consular_payment_orders(candidate_id);
CREATE INDEX IF NOT EXISTS idx_pathway_cpo_status ON consular_payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_pathway_sevismate_status_order ON sevismate_handoff_statuses(payment_order_id);
CREATE INDEX IF NOT EXISTS idx_pathway_sevismate_status_handoff ON sevismate_handoff_statuses(handoff_id);
CREATE INDEX IF NOT EXISTS idx_pathway_sevismate_status_status ON sevismate_handoff_statuses(status);
CREATE INDEX IF NOT EXISTS idx_pathway_i901_order ON i901_receipts(payment_order_id);
