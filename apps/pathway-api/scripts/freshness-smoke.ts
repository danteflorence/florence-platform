// Freshness-engine smoke — hermetic (injected fetcher, zero network):
// baseline pass → all ok; content change → review-queue item + audit; noise
// (whitespace/scripts) does NOT trigger; unreachable tracked; approval clears.
import { checkFreshness, freshnessBoard, sourceInventory } from '../server/freshness'
import { store } from '../server/db'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }

async function main() {
  const inv = sourceInventory()
  ok('inventory covers the rules’ official sources', inv.length >= 10, `${inv.length} urls`)
  ok('inventory is deduped', new Set(inv.map((s) => s.url)).size === inv.length)

  // ── baseline pass: every source gets an 'ok' snapshot ──
  const v1 = new Map(inv.map((s) => [s.url, `<html><body>Fees: $200 for ${s.label}</body></html>`]))
  const f1 = await checkFreshness(async (u) => v1.get(u) ?? null)
  ok('baseline: all sources checked', f1.checked === inv.length)
  ok('baseline: nothing marked changed', f1.changed === 0)

  // ── cosmetic noise does not trigger (normalization) ──
  const noisy = new Map([...v1].map(([u, b]) => [u, `<html><script>track(${Date.now()})</script><body>  Fees:   $200 for ${v1.get(u)!.match(/for (.*)<\/body>/)?.[1] ?? ''}  </body></html>`] as const))
  const f2 = await checkFreshness(async (u) => noisy.get(u) ?? null)
  ok('whitespace/script noise does NOT flag a change', f2.changed === 0)

  // ── a REAL content change lands in the review queue ──
  const target = inv[0]!
  const v3 = new Map<string, string>(noisy)
  v3.set(target.url, '<html><body>Fees: $250 — updated fee schedule</body></html>')
  const f3 = await checkFreshness(async (u) => v3.get(u) ?? null)
  ok('real fee change detected exactly once', f3.changed === 1)
  let board = await freshnessBoard()
  ok('review queue shows the pending change', board.pendingChanges === 1)
  const changed = board.sources.find((s) => s.status === 'changed')
  ok('queue item carries url + affected workflows', changed?.url === target.url && (changed?.workflows.length ?? 0) > 0)

  // ── unchanged re-run keeps it pending (sticky until reviewed) ──
  const f4 = await checkFreshness(async (u) => v3.get(u) ?? null)
  ok('re-run does not duplicate the pending item', f4.changed === 0 && (await freshnessBoard()).pendingChanges === 1)

  // ── unreachable tracked, never fabricated ──
  const v5 = new Map(v3)
  v5.delete(inv[1]!.url)
  const f5 = await checkFreshness(async (u) => v5.get(u) ?? null)
  ok('unreachable source tracked', f5.unreachable === 1)

  // ── staff approval clears the queue (direct snapshot update — the route
  //     re-fetches live; here we assert the state machine) ──
  const snapId = `src_${(await import('node:crypto')).createHash('sha256').update(target.url).digest('hex').slice(0, 24)}`
  const snap = (await store.ruleSnapshots.get(snapId)) as Record<string, unknown>
  await store.ruleSnapshots.upsert(snapId, { ...snap, status: 'ok', reviewedAt: new Date().toISOString(), reviewedBy: 'stacy' })
  board = await freshnessBoard()
  ok('approval clears the pending queue', board.pendingChanges === 0)

  // ── audit wrote the change event ──
  const audits = await store.audit.recent(200)
  ok('source change audited', audits.some((a) => (a as { action?: string }).action === 'rule_source_changed'))

  console.log(`\nFRESHNESS SMOKE ${fail === 0 ? 'PASSED' : 'FAILED'} — ${pass} passed, ${fail} failed`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => { console.error('smoke crashed:', (e as Error).message); process.exit(1) })
