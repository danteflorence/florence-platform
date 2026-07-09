# Florence Education Engineering Handoff

Last updated: 2026-06-26

## Purpose

This handoff gives the next engineer a concise operating map for the consolidated Florence Education platform. The repository is moving toward one Florence OS platform under `florenceedu.com`, with Core as the system of record and service modules writing audited events into Core.

Do not represent this repository as production-ready, externally audited, or SOC 2 certified. The correct language is production-readiness in progress and SOC 2-aligned control preparation, pending external audit and security review.

## Handoff Package

The final audit package is:

1. `PLATFORM_READINESS_REPORT.md`
2. `ARCHITECTURE_OVERVIEW.md`
3. `SYSTEM_OF_RECORD_MAP.md`
4. `API_OVERVIEW.md`
5. `EVENT_CATALOG.md`
6. `DATABASE_SCHEMA_OVERVIEW.md`
7. `TESTING_SYSTEM_USAGE.md`
8. `SECURITY_OVERVIEW.md`
9. `DEPLOYMENT_RUNBOOK.md`
10. `LOCAL_DEV_RUNBOOK.md`
11. `OPEN_ISSUES.md`
12. `ENGINEERING_HANDOFF.md`

## Current Platform Shape

| Area | Path | Status |
| --- | --- | --- |
| Core API | `apps/core-api` | Central identity, consent, Document Vault, Application Gate, audit, Passport, and event/ledger spine. |
| App shell | `apps/app-web` | Unified shell for Academy, Pathway, Employer Connect, Grants, profile, docs, ops, and admin. |
| Design system | `packages/design-system` | Shared tokens/components used by the app shell. |
| Academy | `apps/academy-web`, `apps/academy-web/api` | Learning and Academy API with Core events when configured. |
| Pathway | `apps/pathway-api` | Visa, NCLEX, licensure, consular, QA, and workflow automation with Core Passport writes when configured. |
| Employer Connect | `apps/employer-connect-api` | Demand, matching, packets, ATS/VMS, Application Gate, and ledger with Core canonical mode available. |
| Grants | `apps/app-web` plus Academy grant tables | Product surface exists; service ownership and Core event writer are open. |
| Workforce Economist | `apps/economist-app` | Quote/proposal API with Core event writer. |
| Infrastructure | `infra`, `.github/workflows`, `docs/runbooks` | Staging/sandbox/future production Terraform and deployment path. |

## First Commands For The Next Engineer

```sh
cd /Users/dantetolbedantert/florence-work
git status --short
npm ci
npm run typecheck
npm test
npm run lint
npm run build
npm run security:secrets
npm run migration:dry-run
```

These commands passed locally on 2026-06-26. Re-run them after any material change.

## Immediate Implementation Sequence

1. Close P0 issues in `OPEN_ISSUES.md`.
2. Add Grants owner service decision, Core event writer, consent/audit tests, and schema/API contract.
3. Enforce Core-required event modes for Academy, Pathway, Employer Connect, and Workforce Economist in staging and production.
4. Set Employer Connect `LEDGER_CANONICAL=core` outside local development and verify local ledger rows are projections.
5. Finish shared-shell/design-system migration for remaining standalone user workflows.
6. Keep root CI, all-files secret scan, migration dry-run, and Docker Postgres validation green after each material change.
7. Generate and review Terraform staging plan with authorized credentials.
8. Deploy staging with synthetic data only and run smoke checks.

## Module Handoff Notes

| Module | What to preserve | Next change |
| --- | --- | --- |
| Core | Identity, tenant scopes, consent, Document Vault, Application Gate, audit, event/ledger ownership. | Require downstream event writers and document cloud evidence. |
| Academy | Encrypted sensitive fields, Apply CTA safety, sponsored access, Core event writer. | Make Core event writes mandatory for non-local readiness/grant/application workflows. |
| Pathway | Human QA, candidate binding, no-PII errors, audit redaction, Core Passport writer. | Move canonical sensitive decisions into Core-governed contracts and require Core credentials outside local dev. |
| Employer Connect | Employer-safe packets, consent, Application Gate, HMAC webhooks, verified billing stages. | Require Core canonical ledger mode and fail closed when Core is unavailable. |
| Grants | Existing shell route and Academy grant-related tables/events. | Formalize owner service, APIs, Core event types, and tests. |
| Workforce Economist | Aggregate-only economics, Core quote/proposal event writer. | Require Core events in staging and keep nurse PII out of payloads. |
| App Web | Shared shell and design-system usage. | Replace fallback data with audited API paths. |
| Infra | Terraform, Cloud Run, Cloud SQL, Secret Manager, GCS, Pub/Sub, staging runbook. | Obtain authorized credentials, review plan, and apply staging only after gates pass. |

## Acceptance Snapshot

| Acceptance item | Handoff status |
| --- | --- |
| Root install/typecheck/test/build run or blockers documented | Passed locally on 2026-06-26. |
| App uses `florenceedu.com` only | Active platform configs and this package use `florenceedu.com`; keep domain scans in review. |
| UI uses shared design system | App shell does; remaining standalone surfaces are open. |
| Production services use Postgres | Target infra and Compose do; add release guardrails. |
| Core owns identity, consent, documents, Application Gate, audit, Production Ledger | Implemented as target architecture; downstream optional/local fallback modes remain. |
| All modules write events to Core | Academy, Pathway, Employer Connect, and Workforce Economist have writers; Grants is open. |
| Security controls documented and tested | Documented; full root CI, security checks, all-files secret scan, migration dry-run, and Docker Postgres validation passed locally. |
| Staging deployment plan ready | Ready for authorized plan/apply after blockers are resolved. |

## Security Reminder

Use synthetic data only. Do not weaken authentication, authorization, tenant scoping, consent, CSRF/CORS protections, audit logging, validation, encryption, signed URLs, rate limits, webhook verification, or Application Gate behavior to make a demo or test pass.
