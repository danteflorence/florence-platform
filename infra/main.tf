# Florence Education Platform -- GCP Cloud Run infrastructure.
# Cloud Run (stateless runtime) + Cloud SQL Postgres (system data) + GCS+CMEK
# document vault + Secret Manager + Pub/Sub + Artifact Registry + florenceedu.com
# domain mappings. Each environment is applied from infra/envs/<env>.tfvars.

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

resource "google_artifact_registry_repository" "florenceedu" {
  location      = var.region
  repository_id = "florenceedu"
  format        = "DOCKER"
}

resource "google_kms_key_ring" "florenceedu" {
  name     = "florenceedu-${var.env}"
  location = var.region
}

resource "google_kms_crypto_key" "docs" {
  name     = "docs"
  key_ring = google_kms_key_ring.florenceedu.id
}

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

resource "google_sql_database_instance" "pg" {
  name             = "florenceedu-${var.env}"
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

locals {
  sql_services = { for k, v in var.services : k => v if v.needs_sql }
  repo_url     = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.florenceedu.repository_id}"
}

resource "google_sql_database" "service_db" {
  for_each = local.sql_services

  name     = coalesce(each.value.database_name, replace(each.key, "-", "_"))
  instance = google_sql_database_instance.pg.name
}

resource "random_password" "db" {
  for_each = local.sql_services

  length  = 32
  special = false
}

resource "google_sql_user" "app" {
  for_each = local.sql_services

  name     = substr("fl_${replace(each.key, "-", "_")}_${var.env}", 0, 63)
  instance = google_sql_database_instance.pg.name
  password = random_password.db[each.key].result
}

resource "google_secret_manager_secret" "field_enc" {
  secret_id = "florenceedu-field-enc-${var.env}"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "database_url" {
  for_each = local.sql_services

  secret_id = "florenceedu-${each.key}-database-url-${var.env}"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "database_url" {
  for_each = local.sql_services

  secret      = google_secret_manager_secret.database_url[each.key].id
  secret_data = "postgres://${google_sql_user.app[each.key].name}:${random_password.db[each.key].result}@/${google_sql_database.service_db[each.key].name}?host=/cloudsql/${google_sql_database_instance.pg.connection_name}"
}

resource "google_pubsub_topic" "events" {
  name = "florenceedu-events-${var.env}"
}

resource "google_service_account" "runtime" {
  for_each = var.services

  account_id   = substr(replace("fl-${each.key}-${var.env}", "-", ""), 0, 30)
  display_name = "Florence Education ${each.key} runtime (${var.env})"
}

resource "google_cloud_run_v2_service" "svc" {
  for_each = var.services

  name     = "${each.key}-${var.env}"
  location = var.region

  template {
    service_account  = google_service_account.runtime[each.key].email
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
      image = "${local.repo_url}/${each.key}:${var.image_tag}"

      env {
        name  = "COOKIE_DOMAIN"
        value = ".${var.domain}"
      }

      env {
        name  = "DOCUMENT_VAULT_BUCKET"
        value = google_storage_bucket.documents.name
      }

      env {
        name  = "FLORENCE_ENV"
        value = var.env
      }

      env {
        name  = "PUBSUB_TOPIC"
        value = google_pubsub_topic.events.name
      }

      dynamic "env" {
        for_each = each.value.needs_sql ? [1] : []
        content {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.database_url[each.key].secret_id
              version = "latest"
            }
          }
        }
      }

      dynamic "env" {
        for_each = each.value.needs_field_enc ? [1] : []
        content {
          name = "FIELD_ENC_PASSPHRASE"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.field_enc.secret_id
              version = "latest"
            }
          }
        }
      }

      dynamic "env" {
        for_each = each.value.extra_env
        content {
          name  = env.key
          value = env.value
        }
      }

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

resource "google_cloud_run_v2_service_iam_member" "public" {
  for_each = { for k, v in var.services : k => v if v.public }

  name     = google_cloud_run_v2_service.svc[each.key].name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

locals {
  migration_services = { for k, v in var.services : k => v if length(v.migrate_command) > 0 }
}

resource "google_cloud_run_v2_job" "migrate" {
  for_each = local.migration_services

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
        image   = "${local.repo_url}/${each.key}:${var.image_tag}"
        command = each.value.migrate_command

        env {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.database_url[each.key].secret_id
              version = "latest"
            }
          }
        }

        dynamic "env" {
          for_each = each.value.extra_env
          content {
            name  = env.key
            value = env.value
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
