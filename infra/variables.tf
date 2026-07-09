# Florence Education Platform -- GCP Cloud Run infrastructure variables.
# Operator-owned values include the GCP project, billing, DNS, GitHub environment
# secrets, and real Secret Manager secret values.

variable "project_id" {
  type        = string
  description = "GCP project id for this environment. Separate projects per environment are recommended."
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "env" {
  type        = string
  description = "Environment name: staging | sandbox | production."
  validation {
    condition     = contains(["staging", "sandbox", "production"], var.env)
    error_message = "env must be staging, sandbox, or production."
  }
}

variable "domain" {
  type        = string
  default     = "florenceedu.com"
  description = "Canonical Florence Education apex domain."
}

variable "image_tag" {
  type        = string
  default     = "latest"
  description = "Container image tag deployed by CI, normally the commit SHA."
}

variable "services" {
  type = map(object({
    subdomains       = list(string)
    needs_sql        = bool
    min_instances    = number
    max_instances    = number
    public           = bool
    database_name    = optional(string)
    health_path      = optional(string, "/health")
    migrate_command  = optional(list(string), [])
    needs_field_enc  = optional(bool, false)
    session_affinity = optional(bool, false)
    extra_env        = optional(map(string), {})
    secret_env       = optional(list(object({ name = string, secret = string })), [])
  }))
}

variable "sql_tier" {
  type    = string
  default = "db-custom-1-3840"
}

variable "deployer_sa_email" {
  type        = string
  default     = ""
  description = "CI deployer service account email. Used only when manage_deployer_iam is true."
}

variable "manage_deployer_iam" {
  type        = bool
  default     = false
  description = "Grant CI deployer roles from Terraform after bootstrap roles are already in place."
}
