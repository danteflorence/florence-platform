# Database Standard

## Goal

Production persistence for Florence Education runs on Postgres. Core is the canonical system of record for identity, Nurse Passport, Document Vault, consent, audit, Production Ledger, partner scoping, and high-stakes workflow governance.

## Rules

- Production services must set `DATABASE_URL` and use networked Postgres.
- SQLite is allowed only for explicit local throwaway development with an opt-in environment variable, never as a production default.
- PGlite is allowed only for local or CI Postgres-dialect smoke tests. It must run in-memory by default; a file-backed `PGLITE_DATA_DIR` must be explicit and ignored.
- No `.db`, `.sqlite`, WAL/SHM files, or local Postgres data directories belong in source control.
- Test fixtures must be source-controlled data builders or JSON/TypeScript fixtures, not database snapshots.

## Current State

| Service | Current production posture | Migration status |
| --- | --- | --- |
| Core API | Postgres when `DATABASE_URL` is set; production now fails closed without it. | Schema and migration script exist in `apps/core-api/db/`. |
| Academy API | Postgres when `DATABASE_URL` is set; production now fails closed without it. | Schema and migration script exist in `apps/academy-web/api/db/`. |
| Employer Connect / ATS | Postgres is now the default. Networked Postgres is required in production; in-memory PGlite is dev/test only; SQLite requires explicit local opt-in. | Async Postgres store exists; migration script added in `apps/employer-connect-api/scripts/migrate.ts`. |
| Pathway | Postgres is now the default. Networked Postgres is required for production; in-memory PGlite is local/CI only; SQLite requires explicit local opt-in. | Async Postgres adapter, schema, migration script, production health-check path, and default Postgres/PGlite smokes are in place. |

## Required Environment

Docker Compose and production deploys must provide separate logical databases or schemas:

- `florence_core`
- `florence_academy`
- `florence_pathway`
- `florence_employer`

`DATABASE_URL` values must come from deployment secret storage or local `.env` files that are ignored by Git.

## Migration Commands

- Core: `cd apps/core-api && npm run migrate`
- Academy API: `cd apps/academy-web/api && npm run migrate`
- Employer Connect / ATS: `cd apps/employer-connect-api && npm run migrate`
- Pathway: `cd apps/pathway-api && npm run migrate`

## Verification Status

- Pathway `pathway-v1-smoke` and `consular-payments-smoke` run against the default Postgres adapter. With no `DATABASE_URL` outside production, the adapter uses in-memory PGlite and applies `db/schema.sql`.
- ATS application-gate and vault verification run on the default Postgres/PGlite path unless a caller explicitly opts into SQLite.
- Core, Academy, ATS, and Pathway migration scripts refuse to run without `DATABASE_URL`.
- Root `npm run database:check` enforces this standard in CI. It verifies migration files, Docker Compose Postgres wiring, production fail-closed guards, database health metadata, no source-controlled DB snapshots, and no default SQLite scripts.
- `node scripts/ci/check-database-standard.mjs --strict-local-artifacts` is the local cleanup gate for ignored `.db`, WAL/SHM, and local PGlite/Postgres data directories.
- Live Docker validation, when Docker is available, is `npm run database:compose`. It builds/runs the four Postgres services plus Core, Academy API, Pathway, and ATS, then checks database health metadata from each API.

## Local Verification Evidence

Last checked: 2026-06-25.

- Pathway TypeScript: `apps/pathway-api/node_modules/.bin/tsc --noEmit -p apps/pathway-api/tsconfig.json --pretty false` passed.
- Pathway default local DB mode reported `pglite-memory-dev` with `pathway-postgres-schema-v1` migration status OK.
- Pathway production DB mode with no `DATABASE_URL` failed closed.
- Pathway `pathway-v1-smoke` passed on the default Postgres/PGlite path.
- Pathway `consular-payments-smoke` passed on the default Postgres/PGlite path.
- Database standard check passed in strict local-artifact mode.
- Docker live Postgres validation passed from clean volumes with `npm run database:compose`; Core, Academy API, Pathway, and ATS all reported database backend `postgres` with migration status OK.
- All-files secret scan passed.
- `git ls-files` found no tracked `.db`, `.sqlite`, WAL/SHM, or local PGlite/Postgres data directories.
- `find apps` found no `.db`, `.sqlite`, WAL/SHM, or local PGlite/Postgres data directories outside `node_modules`.

## Remaining Verification Blockers

- None.
