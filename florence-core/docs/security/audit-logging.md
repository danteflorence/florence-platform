# Audit & Tamper-Evidence Standard

**Status:** ✅ implemented — hash-chained `audit_log` (`src/audit.ts`, `src/auditVerify.ts`), DB append-only trigger, sensitive-read logging, bulk-read alerts (`src/auditAlerts.ts`)
**Maps to:** NIST CSF 2.0 DE.CM (continuous monitoring) / PR.PS-04 (logs) · SOC 2 CC7.2, CC7.3 · OWASP ASVS 5.0 V7 (Logging)

The audit log answers **who saw what, when, why, and what changed** — and is
built so that an insider with database access cannot silently rewrite history.

## Tamper-evidence (hash chain)

Each row stores `prev_hash` (the previous row's hash) and
`row_hash = SHA256(prev_hash + canonical(row))`, where `canonical` is a
deterministic serialization of `[id, at, actor, action, entity, entity_id, detail]`.
Any insertion, edit, or deletion makes a downstream `row_hash` recomputation fail.

- `verifyAuditChain(store)` (CLI: `npm run verify-audit`) recomputes the whole
  chain and reports `{ok, checked, brokenAt, reason}`.
- A monotonic `seq` (Postgres `bigserial`) gives deterministic verify order.
- Appends are **serialized** through an in-process queue so `prev_hash` is stable
  under concurrent fire-and-forget callers (single-appender model; a multi-instance
  Core would add a DB sequence + advisory lock — noted as a scaling step).

## Append-only enforcement (DB)
Postgres trigger `audit_log_no_mutate` raises on any `UPDATE`/`DELETE` of
`audit_log`. The application has no update/delete path for audit rows.

## What is logged

**Writes** (existing): login, role grant/revoke, org create, key rotation,
consent grant/revoke, ledger stage changes.
**Reads** (new this build): every `passport.read` records
`{role, audience, purpose, consentOk, classes returned, withheld count}`. Denied
reads record `passport.read_denied` with the policy reason. This is the first time
sensitive **reads** enter the log — essential for partner-disclosure accountability.

## Anomaly alerts
`bulkReadCheck` / `bulkReadAlert` flag an actor reading more than N distinct
nurses in a time window (the bulk-export / scraping signal) and write a
`security.alert` audit row. Mock-by-default; a webhook (`SECURITY_ALERT_WEBHOOK`)
can be wired later without changing callers. Recommended additional alerts:
unusual hours, partner accessing unexpected records, repeated failed MFA,
privilege escalation.

## Retention & storage (planned)
- Security logs stored separately from application data; write-once retention where
  feasible; forensics-ready fields. (Ops control.)

## Verification
`npm run verify-security` proves: chain intact across grant/revoke/read rows;
**reads are logged**; a tampered row is **detected** (`row_hash mismatch`); the
bulk-read alert trips and writes `security.alert`; the chain stays intact after.
`npm run verify-audit` validates a live store's chain end-to-end.
