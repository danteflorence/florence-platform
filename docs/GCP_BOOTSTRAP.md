# GCP bootstrap — copy-paste commands to stand up `florencern-staging`

Run these once to provision the **staging** environment, then a push to `main` deploys it
(the same flow with `florencern-production` + the manual-approval gate gives production).
Prereqs: `gcloud` installed + `gcloud auth login`; you know your **Org ID** and **Billing
Account ID** (`gcloud organizations list`, `gcloud billing accounts list`). Architecture +
rationale: [`GCP_STRUCTURE.md`](GCP_STRUCTURE.md). This is operator click-ops (it spends money
and creates real infra), so it isn't run by the agent.

```bash
# ── 0. Variables (edit these) ────────────────────────────────────────────────
export ENV=staging
export PROJECT=florencern-staging
export ORG_ID=000000000000              # gcloud organizations list
export BILLING=XXXXXX-XXXXXX-XXXXXX     # gcloud billing accounts list
export REGION=us-central1
export GH_REPO=danteflorence/florence-platform
export REGION_BUCKET=gs://${PROJECT}-tfstate

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
gcloud storage buckets create "$REGION_BUCKET" --location="$REGION" --uniform-bucket-level-access
gcloud storage buckets update "$REGION_BUCKET" --versioning

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
# Let the GitHub repo impersonate the deployer SA via WIF.
gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WIF_PROVIDER%/providers/*}/attribute.repository/${GH_REPO}"

# ── 6. Secrets — set the STABLE field-encryption passphrase (never rotate) ────
printf '%s' "$(openssl rand -hex 32)" | \
  gcloud secrets create "florencern-field-enc-${ENV}" --data-file=-
# florencern-database-url-<env> is created + populated by Terraform — do NOT set it here.
# Optional later (per docs/GCP_STRUCTURE.md §11): GOOGLE_CLIENT_*, STRIPE_*, AGORA_*, etc.

# ── 7. Print the GitHub secrets to set ───────────────────────────────────────
echo "Set these GitHub repo secrets (Settings → Secrets → Actions):"
echo "  GCP_WIF_PROVIDER  = $WIF_PROVIDER"
echo "  GCP_DEPLOYER_SA   = $DEPLOYER"
echo "  GCP_PROJECT_STAGING = $PROJECT"
```

## After the bootstrap
1. Add the Terraform GCS backend (one-time): create `infra/backend.tf` with
   `terraform { backend "gcs" { bucket = "<PROJECT>-tfstate" prefix = "staging" } }`
   (or `terraform init -backend-config=...`).
2. In GitHub: **Settings → Environments → `staging`** (and `production` with a required
   reviewer). Set the secrets from step 7 (+ `GCP_PROJECT_PROD` when you bootstrap prod).
3. **Deploy:** push to `main`. CI builds the 6 images, `terraform apply -var-file=envs/staging.tfvars`,
   then runs the migrate Cloud Run Jobs.
4. **DNS + TLS:** `cd infra && terraform output domain_mapping_records` → create those records at
   your `florencern.com` DNS; Google-managed TLS provisions automatically once they resolve.
5. **Open it:** `https://academy-staging.florencern.com` → sign up / sign in as a learner.
   Seed a staff admin with `florence-core npm run seed-admin` (or the seed Cloud Run Job).

## Production
Repeat steps 0–7 with `ENV=production PROJECT=florencern-production` (REGIONAL Cloud SQL/HA is
already set by the IaC for `env=production`), add `GCP_PROJECT_PROD`, enable the production
Environment's required-reviewer rule, and the manual-approval gate in `deploy.yml` governs go-live.
Bring real nurse PII online only in production (sandbox/staging stay test data).
