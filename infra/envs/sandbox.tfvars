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
    subdomains      = ["sandbox-id", "sandbox-api", "sandbox-developers", "sandbox-partners"]
    needs_sql       = true
    needs_field_enc = true
    min_instances   = 1
    max_instances   = 3
    public          = true
    health_path     = "/v1/health"
    extra_env = {
      PUBLIC_CORE_URL         = "https://sandbox-id.florencern.com"
      TOKEN_ISS               = "florence-auth"
      TOKEN_AUD               = "florence"
      COOKIE_SECURE           = "1"
      FLORENCE_ALLOWED_DOMAIN = "florenceeducation.com"
      FLORENCE_REDIRECT_HOSTS = ".florencern.com"
      GOOGLE_REDIRECT_URI     = "https://sandbox-id.florencern.com/auth/google/callback"
      DEMO_CLIENT_ID          = "florence-core-demo"
    }
  }
  "academy-web" = {
    subdomains    = ["sandbox-academy"]
    needs_sql     = false
    min_instances = 0
    max_instances = 2
    public        = true
    health_path   = "/"
  }
  "academy-api" = {
    subdomains      = ["sandbox-api.academy"]
    needs_sql       = true
    needs_field_enc = true
    min_instances   = 0
    max_instances   = 2
    public          = true
    health_path     = "/health"
    extra_env = {
      TOKEN_ISS            = "florence-auth"
      TOKEN_AUD            = "florence"
      API_JWT_ISSUER       = "florence-auth"
      API_JWT_AUDIENCE     = "florence"
      CORS_ALLOWED_ORIGINS = "https://sandbox-academy.florencern.com,https://sandbox-id.florencern.com"
      PUBLIC_APP_URL       = "https://sandbox-academy.florencern.com"
    }
  }
  "academy-live" = {
    subdomains       = ["sandbox-live.academy"]
    needs_sql        = false
    min_instances    = 0
    max_instances    = 1
    public           = true
    health_path      = "/health"
    session_affinity = true
  }
  ats = {
    subdomains    = ["sandbox-ats"]
    needs_sql     = true
    min_instances = 0
    max_instances = 2
    public        = true
    health_path   = "/api/health"
    extra_env = {
      TOKEN_ISS            = "florence-auth"
      TOKEN_AUD            = "florence"
      ATS_DB               = "postgres"
      ATS_CONNECT_BASE_URL = "https://sandbox-ats.florencern.com"
    }
  }
}
