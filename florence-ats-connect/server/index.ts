import express from 'express'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { api } from './routes'
import { apiV1 } from './api/v1'
import { OPENAPI_V1 } from './api/v1/openapi'
import { seedIfEmpty } from './seedData'
import { configureCoreAuthFromEnv } from './coreAuth'
import { startStatusSyncLoop } from './statusSync'
import { recordClick } from './links'

// Trust FlorenceRN Core's RS256 SSO token (verified via JWKS). Configured from
// CORE_ISSUER_URL / TOKEN_ISS / TOKEN_AUD (defaults to the local lvh.me Core).
configureCoreAuthFromEnv()

const app = express()
app.use(express.json({ limit: '4mb' }))

// Public Demand Radar tracked-link redirect: log a first-party click (opaque
// frn_click_id, no PII) → 302 to the destination with UTMs appended. Top-level
// (not under /api) so links read cleanly as <base>/l/<code>.
app.get('/l/:code', (req, res) => {
  void (async () => {
    const candidateId = typeof req.query.c === 'string' ? req.query.c : undefined
    const r = await recordClick(req.params.code, {
      ip: req.ip, userAgent: req.headers['user-agent'], referrer: req.headers['referer'], candidateId,
    }).catch(() => null)
    if (!r) return res.status(404).send('link not found')
    res.redirect(302, r.destination)
  })()
})

app.use('/api', api)
// FlorenceRN Platform API (versioned, scoped, idempotent) — every surface is a client.
// The OpenAPI contract is public (no auth) so partners can build against it.
app.get('/v1/openapi.json', (_req, res) => res.json(OPENAPI_V1))
app.use('/v1', apiV1)

// Serve the built SPA when present (the React ops/marketplace surfaces ship next).
const dist = join(process.cwd(), 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')))
}

const port = Number(process.env.PORT ?? 8788)

seedIfEmpty()
  .then(() => {
    app.listen(port, () => {
      console.log(`[ats-connect] API on http://localhost:${port}`)
      startStatusSyncLoop()
    })
  })
  .catch((err) => {
    console.error('[ats-connect] failed to seed/start', err)
    process.exit(1)
  })
