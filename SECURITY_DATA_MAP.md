# FlorenceRN Security Data Map

## Data Domains

| Domain | Restricted data | Producers | Storage and processing | External surfaces | Main gaps found |
| --- | --- | --- | --- | --- | --- |
| Core Passport | Candidate identity, readiness, credentials, visa, work authorization, financing and partner-safe views | Core nurse records, Pathway, Academy, ATS, partners | Core Passport read model and Passport view redactors | `/v1/nurses/:id/passport`, legacy `/v1/nurse/passport`, partner Passport views, webhooks | Candidate self BOLA, category-wide consent matching, weak partner org relationship checks |
| Pathway / Consular | Passport metadata, I-20, SEVIS ID, school code, DS-160, visa status, appointment, NCLEX, ATT, licensure, documents | Candidate, staff, workflow agents, document uploads, consular operations | SQLite repositories, JSON columns, workflow states, document metadata | Candidate/workflow/document routes, staff dashboards, DS-160 confirmation, visa appointment routes | Large internal route set is effectively public; sensitive details appear in audit details and errors |
| Consular Payments / I-901 | I-901 order, SEVISmate handoff, legal name, SEVIS ID, school code, receipt metadata, payment status | Staff, candidate, SEVISmate guided handoff, receipt upload | Payment order, handoff, receipt, and event tables; Pathway document metadata | Candidate handoff, receipt upload, staff dashboard, reconciliation, CSV export | Sensitive reads/exports need explicit audit; CSV includes full SEVIS values and contact fields |
| Academy | Learning progress, assessments, remediation, readiness, audio/tutor sessions, employer/university readiness views | Candidate, tutor, assessments, staff, partner views | Academy API stores, audio store, webhook sink, request audit | Candidate routes, tutor/audio routes, partner views, outreach, webhooks | Partner views are category-wide; webhook payloads can contain full candidate or assessment records; dev verification URLs expose tokens |
| ATS / Employer | Employer packets, resumes, work authorization status, application gate status, requisitions, ATS/VMS submissions, Production Ledger | Candidate interest, staff ops, employer users, ATS webhooks | ATS DB, packet generator, public token store, ledger events | `/api/ops`, `/v1`, public job flows, public resume links, webhooks | Employer read routes are overbroad; public resume token is not short-lived; webhooks use weak shared-secret behavior |
| Lender / Financing | Credit decisions, adverse-action data, underwriting signals, loan and LendKey handoff data | Lender users, staff, Core financing modules | Core lender module and financing views | Credit decision APIs, Passport lender view, LendKey-style handoffs | Consent and tenant ownership checks are incomplete for credit decision writes and reads |
| University | Aggregate education and readiness data, potentially candidate-level education state | Academy, Pathway, Core | Academy university overview and Core university Passport view | University partner dashboards and APIs | Default should be aggregate or anonymized; Core partner view depends on overbroad consent matching |
| Production Ledger | Milestones, application, visa, payment, packet, and workflow events | Core, ATS, Pathway, Academy | Ledger/event tables and webhook payloads | Ledger APIs, webhook fanout, dashboards | Ledger reads and outbound payloads can be overbroad without tenant scoping and data minimization |
| AI | Prompts, questions, candidate context, model outputs, summaries and classifications | Pathway guide, Academy tutor/copilot, Core model gateway | Direct model calls, model gateway logs, prompt builders | External model providers, internal response APIs | Direct prompts can include sensitive context; data class is caller-declared in Core model gateway; high-stakes guardrails need enforcement |
| Secrets and tokens | API keys, client secrets, webhook secrets, auth secrets, signed-url tokens, verification tokens | Env, scripts, local dev, auth modules | Secrets manager should be canonical; local files and scripts exist | Logs, scripts, env files, URLs, API responses | Dev defaults, secret printing, token-in-URL flows, local untracked secret-like files |

## Places Sensitive Data May Appear

### Logs, Audit Details, and Error Traces

- Pathway route error handler logs full exceptions and returns raw error text.
- Pathway audit details include user questions, document filenames, attestation signature names, DS-160 confirmation numbers, visa outcome details, NCLEX registration names, licensure signatures, and appointment metadata.
- Core legacy server returns raw exception messages in JSON responses.
- ATS route error handlers log full exceptions and return raw messages.
- Academy webhook delivery dead letters log subscription URLs; outreach provider errors can return provider response bodies.
- Seed scripts print generated credentials or token prefixes for local verification.

### URLs and Query Parameters

- Core legacy Passport reads accept `email`, `nurseId`, or `ref` in query parameters.
- Pathway and ATS use public or semi-public references in URLs for candidate flows and resume downloads.
- Academy dev verification responses return verification URLs containing tokens when mock email is active.
- Consular SEVISmate deep-link mode can place an order reference in the partner URL.
- Verification scripts include email and token-oriented flows in command invocations.

### Test and Seed Data

- Pathway seed data contains realistic synthetic restricted fields including DOB, email, phone, passport document numbers, MRZ-like values, license numbers, SEVIS IDs, school codes, I-20 metadata, financing fields, and receipt data.
- Several local scripts and dev examples rely on default demo credentials or locally generated secrets.
- A local Academy `.en` file and ignored secret-like files were present in the workspace; their contents were not opened during the audit.

### Prompts and Model Calls

- Pathway candidate guide prompts include candidate name, user question, pathway context, name mismatch details, passport expiry, NCLEX/ATT state, appointment state, and other sensitive workflow information.
- Core model gateway policy uses caller-declared `data_class` and can echo a slice of input in mock output.
- AI systems are not yet uniformly forced through a redaction, purpose, consent, and data-class gateway.

### API Responses and Exports

- Core `/me` returns the current bearer or cookie token in the JSON response.
- ATS `/api/ops` read surfaces can expose employer packets, requisitions, ledger entries, and application data to employer users beyond their tenant.
- Pathway internal candidate and workflow reads return broad dossiers and workflow state when unauthenticated.
- Consular payment CSV export includes candidate contact data and full SEVIS values.
- Lender decision listing can return all credit decisions when no organization filter is applied.

### Webhooks

- Core outbound webhooks can be created with HTTP URLs, optional organization and consent purpose, wildcard event types, and raw event payloads.
- Academy can emit full candidate and assessment payloads to configured webhook URLs.
- ATS inbound webhooks rely on a static shared-secret style check with a development fallback, without timestamped HMAC replay protection.
- Labor economics Lob webhook accepts unsigned events when no secret is configured.

### Documents and Signed URLs

- ATS public resume links are bearer-token URLs without short-lived signed URL semantics.
- Pathway receipt upload currently stores metadata through existing document records, which is aligned with V1 assumptions, but every view/export of receipt metadata still needs sensitive-read audit coverage.
- Restricted documents across the platform should be encrypted and available only through short-lived, audited signed URLs.

## Data Minimization Requirements

- Employer packets must exclude passport scans, DS-160 drafts, financing data, lender details, sensitive notes, and non-employer-safe immigration data.
- Lender packets must include only consented lender-safe financing and identity fields required for the named purpose.
- University views should be aggregate or anonymized by default.
- SEVISmate handoff must include only the minimum I-901 fields and never include passport scans, DS-160 drafts, financing data, employer packet data, or sensitive notes.
- AI prompts must receive the minimum necessary text, with restricted identifiers redacted or tokenized wherever possible.
