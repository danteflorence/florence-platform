# Florence Education Architecture Overview

Last updated: 2026-06-25

## Purpose

Florence Education is being consolidated into one Florence OS platform under `florenceedu.com`. The target architecture is a shared application shell, a Core system of record, service-owned operational modules, Postgres-backed production services, and audited event writes into Core.

## Desired Platform Shape

```text
app.florenceedu.com
  App Web shell
    Academy views
    Pathway views
    Employer Connect views
    Grants views
    Profile and Documents
    Ops and Admin

Core API
  Identity and auth
  Nurse Passport
  Consent
  Document Vault
  Application Gate
  Audit
  Production Ledger and platform events

Service modules
  Academy API
  Pathway API
  Employer Connect API
  Workforce Economist API
```

## Shared Principles

- Public hosts, OpenAPI examples, cookies, OAuth redirects, CORS, and app copy should use `florenceedu.com`.
- Core owns sensitive canonical records and policy decisions. Downstream services may keep local operational projections only when they are rebuildable or clearly non-canonical.
- Every sensitive read, write, share, export, packet view, document view, document download, and AI-assisted sensitive workflow must be audit logged.
- Every external share must be tenant-scoped, purpose-limited, consent-gated, minimized, and recipient-safe.
- AI may draft, summarize, extract, classify, tutor, or recommend review, but must not make final visa, financing, credit, employment, licensure, eligibility, pathway approval, or application-submission decisions.
- Application submission and packet transmission must fail closed unless authorization, license, consent, packet QA, tenant, and workflow gates pass.

## Module Summary

| Module | Purpose | Owner service | Database/schema | Key APIs | Key events emitted to Core | Security/data-sharing rules | Tests | Known gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Core API | Platform policy center and canonical record spine. | `apps/core-api` | `apps/core-api/db/schema.sql`; Cloud SQL Postgres target. | Auth, OAuth/JWKS, `/me`, `/v1/nurse/*`, `/v1/events`, `/v1/ledger`, `/v1/document-vault/*`, `/v1/applications/*`, lender, model gateway, partner keys, webhooks. | Receives and stores platform events; emits audit and ledger state internally. | Tenant scopes, role grants, consent, redaction, signed URLs, Application Gate, tamper-evident audit, M2M scopes. | `verify-security`, document vault, application gate, audit, lender, gateway, tenant-binding, tenant-isolation. | External audit, cloud evidence, and production secrets remain pending. |
| App Web | Unified user-facing shell. | `apps/app-web` | No direct database. Reads Core and module APIs. | Frontend routes for `/academy`, `/pathway`, `/profile`, `/documents`, `/grants`, `/jobs`, `/employer-connect`, `/partners`, `/ops`, `/admin`. | None directly; user actions should call module APIs that emit Core events. | Shared shell must avoid sensitive data in URLs and display role-safe views only. | Vite/TypeScript build when npm is available; shared component usage visible in source. | Some data is still mocked/fallback; standalone module UIs need migration into shell. |
| Academy | Learning, NCLEX readiness, enrollment, sponsored access, live learning, and Apply CTA. | `apps/academy-web` and `apps/academy-web/api` | `apps/academy-web/api/db/schema.sql`; Cloud SQL Postgres target. | Candidate/enrollment/assessment/payment, resource library, sponsored access, partner/university/instructor surfaces, Apply attribution. | Academy events through Core `/v1/events` when `CORE_EVENTS_URL` and token are configured. | Encrypted PII columns, signed resource access, partner-safe views, Apply CTA safety, no production data in fixtures. | API smoke/integration/hubspot/TLS/walkthrough scripts; web Vitest/build scripts. | Core events can no-op when credentials are missing; standalone UI still needs full shell/design migration. |
| Pathway | Visa, NCLEX, licensure, consular, QA, and candidate pathway workflow automation. | `apps/pathway-api` | `apps/pathway-api/db/schema.sql`; Cloud SQL Postgres target. | Candidate/session/meta, candidate actions, documents, workflows, QA, admin ledger/audit, consular payment flows. | `pathway.*`, `consular.*`, and consent/readiness events through Core Passport client when configured. | Candidate binding, staff role gates, SSN status only, audit redaction, no-PII error handling, human QA gates. | Pathway v1 smoke, consular payments smoke, audit-redaction smoke, no-PII error smoke. | Some sensitive records remain service-local JSONB; Core event client can no-op when credentials are absent. |
| Employer Connect | Employer demand, matching, packets, submissions, ATS/VMS sync, Application Gate, and ledger. | `apps/employer-connect-api` | Postgres DDL in `server/store/postgres.ts`; Cloud SQL Postgres target. | Ops employer/requisition/candidate/match/packet/gate/submit/status/demand/program APIs, public jobs/interest, webhooks, ledger. | ATS, packet, offer, start, retention, billing, and readiness events through Core Passport/ledger paths. | Employer-safe packets, consent gates, signed documents, Application Gate, webhook HMAC, submission locks, tenant scoping. | Production smoke, Application Gate, document vault, demand, opportunity, longtail, reservations, audit-redaction, webhook-signature, no-PII, VMS smokes. | `LEDGER_CANONICAL=core` must be enforced outside local dev; local fallback remains available. |
| Grants | Grant-review and application-fee coverage surface. | Currently `apps/app-web`; related Academy sponsor tables. | No dedicated Grants schema; Academy has sponsorship and fee coverage tables. | App shell `/grants` route; related Academy sponsorship APIs. | Not yet evidenced as a dedicated Grants event writer. | Must keep funding/fee coverage views purpose-limited and avoid credit or underwriting leakage. | No dedicated Grants backend test found. | Needs service boundary, Core event writer, consent/audit tests, and persistence decision. |
| Workforce Economist | Facility demand, quote, proposal, and economics decision support. | `apps/economist-app` | No own database in current app. | `/health`, `/v1/economist/quote`, `/v1/economist/facility/:id`, `/v1/economist/system/:id`, `/v1/economist/proposal`, legacy `/price-job`. | `economist.quote.created`, `economist.proposal.created` to Core `/v1/events`. | Should use aggregate/facility economics only; no nurse PII required. Core event writes required in production. | Smoke script. | Staging currently allows optional Core events; require Core credentials in staging before release. |
| Infrastructure | Staging, sandbox, and future production GCP deployment. | `infra/`, `.github/workflows`, `docs/runbooks` | Cloud SQL Postgres per service. | Cloud Run services, migration jobs, Terraform, GitHub deployment workflow. | Pub/Sub and Core event APIs are target event paths. | Secrets in Secret Manager, synthetic data only for smoke tests, no production deploy in this phase. | Terraform fmt/validate path, Docker image builds, migration dry-run, smoke checks. | Plan/apply requires authorized GCP credentials and reviewed environment secrets. |

## App Boundaries

Core is not a generic shared database. Service modules retain their own operational data, but Core is the canonical owner for identity, consent, documents, audit, Application Gate decisions, and Production Ledger truth. The acceptable pattern is:

1. Module receives a user or partner action.
2. Module validates tenant, role, workflow state, and local operational prerequisites.
3. Module calls Core for consent, document access, application gate, ledger, or Passport writes.
4. Module stores only the local projection required for its workflow.
5. Module emits an audit-safe event id or Core reference, not raw restricted data.

## Target Staging Topology

| Service | Target staging host |
| --- | --- |
| App shell | `https://staging.app.florenceedu.com` |
| Core API and auth | `https://staging-api.florenceedu.com` |
| Developer portal | `https://staging-developers.florenceedu.com` |
| Academy API | `https://staging-academy-api.florenceedu.com` |
| Academy Live | `https://staging-live.florenceedu.com` |
| Pathway API | `https://staging-pathway-api.florenceedu.com` |
| Employer Connect | `https://staging-partners.florenceedu.com` |
| Workforce Economist API | `https://staging-economist-api.florenceedu.com` |
