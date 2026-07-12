// Notification spine smoke — proves the outbox end-to-end on the mock
// transports: milestone → email sent (default-on) · SMS/WhatsApp strictly
// opt-in · prefs opt-out honored · dedupe keys make deadline scans + digests
// idempotent · bodies carry step labels only and NEVER hit the console.
import { store, uid, now } from '../server/db'
import { notifyCandidate, scanDeadlines, sendWeeklyDigests, transportMode } from '../server/notifications'
import { pushMilestone } from '../server/agents'
import type { CandidateProfile } from '../shared/types'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }
const run = uid().slice(0, 8)

// Capture console output for the no-PII assertion.
const logged: string[] = []
const origLog = console.log.bind(console)
const origWarn = console.warn.bind(console)
console.log = (...a: unknown[]) => { logged.push(a.map(String).join(' ')); origLog(...a) }
console.warn = (...a: unknown[]) => { logged.push(a.map(String).join(' ')); origWarn(...a) }

const SECRET_NAME = `Zsofia-${run}`
const SECRET_EMAIL = `zsofia-${run}@example.test`

async function main() {
  const c: CandidateProfile = {
    id: `cand-${run}`, legalFirstName: SECRET_NAME, legalLastName: 'Smoke', aliases: [],
    dateOfBirth: '1991-02-03', citizenship: 'Hungary', nationality: 'Hungarian',
    countryOfResidence: 'Hungary', email: SECRET_EMAIL, phone: '+36 30 000 0000',
    createdAt: now(), updatedAt: now(),
  } as CandidateProfile
  await store.candidates.insert(c)

  // ── transports report mock without keys ──
  const t = transportMode()
  ok('transports are mock-by-default', t.email === 'mock' && t.sms === 'mock' && t.whatsapp === 'mock', JSON.stringify(t))

  // ── milestone → email notification (default ON), sms/wa NOT sent ──
  await pushMilestone(c.id, undefined, 'Test milestone reached')
  await new Promise((r) => setTimeout(r, 50)) // fire-and-forget settles
  let rows = await store.notifications.byCandidate(c.id, 50)
  ok('milestone → exactly one email row', rows.filter((n) => n.channel === 'email').length === 1)
  ok('milestone email marked sent (mock transport)', rows[0]?.status === 'sent')
  ok('no sms/whatsapp without opt-in', rows.every((n) => n.channel === 'email'))
  ok('body names the milestone (label only)', rows[0]?.body.includes('Test milestone reached'))

  // ── opt-in sms → next notify writes an sms row too ──
  c.notificationPrefs = { email: true, sms: true }
  await store.candidates.update(c)
  await notifyCandidate(c.id, 'milestone', { milestone: 'Second milestone' })
  rows = await store.notifications.byCandidate(c.id, 50)
  ok('opted-in sms row written', rows.some((n) => n.channel === 'sms' && n.body.includes('Second milestone')))

  // ── opt-out email → skipped row, nothing sent ──
  c.notificationPrefs = { email: false, sms: false }
  await store.candidates.update(c)
  const out = await notifyCandidate(c.id, 'milestone', { milestone: 'Quiet milestone' })
  ok('opted-out email recorded as skipped', out.length === 1 && out[0]!.status === 'skipped')
  c.notificationPrefs = { email: true }
  await store.candidates.update(c)

  // ── dedupe: same key notifies once ──
  const first = await notifyCandidate(c.id, 'deadline', { what: 'test window', when: '2099-01-01' }, { dedupeKey: 'dd:test' })
  const second = await notifyCandidate(c.id, 'deadline', { what: 'test window', when: '2099-01-01' }, { dedupeKey: 'dd:test' })
  ok('dedupe key: first send goes out', first.length === 1)
  ok('dedupe key: replay is suppressed', second.length === 0)

  // ── deadline scanner: appointment in 3 days → one reminder, idempotent ──
  const soon = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString()
  const w = {
    id: uid(), candidateId: c.id, type: 'f1_visa' as const, status: 'in_progress' as const,
    steps: [], createdAt: now(), updatedAt: now(),
    appointment: { scheduledFor: soon },
  }
  await store.workflows.insert(w as never)
  const n1 = await scanDeadlines()
  const n2 = await scanDeadlines()
  ok('deadline scan sends the appointment reminder', n1 >= 1, `sent=${n1}`)
  ok('deadline scan is idempotent (dedupe)', n2 === 0, `resent=${n2}`)

  // ── weekly digest: composed from next actions, idempotent per week ──
  const d1 = await sendWeeklyDigests(async () => ['Licensure: Upload your verification', 'NCLEX: Schedule your exam'])
  const d2 = await sendWeeklyDigests(async () => ['Licensure: Upload your verification'])
  ok('weekly digest sent', d1 >= 1, `sent=${d1}`)
  ok('weekly digest idempotent within the ISO week', d2 === 0)
  rows = await store.notifications.byCandidate(c.id, 50)
  const digest = rows.find((n) => n.template === 'weekly_digest')
  ok('digest lists next actions (labels only)', Boolean(digest?.body.includes('Licensure: Upload your verification')))

  // ── privacy: the console never saw the name, email, or any body text ──
  const flat = logged.join('\n')
  ok('console: candidate name never logged', !flat.includes(SECRET_NAME))
  ok('console: candidate email never logged', !flat.includes(SECRET_EMAIL))
  ok('console: notification bodies never logged', !flat.includes('good news:') && !flat.includes('here’s your week'))

  // ── audit: sends recorded by template/channel/id only ──
  const audits = (await store.audit.byCandidate(c.id)).filter((a) => a.action?.startsWith?.('notification_'))
  ok('audit rows written for sends', audits.length >= 3)

  console.log(`\nNOTIFICATION SPINE SMOKE ${fail === 0 ? 'PASSED' : 'FAILED'} — ${pass} passed, ${fail} failed`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => { console.error('smoke crashed:', (e as Error).message); process.exit(1) })
