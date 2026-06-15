# Florence Pathway OS — Build-Out Plan

_Integrating the "route-control layer" feedback into a sequenced plan, grounded in the
code we already have in `~/florence-work/florence-pathway-agent`._

---

## 0. The reframe

**From** "Pathway Agent — AI fills out DS-160s" **to** **Pathway OS — the critical-path
operating system for global nurse production.**

> Florence Pathway OS turns one global nurse profile into every administrative workflow
> required to produce a U.S.-ready RN start. AI drafts, validates, routes, and flags;
> humans QA exceptions; candidates review and attest; the production ledger updates
> automatically.

It is the missing rail between **"trained nurse"** and **"started U.S. RN."** It answers
six questions per candidate: _Where is she going? What's the fastest compliant route?
What's blocking her? What's next? What's her expected start date? What is she worth
(subscription, loan-tape, employer capacity)?_

The four-system story it completes:
- **Florence Academy** → who is _ready_.
- **Pathway OS** → how to get them to a _U.S. start_ (this product).
- **Florence Capital** → how to _finance_ them.
- **Workforce Economist** → where employer _demand_ is most valuable.
- **Production Ledger** → what all of it is _worth_.

**Naming discipline:** investor-facing = "Pathway OS" / "AI-assisted pathway automation."
Reserve "agent" for internal/engineering. Never "we file your visa/license."

---

## 1. What we already have (honest map — don't rebuild this)

The regulated-workflow spine is real and shipping. The elevation is _on top_ of it.

| Vision asks for | Status in code today |
|---|---|
| Evidence-linked, per-field drafts | **Built** — `FormAnswer { value, status, confidence, evidence[], sensitive, reviewerApproved, candidateAttested }` across every workflow |
| Human QA as a console | **Built** — QA Console surface (evidence-linked review, approve / request changes) |
| Candidate attestation embedded | **Built** — `review-and-sign`, DS-160 CEAC signature, compliance agent enforces "candidate signs, AI never signs for them" |
| Precise NCLEX/ATT dependency modeling | **Built** — board eligibility → Pearson registration → ATT → schedule → pass, with the name-match showpiece |
| State licensure + endorsement | **Built** — 5 exam states (data-driven rules) + 25-state endorsement engine (`shared/endorsement.ts`) |
| SSN/ITIN per-state policy | **Built** — 25 states grounded w/ sources, never-collect boolean (`shared/ssn-policy.ts`) |
| Arrival phasing (abroad vs in-US) | **Built** — `arrivalStatus`, after-arrival card, in-person/SSN gating |
| Choose-your-state common engine | **Built** — pick state → route exam/endorsement → pre-filled pathway |
| Production ledger + ops view | **Built (partial)** — `LedgerMilestone` + `pushMilestone` + Operations dashboard (funnel, bottlenecks) |
| Deficiency handling | **Built (partial)** — log + response-draft + resolve; not yet classify/ingest/SLA |
| Source-of-truth profile | **Partial** — `CandidateDossier` exists; lacks per-field provenance + usage/consent |
| Regulatory freshness | **Partial** — rules cite official URLs + some last-verified; not full governance |

**Takeaway:** roughly half the 18 themes are built or partially built. The "sui generis"
gap is four layers: **(a) provenance+consent profile, (b) pathway graph, (c) route
recommender, (d) new route domains (university / financing / employer).**

---

## 2. Keystone architecture (the load-bearing decisions)

### 2.1 Canonical profile with provenance + usage-scope (THE keystone)
"Collect once, reuse everywhere" only works if every field carries governance. Extend the
profile so each field is a record, not a bare value:

```ts
interface FieldRecord<T> {
  value: T | null
  sourceDoc?: string          // passport scan, transcript, candidate input…
  confidence: 'high' | 'medium' | 'low' | 'none'
  lastVerifiedAt?: string
  verifiedBy?: string         // human reviewer id / 'system'
  candidateConfirmed: boolean
  usage: {                    // consent-gated reuse — the safety layer
    underwriting: boolean     // may Florence Capital see this?
    employer: boolean         // may an employer/ATS see this?
    visa: boolean
    education: boolean
  }
}
```
This is the unsexy piece that makes Capital + employer reuse _legal and safe_ ("don't let
lenders/employers see Academy data without explicit consent" becomes a field flag, not a
policy hope). Everything downstream reads from here.

### 2.2 Pathway graph (dependency DAG, not a checklist)
Model each candidate's route as nodes + edges, branchable by state / exam-vs-endorsement /
abroad-vs-US / employer type / readiness band:

```
admission → I-20 → financing → DS-160 → visa appt → visa decision
          → NCLEX/ATT → licensure/endorsement → employer packet → START
```
The graph computes: current node · next required node · **critical path** · blocked nodes ·
expected days per edge · QA owner · revenue impact. This is "Google Maps for nurse
production." It powers the Passport, the clock, and the optimizer.

### 2.3 Route recommender — transparent, rules-first (NOT a black box)
Recommends the best route, scoring candidate routes across: speed · cost · approval
probability · readiness · employer demand · licensure complexity · visa timing · financing
eligibility · expected subscription value · loan-tape eligibility. **Start heuristic/
explainable** (every recommendation shows its reasons); do not ship an opaque ML optimizer.

### 2.4 Ledger event spine
Every workflow milestone emits a ledger event (admitted, I-20 issued, DS-160 confirmation
captured, ATT issued, license issued, offer received, start scheduled…). The Control Tower
and Pathway Passport are _derived_ from the event stream, never hand-maintained.

### 2.5 Rule/source freshness governance
Every rule/playbook entry carries: source URL · owner · last-verified · effective date ·
next review · confidence · active/inactive · requires-counsel. (We already cite URLs;
this makes it a governed layer.)

---

## 3. The 18 themes → built / extend / net-new

| # | Theme | Disposition |
|---|---|---|
| 1 | Canonical profile (source of truth) | **Extend** — add `FieldRecord` provenance + usage/consent |
| 2 | Pathway graph | **Net-new** — DAG + critical path |
| 3 | Route optimizer | **Net-new** — heuristic recommender first |
| 4 | Evidence-linked packet generator | **Built** — extend to new packet types |
| 5 | Human QA as first-class OS | **Built** — add revenue/SLA sort + escalation actions |
| 6 | Candidate attestation embedded | **Built** — keep, extend to new domains |
| 7 | Pathway Passport | **Net-new** — unified status + one summary band |
| 8 | Florence Capital integration | **Net-new** — financing packet from profile |
| 9 | Employer / ATS integration | **Net-new** — employer packet + ATS interface |
| 10 | Critical-path clock | **Extend** — start forecast + delay + revenue-at-risk |
| 11 | Country + state playbooks | **Partial** — state engines exist; country net-new |
| 12 | Deficiency response engine | **Partial** — add classify/ingest/SLA/owner |
| 13 | Regulatory freshness layer | **Partial** — add governance fields |
| 14 | Ledger event per milestone | **Partial** — extend coverage + new domains |
| 15 | Candidate radical simplicity | **Extend** — "3 actions / N background" view |
| 16 | Investor demo (full route) | **Extend** — end-to-end + Control Tower |
| 17 | Positioning slide / naming | **Net-new** — Pathway OS story |
| 18 | What-not-to-do guardrails | **Mostly enforced** — add consent gating + naming |

---

## 4. Phased roadmap (each phase ships something demoable)

### Phase 1 — Foundation & keystone _(consolidation + the profile layer)_
- Rename surfaces/story to **Pathway OS**.
- Canonical profile **`FieldRecord` provenance + usage/consent** layer.
- **Pathway Passport**: one card per candidate aggregating every workflow's status into a
  single band: _not started → pathway building → QA needed → candidate action → start-ready._
- Consolidate **ledger events** so all current milestones emit consistently.
- _Why first:_ the keystone everything reuses; mostly extends existing structures.

### Phase 2 — The graph, the clock, candidate simplicity _(the "infrastructure" feel)_
- **Pathway graph engine** (nodes/edges/critical-path/blocked).
- **Critical-path clock**: expected start date, delay risk, current bottleneck, next human
  action, **revenue/ARR at risk** (ties product → financial model).
- **Candidate view** collapses to "_You have 3 actions this week_" + "_Florence is handling
  N background tasks with human review._"
- _Why:_ turns the existing workflow list into the "Google Maps" experience; high demo value.

### Phase 3 — New route domains _(extend the route to the full rail)_
- New evidence-linked, QA-gated, attestation-aware workflow types: **university admission**,
  **financing packet**, **employer-ready packet**.
- **Florence Capital** + **employer/ATS** as clean _interfaces/stubs_ (AI-assisted packet
  prep under human governance — no autonomous decisions, no black-box).
- _Why:_ this is what makes it the OS for the _whole_ production system, not just visa+license.

### Phase 4 — Recommender, playbooks, deficiency engine, freshness
- **Route recommender** (transparent scoring) — needs the graph (P2) + playbook data.
- **Country playbooks** (PH, IN, KE, NP, NG, GH) + **state playbooks** (finish 50 states with
  owner/last-verified/processing-time/fees/expiration).
- **Deficiency response engine** (classify → checklist → owner → draft → QA → SLA → ledger).
- **Freshness governance** fields across rules/playbooks.

### Phase 5 — Investor demo & Control Tower
- One candidate (Maria, Manila) end-to-end: profile → Academy Green → route recommended →
  drafts (university, financing, DS-160) → QA approves → attest → NCLEX/ATT → employer packet →
  ledger updates → **Control Tower shows expected start + ARR**.
- The **positioning slide** ("Pathway OS compresses the administrative route to a U.S. start").

**Demo spine (chosen): any source country → New York licensure (by exam) → Arizona
(by endorsement) → AZ employer start.** This is the route recommender's flagship case: New
York requires **no SSN** (`not_required`), so it's the fastest first-license on-ramp for an
F-1 nurse; once NY-licensed she **endorses into Arizona** (where the employer demand is, and
AZ accepts a no-SSN affidavit). The system should _recommend NY-first not because the nurse
asked for NY, but because it's the fastest compliant route to an AZ start._ Both engines
already exist (`newyork_rn_exam`, AZ endorsement) — Phase 2's pathway graph models the
two-step exam→endorsement route. Build this lane end-to-end before widening corridors/states.

---

## 5. Guardrails (the "what not to do," enforced in code)

- **No autonomous filing** of legal/immigration/licensure applications. AI prepares &
  validates; candidate attests; human QA reviews. (Already the compliance posture.)
- **DS-160:** "prepare + quality-check + guide to applicant signature," never "we file."
  CEAC requires the applicant to click _Sign Application_.
- **NCLEX:** keep the steps distinct — board eligibility ≠ Pearson registration ≠ ATT issued
  ≠ scheduled ≠ passed. Precision here is part of the infrastructure value.
- **No black-box underwriting.** "AI-assisted packet preparation and routing under Florence
  Capital policy and human governance."
- **Consent gating:** lenders/employers never see Academy/profile data without the field's
  `usage` flag set. (Now a data invariant, not a hope.)
- **No timeline guarantees** — forecasts with confidence bands, not promises.
- **Naming:** "Pathway OS / AI-assisted pathway automation" in investor materials.

---

## 6. Critical review (risks & judgment calls)

- **Breadth-before-depth is the #1 risk.** The vision spans 6 corridors, 50 states, Capital,
  and employer ATS. Build the _one-lane spine_ end-to-end first; widening is data entry after
  the engine works.
- **The optimizer is the hardest and most data-hungry piece.** Approval probability, employer
  demand, and financing eligibility are partly external (Workforce Economist, Capital policy).
  Ship a **transparent heuristic recommender** now; upgrade to learned scoring only once we
  have outcome data. Avoid the black-box trap (their own guidance).
- **External integrations should be interfaces, not blockers.** Workday/Taleo/iCIMS, Capital
  underwriting, and demand feeds get clean adapter boundaries + stubs; the core build never
  waits on a partner API.
- **The provenance+consent layer is the cheap keystone that's easy to skip.** Do it first —
  it's what makes the Capital and employer stories defensible.
- **We're consolidating, not greenfielding.** Profile, ledger, QA, attestation, and the
  25-state engines exist; Phases 1–2 are largely composition of what's there + the graph.

---

## 7. Recommended first increment

**Phase 1, starting with the profile keystone + Pathway Passport + rename.** Concretely:
1. `FieldRecord` provenance/consent type + migrate the profile to it (backward-compatible).
2. Pathway Passport view (aggregate existing workflow statuses → one band).
3. Rename to Pathway OS across the three surfaces.
4. Ledger-event consistency pass.

Then Phase 2 (graph + clock + candidate simplicity) is where it visibly becomes "the OS."

**Open decisions for you:** (a) the demo-spine corridor/state/employer; (b) whether to start
with this profile keystone or jump to the visible graph/clock for demo impact first.
