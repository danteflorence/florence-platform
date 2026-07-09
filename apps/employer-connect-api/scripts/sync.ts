// Sync a local-dev Pathway SQLite export into Employer Connect.
// Usage: PATHWAY_DB_PATH=./path/to/pathway.db ALLOW_SQLITE_LOCAL_DEV=1 npm run sync
import { syncFromPathway } from '../server/candidateProvider'

const r = await syncFromPathway()
console.log(`[ats-connect] synced ${r.synced} candidates from pathway-agent (${r.inserted} new, ${r.updated} updated)`)
console.log(`  source: ${r.source}`)
