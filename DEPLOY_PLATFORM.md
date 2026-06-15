# FlorenceRN Platform — Deployment Runbook (Render + Cloudflare)

One SSO login across all four apps, on `florenceeducation.com`. This is the
click-ops only a human can do; everything in code (Dockerfiles, `render.yaml`,
entrypoints, the Core service + SDK) is already in the repo.

## What deploys

| Subdomain | Render service | Notes |
|---|---|---|
| `id.florenceeducation.com` | `florence-core` (docker) | the IdP; Postgres `florence-core-pg` |
| `academy.florenceeducation.com` | `florence-academy-web` (static) | React SPA |
| `api.academy.florenceeducation.com` | `florence-academy-api` (docker) | Postgres `florence-academy-pg` |
| `live.academy.florenceeducation.com` | `florence-academy-live` (docker) | Socket.IO |
| `pathway.florenceeducation.com` | `florence-pathway` (docker) | node:sqlite, 1 GB disk |
| `ats.florenceeducation.com` | `florence-ats` (docker) | node:sqlite, 1 GB disk |
| `pricing.florenceeducation.com` | `florence-economist` (docker) | Streamlit, 1 GB disk |
| (internal) | `florence-pricing-api` (python) | stateless quote API |

SSO mechanism: Core sets `fl_session=<RS256 JWT>; Domain=.florenceeducation.com; HttpOnly; Secure; SameSite=Lax`.
Every subdomain receives it; each service verifies it via Core's JWKS. Cloudflare does **DNS/TLS/CDN/WAF only** — Core owns auth (no Cloudflare Access on the user apps → no double login).

---

## Order of operations

### 1. GitHub (repo Render deploys from)
Render deploys from a Git repo. Put these five dirs at a repo root (e.g. a new repo `florence-platform`) with `render.yaml` alongside them:
```
florence-platform/
  render.yaml
  florence-core/  florence-academy/  florence-pathway-agent/  florence-ats-connect/  labor-economics-agent/
```
`florence-work/` already has this layout — you can push it directly, or copy the five dirs + `render.yaml` into a fresh repo. `labor-economics-agent` and `florence-academy` already have their own `.git`; to fold them in cleanly, either `git subtree`/`git filter-repo` (preserve history) or copy the working trees into a fresh history. Then push to GitHub.

### 2. Google Cloud — OAuth client (for staff sign-in)
1. console.cloud.google.com → **New Project** `florence-sso`.
2. **APIs & Services → OAuth consent screen** → User type **Internal** (requires `florenceeducation.com` Google Workspace; if it isn't Workspace, choose **External + Testing** and add staff as test users). App name `FlorenceRN`, support email an `@florenceeducation.com` address, **Authorized domain `florenceeducation.com`**.
3. **Scopes:** `openid`, `email`, `profile` (nothing sensitive → no verification).
4. **Credentials → Create credentials → OAuth client ID → Web application** `florence-core-web`.
5. **Authorized redirect URIs:**
   - `https://id.florenceeducation.com/auth/google/callback`
   - `http://id.lvh.me:8080/auth/google/callback` (local testing)
6. Copy the **Client ID** and **Client secret**.

### 3. Render — Blueprint
1. Create a Render account; **New → Blueprint** → connect the GitHub repo → **Apply** (`render.yaml` provisions all services + both Postgres).
2. After Apply, set the `sync: false` secrets in each service's **Environment**:
   - `florence-core`: `GOOGLE_CLIENT_SECRET`, `FIELD_ENC_PASSPHRASE` (long random — **must stay stable**, or every signing key is orphaned), `DEMO_CLIENT_SECRET`; `GOOGLE_CLIENT_ID` in the **florence-shared** env group.
   - `florence-academy-api`: `FIELD_ENC_PASSPHRASE`, `WEBHOOK_SECRET`, Stripe keys (if live).
   - `florence-pathway` / `florence-ats` / `florence-economist`: `ANTHROPIC_API_KEY` (optional), `BLS_REGISTRATION_KEY` (economist, optional).
3. **Custom domains:** in each service's **Settings → Custom Domains**, add its subdomain (table above). Render shows a CNAME target per domain.

### 4. Cloudflare — DNS + TLS
1. Ensure `florenceeducation.com` is on Cloudflare (nameservers).
2. Add **proxied (orange-cloud) CNAME** records to the Render targets:
   ```
   id            → <florence-core target>.onrender.com
   academy       → <florence-academy-web target>.onrender.com
   api.academy   → <florence-academy-api target>.onrender.com
   live.academy  → <florence-academy-live target>.onrender.com
   pathway       → <florence-pathway target>.onrender.com
   ats           → <florence-ats target>.onrender.com
   pricing       → <florence-economist target>.onrender.com
   ```
   (Use the exact target Render shows for each custom domain.)
3. **SSL/TLS mode → Full (Strict)**. (Avoid "Flexible" — it breaks `Secure` cookies.)
4. Do **not** enable a "Cache Everything" rule on these hosts (don't cache `Set-Cookie`/authed HTML).

### 5. First sign-in
Visit `https://pricing.florenceeducation.com` (or any app) → you're redirected to `id.florenceeducation.com` → sign in with Google. **The first `@florenceeducation.com` user becomes `super_admin`.** Then open `https://id.florenceeducation.com/admin` to grant roles (ops/qa/instructor/rep) and create employer/university orgs + users.

---

## Secrets & env (summary)

**Env group `florence-shared`** (non-secret, all services): `TOKEN_ISS=florence-auth`, `TOKEN_AUD=florence`, `CORE_ISSUER_URL`, `CORE_JWKS_URL`, `COOKIE_DOMAIN=.florenceeducation.com`, `COOKIE_SECURE=1`, `GOOGLE_CLIENT_ID`.

**Per-service `sync:false` secrets:** see step 3.2. `DATABASE_URL` is injected automatically from the Postgres instances. Schema is applied by each service's `preDeployCommand: node db/migrate.mjs` (Core + Academy).

---

## Verify the deploy

```bash
# health of every public service
for h in id academy api.academy pathway ats pricing; do
  echo -n "$h: "; curl -s -o /dev/null -w "%{http_code}\n" "https://$h.florenceeducation.com/health" 2>/dev/null \
    || curl -s -o /dev/null -w "%{http_code}\n" "https://$h.florenceeducation.com/api/health"
done
# SSO round-trip + role checks: scripts/smoke_check.sh https://id.florenceeducation.com <email> <password>
```
The included `scripts/smoke_check.sh` logs into Core, then confirms the cookie authorizes pathway + ats and that no-auth is rejected.

---

## Local rehearsal (do this before touching the cloud)

`*.lvh.me` resolves to `127.0.0.1`, so `Domain=.lvh.me` rehearses cross-subdomain SSO exactly like prod. Google needs a real client, so test with a seeded **password** super-admin.

```bash
NODE=~/florence-work/.toolchain/node/bin/node
KEK="FIELD_ENC_PASSPHRASE=florence-dev-kek COOKIE_DOMAIN=.lvh.me COOKIE_SECURE=0"

# seed a local admin (once)
cd ~/florence-work/florence-core && env $KEK CORE_STATE_FILE=data/core-dev.json PUBLIC_CORE_URL=http://id.lvh.me:8080 $NODE scripts/seed-admin.ts

# Core
cd ~/florence-work/florence-core && env $KEK PORT=8080 PUBLIC_CORE_URL=http://id.lvh.me:8080 CORE_STATE_FILE=data/core-dev.json $NODE src/index.ts &
# Pathway / ATS (point them at Core)
cd ~/florence-work/florence-pathway-agent && PORT=8786 CORE_ISSUER_URL=http://id.lvh.me:8080 $NODE --experimental-sqlite --import tsx server/index.ts &
cd ~/florence-work/florence-ats-connect && PORT=8788 CORE_ISSUER_URL=http://id.lvh.me:8080 $NODE --experimental-sqlite --import tsx server/index.ts &
# Academy API
cd ~/florence-work/florence-academy/api && PORT=8088 CORE_ISSUER_URL=http://id.lvh.me:8080 $NODE src/index.ts &
# Pricing (Streamlit) — optional; needs the Python deps installed
cd ~/florence-work/labor-economics-agent && FLORENCE_INTERNAL_AUTH=1 CORE_ISSUER_URL=http://id.lvh.me:8080 streamlit run app.py --server.port 8501 &
```
Then `bash ~/florence-work/scripts/smoke_check.sh http://id.lvh.me:8080 dev@florenceeducation.com florence-dev`.

---

## Notes / interim items
- **Pathway & ATS** use node:sqlite on a 1 GB disk (single instance, no horizontal scale). ATS can move to the shared pattern later via `ATS_DB=postgres` + `DATABASE_URL` (no code change).
- **Academy SPA** today uses its own bearer login for candidates + M2M for the ops console; its API trusts Core tokens (cookie or bearer). Wiring the academy browser fully onto the Core cookie (credentials:include + the now-added `Access-Control-Allow-Credentials`) is a small follow-on.
- **Postgres plan slugs** in `render.yaml` (`basic-256mb`) may need adjusting to a current Render tier.
- **Sessions**: a short access token (1h, `fl_session`) backed by a **rotating refresh token** (30d, `fl_refresh`, only its SHA-256 stored). This gives **silent sliding SSO** — Core's `/login` re-mints the access cookie from a valid refresh cookie and bounces back, so users don't see a login screen until the refresh expires — and **real logout revocation** (logout revokes the refresh session server-side; `POST /auth/refresh` then returns 401). Tunable via `HUMAN_SESSION_TTL_SEC` / `REFRESH_TTL_SEC`.
- **Key rotation**: `cd florence-core && npm run rotate-key` mints a new RS256 signing key (old one stays in JWKS so live tokens keep verifying); after ~1h, set the retiring key `revoked` (the script prints the exact SQL).
