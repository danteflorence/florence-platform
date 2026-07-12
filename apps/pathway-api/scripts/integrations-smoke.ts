// External-status sync smoke — the three rails, mock-first honesty:
// unconfigured API rails report 'unconfigured' and fabricate NOTHING; a Nursys
// fixture drives change-detection → milestone + notification, idempotently;
// candidate attestation (the always-on human rail) writes ledger + audit once.
import { store, uid, now } from '../server/db'
import { integrationModes, syncExternalStatuses, attestStatus, _injectNursysFixture, visaWaitDays } from '../server/integrations'
import type { CandidateProfile } from '../shared/types'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }
const run = uid().slice(0, 8)

async function main() {
  // ── honest mock posture ──
  const modes = integrationModes()
  ok('nursys rail unconfigured by default', modes.nursys_enotify === 'unconfigured')
  ok('visa feed unconfigured by default', modes.visa_wait_feed === 'unconfigured')
  ok('attestation rail always available', modes.candidate_attestation === 'configured')
  ok('visa wait returns null when unconfigured (never fabricated)', (await visaWaitDays('Manila')) === null)

  const c: CandidateProfile = {
    id: `cand-${run}`, legalFirstName: 'Amara', legalLastName: 'Okonkwo', aliases: [],
    dateOfBirth: '1993-05-05', citizenship: 'Nigeria', nationality: 'Nigerian',
    countryOfResidence: 'Nigeria', email: `sync-${run}@example.test`,
    createdAt: now(), updatedAt: now(),
  } as CandidateProfile
  await store.candidates.insert(c)

  // ── unconfigured sync = no-op, nothing invented ──
  const idle = await syncExternalStatuses()
  ok('sync with no rail configured checks nothing', idle.checked === 0 && idle.changed === 0)

  // ── fixture-driven Nursys change detection ──
  _injectNursysFixture(c.id, { status: 'ACTIVE', state: 'TX' })
  const first = await syncExternalStatuses()
  ok('status change detected once', first.changed >= 1)
  const again = await syncExternalStatuses()
  ok('unchanged status re-sync is silent (idempotent)', again.changed === 0)
  const updated = await store.candidates.get(c.id)
  ok('profile stores the rail state', updated?.externalStatuses?.nursys_license?.value === 'ACTIVE/TX')
  const ms = await store.ledger.byCandidate(c.id)
  ok('ledger milestone written for the change', ms.some((m) => m.milestone.includes('License status update: ACTIVE')))
  const notifs = await store.notifications.byCandidate(c.id, 20)
  ok('candidate notified of the change (via the spine)', notifs.some((n) => n.body.includes('License status update')))

  // ── candidate attestation rail ──
  const bad = await attestStatus(c.id, 'not_a_real_kind')
  ok('unknown attestation kind rejected', bad.ok === false)
  const att = await attestStatus(c.id, 'att_received')
  ok('ATT attestation accepted', att.ok === true && att.label === 'NCLEX Authorization to Test (ATT) received')
  await attestStatus(c.id, 'att_received') // replay
  const ms2 = (await store.ledger.byCandidate(c.id)).filter((m) => m.milestone.includes('Authorization to Test'))
  ok('attestation milestone written exactly once (replay-safe)', ms2.length === 1)
  const audits = (await store.audit.byCandidate(c.id)).filter((a) => (a as { action?: string }).action === 'status_attested')
  ok('attestation audited', audits.length === 1)

  console.log(`\nINTEGRATIONS SMOKE ${fail === 0 ? 'PASSED' : 'FAILED'} — ${pass} passed, ${fail} failed`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => { console.error('smoke crashed:', (e as Error).message); process.exit(1) })
