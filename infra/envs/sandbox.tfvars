# FlorenceRN — sandbox environment. `terraform apply -var-file=envs/sandbox.tfvars`.
# Separate GCP project; seeded with FAKE data for partner integration testing (no real
# nurse/lender data, so no counsel gate). Partners point at sandbox-api.florencern.com.
project_id = "florencern-sandbox" # OPERATOR: set to the real GCP project id
region     = "us-central1"
env        = "sandbox"
domain     = "florencern.com"
sql_tier   = "db-custom-1-3840"

services = {
  core = {
    subdomains    = ["sandbox-id", "sandbox-api", "sandbox-developers", "sandbox-partners"]
    needs_sql     = true
    min_instances = 1
    max_instances = 3
    public        = true
    health_path   = "/v1/health"
  }
  ats = {
    subdomains    = ["sandbox-ats"]
    needs_sql     = true
    min_instances = 0
    max_instances = 2
    public        = true
    health_path   = "/api/health"
  }
  "academy-api" = {
    subdomains    = ["sandbox-api.academy"]
    needs_sql     = true
    min_instances = 0
    max_instances = 2
    public        = true
    health_path   = "/health"
  }
}
