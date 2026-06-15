# FlorenceRN — University Affiliate Network

**A bottom-up wedge: activate students from eligible schools first, then convert
high-performing schools into official affiliates with data.**

*Builds on `docs/PRODUCTION_OS_ROADMAP.md` (Phase 3 — depth + reach). Planning
doc — no product code changed here.*

---

## 0. What I'm signing up for (the right reframe)

> Eligible-school students/alumni get **preferred access** to Academy Live and
> Live Labs at a **$75 commitment deposit** (vs. $100 standard); the self-guided
> Academy is **always free**. Schools whose students show up get an **aggregated,
> anonymized cohort report** — and the high-performing ones become official
> **FlorenceRN University Affiliates**, with co-branded labs as the expansion
> product.

The wedge is correct: don't wait for an MOU; activate students first; convert
schools with data they didn't have before.

---

## 1. Five places I want to push back before we build

### A. Two tiers, not "partner."  Trademark + endorsement risk is real.
- **Eligible School** = listed; students/alumni qualify for the $75 deposit. **No logo, no "partner" language, no endorsement claim.**
- **Official University Affiliate** = signed affiliation + data-sharing agreement. Logo + co-brand permitted only here.
- Encode this as a hard `tier` field (`eligible | affiliate | lab_partner`) and a separate `logo_use_granted: bool`. **No school logo ever renders without that flag** — server-side enforced.

### B. K-anonymity has to be a product rule, not a guideline.
The plan says "do not show small cells." That cannot be a soft promise. Concretely:
- Hard floor: **`K=10`** for any per-school report by default. Below 10 students/alumni from a school, the dashboard shows the participation count and **nothing else** (no readiness band breakdown, no top gaps, no country-of-residence, no cohort breakdown).
- 10–25: show **bands and gaps** as percent ranges (e.g. "20–40%"), not exact values.
- 25+: full aggregate detail.
- Server-side computed — the client never sees suppressed cells. FERPA/DepEd-style framing in the response (`"suppressed_for_privacy": true`).

### C. Self-attestation alone is easy to game.  Tier the verification, gate the discount.
- **v0 (self-attestation):** candidate picks a school from the directory + ticks "I attest I'm a student/alumna of this school." Deposit dropped to $75 immediately. Logged as `verification: "self_attested"`. Cheap, but anything more than n=1 of self-attestation per school flags a review queue.
- **v1 (email-domain match):** if the school has known `email_domains[]`, a verified candidate email at that domain auto-upgrades to `verification: "email_domain"`. Costs nothing extra given email verification is already shipped.
- **v2 (uploaded evidence + human QA):** transcript / diploma / student-ID image → ops QA. Out of scope for the first cut.
- The school report only counts candidates with verification ≥ v1 toward affiliate-readiness ranking, so v0 abuse doesn't game the school list.

### D. "Discount" is not the headline — access is.
You called this out and you're right. The copy needs to be enforced in the product, not just the deck:
- **"Always-free self-guided Academy"** + **"Preferred Live/Lab access for students and alumni of eligible schools — $75 commitment deposit instead of $100"**.
- Never: "discounted job access," "discounted placement," "scholarship for U.S. employment." Already a standing rule; I'll grep-audit on commit.

### E. This is a wedge, not the revenue thesis.
At 5,000 paid students × $75 = $375K — that's a cash-flow + signal layer, not the model. The financial story is still **monthly RN starts × 24-month subscription cohorts** (already on the Control Tower). The University Affiliate Network is supply-side acquisition + a school-data product, and the deck should keep saying so.

---

## 2. What's already built that the wedge plugs into (don't rebuild)

| Capability | Status | Affiliate use |
|---|---|---|
| Candidate signup (email + password + verification + country) | ✅ | Add `school_slug` + attestation |
| $100 commitment deposit (Stripe-ready, mock today) | ✅ | Tier-derive amount; rest unchanged |
| University partner dashboard (`/#/university`) | ✅ | Becomes the **affiliate** surface; gets per-school filter + K-anon |
| Outcomes funnel + Control Tower | ✅ | "Eligible schools," "Affiliates," "Lab partners" metrics |
| Append-only audit + webhooks + consent/purpose-control | ✅ | Affiliate data-sharing event log |
| CORS-allowed partner portal pattern + scopes | ✅ | `university:read` already exists; reuse it |

So the real new work is the **school directory + tiering + discount engine + K-anonymized per-school report**. The dashboard surface, the auth, the payments — all reused.

---

## 3. Phasing (recommended; each lands behind feature gates so nothing demos until you say so)

**Phase 3a — School directory + eligibility (foundational)**
- `schools` table (slug, name, country, city, programs[], tier, logo_use_granted, email_domains[], min_cohort_size, outreach_status, contact info).
- Admin-scoped CRUD (`schools:write`); public read-only **listing** for the signup picker (slug + name + country only — no contact data).
- A starter directory: just the schools you call out (UP Manila, UST, FEU, CEU, SLCN) loaded via the seed.

**Phase 3b — Tiered deposit + signup attestation**
- Candidate signup gains a school picker (optional) + self-attestation checkbox.
- New: `candidate_school_affiliations` (candidate × school × role[student|alumni] × verification × created_at).
- Deposit amount derived server-side from the candidate's strongest affiliation (eligible-school student/alumni → $7 500, else $10 000). Mock + Stripe both honor it.
- Email-domain auto-upgrade when the verified email matches an `email_domains[]` entry.
- Copy that is **"preferred access," not "discount"** everywhere it appears.

**Phase 3c — K-anonymized per-school report**
- `GET /v1/university/schools/:slug/report` — gated by `university:read` scope + the school's tier.
- Server-side K-anon: <10 → counts only; 10–24 → ranges; 25+ → full detail.
- University dashboard gains a school picker (operator + university views see only the slugs they're allowed to).
- Outreach status (`eligible_listed → contacted → report_sent → discussing → affiliate → lab_partner`) is the school's lifecycle field — visible to ops, not the school.

**Phase 3d — School outreach as ops surface (light CRM)**
- Internal ops page lists schools by outreach status with the **conversion signal** (registered students, paid deposits, average readiness). Click a school → its anonymized report.
- "Ready for outreach" filter: any school with ≥10 students + ≥3 paid deposits + ≥0.65 avg readiness.
- This is the thing that makes the outreach email actually work — Florence walks into the conversation with numbers.

**Phase 3e — Co-branded lab configuration** (defer)
- This is Phase 5 in your own pipeline. Build it **after** the first affiliate signs. No UI value pre-signing.

**Out of scope here** (intentional):
- Country-specific remediation tracks (you said handle separately).
- Lab-day scheduling / inventory.
- Identity-level student outcomes shared with schools (needs per-student consent + signed agreement; not a v1 surface).

---

## 4. Compliance guardrails (non-negotiable)

1. **Two tiers, hard wall.** Logos + "partner/affiliate" language render **only** when `logo_use_granted=true` AND `tier ∈ {affiliate, lab_partner}`.
2. **K-anonymity server-side.** No client-side suppression; the API never returns a small-cell breakdown.
3. **Consent + purpose.** Student-level outcomes never leave Florence for a school without explicit per-student consent + a signed data-sharing agreement on the school record.
4. **PHL/PH NPC + FERPA-style framing.** "Aggregated, anonymized" copy on every page that surfaces school data; a public privacy summary on the eligible-school page.
5. **No "discount = job access."** Always copy as "preferred access to optional Live/Lab participation." The free Academy stays free, named on every paid surface.
6. **No directory takeover.** A school appearing in the eligible list does not endorse Florence; the public list says so plainly.
7. **Outreach status is internal-only.** Schools never see their own outreach status (avoids implying tracking-without-relationship).

---

## 5. Open decisions (you + counsel)

- **Starter eligible-school list.** Which 5–25 schools go in the v0 directory? (You named UP Manila / UST / FEU / CEU / SLCN — confirm; add others?)
- **Logo / "Eligible" badge on the eligible-school list.** I default to **name + country only, no logos** until each school grants `logo_use_granted`. Want a different default?
- **The K floor.** I default to **K=10**. Some products use K=5. Smaller K = more useful early dashboards / higher re-id risk.
- **Email-domain v1 — is it worth doing in the first cut, or strictly self-attestation?** I lean toward "yes, almost free given email verification ships."
- **A privacy notice copy** the eligible-school page links to (yours / counsel's wording).
- **Affiliate / lab-partner agreement template** — out of scope here, but needed before tier promotion.

---

## 6. The bottom-line story (one paragraph)

FlorenceRN does not wait for institutions to create supply. Students from a public list of **Eligible Schools** receive preferred access to optional Live and Lab participation; their participation produces an aggregated, anonymized school report; high-performing schools convert into **Official University Affiliates** and eventually **co-branded Academy Live Labs**. The free self-guided Academy stays free for everyone. The wedge feeds the production system without changing the revenue thesis: monthly RN starts and recurring 24-month employer subscription cohorts remain the model.
