# Local Setup Runbook

## Prerequisites

- Node.js 24 or newer.
- npm from the Node.js distribution.
- Git.
- Terraform only when validating `infra/`.

Do not copy `node_modules` from another machine. Install dependencies from lockfiles so native packages are built for the local OS.

## Fresh Clone

```sh
git clone <repo-url> florence-work
cd florence-work
npm ci
npm run ci:install
```

`npm run ci:install` installs each app from its own `package-lock.json`:

- `apps/core-api`
- `apps/academy-web`
- `apps/academy-web/api`
- `apps/pathway-api`
- `apps/employer-connect-api`

## Environment Files

Copy only the template you need:

```sh
cp .env.example .env
```

Use placeholders or local synthetic values only. Real secrets must come from the approved secret manager and must not be committed.

App templates live at:

- `apps/core-api/.env.example`
- `apps/academy-web/.env.example`
- `apps/academy-web/api/.env.example`
- `apps/pathway-api/.env.example`
- `apps/employer-connect-api/.env.example`

## Local Quality Checks

Run these before opening a pull request:

```sh
npm run workspace:check
npm run typecheck
npm test
npm run lint
npm run prettier
npm run build
npm run security:secrets
npm run security:secrets:test
npm run security:audit
npm run security:static
npm run security:ci:test
```

If you only changed one app, run that app's local script first, then run the root gate before requesting review.

## Local Cleanup

Generated artifacts are ignored by Git. Clean build outputs with:

```sh
npm run clean
```

Never commit:

- `node_modules/`
- `dist/`, `build/`, `.next/`, coverage output, or Vite caches
- `.terraform/` or Terraform state
- local databases, WAL/SHM files, or generated media
- logs, temporary files, or real `.env` files

## Data Safety

Use synthetic data only. Do not put real candidate, passport, SEVIS, DS-160, visa, employer, lender, credit, loan, document, packet, audio, tutor, or Production Ledger data into local fixtures, logs, screenshots, prompts, or bug reports.
