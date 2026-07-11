# Florence Academy — Production OS Roadmap

**From "NCLEX prep" to the readiness intake layer for global nurse production.**

*Builds on `docs/30-10-RECONCILIATION.md` (the layer architecture) and the Track-A
work already shipped. Planning doc — no product code changes here.*

---

## 0. Read this first

The vision is right and largely compatible with the architecture we already chose.
Two honest framings before the plan:

1. **~40% of your "build first" list (§17) already exists.** We've shipped the
   Readiness Passport (v1), the Academy Control Tower (with per-candidate passport
   drill-down + next-best-action + deposit follow-ups), the $100 **commitment
   deposit** flow, cohorts + live-synced classroom, a telemetry/outcomes spine,
   sim-lite components, and CRM sync. So this roadmap is mostly **deepening + the
   partner/AI layers**, not greenfield.
2. **The single biggest risk is unchanged: layer discipline.** The Passport you
   describe lists visa, financing, licensure, employer, and QA fields. Those must
   render in the **internal/partner** projections — *not* on the learner app. The
   learner surface stays clean education + readiness + the optional live/lab + the
   deposit. Everything financeable/regulated lives behind auth in the API, the Ops
   Console, the Pathway Agent, and partner portals.

---

## 1. The category (positioning — a deck/commercial workstream, not a build)

> **Florence Academy is the readiness infrastructure layer for global nurse
> production** — it turns already-trained global nurses into U.S.-ready RN capacity.
> The Academy doesn't end with a completion certificate; it ends with a forecasted
> start date.

This is a positioning change with two product implications we already honor: the
**Control Tower is the investor demo**, and the **Passport is the object that flows
through the company**. The deck rewrite (away from "200 RNs/week, 3-day intensive")
is yours to own; the product proves it.

---

## 2. The architecture boundary (restated — load-bearing)

| Layer | Surface | Owns |
|---|---|---|
| **Academy app** | Public learner web | Free self-guided course, diagnostics, sim-lite, the optional **Live/Lab** + $100 deposit, the *learner* Readiness Passport (education fields only) |
| **API** | System of record | Profiles, telemetry, readiness, **outcomes ingestion**, consent/purpose-control, route-optimizer object, CRM webhooks |
| **Ops Console** | Internal-only | **Control Tower**, Instructor Copilot, Weekly Production Review, full Passport (incl. ARR/financing), QA console |
| **Pathway Agent** | Separate product | University app, financing packet, DS-160 *guidance*, NCLEX/ATT, licensure — AI drafts → human QA → candidate attests |
| **Partner portals** | Separate authed surfaces | Employer (interview days, packets), University (dashboard), Lender (consented financing) |

**One Passport, role-scoped projections.** Learner sees readiness + next action;
ops sees ARR + financing + route; employer sees an interview-ready packet (no $);
university sees activation/readiness; lender sees only consented fields.

---

## 3. Capability map — your vision → layer · status · sprint

Status: ✅ shipped · ◐ partial · ○ new.

| # | Capability | Layer | Status | Sprint |
|---|---|---|---|---|
| 1 | **Readiness Passport** (education fields) | Academy + API | ✅ | done |
| 1b | Passport: visa/financing/licensure/employer/QA fields | Pathway + Ops + portals | ○ | 2–4 |
| 2 | **Academy Control Tower** (funnel, bands, deposits, forecast, ARR, roster) | Ops Console | ✅ | done |
| 2b | Control Tower metrics: Live-Lab seats, attendance, diagnostic %, pre/post lift, cost/cleared, QA minutes | Ops Console + API | ◐/○ | 1–2 |
| 3 | $100 **commitment deposit** + cohort enrollment | Academy + API | ✅ | done |
| 3b | Live cohort **operating system** (5-day rhythm, **Day-5 routing**) | Academy + Ops | ◐ | **1** |
| 4 | **Country-specific remediation tracks** (PH/IN/KE/NP/NG/GH/UK) | Academy (content) | ○ | 3 |
| 5 | **U.S. practice-readiness** modules (SBAR, escalation, charting…) | Academy (content) | ○ | 3 |
| 6 | **Instructor Copilot** (AI cohort analysis → reteach/group/route) | Ops Console + API | ○ | **1** |
| 7 | **Employer interview days** + employer packet | Partner portal | ○ | 2 |
| 8 | **University partner dashboard** | Partner portal | ○ | 3 |
| 9 | Ethical free/paid framing (deposit ≠ placement fee, no guarantees) | Academy | ✅/◐ | ongoing |
| 10 | **Next-Best-Action everywhere** | API object + all surfaces | ◐ | **1** |
| 11 | Academy → **Pathway workflow triggers** (readiness threshold) | API + Pathway Agent | ◐ | 2 |
| 12 | **Route optimizer** (fastest compliant pathway) | API (DAG + rules) | ○ | **1** (v0) |
| 13 | **Outcomes architecture** (deposit→…→start→repayment) | API (append-only) | ◐ | **1** |
| 14 | **Sim-lite** (vitals, med-admin tree, prioritization, SBAR, delegation) | Academy | ◐ | 3 |
| 15 | **"Florence knows me"** personalization | Academy + API | ◐ | 1–2 |
| 16 | **Weekly Production Review** (auto cohort memo) | Ops Console | ○ | **1** |
| 17 | Investor **demo mode** | Ops Console | ◐ | 2 |
| 18 | The story / definition of done | — | — | — |

---

## 4. Compliance & ethics (non-negotiable — your §9 + our standing rules)

- **Free self-guided Academy stays free for everyone.** Paid Live/Lab is optional.
- The **$100 is a "commitment deposit / Live-Lab access fee"** — never a placement
  or job-access fee. (Already named `commitment_deposit` in code.)
- **No paid product guarantees** NCLEX, visa, licensure, offer, or start. Surface
  this in the product copy.
- **No tax/FICA/visa/immigration/financing language on any learner surface.**
- Pathway/financing/visa = **AI drafts → qualified human QA → candidate attests**;
  no automated government-portal submission; no unsupervised credit/immigration/
  licensure determinations.
- ARR / loan value / financing fields are **internal-only**; never on learner,
  employer, or university views.
- **Consent + purpose limitation** before any underwriting use; versioned + audited.

---

## 5. The sequence (4 phases)

**Phase 1 — Close the production loop** *(API + Ops Console; no new partner/learner surface).*
Turns the data + Control Tower we have into a visible production system. Highest
leverage for the "sui generis = production intelligence" thesis, and the investor-demo
amplifier. → **recommended next sprint; detailed in §6.**

**Phase 2 — Convert demand** *(partner-dependent).*
Employer interview-day workflow + employer portal; Academy→Pathway triggers; investor
demo mode; richer personalization. This is where education becomes ARR.

**Phase 3 — Depth + reach** *(parallelizable, content-heavy).*
Country remediation tracks; U.S. practice-readiness modules; more sim-lite; University
partner dashboard; Live-Lab attendance.

**Phase 4 — Regulated rails** *(Pathway Agent; counsel-gated).*
Financing packet, DS-160 guidance, licensure/ATT workflows with the human-QA console;
outcome-trained route optimizer; lender portal.

---

## 6. Sprint 1 (recommended) — "Close the production loop"

All API + internal Ops Console. Leverages what's built; needs no external partners.

1. **Outcomes ingestion** — append-only outcome events on the API
   (`nclex_result`, `att_issued`, `visa_step`, `licensure`, `employer_offer`,
   `start`, `retention_90d`, `repayment`) + the conversion-funnel rollup. This is the
   moat: the platform learns whether readiness became a license, a job, revenue,
   repayment. Design the schema now; data accrues over time.
2. **Day-5 routing → Pathway Agent handoff** — the Academy classifies *readiness*
   routing only (interview-ready / repeat / bridge / credential-repair) from readiness
   + attendance, surfaced in the Control Tower. It does **not** build a pathway/visa
   route optimizer — when a candidate is pathway-ready the API **connects into the
   Florence Pathway Agent** (env-gated connector + documented intake contract; the
   Pathway Agent owns university/visa/financing/licensure routing under AI-drafts →
   human-QA → candidate-attests).
3. **Instructor Copilot v1** — an AI endpoint that reads a cohort's telemetry and
   returns: performance summary, fallers, top-3 reteach, weakness groupings, and a
   Day-5 routing draft. AI drafts; faculty reviews (human-QA principle).
4. **Weekly Production Review** — an automated cohort memo (Copilot output + Control
   Tower metrics), with role-scoped versions (management / investor / employer / uni).
5. **Route optimizer / Next-Best-Action v0** — promote the existing roster heuristic
   to a first-class API object (rules + thresholds now, outcome-trained later) feeding
   the Passport and every "what next" surface.

**Why this first:** it's the production-intelligence story, it amplifies the investor
demo, it's mostly server + ops work (low UI churn), and it sets the data spine
(outcomes + route object) that Phases 2–4 read from.

---

## 7. Open decisions (you + counsel)

- **Employer design partners** (1–2) + the interview-day format and packet fields.
- **University partners** (1–2) for the dashboard pilot.
- **Live Lab** logistics: locations (Manila first), attendance capture, sponsorship.
- **Financing / Florence Capital**: lending structure, licensing posture, who underwrites
  — *counsel.*
- **Immigration support model**: in-house accredited rep vs. partner firm (defines who
  can be the "human QA" on DS-160) — *counsel.*
- **Outcomes data sources**: how NCLEX pass / ATT / licensure / start / repayment get
  reported back (employer feedback, candidate attestation, board lookups).
- **Instructor Copilot model**: which LLM + data-handling posture (PII minimization).

---

## 8. Definition of done (the standard)

Florence Academy gives every nurse free education, offers optional live/lab
acceleration, measures readiness continuously, **routes** the nurse into the right
pathway, prepares employer and financing packets (AI-drafted, human-QA'd,
candidate-attested), and updates the production ledger — ending not with a
certificate but a **forecasted start date**. The Control Tower makes those starts
visible before they happen; the Weekly Production Review proves it every week.
