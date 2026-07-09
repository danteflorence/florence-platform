# Instructor Console (`/instructor`)

**Internal only. Not linked from the public app.** This is the surface a
nurse educator opens before class, keeps open on a second monitor during
class, and uses to wrap up after class.

It is structurally identical to the Ops Control Tower at `/ops/control-tower`:
both authenticate with a server-side M2M client (an OAuth2 client-credentials
exchange entered at runtime, held only in `sessionStorage`, never bundled
with the app). The Instructor Console has a **narrower scope set** than
Control Tower — it sees a cohort, not the whole production funnel.

## Scope set

The instructor's API client should be provisioned with these scopes only:

```
cohorts:read cohorts:write enrollment:read enrollment:write
performance:read candidates:read
```

That's enough to read a roster, mark attendance, bump the coverage
watermark, and surface the cohort copilot — and nothing else. Notably the
instructor client **cannot** read payments, outcomes, or schools data. If
an instructor sees Ops creds, that's a misconfiguration.

## Daily flow

### Before class (5 minutes)

1. Open `/instructor` on the second monitor. If prompted, paste the
   instructor API base URL, client ID, and secret.
2. The dashboard auto-selects the most-active cohort (active > scheduled).
   If you're teaching a different one, click its chip in the cohort picker.
3. Run the **Pre-class checklist** — each item is a real failure mode we've
   hit before. The state is per-cohort and survives a page refresh.
4. Glance at **Cohort signals** (right column) — band mix tells you what
   your room looks like today. Watch-list names go on your radar.

### During class

1. Click **Open presenter** to launch the slide deck for today's section in
   a new tab. Use that tab on the projector; keep the dashboard on your
   second screen.
2. Optional: click **Go live (sync students)** to drive the synced deck for
   students who are joining remotely. The cohort code is wired through.
3. As students arrive, click **P** next to their name to mark them present.
   Late arrivals: **L**. No-shows: **A**. Each tap writes an event to
   `/v1/attendance` (append-only — corrections are superseding inserts).
4. The Cohort Signals pane refreshes when you generate the post-class memo,
   so it doesn't distract during teaching.

### Post-class (3 minutes)

1. Click **Mark Section N covered** under "Post-class wrap". This bumps the
   server-stored watermark — students see the new state on their
   Curriculum Navigator immediately. Mistake? Re-bump or call ops; the
   endpoint refuses regressions without `override: true`.
2. Click **Generate memo** — produces a one-paragraph cohort status note
   (band mix, watch list, next section). Copy-paste into Slack / Notion.
3. If a student withdrew during/after the class, ops handles the
   enrollment transition. They'll appear in the collapsed **Former
   students** list below the roster on subsequent days.

## Recovery from real-world failures

- **Your WiFi drops mid-class.** The slide deck is local; keep teaching.
  When you're back, refresh `/academy/section-N/live` to re-sync students.
  Attendance state is sessionStorage-local — re-mark the late arrivals.
- **A student loses connection.** Their last live-sync slide stays put.
  They rejoin when they can; no instructor action needed.
- **You bumped coverage by mistake.** PATCH the endpoint with
  `{ "covered_through_section": <correct N>, "override": true }`. The
  console doesn't expose override yet — call ops; they have it from
  Control Tower's raw API view.
- **Wrong cohort opened.** Click another chip; everything re-fetches.

## What you can NOT do from `/instructor`

Deliberate, so accidents stay small:

- **Refund or change a deposit** — ops only.
- **Edit a candidate's identity or email** — ops only.
- **See payment amounts or revenue** — those are out-of-scope for the
  instructor token.
- **Withdraw a candidate** — ops handles enrollment lifecycle.

## Architecture notes for the operator

- The watermark lives on the `cohorts` table as `covered_through_section`
  (integer, nullable). Old rows default to 0 on read.
- The endpoint is `PATCH /v1/cohorts/:id/coverage`. Accepts cohort id OR
  cohort code (instructor UX). 409 on regression unless `override: true`.
- Candidates read their cohort via `GET /v1/me/cohort` (candidate-bound,
  narrow projection — never leaks `instructor_ref` or internal id).
- The marketing landing page `/` also reads `covered_through_section` via
  `GET /v1/public/cohorts` if you ever want to render "Currently studying
  Section X" on a cohort card. Not on by default.
