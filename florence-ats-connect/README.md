# FlorenceRN ATS Connect

**Jobs in. Florence nurses out. Status both ways.**

ATS Connect is the employer-side workflow layer of FlorenceRN: it imports employer
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
  candidates, which is exactly the gap ATS Connect fills.

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
npm run sync           # pull the candidate projection from florence-pathway-agent
ATS_DB=postgres npm run start   # run on Postgres instead of sqlite (embedded PGlite;
                                # set DATABASE_URL + `npm i pg` for a networked server)
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
| Dashboards | `GET /ops/dashboards/{integration-health,employer-demand,submissions,production-ledger}` |

## Architecture

```
shared/   types.ts (canonical model) · schema.ts (zod) · matching.ts (transparent
          rules scorer) · packet.ts (consent gate + data minimization)
server/   db.ts (node:sqlite store — the swap seam for Postgres at scale) · ledger.ts
          · submission.ts (channel registry) · routes.ts · seedData.ts · index.ts
```

**Scale path:** `node:sqlite` is right for the V1 manual bridge. The `store` object in
`db.ts` is the seam — when the async sync fabric (concurrent connector workers +
webhook fan-in) arrives, replace that one file with a Postgres-backed store of the
same shape; nothing above it changes. `florenceos`'s `jobs_canonical` Postgres schema
is the target to align to.

## Built

- **React ops console + nurse marketplace** (`src/`) — Operations dashboards, Requisitions
  with explainable match breakdowns, Packets & QA, and the nurse Marketplace (consent + apply).
- **Live candidate data** (`server/candidateProvider.ts`) — projects florence-pathway-agent's
  dossier (read-only) into the employer-safe `FlorenceCandidate`, honoring the `employer`
  consent scope. (`npm run sync`, or the Marketplace "Sync from Pathway" button.)
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
- **Pluggable data layer** — an async `Store` interface (`server/store/`) with two backends:
  `node:sqlite` (default) and **Postgres** (`ATS_DB=postgres` → embedded PGlite, or a
  networked server via `DATABASE_URL` + `pg`). Same SQL; verified end-to-end on both.
- **Self-serve "click-to-add"** — a public `/connect` onboarding landing (`src/surfaces/onboarding/`)
  where an employer connects their ATS in a click: **Merge embedded** (any of 50+ ATSs) or a
  **Greenhouse** Candidate Ingestion key. The credential is vaulted (AES-256-GCM, `server/vault.ts`);
  connecting auto-provisions the EmployerAccount + pulls their open reqs (`server/connectService.ts`).
  Inbound `POST /webhooks/ats/:provider` syncs status back (start/retention still HRIS-gated).
  Auth is **FlorenceRN Core SSO** (`server/coreAuth.ts`): `ops` vs `employer` (scoped to its org).
- **HRIS inbound** (`server/hris.ts`) — supplies start/retention with `verifiedVia: hris`,
  the only source the ledger trusts for those billing-grade stages. Mock by default; Finch
  behind `FINCH_ACCESS_TOKEN`. Endpoint: `POST /ops/hris/sync`.

## Next

- SSO/OIDC + persisted users (the JWT + role model is in place; demo users are in-memory).
- Background sync workers + webhook fan-in (the async store + Postgres backend are ready for it).
- Additional connectors (Lever, Oracle Recruiting Cloud) on the same `ATSConnector` seam.
