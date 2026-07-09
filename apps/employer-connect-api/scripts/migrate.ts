import { createPgClient } from '../server/store/pgClient'
import { ATS_POSTGRES_DDL } from '../server/store/postgres'

const db = await createPgClient()
await db.exec(ATS_POSTGRES_DDL)
console.log('[ats-connect] Postgres migration complete')
