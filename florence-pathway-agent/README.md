# Florence Pathway Agent

**AI-assisted administrative automation for the FlorenceRN nurse pipeline.** It turns a
candidate's already-collected profile into QA-ready **F-1 student-visa** and **nursing-licensure**
workflows: DS-160, visa appointment, NCLEX/ATT, state licensure, CGFNS, and endorsement.

The defensible posture, enforced in code:

> **The AI prepares, validates, explains, and routes. The candidate signs.
> A human QA team reviews. The system submits only where rules, authorization,
> and law allow.**

It is **not** a black-box bot that files government forms or books appointments on its own.

---

## Scope

Florence helps internationally-educated nurses do two things, and only these:

1. **Get the F-1 student visa, from abroad** — the consular *nonimmigrant* path: I-20 / SEVIS →
   **DS-160** → SEVIS I-901 fee → **visa appointment** → interview prep. The applicant signs and
   submits their own DS-160; Florence prepares, validates, and explains.
2. **Become a licensed U.S. RN** — **NCLEX/ATT** registration with exact-name validation, the
   **state licensure boards** (Florida, New York, Texas, California, Arizona + endorsement), and
   the **CGFNS credentials evaluation**.

It does **not** handle immigrant or work visas (EB-3/I-140, adjustment of status, consular immigrant
visas) — that's a different product with a different legal posture.

### Grounded in official sources

Every workflow cites its **authoritative source with a real URL** — U.S. Dept. of State (the DS-160
FAQs, with the verified signature/accuracy language, and the F student-visa process), NCSBN (ATT
validity, Pearson registration), CGFNS/TruMerit (credentials evaluation), and each state board
(FL/NY/TX/CA/AZ). Candidates and QA reviewers see the **official resource links** for every
workflow, plus a route to **legitimate legal help** drawn from USCIS's own anti-"notario" guidance
(USCIS Find Legal Services, DOJ/EOIR accredited reps, AILA). See
[`docs/legal-structure-and-compliance.md`](docs/legal-structure-and-compliance.md) for the UPL /
liability / data-protection decisions for counsel.

State boards in the engine: **Florida, New York, Texas, California, Arizona** (data model ready for
the rest; activate a jurisdiction only with a named owner + a freshness SLA).

---

## Architecture

```
shared/                 Canonical domain model + rules (shared by server & client)
  types.ts              Every entity; evidence-linked, provenance-tracked answers
  rules/                Data-driven jurisdiction rules (10 workflows)
  workflow-defs.ts      Workflow step templates + QA status taxonomy
  views.ts              API payload shapes for each surface

server/                 Express API on Node's built-in node:sqlite (no native deps)
  db.ts                 The Phase-0 data model as real SQL tables + typed store
  agents/               The nine specialized agents (see below)
  llm/                  Pluggable LLM provider: live Claude, or deterministic fallback
  views.ts              Read-model assembly for the three surfaces
  routes/               REST API (forms, QA, attestation, deficiency, admin, ledger)
  seedData.ts           Three demo candidates engineered to exercise every agent

src/                    Vite + React + Tailwind front-end (3 surfaces)
  surfaces/candidate/   Candidate Copilot — checklist, sign/attest, chat copilot
  surfaces/qa/          Human QA Console — evidence-linked review + decisions
  surfaces/admin/       Operations — funnel, bottlenecks, ledger, audit feed
```

### The nine agents (`server/agents/`)

| Agent | Role |
|---|---|
| **Data Extraction** | Assembles normalized facts (incl. every name spelling) from all sources |
| **Form Mapping** | Maps profile → jurisdiction form fields; never invents a value |
| **Missing Data** | Turns gaps into targeted, plain-language candidate questions |
| **Consistency** | Cross-document contradiction detection — the name-match engine + passport validity, DOB, gaps, sensitive history |
| **Workflow** | Instantiates templates, advances status, computes next actions |
| **Candidate Guide** | Plain-language step explanations + the copilot chat briefing |
| **QA** | Builds the human-reviewer summary: answers, sources, risks, recommendation |
| **Compliance** | Enforces applicant-signs, no-fabrication, sensitive-escalation, scoped blocking |
| **Status** | Monitors ATT validity, passport expiry, and deadlines |

The deterministic core (mapping, consistency, missing-data, workflow, compliance, status) needs
**no LLM at all** — the moat is the data model + cross-document checking. The LLM is used only for
candidate-facing prose, the QA narrative, deficiency classification, and chat; it degrades to an
honest heuristic when no API key is present.

### The marquee check

The **exact name-match validator** compares the candidate's name across passport, national ID,
board application, and Pearson registration (diacritic- and order-aware). A Pearson↔passport
mismatch is flagged as *"this WILL fail at the exam appointment"* — a common, expensive,
deterministic failure mode.

---

## Compliance guardrails (enforced in code)

- The applicant must personally sign and submit their own **DS-160** — the system never signs.
- **No fabricated answers**: a populated, non-sensitive field with no evidence is blocked.
- **Sensitive answers** (prior refusal, criminal, overstay, discipline) are never auto-filled and
  require explicit candidate confirmation.
- **Escalation facts block automated progress** — but only for the workflows they're relevant to
  (a visa refusal blocks the DS-160, not a state licensure packet).
- Every generated answer, edit, QA decision, attestation, and milestone is **audit-logged**.
- No scraping / CAPTCHA-bypass / bulk appointment booking — visa scheduling is **guided**.

> These do not replace counsel. F-1 and licensure specifics change — confirm with qualified
> immigration counsel and the relevant state board. This software organizes and validates; it
> does not provide legal conclusions.

---

## Run it

Requires the local toolchain Node (v24, for built-in `node:sqlite`).

```bash
npm install
npm run dev          # API on :8787 + Vite on :5173 (proxied)
# open http://localhost:5173
```

Other scripts:

```bash
npm run api          # API only (node --experimental-sqlite --watch ...)
npm run web          # Vite only
npm run typecheck    # tsc --noEmit (passes clean)
npm run seed         # seed demo data into a fresh data/pathway.db
```

### Optional: live Claude

The app runs fully without a key (deterministic provider). To enable the LLM-backed agents:

```bash
cp .env.example .env
# set ANTHROPIC_API_KEY=...   (model defaults to claude-opus-4-8)
```

The header chip shows **Claude** or **Heuristic** so you always know which provider is active.

---

## API surface (selected)

```
GET  /api/meta                          rules + workflow meta + llm mode
GET  /api/candidates                    candidate summaries
POST /api/candidates                    create candidate
GET  /api/candidates/:id/view           Candidate Copilot payload
POST /api/candidates/:id/chat           copilot reply
POST /api/workflows                     create workflow + run pipeline
POST /api/workflows/:id/answer          candidate answers a missing field
POST /api/workflows/:id/attest          candidate attestation / signature
POST /api/workflows/:id/submit          submission event + ledger milestone
POST /api/workflows/:id/deficiency      classify a board deficiency notice
GET  /api/qa/queue                      review queue (risk-sorted)
GET  /api/qa/reviews/:id                evidence-linked review detail
POST /api/qa/reviews/:id/decide         approve / request changes
GET  /api/admin/metrics                 funnel, bottlenecks, throughput
GET  /api/admin/ledger                  production-ledger milestones
GET  /api/admin/audit                   audit feed
```

Milestones are recorded locally and POSTed to `FLORENCE_LEDGER_WEBHOOK` if set — the integration
point for the FlorenceRN production ledger.

---

## The three surfaces

- **Candidate Copilot** — what we need next, a checklist, the items you must personally review and
  sign, your pathway progress, deadlines, and a chat copilot.
- **Human QA Console** — a risk-sorted queue and an evidence-linked review where every answer shows
  its source, confidence, and provenance, with one-click approve / request-changes.
- **Operations** — the production view: funnel, bottlenecks, throughput by workflow, the ledger,
  and a live audit feed.

---

## Status

This is a working vertical slice (MVP scope: F-1 front-end — DS-160 + visa appointment; NCLEX/ATT;
state licensure for Florida, New York, Texas, California, and Arizona; CGFNS credentials evaluation;
endorsement; the QA console; the candidate copilot; and ledger integration). The licensure rules are
a **data model** ready for expansion; only verified jurisdictions should be activated, each with a
named owner and a freshness SLA. No live government-portal integrations are included by design —
those are guided/checklist until an official API or counsel-approved automation path exists.
