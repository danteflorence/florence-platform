# Clinical Judgment Walkthroughs

Every question becomes a mini clinical-judgment lesson: the 6 NCSBN Clinical Judgment
Model (NCJMM) steps, why the correct answer wins, **why each distractor fails and the
reasoning error you made if you picked it**, what to review next — narrated. The product
doesn't just explain the item; it **diagnoses the learner's reasoning failure** and routes
remediation to the exact gap.

> **Measure, don't claim.** This is the highest-probability instructional upgrade; we
> *measure* whether it lifts readiness + NCLEX pass probability (cohort data asset +
> item analytics) rather than asserting the outcome.

## Record shape (`api/src/walkthroughTypes.ts`, table `question_walkthroughs`)
- `clinical_judgment` — the 6 steps: `recognize_cues {text, cues[]}` → `analyze_cues` →
  `prioritize_hypotheses` → `generate_solutions` → `take_action` → `evaluate_outcomes`.
- `answer_choice_analysis[]` — per option: `{ optionIndex, isCorrect, why_wrong_or_right,
  error_type_if_chosen, remediation_tags[] }`. **`isCorrect` comes from the answer key
  (`gradeQuestion` / the bank's `correct`), never the model.**
- `standard_rationale` (quick layer), `teach_back`, `what_to_review_next`, `linked_content`.
- Workflow: `status` `draft → sme_reviewed → approved → rejected`; `provenance`
  `templated | ai_drafted`; `content_hash` (idempotency + audio cache key); reviewer stamps.

## Error taxonomy (`ErrorType`)
`missed_cue · misread_cue · priority_error · scope_error · safety_error · content_gap ·
over_treatment · under_treatment · distractor_bias · treating_symptom_not_cause ·
unsafe_delay`. Each has a learner-facing label + meaning (`ERROR_TYPE_LABEL`). The
chosen-distractor error type drives the "what error you made" panel + (R1) error-typed
remediation.

## Generation + QA pipeline
1. `scripts/generate-walkthroughs.ts` — **templated** (lab/dose/drug, deterministic →
   auto-approved) or **AI-drafted** (`src/llm.ts`: Anthropic when `ANTHROPIC_API_KEY`,
   else a deterministic heuristic; mock-by-default). Idempotent via `content_hash`.
2. Two-stage human QA (the AI path): nurse-educator **sme-review** → clinical-editor
   **approve** (routes under `/v1/walkthroughs`, scope `content:write`). The QA payload
   shows stem + keyed answer + existing rationale beside the draft.
3. Audio is generated **only for approved** walkthroughs (3 layers — see AUDIO_RUNBOOK.md).
   `scripts/verify-walkthroughs.ts` build-fails if any walkthrough/coaching audio maps to
   a non-approved row.

## Learner surfaces
`GET /v1/questions/:id/walkthrough` returns the approved walkthrough (404 → plain rationale
fallback). The frontend `QuestionWalkthrough` (in Results / QuizRunner / PracticeItem)
renders tabs — Answer · Clinical judgment (6 steps + cue chips) · Why not the others +
error diagnosis · Listen (adaptive: right→quick, wrong→your-distractor coaching) · Review
next — plus "Ask FlorenceRN about this" (voice tutor seeded with the question). Interactive
e-books (`/academy/:slug/ebook`) run the loop read → listen → predict → answer → walkthrough.

## Measurement (R)
`POST /v1/candidates/:id/responses` captures `{chosen_option_index, correct, spent_ms,
pre_reveal_reasoning, walkthrough_seen}` (append-only). `GET /v1/ops/questions/:id/analytics`
rolls up attempts / pass rate / **most-common-wrong** / by-option / walkthrough-seen rate —
the substrate for "did the walkthrough reduce repeat misses?" and the staged A/B framework.

## Staged (not in this pass)
Inline "explain-it-first" UI prompt + speak-back scoring; auto-dispatch of error-typed
remediation on miss; Daily Clinical Judgment Rounds; Clinical Judgment Playlists; 3
question modes (Test/Tutor/Review); the A/B framework; cohort/lag dashboards. The data
substrate for all of these ships here.
