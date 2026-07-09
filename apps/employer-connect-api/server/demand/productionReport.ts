// Weekly production report — rolls the source→start funnel (detected → priced →
// clicks → interest → packet → interview → offer → start → retained) and breaks it
// down by employer, source, and campaign, over an optional rolling window. Reads the
// attribution spine (+ the overall funnel); pure aggregation, no new events.
import { store } from '../db'
import { attributionFunnel } from './attribution'

const STAGE_OF: Record<string, 'detected' | 'interests' | 'packets' | 'starts' | 'retained'> = {
  'demand.job_detected': 'detected',
  'demand.interest_registered': 'interests',
  'candidate.packet_created': 'packets',
  'recon.packet_shared': 'packets',
  'recon.started': 'starts',
  'recon.retained_90': 'retained',
}

export interface EmployerProductionRow {
  employer: string
  detected: number
  interests: number
  packets: number
  starts: number
  retained: number
}

export interface ProductionReport {
  generatedAt: string
  windowDays: number | null
  funnel: { stage: string; events: number; candidates: number; jobs: number }[]
  byEmployer: EmployerProductionRow[]
  bySource: Record<string, number>
  byCampaign: Record<string, number>
  totals: { jobsDetected: number; interests: number; packets: number; starts: number; retained: number }
}

export async function productionReport(opts: { windowDays?: number; nowMs?: number } = {}): Promise<ProductionReport> {
  const windowDays = opts.windowDays ?? null
  // Caller passes nowMs (Date.* is unavailable inside workflow scripts; route passes it).
  const cutoff = windowDays != null && opts.nowMs != null ? opts.nowMs - windowDays * 86_400_000 : null
  // Exclude claimed long-tail jobs from the production report (own surface; don't commingle).
  const claimedSignalIds = new Set((await store.demandJobs.all()).filter((j) => j.origin === 'claimed_signal').map((j) => j.id))
  const events = (await store.attribution.all()).filter((e) => (cutoff == null || Date.parse(e.occurredAt) >= cutoff) && !(e.jobId && claimedSignalIds.has(e.jobId)))

  const byEmployerMap = new Map<string, EmployerProductionRow>()
  const bySource: Record<string, number> = {}
  const byCampaign: Record<string, number> = {}
  const totals = { jobsDetected: 0, interests: 0, packets: 0, starts: 0, retained: 0 }

  for (const e of events) {
    const stage = STAGE_OF[e.eventType]
    const employer = (e.metadata?.employer as string) || e.employerId || 'Unknown'
    const src = (e.metadata?.utmSource as string) || (e.metadata?.source as string) || e.sourceSystem
    bySource[src] = (bySource[src] ?? 0) + 1
    const campaign = (e.metadata?.campaign as string) || (e.metadata?.utmCampaign as string)
    if (campaign) byCampaign[campaign] = (byCampaign[campaign] ?? 0) + 1
    if (!stage) continue
    const row = byEmployerMap.get(employer) ?? { employer, detected: 0, interests: 0, packets: 0, starts: 0, retained: 0 }
    row[stage] += 1
    byEmployerMap.set(employer, row)
    if (stage === 'detected') totals.jobsDetected += 1
    else if (stage === 'interests') totals.interests += 1
    else if (stage === 'packets') totals.packets += 1
    else if (stage === 'starts') totals.starts += 1
    else if (stage === 'retained') totals.retained += 1
  }

  const byEmployer = [...byEmployerMap.values()].sort((a, b) => b.starts - a.starts || b.interests - a.interests)
  // The overall funnel is windowed too when a window is given (recompute would need a
  // windowed attributionFunnel; we surface the all-time funnel + windowed breakdowns).
  const funnel = (await attributionFunnel()).stages
  return { generatedAt: '', windowDays, funnel, byEmployer, bySource, byCampaign, totals }
}
