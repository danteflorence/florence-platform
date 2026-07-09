# Staging Deployment Runbook

This phase prepares staging and sandbox deployment. It does not perform production deployment.

## Target Infrastructure

- GCP Cloud Run
- Cloud SQL Postgres
- GCS Document Vault with CMEK
- Secret Manager
- Pub/Sub
- Artifact Registry
- GitHub Actions with Workload Identity Federation
- Terraform under `infra/`
- Canonical domains under `florenceedu.com`

## Staging Domains

| Service | Domain |
| --- | --- |
| App shell | `https://staging.app.florenceedu.com` |
| Core API and auth | `https://staging-api.florenceedu.com` |
| Developer portal | `https://staging-developers.florenceedu.com` |
| Academy API | `https://staging-academy-api.florenceedu.com` |
| Academy Live | `https://staging-live.florenceedu.com` |
| Pathway API | `https://staging-pathway-api.florenceedu.com` |
| Employer Connect | `https://staging-partners.florenceedu.com` |
| Workforce Economist API | `https://staging-economist-api.florenceedu.com` |

## Sandbox Domains

| Service | Domain |
| --- | --- |
| App shell | `https://sandbox.app.florenceedu.com` |
| Core API and auth | `https://sandbox-api.florenceedu.com` |
| Developer portal | `https://sandbox-developers.florenceedu.com` |
| Academy API | `https://sandbox-academy-api.florenceedu.com` |
| Academy Live | `https://sandbox-live.florenceedu.com` |
| Pathway API | `https://sandbox-pathway-api.florenceedu.com` |
| Employer Connect | `https://sandbox-partners.florenceedu.com` |
| Workforce Economist API | `https://sandbox-economist-api.florenceedu.com` |

## GitHub Environment Secrets

Set these in the `staging` and `sandbox` GitHub Environments:

- `GCP_WIF_PROVIDER`
- `GCP_DEPLOYER_SA`
- `GCP_PROJECT_ID`

Do not store production secrets in local files or repository fixtures.

## Readiness Workflow

The `.github/workflows/deploy.yml` workflow builds and pushes environment-specific images, then runs `terraform plan`. It uploads the plan artifact for review. It does not run `terraform apply`.

Manual run:

1. Open GitHub Actions.
2. Run `deploy-readiness`.
3. Choose `staging` or `sandbox`.
4. Review the Terraform plan artifact.
5. An authorized operator may apply the reviewed plan from a controlled environment.

Operator apply after approval:

```sh
cd /Users/dantetolbedantert/florence-work/infra
terraform init
terraform apply -var-file=envs/staging.tfvars -var="image_tag=<commit-sha>"
terraform output domain_mapping_records
```

Create the DNS records from `domain_mapping_records`, wait for Google-managed TLS, then run the migration runbook.

## Smoke Checks

- `GET https://staging-api.florenceedu.com/health`
- `GET https://staging-academy-api.florenceedu.com/health`
- `GET https://staging-pathway-api.florenceedu.com/api/health`
- `GET https://staging-partners.florenceedu.com/api/health`
- `GET https://staging-economist-api.florenceedu.com/health`
- Open `https://staging.app.florenceedu.com`

Use fake accounts and synthetic records only.

## Acceptance Criteria

- Docker images build in CI.
- Terraform plan completes for staging.
- Staging domains and DNS records are documented.
- Migration jobs are present and can be executed against staging Cloud SQL.
- No production deployment occurs in this phase.
