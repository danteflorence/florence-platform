# Execution Sequence

> **⚠️ Partially executed (status as of 2026-07-10).** Phase 2 (monorepo `apps/`+`packages/`
> layout) and Phase 4 (domain migration to `florenceedu.com`) have **landed** — the code wins
> over any "future work" framing below. "ATS Connect" is now `apps/employer-connect-api`.
> For live status use `OPEN_ISSUES.md` + `PLATFORM_READINESS_REPORT.md`; the per-phase
> acceptance gates and test lists below remain the reusable part.

Last reviewed: 2026-06-25

## Current State

The platform already has substantial production-grade controls, but the consolidation work spans architecture, branding, data ownership, runtime standardization, domain migration, design system, persistence, Core contracts, and CI/CD.

The current branch has unrelated Academy WIP. Structural implementation should happen on a clean branch or worktree from `main`, not directly on the dirty checkout.

## Desired State

Execute the consolidation in small, reversible phases. Each phase must preserve Florence security rules, produce a verifiable result, and stop before risky broad rewrites.

The sequence below is future implementation work. This documentation pass does not change runtime behavior.

## Affected Files And Repos

Potential future phases may affect every production app, shared package, infra, CI, and docs path. Each phase must name its exact scope before implementation.

## Migration Steps

### Phase 0: Baseline And Branch Hygiene

- Create a clean branch or worktree from `main`.
- Confirm remote and branch state.
- Record current CI status and known unrelated WIP.
- Acceptance gate: no unrelated files staged.

### Phase 1: Documentation And Decision Lock

- Land the ten planning docs.
- Confirm Florence Education / Florence OS public language and `florenceedu.com` target.
- Acceptance gate: docs-only diff, secret scan passes.

### Phase 2: Monorepo And Package Foundation

- Add pnpm workspace in a dedicated branch.
- Add or restore `packages/*` for shared auth, security, types, config, testing, and design tokens.
- Preserve Docker build boundaries until workspace builds are proven.
- Acceptance gate: clean install, typecheck, tests, build, Docker builds, secret scan.

### Phase 3: Security Helper Consolidation

- Add shared safe audit metadata, redaction, no-PII URL, and fixture-safety helpers.
- Replace free-text audit details in the highest-risk workflows first.
- Acceptance gate: no sensitive values in logs, URLs, audit metadata, prompts, or fixtures.

### Phase 4: Domain Migration To `florenceedu.com`

- Inventory and migrate runtime config, env examples, OAuth redirect guidance, cookie domains, CORS allowlists, public copy, and docs.
- Validate local subdomain cookies and staging hosts.
- Acceptance gate: SSO works across Core, Academy, ATS, and Pathway on real hostnames.

### Phase 5: Design System Package

- Create token and component package.
- Migrate one low-risk surface, then ATS/Pathway shells, then Academy after WIP is resolved.
- Acceptance gate: visual checks, accessibility checks, and no security UI regression.

### Phase 6: Database Ownership And Persistence

- Publish table/field ownership map.
- Move ATS and Pathway production persistence to networked Postgres.
- Keep Core canonical for sensitive cross-product records.
- Acceptance gate: migration tests, tenant isolation, consent revocation, audit chain, backup/restore.

### Phase 7: Core System Of Record Expansion

- Route sensitive app operations through Core contracts.
- Make Application Gate, Document Vault, consent, Passport, ledger, partner scoping, and AI governance authoritative.
- Acceptance gate: app-local fallback paths cannot bypass Core in production.

### Phase 8: Workforce And Extracted Bundle Triage

- Classify `labor-economics-agent` modules and `extracted/*` artifacts.
- Port, wrap, or archive each selected capability.
- Acceptance gate: no unreviewed Python or extracted service becomes production-sensitive code.

### Phase 9: Production Readiness And Cutover

- Refresh Cloud Run, Terraform, secrets, DNS, deploy, rollback, and evidence runbooks.
- Run staging end-to-end tests.
- Production deploy remains manually approved.
- Acceptance gate: security DOD, production-readiness checklist, rollback plan, and residual-risk register are complete.

## Risks

- Combining phases can create a diff too large to review safely.
- Domain, database, and Core-contract changes are high blast radius.
- Active Academy WIP can conflict with design and routing changes.
- External partner behavior can break if APIs or redirects change without compatibility plans.
- Security controls can be weakened if tests are adjusted instead of workflows fixed.

## Tests Needed

- Every phase: changed-file review, secret scan, targeted tests, and final summary of residual risk.
- Structural phases: root install, typecheck, test, lint, build, Docker builds, and CI workflow checks.
- Domain phases: SSO, CORS, OAuth, JWKS, and URL safety.
- Data phases: migrations, tenant isolation, consent, audit, idempotency, backup/restore.
- Core phases: gateway, Application Gate, Document Vault, Model Gateway, partner isolation.
- UI phases: accessibility, visual regression, and role-safe projection review.

## Acceptance Criteria

- Work lands in reviewable slices.
- Each slice has a clear rollback path.
- No slice introduces real production data, secrets, or sensitive fixtures.
- No security control is weakened to make tests pass.
- The final platform presents as one Florence Education / Florence OS product under `florenceedu.com`, backed by Core as the system of record.
