# Scenario batch conversion

> **📜 Superseded by `SCENARIO_ENRICHMENT.md`.** The skeleton drafts this describes have since been enriched into PLAYABLE scenarios (persona + physiology + rubric + inferred NCLEX section). This file remains as the record of the original conversion run.

The purchased/licensed clinical-simulation pack (~130 documents across 14
clinical categories) run through the Scenario Studio's own ingest pipeline.

## What this produces

**Auto-drafted skeleton scenarios**, one per source document, in our
`VPatientScenario` schema. Each draft carries:

- the real **title** (from the filename)
- **vitals** detected from the document text (HR / BP / RR / SpO₂) where present
- the **patient name / age / sex** where the form states them
- a valid one-phase shell with `Edit:` placeholders for the cues, actions,
  phases, rules, and rubric

They are **starting points**, not finished scenarios. The bar is the four
hand-authored gold scenarios (`sepsis01`, `hf01`, `hemorrhage01`,
`hypovolemic01`); these drafts exist so an instructor (or the conversational
author) never starts from a blank page, and every one is **status `draft`** —
a clinical SME approves each before a learner ever sees it.

## Results (last run)

| | count |
|---|---|
| Documents processed | 134 |
| Valid draft skeletons | **125** |
| Vitals auto-detected from text | 89 |
| Needs manual attention | 9 |

Valid drafts by category: Medical Surgical 34 · Pediatrics 16 · root-level 15 ·
Leadership 9 · Perinatal 9 · Fundamentals 8 · LGBTQ 8 · Multidisciplinary 7 ·
Ambulatory 6 · Critical Care 6 · ED 4 · Implicit Bias 2 · Perioperative 1.

The **9 that need manual attention** are all scanned/image-only Kansas PDFs
with no embedded text (OCR would be required): Air Leak Syndrome, Head Injury
(×2), IV Medication Review, Intermediate Med-Surg, Pediatric Diabetic, and the
three Code Pink perinatal scenarios. Paste their text into the Studio to draft
them.

## Licensing

The licensed **source documents are never committed** to the repo. Only our own
schema drafts (which express clinical *facts* — vitals, presentations — that are
not copyrightable) are written, to a **gitignored** directory
(`apps/academy-web/data/authored-drafts/`). Nothing here redistributes the
purchased content.

## Re-run / load into the library

Convert (writes drafts + `MANIFEST.json` to the gitignored dir):

```
node scripts/convertScenarios.ts "<pack dir>" [outDir]
```

Bulk-import the drafts into a running API so they appear in the Studio library
(all as `draft`, pending SME approval):

```
API_URL=http://localhost:8088 CLIENT_ID=… CLIENT_SECRET=… \
  node scripts/bulkImportScenarios.ts [draftsDir]
```
