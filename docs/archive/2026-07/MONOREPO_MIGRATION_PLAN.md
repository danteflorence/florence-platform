# Monorepo Migration Plan

Last reviewed: 2026-06-25

## Current State

`/Users/dantetolbedantert/florence-work` is the platform git root, but it is not yet a single fully managed pnpm workspace.

Current package and build shape:

- The root `package.json` runs npm-based CI orchestration through `scripts/ci/run-npm.mjs`.
- Each production app has its own `package.json` and `package-lock.json`.
- Docker builds use service-local contexts for Core, Academy, Academy API, ATS Connect, and Pathway.
- Previous shared-package work established the intended pattern: canonical shared source under `packages/*` plus generated in-app copies where Docker context isolation still requires it.
- The current checkout does not have a root `packages/` directory, so any future shared-package work must first verify branch and history state.
- `labor-economics-agent` is a separate git repo inside the workspace and intentionally outside the platform repo boundary.
- `extracted/*` contains uploaded bundles and is not production code.

## Desired State

The target monorepo should use pnpm as the default package manager, with TypeScript-first packages and clear app/service boundaries.

Target shape:

- `apps/academy-web`
- `apps/academy-api`
- `apps/ats-connect`
- `apps/pathway`
- `apps/core`
- `apps/developer-portal` if split from Core later
- `packages/core-auth`
- `packages/security`
- `packages/design-system`
- `packages/platform-api-client`
- `packages/types`
- `packages/testing`
- `packages/config`
- `infra/`
- `docs/`

The exact directory rename can be staged. It does not need to happen in the first implementation slice if Docker, CI, or active WIP would make that unsafe.

## Affected Files And Repos

- Root `package.json`, future `pnpm-workspace.yaml`, future `pnpm-lock.yaml`, and CI scripts.
- Service `package.json` files and lockfiles.
- Dockerfiles and GitHub Actions build contexts.
- Shared auth, crypto, redaction, scope, API client, UI, testing, and config helpers.
- `labor-economics-agent` as a separate repo to integrate through API or a later TypeScript port.
- `extracted/florenceos` and `extracted/care-capacity-index` as source material only.

## Migration Steps

1. Start from a clean branch or worktree based on `main`; do not use the dirty `feat/drip-campaign` checkout for structural changes.
2. Add `pnpm-workspace.yaml` and a root `packageManager` declaration.
3. Decide whether apps remain in-place for phase 1 or move under `apps/`. The safer first slice is in-place workspace enrollment, then later directory moves.
4. Add `packages/` with the smallest safe shared packages first:
   - `core-auth` for Core token verification helpers.
   - `types` for stable cross-service contracts.
   - `security` for redaction, safe audit metadata helpers, data-classification helpers, and no-PII URL guards.
   - `design-system` for tokens and reusable React primitives.
5. Keep generated in-app copies only where Docker context boundaries require them. Add a drift guard for every generated copy.
6. Update CI to use pnpm install and pnpm filtered commands while preserving clean-runner dependency checks.
7. Update Dockerfiles only after workspace installs are proven in local and CI builds.
8. Stage app directory moves after package sharing is stable.
9. Integrate `labor-economics-agent` through a contract first: API endpoint, exported data artifact, or TypeScript library port. Do not import the repo wholesale.
10. Triage `extracted/*` with an import register: keep, port, archive, or reject. Every imported slice must pass Florence security review.

## Risks

- Pnpm workspace hoisting can hide undeclared dependencies if service packages are not strict.
- Docker builds may fail if service contexts cannot see workspace packages.
- App directory moves can break Vite config, TypeScript references, env examples, Cloud Run build paths, and GitHub Actions.
- Blindly hoisting near-duplicate modules can create subtle security regressions.
- Importing extracted bundles can add unreviewed Python services, Supabase assumptions, or public data flows that conflict with Core.

## Tests Needed

- `pnpm install --frozen-lockfile` on a clean runner.
- Per-app `typecheck`, `test`, and `build`.
- Root lint for package scripts, env examples, generated-copy drift, and workspace boundaries.
- Docker build for every production service.
- Security gates: secret scan, dependency audit, static analysis, no-PII URL tests, tenant isolation, and Application Gate smokes.

## Acceptance Criteria

- The workspace can be installed from a clean clone with one package manager.
- No production service relies on undeclared dependencies.
- Shared packages are versioned and consumed consistently.
- Docker and Cloud Run builds continue to work.
- `labor-economics-agent` and `extracted/*` remain outside production until explicitly reviewed and staged.
- Security controls are not weakened to make the restructure pass.
