# Florence Education GCP Structure

This is the recommended GCP structure for staging, sandbox, and future production. The implementation lives in `infra/`.

## Projects

Use one project per environment:

| Project placeholder | Environment | Purpose |
| --- | --- | --- |
| `florenceedu-staging` | staging | Internal QA and release validation |
| `florenceedu-sandbox` | sandbox | Partner demos and integrations with fake data |
| `florenceedu-prod` | production | Real workflows after later approval |
| `florenceedu-cicd` | CI/CD | Optional WIF pool and deployer service accounts |

## Required Services

Enable Cloud Run, Cloud SQL Admin, Secret Manager, Artifact Registry, Cloud KMS, Cloud Storage, Pub/Sub, IAM, Cloud Resource Manager, Service Usage, and Compute.

## GitHub Actions Identity

Use Workload Identity Federation. Each GitHub Environment should provide:

- `GCP_WIF_PROVIDER`
- `GCP_DEPLOYER_SA`
- `GCP_PROJECT_ID`

Production should have GitHub Environment reviewers before any future production workflow is enabled.

## Secret Manager

Terraform creates generated per-service `DATABASE_URL` secrets named `florenceedu-<service>-database-url-<env>`.

Operators set stable application secrets out of band. Do not commit secret values, `.env` files, screenshots, or logs that contain credentials.

## Cloud SQL

Each environment has one Cloud SQL Postgres instance and per-service databases for stateful services:

- `florence_core`
- `florence_academy`
- `florence_pathway`
- `florence_employer`

## Domains

The canonical public domain is `florenceedu.com`. Staging and sandbox domains are listed in [Staging Deployment](runbooks/STAGING_DEPLOYMENT.md).

## Deployment Boundary

The current GitHub workflow builds and pushes staging/sandbox images and runs Terraform plan. It does not apply Terraform and does not deploy production. An authorized operator must review the plan before any staging apply.
