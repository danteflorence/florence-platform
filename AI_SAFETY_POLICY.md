# FlorenceRN AI Safety Policy

Status: SOC 2 ready controls in progress. This is not a medical, legal, immigration, credit, or employment compliance attestation.

## Purpose

AI in FlorenceRN is assistive. It may draft, explain, classify, summarize, tutor, and recommend review. It must not make final high-stakes decisions or directly trigger restricted actions.

## Central Gateway Requirement

All LLM calls and conversational AI workflows must route through Core Model Gateway or a Core-approved proxy that enforces the same policy.

Direct provider calls are not allowed for:

- Candidate pathway guidance.
- Tutor answers.
- Document extraction.
- Transcript summaries.
- DS-160 review.
- Lender packet summaries.
- Employer packet summaries.
- Visa, credit, employment, licensure, application, or eligibility workflows.

Text-to-speech rendering may occur outside Model Gateway only when the text has already been approved or generated through the approved policy path.

## Task Policy

Every AI task must define:

- Task type.
- Allowed data classes.
- Prompt version.
- Model.
- Output schema.
- Whether caching is allowed.
- Human QA requirement.
- Candidate attestation requirement when applicable.
- Whether full candidate record access is permitted.
- Minimum confidence threshold where applicable.

## Untrusted Input

These sources are always untrusted:

- Uploaded files.
- Job postings.
- Transcripts.
- DS-160 text.
- User messages.
- Partner text.
- Webhook text.
- Any copied or pasted document content.

Untrusted input must be redacted or quarantined before prompt construction when prompt-injection indicators are detected.

## Restricted Data Rules

- Model input must be minimized and redacted or tokenized unless a task explicitly allows the data class.
- Full candidate records must not be sent to AI unless task policy explicitly requires it and policy permits it.
- AI audit logs must not store raw restricted PII.
- Prompt and output storage must follow retention and classification rules.
- Raw prompts must not be copied into logs, analytics, issue trackers, or support notes.

## High-Stakes Prohibited Actions

AI output must not directly perform or trigger:

- Visa eligibility approval or denial.
- DS-160 final submission.
- Credit approval or decline.
- Employment application release.
- Employer packet release.
- ATS submission.
- VMS submission.
- Clinical pass/fail decisions.
- Legal advice.
- Licensure eligibility decisions.

If model output asks for a tool call, webhook, packet release, application submission, or final decision, the gateway must block it and route to human review.

## Human Review And Attestation

Human QA is required for:

- Immigration or DS-160 drafts.
- Transcript and education classifications.
- Lender packet summaries.
- Employer packet summaries.
- Passport QA summaries.
- Clinical judgment rationales that become canonical content.
- Low-confidence outputs.
- Prompt-injection flagged outputs.

Candidate attestation is required before high-risk candidate-facing submissions or external packet use.

## Audit Requirements

Every AI model event must record:

- Actor.
- Task type.
- Model.
- Prompt version.
- Data classes used.
- Source types.
- Prompt-injection signals.
- Output schema.
- Output schema validation result.
- Reviewer status.
- Human QA requirement.
- Candidate attestation requirement.
- Token cost and estimated cost.
- Safe input hash.

Audit records must not include raw restricted PII, prompt text, document text, secrets, or full model output when restricted.

## Verification

Current repository evidence:

- `florence-core npm run verify-model-gateway`
- `florence-core npm run verify-gateway`
- Static scan inside `verify-model-gateway` for direct LLM and direct conversational AI calls in known server surfaces.

## Residual Risk

Live provider mode must remain disabled until provider contract, retention, logging, regional processing, prompt storage, and data-use terms are reviewed. New AI features must add a task policy and tests before launch.
