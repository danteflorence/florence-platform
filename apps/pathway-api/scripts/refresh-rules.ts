// Operator/cron entry point: re-verify every official source the rules cite.
// Live network fetches — run on a schedule (e.g. weekly) or before releases:
//
//   npm run refresh-rules
//
// CHANGED sources land in the staff review queue (GET /admin/freshness); a
// reviewer re-verifies the rule and approves. The engine never edits rules.
import { checkFreshness, freshnessBoard, sourceInventory } from '../server/freshness'

const inv = sourceInventory()
console.log(`re-verifying ${inv.length} official sources cited by the rules…`)
const r = await checkFreshness()
const board = await freshnessBoard()
console.log(`checked=${r.checked} changed=${r.changed} unreachable=${r.unreachable}`)
if (board.pendingChanges > 0) {
  console.log(`\n⚠ ${board.pendingChanges} source(s) CHANGED and await staff review:`)
  for (const s of board.sources.filter((x) => x.status === 'changed')) {
    console.log(`  • ${s.label} — ${s.url}  (workflows: ${s.workflows.join(', ')})`)
  }
  process.exitCode = 2 // signal "review needed" to cron/CI wrappers
}
const overdue = board.rules.filter((x) => x.overdue)
if (overdue.length > 0) {
  console.log(`\n⚠ ${overdue.length} rule(s) past their next-review date:`)
  for (const o of overdue) console.log(`  • ${o.type} (owner ${o.owner}, due ${o.nextReview})`)
}
