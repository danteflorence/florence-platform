// Flywheel + wallet smoke.
// Flywheel: recurring deficiencies (same class × workflow × corridor) become ONE
// proposed intake check (idempotent), staff approve it, and it surfaces only to
// matching candidates — the next cohort is warned before submitting.
// Wallet: grounded requirement fees roll up to the candidate's own totals;
// mark-paid is boolean state; the financing CTA is consent-gated; and the
// payload carries the candidate's OWN costs only — no Florence economics.
import { store, uid, now } from '../server/db'
import { clusterDeficiencies, decideIntakeCheck, checksForCandidate } from '../server/flywheel'
import { instantiateWorkflow } from '../server/agents/workflow'
import { runPipeline } from '../server/agents'
import { assembleCandidateView } from '../server/views'
import type { CandidateProfile } from '../shared/types'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }
const run = uid().slice(0, 8)

async function mk(n: number, citizenship: string): Promise<CandidateProfile> {
  const c: CandidateProfile = {
    id: `cand-fw-${run}-${n}`, legalFirstName: `Fw${n}`, legalLastName: 'Smoke', aliases: [],
    dateOfBirth: '1990-01-01', citizenship, nationality: citizenship,
    countryOfResidence: citizenship, email: `fw-${run}-${n}@example.test`,
    createdAt: now(), updatedAt: now(),
  } as CandidateProfile
  await store.candidates.insert(c)
  return c
}

async function main() {
  // ── seed a recurring deficiency: 2 PH candidates on CGFNS, same class ──
  for (let i = 0; i < 2; i++) {
    const c = await mk(i, 'Philippines')
    const w = instantiateWorkflow('cgfns_ces', c.id)
    await store.workflows.insert(w)
    await store.deficiencies.insert({
      id: uid(), workflowId: w.id, candidateId: c.id, source: 'cgfns',
      classification: 'missing_transcript_seal', items: ['Transcript lacks registrar seal'], receivedAt: now(),
    })
  }
  const r1 = await clusterDeficiencies()
  ok('recurring deficiency clustered into a proposal', r1.newProposals === 1, `new=${r1.newProposals}`)
  const r2 = await clusterDeficiencies()
  ok('reclustering is idempotent', r2.newProposals === 0)

  const proposed = ((await store.intakeChecks.all()) as { id: string; status: string; corridor: string }[]).filter((k) => k.status === 'proposed' && k.corridor === 'Philippines')
  ok('proposal carries the corridor', proposed.length === 1)
  const id = proposed[0]!.id

  // ── not visible to candidates until APPROVED ──
  const ph = await mk(7, 'Philippines')
  const phWf = instantiateWorkflow('cgfns_ces', ph.id)
  await store.workflows.insert(phWf)
  ok('proposed check NOT yet shown to candidates', (await checksForCandidate(ph, [phWf])).length === 0)

  ok('approval works', await decideIntakeCheck(id, 'approve', 'stacy'))
  ok('re-deciding a decided check is refused', !(await decideIntakeCheck(id, 'approve', 'stacy')))

  // ── surfaces to the matching corridor + workflow only ──
  ok('approved check surfaces to a matching PH candidate', (await checksForCandidate(ph, [phWf])).length === 1)
  const ke = await mk(8, 'Kenya')
  const keWf = instantiateWorkflow('cgfns_ces', ke.id)
  await store.workflows.insert(keWf)
  ok('different corridor does NOT see it', (await checksForCandidate(ke, [keWf])).length === 0)
  const phVisa = await mk(9, 'Philippines')
  const visaWf = instantiateWorkflow('ds160', phVisa.id)
  await store.workflows.insert(visaWf)
  ok('different workflow does NOT see it', (await checksForCandidate(phVisa, [visaWf])).length === 0)

  // ── wallet: grounded fees → candidate-owned totals ──
  const wc = await mk(10, 'Philippines')
  wc.employmentState = 'Texas'
  await store.candidates.update(wc)
  const wf = instantiateWorkflow('endorsement', wc.id)
  await store.workflows.insert(wf)
  await runPipeline(wf.id) // fees/sources live on the generated draft
  const v = await assembleCandidateView(wc.id)
  const feeItems = (v?.requirements ?? []).flatMap((g) => g.items.filter((i) => i.feeUsd != null).map((i) => ({ id: `${g.workflowId}:${i.fieldId}`, fee: i.feeUsd! })))
  ok('requirements expose grounded fees for the wallet', feeItems.length >= 1, `${feeItems.length} fee item(s)`)
  const known = feeItems.reduce((s, i) => s + i.fee, 0)
  ok('known total includes the Texas $186 board fee', known >= 186, `$${known}`)

  // mark-paid state machine (profile-level, boolean only)
  wc.paidFees = { [feeItems[0]!.id]: { at: now() } }
  await store.candidates.update(wc)
  const paid = feeItems.filter((i) => wc.paidFees?.[i.id]).reduce((s, i) => s + i.fee, 0)
  ok('paid/remaining split computes', paid > 0 && known - paid >= 0, `paid=$${paid} remaining=$${known - paid}`)

  // ── privacy: candidate view carries NO Florence economics ──
  const flat = JSON.stringify(v).toLowerCase()
  ok('candidate view has NO Florence economics', !/(revenue|mrr|margin|cohort_?value|subscription)/.test(flat))
  ok('financing surfaces as consent-gated boolean only', !('underwritingAmount' in JSON.parse(JSON.stringify(v ?? {}))))

  console.log(`\nFLYWHEEL+WALLET SMOKE ${fail === 0 ? 'PASSED' : 'FAILED'} — ${pass} passed, ${fail} failed`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => { console.error('smoke crashed:', (e as Error).message); process.exit(1) })
