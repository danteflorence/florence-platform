# Florence Education runtime IAM. Service accounts are declared in main.tf.

resource "google_secret_manager_secret_iam_member" "db_url" {
  for_each = local.sql_services

  secret_id = google_secret_manager_secret.database_url[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime[each.key].email}"
}

resource "google_secret_manager_secret_iam_member" "field_enc" {
  for_each = { for k, v in var.services : k => v if v.needs_field_enc }

  secret_id = google_secret_manager_secret.field_enc.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime[each.key].email}"
}

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

resource "google_project_iam_member" "cloudsql_client" {
  for_each = local.sql_services

  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.runtime[each.key].email}"
}

resource "google_storage_bucket_iam_member" "vault" {
  for_each = var.services

  bucket = google_storage_bucket.documents.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.runtime[each.key].email}"
}

resource "google_pubsub_topic_iam_member" "publisher" {
  for_each = var.services

  project = var.project_id
  topic   = google_pubsub_topic.events.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.runtime[each.key].email}"
}

locals {
  deployer_roles = var.manage_deployer_iam && var.deployer_sa_email != "" ? [
    "roles/run.admin",
    "roles/iam.serviceAccountUser",
    "roles/artifactregistry.writer",
    "roles/cloudsql.admin",
    "roles/secretmanager.admin",
    "roles/storage.admin",
    "roles/cloudkms.admin",
    "roles/pubsub.admin",
    "roles/serviceusage.serviceUsageConsumer",
  ] : []
}

resource "google_project_iam_member" "deployer" {
  for_each = toset(local.deployer_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${var.deployer_sa_email}"
}
