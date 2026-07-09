output "service_urls" {
  description = "Cloud Run URL per service."
  value       = { for k, s in google_cloud_run_v2_service.svc : k => s.uri }
}

output "cloudsql_connection_name" {
  description = "Cloud SQL instance connection name (PROJECT:REGION:INSTANCE)."
  value       = google_sql_database_instance.pg.connection_name
}

output "documents_bucket" {
  description = "GCS document-vault bucket protected by CMEK."
  value       = google_storage_bucket.documents.name
}

output "kms_crypto_key" {
  description = "CMEK key protecting the document vault."
  value       = google_kms_crypto_key.docs.id
}

output "artifact_registry_repo" {
  description = "Artifact Registry Docker repository."
  value       = local.repo_url
}

output "runtime_service_accounts" {
  description = "Per-service runtime service account emails."
  value       = { for k, sa in google_service_account.runtime : k => sa.email }
}

output "database_url_secrets" {
  description = "Per-service Secret Manager DATABASE_URL secret ids."
  value       = { for k, s in google_secret_manager_secret.database_url : k => s.secret_id }
}

output "migrate_jobs" {
  description = "Cloud Run migration job names to execute before serving a deployed image."
  value       = { for k, j in google_cloud_run_v2_job.migrate : k => j.name }
}

output "domain_mapping_records" {
  description = "DNS records to create per mapped florenceedu.com host."
  value       = { for host, m in google_cloud_run_domain_mapping.map : host => m.status[0].resource_records }
}
