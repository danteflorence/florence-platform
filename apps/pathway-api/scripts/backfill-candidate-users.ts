// One-time back-fill: provision a Core sign-in account (OTP / C01) for every
// EXISTING Pathway candidate, so PATHWAY_REQUIRE_AUTH=1 locks nobody out.
// Requires the spine creds (FLORENCE_CORE_CLIENT_ID/SECRET with
// identity:provision) and a reachable Core; conflicts (an email already linked
// to a different candidate) are reported, never repointed.
//
//   FLORENCE_CORE_CLIENT_ID=florence-pathway FLORENCE_CORE_CLIENT_SECRET=… \
//   CORE_ISSUER_URL=https://id.florenceedu.com \
//     node --import tsx scripts/backfill-candidate-users.ts
import { store } from '../server/db'
import { passportEnabled, provisionCandidateUser } from '../server/passport'

if (!passportEnabled) {
  console.error('✗ FLORENCE_CORE_CLIENT_ID/SECRET not set — nothing to do (mock mode).')
  process.exit(1)
}

const candidates = await store.candidates.all()
let ok = 0
let skipped = 0
let failed = 0
for (const c of candidates) {
  if (!c.email) { skipped += 1; continue }
  const done = await provisionCandidateUser(c.id)
  if (done) { ok += 1; console.log(`✓ ${c.id}`) }
  else { failed += 1; console.warn(`✗ ${c.id} (see warnings above)`) }
}
console.log(`\nprovisioned ${ok}/${candidates.length} (${skipped} without email, ${failed} failed)`)
process.exit(failed > 0 ? 1 : 0)
