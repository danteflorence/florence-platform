# FlorenceRN Platform — GCP infrastructure (Terraform)

GitHub stores the product; **this runs it.** Cloud Run (stateless API runtime) + Cloud SQL Postgres
(system data) + GCS + CMEK (document vault) + Secret Manager (creds) + Artifact Registry (images) +
Pub/Sub (async/webhooks) + per-service domain mappings on **florencern.com**. Auth stays self-hosted
in **Core** (RS256/JWKS + M2M) — no third-party IdP.

## Environments (four)
| Env | Purpose | How |
|---|---|---|
| local | dev w/ fake data | `lvh.me` harness + node:sqlite / MemoryStore (no cloud) |
| staging | internal QA | `terraform apply -var-file=envs/staging.tfvars` |
| sandbox | partner testing (AMN/Kaiser/lenders/universities) with seeded fake data | `…/sandbox.tfvars` |
| production | real data + live workflows | `…/production.tfvars` |

Each non-local env is a separate GCP project (`project_id` in its tfvars) — hard tenant isolation.

## Apply (operator click-ops — needs the GCP project + billing + DNS)
```
cd infra
terraform init
terraform validate                         # also runs in CI
terraform apply -var-file=envs/production.tfvars
```
CI rewrites each service `image` to the built commit SHA before apply (see `.github/workflows/deploy.yml`).

## Domain mapping (florencern.com → Cloud Run)
`id. api. developers. partners.` → **core**; `ats. pathway. api.academy.` → their services. After apply,
create the DNS records Cloud Run prints (operator, in the registrar/Cloud DNS); SSL is managed by Google.
Cookie domain is `.florencern.com`; the token issuer is `https://id.florencern.com`.

## What is OPERATOR-OWNED (not in this repo)
- The GCP project(s), billing, org policies, and DNS for florencern.com.
- Secret VALUES: set `florencern-field-enc-<env>` (Core key-wrap passphrase — stable, never rotate per-boot)
  and `florencern-database-url-<env>` in Secret Manager out of band.
- The `apply` itself, IAM least-privilege review, and SOC 2 audit/evidence.

## Container images
Each service already ships a `Dockerfile` (`florence-core/`, `florence-ats-connect/`, `florence-pathway-agent/`,
`florence-academy/api/`) on `node:24-slim`. Services MUST listen on `$PORT` (Cloud Run injects it) and expose
`/health`. Stateless: Core + ats + academy-api run on Postgres (`DATABASE_URL`); **pathway requires its
Postgres store option** (see the DEP3 store seam) before it can run on stateless Cloud Run.
