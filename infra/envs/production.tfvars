# FlorenceRN — production environment. `terraform apply -var-file=envs/production.tfvars`.
# image tags are rewritten by CI to the built SHA before apply; placeholders here.
project_id = "florencern-prod" # OPERATOR: set to the real GCP project id
region     = "us-central1"
env        = "production"
domain     = "florencern.com"
sql_tier   = "db-custom-2-7680"

# The FULL user-facing platform. Non-secret per-service config is in extra_env; SECRETS
# (GOOGLE_CLIENT_ID/SECRET, DEMO_CLIENT_SECRET, ATS_CONNECT_VAULT_KEY, STRIPE_*, AGORA_*,
# ELEVENLABS_*, ANTHROPIC_API_KEY) are operator-set in Secret Manager and wired via secret_env
# once created — see docs/GCP_STRUCTURE.md. docker-compose.yml is the canonical full env list.
services = {
  # Core = identity/SSO (id.) + the Platform API gateway (api.) + dev/partner portals.
  core = {
    subdomains      = ["id", "api", "developers", "partners"]
    needs_sql       = true
    needs_field_enc = true
    min_instances   = 1
    max_instances   = 10
    public          = true
    health_path     = "/v1/health"
    extra_env = {
      PUBLIC_CORE_URL         = "https://id.florencern.com"
      TOKEN_ISS               = "florence-auth"
      TOKEN_AUD               = "florence"
      COOKIE_SECURE           = "1"
      FLORENCE_ALLOWED_DOMAIN = "florenceeducation.com"
      FLORENCE_REDIRECT_HOSTS = ".florencern.com"
      HUMAN_SESSION_TTL_SEC   = "3600"
      REFRESH_TTL_SEC         = "2592000"
      GOOGLE_REDIRECT_URI     = "https://id.florencern.com/auth/google/callback"
      DEMO_CLIENT_ID          = "florence-core-demo"
    }
  }
  # Academy SPA — the learner-facing app (static, served by Caddy on $PORT).
  "academy-web" = {
    subdomains    = ["academy"]
    needs_sql     = false
    min_instances = 1
    max_instances = 3
    public        = true
    health_path   = "/"
  }
  # Academy data API (learner signup/login, progress, assessments, payments).
  "academy-api" = {
    subdomains      = ["api.academy"]
    needs_sql       = true
    needs_field_enc = true
    min_instances   = 1
    max_instances   = 6
    public          = true
    health_path     = "/health"
    extra_env = {
      TOKEN_ISS            = "florence-auth"
      TOKEN_AUD            = "florence"
      API_JWT_ISSUER       = "florence-auth"
      API_JWT_AUDIENCE     = "florence"
      CORS_ALLOWED_ORIGINS = "https://academy.florencern.com,https://id.florencern.com"
      PUBLIC_APP_URL       = "https://academy.florencern.com"
    }
  }
  # Academy live classroom (Socket.IO; sticky sessions, single-instance for in-memory state).
  "academy-live" = {
    subdomains       = ["live.academy"]
    needs_sql        = false
    min_instances    = 1
    max_instances    = 1
    public           = true
    health_path      = "/health"
    session_affinity = true
  }
  # ATS Connect — employer/ops surfaces + the Demand/Opportunity/VMS Connect machinery.
  ats = {
    subdomains    = ["ats"]
    needs_sql     = true
    min_instances = 1
    max_instances = 6
    public        = true
    health_path   = "/api/health"
    extra_env = {
      TOKEN_ISS            = "florence-auth"
      TOKEN_AUD            = "florence"
      ATS_DB               = "postgres"
      ATS_CONNECT_BASE_URL = "https://ats.florencern.com"
    }
  }
  # NOTE: `pathway` is intentionally EXCLUDED from the Cloud Run wave-1 services until its
  # synchronous node:sqlite store is migrated to async Postgres (see docs/PATHWAY_CLOUD_RUN.md).
  # CI still builds the pathway image so it's ready to wire in once the refactor lands.
}
