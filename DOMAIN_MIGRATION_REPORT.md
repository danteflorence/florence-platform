# Domain Migration Report

> **📜 Historical record (executed).** The migration is complete: the canonical public
> domain is `florenceedu.com` everywhere in code and docs. Kept as the record of what
> changed; the companion plan is archived at `docs/archive/2026-07/DOMAIN_MIGRATION_PLAN.md`.

Status: implementation pass for public domain and public brand migration.

## Summary

- Canonical public domain is now `florenceedu.com`.
- Production public hosts are standardized to `auth.florenceedu.com`, `app.florenceedu.com`, `api.florenceedu.com`, `partners.florenceedu.com`, and `developers.florenceedu.com`.
- Staging and sandbox hosts are standardized to `staging.app.florenceedu.com`, `staging-api.florenceedu.com`, and `sandbox-api.florenceedu.com`.
- Apply CTAs continue to use exactly `https://www.florenceedu.com/apply`.
- URL tracking remains limited to safe campaign keys and opaque IDs. No candidate PII is added to Apply or tracked-link query strings.

## Changed Areas

### Terraform and Deploy Defaults

- Updated `infra/envs/production.tfvars`, `infra/envs/staging.tfvars`, and `infra/envs/sandbox.tfvars` to use `florenceedu.com` and canonical public host mappings.
- Updated Terraform issuer injection in `infra/main.tf` so Cloud Run services receive `auth.florenceedu.com`, `staging-api.florenceedu.com`, or `sandbox-api.florenceedu.com` by environment.
- Updated `infra/variables.tf` descriptions and default database name to match the Florence Education target.
- Updated `infra/README.md`, `DEPLOY_PLATFORM.md`, `DEPLOY_TESTSERVER.md`, `.env.example`, and `.env.testserver.example` public examples.

### Docker and Local Routing

- Updated `docker-compose.yml` defaults for Core issuer, cookie domain, CORS origins, app URLs, ATS Connect base URL, link base URL, and Google OAuth redirect host shape.
- Updated `Caddyfile` to expose canonical public test hosts: `auth`, `app`, `api`, `developers`, and `partners`.
- Pathway and Workforce Economist remain local-only services until they are routed under the canonical Florence OS app surface.

### CORS, Cookies, OAuth, and OpenAPI

- Updated Core/Academy/ATS defaults and examples for cookie domains, redirect hosts, Core issuer URLs, and CORS allowlists.
- Updated Core gateway, ATS Connect, Academy API, and Pathway OpenAPI public server metadata to use `api.florenceedu.com` and `sandbox-api.florenceedu.com`.
- Updated Core login and developer portal public copy to Florence OS / Florence Education language.

### Public Product Copy and Partner Payloads

- Updated ATS Connect public onboarding, marketplace, claim, job-card, employer, operations, generated packet, outreach, proposal, and OpenAPI copy to Florence Education / Florence OS language.
- Updated Academy learner-facing tutor and internal sign-in labels away from the legacy FlorenceRN public name.
- Updated partner connector source/tag fields to use `Florence Education`.
- Updated partner onboarding docs and CSV/SFTP bridge docs.

### Apply CTA and PII-Safe URLs

- Verified server and web Apply base URLs use exactly `https://www.florenceedu.com/apply`.
- Strengthened `apps/academy-web/api/test/smoke.ts` to assert PII-like session material is hashed before it enters the Apply URL.
- Hardened `apps/academy-web/src/lib/applyCta.ts` so only pre-validated opaque `anon_...` session IDs are accepted from callers.
- Updated ATS PII URL smoke test destination to `https://app.florenceedu.com/jobs/abc`.

## Legacy/Internal References Left

These are not production-facing domain references and should be migrated in a later schema/resource rename:

- Type and schema names such as `FlorenceRNJob`.
- Vendored SDK filenames and comments such as `coreAuth.ts` and `florencern.ts`.
- Terraform stateful resource IDs and Artifact Registry repository names that still contain `florencern`; renaming these requires a state migration plan.
- Historical build reports, security evidence, AGENTS rules, and planning docs that mention FlorenceRN as past/current-state context.

## Verification Targets

- Legacy domain strings should not appear outside Git history. When written for audit notes, use `florencern[.]com`, `florenceeducation[.]com`, or `florence[.]academy` so automated production scans stay clean.
- Apply URL references should point to `https://www.florenceedu.com/apply`.
- URL tracking tests should prove only UTM keys plus opaque click/session identifiers are used.
- Secret scanning should pass across the repo.

## Verification Run

- Domain scan for legacy public domains: passed.
- Apply URL scan: only `https://www.florenceedu.com/apply` references found for Apply CTAs and fixtures.
- `pnpm run typecheck`: passed.
- `pnpm test`: passed after rerunning with local loopback permission for HTTP smoke tests.
- `pnpm run lint`: passed.
- `pnpm run build`: passed. Existing Vite warnings remain for CSS `@import` ordering and large chunks.
- `pnpm run prettier`: passed.
- `pnpm run security:secrets`: passed, 642 files checked.
- `pnpm run security:secrets:test`: passed.
- `terraform fmt -check -recursive`: not run because no `terraform` binary is installed in this runtime.
