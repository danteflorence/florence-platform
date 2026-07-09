# Florence Education Platform Audit

Last reviewed: 2026-06-25

## Current State

The Florence workspace is a multi-repo platform in one working directory, with the production consolidation work centered in `/Users/dantetolbedantert/florence-work`.

Current production-relevant services:

- `florence-core`: identity, SSO, roles, scopes, consent, Nurse Passport, audit, Application Gate, Document Vault, Model Gateway, partner keys, webhooks, ledger, lender-facing modules, and the Platform API gateway.
- `florence-academy`: learner-facing React/Vite Academy app, live classroom server, and a separate `api` service for enrollment, progress, assessments, outreach, payments, audio, tutor, partner views, and learner records.
- `florence-ats-connect`: employer and operations app for ATS Connect, VMS Connect, demand intake, employer packets, Application Gate checks, document vault bridge, matching, program workspace, and partner connector seams.
- `florence-pathway-agent`: candidate and QA workflow app for visa, SEVIS/I-20, DS-160, NCLEX, licensure, endorsement, document and consular-payment workflows.
- `infra`: Terraform for Cloud Run, Cloud SQL, Artifact Registry, Secret Manager, KMS, GCS, IAM, and domain mappings.
- `.github/workflows`: root CI and Cloud Run deployment workflows.

Planning inputs outside the production monorepo boundary:

- `labor-economics-agent`: a separate Python/Streamlit workforce economics repo, currently gitignored from the platform repo. It supplies pricing, labor market intelligence, proposal, and outreach logic.
- `extracted/florenceos` and `extracted/care-capacity-index`: uploaded bundles with additional Florence concepts and UI/service patterns. These are audit inputs only.

The worktree is currently dirty on `feat/drip-campaign`, mostly under Academy. This planning pass must not mix those unrelated application changes into platform consolidation documentation.

## Desired State

The target is one production-grade Florence Education / Florence OS platform under `florenceedu.com`.

Core is the system of record. Product apps become role-specific surfaces over Core-owned identity, Passport, consent, audit, documents, ledger, Application Gate, and partner-scoped APIs. Academy, ATS/VMS, Pathway, workforce intelligence, and partner portals should share one identity, one design system, one deploy standard, one CI contract, and one security model.

The desired public framing is Florence Education and Florence OS. Existing FlorenceRN references remain valid only as current-state or legacy notes until a later code and copy migration.

## Affected Files And Repos

- Root docs and policy files in `florence-work`.
- `florence-core`, `florence-academy`, `florence-academy/api`, `florence-ats-connect`, and `florence-pathway-agent`.
- `infra`, `.github/workflows`, `docker-compose.yml`, `Caddyfile`, `render.yaml`, and env examples.
- `labor-economics-agent` as a separate repo to be integrated by contract, not by blind import.
- `extracted/*` as source material for future staged migrations.

## Migration Steps

1. Complete this documentation bundle without changing application code.
2. Freeze the platform target: Florence Education public language, Florence OS product architecture, `florenceedu.com` canonical domain, and Core as system of record.
3. Create a migration branch or clean worktree from `main` before code changes, because the current branch has unrelated Academy WIP.
4. Convert the repo to the agreed monorepo shape and shared package layout.
5. Standardize TypeScript/Node 24 for production services and isolate Python to approved offline analysis until migrated or wrapped.
6. Move domain, cookie, OAuth, CORS, and public copy references to `florenceedu.com`.
7. Consolidate design tokens and shared UI components.
8. Consolidate persistence into env-scoped Postgres schemas with Core-owned sensitive records.
9. Route all sensitive reads, writes, shares, exports, document views, packet views, and AI events through Core-owned controls or audited service contracts.
10. Refresh CI/CD so every migration phase is gated by typecheck, tests, build, lint, secret scan, dependency audit, static analysis, Terraform validation, and security-specific smokes.

## Risks

- A broad rename could weaken security controls if URLs, cookies, CORS, OAuth redirects, or partner scopes are changed without tests.
- A monorepo restructure could break Docker build contexts and app-specific lockfile assumptions.
- Python tools may contain useful business logic but do not currently meet the TypeScript production standard.
- Extracted bundles may contain patterns that conflict with the Florence security rules.
- Existing docs describe `florenceedu.com` and `florenceedu.com`; stale docs could confuse deploy operators during migration.
- Dirty worktree state can cause accidental staging of unrelated Academy changes.

## Tests Needed

- Root secret scan over all files.
- Workspace changed-file check confirming only intended docs changed for this pass.
- Future implementation phases must run root CI plus focused security smokes for affected services.
- Domain migration phases need `.lvh.me` local cookie tests and deployed staging checks on real hostnames.
- Persistence migration phases need data-minimization, tenant isolation, consent, audit-chain, idempotency, and fail-closed gate tests.

## Acceptance Criteria

- The ten root planning documents exist and are docs-only.
- No application code, config, lockfile, generated data, database file, Terraform, or test file is changed by this pass.
- The docs clearly identify current state, target state, affected repos, migration steps, risks, tests, and acceptance criteria.
- Every future high-risk change is explicitly labeled as future work.
- The plan preserves Florence security rules: synthetic data only, no secrets, tenant scope, purpose-specific consent, audit logging, signed URLs, human review for high-stakes actions, and fail-closed gates.
