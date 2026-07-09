# Florence Education Deployment Runbook

Last updated: 2026-06-26

## Purpose

This runbook summarizes the staging deployment path for the consolidated Florence Education platform. It is a staging-readiness runbook, not a production deployment approval.

Production deployment is future work and requires external security review, cloud control evidence, signed operational approvals, and reviewed secrets.

## Target Staging Services

| Service | Source | Staging host |
| --- | --- | --- |
| App shell | `apps/app-web` | `https://staging.app.florenceedu.com` |
| Core API and auth | `apps/core-api` | `https://staging-api.florenceedu.com` |
| Developer portal | Core gateway portal | `https://staging-developers.florenceedu.com` |
| Academy API | `apps/academy-web/api` | `https://staging-academy-api.florenceedu.com` |
| Academy Live | `apps/academy-web` live server | `https://staging-live.florenceedu.com` |
| Pathway API | `apps/pathway-api` | `https://staging-pathway-api.florenceedu.com` |
| Employer Connect API | `apps/employer-connect-api` | `https://staging-partners.florenceedu.com` |
| Workforce Economist API | `apps/economist-app` | `https://staging-economist-api.florenceedu.com` |

## Deployment Stack

- GitHub Actions readiness workflow.
- Artifact Registry for container images.
- Cloud Run for services and migration jobs.
- Cloud SQL Postgres for service databases.
- GCS Document Vault with CMEK.
- Secret Manager for database URLs and operator-provided secrets.
- Pub/Sub for platform event infrastructure.
- Terraform under `infra/`.
- Canonical public domain: `florenceedu.com`.

## Preflight Checklist

Before running a staging plan:

- Work from a clean, reviewed branch or PR.
- Confirm all secrets are in Secret Manager or GitHub Environments, not local tracked files.
- Use synthetic seed data only.
- Confirm no app or API references a legacy public domain.
- Confirm Core-required event modes are set for staging or explicitly tracked as release blockers.
- Run root CI.
- Run all-files secret scan.
- Run database migration dry-run against disposable Postgres.
- Build all Docker images.

## Local Verification Commands

```sh
cd /Users/dantetolbedantert/florence-work
npm ci
npm run typecheck
npm test
npm run lint
npm run build
npm run security:secrets
npm run security:secrets:test
npm run security:audit
npm run security:static
npm run security:ci:test
npm run migration:dry-run
docker compose --env-file .env.local build
```

Local verification passed on 2026-06-26 after Node/npm were available. See `TESTING_SYSTEM_USAGE.md`.

## Terraform Plan

```sh
cd /Users/dantetolbedantert/florence-work/infra
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
terraform plan -var-file=envs/staging.tfvars -var="image_tag=<commit-sha>"
```

The plan requires authorized Google credentials for the staging project. Do not use production credentials for local proof.

## GitHub Environment Requirements

Set these in the `staging` GitHub Environment:

- `GCP_WIF_PROVIDER`
- `GCP_DEPLOYER_SA`
- `GCP_PROJECT_ID`

Service runtime secrets must be supplied through Secret Manager or an approved secret source:

- Database URLs.
- Field encryption passphrases or keys.
- Core M2M client ids and secrets for Academy, Pathway, Employer Connect, and Workforce Economist.
- OAuth client credentials.
- Webhook secrets.
- Document Vault keys/configuration.
- Approved AI provider keys where enabled.

Do not commit secret values or print them in logs.

## Staging Apply

Only an authorized operator should apply Terraform after the plan artifact is reviewed:

```sh
cd /Users/dantetolbedantert/florence-work/infra
terraform init
terraform apply -var-file=envs/staging.tfvars -var="image_tag=<commit-sha>"
terraform output domain_mapping_records
```

After apply:

1. Create the DNS records from `domain_mapping_records`.
2. Wait for Google-managed TLS.
3. Run staging migration jobs.
4. Run smoke checks using fake accounts and synthetic records only.

## Migration Jobs

Run after Cloud Run services and Cloud SQL are provisioned:

```sh
gcloud run jobs execute core-api-migrate-staging --region us-central1 --wait
gcloud run jobs execute academy-api-migrate-staging --region us-central1 --wait
gcloud run jobs execute pathway-api-migrate-staging --region us-central1 --wait
gcloud run jobs execute employer-connect-api-migrate-staging --region us-central1 --wait
```

Migration output must not print connection strings, secrets, PII, document ids, packet contents, or restricted values.

## Smoke Checks

Minimum staging smoke checks:

- `GET https://staging-api.florenceedu.com/health`
- `GET https://staging-academy-api.florenceedu.com/health`
- `GET https://staging-pathway-api.florenceedu.com/api/health`
- `GET https://staging-partners.florenceedu.com/api/health`
- `GET https://staging-economist-api.florenceedu.com/health`
- Open `https://staging.app.florenceedu.com`
- Create a synthetic user session.
- Read Core Passport for a synthetic nurse.
- Trigger a synthetic Academy Apply CTA event.
- Run a synthetic Pathway readiness check.
- Build a synthetic employer-safe packet and verify Application Gate behavior.
- Create a synthetic Workforce Economist quote and proposal.
- Verify all required module events appear in Core.

## Stop/Go Gates

Stop if:

- Any secret is found in tracked files, logs, docs, fixtures, or screenshots.
- Any staging service writes restricted data to logs or URLs.
- Core Application Gate, consent, tenant scoping, signed document access, or audit logging fails.
- Production service config uses SQLite, PGlite, in-memory, or local JSON persistence.
- Core event writes are missing for required non-local workflows.
- Terraform plan includes unexpected public hosts or unaudited resources.

Go only when:

- CI passes from a clean install.
- Migration dry-run and staging migrations pass.
- Terraform plan is reviewed.
- Staging smoke checks pass with synthetic data.
- Open release blockers in `OPEN_ISSUES.md` are closed or formally exception-approved with compensating controls.

## Rollback

- If migration fails before traffic shift, keep prior Cloud Run revision serving and inspect sanitized job logs.
- If a service revision fails smoke checks, roll traffic back to the previous healthy Cloud Run revision.
- If a DNS or TLS mapping fails, do not route users to the new host; keep previous mapping active.
- If a security control fails, preserve the control and fix the workflow.
- Prefer forward-fix migrations unless a rollback is proven safe and no user data can be lost.
