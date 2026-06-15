// ============================================================================
// Data layer entry point. Selects the backend by env and exposes the async
// `store` plus id/time helpers. Default is node:sqlite; set ATS_DB=postgres to
// use Postgres (embedded PGlite, or a networked server via DATABASE_URL).
//
//   ATS_DB=sqlite                 → node:sqlite (default)
//   ATS_DB=postgres               → embedded PGlite (data/ats-connect-pg)
//   ATS_DB=postgres DATABASE_URL=…→ networked Postgres (needs `npm i pg`)
// ============================================================================
import { randomUUID } from 'node:crypto'
import { createSqliteStore } from './store/sqlite'
import { createPostgresStore } from './store/postgres'
import type { Store } from './store/types'
import type { AuditEntry } from '../shared/types'

export const uid = (): string => randomUUID()
export const now = (): string => new Date().toISOString()

const backend = process.env.ATS_DB === 'postgres' ? 'postgres' : 'sqlite'
export const store: Store = backend === 'postgres' ? await createPostgresStore() : createSqliteStore()
console.log(`[ats-connect] store backend: ${backend}${backend === 'postgres' ? (process.env.DATABASE_URL ? ' (networked pg)' : ' (embedded PGlite)') : ''}`)

/** Fire-and-forget audit (best-effort; never blocks or throws into a handler). */
export function audit(actor: AuditEntry['actor'], action: string, entity: string, entityId: string, detail?: string) {
  void store.audit.log({ id: uid(), at: now(), actor, action, entity, entityId, detail }).catch(() => {})
}

export type { Store } from './store/types'
