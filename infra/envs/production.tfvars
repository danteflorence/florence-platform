# FlorenceRN — production environment. `terraform apply -var-file=envs/production.tfvars`.
# image tags are rewritten by CI to the built SHA before apply; placeholders here.
project_id = "florencern-prod" # OPERATOR: set to the real GCP project id
region     = "us-central1"
env        = "production"
domain     = "florencern.com"
sql_tier   = "db-custom-2-7680"

services = {
  # Core = identity (id.) + the Platform API gateway (api.) + dev/partner portals.
  core = {
    subdomains    = ["id", "api", "developers", "partners"]
    needs_sql     = true
    min_instances = 1
    max_instances = 10
    public        = true
    health_path   = "/v1/health"
  }
  ats = {
    subdomains    = ["ats"]
    needs_sql     = true
    min_instances = 1
    max_instances = 6
    public        = true
    health_path   = "/api/health"
  }
  "academy-api" = {
    subdomains    = ["api.academy"]
    needs_sql     = true
    min_instances = 1
    max_instances = 6
    public        = true
    health_path   = "/health"
  }
  # NOTE: `pathway` is intentionally EXCLUDED from the Cloud Run wave-1 services until its
  # synchronous node:sqlite store is migrated to async Postgres (see docs/PATHWAY_CLOUD_RUN.md).
  # CI still builds the pathway image so it's ready to wire in once the refactor lands.
}
