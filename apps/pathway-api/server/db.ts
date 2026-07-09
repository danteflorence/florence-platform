// ============================================================================
// Data layer entry point. Production/default is Postgres. SQLite remains
// available only for explicit throwaway local development.
// ============================================================================

const requestedBackend = process.env.PATHWAY_DB ?? 'postgres'
const sqliteAllowed = requestedBackend === 'sqlite' && process.env.ALLOW_SQLITE_LOCAL_DEV === '1' && process.env.NODE_ENV !== 'production'

if (requestedBackend !== 'postgres' && requestedBackend !== 'sqlite') {
  throw new Error(`Unsupported PATHWAY_DB=${requestedBackend}; use postgres or explicit local sqlite.`)
}
if (requestedBackend === 'sqlite' && !sqliteAllowed) {
  throw new Error('PATHWAY_DB=sqlite is allowed only with ALLOW_SQLITE_LOCAL_DEV=1 outside production.')
}

const impl = requestedBackend === 'postgres'
  ? await import('./db.postgres')
  : await import('./db.sqlite')

export const databaseBackend = impl.databaseBackend
export const migrationStatus = impl.migrationStatus
export const uid = impl.uid
export const now = impl.now
export const store = impl.store
export const getDossier = impl.getDossier
export const audit = impl.audit
