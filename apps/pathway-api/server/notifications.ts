// ============================================================================
// Notification spine — the engine finally speaks. Event-driven outbox:
// milestones / QA decisions / deficiencies enqueue a notification; a deadline
// scanner + weekly digest cover the calendar. Mock-by-default transports —
// with no provider keys every send is recorded (status 'sent', mock) so the
// product loop is testable end-to-end; real providers activate via env:
//   POSTMARK_SERVER_TOKEN (+ MAIL_FROM)               → email
//   TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN
//     + TWILIO_FROM_SMS / TWILIO_FROM_WHATSAPP        → sms / whatsapp
//
// Privacy posture (AGENTS.md): bodies carry step LABELS only — never document
// contents, numbers, or visa specifics beyond the candidate's own milestone
// label. Bodies live in the outbox table, NOT in logs; console + audit see ids
// and template names only. Email defaults ON (transactional); SMS/WhatsApp are
// opt-in. Every send is audited by id.
// ============================================================================
import type { CandidateProfile, NotificationRecord } from '../shared/types'
import { store, uid, now, audit } from './db'

// ── transports ───────────────────────────────────────────────────────────────
type Channel = 'email' | 'sms' | 'whatsapp'
const postmarkToken = process.env.POSTMARK_SERVER_TOKEN ?? ''
const mailFrom = process.env.MAIL_FROM ?? 'no-reply@florenceedu.com'
const twilioSid = process.env.TWILIO_ACCOUNT_SID ?? ''
const twilioToken = process.env.TWILIO_AUTH_TOKEN ?? ''
const twilioFromSms = process.env.TWILIO_FROM_SMS ?? ''
const twilioFromWa = process.env.TWILIO_FROM_WHATSAPP ?? ''

export function transportMode(): { email: 'postmark' | 'mock'; sms: 'twilio' | 'mock'; whatsapp: 'twilio' | 'mock' } {
  return {
    email: postmarkToken ? 'postmark' : 'mock',
    sms: twilioSid && twilioToken && twilioFromSms ? 'twilio' : 'mock',
    whatsapp: twilioSid && twilioToken && twilioFromWa ? 'twilio' : 'mock',
  }
}

async function deliver(channel: Channel, to: string, subject: string, body: string): Promise<void> {
  if (channel === 'email') {
    if (!postmarkToken) return // mock: recorded in the outbox only
    const r = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', 'X-Postmark-Server-Token': postmarkToken },
      body: JSON.stringify({ From: mailFrom, To: to, Subject: subject, TextBody: body, MessageStream: 'outbound' }),
    })
    if (!r.ok) throw new Error(`postmark ${r.status}`)
    return
  }
  const from = channel === 'sms' ? twilioFromSms : twilioFromWa
  if (!twilioSid || !twilioToken || !from) return // mock
  const dest = channel === 'whatsapp' ? `whatsapp:${to}` : to
  const src = channel === 'whatsapp' ? `whatsapp:${from}` : from
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: dest, From: src, Body: `${subject}\n${body}` }).toString(),
  })
  if (!r.ok) throw new Error(`twilio ${r.status}`)
}

// ── templates (step labels only — no contents, numbers, or specifics) ────────
const TEMPLATES: Record<string, (first: string, vars: Record<string, string>) => { subject: string; body: string }> = {
  milestone: (first, v) => ({
    subject: `Progress on your pathway: ${v.milestone}`,
    body: `Hi ${first} — good news: "${v.milestone}" just completed on your Florence pathway. Sign in to see what's next.`,
  }),
  qa_changes_requested: (first, v) => ({
    subject: 'Your reviewer needs one more thing',
    body: `Hi ${first} — your Florence reviewer looked at your ${v.step} and needs a small update from you. Sign in to see exactly what's needed.`,
  }),
  deficiency: (first, v) => ({
    subject: 'Action needed on your application',
    body: `Hi ${first} — a "${v.kind}" notice arrived on your ${v.step}. Don't worry: sign in and we'll walk you through fixing it step by step.`,
  }),
  deadline: (first, v) => ({
    subject: `Reminder: ${v.what} — ${v.when}`,
    body: `Hi ${first} — a date on your pathway is coming up: ${v.what} (${v.when}). Sign in to see what to prepare.`,
  }),
  weekly_digest: (first, v) => ({
    subject: 'Your Florence week',
    body: `Hi ${first} — here's your week on the pathway:\n${v.items}\nSign in for details and sources.`,
  }),
}

// ── the outbox ───────────────────────────────────────────────────────────────
export interface NotifyOptions { dedupeKey?: string; workflowId?: string }

/** Enqueue + attempt delivery of one candidate notification on every channel
 *  their preferences allow. Never throws; returns the created rows. */
export async function notifyCandidate(
  candidateId: string,
  template: keyof typeof TEMPLATES | string,
  vars: Record<string, string>,
  opts: NotifyOptions = {},
): Promise<NotificationRecord[]> {
  try {
    const c = await store.candidates.get(candidateId)
    if (!c) return []
    const render = TEMPLATES[template]
    if (!render) return []
    if (opts.dedupeKey && (await store.notifications.byDedupeKey(candidateId, opts.dedupeKey))) return []
    const { subject, body } = render(c.legalFirstName, vars)
    const prefs = { email: true, sms: false, whatsapp: false, ...(c.notificationPrefs ?? {}) }
    const channels: { channel: Channel; to: string | undefined; enabled: boolean }[] = [
      { channel: 'email', to: c.email, enabled: prefs.email },
      { channel: 'sms', to: c.phone, enabled: prefs.sms },
      { channel: 'whatsapp', to: c.phone, enabled: prefs.whatsapp },
    ]
    const out: NotificationRecord[] = []
    for (const { channel, to, enabled } of channels) {
      if (channel !== 'email' && (!enabled || !to)) continue // sms/wa strictly opt-in
      const n: NotificationRecord = {
        id: uid(), candidateId, channel, template: String(template), subject, body,
        status: enabled && to ? 'queued' : 'skipped',
        ...(opts.dedupeKey ? { dedupeKey: opts.dedupeKey } : {}),
        ...(opts.workflowId ? { workflowId: opts.workflowId } : {}),
        createdAt: now(),
      }
      if (n.status === 'queued') {
        try {
          await deliver(channel, to!, subject, body)
          n.status = 'sent'
          n.sentAt = now()
        } catch {
          n.status = 'failed' // provider error — row keeps the message for retry
        }
      }
      await store.notifications.insert(n)
      // Audit by id + template ONLY — the body never reaches logs or audit.
      await audit('system', 'notification_' + n.status, 'candidate', candidateId, candidateId, `${n.template}/${n.channel}/${n.id}`)
      out.push(n)
    }
    return out
  } catch {
    return [] // notifications never break the main flow
  }
}

// ── deadline scanner (idempotent via dedupe keys) ────────────────────────────
const DAY = 24 * 60 * 60 * 1000
function within(dateIso: string | undefined, days: number): boolean {
  if (!dateIso) return false
  const t = Date.parse(dateIso)
  return Number.isFinite(t) && t > Date.now() && t - Date.now() <= days * DAY
}
const dayBucket = (iso: string) => iso.slice(0, 10)

/** Scan every dossier for upcoming dates and enqueue reminders (once each). */
export async function scanDeadlines(): Promise<number> {
  let sent = 0
  const candidates = await store.candidates.all()
  for (const c of candidates) {
    const d = await (await import('./db')).getDossier(c.id)
    if (!d) continue
    // Visa appointment within 7 days.
    for (const w of d.workflows ?? []) {
      const appt = (w as { appointment?: { scheduledFor?: string } }).appointment
      if (appt?.scheduledFor && within(appt.scheduledFor, 7)) {
        const r = await notifyCandidate(c.id, 'deadline',
          { what: 'your visa interview appointment', when: dayBucket(appt.scheduledFor) },
          { dedupeKey: `appt:${dayBucket(appt.scheduledFor)}`, workflowId: w.id })
        sent += r.length
      }
    }
    // NCLEX ATT validity ending within 30 days.
    for (const reg of d.nclex ?? []) {
      const att = (reg as { attExpiresAt?: string }).attExpiresAt
      if (att && within(att, 30)) {
        const r = await notifyCandidate(c.id, 'deadline',
          { what: 'your NCLEX authorization (ATT) window closing', when: dayBucket(att) },
          { dedupeKey: `att:${dayBucket(att)}` })
        sent += r.length
      }
    }
    // Identity document expiry within 60 days (label only — never the number).
    for (const doc of d.identityDocuments ?? []) {
      const exp = (doc as { expiresAt?: string; expiryDate?: string }).expiresAt ?? (doc as { expiryDate?: string }).expiryDate
      if (exp && within(exp, 60)) {
        const r = await notifyCandidate(c.id, 'deadline',
          { what: 'an identity document on file expiring', when: dayBucket(exp) },
          { dedupeKey: `docexp:${dayBucket(exp)}` })
        sent += r.length
      }
    }
  }
  return sent
}

// ── weekly digest (idempotent per ISO week) ──────────────────────────────────
function isoWeek(dt = new Date()): string {
  const d = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const y = d.getUTCFullYear()
  const week = Math.ceil((((d.getTime() - Date.UTC(y, 0, 1)) / DAY) + 1) / 7)
  return `${y}-W${String(week).padStart(2, '0')}`
}

/** Send each candidate their "Your week" — top 3 next actions, labels only. */
export async function sendWeeklyDigests(nextActionsFor: (candidateId: string) => Promise<string[]>): Promise<number> {
  let sent = 0
  const week = isoWeek()
  for (const c of await store.candidates.all()) {
    const actions = (await nextActionsFor(c.id)).slice(0, 3)
    if (!actions.length) continue
    const items = actions.map((a) => `  • ${a}`).join('\n')
    const r = await notifyCandidate(c.id, 'weekly_digest', { items }, { dedupeKey: `digest:${week}` })
    sent += r.length
  }
  return sent
}

// ── background loop ──────────────────────────────────────────────────────────
/** Hourly deadline scan + Monday digests. Dedupe keys make every run idempotent. */
export function startNotificationLoop(nextActionsFor: (candidateId: string) => Promise<string[]>): NodeJS.Timeout | undefined {
  if (process.env.PATHWAY_NOTIFICATIONS_DISABLED === '1') return undefined
  const tick = async () => {
    try {
      await scanDeadlines()
      if (new Date().getUTCDay() === 1) await sendWeeklyDigests(nextActionsFor)
    } catch {
      /* the loop never crashes the server */
    }
  }
  void tick()
  return setInterval(tick, 60 * 60 * 1000)
}
