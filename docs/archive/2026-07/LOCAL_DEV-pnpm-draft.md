# Local Development

This runbook starts the full Florence Education local stack with fake local data only. It does not require production secrets or real candidate records.

## Prerequisites

- Docker Desktop running.
- Node.js 24 or newer.
- pnpm available on your shell path.

## One-Time Setup

1. Start Docker Desktop.
2. From `/Users/dantetolbedantert/florence-work`, run:

```sh
pnpm setup:local
```

That creates `.env.local` from `.env.local.example` if it is missing.

## Start The Stack

Run:

```sh
pnpm dev
```

Local services:

| Service | URL |
| --- | --- |
| App Web | `http://localhost:5174` |
| Core API | `http://localhost:8080/health` |
| Academy API | `http://localhost:18088/health` |
| Academy Live | `http://localhost:5179/health` |
| Pathway API | `http://localhost:8787/api/health` |
| Employer Connect API | `http://localhost:8788/api/health` |
| Workforce Economist API | `http://localhost:8094/health` |
| Postgres | `localhost:5432` |

## Login

Core seeds a local admin on startup:

- Email: `local-admin@example.invalid`
- Password: `changeme`

These are fake local credentials from `.env.local`. Change them locally if needed; do not commit real secrets.

## Database Tasks

Run migrations:

```sh
pnpm db:migrate
```

Seed fake local data:

```sh
pnpm db:seed
```

The seed command creates:

- The local Core admin user.
- One fake Pathway candidate.
- One fake Employer Connect employer, facility, displayable RN job, and local candidate record.

It does not use production data.

## Smoke Tests

With the stack running, run:

```sh
pnpm smoke:local
```

The smoke checks cover:

- User login through Core password auth.
- Core health.
- Academy quote.
- Apply CTA URL safety and `florenceedu.com/apply` target.
- Pathway case creation.
- Employer interest registration.
- Core Application Gate check.
- Core Production Ledger event write/read.

## Useful Slices

```sh
pnpm dev:core
pnpm dev:academy
pnpm dev:pathway
pnpm dev:employer
pnpm dev:economist
```

## Reset Local State

Stop the stack from the terminal running it, then remove the local Postgres volume:

```sh
docker compose --env-file .env.local down -v
```

Start again with:

```sh
pnpm dev
pnpm db:seed
pnpm smoke:local
```
