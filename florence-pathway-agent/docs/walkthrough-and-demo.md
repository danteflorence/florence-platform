# Florence Pathway Agent — Walkthrough & Demo Script

A guided "job guide" that takes an internationally-educated nurse from candidate profile to
**F-1 student visa (from abroad)** and **U.S. RN licensure** — prefilling every form it can, handing
the candidate exactly what each external portal needs, validating for accuracy, capturing the
result, and monitoring progress. **AI prepares & validates → the candidate signs → human QA reviews.**

---

## How to run it

```bash
cd ~/florence-work/florence-pathway-agent
npm run dev          # API on :8787, Vite on :5173 (the dev launcher starts both)
# open http://localhost:5173
```

- **Node**: uses the local toolchain at `~/florence-work/.toolchain/node/bin` (Node 24).
- **Database**: Node's built-in `node:sqlite` at `data/pathway.db` (no native deps). Delete the
  file to reseed the 4 demo candidates on next start.
- **LLM**: optional. Set `ANTHROPIC_API_KEY` to use Claude for the candidate explanations, QA
  narrative, deficiency classification, copilot chat, and (future) document vision-extraction.
  Without a key it runs on a deterministic heuristic — the moat is the data + rules, not the prose.
- **Optional env**: `FLORENCE_LEDGER_WEBHOOK` (milestones → FlorenceRN), `FLORENCE_NOTIFY_WEBHOOK`
  (reminders → your email/SMS provider), `ANTHROPIC_MODEL`.

---

## The three surfaces

1. **Candidate Copilot** — the nurse's guided experience: what's next, prefilled forms to review &
   sign, banners that chain through each step, reminders, deadlines, documents, and the journey.
2. **QA Console** — the human reviewer's queue: the full form draft with **evidence + provenance +
   confidence** on every field, consistency/risk flags, missing data, compliance gates, grounded
   sources, an approve / request-changes decision, and a board-deficiency logger.
3. **Operations** — the management view: funnel, bottlenecks, workflows by status/type, escalations,
   the production ledger.

---

## The guided pathway (the arc)

Every chokepoint is a guided, prefilled, validated, monitored step:

> **SEVIS / I-901 fee → DS-160 (review & sign) → CEAC confirmation → visa appointment →
> NCLEX register → ATT & exam scheduling → state licensure (exam or endorsement)**

with **deficiency recovery**, **proactive reminders**, a **document vault**, and a **journey timeline**
running alongside.

---

## What's built (feature map)

**Grounded rules engine.** Every workflow cites its authoritative source with a real URL (Dept. of
State DS-160 FAQ + student visa, USCIS, NCSBN, CGFNS/TruMerit, the state boards, DHS Study in the
States, ICE/FMJfee). Candidates + reviewers see official-resource links and a route to **legitimate
legal help** (USCIS Find Legal Services, DOJ/EOIR, AILA — the anti-"notario" safeguard).

**Consistency engine (the accuracy moat).** Exact name-match across passport / ID / board app /
Pearson (the #1 expensive failure), passport validity, DOB conflicts, employment gaps, date
conflicts, and sensitive-history escalation (prior refusal, criminal, overstay, discipline).
Surname-first vs given-first is correctly *not* flagged.

**SEVIS / I-20 + I-901 fee.** The front door: school I-20 + SEVIS ID captured, the I-901 fee guided
to the official FMJfee.com.

**DS-160 — faithful to the real form.** 13 sections / 53 fields mirroring the State Dept exemplar
(Personal 1&2, Travel, Companions, Previous U.S. Travel, Address & Phone incl. **social media**,
Passport, U.S. Contact, Family, Work/Education ×3, **Security & Background Parts 1–5**, SEVIS). The
**review-and-sign walkthrough** makes the applicant confirm each section and personally answer the
security questions before signing — *the review is the compliance mechanism* (the DS-160 signature
certifies the answers are true). **CEAC confirmation capture** then records the barcode number and
feeds it to the visa appointment.

**Visa appointment.** Guided scheduling: we hand the candidate the DS-160 confirmation number +
suggested consulate + official portal links, and capture the booked interview (monitored as a
deadline). No scraping or auto-booking — compliant by design.

**NCLEX / Pearson.** Guided registration leading with the **exact name** the candidate must use
(catches & fixes the Pearson name mismatch), then **ATT + exam scheduling** at a U.S. test center,
enforcing the ATT validity window.

**State licensure.** Exam (FL/NY/TX/CA/AZ) — prefilled board application + Livescan fingerprinting +
attest & submit, with a **completeness gate** (incomplete → blocked, per Florida's "complete apps
process faster"). Endorsement — a **data-driven 25-state engine** (`shared/endorsement.ts`) grounded
in each board's instructions (TX's NJE + Nursys-as-of-July-2025, Florida's MOBILE Act, MD's Live
Scan #9300000850 + TruMerit/English for IENs, AZ's FD-258, OR's pain-management hour, …), with
**compact-state intelligence** that tells the candidate when a multistate license may skip
endorsement entirely.

**Deficiency handling.** A board deficiency is classified by the AI, drafted into a response, shown
to the candidate ("what the board flagged" + "Florence's drafted response"), and resolved — recorded
on the journey. QA can log a deficiency from the console.

**Proactive reminders.** A reminders panel surfaces the time-sensitive things (ATT/passport/interview/
exam expiring, open deficiencies) with a dispatch hook (`FLORENCE_NOTIFY_WEBHOOK`).

**Documents.** Upload once, reuse across forms; extraction is vision-pluggable (Claude vision when a
key is set).

**Monitoring.** Per-workflow status + progress, the deadline monitor, the **production ledger**
(milestones to FlorenceRN), the Operations funnel, and a full audit trail. The **journey timeline**
shows the candidate's milestones from profile → U.S. RN license.

---

## Demo script (click-through)

**Cast (seeded):** María (Philippines → Florida), Chukwuemeka (Nigeria → New York, has a
deficiency), Aleksandra (Poland, NJ license → Texas endorsement), Priya (India → California).

1. **Open María.** Header shows her pathway + counts. "What we need from you next" leads with **Pay
   the I-901 SEVIS fee** (the first F-1 step). The sidebar **Reminders** flags her ATT (≈18 days) and
   passport; **Deadlines** lists them; **Your journey** shows her milestones; **Your documents** lets
   you upload a passport.
2. **DS-160 review & sign.** Click *Review & sign my DS-160* → walk the 13 sections; note each field's
   **source** (Passport MRZ, I-20). Personally answer the 5 Security questions (try to sign without
   them — it blocks). Sign.
3. **CEAC confirmation.** The banner flips to *DS-160 signed — submit it in CEAC*. Enter a confirmation
   number (e.g. `AA00ABCD12`). The visa-appointment step now has it **on file**.
4. **Visa appointment.** *Schedule visa interview* → we hand back the confirmation number + consulate +
   official links; record a date → it appears as a **monitored deadline**.
5. **NCLEX name-match.** *Register with Pearson* → it catches the **"Maria Garcia"** on file as a
   mismatch and pre-fills her exact legal name; register → the **name-mismatch flag clears**. Then
   *ATT & scheduling* → record the ATT + book a U.S. test center (it enforces the ATT window).
6. **Florida licensure.** *Complete application* → prefilled board app + **Livescan** capture; try to
   submit without fingerprinting (blocked), complete it, attest & submit.
7. **Endorsement (switch to Aleksandra).** *Start endorsement* → **Endorse to Texas**: compact badge,
   her NJ license from record, and the exact TX steps — Nurse Portal, Nursys, DPS/FBI, **NJE**.
8. **Deficiency (switch to Chukwuemeka).** A rose card: *NYSED sent a deficiency notice*. Click
   *Respond* → see the flagged coursework + the AI's drafted plan → mark resolved (lands on the
   journey). Or, in the **QA Console** → open his NY review → **Log a board deficiency** to create one.
9. **QA Console.** Open a review → the full evidence-linked draft, consistency flags (e.g. the Pearson
   mismatch *"WILL fail at the exam"*), missing data, compliance, grounded **Sources**, and the
   approve / request-changes decision.
10. **Operations.** The funnel, bottlenecks, by-status/type, escalations, and the production ledger.

---

## Compliance posture (enforced in code)

- **Applicant signs.** The DS-160 must be personally signed; we never sign for them.
- **No fabrication.** The Compliance Agent blocks any populated, non-sensitive answer with no evidence.
- **Sensitive answers never auto-filled.** Security/refusal/criminal/overstay require the candidate's
  own confirmation and route to escalation.
- **No prohibited automation.** Scheduling is guided, never scraped or bulk-booked; no government-portal
  logins.
- **Audit + grounding everywhere.** Every answer, edit, decision, attestation, and milestone is logged;
  every rule cites its source. See [`docs/legal-structure-and-compliance.md`](legal-structure-and-compliance.md)
  for the UPL / liability / data-protection decisions for counsel.

---

## What needs provisioning (honest gaps)

- **Notification delivery** — the reminder *queue* and dispatch hook are built; actual email/SMS/WhatsApp
  needs a provider (Postmark/Twilio) + candidate consent → wire `FLORENCE_NOTIFY_WEBHOOK`.
- **Document vision-extraction** — upload + storage + a pluggable extraction interface are built; real
  OCR/field-extraction runs when `ANTHROPIC_API_KEY` is set (Claude vision). Binary file storage is a
  metadata stub in the demo.
- **Live portal status** — there are no partner APIs for CEAC / Pearson / embassy portals; status is
  candidate-reported by design (we forbid scraping).
- **Endorsement state coverage** — 25 states grounded; the rest fall back to the generic rule. Each
  active jurisdiction needs a named owner + a freshness SLA (board rules change).
- **Legal vehicle** — pick the UPL structure (firm partnership / accredited org / transcription-only)
  before production. See the legal memo.
