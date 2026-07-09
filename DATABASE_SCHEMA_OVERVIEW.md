# Florence Education Database Schema Overview

Last updated: 2026-06-25

## Purpose

This overview documents the current database ownership model and the target production standard: Postgres for production services, Core as canonical owner for sensitive cross-platform records, and service-owned schemas only for operational workflow state or rebuildable projections.

## Production Standard

- Production and staging service databases should be Cloud SQL Postgres.
- Local SQLite, PGlite, in-memory stores, and JSON fixtures are local-development or test-only tools.
- Secrets and connection strings must come from Secret Manager or a local uncommitted environment file.
- Database logs and migration output must not print secrets, PII, restricted document ids, packet contents, credit data, loan data, visa detail, or document text.

## Service Database Map

| Service | Current schema source | Target database | Ownership summary | Key gaps |
| --- | --- | --- | --- | --- |
| Core API | `apps/core-api/db/schema.sql` | `florence_core` Postgres | Identity, orgs, partner scopes, roles, sessions, signing keys, audit, nurses, nurse refs/events, consent, restricted documents, document grants, idempotency, webhooks, lender records. | Needs cloud evidence and external audit before production claims. |
| Academy API | `apps/academy-web/api/db/schema.sql` | `florence_academy` Postgres | Candidates, enrollments, cohorts, assessments, payments, sponsors, access passes, Apply CTA attribution, fee coverage, academy events, library, progress, remediation, grants, school affiliations, outreach, mail pieces, audit. | Core event writes must be required for cross-platform readiness/grant events outside local dev. |
| Pathway API | `apps/pathway-api/db/schema.sql` | `florence_pathway` Postgres | Candidates, identity/education/employment/license/visa/travel workflow JSONB records, documents, workflows, QA, attestations, submissions, appointments, deficiencies, audit, ledger milestones, consular cases/payments/receipts/events. | Sensitive canonical decisions should migrate under Core governance; SQLite must remain local-only. |
| Employer Connect API | `apps/employer-connect-api/server/store/postgres.ts` | `florence_employer` Postgres | Employers, facilities, requisitions, candidates, consent projections, packets, ATS applications, submission locks, ledger projections, sync/audit logs, restricted document grants, idempotency, connectors, demand, programs, reservations, hiring signals. | Core ledger canonical mode must be required outside local dev. |
| App Web | None | None | Reads Core and service APIs. | Must not become a persistence owner. |
| Workforce Economist | None | None currently | Stateless quote/proposal API with Core event writes. | If persistence is added later, use Postgres and keep nurse PII out. |
| Grants | No dedicated schema | TBD | Current grant-related tables live in Academy and grants surface lives in App Web. | Needs owner service and schema decision. |

## Core Schema Domains

| Domain | Representative tables |
| --- | --- |
| Identity and access | `users`, `orgs`, `partner_orgs`, `tenant_scopes`, `program_scopes`, `role_grants`, `api_clients`, `signing_keys`, `sessions` |
| Audit | `audit_log` |
| Passport and references | `nurses`, `nurse_refs`, `nurse_events` |
| Application Gate | `application_submission_locks` |
| Consent | `consents` |
| Document Vault | `restricted_documents`, `document_access_grants` |
| Idempotency and webhooks | `idempotency_keys`, `webhook_subscriptions`, `webhook_deliveries` |
| Lender and disputes | `credit_decisions`, `data_disputes` |

## Academy Schema Domains

| Domain | Representative tables |
| --- | --- |
| Candidate and enrollment | `candidates`, `enrollments`, `cohorts`, `candidate_credentials`, `candidate_progress`, `candidate_remediations` |
| Assessment and learning | `assessment_results`, `question_walkthroughs`, `question_responses`, `attendance_records` |
| Sponsorship and fee coverage | `academy_sponsors`, `academy_sponsorship_programs`, `academy_access_passes`, `academy_application_fee_coverages` |
| Apply and events | `academy_apply_ctas`, `academy_apply_attributions`, `academy_events`, `pathway_task_events` |
| Library | `academy_library_resources` |
| Grants and residencies | `academy_residencies`, `academy_camps`, `academy_camp_reservations`, `academy_gap_calculations`, `academy_access_grants`, `academy_grant_eligibilities`, `academy_grant_approval_queue`, `academy_disbursements`, `academy_receipts` |
| School and outreach | `schools`, `candidate_school_affiliations`, `leads`, `lead_events`, `outreach_campaigns`, `outreach_targets`, `mail_pieces`, `mail_piece_events` |
| Security and audit | `api_clients`, `audit_log`, `idempotency_keys`, `webhook_subscriptions`, `webhook_deliveries` |

## Pathway Schema Domains

| Domain | Representative tables |
| --- | --- |
| Candidate records | `candidates`, `identity_documents`, `education`, `employment`, `licenses`, `visa_history`, `travel_history`, `school_programs`, `employer_offers`, `financing`, `english_exams`, `nclex_registrations`, `documents` |
| Workflow | `workflows`, `form_drafts`, `qa_reviews`, `attestations`, `submissions`, `appointments`, `deficiencies` |
| Audit and milestones | `audit_log`, `ledger_milestones` |
| Consular | `consular_cases`, `ds160_workbench_statuses`, `visa_appointments`, `consular_payment_orders`, `sevismate_handoffs`, `sevismate_handoff_statuses`, `i901_receipts`, `consular_payment_events` |

## Employer Connect Schema Domains

| Domain | Representative tables |
| --- | --- |
| Employer demand | `employers`, `facilities`, `requisitions`, `demand_sources`, `raw_jobs`, `demand_jobs`, `job_sources`, `job_economics`, `job_benefits` |
| Candidate workflow | `candidates`, `consents`, `packets`, `ats_applications`, `submission_locks` |
| Ledger and sync | `ledger_events`, `sync_events`, `reconciliation_events`, `attribution_events` |
| Documents and idempotency | `restricted_documents`, `document_access_grants`, `idempotency_keys` |
| Connectors | `connections` |
| Tracking and interest | `tracking_links`, `tracking_clicks`, `job_interests`, `nurse_market_interest` |
| Programs and reservations | `programs`, `program_waves`, `program_slates`, `demand_reservations` |
| Long-tail hiring signals | `hiring_signals`, `claimed_employer_jobs`, `claim_tokens` |
| Audit | `audit_log` |

## Migration Commands

Root scripts:

- `npm run db:migrate`
- `npm run db:seed`
- `npm run migration:dry-run`
- `npm run database:check`
- `npm run database:compose`

Service migration entrypoints:

- Core: `apps/core-api/db/migrate.mjs`
- Academy API: `apps/academy-web/api/db/migrate.mjs`
- Pathway API: `apps/pathway-api/db/migrate.mjs`
- Employer Connect API: `apps/employer-connect-api/scripts/migrate.ts`

Current local blocker: root migration checks that invoke `npm` cannot run in this host until `npm` is available on PATH. Docker-backed migration dry-runs have been used successfully during the consolidation pass, and staging migration jobs are documented in `docs/runbooks/MIGRATIONS.md`.

## Acceptance Criteria For Database Readiness

- Staging and production service environment variables point to Postgres.
- No staging or production service uses SQLite, PGlite, in-memory, or JSON stores for persisted workflow data.
- Core is canonical for identity, consent, documents, Application Gate, audit, and Production Ledger.
- Migration dry-run passes against disposable Postgres.
- Migration job logs contain no secrets or restricted data.
