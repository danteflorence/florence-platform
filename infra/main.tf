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
    random = { source = "hashicorp/random", version = "~> 3.6" }
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

# The GCS service agent must be able to use the CMEK key, or the bucket can't encrypt.
data "google_storage_project_service_account" "gcs" {}

resource "google_kms_crypto_key_iam_member" "gcs_cmek" {
  crypto_key_id = google_kms_crypto_key.docs.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${data.google_storage_project_service_account.gcs.email_address}"
}

resource "google_storage_bucket" "documents" {
  name                        = "${var.project_id}-documents-${var.env}"
  location                    = var.region
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  encryption {
    default_kms_key_name = google_kms_crypto_key.docs.id
  }

  depends_on = [google_kms_crypto_key_iam_member.gcs_cmek]
}

# ── System data: Cloud SQL Postgres (private; DATABASE_URL via Secret Manager) ─
resource "google_sql_database_instance" "pg" {
  name             = "florencern-${var.env}"
  database_version = "POSTGRES_15"

  settings {
    tier              = var.sql_tier
    availability_type = var.env == "production" ? "REGIONAL" : "ZONAL"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }
  }

  deletion_protection = var.env == "production"
}

resource "google_sql_database" "db" {
  name     = var.db_name
  instance = google_sql_database_instance.pg.name
}

# Cloud SQL application user. Terraform generates the password and writes the full
# DATABASE_URL into Secret Manager so the operator never hand-crafts a connection string.
resource "random_password" "db" {
  length  = 32
  special = false
}

resource "google_sql_user" "app" {
  name     = "florencern_app"
  instance = google_sql_database_instance.pg.name
  password = random_password.db.result
}

# ── Secrets ───────────────────────────────────────────────────────────────────
# The Core field-encryption passphrase is OPERATOR-set (stable; never auto-rotated, or
# every signing key orphans). The DATABASE_URL value is written by Terraform (below).
resource "google_secret_manager_secret" "core_field_enc" {
  secret_id = "florencern-field-enc-${var.env}"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "database_url" {
  secret_id = "florencern-database-url-${var.env}"
  replication {
    auto {}
  }
}

# Cloud Run reaches Cloud SQL over the mounted unix socket (/cloudsql/<connection>).
resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "postgres://${google_sql_user.app.name}:${random_password.db.result}@/${google_sql_database.db.name}?host=/cloudsql/${google_sql_database_instance.pg.connection_name}"
}

# ── Async / webhook fan-out ───────────────────────────────────────────────────
resource "google_pubsub_topic" "events" {
  name = "florencern-events-${var.env}"
}

# ── Per-service runtime identity (least privilege; see iam.tf for bindings) ────
resource "google_service_account" "runtime" {
  for_each     = var.services
  account_id   = "fl-${each.key}-${var.env}"
  display_name = "FlorenceRN ${each.key} runtime (${var.env})"
}

# ── The services (Cloud Run v2) + per-service domain mappings ─────────────────
resource "google_cloud_run_v2_service" "svc" {
  for_each = var.services
  name     = "${each.key}-${var.env}"
  location = var.region

  template {
    service_account = google_service_account.runtime[each.key].email
    # Sticky sessions for the live-classroom WebSocket service (in-memory room state).
    session_affinity = each.value.session_affinity

    scaling {
      min_instance_count = each.value.min_instances
      max_instance_count = each.value.max_instances
    }

    dynamic "volumes" {
      for_each = each.value.needs_sql ? [1] : []
      content {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [google_sql_database_instance.pg.connection_name]
        }
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
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.database_url.secret_id
              version = "latest"
            }
          }
        }
      }

      # Core signing-key wrap + field crypto. Stable, operator-set secret value.
      dynamic "env" {
        for_each = each.value.needs_field_enc ? [1] : []
        content {
          name = "FIELD_ENC_PASSPHRASE"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.core_field_enc.secret_id
              version = "latest"
            }
          }
        }
      }

      # Plain per-service config (CORS allowlist, PUBLIC_APP_URL, ATS_DB, JWT iss/aud, …).
      dynamic "env" {
        for_each = each.value.extra_env
        content {
          name  = env.key
          value = env.value
        }
      }

      # Optional per-service secrets (operator provisions the secret_ids; e.g. Stripe, Agora).
      dynamic "env" {
        for_each = each.value.secret_env
        content {
          name = env.value.name
          value_source {
            secret_key_ref {
              secret  = env.value.secret
              version = "latest"
            }
          }
        }
      }

      dynamic "volume_mounts" {
        for_each = each.value.needs_sql ? [1] : []
        content {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }
      }

      # Startup probe gates traffic (it IS the readiness gate in Cloud Run v2); the
      # liveness probe restarts a wedged instance. Each service exposes its health path.
      startup_probe {
        http_get {
          path = each.value.health_path
        }
        initial_delay_seconds = 5
        period_seconds        = 5
        failure_threshold     = 12
      }

      liveness_probe {
        http_get {
          path = each.value.health_path
        }
        period_seconds = 30
      }
    }
  }

  depends_on = [google_secret_manager_secret_version.database_url]
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

# ── Schema migrations as a one-shot Cloud Run Job (run once per deploy, BEFORE the
#    service serves) — never a Dockerfile entrypoint, which would race DDL on every
#    cold start. CI runs `gcloud run jobs execute …-migrate --wait` after apply.
locals {
  migrate_services = [for k in keys(var.services) : k if contains(["core", "academy-api"], k)]
}

resource "google_cloud_run_v2_job" "migrate" {
  for_each = toset(local.migrate_services)
  name     = "${each.key}-migrate-${var.env}"
  location = var.region

  template {
    template {
      service_account = google_service_account.runtime[each.key].email

      volumes {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [google_sql_database_instance.pg.connection_name]
        }
      }

      containers {
        image   = "${var.region}-docker.pkg.dev/${var.project_id}/florencern/${each.key}:${var.image_tag}"
        command = ["node", "db/migrate.mjs"]

        env {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.database_url.secret_id
              version = "latest"
            }
          }
        }

        volume_mounts {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }
      }
    }
  }

  depends_on = [google_secret_manager_secret_version.database_url]
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

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.svc[each.value].name
  }
}
