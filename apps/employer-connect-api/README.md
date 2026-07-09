# Florence Education Employer Connect

**Jobs in. Florence nurses out. Status both ways.**

Employer Connect is the employer-side workflow layer of Florence Education: it imports employer
RN requisitions, matches Florence (internationally-educated) nurses, builds a
consent-gated, data-minimized employer-ready packet, submits it into the employer's
hiring workflow, and syncs interview/offer/**start/retention** status back into the
**Production Ledger**.

## Why it's built this way

- **One canonical model, channels behind it.** Every requisition — whether typed in
  by hand, uploaded as CSV, entered in the employer portal, or (later) pulled from a
  native ATS connector — normalizes into the same `JobRequisition`. Connectors are an
  implementation detail behind `shared/types.ts`, never the model itself.
- **The first four accounts (CommonSpirit, HCA, Kaiser, Tenet) are employer-direct,
  and native ATS integration is *earned*, not required.** You won't have write access
  to a Kaiser/HCA tenant for 6–18 months (security review, legal, HRIS). So V1 is the
  **manual bridge** (`submission_mode: manual_link`): a secure packet link the Florence
  recruiter hands to the employer's recruiter. It lands customers on Day 1 with zero
  integration. Native connectors register in `server/submission.ts` later.
- **Reuse, don't rebuild.** The IEN candidate + readiness + consent kernel already
  exists in `florence-pathway-agent` (incl. an `employer` consent scope); the candidate
  here is a consent-gated **projection** of it. Native connector *patterns* (Greenhouse/
  Lever/iCIMS pull) live in `florenceos` to harvest later — none of them submit
  candidates, which is exactly the gap Employer Connect fills.

## Two invariants enforced as code (not policy)

1. **Consent gate** — `buildPacket()` throws unless a live employer-share consent
   exists for that candidate↔employer (`shared/packet.ts`).
2. **Data minimization** — nationality, country of education, and visa/immigration
   status are **withheld** from the employer packet by default (Title VII / IRCA
   national-origin exposure), and recorded as `withheldFields` for the audit trail.

…plus a billing-line rule: a `start` / `retention` status **cannot** be sourced from
bare ATS stage data — it requires `verifiedVia: hris | employer_attestation |
nurse_confirmation`. Start/retention is what you bill on; it can't ride on the
flakiest signal.

## Run it

```bash
npm install
npm run dev            # API (:8788) + Vite UI (:5174) together — staff passcode: "florence"
# or separately:
npm run start          # API only, on :8788
npm run smoke          # end-to-end API check (jobs in → match → packet → submit → ledger)
PATHWAY_DB_PATH=./path/to/pathway.db ALLOW_SQLITE_LOCAL_DEV=1 npm run sync
                       # legacy local-dev import from a Pathway SQLite export
DATABASE_URL=postgres://... npm run start
                       # production-style networked Postgres; local dev without
                       # DATABASE_URL uses in-memory PGlite
```

Ops endpoints require an `x-staff-token` header. Key routes (all under `/api`):

| Flow | Endpoint |
|------|----------|
| Import requisitions | `POST /ops/employers/:id/requisitions/import` |
| Run matching | `POST /ops/requisitions/:id/matches/run` |
| Grant employer-share consent | `POST /candidates/:id/consents/employer-share` |
| Build packet | `POST /ops/application-packets` |
| QA approve | `POST /ops/application-packets/:id/qa-approve` |
| Submit | `POST /ops/application-packets/:id/submit` |
| Sync ATS status | `PATCH /ops/ats-applications/:id/status` |
| Dashboards | `GET /ops/dashboards/{integration-health,employer-demand,submissions,production-ledger,weekly-operating}` |

## Architecture

```
shared/   types.ts (canonical model) · schema.ts (zod) · matching.ts (transparent
          rules scorer) · packet.ts (consent gate + data minimization)
server/   db.ts (Postgres by default; explicit local SQLite adapter for throwaway dev) · ledger.ts
          · submission.ts (channel registry) · routes.ts · seedData.ts · index.ts
```

**Persistence path:** `db.ts` now selects Postgres by default. Production must set
`DATABASE_URL`; local dev without `DATABASE_URL` uses in-memory PGlite for a Postgres
dialect smoke path. SQLite is retained only behind `ATS_DB=sqlite ALLOW_SQLITE_LOCAL_DEV=1`
for throwaway local debugging.

**Core gate path:** production requires Core M2M credentials
(`FLORENCE_CORE_CLIENT_ID` / `FLORENCE_CORE_CLIENT_SECRET`). Formal submissions call
Core `/v1/applications/submit` before the local submission-lock projection is written,
and employer packet projection fails closed unless Core can provide the employer-safe
Passport view. Local development can run without Core unless
`CORE_APPLICATION_GATE_REQUIRED=1` or `CORE_EMPLOYER_PROJECTION_REQUIRED=1` is set.

## Built

- **React ops console + nurse marketplace** (`src/`) — Operations dashboards, Requisitions
  with explainable match breakdowns, Packets & QA, and the nurse Marketplace (consent + apply).
- **Live candidate data** (`server/candidateProvider.ts`) — the old local-dev SQLite sync is
  now explicit-only (`PATHWAY_DB_PATH` + `ALLOW_SQLITE_LOCAL_DEV=1`). Production should read
  Pathway through Core/Platform APIs after the Pathway Postgres adapter lands.
- **Native ATS connectors (6)** — iCIMS, Workday, Oracle Taleo, SAP SuccessFactors, UKG,
  and Greenhouse (`server/connectors/`) behind one `ATSConnector` interface: each pulls
  requisitions AND **submits candidates into the ATS** — the write no pull-only connector
  does. All four first-wave employers are wired (Tenet/iCIMS, Kaiser/Workday, CommonSpirit +
  HCA/Taleo). Mock by default; live behind each provider's env vars. Connect & pull from
  **Operations → Integration health**, or `POST /ops/employers/:id/connectors/:provider/{connect,pull}`.
- **Auth** — signed JWT sessions + roles (`server/auth.ts`, no deps): `ops` (full) and
  `employer` (read-only, scoped to their `employerId`). `POST /auth/login`; ops provisions
  employer logins via `POST /ops/auth/users`. The candidate pool, cross-employer dashboards,
  and audit log are ops-only; employer reads are scoped to their own data.
- **Pluggable data layer** — an async `Store` interface (`server/store/`) with Postgres as
  the default backend. `DATABASE_URL` selects networked Postgres; local dev can use in-memory
  PGlite; SQLite is explicit-only local development.
- **Self-serve "click-to-add"** — a public `/connect` onboarding landing (`src/surfaces/onboarding/`)
  where an employer connects their ATS in a click: **Merge embedded** (any of 50+ ATSs) or a
  **Greenhouse** Candidate Ingestion key. The credential is vaulted (AES-256-GCM, `server/vault.ts`);
  connecting auto-provisions the EmployerAccount + pulls their open reqs (`server/connectService.ts`).
  Inbound `POST /webhooks/ats/:provider` syncs status back (start/retention still HRIS-gated).
  Auth is **Florence OS Core SSO** (`server/coreAuth.ts`): `ops` vs `employer` (scoped to its org).
- **HRIS inbound** (`server/hris.ts`) — supplies start/retention with `verifiedVia: hris`,
  the only source the ledger trusts for those billing-grade stages. Mock by default; Finch
  behind `FINCH_ACCESS_TOKEN`. Endpoint: `POST /ops/hris/sync`.

## Next

- SSO/OIDC + persisted users (the JWT + role model is in place; demo users are in-memory).
- Background sync workers + webhook fan-in (the async store + Postgres backend are ready for it).
- Additional connectors (Lever, Oracle Recruiting Cloud) on the same `ATSConnector` seam.
