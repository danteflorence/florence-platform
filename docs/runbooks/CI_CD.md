# CI/CD Runbook

## Baseline Gate

The root GitHub Actions workflow is `.github/workflows/ci.yml`. It runs on pull requests and pushes to `main`.

Required gates:

- install: root `npm ci` plus app-level `npm run ci:install`
- typecheck: `npm run typecheck`
- test: `npm test`
- lint: `npm run lint`
- formatting contract: `npm run prettier`
- build: `npm run build`
- secret scan: `npm run security:secrets`
- secret scanner regression: `npm run security:secrets:test`
- dependency scan: `npm run security:audit`
- static analysis: `npm run security:static` and CodeQL
- Docker build: all deployable service images
- migration dry-run: `npm run migration:dry-run` against disposable Postgres
- CI contract test: `npm run security:ci:test`
- infrastructure validation: Terraform format, init without backend, and validate

## Dependency Installation

CI installs dependencies on Ubuntu with Node 24. Native dependencies must be built or selected by npm on the Linux runner. Do not commit or reuse macOS `node_modules`.

Each install job requires a lockfile:

- `apps/core-api/package-lock.json`
- `apps/academy-web/package-lock.json`
- `apps/academy-web/api/package-lock.json`
- `apps/pathway-api/package-lock.json`
- `apps/employer-connect-api/package-lock.json`

Deployment readiness is covered by `.github/workflows/deploy.yml`. That workflow builds and pushes staging or sandbox images, runs Terraform plan, and uploads the reviewed plan artifact. It does not apply production.

## Artifact Policy

CI must not depend on committed build outputs. These paths are ignored and must stay out of source control:

- `node_modules/`
- `dist/`, `build/`, `.next/`, `out/`, `.vite/`, coverage output
- `.terraform/`, Terraform state, crash logs
- local databases, WAL/SHM files, generated media, logs, caches
- real `.env` files and secret exports

## Failure Policy

Do not bypass a failing security, tenant-scope, consent, audit, signed-URL, AI-review, or fail-closed workflow gate to make CI pass.

Temporary failures require a documented owner and fix path before merge.

| Suite | Current Status | Owner | Fix Path |
| --- | --- | --- | --- |
| Root CI gate | No accepted temporary failures as of 2026-06-25 | Platform | Keep `.github/workflows/ci.yml` and `scripts/security/check-ci-workflow.mjs` aligned. |

## Local Verification Notes

In this Codex runtime, the bundled Node.js does not include an `npm` binary, so a literal local `npm ci` clean install could not be executed here. The CI workflow remains configured to use `actions/setup-node` with npm on Ubuntu, and the repository has app lockfiles for the install targets above.

Local verification should still run through npm on a developer machine:

```sh
npm ci
npm run ci:install
npm run ci
```

If a local developer has no npm available, install Node.js 24 from the official distribution first, then retry from a fresh clone.
