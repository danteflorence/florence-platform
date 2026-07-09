# Florence Education Platform GCP Infrastructure

This Terraform prepares staging, sandbox, and future production infrastructure for Florence Education on `florenceedu.com`.

## Stack

- Cloud Run for platform services
- Cloud SQL Postgres with per-service databases
- GCS Document Vault with CMEK
- Secret Manager for generated database URLs and operator-provided secrets
- Pub/Sub for platform events
- Artifact Registry at `florenceedu`
- Cloud Run domain mappings for `florenceedu.com`

## Services

- `core-api`
- `app-web`
- `academy-api`
- `academy-live`
- `pathway-api`
- `employer-connect-api`
- `economist-api`

## Validate

```sh
cd /Users/dantetolbedantert/florence-work/infra
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
terraform plan -var-file=envs/staging.tfvars -var="image_tag=<commit-sha>"
```

Terraform plan requires GCP credentials for the target staging project.

## Runbooks

- [Staging Deployment](../docs/runbooks/STAGING_DEPLOYMENT.md)
- [Migrations](../docs/runbooks/MIGRATIONS.md)
- [Rollback](../docs/runbooks/ROLLBACK.md)
- [Fake Staging Seed Data](../docs/runbooks/STAGING_SEED_DATA.md)

Production deployment is not performed in this phase.
