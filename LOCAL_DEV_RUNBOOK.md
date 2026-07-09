# Florence Education Local Development Runbook

Last updated: 2026-06-26

## Purpose

This runbook describes how a new engineer should start the Florence Education platform locally with fake data. Local development must never require production secrets or real user data.

## Prerequisites

- Docker Desktop.
- Node 24 and npm 11 available on PATH.
- Git checkout of `/Users/dantetolbedantert/florence-work`.
- No production credentials in local files.

The current Codex host sees Node 24.18.0 and npm 11.16.0 on PATH. A normal developer machine should match the Node 24/npm 11 baseline before using the root scripts.

## First-Time Setup

```sh
cd /Users/dantetolbedantert/florence-work
npm ci
npm run setup:local
```

Review the generated local environment file before starting services. Keep local secrets fake, synthetic, and uncommitted.

## Start The Full Local Stack

```sh
cd /Users/dantetolbedantert/florence-work
npm run dev
```

This starts:

- Postgres.
- Core API.
- Academy API.
- Academy Live.
- App Web.
- Pathway API.
- Employer Connect API.
- Workforce Economist API.

## Start A Smaller Slice

```sh
npm run dev:core
npm run dev:academy
npm run dev:pathway
npm run dev:employer
npm run dev:economist
```

Use smaller slices when working on one service or debugging local resource usage.

## Local URLs

| Service | Default local URL |
| --- | --- |
| App Web | `http://localhost:5174` |
| Core API | `http://localhost:8080` |
| Academy API | `http://localhost:8088` |
| Academy Live | `http://localhost:5179` |
| Pathway API | `http://localhost:8787/api` |
| Employer Connect API | `http://localhost:8788/api` |
| Workforce Economist API | `http://localhost:8094` |

For cookie and cross-subdomain auth debugging, use the documented local hostnames that match cookie domain behavior rather than mixing incompatible loopback hosts.

## Local Data And Migrations

```sh
npm run db:migrate
npm run db:seed
npm run smoke:local
```

Rules:

- Seed data must be synthetic.
- Do not import production exports.
- Do not paste real candidate, school, employer, lender, or document data into local databases.
- Do not use real OAuth, AI, ATS, lender, or webhook secrets unless explicitly approved for a sandbox environment.

## Common Workflows

| Workflow | Local proof |
| --- | --- |
| User login or mock auth | Start Core and App Web, sign in with synthetic/local credentials. |
| Core health | `GET http://localhost:8080/health` |
| Academy CTA event | Open the Academy surface and trigger the Apply CTA with synthetic session data. |
| Pathway case creation | Use Pathway local API with synthetic candidate data. |
| Employer interest registration | Use Employer Connect local public job/interest flow with synthetic data. |
| Application Gate check | Build a synthetic employer packet and verify fail-closed behavior before submit. |
| Production Ledger read | Read Core events/ledger for synthetic records only. |
| Workforce Economist quote | Call the economist quote/proposal endpoints with aggregate fake facility inputs. |

## Security Rules For Local Development

- Use fake data only.
- Keep restricted identifiers out of URLs.
- Keep secrets out of `.env` files that could be committed.
- Preserve tenant scoping, consent, audit logging, signed URL, Application Gate, webhook, and redaction controls in local tests.
- Do not bypass fail-closed controls for demos.
- If a workflow is blocked by a security control, build a safer synthetic path.

## Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| `npm` not found | Node/npm not installed or not on PATH. | Install Node 24/npm 11 and reopen the terminal. |
| Root typecheck/test/build stops at first app | Root runner shells to `npm`. | Fix PATH/npm first; do not mark checks green. |
| Service cannot connect to database | Postgres container not healthy or env mismatch. | Restart Docker Compose and check `.env.local`. |
| Core event is missing | Service Core credentials not configured or local no-op mode active. | Configure fake Core M2M credentials for local integration proof. |
| Auth cookie does not persist | Hostname/cookie domain mismatch. | Use the documented local hostnames consistently. |
| Terraform plan fails locally | Missing cloud credentials. | Use authorized operator environment only. |
