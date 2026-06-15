# FlorenceRN — single-VPS test server (Docker Compose)

The whole platform on one box behind Caddy (auto-HTTPS), with shared-cookie SSO
across `*.${BASE_DOMAIN}`. ~20 min once DNS resolves.

## What you need
- A VPS with **Docker + Docker Compose** (Ubuntu 22.04+, ≥ 2 GB RAM; 4 GB comfortable). Ports **80 + 443** open.
- A **domain you control** to use for the test (e.g. `test.example.com`).

## 1. DNS
Point these at the server's public IP (a **wildcard is easiest**):
```
*.test.example.com    A    <SERVER_IP>      # covers id / academy / api.academy / live.academy / pathway / ats / pricing
```
(or add those seven `A` records individually). Wait until `dig id.test.example.com` returns the IP.

## 2. Get the code on the box
```bash
git clone <your florence-platform repo> florence-platform && cd florence-platform
# (or rsync the florence-work tree up; either way you need the app dirs + docker-compose.yml + Caddyfile)
```

## 3. Configure
```bash
cp .env.testserver.example .env
# edit .env: BASE_DOMAIN=test.example.com, ACME_EMAIL, PG_PASSWORD,
# FIELD_ENC_PASSPHRASE (openssl rand -hex 32), DEMO_CLIENT_SECRET, ATS_CONNECT_VAULT_KEY.
# Leave GOOGLE_* blank for now (password sign-in works without it).
```

## 4. Launch
```bash
docker compose up -d --build      # first build ~5–10 min
docker compose ps                 # all services "running"; Caddy fetches TLS certs on first hit
```

## 5. Create the first admin (no Google needed)
```bash
docker compose exec \
  -e CORE_BOOTSTRAP_ADMIN_EMAIL=admin@florenceeducation.com \
  -e CORE_BOOTSTRAP_ADMIN_PASSWORD='a-strong-password' \
  core node scripts/seed-admin.ts
```
Then open **https://id.test.example.com/login**, sign in with that email/password → you land on the **admin console** (grant roles, create employer/university orgs). The first account is auto **super-admin**.

## 6. Verify SSO
Browse `https://pathway.test.example.com`, `https://ats.test.example.com`, `https://academy.test.example.com`, `https://pricing.test.example.com` — all honor the one login. Or script it:
```bash
bash scripts/smoke_check.sh https://id.test.example.com admin@florenceeducation.com 'a-strong-password' \
  https://pathway.test.example.com https://ats.test.example.com https://api.academy.test.example.com
```

## Add Google sign-in later (optional)
Create a Google OAuth client (see `DEPLOY_PLATFORM.md` §2) with redirect `https://id.test.example.com/auth/google/callback`, put `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in `.env`, then `docker compose up -d core`.

## Operate
```bash
docker compose logs -f core          # or any service
docker compose up -d --build         # redeploy after a git pull
docker compose down                  # stop (volumes/data persist)
docker compose down -v               # stop + WIPE all data (fresh start)
docker compose exec core node scripts/rotate-key.ts   # rotate signing keys
```

## Notes
- **Data** persists in named volumes (`core-pg-data`, `academy-pg-data`, `pathway-data`, `ats-data`, `economist-data`). `down` keeps them; `down -v` deletes them.
- **TLS**: Caddy needs 80+443 reachable and DNS pointing at the box; first request per host provisions the cert (a few seconds).
- **`FIELD_ENC_PASSPHRASE` must stay stable** — changing it orphans Core's signing keys (every session invalidated).
- **Pricing API** (`pricing-api`, FastAPI) is included at `https://pricing-api.${BASE_DOMAIN}` (`/docs`, `/price`) — stateless quote engine, CORS-allowed for the pricing UI.
- **ATS** runs on **embedded PGlite** (`ATS_DB=postgres`), stored at `/app/data/ats-connect-pg` on the `ats-data` volume (no separate Postgres container needed).
- **Live classroom A/V** (Academy live page): set `AGORA_APP_ID` + `AGORA_APP_CERTIFICATE` (from console.agora.io) to turn on the instructor camera/mic broadcast (draggable picture-in-picture over the reader) + live Q&A. Blank → the live page runs slides-only. Uses Agora's host/audience "live" model (scales to large, global cohorts); only Core instructors/ops get a publish token. The browser fetches the App ID from the API at runtime — no rebuild needed to flip it on.
- **Recording/replay** (optional): also set `AGORA_CUSTOMER_ID` + `AGORA_CUSTOMER_SECRET` (Agora RESTful key) and a storage bucket (`AGORA_REC_BUCKET` / `AGORA_REC_ACCESS_KEY` / `AGORA_REC_SECRET_KEY`, `AGORA_REC_VENDOR` 1=S3, `AGORA_REC_REGION`). The instructor then gets a **Record** button; a composite mp4 lands in your bucket for replay. Only instructors/ops can start/stop; the whole room sees the **REC** badge. Set `AGORA_REC_PUBLIC_BASE` (a CDN/CloudFront URL in front of the bucket) so the **Class replays** library in the Live hub can play recordings back globally. (Recording metadata persists to Postgres in prod via a `live_recordings` table; in-memory in local dev.)
- This is a single box (no horizontal scale); it's a test/staging shape. For managed prod use the Render Blueprint (`render.yaml` + `DEPLOY_PLATFORM.md`).
