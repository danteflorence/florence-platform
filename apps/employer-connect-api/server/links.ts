// Tracked links + first-party click capture for Demand Radar. Every campaign,
// job-interest page, and outreach email gets a short link with UTM parameters and
// an opaque frn_click_id — the ONLY join key that ever appears in a URL. NO PII
// (name/email/license/immigration/underwriting) is ever placed in a link. Clicks
// are logged first-party and (when a candidate is known) mirrored to the Nurse
// Passport spine as demand.link_clicked.
import { createHash, randomBytes } from 'node:crypto'
import { store, uid, now } from './db'
import { emitPassport, passportEnabled } from './passport'
import type { TrackingLink, TrackingClick, CampaignType } from '../shared/demand-types'

const LINK_BASE_URL = (process.env.LINK_BASE_URL ?? `http://localhost:${process.env.PORT ?? 8788}`).replace(/\/$/, '')

const hash = (s?: string): string | undefined => (s ? createHash('sha256').update(s).digest('hex').slice(0, 32) : undefined)
const shortCode = (): string => randomBytes(6).toString('base64url') // 8 chars, URL-safe
const clickId = (): string => `clk_${randomBytes(9).toString('base64url')}`

export interface CreateLinkInput {
  destinationUrl: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  campaignType?: CampaignType
  jobId?: string
  employerId?: string
  facilityId?: string
  universityId?: string
  cohortId?: string
  partnerId?: string
  createdBy?: string
}

/** Mint a tracked short link. The public URL is LINK_BASE_URL + /l/:shortCode. */
export async function createLink(input: CreateLinkInput): Promise<TrackingLink & { shortUrl: string }> {
  const link: TrackingLink = {
    id: uid(), shortCode: shortCode(), destinationUrl: input.destinationUrl,
    utmSource: input.utmSource, utmMedium: input.utmMedium, utmCampaign: input.utmCampaign,
    utmContent: input.utmContent, utmTerm: input.utmTerm, campaignType: input.campaignType,
    jobId: input.jobId, employerId: input.employerId, facilityId: input.facilityId,
    universityId: input.universityId, cohortId: input.cohortId, partnerId: input.partnerId,
    createdBy: input.createdBy, createdAt: now(),
  }
  await store.trackingLinks.insert(link)
  return { ...link, shortUrl: `${LINK_BASE_URL}/l/${link.shortCode}` }
}

/** The destination, with the link's UTM params + frn_click_id appended (no PII). */
export function buildDestination(link: TrackingLink, frnClickId: string): string {
  let url: URL
  try {
    url = new URL(link.destinationUrl)
  } catch {
    return link.destinationUrl
  }
  const set = (k: string, v?: string) => { if (v) url.searchParams.set(k, v) }
  set('utm_source', link.utmSource)
  set('utm_medium', link.utmMedium)
  set('utm_campaign', link.utmCampaign)
  set('utm_content', link.utmContent)
  set('utm_term', link.utmTerm)
  url.searchParams.set('frn_click_id', frnClickId)
  return url.toString()
}

export interface ClickContext {
  ip?: string
  userAgent?: string
  referrer?: string
  candidateId?: string
  anonymousVisitorId?: string
}

/** Record a click and return the redirect destination. Mirrors to the Passport
 *  spine only when a candidate is resolved (clicks are otherwise anonymous). */
export async function recordClick(shortCode: string, ctx: ClickContext): Promise<{ destination: string } | null> {
  const link = await store.trackingLinks.byShortCode(shortCode)
  if (!link) return null
  const frnClickId = clickId()
  const click: TrackingClick = {
    id: uid(), trackingLinkId: link.id, frnClickId,
    anonymousVisitorId: ctx.anonymousVisitorId, candidateId: ctx.candidateId,
    ipHash: hash(ctx.ip), userAgentHash: hash(ctx.userAgent), referrer: ctx.referrer,
    clickedAt: now(),
  }
  await store.trackingClicks.insert(click)
  // Attribution event (job-centric) for the source→start chain.
  await store.attribution.insert({
    id: uid(), frnClickId, candidateId: ctx.candidateId, jobId: link.jobId, employerId: link.employerId,
    eventType: 'demand.link_clicked', sourceSystem: 'demand_radar',
    metadata: { campaign: link.utmCampaign, utmSource: link.utmSource }, occurredAt: now(),
  })
  // Nurse-centric mirror to the Passport spine (only if we know the candidate).
  if (ctx.candidateId && passportEnabled) {
    const cand = await store.candidates.get(ctx.candidateId).catch(() => null)
    void emitPassport(
      { email: cand?.email ?? undefined, ref: { app: 'demand_radar', externalId: ctx.candidateId } },
      'demand.link_clicked',
      { frnClickId, campaign: link.utmCampaign, jobId: link.jobId },
    )
  }
  return { destination: buildDestination(link, frnClickId) }
}
