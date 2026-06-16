// Attribution + dashboard rollups. The source→start funnel is the product's
// north star: job detected → priced → clicked → viewed → interest → packet →
// interview → offer → start → retained, counted by distinct candidates/jobs, with
// a by-source breakdown so every start can be traced to the demand that produced it.
import { store } from '../db'
import { opportunityStateFor, type OpportunityState } from '../../shared/opportunityState'

const FUNNEL: { stage: string; types: string[] }[] = [
  { stage: 'jobs_detected', types: ['demand.job_detected'] },
  { stage: 'normalized', types: ['demand.job_normalized'] },
  { stage: 'priced', types: ['pricing.job_priced'] },
  { stage: 'clicks', types: ['demand.link_clicked'] },
  { stage: 'views', types: ['demand.job_viewed', 'job.tile_viewed'] },
  { stage: 'compared', types: ['job.compared'] },
  { stage: 'interests', types: ['demand.interest_registered'] },
  { stage: 'packets_created', types: ['candidate.packet_created'] },
  { stage: 'packets_shared', types: ['recon.packet_shared'] },
  { stage: 'packets_viewed', types: ['candidate.packet_viewed'] },
  { stage: 'interviews', types: ['recon.interview_requested', 'recon.interview_scheduled', 'recon.interview_completed'] },
  { stage: 'offers', types: ['recon.offer_made', 'recon.offer_accepted'] },
  { stage: 'starts', types: ['recon.started'] },
  { stage: 'retained_90', types: ['recon.retained_90'] },
]

export async function attributionFunnel(): Promise<{
  stages: { stage: string; events: number; candidates: number; jobs: number }[]
  bySource: Record<string, number>
  total: number
}> {
  const events = await store.attribution.all()
  const stages = FUNNEL.map(({ stage, types }) => {
    const evs = events.filter((e) => types.includes(e.eventType))
    return {
      stage,
      events: evs.length,
      candidates: new Set(evs.map((e) => e.candidateId).filter(Boolean)).size,
      jobs: new Set(evs.map((e) => e.jobId).filter(Boolean)).size,
    }
  })
  const bySource: Record<string, number> = {}
  for (const e of events) {
    const src = (e.metadata?.utmSource as string) || (e.metadata?.source as string) || e.sourceSystem
    bySource[src] = (bySource[src] ?? 0) + 1
  }
  return { stages, bySource, total: events.length }
}

export async function dashboardSummary() {
  const [jobs, links, clicks, interests, econ, employers] = await Promise.all([
    store.demandJobs.all(), store.trackingLinks.all(), store.trackingClicks.all(), store.jobInterests.all(), store.jobEconomics.all(), store.employers.all(),
  ])
  // The Demand Radar dashboard is the health-system demand view — exclude claimed
  // long-tail jobs (they have their own Long-Tail Radar surface) from the aggregates.
  const open = jobs.filter((j) => j.status === 'open' && j.origin !== 'claimed_signal')
  // Opportunity-state rollup (employer relationship is the load-bearing signal; the
  // per-job source channelOwner refinement is applied on the candidate card).
  const empById = new Map(employers.map((e) => [e.id, e]))
  const empByName = new Map(employers.map((e) => [e.name.toLowerCase(), e]))
  const byOpportunityState: Record<OpportunityState, number> = { public: 0, amn_channel: 0, vms_channel: 0, direct_partner: 0, ats_connected: 0 }
  for (const j of open) {
    const emp = (j.employerId ? empById.get(j.employerId) : undefined) ?? empByName.get(j.employerName.toLowerCase())
    byOpportunityState[opportunityStateFor(j, emp ?? undefined)] += 1
  }
  const byState: Record<string, number> = {}
  const bySpecialty: Record<string, number> = {}
  const byEmployer: Record<string, number> = {}
  for (const j of open) {
    const st = j.requiredLicenseState ?? j.state
    if (st) byState[st] = (byState[st] ?? 0) + 1
    if (j.specialty) bySpecialty[j.specialty] = (bySpecialty[j.specialty] ?? 0) + 1
    byEmployer[j.employerName] = (byEmployer[j.employerName] ?? 0) + 1
  }
  const interestByStatus: Record<string, number> = {}
  for (const i of interests) interestByStatus[i.status] = (interestByStatus[i.status] ?? 0) + 1
  const topEmployers = Object.entries(byEmployer).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([employer, count]) => ({ employer, count }))

  // Compensation transparency: listed (from posting) vs estimated (FlorenceRN) vs
  // none, + open jobs in a pay-transparency state that lacked a posted range.
  const listed = open.filter((j) => j.listedPayMin != null).length
  const estimated = open.filter((j) => j.listedPayMin == null && j.estimatedPayMin != null).length
  const noPay = open.filter((j) => j.listedPayMin == null && j.estimatedPayMin == null).length
  const transparencyGap = open.filter((j) => j.payTransparencyFlag).length
  const withBenefits = open.filter((j) => (j.benefitsExtracted?.length ?? 0) > 0).length

  return {
    jobs: { total: jobs.length, open: open.length, stale: jobs.filter((j) => j.status === 'stale').length, priced: econ.length, byState, bySpecialty, topEmployers },
    pay: { listed, estimated, noPay, transparencyGap, withBenefits },
    opportunityStates: byOpportunityState,
    links: { total: links.length, clicks: clicks.length },
    interests: { total: interests.length, byStatus: interestByStatus },
    funnel: await attributionFunnel(),
  }
}
