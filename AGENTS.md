# FlorenceRN Codex Operating Rules

FlorenceRN is a high-sensitivity healthcare, education, immigration, financing, and workforce platform. Treat every change as bank-grade and healthcare-grade work.

These rules apply to every future Codex task in this repository and all FlorenceRN subprojects unless a stricter project-specific rule applies. When instructions conflict, preserve the stronger security control.

## Sensitive Data

FlorenceRN may handle passports, dates of birth, addresses, transcripts, I-20s, SEVIS IDs, DS-160 data, visa status, NCLEX and licensure records, financing packets, credit and underwriting signals, lender handoffs, employer packets, ATS/VMS submissions, Academy learning data, audio/tutor interactions, and Production Ledger events.

Treat all of the above as restricted unless explicitly documented otherwise.

## Non-Negotiable Security Rules

1. No PII, passport numbers, SEVIS IDs, DS-160 data, visa status, credit data, loan data, employer packets, or secrets may appear in logs, URLs, analytics events, error traces, prompts, UTM parameters, telemetry, or test fixtures.
2. Every sensitive read, write, share, export, packet view, document view, and document download must be audit logged.
3. Every partner, employer, lender, university, agency, vendor, and integration must be tenant-scoped.
4. Every external data share requires purpose-specific consent before any data leaves FlorenceRN.
5. Employers may see only employer-safe packets approved for employer review.
6. Lenders may see only consented lender-safe packets approved for lender review.
7. Universities must see aggregate or anonymized views by default. Identifiable student-level data requires explicit authorization and consent.
8. AI systems may draft, explain, classify, summarize, tutor, or recommend review, but must not make final high-stakes decisions about visa, credit, employment, application submission, licensure, financing, or eligibility.
9. Application submission must fail closed unless visa or work authorization, license, consent, packet QA, tenant authorization, and workflow gates all pass.
10. Secrets must come from an approved secrets manager. Never place secrets in the repo, committed `.env` files, tests, logs, prompts, screenshots, docs, or fixtures.
11. Restricted documents must be encrypted at rest and accessed only through short-lived signed URLs.
12. Never weaken authentication, authorization, CSRF/CORS protections, rate limits, validation, audit logging, encryption, tenant isolation, consent checks, or document controls to make tests pass.
13. If security blocks a workflow, preserve the control and propose a safer workflow.

## Logging, Telemetry, And Prompts

- Log event IDs, request IDs, tenant IDs, record IDs, and status codes only when safe and necessary.
- Do not log raw names, dates of birth, addresses, passport data, SEVIS IDs, DS-160 fields, visa data, transcript contents, license numbers, credit fields, loan terms, employer packet contents, document text, audio transcripts, tutor conversations, or secret values.
- Do not place restricted data in model prompts or tool inputs unless the task explicitly requires it and the data is synthetic or safely redacted.
- Error messages must be useful without exposing sensitive values.
- Analytics events must use coarse, non-identifying labels.

## Consent And Sharing

- Consent must be purpose-specific, time-aware, revocable, and checked at the moment of sharing.
- Sharing rules must be enforced server-side, not only in UI.
- Partner packet builders must produce role-safe projections.
- Employer-safe, lender-safe, university-safe, and internal operations views must be separate projections.
- Cross-tenant access must fail closed.

## Documents

- Restricted document access must use authorization checks, audit logging, encryption, and short-lived signed URLs.
- Do not expose restricted document URLs in browser history, logs, analytics, referrers, or long-lived messages.
- Downloads, previews, exports, and packet views count as sensitive reads and must be audited.
- Test documents must be synthetic and clearly fake.

## AI And Tutor Systems

- AI is assistive. Humans and approved policy own final high-stakes decisions.
- AI-generated clinical, immigration, financing, employment, or eligibility content must be labeled, reviewed, or gated according to risk.
- Tutor and audio interactions are sensitive learning records. Do not leak them to logs, prompts, telemetry, or third parties.
- Clinical education features must avoid individualized medical advice for real patients.
- If a model is uncertain or lacks approved grounding, route to review instead of inventing.

## Application And Workflow Gates

- Submission, employer release, lender handoff, university sharing, document export, and ATS/VMS actions must fail closed.
- Required gates include authorization, tenant scope, consent, QA status, license status, visa/work authorization status where applicable, and workflow state.
- Do not bypass gates for demos, tests, seeds, or local development. Use synthetic test paths that preserve the controls.

## Codex Work Rules

1. Start with read-only review unless the user explicitly asks to patch or the task clearly requires implementation.
2. Make narrow PR-sized changes. Avoid unrelated refactors, formatting churn, and broad rewrites.
3. Add or update tests for every security control changed or introduced.
4. Run typecheck, tests, lint, and relevant security checks before the final response when available. If a check cannot be run, explain why.
5. Summarize files changed, risks fixed, tests run, and residual risks in the final response.
6. Do not remove, weaken, skip, or rewrite tests merely to make builds pass.
7. Do not use real production data. Use synthetic, clearly fake data only.
8. Do not commit generated secrets, tokens, real credentials, production payloads, private documents, or copied customer data.
9. Do not weaken authentication, authorization, tenant isolation, consent, audit, validation, rate limits, encryption, or CSRF/CORS controls without explicit security approval.
10. If a requested change conflicts with these rules, state the conflict and implement the safest compliant alternative.

## Security Review Checklist

Before finishing any task that touches sensitive workflows, verify:

- Sensitive fields are not logged, exposed in URLs, sent to analytics, placed in prompts, or used in fixtures.
- Tenant scope is enforced server-side.
- Purpose-specific consent is checked before external sharing.
- Sensitive reads and writes are audit logged.
- Restricted documents use encrypted storage and short-lived signed URLs.
- High-stakes decisions remain human-gated or policy-gated.
- Failure modes fail closed.
- Tests cover the security behavior.
