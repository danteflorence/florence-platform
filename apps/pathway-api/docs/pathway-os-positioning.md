# Florence Pathway OS — Positioning & Investor Demo

_The infrastructure story, the slide, and the one-candidate end-to-end demo._

---

## The slide

> ## Pathway OS compresses the administrative route to a U.S. start.
>
> One nurse profile becomes every workflow: university, financing, I-20, DS-160,
> visa appointment, NCLEX / ATT, licensure, endorsement, employer packet.
>
> **AI drafts, validates, routes, and flags. Humans QA exceptions. Candidates
> review and attest. The production ledger forecasts starts.**

It is the missing rail between **"trained nurse"** and **"started U.S. RN."**

## The 30/10

**A production route optimizer for global nurses.** For each nurse it answers:
where is she going · what's the fastest compliant route · what's blocking her ·
what's next · what's her expected start date. (What she's *worth* — subscription,
loan-tape, employer capacity — is answered too, but **only on the internal Control
Tower; the nurse never sees Florence's economics.**)

## The four-system story Pathway OS completes

| System | Answers |
|---|---|
| **Florence Academy** | Who is *ready*. |
| **Pathway OS** | How to get them to a *U.S. start*. ← this product |
| **Florence Capital** | How to *finance* them. |
| **Workforce Economist** | Where employer *demand* is most valuable. |
| **Production Ledger** | What all of it is *worth*. |

---

## The investor demo — one candidate, end-to-end

Hero candidate: **Grace Wanjiru** (Kenya → studies in New York on F-1 → job in
Arizona). She showcases the signature insight: *license where it's fastest (NY, no
SSN), endorse to where the job is (AZ).* Everything below is live in the app today.

**1. One canonical profile.** Open Grace in the Candidate Copilot. The **Profile &
data sharing** card shows every field with its source + confidence ("collect once,
reuse everywhere"), and consent toggles — Capital/employer sharing is **off by
default** (a data invariant, not a promise).

**2. The recommended route.** The **Recommended route** card recommends *"New York
licensure by exam → endorse into Arizona"* [score 109] over AZ-direct [99], with
four stated reasons (NY needs no SSN · she's studying in NY · then endorse to AZ
where the job is · demand confirmed). Transparent scoring — *Florence advises; you
choose.*

**3. The pathway + the clock.** The **Pathway** card renders the dependency graph
and the **critical path** to her start, with the expected date, the days behind,
and the current bottleneck — **schedule only, no economics.**

**4. The radically-simple view.** **"You have N actions this week"** (her part) +
**"Florence is handling N tasks with human review"** (AI/QA/system). The
bureaucracy is hidden; she sees her list.

**5. Evidence-linked drafts + human QA + attestation.** Every workflow (DS-160,
NCLEX/ATT, licensure, **university admission, financing, employer packet**) is an
evidence-linked draft. The **QA Console** shows what the AI drafted, what's missing,
what's sensitive. The candidate **attests** (DS-160 is signed by the applicant in
CEAC — never by Florence).

**6. The consent payoff.** Flip Grace's **Florence Capital** consent on → the
**financing packet assembles live** from her profile (COA, admission, I-20, offer)
under Capital policy. Leave **employer** off → the employer packet stays gated. Same
data, consent-gated, on demand.

**7. The corridor + the deficiency engine.** Her **Kenya corridor** card flags the
NCK verification lead time and 214(b) prep. If a board sends a deficiency, the
**deficiency engine** classifies it, assigns an owner + SLA, and drafts the response.

**8. The Control Tower.** Switch to **Operations**. The **Production rollup**
shows the deck's proof counts live (profiles → qualified → admitted → funded →
I-20-ready → employer-ready → offers → starts) and **expected starts by month**.
The **Production value** card (Internal) shows in-flight cohort value and revenue at
risk. **Regulatory freshness** shows every rule's owner + review date, with stale
rules flagged. This is "what it's worth + where the pipeline is," produced
automatically.

**The close:** one profile in Manila/Nairobi became a routed, QA'd, attested,
financed, employer-ready production pipeline — and the ledger forecasts the start.
That's the infrastructure.

---

## What to lead with (and not)

**Lead with:** "Pathway OS turns one nurse profile into every administrative
workflow required to produce a U.S.-ready RN start." Show the route optimizer and
the Control Tower.

**Do NOT:**
- Lead with "we automate embassy appointments."
- Claim autonomous filing of legal/immigration/licensure applications.
- Use AI to answer sensitive eligibility questions without candidate confirmation.
- Let lenders/employers see profile/Academy data without explicit consent.
- Present financing as an automated/black-box credit decision.
- Overstate timelines — forecasts carry confidence, not guarantees.
- Call every workflow an "agent" in investor materials — say **Pathway OS** /
  *AI-assisted pathway automation*.

---

## Honest gaps to close before this is in front of real users

- **Auth-gate the Operations surface** — it holds Florence's economics; today all
  three tabs are open in the demo build.
- Wire **real notification + document-OCR providers** (currently candidate-reported
  / vision-model-when-configured).
- Ground **exam licensure beyond the 5 wired states** (FL/NY/TX/CA/AZ) and finish
  per-state SSN grounding for the 2 unverified boards (GA, KY).
- Replace **search-extracted regulatory quotes** with verbatim source reads before
  any contractual/published use.
