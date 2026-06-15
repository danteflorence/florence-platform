# FlorenceRN Platform — production-readiness checklist

The bar before AMN / Kaiser / lenders / universities / ATS partners touch the API. GitHub stores the
product; Cloud Run (GCP) runs it; Core (RS256/JWKS + M2M) is the auth boundary; OpenAPI documents it.

## Environments
- [ ] **local / staging / sandbox / production** all provisioned (`infra/envs/*.tfvars`); separate GCP projects.
- [ ] Partners test in **sandbox** only (seeded fake data) — never production.

## Domain + transport
- [ ] `florencern.com` DNS on Cloud DNS/registrar; Cloud Run domain mappings for `id. api. ats. pathway.
      api.academy. developers. partners.` resolve + serve managed TLS.
- [ ] Cookie domain `.florencern.com`; issuer `https://id.florencern.com`; CORS allowlist set per env.

## Data + secrets
- [ ] Cloud SQL Postgres per env; **automated backups + PITR** on; production = REGIONAL HA.
- [ ] Document vault = GCS + **CMEK**; signed URLs only; no public objects.
- [ ] Secret Manager holds `florencern-field-enc-<env>` (stable Core key-wrap passphrase) + `…-database-url-<env>`.
- [ ] **No PII in URLs/UTMs** (CI gate: `pii-url-smoke`).
- [ ] Data-retention + deletion policy written; consent revocation propagates (fail-closed verified).

## Auth + access
- [ ] Core RS256/JWKS issuing; M2M client-credentials for partners; **scoped** tokens enforced at the gateway.
- [ ] Per-partner scoping proven: AMN→its programs; Kaiser→its workspace + employer-safe packets; lenders→
      consented credit-data only (no visa/financing-to-others); universities→aggregate/anon.
- [ ] Partner keys are least-privilege (partner-safe / lender-safe allowlists); secrets shown once.
- [ ] Rate limits on (gateway token-bucket, `429 + Retry-After`); idempotency on creates (durable).

## Observability + ops
- [ ] `/v1/health` (Core) + each service `/health` wired to Cloud Run health checks.
- [ ] Structured logs → Cloud Logging; error monitoring (Sentry/Cloud Error Reporting); uptime checks.
- [ ] Tamper-evident audit chain verifies (`verify-audit`); sensitive reads/writes audited.
- [ ] Status page; incident-response plan; on-call.

## Release
- [ ] CI green (typecheck + ALL smokes both backends + `terraform validate` + dep audit) gates deploy.
- [ ] `main` → staging auto; production behind a **manual approval** (GitHub Environment protection); never hand-copied.
- [ ] Rollback path (previous image tag) documented.

## Lending-specific (before any underwriting use — COUNSEL-GATED)
- [ ] Fair-lending review of the credit-decision field set (the `CREDIT_DECISION_FIELDS` allowlist) signed off;
      national-origin/visa stay excluded by default.
- [ ] FCRA: dispute/correction workflow + adverse-action reason codes live; data-accuracy SLA.
- [ ] GLBA safeguards; DPA with each bank; the bank's third-party-risk (TPRM) diligence passed.
- [ ] (Own-bank path only) charter/BSA-AML/SR 11-7 model-risk program — separate corporate track.

## SOC 2 readiness (evidence, ongoing)
- [ ] Access reviews, change management (this CI/CD), encryption, logging, vendor list, BCP/DR — evidence retained.
