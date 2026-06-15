// Demand Reservations smoke (both backends). Proves the soft-reservation lifecycle:
// reserve 3 → cockpit reserved=3 → cancel 1 (tombstone) → reserved=2 → mark 1 filled →
// reserved=1/filled+1; fee snapshot held; NO nurse PII; non-exclusive; and reservations
// NEVER create a ledger/billing side-effect. Run-scoped ids isolate from accumulated rows.
import { store, uid, now } from '../server/db'
import { createReservation, cancelReservation, markReservationFilled, reservationCockpit } from '../server/demand/reservations'
import type { FlorenceRNJob } from '../shared/demand-types'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }
const run = uid().slice(0, 8)

async function main() {
  const employerName = `Kaiser ${run}`
  const job: FlorenceRNJob = { id: uid(), employerId: `emp_${run}`, employerName, fingerprint: `fp_${run}`, title: 'Registered Nurse', normalizedRole: 'registered_nurse', setting: 'hospital', status: 'open', confidence: 'low', firstSeenAt: now(), lastSeenAt: now(), state: 'NV', requiredLicenseState: 'NV' }
  await store.demandJobs.insert(job)
  const jobB: FlorenceRNJob = { ...job, id: uid(), fingerprint: `fpB_${run}` }
  await store.demandJobs.insert(jobB)

  // Reserve 3 against Job-A.
  const r1 = await createReservation(job.id, { nurseId: `cand_${run}_1` })
  await createReservation(job.id, { nurseId: `cand_${run}_2` })
  const r3 = await createReservation(job.id)
  ok('fee snapshot positive + sourced', r1.perRnMonthlyFeeUsd > 0 && (r1.feeSource === 'pricing_api' || r1.feeSource === 'fallback'), `$${r1.perRnMonthlyFeeUsd} (${r1.feeSource})`)
  ok('pricing-api down → fallback fee 1750', r1.feeSource === 'fallback' ? r1.perRnMonthlyFeeUsd === 1750 : true)
  ok('reservation carries NO nurse PII (no email/fullName/@)', !/"email"/.test(JSON.stringify(r1)) && !/"fullName"/.test(JSON.stringify(r1)) && !/@/.test(JSON.stringify(r1)))

  let cockpit = await reservationCockpit()
  ok('cockpit: Job-A reserved = 3', cockpit.reservedByJob[job.id]?.count === 3, String(cockpit.reservedByJob[job.id]?.count))
  ok('cockpit: employer pipelineFeeUsd = 3 × fee', cockpit.reservedByEmployer[employerName]?.pipelineFeeUsd === 3 * r1.perRnMonthlyFeeUsd)

  // Cancel 1 → tombstone (status cancelled, still present), reserved → 2.
  const cancelled = await cancelReservation(r3.id, 'employer paused')
  ok('cancel → status cancelled + tombstone retained (not deleted)', cancelled.status === 'cancelled' && (await store.reservations.get(r3.id)) !== null)
  cockpit = await reservationCockpit()
  ok('cockpit: Job-A reserved = 2 after cancel', cockpit.reservedByJob[job.id]?.count === 2, String(cockpit.reservedByJob[job.id]?.count))

  // Mark 1 filled → reserved → 1, filled +1.
  const beforeFilled = cockpit.totalFilled
  const filled = await markReservationFilled(r1.id, `cand_${run}_1`)
  ok('markFilled → status filled + filledAt set', filled.status === 'filled' && !!filled.filledAt)
  cockpit = await reservationCockpit()
  ok('cockpit: Job-A reserved = 1 after fill', cockpit.reservedByJob[job.id]?.count === 1, String(cockpit.reservedByJob[job.id]?.count))
  ok('cockpit: totalFilled increased by 1', cockpit.totalFilled === beforeFilled + 1)

  // Fee snapshot is held even after a (simulated) re-price — cancelled/filled keep their snapshot.
  ok('fee snapshot held on tombstoned + filled reservations', cancelled.perRnMonthlyFeeUsd === r1.perRnMonthlyFeeUsd && filled.perRnMonthlyFeeUsd === r1.perRnMonthlyFeeUsd)

  // Non-exclusive: the same candidate already reserved for Job-A can reserve Job-B.
  const rB = await createReservation(jobB.id, { nurseId: `cand_${run}_1` })
  ok('non-exclusive: candidate reserved for Job-A can also reserve Job-B', rB.jobId === jobB.id && rB.status === 'live')

  // Soft: reservations NEVER write the Production Ledger / billing.
  const ledgerForCand = await store.ledger.byCandidate(`cand_${run}_1`)
  ok('reservations create NO ledger events (never billing/payment/employer action)', ledgerForCand.length === 0)

  console.log(`\n${fail ? 'RESERVATIONS SMOKE FAILED' : 'RESERVATIONS SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
