// Postgres client factory. Networked Postgres is used when DATABASE_URL is set
// (production). Outside production, in-memory PGlite provides a Postgres dialect
// smoke path without writing local database directories into the repo. A
// persistent PGlite directory is allowed only when PGLITE_DATA_DIR is explicit.

export interface PgClient {
  query(text: string, params?: unknown[]): Promise<{ rows: any[] }>
  exec(sql: string): Promise<void>
}

export async function createPgClient(): Promise<PgClient> {
  const url = process.env.DATABASE_URL
  if (url) {
    // Networked Postgres (production). Requires `npm i pg`.
    // @ts-ignore - `pg` is an optional peer; only needed when DATABASE_URL is set.
    const pg = await import('pg').catch(() => { throw new Error('DATABASE_URL is set but the `pg` package is not installed — run `npm i pg`.') })
    const pool = new (pg as any).Pool({ connectionString: url })
    return {
      query: (text, params) => pool.query(text, params as unknown[]),
      exec: async (sql) => { await pool.query(sql) },
    }
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production; local PGlite is dev/test only.')
  }

  // Embedded Postgres (PGlite) — in-memory unless a caller explicitly opts into
  // a local path outside source-controlled data.
  const { PGlite } = await import('@electric-sql/pglite')
  const dataDir = process.env.PGLITE_DATA_DIR
  const db = dataDir ? await PGlite.create(dataDir) : new PGlite()
  return {
    query: (text, params) => db.query(text, params as unknown[]),
    exec: (sql) => db.exec(sql).then(() => undefined),
  }
}
