// Employer outreach — DRAFT ONLY. Generates a per-employer email + a 4-step cadence
// (Intro → Follow-up 1 → Follow-up 2 w/ availability → graceful close) + a PDF. A human
// reviews and sends from their own inbox (mailto only). NEVER auto-sent, NEVER bulk, and
// employer contact is never exported. Modeled on labor-economics-agent/outreach_email.py.
// COMPLIANCE: references ONLY aggregate consented interest + the claim link; contains NO
// FICA/tax/visa/immigration language; cites no fabricated price.
import { store, uid, now } from '../db'
import { composePdf } from '../resumePdf'
import { normalizeMarket, roleCategoryLabel } from '../../shared/market'
import { issueClaimToken } from './longTail'
import type { RoleCategory } from '../../shared/demand-types'

export interface OutreachStep { step: number; label: string; subject: string; body: string; mailto: string }
export interface OutreachDraft {
  status: 'draft'
  employerName: string
  market: string
  marketDisplay: string
  roleCategory: RoleCategory
  aggregateInterestCount: number
  claimUrl?: string
  email: { subjects: string[]; subject: string; body: string; mailto: string }
  sequence: OutreachStep[]
}

const mailto = (subject: string, body: string): string => `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

export async function buildOutreachDraft(args: { employerName: string; city?: string; state?: string; roleCategory: RoleCategory; issuedBy: string }): Promise<OutreachDraft> {
  const m = normalizeMarket(args.city, args.state)
  const role = roleCategoryLabel(args.roleCategory)
  // Aggregate, consented interest only (never named leads).
  const interests = await store.marketInterest.byMarket(m.key, args.roleCategory)
  const aggregateInterestCount = interests.filter((i) => i.consentToShareAggregate).length
  // A claim link so the employer can self-serve publish the role.
  let claimUrl: string | undefined
  try { claimUrl = (await issueClaimToken({ city: args.city, state: m.state, roleCategory: args.roleCategory, prefillTitle: role, issuedBy: args.issuedBy })).claimUrl } catch { claimUrl = undefined }

  const interestLine = aggregateInterestCount > 0
    ? `We already have ${aggregateInterestCount} FlorenceRN nurse(s) who have expressed interest in ${role} roles in ${m.display}.`
    : `We are building FlorenceRN nurse interest in ${role} roles in ${m.display}.`
  const value = `FlorenceRN helps healthcare employers add licensed RN capacity on a per-RN/month model, billed after a nurse starts. We present licensed RN packets and support interviews through a simple employer workflow.`
  const claimLine = claimUrl ? `\n\nClaim and promote this role in FlorenceRN: ${claimUrl}` : ''
  const sign = `\n\n— The FlorenceRN team`

  const subjects = [
    `RNs interested in your ${role} roles in ${m.display}`,
    `Licensed ${role} capacity for ${args.employerName}`,
    `${m.display}: FlorenceRN can supply licensed RNs`,
  ]
  const intro = `Hi [First name],\n\n${interestLine} ${value}${claimLine}\n\nWould a 15-minute call this week be useful?${sign}`

  const sequence: OutreachStep[] = [
    { step: 1, label: 'Intro', subject: subjects[0], body: intro, mailto: mailto(subjects[0], intro) },
    { step: 2, label: 'Follow-up 1', subject: `Re: ${subjects[0]}`, body: `Hi [First name],\n\nFollowing up — ${interestLine} If you are still hiring ${role}s in ${m.display}, we can create a role in FlorenceRN and start presenting licensed RN packets.${claimLine}${sign}`, mailto: mailto(`Re: ${subjects[0]}`, `Following up on licensed ${role} capacity in ${m.display}.${claimLine}`) },
    { step: 3, label: 'Follow-up 2 (availability)', subject: `Licensed ${role}s available — ${m.display}`, body: `Hi [First name],\n\nWe have licensed and near-licensed RNs ready for ${role} roles in ${m.display}. Happy to share availability on a quick call, or you can claim the role directly.${claimLine}${sign}`, mailto: mailto(`Licensed ${role}s available — ${m.display}`, `Licensed ${role} availability for ${m.display}.${claimLine}`) },
    { step: 4, label: 'Close', subject: `Closing the loop — ${role} in ${m.display}`, body: `Hi [First name],\n\nI'll close this out for now. If hiring ${role}s in ${m.display} becomes a priority, FlorenceRN can deliver licensed RN capacity on a per-RN/month basis, billed after start. Just reply and we'll pick it back up.${sign}`, mailto: mailto(`Closing the loop — ${role} in ${m.display}`, `Reach out anytime for licensed ${role} capacity in ${m.display}.`) },
  ]

  await store.attribution.insert({ id: uid(), eventType: 'longtail.outreach_drafted', sourceSystem: 'long_tail_radar', metadata: { market: m.key, roleCategory: args.roleCategory }, occurredAt: now() })

  return {
    status: 'draft', employerName: args.employerName, market: m.key, marketDisplay: m.display, roleCategory: args.roleCategory,
    aggregateInterestCount, claimUrl,
    email: { subjects, subject: subjects[0], body: intro, mailto: mailto(subjects[0], intro) },
    sequence,
  }
}

export function renderOutreachPdf(d: OutreachDraft): Buffer {
  const items: { text: string; size?: number; bold?: boolean; gap?: number }[] = [
    { text: `Outreach DRAFT — ${d.employerName}`, size: 18, bold: true },
    { text: `FlorenceRN Long-Tail Demand Radar · ${d.marketDisplay} · ${roleCategoryLabel(d.roleCategory)} · HUMAN REVIEW REQUIRED before sending`, size: 9, gap: 2 },
    { text: `Aggregate FlorenceRN nurse interest: ${d.aggregateInterestCount}`, size: 10, gap: 12 },
  ]
  for (const s of d.sequence) {
    items.push({ text: `Step ${s.step} — ${s.label}`, size: 13, bold: true, gap: 14 })
    items.push({ text: `Subject: ${s.subject}`, size: 10, gap: 3 })
    items.push({ text: s.body, size: 10, gap: 3 })
  }
  items.push({ text: 'DRAFT — not sent. FlorenceRN-matched opportunity, not an employer endorsement. Personalize [First name] + sign-off and send from your own inbox.', size: 8, gap: 14 })
  return composePdf(items)
}
