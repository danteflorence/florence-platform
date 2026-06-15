# Lead pipeline — Florence core ↔ Academy

## What this is

The Academy maintains an **internal mirror** of the Florence core nurse
pipeline so ops can:

- **Reconcile status changes** week over week (NCLEX → Authorized → Passed,
  application_status → accepted, etc.).
- **Segment** the population for the future candidate drip campaign
  (invite leads to take the live course; offer alumni discount tiers based
  on school).
- **Target** universities for partner outreach (the schools with the
  highest alumni counts in the Academy's bank are first in the queue).
- **Cross-link** leads that become Academy candidates so we don't
  double-pay for ad attribution / reach out twice.

This is **ops-only data**. It is never returned in any candidate-facing
endpoint, never shown in `/learn`, and never crosses into the regulated
side of the product.

## Architecture

Same shape as our other event-table objects (outcomes, attendance,
pathway_tasks):

```
leads             — mutable projection, primary key = lower(email)
lead_events       — append-only diff log; prev_hash + content_hash chain;
                    one row per meaningful change to a lead.
```

### Why both csv-weekly + API-live

Both, sharing the same internal Lead model:

| Source         | When | How |
|----------------|------|-----|
| **CSV weekly** | Today (Phase 1) | `node api/scripts/import-leads.mjs export.csv` after Florence emails the weekly export. |
| **API push**   | Phase 2 (when core can fire webhooks) | Florence core calls `POST /v1/leads/import` on every lead change — real-time. |
| **API pull**   | Phase 2 (alt) | Hourly cron hits a core endpoint, applies the same upsert. |

Both write to `leads` and `lead_events`. You can run side-by-side during
cutover. Phase 2 unlocks real-time triggers ("NCLEX status flipped to
Passed → end the drip + fire the testimonial-request email") that the
weekly cadence can't catch.

## Endpoints

All operator-scoped (`leads:read` / `leads:write`). The demo M2M client
gets these by default.

| Method | Path | Scope | What |
|---|---|---|---|
| POST | `/v1/leads/import` | `leads:write` | Batch upsert. Idempotent by lower(email). Per-row errors collected, not fatal. |
| GET  | `/v1/leads` | `leads:read` | Paginated. Filters: `country`, `type`, `nclex_status`, `application_status`, `q` (email+name substring). |
| GET  | `/v1/leads/:id` | `leads:read` | One lead + its event timeline. |
| GET  | `/v1/leads/rollup` | `leads:read` | Counts by country / type / nclex / application_status. |
| GET  | `/v1/leads/events/recent` | `leads:read` | Newest-first event feed. `since=<ISO>` for "what changed since last import." |

## Importing the weekly CSV

```bash
export PATH="$HOME/florence-work/.toolchain/node/bin:$PATH"
API_URL=http://localhost:8788 \
SEED_CLIENT_SECRET=overnight-demo-secret \
node api/scripts/import-leads.mjs \
  "/path/to/users_leads_export_<DATE>.csv"
```

What it does:

1. Parses with a real RFC-4180-ish parser (the export has commas inside
   quoted `fullname` fields).
2. Maps columns by header **name**, not index — adding columns upstream
   won't silently misalign.
3. Drops out-of-vocab status values (some rows in the export have phone
   numbers in `evaluation_status` from broken quote escaping; we don't
   propagate those).
4. Lower-cases emails. Drops rows with no email or a non-email in the
   email column.
5. Sends in batches of 100 with exponential-backoff retry on 429
   (the API rate-limits at 60 burst / 10 refill per second).
6. Stamps every event with `source = "csv:<YYYY-MM-DD>"` so you can
   filter the audit later by "imported from the May 23 export."
7. Reports a summary at the end:

```
=== summary ===
source       : csv:2026-06-06
total rows   : 10810
new leads    : 8726
updated      : 0
unchanged    : 0
errors       : 0
```

## Verified end-to-end against the 2026-06-06 export

- Parsed **10,810 rows** (the CSV).
- Created **8,726 leads** after dedup (matches the 8,727 unique emails
  in the source, minus the header row's "email" string).
- Country mix:
  | Country | Count |
  |---|---|
  | (no country) | 5,271 |
  | Ghana | 1,600 |
  | Philippines | 957 |
  | Kenya | 370 |
  | Nigeria | 275 |
  | US | 69 |
  | South Africa | 21 |
  | Zimbabwe | 21 |
  | UK | 15 |
- NCLEX mix: **212 Passed**, **398 Not Passed**, **300 Authorized**,
  **198 Planned**, **14 Not_planned**, **7,604 blank**.
- Application status: 8,627 not_applied, 24 accepted, 35 draft, 40
  applied_not_accepted.
- Zero parse/upsert errors.

## Reconciliation flow (week over week)

1. Export from Florence core → save as
   `users_leads_export_<DATE>.csv`.
2. Run the importer. It upserts by lower(email) and emits a
   `status_change` event for every field that changed.
3. Open `/ops/control-tower` → **Florence core leads** tab.
4. The **Recent status changes** panel shows the top 50 events
   newest-first. Use `?since=<lastWeekISO>` on the API to scope to
   just this week.
5. The drip campaign (Phase 2) consumes these events as triggers:
   "If `after.nclex_status === 'Passed'` and lead was in `cohort_drip`
   stage, fire `nclex_passed_celebration.eml` + move to `alumni`."

## Schools — the missing piece

The CSV doesn't have a school column. Two paths:

1. **Cleanest:** ask Florence core to add the school column to the
   export. Phase 1 will then auto-populate `school_slug` by joining
   on `name` against our 418-school directory.
2. **Fallback:** the drip's first email asks "where did you train?"
   with a click-through to our school picker. Sets `school_slug` per
   reply.

`school_slug` is already in the `leads` table schema, just unpopulated.

## Boundary

- Leads are NEVER returned by any non-`leads:read` endpoint.
- Leads do NOT auto-create candidate accounts. A lead becomes a
  Candidate only when they explicitly sign up through `/signup`.
- The lead model holds personal data (email, phone, name) and pipeline
  status — but no payment, no readiness, no academic performance, no
  regulated/financial data.
- When a lead does sign up, the cross-link should be by `email` — the
  Candidate keeps a separate identity record with its own consent
  capture. Today the cross-link isn't wired; that's an early Phase 2
  task ("link Lead → Candidate when a candidate signs up with a known
  lead email").
