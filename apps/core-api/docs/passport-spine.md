# The Nurse Passport spine

One canonical nurse identity + an append-only event log spanning every FlorenceRN
app. The **Passport** (readiness, NCLEX, licensure, visa, documents, consents,
placement, funnel stage) is a *projection* folded from the events — never edited
directly. Each app keeps its own database; this is the cross-app read-model that
makes the four products behave as one system.

```
Academy θ ─┐
Pathway    ├─►  POST /v1/nurse/event  ──►  nurse_events (append-only)
ATS        │                                     │
…          ┘                                     ▼  foldPassport()
                                          GET /v1/nurse/passport  ──►  one live Passport
```

## Why it matters
- **The moat:** a verified, longitudinal record of an internationally-educated
  nurse's whole journey — abroad → trained → licensed → placed → retained. It
  compounds with every nurse and every event.
- It makes **FlorenceRN** (the AI) actually know where a nurse is and what's next.
- It feeds accurate pricing, trustworthy employer packets, and (later) financing
  underwriting — all from the same source of truth.

## Data model (Core Postgres / memory)
- `nurses` — canonical identity (resolved by email; optional `user_id` login link).
- `nurse_refs` — `(app, external_id) → nurse_id`; how four app records converge.
- `nurse_events` — append-only journey events; the source of truth.

## API (M2M, scope-gated)
| Method | Path | Scope | Purpose |
|---|---|---|---|
| POST | `/v1/nurse/resolve` | `passport:write` | find-or-create the nurse + link an app ref |
| POST | `/v1/nurse/event` | `passport:write` | append an event (resolves the nurse inline by id/email/ref) |
| GET | `/v1/nurse/passport?nurseId=\|email=\|ref=app:ext` | `passport:read` | the folded Passport |
| GET | `/v1/nurse/events?…&limit=` | `passport:read` | the raw event log (most-recent first) |

Auth: a Core **M2M token** (`POST /oauth/token`, client_credentials) whose client
allows the passport scopes. Staff sessions (super_admin/ops/qa) also carry
`passport:read`, so the admin console / staff tools can read Passports.

## Canonical event vocabulary
`academy.enrolled` · `academy.assessment_completed` {theta, passProbability, band} ·
`academy.section_completed` · `pathway.nclex_status` {status, scheduledFor, result} ·
`pathway.licensure_status` {status, state} · `pathway.visa_status` {stage} ·
`pathway.document_verified` {key} · `consent.updated` {scope, status} ·
`ats.matched` / `ats.packet_submitted` / `ats.interview` / `ats.offer` /
`ats.started` {startDate} / `ats.retention_30d` / `ats.retention_90d` /
`ats.rejected` / `ats.withdrawn`. (Reducer + funnel ranks live in `src/passport.ts`.)

## Funnel ladder
`prospect → enrolled → readiness_assessed → nclex_passed → licensed → matched →
packet_submitted → interview → offer → started → retained_30d → retained_90d`.
`funnelStage` is the highest rung any event has reached.

## Using it from an app
Vendor the updated `sdk/coreAuth.ts` and:

```ts
import { createPassportClient } from "./coreAuth";
const passport = createPassportClient({
  coreUrl: process.env.CORE_ISSUER_URL!,
  clientId: process.env.FLORENCE_CORE_CLIENT_ID!,
  clientSecret: process.env.FLORENCE_CORE_CLIENT_SECRET!,
});
// when a nurse's start is attested in ATS:
await passport.emit(
  { email: nurse.email, ref: { app: "ats", externalId: candidateId } },
  "ats.started",
  { employer: "Sutter Health", startDate: "2027-01-15" },
);
```

Provision each app a Core M2M client (in `api_clients`) with `passport:read`
and `passport:write` in `allowed_scopes`.

## Verify
```
PORT=8090 PUBLIC_CORE_URL=http://127.0.0.1:8090 FIELD_ENC_PASSPHRASE=florence-dev-kek \
  DEMO_CLIENT_ID=florence-core-demo DEMO_CLIENT_SECRET=devsecret \
  CORE_STATE_FILE=/tmp/core.json node src/index.ts &
CORE_URL=http://127.0.0.1:8090 DEMO_CLIENT_SECRET=devsecret node scripts/verify-spine.ts
```
Simulates Academy + Pathway + ATS writing to one nurse (resolved by three
different keys), folds the Passport, and asserts the funnel reaches `started`.

## Status
Core spine: **built + verified** (memory backend; Postgres methods implemented +
typechecked; schema idempotent via `npm run migrate`).

**All three apps now emit (built + verified):**
- **ATS Connect** → `server/passport.ts` + a single emit in `server/ledger.ts recordLedger()`
  (`STAGE_TO_PASSPORT`): matched/packet_submitted/interview/offer/started/retention.
  Verified live — its smoke funnel produced `funnelStage: started` in the Passport.
- **Academy** → `api/src/passport.ts` + emit in `createAssessment` (`academy.assessment_completed`
  with theta/readiness).
- **Pathway** → `server/passport.ts` + emits at consent / documents / choose-state /
  nclex-register / nclex-att / appointment / licensure-submit / DS-160 confirmation.

Provision per-app M2M clients with `npm run seed-app-clients` (creates
`florence-academy` / `florence-ats` / `florence-pathway` with passport scopes; prints
secrets → each app's `FLORENCE_CORE_CLIENT_ID/SECRET`). Compose + `.env.testserver.example`
are wired. Emits are fire-and-forget + no-op without creds, so apps run unchanged when off.

**Live multi-app proof:** `florence-work/scripts/verify-spine-live.sh` drives Academy +
Pathway through their real endpoints for ONE email and reads back ONE Passport folding
readiness (Academy) + licensure + consent + document (Pathway), refs converged
(academy+pathway). Passed 5/5.
