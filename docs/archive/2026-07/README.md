# Archive — July 2026 doc cleanup

Point-in-time documents moved here verbatim during the 2026-07-10 doc-rot cleanup so they
stay greppable without costing agent context or misdirecting readers. **Nothing in this
directory describes the current system** — for current state see the root `OPEN_ISSUES.md`,
`PLATFORM_READINESS_REPORT.md`, `ARCHITECTURE_OVERVIEW.md`, `DEPLOYMENT_RUNBOOK.md`, and
`docs/GCP_STRUCTURE.md`.

| What | Why archived |
|---|---|
| `*_BUILD_REPORT*.md` (6) + `OVERNIGHT_BUILD_REPORT.md` | Completed-work logs from the June build sprints; pre-restructure `florence-*` paths. |
| `academy-MORNING_REPORT*.md` (3) | Session logs; superseded by the app's live docs (`PAYMENTS_AND_POSTGRES.md`, `INSTRUCTOR_CONSOLE.md`). |
| `DEPLOY_PLATFORM.md`, `DEPLOY_TESTSERVER.md` | Superseded Render/Cloudflare + Caddy-VPS deploy paths; platform deploys via GCP Cloud Run (`DEPLOYMENT_RUNBOOK.md`). |
| `PATHWAY_CLOUD_RUN.md` | Resolved constraint — pathway's async-Postgres store landed; pathway-api deploys on Cloud Run in all envs. |
| `PLATFORM_AUDIT.md` | Pre-restructure snapshot labeled "current state"; superseded by `PLATFORM_READINESS_REPORT.md`. |
| `MONOREPO_MIGRATION_PLAN.md`, `DOMAIN_MIGRATION_PLAN.md`, `SECURITY_AND_PRIVACY_PLAN.md` | Executed plans (monorepo `apps/` layout landed; domain is `florenceedu.com`; security spine built). |
| `SECURITY_TEST_EVIDENCE.md` | Verification transcript (2026-06-25 run log). |
| `enterprise-security-packet.md`, `hardening-30-60-90.md`, `ai-data-use.md` | Older FlorenceRN-branded duplicates of the root `SECURITY_*` / `AI_SAFETY_POLICY` docs (root tree is canonical). |
| `LOCAL_DEV-pnpm-draft.md` | pnpm-based local-dev draft; npm `LOCAL_DEV_RUNBOOK.md` is current. |
