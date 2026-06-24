# FlorenceRN Security Findings

Severity definitions:

- Critical: Could expose restricted data, bypass authentication, bypass tenant isolation, bypass Application Gate, leak secrets, or allow unauthorized document access.
- High: Could expose sensitive metadata or enable high-impact unauthorized actions with some prerequisite access.
- Medium: Weakens defense in depth, increases likelihood of leakage, or creates unsafe production configuration risk.
- Low: Inventory, hardening, or monitoring gap with limited direct exposure.

## Critical Findings

### C01: Pathway internal API allows unauthenticated access to restricted immigration and licensure workflows

Evidence:

- `florence-pathway-agent/server/routes/index.ts` only staff-gates `/admin` and `/qa`.
- Candidate binding blocks mismatched authenticated candidate tokens, but unauthenticated requests are allowed to continue.
- Internal routes expose candidate dossiers, candidate views, required actions, chat, notifications, document metadata, workflows, DS-160 confirmation capture, NCLEX/ATT state, visa appointment state, and several workflow mutations.

Attack path:

1. Anonymous caller requests Pathway candidate or workflow endpoints.
2. The middleware sees no authenticated candidate mismatch and allows the request.
3. The caller reads or mutates restricted I-20, SEVIS, DS-160, visa, licensure, document, or workflow state.

Impact:

- Restricted immigration and licensure data exposure.
- Unauthorized state changes to consular and application workflows.
- Application Gate and audit assumptions can be bypassed.

Required fix:

- Add mandatory Core auth to all non-public Pathway routes.
- Require staff role for administrative routes and candidate-bound tokens for own candidate routes.
- Fail closed on missing auth.
- Add negative tests for anonymous access and cross-candidate access.

### C02: Core candidate self Passport read is vulnerable to BOLA

Evidence:

- `florence-core/src/passportRead.ts` treats relationship as `self` when `inp.role === "candidate"`, without verifying `inp.cand` equals the resolved nurse id.
- `florence-core/src/passportView.ts` returns full self Passport fields for `self`.
- `/v1/nurses/:id/passport` and legacy `/v1/nurse/passport` pass through the canonical read path.
- Candidates have `passport:read:self`.

Attack path:

1. Candidate authenticates with a valid candidate token.
2. Candidate calls Passport read for another candidate's nurse id, email, or reference.
3. Policy sees `role=candidate` and `relationship=self` and returns the victim self Passport.

Impact:

- Unauthorized disclosure of full candidate Passport data.
- Cross-candidate tenant/data isolation failure.

Required fix:

- Define `self` only when the token-bound candidate id matches the resolved nurse id.
- Add tests for id, email, and reference lookup variants.
- Audit denied attempts with redacted metadata only.

### C03: ATS `/api/ops` and ledger reads are overbroad for employer users

Evidence:

- `florence-ats-connect/server/routes.ts` authenticates `/api/ops`, `/candidates`, and `/ledger`, but allows employer role GET requests unless specific routes add stricter checks.
- `/ops/application-packets` returns packets without tenant scoping.
- `/ops/requisitions/:id` lacks employer ownership checks.
- `/ledger` can return all ledger events when no candidate or employer filter is supplied.
- Some routes have positive controls, such as scoped resume downloads and filtered ATS applications, showing the missing checks are route-specific gaps.

Attack path:

1. Employer user authenticates.
2. Employer calls overbroad GET routes under `/api/ops` or `/ledger`.
3. Employer receives packets, requisitions, applications, or ledger events outside its tenant.

Impact:

- Employer packet and Production Ledger exposure.
- Tenant isolation bypass.
- Possible downstream ATS/VMS data leakage.

Required fix:

- Make `/api/ops` ops-only by default.
- Reopen employer GET endpoints only through explicit allowlisted, tenant-scoped handlers.
- Scope every ledger, packet, requisition, match, and application read by employer id.

### C04: Core partner Passport consent and tenant checks are overbroad

Evidence:

- `florence-core/src/consent.ts` allows consent when recipient organization is absent or when consent has no recipient organization, causing category-wide consent to match arbitrary recipients.
- `florence-core/src/passportRead.ts` sets partner `org_matched` based on presence of caller org id for employer, university, or lender roles, not a proven nurse-to-org relationship.
- Core Passport partner views expose employer, lender, and university views from this policy decision.

Attack path:

1. Partner has a token with an org id and a relevant Passport read scope.
2. A candidate has broad or category-level consent.
3. Partner reads that candidate's partner view without a tenant relationship or named recipient consent.

Impact:

- Cross-tenant partner data exposure.
- Purpose-specific consent violation.
- Lender, employer, or university receives data outside the approved sharing relationship.

Required fix:

- Require named recipient organization for restricted external shares.
- Require an explicit candidate-to-partner relationship for each share.
- Treat missing recipient org as deny for partner reads.
- Add partner isolation and consent regression tests.

### C05: ATS public resume token is unrestricted document access

Evidence:

- `florence-ats-connect/server/routes.ts` creates a public resume URL using a random token.
- `/api/p/:token/resume.pdf` serves the resume without authentication.
- The token has no visible expiry, no short-lived signed URL semantics, and no revocation or recipient binding in the route.

Attack path:

1. Resume URL leaks through email, logs, browser history, analytics, referrer headers, or partner forwarding.
2. Any holder of the token downloads the resume PDF.
3. The access can continue indefinitely.

Impact:

- Unauthorized restricted document access.
- Noncompliance with required encrypted document and short-lived signed URL controls.

Required fix:

- Move resume downloads behind the restricted document service.
- Require short-lived signed URLs, recipient binding, revocation, and document download audit.
- Avoid placing stable document tokens in public URLs.

### C06: Lender credit decision routes lack consent and tenant enforcement

Evidence:

- `florence-core/src/gateway/modules/lender.ts` creates credit decisions with a lender scope but without checking lender-specific candidate consent.
- Decision listing can return all decisions when no org id filter is supplied.
- Adverse-action updates do not sufficiently prove org ownership before mutation.

Attack path:

1. Lender or overprivileged caller creates or lists decisions for candidates not consented to that lender.
2. Caller reads or mutates credit decision and adverse-action data outside its tenant.

Impact:

- Credit and underwriting data exposure.
- Unauthorized high-stakes financial decisioning.
- Regulatory and consent breach.

Required fix:

- Require purpose-specific lender consent and lender-candidate relationship before read or write.
- Never allow unscoped decision listing to partner users.
- Add audit logging for every decision read, write, adverse-action update, and packet export.

## High Findings

### H01: Pathway logs, audit details, and errors include restricted values

Evidence:

- Pathway error handler logs full errors and returns raw error text.
- Audit details include candidate questions, document filenames, attestation signature names, DS-160 confirmation numbers, visa outcome metadata, NCLEX registration names, licensure signatures, and appointment metadata.

Impact:

- Sensitive data can enter logs, audit records, traces, support exports, or monitoring systems.

Required fix:

- Introduce redacted audit schemas by event type.
- Store restricted values in canonical records only, not in audit detail text.
- Return generic client errors with internal correlation ids.

### H02: AI and model workflows are not consistently governed by a central PII and high-stakes control plane

Evidence:

- Pathway candidate guide prompts include candidate name, user question, pathway context, name mismatch, passport expiry, NCLEX/ATT status, and appointment state.
- Anthropic calls are made directly from Pathway helpers.
- Core model gateway uses caller-declared data class and can echo input slices in mock output.

Impact:

- Restricted data may be sent to model providers or prompt logs.
- AI output could be misused in visa, licensure, credit, employment, submission, or eligibility decisions.

Required fix:

- Route AI calls through a central data-class gateway.
- Redact or tokenize restricted identifiers before prompt construction.
- Add explicit "advisory only" controls and human approval gates for high-stakes workflows.

### H03: Academy employer partner views are category-wide, not tenant-specific

Evidence:

- Academy employer candidate views return candidates with employer sharing consent to callers with employer read permission, without proving a tenant-specific employer relationship.
- Employer offer creation uses the same broad read-style permission.

Impact:

- Employer partner can see or act on candidates outside its tenant if it has the broad employer permission.

Required fix:

- Add employer tenant id to consent and partner relationships.
- Require write-specific scope for offers.
- Add tenant isolation tests for employer candidate views and offers.

### H04: ATS inbound webhooks use weak shared-secret behavior

Evidence:

- ATS provider webhook route uses a static shared-secret comparison with a development fallback.
- No timestamped HMAC signature, replay window, idempotency enforcement, or route-level rate limit was found in the reviewed path.

Impact:

- Forged or replayed webhook calls can mutate application status and ledger state.

Required fix:

- Require provider-specific HMAC signatures with timestamp and replay protection.
- Remove development fallback in production.
- Add idempotency, rate limits, and audit for accepted and rejected webhook attempts.

### H05: Consular Payments sensitive reads and exports need audit and minimization

Evidence:

- Consular payment dashboard, reconciliation, CSV export, and order detail reads do not consistently emit sensitive-read audit events in the reviewed implementation.
- SEVISmate CSV export includes candidate contact data and full SEVIS identifiers.
- Handoff responses can include full candidate name and SEVIS information in instructions.

Impact:

- I-901 payment, SEVIS, and contact data can be exported or viewed without the required audit trail.
- Full identifiers increase blast radius if CSVs or handoff artifacts leak.

Required fix:

- Audit every order read, dashboard view, reconciliation view, CSV export, receipt view, and document metadata view.
- Mask SEVIS IDs in UI and minimize exports to the precise partner need.
- Store export manifests and require purpose-specific approval.

### H06: Realistic restricted seed data, fixtures, and scripts violate no-PII fixture policy

Evidence:

- Pathway seed data includes realistic synthetic DOBs, emails, phones, passport/MRZ-like values, license numbers, SEVIS IDs, school codes, I-20 metadata, financing fields, and receipt data.
- Verification scripts and seed scripts use default demo credentials and can print credential or token-derived values.

Impact:

- Test and seed data can train developers to copy restricted formats into logs, prompts, tickets, and fixtures.
- Secret-like values can leak through terminal output or CI logs.

Required fix:

- Replace restricted-looking fixtures with non-sensitive placeholders that cannot be mistaken for real identifiers.
- Stop printing secrets, token fragments, and credential material.
- Add fixture and log scanners for restricted data patterns.

### H07: Tokens and raw error messages appear in API responses

Evidence:

- Core `/me` includes the active bearer or cookie token in the JSON response.
- Core legacy server, ATS route handlers, ATS v1 handlers, and Pathway handlers return raw exception messages in some paths.

Impact:

- XSS or client-side logging can capture active tokens.
- Raw errors can reveal schema, secrets, provider payload fragments, identifiers, or internal state.

Required fix:

- Remove tokens from introspection responses.
- Return generic error codes and correlation ids.
- Redact and classify server-side errors before logging.

### H08: Outbound webhook fanout can send full payloads without strict tenant and purpose scoping

Evidence:

- Core webhook subscriptions can be HTTP, wildcard event typed, and optionally unscoped by org and consent purpose.
- Academy webhook delivery can emit full candidate and assessment payloads to configured URLs.
- Webhook delivery failure logs can include subscription URLs.

Impact:

- External subscribers can receive more data than intended.
- Webhook URLs or payloads can leak through logs.

Required fix:

- HTTPS only.
- Tenant and purpose required for restricted event types.
- Redacted event schemas by subscriber.
- Do not log full URLs, secrets, or payloads.

## Medium Findings

### M01: Development defaults and local secrets need production fail-closed enforcement

Evidence:

- Academy and Core can generate or use development secrets and warn rather than universally failing closed.
- ATS vault has a default insecure key path when env is missing.
- Labor economics tooling creates local auth secrets and development logs.

Required fix:

- Add startup checks that fail production when secrets are missing, default, short, or locally generated.
- Require secrets manager backed configuration for production and staging-like environments.

### M02: Token-bearing dev and public URLs increase leakage risk

Evidence:

- Academy mock email verification can return token-bearing dev URLs.
- ATS and public candidate flows use long-lived or guess-resistant references in URLs.
- Core legacy Passport scripts use email in query parameters.

Required fix:

- Keep restricted identifiers and tokens out of URLs when possible.
- Use POST bodies, one-time nonces, short TTLs, and no-referrer headers.

### M03: Labor economics APIs are unsafe if exposed beyond local development

Evidence:

- Pricing API authentication is optional.
- CORS defaults are permissive.
- Local OTP delivery writes email and OTP body to a local outbox log.
- Lob webhook accepts unsigned events when no webhook secret is configured.

Required fix:

- Require Core auth, scoped roles, strict CORS, rate limits, signed webhooks, and redacted audit logs before exposure.

### M04: ATS public candidate reference flows need stronger binding

Evidence:

- Public fit, bucket, basket, and compare flows use candidate references in URL/query context.
- A leaked reference can reveal opportunity state or allow candidate-specific actions.

Required fix:

- Use short-lived signed candidate action tokens, CSRF protection, rate limits, and recipient binding.

### M05: Application Gate can be disabled by environment configuration

Evidence:

- ATS Application Gate has fail-closed logic, but enforcement can be disabled by an environment variable.

Required fix:

- Make Application Gate enforcement non-disableable in production.
- Require break-glass override with super-admin approval and audit for exceptional cases.

### M06: Rate limits are inconsistent across sensitive APIs

Evidence:

- Academy has centralized rate limiting.
- Pathway, ATS public/webhook routes, Core partner operations, and labor economics APIs need stricter route-level limits.

Required fix:

- Apply rate limits by actor, IP, tenant, candidate, document, and event type.
- Add alerting for repeated denied sensitive operations.

## Low Findings

### L01: Public OpenAPI and health metadata need environment review

OpenAPI and health endpoints are useful, but they should be reviewed for production exposure, route inventory leakage, build identifiers, and internal service metadata.

### L02: Static demo and public learning assets need classification labels

Public audio or learning assets should be explicitly classified as public demo content, separate from candidate-specific tutor or assessment data.
