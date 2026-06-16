# FlorenceRN Platform — least-privilege IAM for the per-service runtime service accounts
# (declared in main.tf as google_service_account.runtime). Each service gets ONLY what it
# needs: its DATABASE_URL secret, Cloud SQL client (if stateful), the document vault, and
# — for Core — the field-encryption passphrase secret.

# DATABASE_URL secret → readable by the stateful services that mount it.
resource "google_secret_manager_secret_iam_member" "db_url" {
  for_each  = { for k, v in var.services : k => v if v.needs_sql }
  secret_id = google_secret_manager_secret.database_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime[each.key].email}"
}

# Field-encryption passphrase → readable by the services that wrap keys / do field crypto
# (Core + academy-api).
resource "google_secret_manager_secret_iam_member" "field_enc" {
  for_each  = { for k, v in var.services : k => v if v.needs_field_enc }
  secret_id = google_secret_manager_secret.core_field_enc.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime[each.key].email}"
}

# Optional per-service secrets (Stripe/Agora/etc.) → readable by the service that declares
# them in secret_env. Flatten services × their secret_env into one binding each.
resource "google_secret_manager_secret_iam_member" "service_secret_env" {
  for_each = {
    for pair in flatten([
      for k, v in var.services : [
        for s in v.secret_env : { svc = k, secret = s.secret }
      ]
    ]) : "${pair.svc}:${pair.secret}" => pair
  }
  secret_id = each.value.secret
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime[each.value.svc].email}"
}

# Cloud SQL client (connect over the mounted unix socket) → stateful services.
resource "google_project_iam_member" "cloudsql_client" {
  for_each = { for k, v in var.services : k => v if v.needs_sql }
  project  = var.project_id
  role     = "roles/cloudsql.client"
  member   = "serviceAccount:${google_service_account.runtime[each.key].email}"
}

# Document vault (CMEK GCS) → object read/write, bucket-scoped (not project-wide).
resource "google_storage_bucket_iam_member" "vault" {
  for_each = var.services
  bucket   = google_storage_bucket.documents.name
  role     = "roles/storage.objectAdmin"
  member   = "serviceAccount:${google_service_account.runtime[each.key].email}"
}

# ── CI deployer (Workload Identity Federation) — optional, off by default ──────
# First apply: the bootstrap owner grants these out-of-band (the deployer can't grant
# itself). Once stable, set manage_deployer_iam=true + deployer_sa_email to bring the
# deployer's roles under Terraform. See docs/GCP_STRUCTURE.md.
locals {
  deployer_roles = var.manage_deployer_iam && var.deployer_sa_email != "" ? [
    "roles/run.admin",
    "roles/iam.serviceAccountUser",
    "roles/artifactregistry.writer",
    "roles/cloudsql.admin",
    "roles/secretmanager.admin",
    "roles/storage.admin",
    "roles/cloudkms.admin",
    "roles/serviceusage.serviceUsageConsumer",
  ] : []
}

resource "google_project_iam_member" "deployer" {
  for_each = toset(local.deployer_roles)
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${var.deployer_sa_email}"
}
