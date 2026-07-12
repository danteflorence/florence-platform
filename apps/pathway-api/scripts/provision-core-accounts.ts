// C01 back-fill: provision a Core sign-in (user + `cand` binding + candidate role)
// for every EXISTING Pathway candidate, so PATHWAY_REQUIRE_AUTH=1 can flip on without
// locking anyone out of their own dossier. New candidates are provisioned at intake;
// this covers the ones created before that hook existed.
//
// Env-gated like every spine call: requires CORE_ISSUER_URL + FLORENCE_CORE_CLIENT_ID/
// SECRET (the app M2M client with passport:write). Without creds it prints the dry-run
// plan and exits 0 — safe to run anywhere. Idempotent: re-runs are no-ops (Core returns
// created:false), and refusals (staff email / different-candidate binding) are LISTED
// for ops reconciliation, never forced.
import { createPassportClient } from '../server/coreAuth'
import { store } from '../server/db'

const coreUrl = process.env.CORE_ISSUER_URL ?? process.env.PUBLIC_CORE_URL ?? 'http://id.lvh.me:8080'
const clientId = process.env.FLORENCE_CORE_CLIENT_ID ?? ''
const clientSecret = process.env.FLORENCE_CORE_CLIENT_SECRET ?? ''

async function main() {
  const candidates = await store.candidates.all()
  const withEmail = candidates.filter((c) => Boolean(c.email))
  console.log(`[backfill] ${candidates.length} candidates; ${withEmail.length} have an email (provisionable).`)
  if (candidates.length - withEmail.length > 0) {
    console.log(`[backfill] ${candidates.length - withEmail.length} candidates have NO email — they cannot sign in until ops adds one:`)
    for (const c of candidates.filter((x) => !x.email)) console.log(`  - ${c.id}`)
  }

  if (!clientId || !clientSecret) {
    console.log('[backfill] DRY RUN — no FLORENCE_CORE_CLIENT_ID/SECRET set. Set the app M2M creds and re-run to provision against', coreUrl)
    return
  }

  const client = createPassportClient({ coreUrl, clientId, clientSecret })
  let created = 0, existing = 0, refused = 0, failed = 0
  for (const c of withEmail) {
    try {
      const r = await client.provisionCandidate({
        email: c.email!,
        name: `${c.legalFirstName} ${c.legalLastName}`.trim(),
        candId: c.id,
      })
      r.created ? created++ : existing++
    } catch (e) {
      const msg = (e as Error).message
      if (/409/.test(msg)) {
        refused++
        console.log(`[backfill] REFUSED (needs ops reconciliation): ${c.id} — ${msg}`)
      } else {
        failed++
        console.log(`[backfill] FAILED: ${c.id} — ${msg}`)
      }
    }
  }
  console.log(`[backfill] done: ${created} created, ${existing} already provisioned, ${refused} refused, ${failed} failed.`)
  console.log('[backfill] Flip PATHWAY_REQUIRE_AUTH=1 only once refused+failed are resolved (or accepted).')
  if (failed > 0) process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) })
