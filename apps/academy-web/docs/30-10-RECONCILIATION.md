# FlorenceRN — The 30/10 Reconciliation Brief

**Turning the "production operating system" vision into an executable, compliant, layered build.**

*Cross-product architecture + sequencing brief. Status: working draft for founder/team alignment and fundraising narrative. Local only — not published.*

---

## 0. Read this first

The 30/10 vision is **right**, and most of it is compatible with the architecture we already chose. The failure mode it invites is **building the wrong things into the wrong product**. This brief exists to prevent that: it sorts every capability in the vision into one of five layers, states what's already built, fixes the compliance guardrails, and sequences the next four weeks against the only thing the seed has to prove — **monthly RN starts and collections.**

One sentence, two audiences:

> **Internal:** Florence Academy is not an NCLEX course. It is the *readiness intake layer* for FlorenceRN's production system — it teaches, measures, and emits the signal that the rest of the system routes, automates, QA's, and forecasts.

> **Investor:** FlorenceRN turns one candidate profile into a readiness passport, a pathway workflow, a financing packet, an employer-ready file, and a forecasted start date. That is why Florence is **infrastructure, not staffing.**

---

## 1. The thesis an investor has to believe

Everything in the 30/10 doc serves one triangle. The product's job is to produce evidence for all three corners:

| Corner | The claim | The evidence the product must generate |
|---|---|---|
| **Candidate pull** | Nurses want this enough to commit | Paid $100 deposits, live/lab attendance, diagnostic completion, repeat use |
| **Production efficiency** | The system makes nurses US-ready faster and cheaper | Readiness lift, fewer admin errors, shorter days-per-stage, fewer human touches per workflow |
| **Employer + capital conversion** | The output is financeable, hireable supply | Interview-ready packets, contingent offers, offer-backed financing packets, a forecast of starts by month |

The Control Tower (below) is simply the screen that shows all three corners at once. **That is the investor demo.**

---

## 2. The architecture: five layers, one object

The non-negotiable principle: **the public learner app never holds regulated or revenue data.** Financing, underwriting, visa workflow, ARR, and loan value live behind authentication in the API, the internal ops console, and the Pathway Agent. We committed to this boundary already; at 30/10 scale it matters more, not less — the moment a $100-deposit nurse's "loan-tape value" sits in the app that serves the public course, you've created a privacy, security, fair-lending, and optics liability *and* made the education product unshippable on its own.

| Layer | Surface | Owns | Who sees it |
|---|---|---|---|
| **Academy app** | Public web (this repo) | Curriculum, diagnostics, live cohorts, $100 deposit, the *education* readiness band | Candidates, instructors |
| **API** | Service (this repo, `api/`) | Profiles, persisted progress + telemetry, readiness scoring, **consent / purpose-control**, **outcome ingestion**, CRM webhooks | System-of-record; no direct human UI |
| **Internal Ops Console** | Separate internal app | **Control Tower**, route optimizer, production ledger, **QA console**, cohort forecast, ARR / loan value, **demo mode** | Florence operators only |
| **Pathway Agent** | Separate product | The regulated workflow engine: university app, financing packet, DS-160 *guidance*, NCLEX/ATT, licensure — **AI drafts → human QA → candidate attests** | Candidates + qualified QA staff |
| **Partner portals** | Separate authed surfaces | Employer (reserve capacity, interview-ready packets), university (activation/readiness), lender (consented financing fields) | Each partner, purpose-scoped |

### The Readiness Passport is one API object with role-scoped projections

The passport is the connective tissue — but it is **not a screen in the learner app.** It is an object in the API, and each surface renders only its permitted projection:

| Viewer | Sees | Never sees |
|---|---|---|
| Candidate | Their readiness band, next best action, blocker, workflow status | ARR, loan value, internal risk scores |
| Internal ops | Everything, incl. ARR + financing + risk | — |
| Employer | Interview-ready packet, expected start window | **Any dollar figure**, financing, visa detail |
| University | Activation, readiness distribution | Financing, ARR |
| Lender | Only the financing fields the candidate consented to share | Everything else |

This single rule — *one object, role-scoped projections, gated by consent* — is what lets the passport "flow through the company" (the doc's §3) without leaking ARR onto a nurse's profile card.

---

## 3. Every 30/10 capability, sorted into its layer

Build state: ✅ done · ◐ partial / scaffolded · ○ not started.

| # (doc) | Capability | Layer | State | Note |
|---|---|---|---|---|
| §1 | Production Control Tower | Ops Console | ○ | The investor artifact. Build after substrate. |
| §2 | Route optimizer ("Maps for nurse production") | Ops Console + API | ○ | Start as DAG + rules + historical averages, **not** AI. |
| §3 | Readiness Passport | API object + role views | ◐ | Education readiness exists in-app; not yet a persisted object. |
| §4 | Academy Live operational intelligence | Academy app + API telemetry | ◐ | Live sync/polling/roster built; class analytics + AI remediation not. |
| §5 | Pathway workflow engine | **Pathway Agent** (separate) | ◐ | Lives in its own product, by design. |
| §6 | Human QA console | Pathway Agent / Ops Console | ○ | The thing that makes regulated workflow scalable. |
| §7 | Partner portals (employer/university/lender) | Separate authed surfaces | ○ | Employer portal is the bridge to ARR. |
| §8 | Day-5 interview / routing event | Academy cadence + Ops routing | ◐ | Curriculum done; routing logic not. |
| §9 | Consent + purpose-limited access | **API (foundational)** | ◐ | API has scopes/audit; purpose-control schema is the gap. Build early, not late. |
| §10 | Outcome ingestion | API | ○ | The compounding moat. Build the schema **now**, before data exists. |
| §11 | Cohort production forecast | Ops Console + API | ○ | Makes starts visible before they happen. |
| §12 | Investor demo mode | Ops Console | ○ | One candidate, one employer, one university, one lender. |

---

## 4. What's already built (the risk-reducer)

The vision assumes a lot of foundation. Much of it exists:

**Academy learner app (this repo)**
- ✅ **All 20 curriculum sections** authored and live (generic lesson registry + reader + presenter deck + live-synced classroom).
- ✅ Four native interactive teaching tools (clickable anatomy, deterministic bedside-vitals sim, NGN unfolding-case engine, practice + rhythm drills).
- ✅ **Adaptive question bank + CAT engine** (~9k items across single-best-answer, SATA, NGN unfolding cases, bow-tie, drag-drop, extended multiple-response).
- ✅ Live cohorts: Socket.IO sync, in-class polling, roster, self-paced timed assessments.
- ✅ Field Guide brand system; route-level code splitting; mobile-clean; zero-console-error QA bar.

**API (`api/`) — the system-of-record substrate**
- ✅ Documented surface (`openapi.yaml`), security posture (`SECURITY.md`), CRM connectors, DB, test suite.
- ✅ Auth, scopes, session tokens, cohorts, audit log, webhooks, in-transit + at-rest hardening (the "bring it to 10/10" pass).

**The real gap (and therefore the next increment):** the learner app **does not yet persist candidate identity, progress, or telemetry to the API.** Practice state resets on reload. Everything in the 30/10 vision — passport, Control Tower, forecast, outcome ingestion — needs that connection first. It is squarely education-side and touches no regulated surface.

---

## 5. Compliance guardrails (non-negotiable)

These are not "later" items. They constrain the build from day one and they are part of why this is *infrastructure*.

1. **Public-surface language rule.** No tax / FICA / IRS / F-1 / visa / immigration / financing language anywhere a learner can see. (Source grep-audited clean; keep it that way.)
2. **Layer isolation.** Financing, underwriting, visa workflow, ARR, and loan value never render on the Academy app — they live in API / Ops / Pathway behind auth.
3. **Lending & underwriting are regulated.** "Readiness-backed loan pools" and "offer-backed financing" touch ECOA / fair-lending, likely state lending licensing, and FCRA if consumer reports are used. Build the **consent rails and workflow**; route every credit determination to a qualified party with proper disclosures. Do not automate the decision.
4. **Immigration = unauthorized-practice-of-law risk.** DS-160 / visa support must be: AI drafts → **qualified/accredited human QA** → candidate self-signs and attests. **Never auto-submit to government portals.** This is why it lives in the Pathway Agent, not the Academy.
5. **Nurse-as-asset optics.** ARR and loan value are internal-ops-only and must never appear on candidate, university, or employer surfaces. Enforced by the role-scoped passport projections (§2).
6. **Consent + purpose limitation from the start.** Versioned, auditable consent; each use (education / university / financing / employer / visa / underwriting) separately granted; lenders see only consented fields. Underwriting is never a casual read of the whole Academy record.
7. **"AI drafts, humans QA, candidates attest" is permanent.** The product feels automated but makes no unsupervised immigration, credit, licensure, or legal determination.
8. **Payments never touch the app.** The $100 deposit flows through a hosted processor (e.g. Stripe Checkout); the Academy never collects or stores card data.
9. **Operating constraints.** Local git only; no autonomous deploys, account creation, secrets, or external sign-ups without explicit per-action approval.

---

## 6. Sequencing — optimize for the seed, not the catalog

The seed proves **starts + collections + cohort economics** (the doc agrees, §14–15). That dictates order. The Academy/API track and the regulated Pathway track advance in **parallel** — the regulated work is *not* on the Academy's critical path.

### Track A — Academy + API (education-side, the demo's data spine)
1. **Substrate** *(next)* — candidate identity + persistent progress + telemetry/assessment persistence (Academy ↔ API). Unlocks everything downstream.
2. **Commitment** — $100 deposit + cohort enrollment (hosted processor). First real money + collections signal.
3. **Readiness as an object** — server-side readiness scoring → passport v0 fields in the API.
4. **Control Tower v1 + demo mode** — internal ops console reading 1–3; seed/mock where live data is thin. **The investor artifact.**

### Track B — Pathway Agent (regulated, parallel, separate repo)
- Workflow engine (university app, financing packet, DS-160 guidance, NCLEX/ATT, licensure) as a **system of record**: each workflow has status, owner, missing data, source evidence, risk flags, QA status, candidate attestation, completion/deficiency events.
- Human QA console with an **exception queue** and AI-summarized diffs (what was drafted, from which document, what changed, what's risky, what needs candidate confirmation).
- Consent + purpose-control schema (shared with the API).

### Foundational-now, train-later
- **Outcome ingestion schema** (NCLEX pass/fail, ATT/visa/licensure timing, interview outcome, offer, start date, 90-day retention, repayment). Capture from day one; the routing and readiness models train on it as outcomes accrue. **This is the moat** — a course company sees practice data; Florence sees whether practice became a license, a job, revenue, and repayment.

### Explicitly deferred (the doc agrees)
Deep 3D / avatar simulation · automated government-portal actions · full 50-state endorsement engine · ML route optimizer (rules + averages first).

### The next four weeks (concrete)
| Week | Deliverable |
|---|---|
| 1 | Candidate identity (auth to API) + persisted course/section progress |
| 2 | Diagnostics/practice/CAT results persisted as telemetry events; readiness band computed server-side as an object |
| 3 | $100 deposit + cohort enrollment via hosted processor; cohort membership in API |
| 4 | Ops Console **Control Tower v1** (nurses-by-stage, deposits, attendance, readiness-cleared, forecast skeleton) + the 7-minute demo-mode script. Internal-only. |

---

## 7. The investor demo, layer-annotated

The doc's "Ana from Manila" story is the right script. Here it is with the layer each beat touches and what's real vs. mocked for a first demo:

| Beat | Layer | First-demo reality |
|---|---|---|
| Enters free self-guided Academy | Academy app | ✅ real |
| Pays $100 for Live Lab access | Academy app → API (payment/cohort) | ◐ real once Week 3 lands |
| Attends Manila lab; takes diagnostic | Academy Live + API telemetry | ◐ real once Weeks 1–2 land |
| Yellow → remediation → Green | API readiness object | ◐ real once Week 2 lands |
| Readiness Passport created | API object | ◐ |
| University / financing / DS-160 / NCLEX-ATT packets drafted | Pathway Agent (AI drafts) | mock for demo; real in Track B |
| Human QA approves; Ana attests & signs | Pathway Agent (QA + attestation) | mock for demo |
| Employer sees interview-ready packet (no $) | Employer portal (consented slice) | mock for demo |
| Contingent offer; production ledger updates | Ops Console | mock → real |
| Dashboard shows expected ARR + start timing | Ops Console (internal) | mock → real once forecast lands |

A credible 7-minute demo needs Track A real (Weeks 1–4) and Track B mocked behind a clean interface — honest, and it still tells the whole story.

---

## 8. Open decisions that need you (and counsel)

These gate Track B and the financing narrative; none block Track A:

1. **Lending structure & licensing posture** — who underwrites, who holds risk, what disclosures. *Needs counsel.*
2. **Immigration support model** — in-house accredited representative vs. partner law firm. This defines *who is allowed to be the "human QA"* on DS-160/visa workflows. *Needs counsel.*
3. **Consent UX + data-governance owner** — who owns the purpose-control model and audit.
4. **Design partners for the demo** — which 1–2 employers and 1 lender.
5. **Payment processor** for the $100 deposit (hosted; no card data in-app).

---

## 9. The bottom line

The 30/10 vision survives contact with the architecture you already chose — provided it's built as **layers**, with the regulated and revenue surfaces kept off the learner app, the passport as one role-scoped object, and the seed pointed at starts and collections. The fastest path to the investor demo is four weeks of education-side substrate plus a thin internal Control Tower; the financing and immigration machinery matures in parallel inside the Pathway Agent, gated by consent and human QA. That sequence makes Florence look like — and operate as — infrastructure.
