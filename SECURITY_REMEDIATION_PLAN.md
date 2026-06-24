# FlorenceRN Security Remediation Plan

## Top 10 Fixes In Execution Order

### 1. Freeze the highest-risk external surfaces

Temporarily restrict or firewall the vulnerable Pathway internal API routes, ATS overbroad `/api/ops` read routes, public resume-token downloads, and unscoped partner exports until patches are deployed.

Acceptance:

- Anonymous Pathway access is denied for all non-public routes.
- Employer users cannot access broad ops or ledger endpoints.
- Public resume tokens are disabled or routed through a short-lived document service.

### 2. Add mandatory Core auth to Pathway reads and writes

Protect candidate, workflow, document, DS-160, visa, NCLEX, licensure, consular payment, and dashboard routes with Core auth.

Acceptance:

- Candidate routes require candidate-bound token or staff token.
- Staff routes require staff role.
- Missing auth fails closed.
- Anonymous and cross-candidate tests pass.

### 3. Fix Core Passport candidate self BOLA

Change self relationship calculation so `self` is true only when the token-bound candidate id matches the resolved nurse id.

Acceptance:

- Candidate cannot read another candidate by nurse id, email, or reference.
- Denied reads are audit logged with redacted metadata.
- Existing staff and legitimate self reads continue to pass.

### 4. Enforce partner tenant and purpose-specific consent everywhere

Replace category-wide partner matching with named recipient organization consent and explicit candidate-to-partner relationship checks.

Acceptance:

- Employers, lenders, universities, SEVISmate, LendKey, ATS/VMS, and other partners are tenant-scoped.
- Missing recipient organization denies restricted shares.
- Purpose-specific consent is required before external share, packet view, export, or handoff.

### 5. Lock ATS employer, packet, requisition, and ledger reads

Make `/api/ops` staff-only by default and expose only explicitly scoped employer-safe routes.

Acceptance:

- Employer users can see only their own requisitions, applications, packets, resumes, and ledger events.
- Application packets require consent, packet QA, Application Gate, and employer ownership.
- Regression tests cover cross-employer access attempts.

### 6. Replace public document tokens with the restricted document service

Move resume PDFs and other restricted document downloads to encrypted storage plus short-lived signed URLs.

Acceptance:

- Signed URL includes document id, recipient, purpose, expiry, and nonce.
- Downloads are audited.
- URLs expire quickly and can be revoked.
- Filenames and URLs do not contain PII or restricted identifiers.

### 7. Lock lender and credit workflows

Add lender-specific consent, tenant ownership, and human-review gates to credit decision, adverse-action, and lender packet flows.

Acceptance:

- Lender cannot create, list, read, update, or export credit data without named consent and tenant relationship.
- Unscoped decision listing is unavailable to partner users.
- Every high-stakes credit action is audited.

### 8. Redact logs, errors, prompts, telemetry, and webhook payloads

Introduce centralized redaction and safe schemas for audit details, error responses, AI prompts, analytics, traces, and webhook payloads.

Acceptance:

- No passport numbers, SEVIS IDs, DS-160 data, visa status, credit data, loan data, employer packets, secrets, or restricted document details appear in logs, prompts, URLs, telemetry, or generic audit detail fields.
- Client errors return safe codes and correlation ids.
- AI calls use redacted/tokenized input and cannot finalize high-stakes decisions.

### 9. Harden webhooks, secrets, and production startup checks

Remove default secrets in production, enforce secrets manager usage, and harden inbound and outbound webhooks.

Acceptance:

- Production startup fails if any required secret is missing, default, weak, or locally generated.
- Webhooks require HTTPS, HMAC signatures, timestamps, replay protection, idempotency, tenant scoping, and rate limits.
- Webhook subscriptions cannot be wildcarded for restricted data without explicit approval.

### 10. Replace unsafe fixtures and add security regression gates

Replace realistic restricted fixtures and seed data, then add automated checks that prevent recurrence.

Acceptance:

- No PII, passport numbers, SEVIS IDs, DS-160 data, visa status, credit data, loan data, employer packets, or secrets in fixtures, seed data, docs, logs, prompts, or tests.
- CI scans for restricted data patterns and secret-like values.
- Security tests cover auth, BOLA, tenant scoping, consent, audit logging, document download, webhook signing, rate limits, AI redaction, and Application Gate fail-closed behavior.

## 30-Day Plan

- Patch Critical findings C01 through C06.
- Add regression tests for anonymous Pathway denial, Core Passport self binding, ATS tenant scoping, lender consent, and public document URL expiry.
- Disable or production-gate unsafe dev defaults.
- Create a central restricted-data redaction helper and begin replacing raw error/audit patterns.

## 60-Day Plan

- Complete partner consent and tenant model migration for employers, lenders, universities, SEVISmate, LendKey, ATS/VMS, and webhook subscribers.
- Move restricted documents to encrypted storage and short-lived signed URL service.
- Route all AI workflows through a central prompt gateway with data classification, redaction, consent, and human-review metadata.
- Implement webhook HMAC, replay protection, and event schema minimization across Core, Academy, ATS, and labor economics surfaces.

## 90-Day Plan

- Complete repository-wide fixture and seed data cleanup.
- Add continuous security scanners for secrets, restricted identifiers, unsafe URLs, public document tokens, raw error responses, and prompt leakage.
- Publish partner-specific data processing contracts and export manifests.
- Add security dashboards for denied sensitive reads, cross-tenant attempts, failed consent checks, document downloads, and webhook failures.

## Ownership Model

| Workstream | Primary owner | Required reviewers |
| --- | --- | --- |
| Pathway auth and audit | Pathway engineering | Security, Core identity |
| Core Passport and consent | Core engineering | Security, legal/compliance |
| ATS tenant scoping and documents | ATS engineering | Security, employer ops |
| Lender and financing | Core/financing engineering | Security, legal/compliance |
| AI governance | Platform AI engineering | Security, product, compliance |
| Webhooks and secrets | Platform engineering | Security, infrastructure |
| Fixtures and CI gates | All app owners | Security |
