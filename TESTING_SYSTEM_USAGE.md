# Florence Education Testing System Usage

Last updated: 2026-06-26

## Purpose

This document explains how to run the current test, typecheck, build, database, security, local, and deployment checks for the Florence Education platform. It also records the local command blockers observed during this final handoff audit.

## Current Host Verification

The current local host exposes Node 24.18.0 and npm 11.16.0. The root verification path passed on 2026-06-26.

Root command status:

| Command | Current result |
| --- | --- |
| `npm ci` | Passed. |
| `npm run typecheck` | Passed. |
| `npm test` | Passed with local loopback permission for gateway tests. |
| `npm run lint` | Passed. |
| `npm run prettier` | Passed. |
| `npm run build` | Passed. |
| `npm run database:check` | Passed. |
| `npm run migration:dry-run` | Passed against disposable local Postgres. |
| `npm run database:compose` | Passed and validation containers were cleaned up. |
| `npm run security:secrets` | Passed over tracked files. |
| `node scripts/security/scan-secrets.mjs --all-files` | Passed: 12,370 files checked. |
| `npm run security:secrets:test` | Passed. |
| `npm run security:audit` | Passed at the configured high-severity gate; one low-severity esbuild dev-server advisory remains in Employer Connect. |
| `npm run security:static` | Passed. |
| `npm run security:ci:test` | Passed. |
| `npm run ci` | Passed. |

Run the all-files secret scan again before merging or staging if any further files change.

## Root Scripts

| Script | Purpose |
| --- | --- |
| `npm run setup:local` | Generate local environment templates and setup guidance. |
| `npm run dev` | Start the local Docker Compose stack. |
| `npm run dev:core` | Start Postgres and Core. |
| `npm run dev:academy` | Start Postgres, Core, Academy API, Academy Live, and App Web. |
| `npm run dev:pathway` | Start Postgres, Core, and Pathway API. |
| `npm run dev:employer` | Start Postgres, Core, Economist API, and Employer Connect API. |
| `npm run dev:economist` | Start Workforce Economist API. |
| `npm run db:migrate` | Run local migrations through Compose task helper. |
| `npm run db:seed` | Seed local synthetic data. |
| `npm run smoke:local` | Run local fake-data smoke flow. |
| `npm run workspace:check` | Validate workspace skeleton. |
| `npm run database:check` | Validate database standards. |
| `npm run migration:dry-run` | Run migration dry-run. |
| `npm run typecheck` | Run app/package typechecks through root runner. |
| `npm test` | Run app/package test scripts through root runner. |
| `npm run lint` | Run workspace lint/typecheck contract. |
| `npm run build` | Run app/package builds through root runner. |
| `npm run security:secrets` | Run secret scan. |
| `npm run security:deps` | Run dependency audit wrapper. |
| `npm run security:static` | Run static security analysis. |
| `npm run security:ci:test` | Validate CI workflow contract. |
| `npm run ci` | Full CI contract. |

## Service Test Map

| Service | Typecheck/build | Tests |
| --- | --- | --- |
| Core API | `npm run typecheck`, `npm run build` in `apps/core-api` | Security spine, logging/telemetry/audit, model gateway, document vault, Application Gate, audit, control tower, gateway, lender, tenant-binding, tenant-isolation. |
| App Web | `npm run typecheck`, `npm run build` in `apps/app-web` | `npm test` runs typecheck. |
| Academy Web | `npm run typecheck`, `npm run build` in `apps/academy-web` | `vitest run`. |
| Academy API | `npm run typecheck`, `npm run build` in `apps/academy-web/api` | Smoke, integration, HubSpot, TLS, walkthrough tests. |
| Pathway API | `npm run typecheck`, `npm run build` in `apps/pathway-api` | Pathway v1, consular payments, audit redaction, no-PII error smokes. |
| Employer Connect API | `npm run typecheck`, `npm run build` in `apps/employer-connect-api` | Document Vault, platform API, Application Gate, demand, opportunity, longtail, program, production loop, Core-required, reservations, onboarding risk, component SDK, PII URL, audit redaction, webhook signature, no-PII smokes. |
| Workforce Economist | `npm run typecheck`, `npm run build` in `apps/economist-app` | Smoke script validates quote/proposal and Core event capture. |

## Security Checks

Required before staging sign-off:

- Secret scan over all files.
- PII URL and no-PII error smokes.
- Audit redaction smokes.
- Tenant-binding and tenant-isolation verification.
- Application Gate verification.
- Document Vault signed URL verification.
- Webhook signature verification.
- AI/model gateway governance verification.
- Dependency audit and static analysis when network/tooling is available.

## Docker And Infrastructure Checks

Recent consolidation evidence shows that deployable Docker images were built locally and Terraform was validated through a Docker Terraform image. Re-run before staging:

```sh
docker compose --env-file .env.local build
cd infra
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
terraform plan -var-file=envs/staging.tfvars -var="image_tag=<commit-sha>"
```

Terraform plan requires authorized GCP credentials. Do not use production credentials for local proof.

## Synthetic Data Requirement

All tests, seeds, smoke flows, local screenshots, and example payloads must use synthetic data only. Do not use real candidate records, real document ids, real passport numbers, real SEVIS IDs, real visa information, real loan data, real employer packets, or real secrets.

## Minimum Staging Gate

Before staging traffic is enabled:

1. Clean install succeeds.
2. Root typecheck, tests, lint, build, and security checks pass.
3. Database migration dry-run passes against disposable Postgres.
4. Docker images build from clean checkout.
5. Terraform plan completes and is reviewed.
6. Core-required event modes are enabled for non-local environments.
7. Smoke tests use fake accounts and synthetic records only.
