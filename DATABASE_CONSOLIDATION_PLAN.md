# Database Consolidation Plan

Last reviewed: 2026-06-25

## Current State

Persistence is split by service:

- Core uses an in-memory/local state store for dev and Postgres when `DATABASE_URL` is set. Core schema includes users, orgs, partner orgs, tenant/program scopes, role grants, API clients, signing keys, sessions, audit log, nurses, application submission locks, nurse refs, nurse events, consents, restricted documents, document access grants, idempotency keys, webhooks, credit decisions, and data disputes.
- Academy API uses `MemoryStore` for dev and Postgres when configured. Its schema includes candidates, enrollments, cohorts, assessments, payments, sponsors, access passes, library resources, credentials, progress, remediations, question responses, verifications, outcomes, attendance, schools, pathway task events, idempotency keys, audit log, webhooks, leads, outreach, and mail pieces.
- ATS Connect supports node sqlite by default, embedded PGlite/Postgres for verification, and networked Postgres when configured. It owns employers, requisitions, candidates, consents, packets, applications, submission locks, ledger events, sync events, audit, restricted documents, document access grants, connections, demand jobs, tracking, interests, programs, reservations, hiring signals, claims, and market interest.
- Pathway uses node sqlite with JSON-backed tables for candidate profiles, identity documents, education, employment, licenses, visa history, travel, school programs, employer offers, financing, exams, documents, workflows, form drafts, QA reviews, attestations, submissions, appointments, deficiencies, audit, ledger milestones, consular payment orders, handoffs, receipts, and payment events.

## Desired State

The production data plane should use environment-isolated Postgres with service schemas or databases, while Core remains the canonical system of record for sensitive cross-product records.

Target ownership:

- Core owns identity, orgs, tenants, roles, scopes, sessions, API clients, Passport spine, consent, audit chain, Document Vault metadata, Application Gate results, Production Ledger, partner bindings, AI audit metadata, and high-stakes workflow gates.
- Academy owns learning content, learner progress, assessments, cohorts, attendance, and Academy-specific operations, but emits canonical Passport/readiness events and uses Core for identity, consent, audit policy, and cross-product sharing.
- ATS/VMS owns employer demand operations, connector state, requisition intake, matching workspace, and local projections, but uses Core for employer-safe packets, consent, Application Gate, and ledger truth.
- Pathway owns workflow task state and draft work products, but Core owns the canonical Passport, restricted document controls, consent, and submission gate truth.
- Workforce economics owns public or aggregated market data and derived pricing artifacts, not sensitive candidate records.

## Affected Files And Repos

- Core `db/schema.sql`, `src/store*`, migration scripts, and verification scripts.
- Academy API `db/schema.sql`, `src/store*`, and API routes.
- ATS Connect `server/store/*`, `server/db.ts`, and store contract.
- Pathway `server/db.ts` and route/data access patterns.
- Infra Cloud SQL Terraform and env-specific database URLs.
- CI migration jobs and seed jobs.

## Migration Steps

1. Build a data ownership map by table and field class.
2. Mark every sensitive field with owner, classification, tenant scope, consent purpose, audit action, retention rule, and allowed projections.
3. Split production Postgres into env-scoped logical databases or schemas:
   - `core`
   - `academy`
   - `ats`
   - `pathway`
   - `analytics_public` or `workforce_intelligence` for non-sensitive aggregates only.
4. Move Pathway off sqlite before production use with real candidate data.
5. Make ATS networked Postgres the production default and keep sqlite/PGlite only for local and tests.
6. Replace local sensitive records with Core references where Core is canonical.
7. Add idempotent migrations and rollback/restore runbooks for each service.
8. Add projection-sync jobs or event consumers where apps need local read models.
9. Add backup, restore, retention, and deletion verification per environment.
10. Keep real production data out of fixtures, docs, prompts, and local development.

## Risks

- Duplicate candidate records can diverge across Academy, ATS, Pathway, and Core.
- Moving sqlite JSON stores to Postgres can accidentally broaden query surfaces.
- Local projections can become de facto systems of record if not clearly labeled.
- Cross-service joins can bypass tenant, consent, and audit controls.
- Migrations can leak sensitive values through logs or failed error messages.

## Tests Needed

- Migration tests with synthetic data only.
- Tenant isolation tests for every cross-product read.
- Consent revocation tests that fail closed across local projections.
- Audit tests for sensitive reads, writes, shares, exports, packet views, document views, and downloads.
- Document Vault signed URL redemption and revocation tests.
- Backup and restore drills for staging.
- No sensitive data in logs, URLs, telemetry, prompts, or fixtures.

## Acceptance Criteria

- Every sensitive record has one canonical owner.
- Production uses Postgres for all stateful app data.
- Local sqlite and memory stores are limited to dev/test with synthetic data.
- Core-owned controls cannot be bypassed by app-local stores.
- Migrations are idempotent, reversible where possible, and verified without real data.
