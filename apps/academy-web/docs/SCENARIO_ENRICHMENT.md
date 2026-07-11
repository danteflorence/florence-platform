# Batch Scenario Enrichment

How the 125 skeleton drafts from the purchased-pack conversion became
genuinely playable virtual-patient scenarios, and what still needs a human.

## What it does

The purchased-pack conversion (SS-5) produced 125 valid but skeletal drafts:
right shape, placeholder text ("Edit: ..."), garbage auto-detected vitals, one
trivial rule, no real deterioration arc. Enrichment turns each into a
**playable** scenario using the persona + physiology + generator stack:

1. `draftToSeed(draft)` (`src/lib/vpatient/enrichDrafts.ts`, unit-tested) reads
   the title + chart text and infers:
   - the **clinical insult** (heuristic keyword map over the BioGears-derived
     insult set),
   - the closest **MetaHuman persona** (by age within the draft's sex),
   - the **care setting** (unit).
2. `buildPlayableScenario(seed)` (`src/lib/vpatient/scenarioGen.ts`) composes a
   full scenario: the persona's baseline vitals, a physiology-projected
   deterioration (`projectInsult`), a standard **recognize → escalate → treat →
   reassess** action set + rules (winnable *and* losable), an NCJMM rubric with
   error-taxonomy tags, and a debrief.

Every output validates clean and stays `status: "draft"` - auto-generated
clinical content still needs an SME to confirm the model before it goes live.

## How to (re)run

Enrichment rewrites the gitignored drafts in place. It's a vitest file gated
behind an env flag so it never runs in the normal suite:

```
ENRICH_RUN=1 npx vitest run src/lib/vpatient/enrichDrafts.run.test.ts
```

The pure mapping (`draftToSeed`) and the generator are covered by the normal
suite (`enrichDrafts.test.ts`, `scenarioGen.test.ts`).

## Last run

125 drafts → **125 enriched, 0 invalid.**

Insult distribution (heuristic):

| insult | count |
|--------|-------|
| infection_sepsis | 81 |
| asthma_attack | 20 |
| hemorrhage | 10 |
| pain | 6 |
| tbi | 5 |
| airway_obstruction | 2 |
| cardiac_arrest | 1 |

Care-setting distribution: med_surg 77, pediatrics 27, oncology 7,
labor_delivery 7, primary_care 3, home_health 2, micu 1, hospice 1.

## What the SME must confirm (the honest caveats)

- **Insult mapping is a heuristic.** It gets the *deteriorating-patient shape*
  right and a plausible model, but 81 drafts fell to the `infection_sepsis`
  fallback because their titles had no clear insult keyword. Many of those are
  really cardiac, metabolic (DKA), anaphylaxis, etc. that our current 10-insult
  BioGears set doesn't name. The SME re-selects the correct insult where it
  matters; the physiology + rubric regenerate from that choice.
- **Vitals + windows** are persona-modulated projections, not chart-verified
  numbers. Confirm against the source scenario.
- **Cue/chart prose** is generated ("Auto-generated draft from ..."). The SME
  writes the real handoff, the patient's words, and the specific assessment
  findings.
- **Recast identity.** Each patient was recast onto a MetaHuman persona (the
  point of the swappable cast). Confirm the recast fits the teaching intent.

Approve via the same QA gate as the five hand-built scenarios: a draft is
invisible to learners until an SME flips it to `approved`.
