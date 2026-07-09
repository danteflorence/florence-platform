# Phase 4 — Pathway Agent integration surface (in the Academy repo)

**The regulated workflows (financing packet, DS-160 guidance, NCLEX/ATT, licensure,
employer packet) live in the Florence Pathway Agent — a SEPARATE product with its
own counsel-gated build. This phase wires the Academy's surface for that agent:
explicit per-purpose consent, pathway-task projection on the Passport, outcomes
callbacks, and data-access transparency for the candidate.**

*Builds on `docs/30-10-RECONCILIATION.md` (layer architecture) and
`docs/PRODUCTION_OS_ROADMAP.md` (Phase 4 placeholder).*

---

## 0. What this is — and what it isn't

**Is:** the seams the Pathway Agent needs to integrate cleanly with the Academy.
A candidate can grant, revoke, and see exactly what's happening with their data;
the Agent reads readiness and writes task status + outcomes back; ops can audit it.

**Is not:** the financing decision logic, the DS-160 form, the visa appointment
booker, the licensure submission engine, or a credit-determination layer. Those
remain in the Pathway Agent under qualified-human-QA gates and stay counsel-gated.

The standing rule from the reconciliation brief still holds: **the learner app
shows no tax / FICA / visa / immigration / financing language** on any public
surface; financial figures (ARR, loan value) never render to candidates / employers
/ universities.

---

## 1. Three load-bearing decisions

### A. Consent is per-purpose, versioned, and revocable in-app.
Today's `consent { service, crm_sync, underwriting }` is a single shape. Phase 4
splits it into a per-purpose set: **`service`, `crm_sync`, `pathway`, `financing`,
`employer_sharing`, `underwriting`**. Each purpose has its own `granted_at`
timestamp; revocation writes a new timestamp + `granted: false`. The candidate
controls them from their Account page. **No purpose default-grants**; signing up
only grants `service`.

### B. The Pathway Agent is a peer service, not a back-channel.
It authenticates with its own M2M client (scope `pathway:write` for task updates,
`outcomes:write` for milestone events). It does NOT get raw access to the audit
log, payments, or other candidates. The handoff intake we already ship
(`POST /v1/candidates/:id/pathway-handoff`) sends the Agent only the
purpose-limited Readiness Passport projection — no financial fields cross.

### C. The candidate can see what's been done with their data.
A `GET /v1/me/audit` endpoint returns the recent audit entries scoped to that one
candidate's resource id. It surfaces who read or wrote — without surfacing what
specific values. This is the transparency obligation the Pathway Agent inherits.

---

## 2. Phase 4 sub-phases

### 4a · Granular per-purpose consent
- API: extend `Consent` with `pathway`, `financing`, `employer_sharing`; each as
  `{ granted: boolean, updated_at: string }`. Existing `service/crm_sync/
  underwriting` keep working.
- Enforcement:
  - `POST /v1/candidates/:id/pathway-handoff` requires `consent.pathway`
  - `POST /v1/employer/offers` requires `consent.employer_sharing`
  - Existing underwriting purpose-limit (`X-Purpose: underwriting`) keeps
    requiring `consent.underwriting`
- Client: a **Consent management** card on the Account page. Each purpose has
  its own toggle + a one-line explanation of what it unlocks. Revoke is one click.
- Audit: every consent change records `consent.granted` / `consent.revoked` events.

### 4b · Pathway tasks projection on the Passport
- `pathway_tasks` table (append-only events; latest-per-(candidate,task) wins for
  display). Task kinds:
  `university_app`, `financing_packet`, `i20_readiness`, `ds160_guidance`,
  `visa_appointment`, `nclex_registration`, `att_tracking`, `state_licensure`,
  `endorsement`, `employer_packet`, `human_qa`.
  Status: `pending`, `in_progress`, `awaiting_candidate`, `human_qa`, `completed`,
  `blocked`.
- API: `POST /v1/candidates/:id/pathway-tasks` (Pathway Agent writes status);
  `GET /v1/candidates/:id/pathway-tasks` (operator + the candidate themself).
- Client: a **"Your pathway" panel** on the Account page — only renders when
  `consent.pathway === true`. Shows current status per task, blockers, and a
  "what you need to do next" line *only* for `awaiting_candidate` tasks. No
  financial or visa-decision content is rendered.

### 4c · Audit transparency (your data, your audit)
- `GET /v1/me/audit?limit=100` — paginate audit entries where the candidate's id
  appears in `resource_id` or `actor`. Returns timestamp, action (e.g.
  `GET /v1/candidates/cand_X/readiness`), and actor type (candidate session vs.
  pathway agent vs. ops). Field values are not echoed.
- Client: a **Data-access log** section on Account page. "Last 30 days: 12 reads
  by the Pathway Agent, 4 by ops." Drill-down lists actions in plain English.

### 4d · Pathway Agent contract doc
- Append `docs/PAYMENTS_AND_POSTGRES.md` (or a new `docs/PATHWAY_AGENT.md`):
  - Authentication: M2M client with `pathway:write`, optionally `outcomes:write`
  - Endpoints it consumes from the Academy:
    `POST /v1/candidates/:id/pathway-handoff` (intake; operator-triggered)
    `GET /v1/candidates/:id/readiness`
    `GET /v1/candidates/:id`
  - Endpoints it writes:
    `POST /v1/candidates/:id/pathway-tasks` (status updates)
    `POST /v1/outcomes` (NCLEX result, ATT, visa step, licensure, offer, start,
    repayment)
  - Required consent checks before each endpoint
  - Webhook events it should subscribe to (`candidate.created`,
    `assessment_result.created`, `payment.completed`, `outcome.recorded`)
  - Rate-limit + idempotency expectations (already enforced by the Academy API)

---

## 3. What's still deferred (and why)

- **The financing packet itself, the DS-160 draft engine, the licensure
  submission flows.** These live in the Pathway Agent. Counsel-gated.
- **Lender portal.** Adjacent to financing — wait for that.
- **Identity verification beyond email-domain.** Document upload + human QA for
  affiliation/identity is in scope for the Pathway Agent QA console, not the
  Academy.
- **Government-portal automation.** Never. Always candidate-attests, agent-drafts,
  qualified human QAs.

---

## 4. Definition of done for Phase 4 (this repo's scope)

A candidate can:
1. Grant, revoke, and see the status of each purpose-specific consent on Account.
2. See their pathway tasks updated in real time once the Pathway Agent is
   connected (read-only, consent-gated, no financial language).
3. See who has accessed their data on the same page they manage consent from.

The Pathway Agent can:
1. Read the readiness object via handoff.
2. Write task status + outcomes back through purpose-checked endpoints.
3. Subscribe to webhooks for inbound events.

Ops can:
1. See consent state on every candidate (already in the candidate record).
2. Trigger a pathway handoff once required consents are granted.
3. Audit every read/write via the existing tamper-evident audit log.

No new regulated logic is built here. The wedge: **make integration safe and
visible, so the Agent can do its job when it's counsel-cleared to start.**
