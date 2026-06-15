# Florence Pathway Agent — Legal Structure & Compliance Memo

**Status: internal decision memo for review with qualified counsel. This is not legal
advice, and Florence Pathway Agent does not itself provide legal advice.**

**Scope.** Florence helps internationally-educated nurses (1) obtain the **F-1 student visa from
abroad** (the consular *nonimmigrant* path: I-20/SEVIS → DS-160 → SEVIS I-901 fee → visa
appointment → interview), and (2) complete **U.S. nursing licensure** (NCLEX/ATT, state boards,
CGFNS credentials evaluation, endorsement). It does **not** handle immigrant or work-visa matters
(EB-3/I-140, adjustment of status, consular immigrant visas) — those are out of scope.

The product is built so that *AI prepares and validates, the candidate signs, and a human QA team
reviews.* That posture is necessary but not sufficient. Three structural decisions should be
settled with counsel **before** this touches a real filing. This memo frames them and records what
the software already enforces.

---

## 1. Unauthorized Practice of Law (UPL) — the go/no-go question

Even though Florence is F-1-only, preparing a **DS-160** and advising on visa-history / eligibility
answers still sits close to **practicing immigration law**. The U.S. has a long enforcement history
against non-lawyer "form preparers," and USCIS warns publicly that **a "notario" is *not* a lawyer**
and that only an attorney or a DOJ/EOIR-accredited representative may give immigration legal advice.
([USCIS — Find Legal Services](https://www.uscis.gov/scams-fraud-and-misconduct/avoid-scams/find-legal-services),
[USCIS — Common Scams](https://www.uscis.gov/scams-fraud-and-misconduct/avoid-scams/common-scams))

"The candidate signs" helps but does not, by itself, resolve UPL — the *advice and judgment* about
how to answer can constitute legal services regardless of who clicks submit.

### Vehicle options to evaluate with counsel
1. **Software-as-a-tool-used-by-attorneys** — Florence licenses the platform to, or partners with,
   an immigration law firm; attorneys own the legal judgment, the tool does preparation and QA.
   Cleanest UPL posture; adds a legal-services cost layer.
2. **DOJ/EOIR-recognized organization with accredited representatives** — a recognized non-profit
   structure. Narrower scope, heavier institutional requirements.
3. **Strict transcription + no legal advice** — the tool only *transcribes* candidate-provided
   facts into the DS-160 and licensure forms, gives no legal conclusions, and routes every judgment
   call to counsel. Lowest cost; requires disciplined product boundaries and careful copy.

Separately, **state nursing-licensure assistance** is generally administrative (not legal practice),
but some states regulate "immigration consultants"; confirm per operating state.

> **Recommendation:** pick the vehicle before scaling. The compliance layer (§4) is compatible with
> all three; the marketing copy, the scope of "advice," and QA staffing differ between them.

---

## 2. Liability & Errors-and-Omissions

When an AI-prepared, human-QA'd filing contains an error that causes a visa denial or a licensure
delay — and therefore delays a billed RN start — **who bears the loss?**

Decisions for counsel:
- **Terms of service / candidate agreement** allocating responsibility (the candidate certifies
  truth and completeness; Florence prepares and checks).
- **E&O / professional liability insurance** sized to filing volume and worst-case (e.g., a
  misrepresentation finding that risks a visa bar).
- **Scope limits** in writing: no guarantee of visa approval, ATT issuance, NCLEX result, or
  licensure — already reflected in the rules' guardrails and the UI disclaimer.

The DS-160 itself frames candidate responsibility: the electronic signature **certifies the answers
are true and correct to the best of the applicant's knowledge**, and false or misleading statements
may result in **permanent refusal or denial of entry**
([DS-160 FAQs](https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/forms/ds-160-online-nonimmigrant-visa-application/ds-160-faqs.html)).
That anchors candidate responsibility and raises the stakes of any prepared answer that is wrong.

---

## 3. Data protection & security

The platform holds passports, government IDs, education and employment history, visa and refusal
history, and SEVIS/I-20 data. This makes it a **high-value breach target** and pulls in obligations
that belong in Phase 0:

- **Cross-border data** — source-country regimes (e.g., GDPR for EU-educated nurses, and other
  national data-protection laws) govern personal data collected abroad. Map lawful basis,
  data-subject rights, and transfer mechanisms.
- **U.S. state privacy laws** — consumer-privacy statutes and breach-notification rules.
- **Consent, retention, deletion, residency** — explicit, revocable consent; documented retention
  and deletion schedules; data-residency decisions.
- **Security baseline** — encryption at rest/in transit, least-privilege access, audit logging
  (already implemented at the application layer), and a path to **SOC 2**.
- **No portal credential handling / no scraping** — the build does **not** log into government
  portals on a candidate's behalf and does **not** scrape or automate appointment systems. Any
  future change here needs explicit authorization, credential-vaulting, per-portal terms review,
  and counsel sign-off.

---

## 4. What the software already enforces (truth-grounding posture)

- **Applicant signs.** The DS-160 workflow marks "Applicant must sign (DS-160)"; the system never
  signs for the candidate. Grounded in the official FAQ language.
- **No fabricated answers.** The Compliance Agent **blocks** any populated, non-sensitive answer
  that has no evidence behind it.
- **Sensitive answers are never auto-filled.** Prior refusal, criminal history, and overstay
  require explicit candidate confirmation and route to escalation.
- **Scoped escalation.** Escalation facts block only the workflows they are relevant to (a visa
  refusal blocks the DS-160, not a state licensure packet).
- **Grounded rules.** Every workflow cites its official source (Dept. of State for the F-1/DS-160,
  NCSBN, CGFNS/TruMerit, and the state boards), and every candidate and reviewer is shown **official
  resource links** plus a route to **legitimate legal help** (USCIS Find Legal Services, DOJ/EOIR
  accredited reps, AILA).
- **Full audit trail.** Every generated answer, edit, QA decision, attestation, and milestone is
  logged. Visa scheduling is guided, never scraped or bulk-booked.

---

## 5. Decision checklist (for counsel)

- [ ] Choose the UPL vehicle (firm partnership / accredited org / transcription-only) and the
      operating states; align marketing copy and the definition of "advice" accordingly.
- [ ] Draft the candidate agreement + ToS (responsibility allocation, no-guarantee language).
- [ ] Set the E&O / professional-liability posture and coverage.
- [ ] Stand up the data-protection program (cross-border lawful basis, retention/deletion,
      residency, consent) and a SOC 2 path.
- [ ] Confirm the line between "preparation/QA" (allowed) and "legal conclusions" (counsel-only)
      and bake any new boundaries into the Compliance Agent.
- [ ] Per-jurisdiction freshness/verification SLA and a named owner for each active licensure rule.

---

## Sources

- U.S. Dept. of State — DS-160 FAQs: https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/forms/ds-160-online-nonimmigrant-visa-application/ds-160-faqs.html
- U.S. Dept. of State — Student Visa (F): https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html
- USCIS — Find Legal Services: https://www.uscis.gov/scams-fraud-and-misconduct/avoid-scams/find-legal-services
- USCIS — Avoid Scams / Common Scams (notario fraud): https://www.uscis.gov/scams-fraud-and-misconduct/avoid-scams/common-scams
- DOJ EOIR — Recognition & Accreditation Program: https://www.justice.gov/eoir/recognition-and-accreditation-program

*Prepared as a working document for the Florence team and its counsel. Confirm all specifics —
immigration and licensure rules change.*
