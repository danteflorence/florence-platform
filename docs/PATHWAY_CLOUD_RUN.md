# Pathway on Cloud Run — the store constraint (DEP3)

## Wave-1 status (2026-06-15)
Pathway is **excluded from the Cloud Run services map** in `infra/envs/*.tfvars` (no Cloud Run
service, job, or domain mapping is created for it) until the async-Postgres refactor below
(path 1) lands. CI still **builds** the pathway image so it's ready to wire in. This does NOT
block external API access or the lender flow — both run through Core (Postgres-ready).

## The constraint
Cloud Run is **stateless** (no persistent disk). `florence-pathway-agent` uses a **synchronous**
`node:sqlite` store (`server/db.ts` — `DatabaseSync`, file `data/pathway.db`), and the whole app is built
around that synchronous store: `getDossier()`, `assembleCandidateView()`, the agents, and the route handlers
all call `store.*` **synchronously**. Core, ATS, and Academy already run on Postgres (async stores); pathway
does not, so it cannot run correctly on stateless Cloud Run as-is (the sqlite file is lost on every cold start).

This is NOT a quick swap: making the store Postgres means making it **async**, which ripples through every
synchronous caller in pathway (a real refactor, not a config flag). Forcing it in an unattended pass would risk
the pathway suite, so it is deliberately deferred to a focused change.

## Two safe paths (operator decision)
1. **Recommended — async Postgres store behind the existing seam (one focused pass).**
   - Add a `PathwayStore` interface + a `PostgresStore` impl (mirror `florence-ats-connect/server/store/postgres.ts`),
     env-selected (`PATHWAY_DB=postgres` → Cloud SQL via `DATABASE_URL`; default node:sqlite for local).
   - Convert `store.*` + `getDossier`/`assembleCandidateView`/agents/handlers to `async` (mechanical but broad).
   - Keep `pathway-v1-smoke` + typecheck green on both backends. ~1–2 focused days; do it as its own PR.
2. **Interim — run pathway on a stateful host.** Keep node:sqlite on a small VM / Cloud Run with a mounted
   Filestore/persistent volume (or a single-instance service with a disk), while everything else is on Cloud Run.
   Documented bridge until path 1 lands. (The `infra/` Terraform marks `pathway.needs_sql = true` in anticipation
   of path 1; until then, pin pathway to the stateful host.)

## Why this doesn't block the lender data flow
The **Lender Data API + Production Ledger + Passport all live in Core** (Postgres-ready), not pathway. Pathway
only *emits* events to Core (`pathway.visa_status`, `pathway.license_verified`, …). So the bank-facing data flow
runs on Cloud Run today; pathway's own `/v1` surface can follow on path 1 without holding up financing.
