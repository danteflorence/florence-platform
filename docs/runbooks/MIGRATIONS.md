# Migration Runbook

This runbook covers staging and sandbox database migrations for the Florence Education platform. Production migration execution is future work and is not performed by this phase.

## Current State

- Core API, Academy API, Pathway API, and Employer Connect API each have service-owned migration entrypoints.
- CI runs a migration dry-run against disposable Postgres with `npm run migration:dry-run`.
- Terraform creates Cloud Run Jobs for services that define `migrate_command` in `infra/envs/*.tfvars`.

## Desired State

- Every staging deploy has a reviewed Terraform plan, built images, and successful migrations before traffic is moved to a new revision.
- Migration output must not print connection strings, passwords, PII, document identifiers, packet contents, or other restricted values.

## Preflight

```sh
cd /Users/dantetolbedantert/florence-work
npm run migration:dry-run
cd infra
terraform plan -var-file=envs/staging.tfvars -var="image_tag=<commit-sha>"
```

Use a disposable `DATABASE_URL` for the local dry-run. Do not use production credentials locally.

## Staging Execution

After staging Terraform has been applied by an authorized operator, run the migration jobs:

```sh
gcloud run jobs execute core-api-migrate-staging --region us-central1 --wait
gcloud run jobs execute academy-api-migrate-staging --region us-central1 --wait
gcloud run jobs execute pathway-api-migrate-staging --region us-central1 --wait
gcloud run jobs execute employer-connect-api-migrate-staging --region us-central1 --wait
```

## Rollback

- If a migration job fails before serving traffic, keep the prior Cloud Run revision serving and inspect the failed job logs for sanitized errors only.
- If a migration is partially applied, use a forward-fix migration unless the schema change is proven reversible and no user data is at risk.

## Acceptance Criteria

- CI migration dry-run passes.
- Terraform exposes the expected `migrate_jobs` output.
- Staging migration jobs complete successfully with sanitized logs.
- No production secret or real user data is required for local verification.
