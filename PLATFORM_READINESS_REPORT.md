# Florence Education Platform Readiness Report

Last updated: 2026-06-26

## Purpose

This report is the final audit snapshot for the Florence Education / Florence OS consolidation work in this repository. It summarizes the current platform state, the target state, module readiness, verification evidence, and remaining blockers for a staging deployment package.

This is not a SOC 2, HIPAA, HITRUST, HECVAT, GLBA, FERPA, GDPR, PCI, production, or legal compliance attestation. The accurate status is production-readiness in progress and SOC 2-aligned control preparation, pending external audit and security review.

## Executive Status

| Area | Status | Evidence | Blocking work |
| --- | --- | --- | --- |
| Unified platform shell | Partially ready | `apps/app-web` is the shared shell and uses `@florence/design-system`. | Standalone Academy, Pathway, and Employer surfaces still need full shared-shell migration. |
| Canonical domain | Mostly ready | Active app, infra, CI, and deployment configs target `florenceedu.com`. | Continue blocking any new legacy public domains in CI and review. |
| Core as system of record | Partially ready | Core owns identity, consent, audit, Document Vault, Application Gate, Passport, and ledger ingestion APIs. | Enforce Core-required modes across staging and production; remove local canonical fallbacks. |
| Postgres production standard | Ready for target deploy | Terraform and Docker Compose use Postgres for Core, Academy API, Pathway API, and Employer Connect API. | Keep SQLite/PGlite local-only and add release checks that reject production SQLite configs. |
| Event writes to Core | Partially ready | Academy, Pathway, Employer Connect, and Workforce Economist have Core event writers. | Grants has no dedicated Core event writer; some services no-op or fall back when Core credentials are missing. |
| Security controls | Partially ready | Tenant binding, consent, redaction, audit, signed URLs, Application Gate, AI governance, and fail-closed tests are documented. | External audit, penetration testing, cloud evidence, and remaining production gates are not complete. |
| Staging deployment | Ready to plan | Terraform, Dockerfiles, migrations, and staging runbook exist. | Terraform plan/apply needs authorized GCP credentials and reviewed GitHub environment secrets. |
| Root verification | Passed locally | Clean install, typecheck, tests, lint, formatting check, build, security checks, database checks, migration dry-run, and Docker Postgres validation ran. | No local verification blocker remains. |

## Module Readiness

| Module | Current state | Desired state | Readiness |
| --- | --- | --- | --- |
| Core API | Central identity, auth, Passport, consent, audit, Application Gate, Document Vault, lender, model, webhook, and ledger API. | Authoritative Florence OS policy and event spine for every sensitive platform workflow. | Yellow |
| App Web | Unified app shell for Academy, Pathway, Employer Connect, Grants, Profile, Documents, Ops, and Admin. | Single user-facing application at `app.florenceedu.com`, with shared navigation and design system. | Yellow |
| Academy | Learning app and API with enrollments, assessments, sponsored access, resource library, Apply CTA, and Core event emission when configured. | Academy uses Core identity, writes required education/readiness events, and surfaces inside the unified shell. | Yellow |
| Pathway | Visa, NCLEX, licensure, consular, QA, and candidate workflow automation with Core Passport event integration. | Pathway stores sensitive canonical records through Core-owned contracts and fails closed when Core writes are missing. | Yellow |
| Employer Connect | Employer requisitions, matching, packets, Application Gate, submissions, ATS/VMS sync, and ledger. | Core is canonical for ledger and Application Gate in all non-local environments. | Yellow |
| Grants | Current Grants surface lives in `apps/app-web`; Academy has sponsor and application fee coverage tables. | Dedicated Grants workflow writes consented funding/application-fee events to Core. | Red |
| Workforce Economist | Quote/proposal API with Core event emission for quote and proposal writes. | Production and staging require Core event credentials and no-op mode is local-only. | Yellow |
| Infrastructure | Cloud Run, Cloud SQL Postgres, GCS Document Vault, Secret Manager, Pub/Sub, Artifact Registry, and domain mappings are defined. | Staging deploy is applied from reviewed Terraform plan and smoke-tested with synthetic data. | Yellow |

## Acceptance Criteria Snapshot

| Criterion | Current finding |
| --- | --- |
| Root install/typecheck/test/build commands run or blockers documented. | Passed locally after Node/npm were installed. See `TESTING_SYSTEM_USAGE.md`. |
| App uses `florenceedu.com` only. | Active app, infra, CI, OpenAPI, Docker defaults, and runbooks target `florenceedu.com`. The handoff package introduces no legacy public domains. |
| UI uses the shared design system. | The unified shell imports shared design-system components. Some standalone pages still need full migration. |
| Production services use Postgres. | Target deploy uses Cloud SQL Postgres; local Docker Compose uses Postgres for production services. SQLite/PGlite must remain local-only. |
| Core owns identity, consent, documents, Application Gate, audit, and Production Ledger. | Core implements these domains, but local projections and optional event modes remain in downstream services. |
| Academy, Pathway, Employer Connect, Grants, and Workforce Economist all write events to Core. | Academy, Pathway, Employer Connect, and Workforce Economist have event writers. Grants is not complete. Optional/no-op modes must be disabled outside local development. |
| Security controls are documented and tested. | Controls and test coverage are documented. External audit, cloud evidence, and some fail-closed environment checks remain open. |
| Staging deployment plan is ready. | Staging runbook and Terraform path are ready for an authorized operator. Local Terraform plan is blocked without GCP credentials. |

## Verification Performed

The local host now exposes Node 24.18.0 and npm 11.16.0. These checks passed on 2026-06-26:

- `npm ci`
- `npm run typecheck`
- `npm test`
- `npm run lint`
- `npm run prettier`
- `npm run build`
- `npm run database:check`
- `npm run migration:dry-run` against a disposable local Postgres container
- `npm run database:compose`
- `npm run security:secrets`
- `npm run security:secrets:test`
- `npm run security:audit`
- `npm run security:static`
- `npm run security:ci:test`
- `npm run ci`
- All-files secret scan: 12,370 files checked

The staging Terraform plan still requires authorized Google credentials.

## Release Position

The repository is ready for a controlled staging-readiness pass with synthetic data after the open blockers in `OPEN_ISSUES.md` are triaged. It is not ready to claim production readiness, SOC 2 compliance, or external audit completion.
