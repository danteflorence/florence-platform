# FlorenceRN — staging environment. `terraform apply -var-file=envs/staging.tfvars`.
# Separate GCP project from production (hard isolation). Smaller SQL tier; scale-to-zero
# on non-issuer services for cost. Image tags are rewritten by CI to the built SHA.
project_id = "florencern-staging" # OPERATOR: set to the real GCP project id
region     = "us-central1"
env        = "staging"
domain     = "florencern.com"
sql_tier   = "db-custom-1-3840"

services = {
  core = {
    subdomains    = ["id-staging", "api-staging", "developers-staging", "partners-staging"]
    needs_sql     = true
    min_instances = 1 # the issuer (JWKS) stays warm so auth has no cold-start
    max_instances = 4
    public        = true
    health_path   = "/v1/health"
  }
  ats = {
    subdomains    = ["ats-staging"]
    needs_sql     = true
    min_instances = 0
    max_instances = 3
    public        = true
    health_path   = "/api/health"
  }
  "academy-api" = {
    subdomains    = ["api-staging.academy"]
    needs_sql     = true
    min_instances = 0
    max_instances = 3
    public        = true
    health_path   = "/health"
  }
}
