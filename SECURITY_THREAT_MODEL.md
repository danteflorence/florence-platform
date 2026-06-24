# FlorenceRN Security Threat Model

## Scope

This threat model covers the FlorenceRN repository as a bank-grade and healthcare-grade platform spanning:

- Florence Core identity, consent, Passport, partner access, model gateway, webhooks, and ledger surfaces.
- Florence Pathway / Consular Operations, including I-20, SEVIS, DS-160, visa, licensure, NCLEX, and SEVISmate payment workflows.
- Florence Academy, including candidate learning records, tutor/audio interactions, assessments, readiness, employer/university views, outreach, and webhooks.
- Florence ATS Connect, including employer packets, requisitions, candidate submissions, ATS/VMS handoffs, resumes, public jobs, webhooks, and Production Ledger events.
- Workforce and labor economics tooling where it can influence workforce planning, pricing, partner decisions, or operational exports.

Application code was not modified for this audit. This is a source-based security review with targeted evidence, not a full dynamic penetration test.

## Protected Assets

FlorenceRN must treat the following as restricted or high-risk data:

- Identity and contact data: full names, dates of birth, email, phone, addresses, emergency contacts.
- Travel and immigration data: passports, passport numbers, MRZ data, I-20s, SEVIS IDs, school codes, DS-160 data, visa status, consulate appointments, visa outcomes.
- Education and licensure data: transcripts, Academy progress, assessments, remediation, NCLEX, ATT, state licensure records.
- Financing data: credit and underwriting signals, loan data, adverse-action reasons, LendKey handoff payloads, financing packets.
- Employment data: employer packets, ATS/VMS submissions, resumes, requisition matches, interview packets, employer feedback.
- Consular payment data: I-901 order status, SEVISmate handoff data, receipt metadata, payment confirmation metadata.
- Platform control data: Production Ledger events, audit records, tokens, API keys, client secrets, webhook secrets, encryption keys.
- AI data: prompts, model inputs, model outputs, summaries, classifications, tutor interactions, and any derived candidate risk or eligibility signal.

## Trust Boundaries

| Boundary | Trusted side | Untrusted or less trusted side | Primary risks |
| --- | --- | --- | --- |
| Candidate browser to APIs | Authenticated candidate-bound token | Browser, URL bar, query parameters, local storage, public links | IDOR, token leakage, PII in URLs, missing candidate binding |
| Staff/admin to operations APIs | Staff identity and role policy | Misconfigured staff role, compromised session | Excessive export, audit gaps, insider misuse |
| Partner APIs and dashboards | Tenant-scoped partner identity | Employer, university, lender, SEVISmate, ATS/VMS, LendKey, Lob, Stripe, LLM providers | Tenant bypass, overbroad consent, unsafe payloads |
| Core consent and Passport policy | Canonical nurse, consent, role, organization, purpose | Caller-supplied role, org, purpose, view | BOLA, consent bypass, purpose drift |
| Document storage and downloads | Encrypted vault and short-lived signed URL service | Public bearer URLs, document metadata, filenames | Unauthorized document access, URL leakage |
| Webhooks | Verified provider signatures, scoped outbound subscriptions | Unsigned inbound traffic, wildcard outbound subscribers | Spoofing, replay, full-payload exfiltration |
| AI/model calls | Data-class gateway, prompt minimization, human review | Raw prompts, external model provider, model output | PII leakage, high-stakes automation |
| Logs/audit/telemetry | Redacted operational metadata | Console logs, analytics, traces, UTM/query strings | Secondary PII leakage |
| Test/seed data | Safe synthetic placeholders | Realistic restricted fixtures, local secrets | Accidental production-like leakage |

## Threat Actors

- Anonymous internet user probing public APIs, public document links, public job flows, and webhooks.
- Authenticated candidate attempting to read or mutate another candidate's records.
- Partner user from one employer, university, lender, or integration tenant attempting to access another tenant's candidates.
- Compromised partner webhook sender or outbound webhook subscriber.
- Staff insider, compromised staff session, or overprivileged service account.
- CI/log reader or developer workstation compromise harvesting secrets, tokens, PII, or sample data.
- LLM provider, model logging system, prompt analytics system, or prompt injection path receiving more sensitive data than allowed.
- Leaked URL holder with access to candidate references, resume tokens, verification tokens, or order references.

## Positive Controls Observed

- Core has a centralized Passport view policy path with role, scope, consent, and audit hooks.
- Core and Academy use structured audit/event sinks in many API paths.
- Academy applies route-level auth/scope checks, request audit logging, and rate limiting in the main server.
- ATS has a fail-closed Application Gate concept for submissions, with override auditing.
- ATS employer packet generation contains explicit consent checks and data minimization logic in shared packet code.
- Pathway Consular Payments V1 was designed around metadata-first receipt storage, staff-only admin actions, and minimal SEVISmate handoff fields.

## Highest-Risk Attack Paths

1. Anonymous caller reads or mutates Pathway candidate/workflow/DS-160/visa/licensure state through internal Pathway routes that only block mismatched authenticated candidates, while allowing unauthenticated requests.
2. Authenticated candidate uses Core Passport self scope against another nurse id or email because the self relationship check does not verify the token-bound candidate id against the resolved nurse id.
3. Employer or other partner uses ATS `/api/ops` read endpoints or Core partner Passport reads to access candidates outside its tenant because organization membership and purpose-specific consent are not consistently enforced.
4. Leaked ATS resume token grants public access to a restricted document without authentication, expiry, short-lived signed URL semantics, or strong document download controls.
5. Lender route creates or lists credit decisions and adverse-action data without enforcing lender-specific consent and tenant ownership.
6. Pathway and Academy model calls can receive candidate names, immigration/licensure context, and user questions without a central PII minimization and data-class enforcement layer.
7. Webhook subscriptions and inbound webhooks rely on weak defaults, optional scoping, optional secrets, or wildcard payload fanout, creating spoofing and exfiltration risk.
8. Logs, audit details, seed data, scripts, and dev flows include restricted identifiers, confirmation numbers, signatures, filenames, tokens, or realistic restricted data.

## Security Objectives

- Enforce authentication on every non-public read and write.
- Enforce tenant scoping for every partner, every time.
- Require purpose-specific consent before any external share or partner-safe packet generation.
- Fail closed for application submission, visa appointment prerequisites, lender handoffs, employer submissions, and document access.
- Audit every sensitive read, write, share, export, packet view, document view, and document download.
- Keep restricted data out of logs, URLs, analytics, traces, prompts, telemetry, test fixtures, seed data, and error responses.
- Use short-lived signed URLs and encrypted storage for restricted documents.
- Keep AI systems advisory only, with human review for visa, credit, employment, submission, eligibility, or licensure decisions.
