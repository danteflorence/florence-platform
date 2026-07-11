# NCLEX Review Plan — mapping sims to the test plan + CJMM grading

Answers: *"assign some scenarios to NCLEX review each day, map ~100 scenarios to
the NCLEX sections, grade them with the NCSBN Clinical Judgment Model, with
examples."* Yes — and the data model already supports it; this wires it up.

## Is a daily "sim of the day" accretive? Yes.

Deliberate practice + a structured debrief is the highest-effect-size lever we
have, and a virtual patient generates the `by_cjmm` signal that multiple-choice
items can't (you can't watch a learner *recognize cues* on an MCQ). Pairing each
review day with one scored sim, then debriefing it against the CJMM, is exactly
the loop the evidence rewards. The sim is the *clinical-judgment* rep; the MCQ
banks stay the *content-coverage* reps.

## How the mapping works (no new tagging)

Every scenario already carries a `clientNeed` — one of the 8 NCLEX-RN test-plan
sub-categories — and an NCJMM-typed rubric. So:

- **`groupByNclexSection(scenarios)`** buckets the library by NCLEX section,
  ordered by real test-plan weight, with an exemplar per section.
- **`buildReviewPlan(scenarios, days)`** lays out an N-day block, apportioning
  days to sections by the NCLEX-RN proportions (largest-remainder), rotating
  through each section's scenarios. Deterministic.
- **`cjmmScorecard(evaluation)`** (in `score.ts`) returns all 6 CJMM steps in
  model order with the learner's score per step (or null if the scenario didn't
  exercise that step).

All in `src/lib/vpatient/nclexReviewPlan.ts` + `score.ts`, unit-tested.

## The library's real shape (honest)

Enriching the 125 purchased scenarios (`enrichDrafts.ts` now infers the section
from the title + insult) lands them where acute deterioration actually lives:

| NCLEX section | sims |
|---|---|
| Physiological Adaptation | 115 |
| Pharmacological & Parenteral Therapies | 6 |
| Reduction of Risk Potential | 2 |
| Basic Care & Comfort | 1 |
| Health Promotion & Maintenance | 1 |

This is correct, not a gap: **simulations are the right tool for Physiological
Integrity, Management of Care, and Safety** — the deteriorating-patient,
escalate-and-treat sections. The lighter sections (Psychosocial, Health
Promotion) are better served by our NGN/MCQ banks, which are already tagged by
`clientNeed`. So the daily plan pairs a **sim of the day** (physiological-heavy)
with **MCQ/NGN sets** drawn from the lighter sections — full test-plan coverage,
each tool where it's strongest. (As the SME re-labels scenarios that are really
delegation/teaching/psychosocial, the sim spread widens automatically.)

## Grading: the CJMM scorecard + weighted critical elements

Two complementary layers, both already in the engine:

1. **CJMM scorecard** — the 6 NCSBN Clinical Judgment layers, scored 0–1 from the
   rubric decisions (`recognize-cues → analyze-cues → prioritize-hypotheses →
   generate-solutions → take-actions → evaluate-outcomes`). This is the
   "graded with the NCSBN model" view, and it maps 1:1 onto the NGN item types.
2. **Weighted critical elements** — each rubric decision has a `weight` and an
   error-taxonomy tag, and safety-critical decisions can fail-close (`failIfFlag`,
   `harmfulActions`). That mirrors the weighted-checklist rubrics in the sim
   templates you shared (starred critical elements, S/U with feedback): a learner
   can score well overall and still fail on a missed *critical* element.

### Worked CJMM scorecard (sepsis, a partial run)

| # | CJMM step | Score |
|---|---|---|
| 1 | Recognize cues | e.g. 1.0 (caught the wound/labs/urine) |
| 2 | Analyze cues | 0.5 |
| 3 | Prioritize hypotheses | — (n/a this run) |
| 4 | Generate solutions | 1.0 |
| 5 | Take actions | 0.0 (missed timely escalation) |
| 6 | Evaluate outcomes | — |

The debrief reads down this column: "your recognition was strong, but you didn't
*take action* in time — that's the layer to drill." That's the accretive part —
not a single grade, but a per-layer diagnosis that routes to remediation.

## A sample 10-day block (mechanics)

`buildReviewPlan(library, 10)` weights days toward the heavy sections. With the
current library it's Physiological-Integrity-heavy, e.g. Day 1 Management of
Care (if present) → Days 2–8 Physiological (sepsis, HF, hemorrhage, respiratory,
neuro, hypovolemia, home-health) → Day 9 Pharmacological (a titration/analgesia
sim) → Day 10 Reduction of Risk (a post-op/airway sim), each paired with MCQ
sets for the day's section. Swap the day count to fit the real Manila block
(4-week residency, Oct 5–30).

## What's built vs. next

- **Built + tested:** `groupByNclexSection`, `buildReviewPlan`, `cjmmScorecard`;
  clientNeed inference on the 125-draft enrichment; distribution above.
- **Next (small):** an instructor "Review Planner" surface that renders the plan
  and a learner "Sim of the Day" card on the daily review screen; import the
  enriched drafts into the scenario registry so the plan spans the full 130 (they
  live as gitignored JSON today).
