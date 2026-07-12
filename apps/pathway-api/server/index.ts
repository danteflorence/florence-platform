import express from 'express'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { api } from './routes'
import { apiV1 } from './api/v1'
import { seedIfEmpty } from './seedData'
import { getLlm } from './llm/provider'
import { configureCoreAuthFromEnv } from './coreAuth'
import { logInternalError } from './safeErrors'
import { startNotificationLoop } from './notifications'
import { getDossier } from './db'
import { nextActions } from './agents/workflow'

// Trust FlorenceRN Core's RS256 SSO token (verified via JWKS). Configured from
// CORE_ISSUER_URL / TOKEN_ISS / TOKEN_AUD (defaults to the local lvh.me Core).
configureCoreAuthFromEnv()

const app = express()
app.use(express.json({ limit: '4mb' }))

app.use('/api', api)
// FlorenceRN Platform API — Pathway capability module (scoped, staff/self-gated).
app.use('/v1', apiV1)

// Serve the built SPA when present (production: `npm run build` then `npm run api`).
// In dev, the Vite server is the front door and proxies /api here.
const dist = join(process.cwd(), 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')))
}

const port = Number(process.env.PORT ?? 8787)
const shouldSeedDemo = process.env.ALLOW_SYNTHETIC_SEED === '1'

Promise.resolve(shouldSeedDemo ? seedIfEmpty() : undefined)
  .then(() => {
    app.listen(port, () => {
      console.log(`[pathway] API on http://localhost:${port}  (LLM provider: ${getLlm().mode})`)
    })
    // Hourly deadline reminders + Monday digests (idempotent via dedupe keys;
    // mock transports by default). Disable with PATHWAY_NOTIFICATIONS_DISABLED=1.
    startNotificationLoop(async (cid) => {
      const d = await getDossier(cid)
      return d ? nextActions(d).map((a) => `${a.workflowShort}: ${a.title}`) : []
    })
  })
  .catch((err) => {
    logInternalError('[pathway] failed to seed/start', err)
    process.exit(1)
  })
