# Florence Education API Overview

Last updated: 2026-06-25

## Purpose

This overview documents the current API surface for the consolidated Florence Education platform. It is an audit of current behavior, not a guarantee that all APIs are final public contracts. Future interface changes must be reviewed against the security rules in `AGENTS.md`, the Core system-of-record map, and the staging deployment plan.

## API Standards

- Public and partner examples should use `florenceedu.com`.
- Authentication is Core-centered: browser sessions, RS256/JWKS verification, and machine-to-machine OAuth scopes.
- External partner APIs must be tenant-scoped before reading or writing data.
- Sensitive document access must use Core Document Vault controls and short-lived signed URLs.
- High-stakes workflows must call Core Application Gate or equivalent Core policy before submission or sharing.
- Response bodies, errors, logs, telemetry, and events must not contain PII, passport data, SEVIS data, DS-160 fields, visa details, credit data, loan data, packet contents, restricted document text, or secrets.

## Core API

Owner: `apps/core-api`

Primary purpose: identity, auth, partner scopes, Nurse Passport, consent, Document Vault, Application Gate, audit, model governance, lender controls, webhooks, and Production Ledger.

Key current endpoints:

| Area | Endpoints |
| --- | --- |
| Health and metadata | `/health`, `/v1/health`, `/v1/openapi.json`, `/v1/docs` |
| Auth | `/login`, `/auth/google/start`, `/auth/google/callback`, `/auth/password`, `/auth/refresh`, `/logout`, `/me`, `/.well-known/jwks.json`, `/.well-known/openid-configuration`, `/oauth/token` |
| Nurse Passport | `/v1/nurse/resolve`, `/v1/nurse/event`, `/v1/nurse/passport`, `/v1/nurse/events`, `/v1/nurses/:id/passport` |
| Consent | `/v1/consent/grant`, `/v1/consent/revoke`, `/v1/consent` |
| Application Gate | `/v1/applications/gate-check` (alias `/v1/application-gate/check`), `/v1/applications/submit`, `/v1/opportunities/:id/interest` |
| Document Vault | `/v1/document-vault/documents`, `/v1/document-vault/documents/:id/signed-url`, `/v1/document-vault/signed/:token` |
| Events and ledger | `/v1/events`, `/v1/ledger` |
| Lender | `/v1/nurses/:id/credit-data`, `/v1/credit-decisions`, adverse action, disputes, lender events, portfolio, loan tape |
| Model Gateway | `/v1/model-gateway/tasks`, `/v1/model-gateway/costs` |
| Partner and program | `/v1/partner-keys`, `/v1/programs/:id`, `/v1/programs/:id/packets/:nurseId`, `/v1/webhooks` |
| Admin and reporting | `/admin`, `/admin/users`, `/admin/grant`, `/admin/org`, `/v1/control-tower`, `/v1/investor/report`, `/v1/university/cohorts` |

Security expectations:

- Core APIs must enforce role, scope, tenant, recipient, purpose, and consent checks server-side.
- `/v1/events` and `/v1/ledger` writes require service credentials and idempotency.
- Document signed URLs are access mechanisms, not durable share links.
- Application submission must fail closed when required gates do not pass.

## App Web API Usage

Owner: `apps/app-web`

Primary purpose: user-facing shell for the consolidated app.

Routes surfaced in the shell include:

- `/academy`
- `/pathway`
- `/profile`
- `/documents`
- `/grants`
- `/jobs`
- `/employer-connect`
- `/partners`
- `/ops`
- `/admin`

The app shell reads from Core and module APIs through frontend clients. It should not become a direct persistence owner. User actions that affect sensitive state should call the responsible module or Core endpoint so audit and event writes happen server-side.

Current gap: some shell surfaces still use fallback or synthetic data. Replace those with audited server calls before staging sign-off.

## Academy API

Owner: `apps/academy-web/api`

Primary purpose: candidate learning, enrollment, assessments, sponsored access, library resources, live learning metadata, payment/reference handling, partner/university/instructor views, and Apply attribution.

Key current areas:

- Candidate and session flows.
- Enrollments, cohorts, and assessments.
- Payments and sponsorship access.
- Resource library and signed access.
- Partner, university, instructor, and sponsor views.
- Apply CTA and attribution.
- Core event emission through Core `/v1/events` when configured.

Security expectations:

- Store and display only minimized learning and enrollment data.
- Encrypt sensitive columns and avoid raw payment or contact values in logs.
- Apply CTA must point to `https://www.florenceedu.com/apply`.
- Partner and university views must be aggregate, anonymized, or explicitly authorized.

Current gap: Core event emission can be absent when credentials are missing. Staging should require Core event configuration for writes that affect readiness or cross-platform state.

## Pathway API

Owner: `apps/pathway-api`

Primary purpose: pathway workflow automation for visa, NCLEX, licensure, consular, QA, forms, document status, candidate communications, and administrative review.

Key current areas:

- `/api/session`, `/api/health`, `/api/meta`.
- Candidate CRUD, document actions, consent, chat, notifications, state selection, and SSN status.
- Workflow creation, run, answers, attestations, review/sign, confirmations, appointment status, licensure submission, deficiency handling.
- QA queue and review decisions.
- Admin metrics, ledger, and audit.

Security expectations:

- AI and automation remain assistive and human-reviewed for high-stakes outcomes.
- Candidate-bound tokens must be bound to the requested candidate.
- SSN handling must remain status-only unless an approved Core-owned workflow is added.
- Sensitive form, visa, licensure, and document state must not appear in logs or URLs.

Current gap: some sensitive operational records remain in service-local JSONB. Move canonical sensitive decisions and references under Core-governed contracts over time.

## Employer Connect API

Owner: `apps/employer-connect-api`

Primary purpose: employer demand, candidate matching, consented packet generation, Application Gate checks, ATS/VMS submissions, status sync, public job interest, and Production Ledger events.

Key current areas:

- `/api/session`, `/api/health`, `/api/meta`.
- Employer, facility, requisition, connector, candidate, match, packet, QA, submit, status, demand, queue, reservation, program, report, and audit operations.
- Public job and interest flows.
- ATS/VMS and HRIS webhooks.
- `/api/ledger/events` and `/api/ledger`.

Security expectations:

- Employers may see employer-safe packets only.
- Packet share requires consent, QA, tenant scope, and Application Gate checks.
- Billing-critical starts and retention must not rely on unverified recruiter-stage data alone.
- Webhooks must be authenticated, validated, replay-resistant where possible, and tenant-scoped.

Current gap: Core ledger canonical mode is configurable. Staging and production should require Core canonical ledger writes and fail closed when Core is unavailable.

## Workforce Economist API

Owner: `apps/economist-app`

Primary purpose: facility/system economics, quote generation, proposal generation, and Core quote/proposal event writes.

Key current endpoints:

- `GET /health`
- `POST /v1/economist/quote`
- `GET /v1/economist/facility/:id`
- `GET /v1/economist/system/:id`
- `POST /v1/economist/proposal`
- `POST /price-job` legacy compatibility route

Security expectations:

- Use aggregate facility and system data only.
- Do not include nurse PII or restricted documents.
- Require Core event writes outside local development.

Current gap: staging config currently permits optional Core event writes; tighten this before staging sign-off.

## Grants API Status

Owner: not yet formalized.

Current state: Grants exists as an app-shell surface and related Academy sponsor/application-fee coverage persistence. No dedicated Grants backend API or Core event writer was identified during this audit.

Required future work:

- Choose owner service: dedicated Grants module or Academy-owned fee-coverage workflow.
- Define Core event types for grant review, award/coverage, revocation, and application-fee coverage.
- Add consent, audit, tenant, and recipient-safe projection tests.
