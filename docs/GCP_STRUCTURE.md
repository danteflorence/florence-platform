# FlorenceRN — GCP structure (recommendation + operator bootstrap)

This is the recommended Google Cloud structure for hosting the FlorenceRN platform, and
the exact order an operator follows before the first `terraform apply`. The IaC that
implements it lives in [`infra/`](../infra/) (`main.tf`, `iam.tf`, `outputs.tf`,
`variables.tf`, `envs/*.tfvars`) and is validated in CI (`terraform fmt -check` + `validate`).

**What the platform runs on:** Cloud Run (stateless API runtime) · Cloud SQL Postgres
(system data) · GCS + CMEK (the document vault) · Secret Manager (creds) · Artifact
Registry (images) · Pub/Sub (async/webhooks) · per-service domain mappings on
`florencern.com`. **Auth stays self-hosted in Core** (RS256/JWKS + M2M client-credentials) —
GCP hosts it; it is not the IdP.

---

## 1. Organization + folders

```
Organization: florenceeducation.com  (Cloud Identity / Workspace)
└── folder: florencern/
    ├── folder: nonprod/      → projects: florencern-staging, florencern-sandbox
    ├── folder: prod/         → project:  florencern-production
    └── folder: cicd/         → project:  florencern-cicd   (WIF pool + deployer SAs)
```

Apply **org policies at the folder level**: restrict Cloud SQL public IP, require CMEK on
GCS, restrict service-account key creation (we use WIF, no exported keys), and restrict
allowed IAM domains to `florenceeducation.com`.

## 2. One project per environment (hard isolation)

| Project | Env | Purpose |
|---|---|---|
| `florencern-staging` | staging | Internal QA; auto-deploys on `main`. |
| `florencern-sandbox` | sandbox | **Partner integration testing with seeded FAKE data** (no real nurse/lender data → no counsel gate). Partners point at `sandbox-api.florencern.com`. |
| `florencern-production` | production | Real data + live workflows. Manual-approval deploy. |
| `florencern-cicd` | — | Hosts the WIF pool + per-env deployer SAs (optional; can also live per-project). |

Separate projects = separate billing rollup, Cloud SQL instances, KMS key rings, Secret
Manager, and IAM blast radius. The IaC already assumes this (`project_id` per `envs/*.tfvars`).
A local/dev "environment" stays on the in-repo MemoryStore/sqlite + `lvh.me` — not on GCP.

## 3. CI/CD identity — Workload Identity Federation (no exported keys)

- One **WIF pool + provider** trusting GitHub Actions OIDC (`token.actions.githubusercontent.com`),
  attribute-mapped + **condition-restricted to this repo** (`assertion.repository == 'danteflorence/florence-platform'`)
  and, for production, the `production` GitHub Environment.
- One **deployer service account per env** (`deployer@florencern-<env>`), least-privilege:
  `roles/run.admin`, `roles/iam.serviceAccountUser`, `roles/artifactregistry.writer`,
  `roles/cloudsql.admin`, `roles/secretmanager.admin`, `roles/storage.admin`,
  `roles/cloudkms.admin`, `roles/serviceusage.serviceUsageConsumer`. (Terraform can manage
  these once stable via `manage_deployer_iam=true` + `deployer_sa_email`; on the *first*
  apply the bootstrap owner grants them out-of-band — a deployer can't grant itself.)
- **GitHub secrets to set:** `GCP_WIF_PROVIDER`, `GCP_DEPLOYER_SA`, `GCP_PROJECT_STAGING`,
  `GCP_PROJECT_PROD` (already referenced by `.github/workflows/deploy.yml`). **Add
  `GCP_PROJECT_SANDBOX`** if you wire sandbox into CD. Recommended hardening: a *per-env*
  deployer SA + WIF provider rather than one shared deployer.
- Enable the **GitHub Environment protection rule** on `production` (required reviewer) — the
  workflow already targets `environment: production`.

## 4. Secret Manager layout (per project)

| Secret | Who sets it | Notes |
|---|---|---|
| `florencern-field-enc-<env>` | **operator (stable, never rotate mid-flight)** | Core's signing-key wrap passphrase. Rotating it orphans every signing key. |
| `florencern-database-url-<env>` | **Terraform** | Composed from the generated Cloud SQL user/password (`infra/main.tf`). |
| app secrets: `GOOGLE_CLIENT_SECRET`, `ANTHROPIC_API_KEY`, `ATS_CONNECT_VAULT_KEY`, `AGORA_*`, `ELEVENLABS_*`, `BLS_REGISTRATION_KEY` | operator | Mapped from the env vars in `render.yaml`/`docker-compose.yml`; grant each only to the runtime SA that needs it. |

Each runtime SA reads only its own secrets (see `infra/iam.tf`).

## 5. Cloud SQL topology

**One Postgres instance per env, multiple databases on it** (cheaper than per-service
instances, preserves schema isolation):

- `florencern_core`, `florencern_academy` (these MUST be separate DBs — both define
  `api_clients`/`audit_log`), `florencern_ats`.
- Production = `REGIONAL` (HA) — already set in `main.tf` (`availability_type` keys off
  `env`). Staging/sandbox = `ZONAL`, smaller `sql_tier`.
- ⚠️ Wave-1 `main.tf` provisions a **single** database (`var.db_name`). Splitting into the
  three databases above (a `for_each` over a `databases` list, distinct `DATABASE_URL`s per
  service) is the one schema-isolation follow-up to land **before production** with real data.

## 6. DNS + TLS

- Delegate `florencern.com` to **Cloud DNS** (or keep at the registrar and add records).
- After `terraform apply`, run `terraform output domain_mapping_records` and create the
  printed CNAME/A records. **Google-managed TLS** provisions automatically once they resolve.
- Hosts: production `id. api. developers. partners.` → core; `academy.` → academy-web (SPA);
  `api.academy.` → academy-api; `live.academy.` → academy-live; `ats.` → ats. Staging/sandbox
  use prefixed hosts (`id-staging.`, `sandbox-academy.`, …).
- **Not in this Terraform** (document where they live): `pathway.` (excluded wave-1 — see §11)
  and the external pricing `pricing.`/economist hosts (separate `labor-economics-agent` repo).

## 7. Sandbox seeding

Sandbox runs on FAKE data. Seed it by running the existing seed scripts as Cloud Run Jobs
(mirror the migrate-job pattern in `infra/main.tf`), gated to `env == "sandbox"`:
`florence-core` `seed-admin` + `seed-app-clients`, `florence-ats-connect` `seed`/`seed-targets`,
plus the partner-sandbox fixtures (ONB2). (Wiring these seed jobs into IaC + CD is a small
sandbox-only follow-up.)

## 8. Operator bootstrap order (before the first `terraform apply`)

1. Create the GCP **project** (`florencern-<env>`) under the right folder; link **billing**.
2. **Enable APIs:** `run`, `sqladmin`, `secretmanager`, `artifactregistry`, `cloudkms`,
   `storage`, `pubsub`, `iam`, `cloudresourcemanager`, `serviceusage`, `compute` (domain-mapping certs).
3. Create the **Terraform state GCS bucket** (remote backend) for this env.
4. Create the **WIF pool + provider** and the **deployer SA**; grant the deployer its roles
   (out-of-band — `manage_deployer_iam=false` for now).
5. Create the two secrets; **set `florencern-field-enc-<env>`** (stable). `database-url` is
   written by Terraform.
6. Set the **GitHub Environment secrets** + the production protection rule.
7. `terraform init && terraform apply -var-file=envs/<env>.tfvars` (or push to `main` for staging).
8. CI executes the **migrate Cloud Run Jobs** (`*-migrate-<env> --wait`).
9. Create **DNS records** from `terraform output domain_mapping_records`; wait for TLS.
10. (sandbox) run the **seed jobs**; (all) hit `/v1/health` (core), `/health` (academy-api),
    `/api/health` (ats) to confirm.

## 9. Cost ballpark (per env, us-central1, monthly, rough)

- Cloud SQL: `db-custom-1-3840` ZONAL ≈ **$50–70** (staging/sandbox); `db-custom-2-7680`
  REGIONAL/HA ≈ **$250–350** (prod).
- Cloud Run: light traffic, `min_instances` 0–1 ≈ **$0–40** (nonprod), **$50–150** (prod).
- Artifact Registry + GCS + KMS + Secret Manager + Pub/Sub ≈ **$5–20**. Managed TLS = free.
- **Totals: staging/sandbox ≈ $60–110/mo each; production ≈ $350–550/mo.** Scale-to-zero
  (`min_instances=0`) on non-issuer services is the main nonprod lever.

## 10. Operator- vs counsel-owned

- **Operator:** everything in §8 + DNS + the stable field-enc secret + GitHub protection.
- **Counsel (before LIVE lender/credit use only — NOT a deploy blocker for sandbox or
  non-lender):** fair-lending field sign-off, GLBA safeguards, per-bank DPA, FCRA program;
  own-bank charter/BSA-AML/SR 11-7 is a separate corporate track.

## 11. Full user-facing platform (the 6 Cloud Run services)

To put the platform — incl. the **Academy learning app** — in front of real users, the IaC now
deploys six services (per-env hosts in `infra/envs/*.tfvars`):

| Service | Prod host | Notes |
|---|---|---|
| `core` | `id. / api. / developers. / partners.` | SSO + Platform API gateway (needs_sql + field_enc) |
| `academy-web` | `academy.` | the **learner SPA** (static via Caddy on `$PORT`; URLs baked at build) |
| `academy-api` | `api.academy.` | learner signup/login + progress + assessments + payments (needs_sql + field_enc) |
| `academy-live` | `live.academy.` | live classroom (Socket.IO; `session_affinity`, single-instance) |
| `ats` | `ats.` | employer/ops + Demand/Opportunity/VMS Connect (needs_sql, `ATS_DB=postgres`) |
| `pathway` | — | **excluded wave-1** (sync sqlite; see `docs/PATHWAY_CLOUD_RUN.md`) — runs on a stateful host or after the Postgres refactor |

**End users CAN use Academy today once deployed:** it has learner signup/login (`/v1/auth/*`),
Stripe deposit checkout, content/audio, and live classroom. One SSO login on `id.florencern.com`
(cookie on `.florencern.com`) works across every app.

**Per-service SECRETS the operator creates in Secret Manager + wires via `secret_env`** (left empty
in the tfvars; add when ready — the runtime SA is auto-granted access via `iam.tf`). `docker-compose.yml`
is the canonical full env list:
- **core:** `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (staff Google login; password admin works without it via `seed-admin`), `DEMO_CLIENT_SECRET`.
- **academy-api:** `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (paid enrollment), `AGORA_*` (live A/V), `ELEVENLABS_*` (narration/tutor) — all optional; features degrade gracefully if unset.
- **ats:** `ATS_CONNECT_VAULT_KEY` (connector creds), `ANTHROPIC_API_KEY`, `PRICING_API_URL` (external economist).

**SPA build-time config caveat:** `academy-web` (and the ats/pathway SPAs) bake their URLs at
`docker build` time, so each environment **builds its own images** with that env's hosts (the CI
`deploy.yml` does this; it does NOT promote the same image staging→prod). Backend code is identical
across envs — only the SPA's baked URLs differ.

**Go-live order (after the §8 bootstrap):** push to `main` → CI builds 6 images + `terraform apply
-var-file=envs/staging.tfvars` → migrate jobs → create DNS records from `terraform output
domain_mapping_records` → managed TLS → hit `academy.florencern.com` and sign in. Production is the
same behind the manual-approval gate.
