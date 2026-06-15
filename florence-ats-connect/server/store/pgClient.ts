// Postgres client factory. Embedded PGlite by default (real Postgres SQL, no
// server — used for dev + the verification smoke). A networked Postgres is used
// when DATABASE_URL is set (production), via the optional `pg` dependency. Both
// expose the same minimal contract, so postgres.ts runs identical SQL on either.
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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
  // Embedded Postgres (PGlite) — file-backed for persistence, real Postgres engine.
  const { PGlite } = await import('@electric-sql/pglite')
  const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'ats-connect-pg')
  mkdirSync(dataDir, { recursive: true })
  const db = await PGlite.create(dataDir)
  return {
    query: (text, params) => db.query(text, params as unknown[]),
    exec: (sql) => db.exec(sql).then(() => undefined),
  }
}
