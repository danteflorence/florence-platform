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
    subdomains      = ["id-staging", "api-staging", "developers-staging", "partners-staging"]
    needs_sql       = true
    needs_field_enc = true
    min_instances   = 1 # the issuer (JWKS) stays warm so auth has no cold-start
    max_instances   = 4
    public          = true
    health_path     = "/v1/health"
    extra_env = {
      PUBLIC_CORE_URL         = "https://id-staging.florencern.com"
      TOKEN_ISS               = "florence-auth"
      TOKEN_AUD               = "florence"
      COOKIE_SECURE           = "1"
      FLORENCE_ALLOWED_DOMAIN = "florenceeducation.com"
      FLORENCE_REDIRECT_HOSTS = ".florencern.com"
      GOOGLE_REDIRECT_URI     = "https://id-staging.florencern.com/auth/google/callback"
      DEMO_CLIENT_ID          = "florence-core-demo"
    }
  }
  "academy-web" = {
    subdomains    = ["academy-staging"]
    needs_sql     = false
    min_instances = 0
    max_instances = 2
    public        = true
    health_path   = "/"
  }
  "academy-api" = {
    subdomains      = ["api-staging.academy"]
    needs_sql       = true
    needs_field_enc = true
    min_instances   = 0
    max_instances   = 3
    public          = true
    health_path     = "/health"
    extra_env = {
      TOKEN_ISS            = "florence-auth"
      TOKEN_AUD            = "florence"
      API_JWT_ISSUER       = "florence-auth"
      API_JWT_AUDIENCE     = "florence"
      CORS_ALLOWED_ORIGINS = "https://academy-staging.florencern.com,https://id-staging.florencern.com"
      PUBLIC_APP_URL       = "https://academy-staging.florencern.com"
    }
  }
  "academy-live" = {
    subdomains       = ["live-staging.academy"]
    needs_sql        = false
    min_instances    = 0
    max_instances    = 1
    public           = true
    health_path      = "/health"
    session_affinity = true
  }
  ats = {
    subdomains    = ["ats-staging"]
    needs_sql     = true
    min_instances = 0
    max_instances = 3
    public        = true
    health_path   = "/api/health"
    extra_env = {
      TOKEN_ISS            = "florence-auth"
      TOKEN_AUD            = "florence"
      ATS_DB               = "postgres"
      ATS_CONNECT_BASE_URL = "https://ats-staging.florencern.com"
    }
  }
}
