# Domain Migration Plan

Last reviewed: 2026-06-25

## Current State

The repo currently contains multiple public domain families:

- `florenceedu.com`: newer Cloud Run and production-readiness docs.
- `florenceedu.com`: older Render, env, staff login, and deployment references.
- `florenceedu.com`: Academy public CTA and outreach references.

These references appear in docs, env examples, Terraform variables, Cloud Run workflow comments and host values, Docker build args, Caddy and compose config, Core config, OAuth redirect guidance, CORS allowlists, tests, SDK strings, UI copy, and public outreach copy.

The current local SSO proof relies on matching subdomains, especially `.lvh.me`, because browser cookie domain behavior must match real hostnames.

## Desired State

`florenceedu.com` is the canonical public domain for Florence Education / Florence OS.

Target production hosts:

- `auth.florenceedu.com`: Core identity and staff sign-in.
- `api.florenceedu.com`: Core Platform API gateway.
- `developers.florenceedu.com`: developer portal and OpenAPI docs.
- `partners.florenceedu.com`: partner onboarding and partner API entrypoint.
- `app.florenceedu.com`: Academy learner app.
- `api.florenceedu.com`: Academy API until fully folded behind Core.
- `app.florenceedu.com`: Academy live classroom.
- `partners.florenceedu.com`: ATS/VMS Connect employer and ops app.
- `app.florenceedu.com`: Pathway app after stateful persistence migration.

Legacy `florenceedu.com` and `florenceedu.com` references should be migrated deliberately with redirects, operator notes, and tests. Public copy should use Florence Education / Florence OS language, not FlorenceRN, except in historical notes.

## Affected Files And Repos

- Root docs, env examples, `docker-compose.yml`, `Caddyfile`, `render.yaml`, and `DEPLOY_*` docs.
- `.github/workflows/deploy.yml`.
- `infra/envs/*.tfvars`, Terraform variables, and outputs.
- Core config, redirect-host validation, cookie domain settings, OAuth guidance, and email-domain assumptions.
- Academy web/API copy, CTA URLs, outreach copy, tests, and env examples.
- ATS Connect UI, SDK, docs, tracking links, and connector docs.
- Pathway docs, env examples, and Vite build args.

## Migration Steps

1. Create a domain reference inventory with file, line, value, owner, and migration class.
2. Split references into:
   - Runtime host config.
   - Cookie and auth issuer config.
   - OAuth redirect config.
   - CORS allowlists.
   - Public copy and docs.
   - Tests and fixtures.
   - Historical notes.
3. Update infrastructure and environment examples first for staging on `staging.florenceedu.com` or equivalent prefixed hosts.
4. Update Core issuer, cookie domain, redirect host suffixes, JWKS URLs, and CORS allowlists.
5. Update SPA build-time environment values for Academy, ATS, and Pathway.
6. Update public copy and CTA URLs after runtime routes are ready.
7. Add redirects from old hostnames to new hostnames where safe. Do not redirect API requests without versioned compatibility review.
8. Validate cookies on real local subdomains and deployed staging hostnames.
9. Keep `florenceedu.com` for Google Workspace or internal staff email only if business operations require it; do not use it as the public app domain.

## Risks

- Cookie and issuer mismatches can silently break SSO.
- OAuth redirect URIs must be updated in provider consoles as well as repo config.
- CORS updates can either break clients or accidentally widen access.
- API redirects can break partner integrations or leak sensitive query data if implemented carelessly.
- Stale docs can cause operators to set secrets or DNS for the wrong domain.

## Tests Needed

- Local `.lvh.me` SSO cookie test across Core, Academy, ATS, and Pathway.
- Staging SSO test on real `florenceedu.com` subdomains.
- JWKS issuer and audience tests.
- CORS allowlist tests for allowed and blocked origins.
- OAuth callback test after provider-console updates.
- No sensitive identifiers in URL paths, query strings, UTM parameters, redirects, or referrers.
- Secret scan and docs scan after copy migration.

## Acceptance Criteria

- `florenceedu.com` is the only public production domain in active runtime config and public copy.
- Legacy domains are documented as redirects, aliases, historical notes, or internal email domains.
- SSO works across subdomains with the correct cookie domain.
- CORS and OAuth are narrow and environment-specific.
- No sensitive data is moved into URLs during the migration.
