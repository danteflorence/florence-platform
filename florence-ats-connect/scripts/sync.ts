// Sync the candidate projection from florence-pathway-agent into ATS Connect.
// Usage: npm run sync   (set PATHWAY_DB_PATH to override the source db location)
import { syncFromPathway } from '../server/candidateProvider'

const r = await syncFromPathway()
console.log(`[ats-connect] synced ${r.synced} candidates from pathway-agent (${r.inserted} new, ${r.updated} updated)`)
console.log(`  source: ${r.source}`)
