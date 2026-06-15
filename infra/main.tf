# FlorenceRN Platform — GCP Cloud Run infrastructure.
# GitHub stores the product; THIS runs it. Cloud Run (stateless API runtime) + Cloud SQL
# Postgres (system data) + GCS+CMEK (the document vault) + Secret Manager (creds) +
# Artifact Registry (images) + Pub/Sub (async/webhooks) + per-service domain mappings on
# florencern.com. Four environments are separate `terraform apply`s with envs/<env>.tfvars.
#
# Run (OPERATOR): terraform init && terraform apply -var-file=envs/<env>.tfvars
# `terraform validate` is part of CI; the apply is operator click-ops (needs the GCP project).

terraform {
  required_version = ">= 1.6"
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ── Images: one Artifact Registry repo for all service containers ─────────────
resource "google_artifact_registry_repository" "florencern" {
  location      = var.region
  repository_id = "florencern"
  format        = "DOCKER"
}

# ── Document vault: GCS bucket, customer-managed encryption (CMEK) ────────────
resource "google_kms_key_ring" "florencern" {
  name     = "florencern-${var.env}"
  location = var.region
}
resource "google_kms_crypto_key" "docs" {
  name     = "docs"
  key_ring = google_kms_key_ring.florencern.id
}
resource "google_storage_bucket" "documents" {
  name                        = "${var.project_id}-documents-${var.env}"
  location                    = var.region
  uniform_bucket_level_access = true
  versioning { enabled = true }
  encryption { default_kms_key_name = google_kms_crypto_key.docs.id }
}

# ── System data: Cloud SQL Postgres (private; DATABASE_URL via Secret Manager) ─
resource "google_sql_database_instance" "pg" {
  name             = "florencern-${var.env}"
  database_version = "POSTGRES_15"
  settings {
    tier              = var.sql_tier
    availability_type = var.env == "production" ? "REGIONAL" : "ZONAL"
    backup_configuration { enabled = true point_in_time_recovery_enabled = true }
  }
  deletion_protection = var.env == "production"
}
resource "google_sql_database" "db" {
  name     = var.db_name
  instance = google_sql_database_instance.pg.name
}

# ── Secrets (values set OUT OF BAND by the operator; only declared here) ───────
resource "google_secret_manager_secret" "core_field_enc" {
  secret_id = "florencern-field-enc-${var.env}"
  replication { auto {} }
}
resource "google_secret_manager_secret" "database_url" {
  secret_id = "florencern-database-url-${var.env}"
  replication { auto {} }
}

# ── Async / webhook fan-out ───────────────────────────────────────────────────
resource "google_pubsub_topic" "events" {
  name = "florencern-events-${var.env}"
}

# ── The services (Cloud Run v2) + per-service domain mappings ─────────────────
resource "google_cloud_run_v2_service" "svc" {
  for_each = var.services
  name     = "${each.key}-${var.env}"
  location = var.region
  template {
    scaling { min_instance_count = each.value.min_instances max_instance_count = each.value.max_instances }
    dynamic "volumes" {
      for_each = each.value.needs_sql ? [1] : []
      content {
        name = "cloudsql"
        cloud_sql_instance { instances = [google_sql_database_instance.pg.connection_name] }
      }
    }
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/florencern/${each.key}:${var.image_tag}"
      env {
        name  = "CORE_ISSUER_URL"
        value = "https://id.${var.domain}"
      }
      env {
        name  = "COOKIE_DOMAIN"
        value = ".${var.domain}"
      }
      env {
        name  = "FLORENCE_ENV"
        value = var.env
      }
      dynamic "env" {
        for_each = each.value.needs_sql ? [1] : []
        content {
          name = "DATABASE_URL"
          value_source { secret_key_ref { secret = google_secret_manager_secret.database_url.secret_id version = "latest" } }
        }
      }
      dynamic "volume_mounts" {
        for_each = each.value.needs_sql ? [1] : []
        content { name = "cloudsql" mount_path = "/cloudsql" }
      }
    }
  }
}

# Public services allow unauthenticated ingress — the API gateway authenticates each
# request itself (Core RS256). Non-public services are reachable only via authorized callers.
resource "google_cloud_run_v2_service_iam_member" "public" {
  for_each = { for k, v in var.services : k => v if v.public }
  name     = google_cloud_run_v2_service.svc[each.key].name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

locals {
  # Flatten services × their subdomains into one mapping per fully-qualified host.
  domain_maps = merge([
    for svc, cfg in var.services : {
      for sd in cfg.subdomains : "${sd}.${var.domain}" => svc
    }
  ]...)
}
resource "google_cloud_run_domain_mapping" "map" {
  for_each = local.domain_maps
  location = var.region
  name     = each.key
  metadata { namespace = var.project_id }
  spec { route_name = google_cloud_run_v2_service.svc[each.value].name }
}
