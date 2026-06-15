# FlorenceRN Platform — GCP Cloud Run infrastructure (variables).
# One config per environment (local/staging/sandbox/production) via -var-file=envs/<env>.tfvars.
# OPERATOR-OWNED: the GCP project, billing, DNS for florencern.com, and the real secret
# values are provisioned by the operator; this only declares the shape.

variable "project_id" {
  type        = string
  description = "GCP project id for this environment (separate project per env recommended)."
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
  default     = "florencern.com"
  description = "Apex domain. Subdomains: id. / api. / sandbox-api. / partners. / developers."
}

# The image tag CI deploys (the commit SHA); the full image ref is built by convention
# <region>-docker.pkg.dev/<project>/florencern/<service-key>:<image_tag>.
variable "image_tag" {
  type    = string
  default = "latest"
}

# Each platform service that runs on Cloud Run.
variable "services" {
  type = map(object({
    subdomains    = list(string) # e.g. ["id","api","developers","partners"] for core
    needs_sql     = bool          # mounts the Cloud SQL connection + DATABASE_URL
    min_instances = number
    max_instances = number
    public        = bool          # allow unauthenticated (the API gateway authenticates itself)
  }))
}

variable "sql_tier" {
  type    = string
  default = "db-custom-1-3840"
}

variable "db_name" {
  type    = string
  default = "florencern"
}
