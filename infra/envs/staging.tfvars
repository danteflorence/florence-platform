# Florence Education -- staging environment.
project_id = "florenceedu-staging" # OPERATOR: replace with the real staging GCP project id.
region     = "us-central1"
env        = "staging"
domain     = "florenceedu.com"
sql_tier   = "db-custom-1-3840"

services = {
  "core-api" = {
    subdomains       = ["staging-api", "staging-developers"]
    needs_sql        = true
    database_name    = "florence_core"
    migrate_command  = ["node", "db/migrate.mjs"]
    needs_field_enc  = true
    min_instances    = 1
    max_instances    = 4
    public           = true
    health_path      = "/health"
    session_affinity = false
    extra_env = {
      PUBLIC_CORE_URL         = "https://staging-api.florenceedu.com"
      TOKEN_ISS               = "florence-auth"
      TOKEN_AUD               = "florence"
      COOKIE_SECURE           = "1"
      FLORENCE_ALLOWED_DOMAIN = "florenceedu.com"
      FLORENCE_REDIRECT_HOSTS = ".florenceedu.com"
      GOOGLE_REDIRECT_URI     = "https://staging-api.florenceedu.com/auth/google/callback"
      DEMO_CLIENT_ID          = "florence-core-demo"
    }
  }

  "app-web" = {
    subdomains       = ["staging.app"]
    needs_sql        = false
    min_instances    = 0
    max_instances    = 3
    public           = true
    health_path      = "/"
    session_affinity = false
    extra_env        = {}
  }

  "academy-api" = {
    subdomains       = ["staging-academy-api"]
    needs_sql        = true
    database_name    = "florence_academy"
    migrate_command  = ["node", "db/migrate.mjs"]
    needs_field_enc  = true
    min_instances    = 0
    max_instances    = 3
    public           = true
    health_path      = "/health"
    session_affinity = false
    extra_env = {
      TOKEN_ISS            = "florence-auth"
      TOKEN_AUD            = "florence"
      API_JWT_ISSUER       = "florence-auth"
      API_JWT_AUDIENCE     = "florence"
      CORS_ALLOWED_ORIGINS = "https://staging.app.florenceedu.com,https://staging-api.florenceedu.com"
      PUBLIC_APP_URL       = "https://staging.app.florenceedu.com"
    }
  }

  "academy-live" = {
    subdomains       = ["staging-live"]
    needs_sql        = false
    min_instances    = 0
    max_instances    = 1
    public           = true
    health_path      = "/health"
    session_affinity = true
    extra_env        = {}
  }

  "pathway-api" = {
    subdomains       = ["staging-pathway-api"]
    needs_sql        = true
    database_name    = "florence_pathway"
    migrate_command  = ["node", "db/migrate.mjs"]
    min_instances    = 0
    max_instances    = 3
    public           = true
    health_path      = "/api/health"
    session_affinity = false
    extra_env = {
      CORE_ISSUER_URL = "https://staging-api.florenceedu.com"
      PATHWAY_DB      = "postgres"
      TOKEN_ISS       = "florence-auth"
      TOKEN_AUD       = "florence"
    }
  }

  "employer-connect-api" = {
    subdomains       = ["staging-partners"]
    needs_sql        = true
    database_name    = "florence_employer"
    migrate_command  = ["node", "--import", "tsx", "scripts/migrate.ts"]
    min_instances    = 0
    max_instances    = 3
    public           = true
    health_path      = "/api/health"
    session_affinity = false
    extra_env = {
      ATS_CONNECT_BASE_URL = "https://staging-partners.florenceedu.com"
      ATS_DB               = "postgres"
      PRICING_API_URL      = "https://staging-economist-api.florenceedu.com"
      TOKEN_ISS            = "florence-auth"
      TOKEN_AUD            = "florence"
    }
  }

  "economist-api" = {
    subdomains       = ["staging-economist-api"]
    needs_sql        = false
    min_instances    = 0
    max_instances    = 2
    public           = true
    health_path      = "/health"
    session_affinity = false
    extra_env = {
      ECONOMIST_CORE_EVENTS_REQUIRED = "0"
      FLORENCE_CORE_URL              = "https://staging-api.florenceedu.com"
    }
  }
}
