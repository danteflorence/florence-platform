# CI/CD Plan

> **📜 Executed plan (bannered 2026-07-11).** .github/workflows/ci.yml and render.yaml exist; docs/runbooks/CI_CD.md is the live runbook. Read that, not this; this file is kept as the decision record.

Last reviewed: 2026-06-25

## Current State

The root repo has an npm-based CI contract:

- `ci:install`
- `typecheck`
- `test`
- `lint`
- `build`
- `security:secrets`
- `security:deps`
- `security:static`
- `security:ci:test`
- `ci`

GitHub Actions include:

- `ci.yml` with install, CI contract, typecheck, test, lint, build, secret scan, dependency scan, static analysis, CodeQL, and Terraform validation.
- `deploy.yml` (the `deploy-readiness` workflow) with Cloud Run image builds and Artifact Registry pushes for staging/sandbox, followed by a **Terraform plan only** (uploaded as an artifact). There is **no `terraform apply`, no auto-deploy, and no production job in CI** — an authorized operator reviews the plan and applies per `docs/runbooks/STAGING_DEPLOYMENT.md`. Migration Cloud Run jobs are created by Terraform and executed by the operator after apply.

Current root CI orchestrates app-local npm installs and scripts. The target plan is pnpm, but that is future work and must not be changed in this docs-only pass.

## Desired State

The consolidated platform should have one strict CI/CD contract:

- One package manager: pnpm.
- One Node runtime baseline: Node 24.
- Per-package typecheck, test, lint, build, and security gates.
- Security checks as merge blockers, not optional reports.
- Terraform format and validation for infrastructure changes.
- Cloud Run deploy through GitHub OIDC and Workload Identity Federation only.
- Staging deploys from `main`; production requires manual approval.
- No long-lived cloud keys, no committed secrets, no local env files.
- Docs-only changes use a lighter validation path but still run secret scan.

## Affected Files And Repos

- Root package manager files and CI scripts.
- `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`.
- Service `package.json` scripts.
- Dockerfiles.
- Terraform under `infra/`.
- Security scripts under `scripts/security`.
- Future `packages/*` and app directories.

## Migration Steps

1. Preserve current npm CI until pnpm workspace migration is ready.
2. Add pnpm in a dedicated branch after monorepo package boundaries are defined.
3. Convert install and filtered package commands with clean-runner checks.
4. Keep app-specific tests and smokes visible in root CI.
5. Add a docs-only path that still runs secret scan and changed-file verification.
6. Expand static gates:
   - No sensitive values in URLs.
   - No secrets in docs, examples, prompts, screenshots, or fixtures.
   - No public logging of sensitive field names or values.
   - Required audit tests for sensitive workflows.
   - Required tenant/consent tests for external sharing.
7. Require Terraform `fmt -check`, `init -backend=false`, and `validate` on infra changes.
8. Keep Cloud Run deployment image builds environment-specific for SPA build-time URLs.
9. Add rollback runbook using prior image tags and Terraform state.
10. Add release evidence capture: commit SHA, tests run, migrations run, deployed services, and residual risks.

## Risks

- Converting package managers can hide dependency drift if lockfiles are mishandled.
- A docs-only shortcut can accidentally skip secret scanning.
- Build-time SPA URLs require per-environment image builds; promoting the exact same image can break runtime hosts.
- Deploy workflows can fail if Terraform state, WIF, or service accounts are not bootstrapped.
- CI logs can leak secrets or sensitive values if commands print env.

## Tests Needed

- Clean install from a fresh checkout.
- Root typecheck, tests, lint, build, secret scan, dependency audit, static analysis, and CI workflow self-test.
- Per-service Docker builds.
- Terraform format and validate.
- Cloud Run migration job dry run or staging run.
- Security smokes for Core, Academy API, ATS/VMS, and Pathway.
- Changed-file check for docs-only PRs.

## Acceptance Criteria

- CI blocks merges that weaken auth, tenant scoping, consent, audit, document controls, AI gates, or secret handling.
- Production deploy requires a manual approval gate.
- No long-lived cloud keys are used in CI/CD.
- Every deployed image is traceable to a commit SHA and environment.
- Docs-only changes are verified without running unnecessary app suites.
