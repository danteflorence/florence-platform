# Florence Education -- production environment.
# This repo phase documents and plans production; the deployment workflow does not apply it.
project_id = "florenceedu-prod" # OPERATOR: replace with the real production GCP project id.
region     = "us-central1"
env        = "production"
domain     = "florenceedu.com"
sql_tier   = "db-custom-2-7680"

services = {
  "core-api" = {
    subdomains       = ["auth", "api", "developers"]
    needs_sql        = true
    database_name    = "florence_core"
    migrate_command  = ["node", "db/migrate.mjs"]
    needs_field_enc  = true
    min_instances    = 1
    max_instances    = 10
    public           = true
    health_path      = "/health"
    session_affinity = false
    extra_env = {
      PUBLIC_CORE_URL         = "https://auth.florenceedu.com"
      TOKEN_ISS               = "florence-auth"
      TOKEN_AUD               = "florence"
      COOKIE_SECURE           = "1"
      FLORENCE_ALLOWED_DOMAIN = "florenceedu.com"
      FLORENCE_REDIRECT_HOSTS = ".florenceedu.com"
      HUMAN_SESSION_TTL_SEC   = "3600"
      REFRESH_TTL_SEC         = "2592000"
      GOOGLE_REDIRECT_URI     = "https://auth.florenceedu.com/auth/google/callback"
      DEMO_CLIENT_ID          = "florence-core-demo"
    }
  }

  "app-web" = {
    subdomains       = ["app"]
    needs_sql        = false
    min_instances    = 1
    max_instances    = 4
    public           = true
    health_path      = "/"
    session_affinity = false
    extra_env        = {}
  }

  "academy-api" = {
    subdomains       = ["academy-api"]
    needs_sql        = true
    database_name    = "florence_academy"
    migrate_command  = ["node", "db/migrate.mjs"]
    needs_field_enc  = true
    min_instances    = 1
    max_instances    = 6
    public           = true
    health_path      = "/health"
    session_affinity = false
    extra_env = {
      TOKEN_ISS            = "florence-auth"
      TOKEN_AUD            = "florence"
      API_JWT_ISSUER       = "florence-auth"
      API_JWT_AUDIENCE     = "florence"
      CORS_ALLOWED_ORIGINS = "https://app.florenceedu.com,https://auth.florenceedu.com"
      PUBLIC_APP_URL       = "https://app.florenceedu.com"
    }
  }

  "academy-live" = {
    subdomains       = ["live"]
    needs_sql        = false
    min_instances    = 1
    max_instances    = 1
    public           = true
    health_path      = "/health"
    session_affinity = true
    extra_env        = {}
  }

  "pathway-api" = {
    subdomains       = ["pathway-api"]
    needs_sql        = true
    database_name    = "florence_pathway"
    migrate_command  = ["node", "db/migrate.mjs"]
    min_instances    = 1
    max_instances    = 4
    public           = true
    health_path      = "/api/health"
    session_affinity = false
    extra_env = {
      CORE_ISSUER_URL = "https://auth.florenceedu.com"
      PATHWAY_DB      = "postgres"
      TOKEN_ISS       = "florence-auth"
      TOKEN_AUD       = "florence"
    }
  }

  "employer-connect-api" = {
    subdomains       = ["partners"]
    needs_sql        = true
    database_name    = "florence_employer"
    migrate_command  = ["node", "--import", "tsx", "scripts/migrate.ts"]
    min_instances    = 1
    max_instances    = 6
    public           = true
    health_path      = "/api/health"
    session_affinity = false
    extra_env = {
      ATS_CONNECT_BASE_URL = "https://partners.florenceedu.com"
      ATS_DB               = "postgres"
      PRICING_API_URL      = "https://economist-api.florenceedu.com"
      TOKEN_ISS            = "florence-auth"
      TOKEN_AUD            = "florence"
    }
  }

  "economist-api" = {
    subdomains       = ["economist-api"]
    needs_sql        = false
    min_instances    = 1
    max_instances    = 3
    public           = true
    health_path      = "/health"
    session_affinity = false
    extra_env = {
      ECONOMIST_CORE_EVENTS_REQUIRED = "1"
      FLORENCE_CORE_URL              = "https://auth.florenceedu.com"
    }
  }
}
