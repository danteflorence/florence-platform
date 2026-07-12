// Predictive-ETA smoke — cohort learning with a transparent basis:
// finished workflows teach per-node durations; a new candidate's forecast uses
// the cohort median where samples exist (baseline elsewhere), carries an
// ordered p25–p75 band, names the biggest lever, and stays SCHEDULE-ONLY.
import { store, uid, now } from '../server/db'
import { cohortNodeDurations, candidateEta, etaForecast } from '../server/eta'
import { instantiateWorkflow } from '../server/agents/workflow'
import type { CandidateProfile } from '../shared/types'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }
const run = uid().slice(0, 8)
const DAY = 24 * 60 * 60 * 1000
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString()

async function mkCandidate(n: number): Promise<string> {
  const c: CandidateProfile = {
    id: `cand-eta-${run}-${n}`, legalFirstName: `Eta${n}`, legalLastName: 'Cohort', aliases: [],
    dateOfBirth: '1990-01-01', citizenship: 'Philippines', nationality: 'Filipino',
    countryOfResidence: 'Philippines', email: `eta-${run}-${n}@example.test`,
    createdAt: now(), updatedAt: now(),
  } as CandidateProfile
  await store.candidates.insert(c)
  return c.id
}

async function main() {
  // ── teach the cohort: 4 candidates finished CGFNS in 30/40/50/60 days ──
  const durations = [30, 40, 50, 60]
  for (let i = 0; i < durations.length; i++) {
    const cid = await mkCandidate(i)
    const w = instantiateWorkflow('cgfns_ces', cid)
    w.status = 'completed'
    ;(w as { createdAt: string }).createdAt = iso(durations[i]! * DAY + 5 * DAY)
    ;(w as { updatedAt: string }).updatedAt = iso(5 * DAY)
    await store.workflows.insert(w)
  }
  const cohort = await cohortNodeDurations()
  const cg = cohort.get('cgfns')
  ok('cohort learned the CGFNS node', Boolean(cg) && cg!.n === 4, `n=${cg?.n}`)
  ok('median ≈ 45 days (30/40/50/60)', Math.abs((cg?.p50 ?? 0) - 45) < 1.5, `p50=${cg?.p50.toFixed(1)}`)
  ok('band ordered p25 < p50 < p75', (cg!.p25 < cg!.p50) && (cg!.p50 < cg!.p75))

  // ── a NEW candidate's forecast blends cohort + baseline ──
  const cid = await mkCandidate(9)
  await store.workflows.insert(instantiateWorkflow('cgfns_ces', cid))
  const eta = await candidateEta(cid)
  ok('forecast produced', Boolean(eta))
  ok('dates ordered earliest ≤ eta ≤ latest', eta!.earliest <= eta!.etaDate && eta!.etaDate <= eta!.latest)
  const cgBasis = eta!.basis.find((b) => b.key === 'cgfns')
  ok('CGFNS priced from the COHORT (n=4)', cgBasis?.source === 'cohort' && cgBasis.sampleSize === 4)
  ok('unlearned nodes fall back to baseline', eta!.basis.some((b) => b.source === 'baseline'))
  ok('biggest lever named', Boolean(eta!.biggestLever?.label), eta!.biggestLever?.label)
  ok('remaining days positive and sane', eta!.remainingDays > 30 && eta!.remainingDays < 400, `${eta!.remainingDays}d`)

  // ── schedule-only: no economics anywhere in the payload ──
  const flat = JSON.stringify(eta).toLowerCase()
  ok('NO economics in the candidate ETA payload', !/(revenue|price|mrr|margin|cohortvalue|\$)/.test(flat))

  // ── staff forecast aggregates ──
  const f = await etaForecast()
  ok('staff forecast lists candidates with ETAs', f.candidates.length >= 1)
  ok('starts-by-month buckets present', Object.keys(f.startsByMonth).length >= 1)

  console.log(`\nETA SMOKE ${fail === 0 ? 'PASSED' : 'FAILED'} — ${pass} passed, ${fail} failed`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => { console.error('smoke crashed:', (e as Error).message); process.exit(1) })
