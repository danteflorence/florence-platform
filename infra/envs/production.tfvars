# FlorenceRN — production environment. `terraform apply -var-file=envs/production.tfvars`.
# image tags are rewritten by CI to the built SHA before apply; placeholders here.
project_id = "florencern-prod"   # OPERATOR: set to the real GCP project id
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
  }
  ats = {
    subdomains    = ["ats"]
    needs_sql     = true
    min_instances = 1
    max_instances = 6
    public        = true
  }
  pathway = {
    subdomains    = ["pathway"]
    needs_sql     = true # requires the Postgres store option (see DEP3 / pathway store seam)
    min_instances = 1
    max_instances = 4
    public        = true
  }
  academy-api = {
    subdomains    = ["api.academy"]
    needs_sql     = true
    min_instances = 1
    max_instances = 6
    public        = true
  }
}
