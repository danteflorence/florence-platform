# FlorenceRN Security Gap Register

Status: SOC 2 ready controls in progress. This is not a formal SOC 2 audit report.

Last updated: 2026-06-24

## Purpose

This register lists current known security gaps for enterprise diligence. It separates production-readiness evidence gaps from code-level defects. A Critical item is release-blocking and must not be accepted into production without executive, security, and legal approval plus compensating controls.

## Current Gaps By Severity

| Severity | Gap | Impact | Required evidence to close |
| --- | --- | --- | --- |
| Critical | No current critical production exception is approved in this package | Any critical control bypass could expose restricted data, bypass auth or tenant isolation, bypass Application Gate, leak secrets, or allow unauthorized document access | Keep release gates fail-closed; open a critical incident if a critical gap is found |
| High | Production managed KMS and secrets-manager evidence is not attached | Restricted documents and connector secrets are proven by interfaces/tests, but production key custody evidence is still missing | Cloud KMS config, key policy, rotation policy, secrets inventory, access review |
| High | Production SIEM and audit-log routing evidence is not attached | Audit events exist, but diligence will require destination, retention, alert routing, and owner evidence | SIEM destination config, retention policy, alert owner, sample redacted event |
| High | Vendor DPAs/security reviews are not complete for every live vendor | Restricted data could be shared before contractual and security review is complete | Approved vendor review, DPA/subprocessor terms, data inventory, offboarding plan |
| High | Incident tabletop and backup restore exercises have not been recorded | Response and recovery processes are documented but not yet evidenced as exercised | Tabletop minutes, action items, restore test log, recovery timing |
| High | Production webhook replay/rate-limit evidence is not attached | Webhook controls need production provider-specific proof | HMAC/timestamp/replay settings, rejected replay evidence, rate-limit dashboard |
| Medium | SOC 2 audit has not been completed | FlorenceRN cannot claim certification or compliance report coverage | Auditor engagement, readiness assessment, final report when completed |
| Medium | Manual access review process needs evidence | Privileged and partner access controls require recurring operational proof | Quarterly review export, reviewer signoff, removal actions |
| Medium | Retention/deletion schedules need production configuration | Document deletion hooks exist, but legal-hold and retention operations need approval evidence | Approved retention schedule, legal-hold process, deletion run evidence |
| Medium | Live AI provider adapter requires vendor and policy approval | Model Gateway controls exist, but live provider use must be reviewed before restricted data use | Provider DPA/security review, approved data classes, gateway config evidence |
| Medium | Full repository test run is blocked in this sandbox by local listener restrictions | Some HTTP smoke tests cannot complete here because `127.0.0.1` listening returns `EPERM` | Run full test suite in CI or local environment where loopback listeners are allowed |
| Medium | Build is blocked locally by Rolldown native binding signature | Local macOS native binding prevents Vite build completion for ATS Connect | Reinstall dependencies in clean runner, or use CI runner evidence |
| Medium | Dependency audit is blocked locally by restricted network | `npm audit` cannot reach the registry in this sandbox | Run `npm run security:audit` in CI with registry access |
| Low | Evidence package needs owner review cadence | Diligence docs can drift from implementation | Assign owners and quarterly review dates |
| Low | Some production screenshots/config exports are not attached | Diligence reviewer may need external screenshots or exports | Store sanitized evidence artifacts in controlled evidence folder |

## Release-Blocking Rules

- Do not release if authentication, authorization, tenant isolation, consent, Application Gate, document vault, audit logging, encryption, or secret handling is disabled.
- Do not share restricted data with employers, lenders, universities, ATS/VMS partners, SEVISmate, LendKey, or other vendors without purpose-specific consent and tenant scope.
- Do not enable a live AI provider for restricted workflows until Model Gateway policy, vendor review, and audit evidence are complete.
