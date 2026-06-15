# CSV / SFTP bridge — enterprise HRIS/ATS on-ramp

For partners on Workday / Taleo / iCIMS / UKG / SuccessFactors who can't integrate natively yet. Two flows;
the SFTP/GCS transport is operator-provisioned (a per-partner bucket/drop), the parse/format is in
`florence-ats-connect/server/csvBridge.ts` (idempotent; no PII in exports).

## Jobs in (partner → FlorenceRN), idempotent by `external_req_id`
CSV header:
```
external_req_id,title,city,state,required_license_state,setting,pay_min,pay_max
REQ-1,Registered Nurse,Reno,NV,NV,hospital,42,55
```
- Required: `external_req_id`, `title`, `required_license_state` (falls back to `state`).
- Re-uploading the same `external_req_id` **updates** the requisition (no duplicates).
- Invalid rows are reported per-row; valid rows still import.

## Status out (FlorenceRN → partner), NO candidate PII
CSV header:
```
external_req_id,application_id,stage,status,updated_at
REQ-1,app_abc,started,started,2026-06-15
```
- IDs + status only — never name/email/visa/nationality (Title VII / FCRA safe).
- Stages mirror the Production Ledger funnel (matched → … → started → retained → …).

## Verify
`npm run csv-bridge-smoke` (in `florence-ats-connect`) proves parse/validate + the no-PII export.
