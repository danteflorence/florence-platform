# Florence Education Platform

Florence Education / Florence OS is being consolidated into one production-grade platform. This repository is the monorepo skeleton for the platform runtime, shared packages, infrastructure, and planning documents.

## Current Layout

- `apps/core-api` - Core identity, SSO, Platform API, Passport, consent, audit, Document Vault, Application Gate, partner scopes, Model Gateway, and ledger controls.
- `apps/app-web` - The unified user-facing app shell (shared navigation + role-aware surfaces across the product apps).
- `apps/academy-web` - Academy learner web app. It still contains the existing Academy API and live classroom code while the split is staged.
- `apps/academy-api` - Compatibility symlink to `apps/academy-web/api`; future home of the Academy API package.
- `apps/academy-live` - Compatibility symlink to `apps/academy-web`; future home of the live classroom service.
- `apps/pathway-api` - Pathway candidate and QA workflow app.
- `apps/employer-connect-api` - Employer Connect, ATS Connect, VMS Connect, demand, packet, and submission workflows.
- `apps/economist-app` - Placeholder for the workforce economist app. The current implementation remains in the separate `labor-economics-agent` repo until it is explicitly ported or wrapped.
- `packages/*` - Shared package placeholders for the future Core SDK, event SDK, auth SDK, config, logging, database, agent system, API, and test fixtures.
- `infra/` - Terraform and infrastructure assets.
- `docs/` - Platform and partner documentation.

Legacy root paths such as `florence-core`, `florence-academy`, `florence-pathway-agent`, and `florence-ats-connect` are compatibility symlinks into `apps/` so existing deploy scripts and local commands keep resolving while the skeleton settles.

## Package Manager

The skeleton keeps npm as the active package manager for now because the current CI, app lockfiles, and deploy paths already use `npm ci`. A future migration can move to pnpm once Docker contexts, CI, lockfiles, and shared packages are updated together.

## Root Commands

- `npm run typecheck` - runs the existing app typecheck contract.
- `npm run test` - runs the existing app smoke/test contract.
- `npm run build` - runs the existing app build contract.
- `npm run lint` - checks root workspace expectations.
- `npm run security:secrets` - scans for committed secrets.
- `npm run workspace:check` - verifies the monorepo skeleton directories and placeholders exist.

Use the bundled toolchain if the shell does not have Node on `PATH`:

```bash
PATH="$PWD/.toolchain/node/bin:$PATH" npm run workspace:check
```

## Safety Notes

- Do not commit `node_modules`, `dist`, `build`, `.next`, `.terraform`, local databases, logs, caches, archives, or production secrets.
- Use synthetic data only in tests and fixtures.
- Do not move sensitive workflows outside Core-owned tenant, consent, audit, document, and Application Gate controls.
