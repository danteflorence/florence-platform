# FlorenceRN Platform — post-apply outputs the operator needs (service URLs, the Cloud
# SQL connection name, the document bucket, the KMS key, the DNS records to create, and
# the per-service runtime SA emails). `terraform output -json` after apply.

output "service_urls" {
  description = "Cloud Run URL per service."
  value       = { for k, s in google_cloud_run_v2_service.svc : k => s.uri }
}

output "cloudsql_connection_name" {
  description = "Cloud SQL instance connection name (PROJECT:REGION:INSTANCE)."
  value       = google_sql_database_instance.pg.connection_name
}

output "documents_bucket" {
  description = "GCS document-vault bucket (CMEK)."
  value       = google_storage_bucket.documents.name
}

output "kms_crypto_key" {
  description = "CMEK key protecting the document vault."
  value       = google_kms_crypto_key.docs.id
}

output "artifact_registry_repo" {
  description = "Docker repo images are pushed to."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.florencern.repository_id}"
}

output "runtime_service_accounts" {
  description = "Per-service runtime SA emails (the IAM principals)."
  value       = { for k, sa in google_service_account.runtime : k => sa.email }
}

output "migrate_jobs" {
  description = "Cloud Run Jobs to execute (once per deploy) before serving: gcloud run jobs execute <name> --region <region> --wait."
  value       = { for k, j in google_cloud_run_v2_job.migrate : k => j.name }
}

# The CNAME/A records the operator must create at the registrar/Cloud DNS for each mapped
# host. Google-managed TLS provisions automatically once these resolve.
output "domain_mapping_records" {
  description = "DNS records to create per mapped host (from Cloud Run domain mappings)."
  value       = { for host, m in google_cloud_run_domain_mapping.map : host => m.status[0].resource_records }
}
