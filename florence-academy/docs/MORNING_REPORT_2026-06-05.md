# Morning report — 2026-06-05

Overnight build covering the instructor first-class rehearsal you asked
for, plus everything adjacent that earned itself into scope.

Everything is on **`main`**, locally only — nothing pushed anywhere.

## TL;DR

- **Per-cohort coverage watermark** is now server-stored and the instructor
  flips it from a dedicated console.
- **`/instructor`** is shipped: sign-in, today's cohort, pre-class checklist,
  roster + attendance, post-class wrap with one-click coverage bump and
  copilot memo.
- **Public landing → signup → deposit → enrolled-in-cohort** is now a
  closed loop. The candidate picks a cohort on the marketing page; their
  deposit lands; their account claims the seat automatically.
- **Mobile** works at 375x812 across every surface.
- **API checks:** 88 → 99 (+11). **SPA tests:** 70/70. **Build:** clean.

## What shipped, in commit order

```
4e66d54 Mobile audit + fixes across public + enrolled-student surfaces
0bf2156 Merge: instructor polish + self-enroll on deposit clear
1635e93 Candidate self-enrolls into the cohort they picked on the landing
a0e9e19 Instructor polish: filter withdrawn, cohort progress strip, README
6bc5cc2 Seed cohort start dates + dedupe candidate names + landing dates
e61eb39 Merge: Instructor Console + per-cohort coverage watermark
ab14aed Instructor Console + per-cohort coverage watermark
```

### 1. Per-cohort coverage watermark (`covered_through_section`)

The Curriculum Navigator's "covered live · revisit / now studying / coming
soon" gate used to read a build-time env var. It now reads a server-stored
per-cohort field. The instructor flips it from `/instructor` after each
class; students see the new state immediately on their Curriculum Navigator.

- **API:** `PATCH /v1/cohorts/:id/coverage` (scope `cohorts:write`). Accepts
  cohort id or cohort code. Refuses regressions with 409 unless
  `override: true` (so instructor mistakes can still be unwound).
- **API:** `GET /v1/me/cohort` (candidate-bound). Returns the candidate's
  currently-active cohort with its watermark. Narrow projection — never
  leaks `instructor_ref` or internal id.
- **SPA:** AcademyHome + SectionLesson fetch the candidate's watermark on
  mount and gate accordingly. Anonymous / no-API visitors fall back to the
  env-var default (so the static build still works unchanged).

### 2. `/instructor` console

Same architectural shape as `/ops/control-tower` — full-screen, NOT linked
from the public app, sign in at runtime with an operator API client. The
instructor's scope set is narrower than ops:

```
cohorts:read cohorts:write enrollment:read enrollment:write
performance:read candidates:read
```

The dashboard:

- **Cohort picker chips** (sorted active > scheduled by start date).
- **Today's cohort card**: name, code, status, capacity, "Covered through
  Section N of 20. Next live: Section N+1 · Title." A curriculum progress
  strip below: 4/20 · 20% with a teal progress bar and per-section block
  indicators (covered = teal-dark, current = indigo, upcoming = line).
- **Pre-class checklist** — 6 items, sessionStorage-persisted per cohort.
- **Start Live Session pane** → routes into the slide presenter and the
  live-sync deck with cohort code wired through.
- **Roster** with attendance toggles (P/L/A per row). Withdrawn students
  filtered to a collapsed `<details>` "Former students" below.
- **Cohort signals** (right column): band-count strip, avg readiness,
  watch list.
- **Post-class wrap** (right column): one-click "Mark Section N covered"
  (the regression-guarded coverage endpoint), then a "Generate memo"
  button that produces a shareable plain-text band-mix + watch-list
  paragraph.

Docs: `docs/INSTRUCTOR_CONSOLE.md` covers scope provisioning, daily flow,
recovery from WiFi drops / mistaken bumps, and what the instructor
explicitly can NOT do.

### 3. Closed loop: landing → signup → deposit → enrolled

The Signup page already stashed the chosen cohort code in
`sessionStorage["florence:pending_cohort"]`. Now the Account page reads
it on `?deposit=success`, calls `selfEnroll(deposit_paid)`, and surfaces
the outcome inline:

- `ok` → "Enrolled in MNL-2026-07."
- `already_enrolled` → "Already enrolled in MNL-2026-07."
- `cohort_full` → "MNL-2026-07 is full — we'll move you to the next cohort."
- `cohort_closed` → "MNL-2026-07 has closed — ops will pick a new cohort."
- other → "Couldn't auto-enroll … Ops will follow up."

Server-side guards (when caller is candidate-bound):
- 404 cohort_not_found
- 410 cohort_closed
- 409 already_enrolled
- 403 forbidden (status ∉ {registered, deposit_paid})
- 402 deposit_required (deposit_paid without a paid deposit on record)
- 409 cohort_full (existing capacity gate)

Operator-bound calls (T tokens) are unchanged — ops can still create any
enrollment at any status.

### 4. Seed polish

- Cohorts now have real `starts_at`: Mon Jul 6 / Mon Aug 3 / Mon Sep 7,
  2026 (first-Monday-of-month placeholders until you confirm exact dates).
  LandingHome cohort cards render "STARTS MON, JUL 6, 2026" cleanly.
- Candidate name pools are shuffled and cycled per cohort so the demo
  roster doesn't show "Jomar Dela Cruz" twice (which it did before).

### 5. Mobile (375x812)

Audited every surface; fixed the obvious breakage:

- Header CTAs were wrapping to two lines on every shell (Landing, Signup,
  App). Wordmark drops one tier on mobile, "NCLEX-RN Bootcamp" subline
  hidden below `sm:`, nav links get `whitespace-nowrap`.
- Hero h1s drop one tier (`text-3xl` → `text-4xl` → `text-5xl`).
- Section paddings tightened: `px-5 py-16` → `px-4 py-12` on the public
  surfaces. Saves ~32px of vertical scroll per section.
- Signup header collapses "Already have an account?" prefix on mobile.

Visually confirmed at 375x812: every surface renders without overflow or
double-wrapped buttons.

## Verified end-to-end flow

Done in a real browser session against the local API:

```
1. Stranger lands at /                     → marketing landing (cohort
                                             cards, eligible-school
                                             qualifier, FAQ)
2. Picks University of Santo Tomas         → "qualifies for $75"
3. Clicks "Reserve at $75 →"               → /signup?cohort=MNL-2026-07
                                             &school=FLR-PH-UST
4. Signs up + pays mock deposit            → returns to /academy/account
                                             ?deposit=success
5. Auto-claims seat                        → "Enrolled in MNL-2026-07."
6. Opens /learn                            → sees the section gate
                                             driven by Manila's watermark
7. Instructor opens /instructor            → "Cover through Section 4.
                                             Next live: Section 5 ·
                                             Pharmacology III."
8. Instructor clicks "Mark Section 5
   covered"                                → watermark → 5
                                             /v1/public/cohorts shows
                                             covered_through_section=5
                                             dashboard re-renders, next
                                             live becomes Section 6
9. Student refreshes /learn                → Section 6 is now "Now
                                             studying"; sections 1-5
                                             revisitable
```

## Outstanding items you can answer over coffee

These are the things I deliberately left at safe defaults so I could
keep working — replace whenever convenient:

1. **Refund policy** for the landing FAQ. Current placeholder:
   > "Reach out before your cohort starts and we'll discuss refund
   > eligibility. After the cohort starts the deposit isn't refundable,
   > but you can transfer to a later cohort at no cost."
   If your real policy differs, send me the exact wording and I'll drop
   it in.

2. **Real cohort start dates.** I seeded first-Monday-of-month placeholders.
   If Manila actually starts Tuesday Jul 14, send the dates.

3. **Cohort enrollment override.** The `/instructor` post-class wrap can
   bump coverage but not regress it without `override: true`. The UI
   doesn't expose `override` yet — call ops if you mistakenly bump too
   far. Trivial to add a confirmation dialog if you want self-service
   recovery.

## Recommended next-day order

The user said "content QA tomorrow." Suggested approach:

1. **Pick 2 sections** — one early (Pharmacology I, Sec 3) and one heavy
   (Cardiac, Sec 7). Open both in `/academy/section-N` mode and read
   end-to-end as a student would.
2. For each segment, mark: rationale right / rationale wrong / rationale
   AI-feeling / fact wrong / missing nuance / good as-is.
3. Surface a small toolchain to turn that feedback into edits (likely
   just a docs/ checklist + lesson file edits).
4. Establish a "no marketing-speak" rule and audit for it across all
   sections.

I don't have a strong opinion on which 2 sections — your call which are
highest-impact for the cohort starting July 6.

## What I did NOT do, intentionally

- Did not push anywhere remote (per persistent rule).
- Did not create accounts, enter secrets, or call external services.
- Did not change FICA/F-1/visa surfaces (those are NOT in this app).
- Did not invent pass-rate numbers, testimonials, instructor names, or
  university endorsements on the public landing.
- Did not reorganize content / lessons — that's the QA pass for tomorrow.
