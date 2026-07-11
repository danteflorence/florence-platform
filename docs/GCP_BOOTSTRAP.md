# GCP bootstrap — copy-paste commands to stand up `florenceedu-staging`

Run these once to provision the **staging** environment. After bootstrap, CI
(`.github/workflows/deploy.yml`, the `deploy-readiness` workflow) builds + pushes the
service images and produces a **Terraform plan artifact only** — an authorized operator
reviews the plan and runs `terraform apply` themselves. **There is no auto-apply and no
production deploy in CI.** Architecture + rationale: [`GCP_STRUCTURE.md`](GCP_STRUCTURE.md);
apply/rollback steps: [`runbooks/STAGING_DEPLOYMENT.md`](runbooks/STAGING_DEPLOYMENT.md).

Prereqs: `gcloud` installed + authenticated; you know your **Org ID** and **Billing Account
ID**. This is operator click-ops (it spends money and creates real infra), so it isn't run
by the agent.

## Precursor — create the GCP account + billing (if you have no GCP yet)

~10 minutes, mostly clicks. The billing step needs a payment method, so **you** do it.

1. **Sign in to the Cloud console** at <https://console.cloud.google.com> with a
   Workspace **admin** account — your Workspace domain gives you a Cloud **Organization**
   (that's your `ORG_ID`). Accept the terms on first visit.
2. **Create a Billing Account + add a payment method:** <https://console.cloud.google.com/billing>.
   New accounts get $300 free credit for 90 days — staging runs well within that.
3. **Domain:** make sure you control **`florenceedu.com`** DNS (needed at the post-apply DNS step).
4. **Install + authenticate the gcloud CLI:**
   ```bash
   brew install --cask google-cloud-sdk
   gcloud auth login
   gcloud auth application-default login
   ```
5. **Grab the two IDs:** `gcloud organizations list` → `ORG_ID`; `gcloud billing accounts list` → `BILLING`.

> **No org / not a Workspace admin?** Drop `--organization="$ORG_ID"` from the project-create
> line to make a standalone project. You lose folder-level org policies; staging works fine.

## Bootstrap commands

```bash
# ── 0. Variables (edit these) ────────────────────────────────────────────────
export ENV=staging
export PROJECT=florenceedu-staging
export ORG_ID=000000000000              # gcloud organizations list
export BILLING=XXXXXX-XXXXXX-XXXXXX     # gcloud billing accounts list
export REGION=us-central1
export GH_REPO=<github-org>/<repo>      # the repo running the deploy-readiness workflow
export STATE_BUCKET=gs://${PROJECT}-tfstate

# ── 1. Project + billing ─────────────────────────────────────────────────────
gcloud projects create "$PROJECT" --organization="$ORG_ID"
gcloud billing projects link "$PROJECT" --billing-account="$BILLING"
gcloud config set project "$PROJECT"

# ── 2. Enable APIs ───────────────────────────────────────────────────────────
gcloud services enable \
  run.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com \
  artifactregistry.googleapis.com cloudkms.googleapis.com storage.googleapis.com \
  pubsub.googleapis.com iam.googleapis.com iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com serviceusage.googleapis.com compute.googleapis.com

# ── 3. Terraform remote state bucket ─────────────────────────────────────────
gcloud storage buckets create "$STATE_BUCKET" --location="$REGION" --uniform-bucket-level-access
gcloud storage buckets update "$STATE_BUCKET" --versioning

# ── 4. Workload Identity Federation (keyless GitHub Actions → GCP) ────────────
gcloud iam workload-identity-pools create github --location=global --display-name="GitHub"
gcloud iam workload-identity-pools providers create-oidc github \
  --location=global --workload-identity-pool=github --display-name="GitHub OIDC" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${GH_REPO}'"
export PROJNUM=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
export WIF_PROVIDER="projects/${PROJNUM}/locations/global/workloadIdentityPools/github/providers/github"

# ── 5. Deployer service account + roles (least privilege) ────────────────────
gcloud iam service-accounts create deployer --display-name="CI deployer"
export DEPLOYER="deployer@${PROJECT}.iam.gserviceaccount.com"
for ROLE in run.admin iam.serviceAccountUser artifactregistry.writer \
  cloudsql.admin secretmanager.admin storage.admin cloudkms.admin \
  serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:${DEPLOYER}" --role="roles/${ROLE}" --condition=None
done
gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WIF_PROVIDER%/providers/*}/attribute.repository/${GH_REPO}"

# ── 6. Secrets — set the STABLE field-encryption passphrase (never rotate) ────
printf '%s' "$(openssl rand -hex 32)" | \
  gcloud secrets create "florenceedu-field-enc-${ENV}" --data-file=-
# The per-service DATABASE_URL secrets (florenceedu-<service>-database-url-<env>) are
# created and populated by Terraform — do NOT create them here. Other application
# secrets are operator-set out of band; see GCP_STRUCTURE.md "Secret Manager".

# ── 7. Print the GitHub Environment secrets to set ───────────────────────────
echo "In GitHub → Settings → Environments → ${ENV}, set:"
echo "  GCP_WIF_PROVIDER = $WIF_PROVIDER"
echo "  GCP_DEPLOYER_SA  = $DEPLOYER"
echo "  GCP_PROJECT_ID   = $PROJECT"
```

## After the bootstrap

1. Point Terraform at the state bucket (backend config for `infra/`), per `infra/README.md`.
2. Push to `main` (or dispatch **deploy-readiness** for `staging`/`sandbox`): CI builds +
   pushes the **7 service images** (`core-api`, `app-web`, `academy-api`, `academy-live`,
   `pathway-api`, `employer-connect-api`, `economist-api`) to
   `us-central1-docker.pkg.dev/$PROJECT/florenceedu/*` and uploads a **Terraform plan** artifact.
3. **Operator applies:** review the plan, then `terraform apply` per
   [`runbooks/STAGING_DEPLOYMENT.md`](runbooks/STAGING_DEPLOYMENT.md); execute the
   `<service>-migrate-<env>` Cloud Run jobs before serving traffic.
4. **DNS + TLS:** `terraform output domain_mapping_records` → create those records for the
   `staging-*.florenceedu.com` hosts; Google-managed TLS provisions once they resolve.
5. **Open it:** `https://staging.app.florenceedu.com` (shell) /
   `https://staging-api.florenceedu.com/v1/health` (Core).

## Sandbox / production

Sandbox: repeat with `ENV=sandbox PROJECT=florenceedu-sandbox` (the workflow's sandbox
dispatch covers it). Production (`florenceedu-prod`) is **deliberately not wired into CI**;
it requires GitHub Environment reviewers and an explicit operator-run apply — see
`GCP_STRUCTURE.md` "Deployment Boundary".
