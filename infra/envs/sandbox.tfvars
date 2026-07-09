# Florence Education -- sandbox environment for partner testing with fake data only.
project_id = "florenceedu-sandbox" # OPERATOR: replace with the real sandbox GCP project id.
region     = "us-central1"
env        = "sandbox"
domain     = "florenceedu.com"
sql_tier   = "db-custom-1-3840"

services = {
  "core-api" = {
    subdomains       = ["sandbox-api", "sandbox-developers"]
    needs_sql        = true
    database_name    = "florence_core"
    migrate_command  = ["node", "db/migrate.mjs"]
    needs_field_enc  = true
    min_instances    = 1
    max_instances    = 3
    public           = true
    health_path      = "/health"
    session_affinity = false
    extra_env = {
      PUBLIC_CORE_URL         = "https://sandbox-api.florenceedu.com"
      TOKEN_ISS               = "florence-auth"
      TOKEN_AUD               = "florence"
      COOKIE_SECURE           = "1"
      FLORENCE_ALLOWED_DOMAIN = "florenceedu.com"
      FLORENCE_REDIRECT_HOSTS = ".florenceedu.com"
      GOOGLE_REDIRECT_URI     = "https://sandbox-api.florenceedu.com/auth/google/callback"
      DEMO_CLIENT_ID          = "florence-core-demo"
    }
  }

  "app-web" = {
    subdomains       = ["sandbox.app"]
    needs_sql        = false
    min_instances    = 0
    max_instances    = 2
    public           = true
    health_path      = "/"
    session_affinity = false
    extra_env        = {}
  }

  "academy-api" = {
    subdomains       = ["sandbox-academy-api"]
    needs_sql        = true
    database_name    = "florence_academy"
    migrate_command  = ["node", "db/migrate.mjs"]
    needs_field_enc  = true
    min_instances    = 0
    max_instances    = 2
    public           = true
    health_path      = "/health"
    session_affinity = false
    extra_env = {
      TOKEN_ISS            = "florence-auth"
      TOKEN_AUD            = "florence"
      API_JWT_ISSUER       = "florence-auth"
      API_JWT_AUDIENCE     = "florence"
      CORS_ALLOWED_ORIGINS = "https://sandbox.app.florenceedu.com,https://sandbox-api.florenceedu.com"
      PUBLIC_APP_URL       = "https://sandbox.app.florenceedu.com"
    }
  }

  "academy-live" = {
    subdomains       = ["sandbox-live"]
    needs_sql        = false
    min_instances    = 0
    max_instances    = 1
    public           = true
    health_path      = "/health"
    session_affinity = true
    extra_env        = {}
  }

  "pathway-api" = {
    subdomains       = ["sandbox-pathway-api"]
    needs_sql        = true
    database_name    = "florence_pathway"
    migrate_command  = ["node", "db/migrate.mjs"]
    min_instances    = 0
    max_instances    = 2
    public           = true
    health_path      = "/api/health"
    session_affinity = false
    extra_env = {
      CORE_ISSUER_URL = "https://sandbox-api.florenceedu.com"
      PATHWAY_DB      = "postgres"
      TOKEN_ISS       = "florence-auth"
      TOKEN_AUD       = "florence"
    }
  }

  "employer-connect-api" = {
    subdomains       = ["sandbox-partners"]
    needs_sql        = true
    database_name    = "florence_employer"
    migrate_command  = ["node", "--import", "tsx", "scripts/migrate.ts"]
    min_instances    = 0
    max_instances    = 2
    public           = true
    health_path      = "/api/health"
    session_affinity = false
    extra_env = {
      ATS_CONNECT_BASE_URL = "https://sandbox-partners.florenceedu.com"
      ATS_DB               = "postgres"
      PRICING_API_URL      = "https://sandbox-economist-api.florenceedu.com"
      TOKEN_ISS            = "florence-auth"
      TOKEN_AUD            = "florence"
    }
  }

  "economist-api" = {
    subdomains       = ["sandbox-economist-api"]
    needs_sql        = false
    min_instances    = 0
    max_instances    = 1
    public           = true
    health_path      = "/health"
    session_affinity = false
    extra_env = {
      ECONOMIST_CORE_EVENTS_REQUIRED = "0"
      FLORENCE_CORE_URL              = "https://sandbox-api.florenceedu.com"
    }
  }
}
