// Employer / AMN demand brief — turns observed RN demand for one employer into a
// capacity proposal: jobs observed, matched FlorenceRN supply (state-licensed +
// near-licensed), per-RN/month economics (gross fee, payroll-tax offset, effective
// cost, net value), a recommended first wave, and the route (AMN vs direct).
// Renders to a zero-dep PDF. Briefs are DRAFTS: a human reviews before sending,
// and no financing/underwriting data ever appears (compliance).
import { store, now } from '../db'
import { composePdf } from '../resumePdf'
import { runEconomics } from './economics'
import { payDisplay } from '../../shared/payDisplay'
import type { JobEconomics, JobBenefitTag } from '../../shared/demand-types'

export interface DemandBrief {
  employer: string
  generatedAt: string
  route: 'amn' | 'direct'
  jobs: { total: number; bySpecialty: Record<string, number>; states: string[] }
  supply: { licensed: number; nearLicensed: number; total: number; sample: { specialty?: string; state?: string; readiness: string; status: string }[] }
  economics: { avgGrossFeePerRnMonth: number; avgEffectiveCostPerRnMonth: number; avgNetValuePerRnMonth: number; avgPayrollTaxOffsetPerRnMonth: number; n: number }
  /** Posted compensation observed across the employer's open jobs (labeled, never an estimate-as-posted). */
  compensation: { listedCount: number; estimatedCount: number; samples: string[]; benefits: { tag: JobBenefitTag; count: number }[] }
  pilot: { topSpecialties: string[]; recommendedFirstWaveStarts: number }
}

const inc = (rec: Record<string, number>, k?: string) => { if (k) rec[k] = (rec[k] ?? 0) + 1 }

export async function buildDemandBrief(employerName: string, route: 'amn' | 'direct' = 'direct'): Promise<DemandBrief> {
  const jobs = (await store.demandJobs.all()).filter(
    (j) => j.employerName.toLowerCase() === employerName.toLowerCase() && j.status === 'open',
  )
  const bySpecialty: Record<string, number> = {}
  const byState: Record<string, number> = {}
  for (const j of jobs) {
    inc(bySpecialty, j.specialty)
    inc(byState, j.requiredLicenseState ?? j.state)
  }
  const states = Object.keys(byState)

  // Economics: ensure each job is priced (AMN route carries the 20% partner markup).
  const econs: JobEconomics[] = []
  for (const j of jobs) {
    let e = await store.jobEconomics.latestByJob(j.id)
    if (!e) e = await runEconomics(j, route === 'amn' ? { amnMarkupPct: 0.2 } : {})
    econs.push(e)
  }
  const avg = (sel: (e: JobEconomics) => number | undefined) => {
    const v = econs.map(sel).filter((x): x is number => typeof x === 'number')
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0
  }

  // Supply match: state license is the load-bearing constraint.
  const candidates = await store.candidates.all()
  const matched = candidates.filter((c) => (c.targetStates ?? []).some((s) => states.includes(s)))
  const isLicensed = (c: { licenseStatus: string }) => c.licenseStatus === 'issued' || c.licenseStatus === 'approved'
  const licensed = matched.filter(isLicensed)
  const nearLicensed = matched.filter((c) => !isLicensed(c) && c.nclexStatus === 'passed')
  const sample = matched.slice(0, 8).map((c) => ({
    specialty: c.specialtyExperience?.[0],
    state: c.targetStates?.[0],
    readiness: c.readinessBand,
    status: isLicensed(c) ? 'licensed' : c.nclexStatus === 'passed' ? 'near-licensed' : 'pathway',
  }))

  const topSpecialties = Object.entries(bySpecialty).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k)
  const openings = jobs.reduce((s, j) => s + (j.openingsEstimate ?? 1), 0)
  const recommendedFirstWaveStarts = Math.min(licensed.length || nearLicensed.length, openings || licensed.length || 5)

  // Compensation observed (listed vs estimated, kept distinct) + benefit frequency.
  let listedCount = 0
  let estimatedCount = 0
  const samples: string[] = []
  const benefitFreq: Record<string, number> = {}
  for (const j of jobs) {
    const pay = payDisplay(j)
    if (pay.kind === 'listed') { listedCount += 1; if (samples.length < 4) samples.push(`${j.title}: ${pay.text}`) }
    else if (pay.kind === 'estimated') { estimatedCount += 1; if (samples.length < 4) samples.push(`${j.title}: ${pay.text}`) }
    for (const tag of j.benefitsExtracted ?? []) benefitFreq[tag] = (benefitFreq[tag] ?? 0) + 1
  }
  const benefits = Object.entries(benefitFreq).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag: tag as JobBenefitTag, count }))

  return {
    employer: employerName, generatedAt: now(), route,
    jobs: { total: jobs.length, bySpecialty, states },
    supply: { licensed: licensed.length, nearLicensed: nearLicensed.length, total: matched.length, sample },
    compensation: { listedCount, estimatedCount, samples, benefits },
    economics: {
      avgGrossFeePerRnMonth: avg((e) => e.recommendedGrossFeePerRnMonth),
      avgEffectiveCostPerRnMonth: avg((e) => e.effectiveCostPerRnMonth),
      avgNetValuePerRnMonth: avg((e) => e.estimatedNetValuePerRnMonth),
      avgPayrollTaxOffsetPerRnMonth: avg((e) => e.estimatedPayrollTaxOffsetPerRnMonth),
      n: econs.length,
    },
    pilot: { topSpecialties, recommendedFirstWaveStarts },
  }
}

export function renderBriefPdf(b: DemandBrief): Buffer {
  const $ = (n: number) => `$${n.toLocaleString()}`
  const items: { text: string; size?: number; bold?: boolean; gap?: number }[] = [
    { text: `${b.employer} — RN Capacity Brief`, size: 18, bold: true },
    { text: `FlorenceRN Demand Radar · ${b.route === 'amn' ? 'AMN channel' : 'direct employer'} · generated ${b.generatedAt.slice(0, 10)}`, size: 9, gap: 2 },

    { text: '1. Demand observed', size: 13, bold: true, gap: 14 },
    { text: `${b.jobs.total} open RN role(s) across ${b.jobs.states.length} state(s): ${b.jobs.states.join(', ') || 'n/a'}`, gap: 3 },
    { text: `By specialty: ${Object.entries(b.jobs.bySpecialty).map(([k, v]) => `${k} (${v})`).join(', ') || 'n/a'}`, gap: 2 },

    { text: '2. FlorenceRN supply match', size: 13, bold: true, gap: 14 },
    { text: `${b.supply.licensed} licensed · ${b.supply.nearLicensed} near-licensed · ${b.supply.total} total aligned to these roles/states`, gap: 3 },
    ...b.supply.sample.map((s) => ({ text: `– ${s.status} RN · ${s.specialty ?? 'RN'} · ${s.state ?? ''} · readiness ${s.readiness}`, size: 9, gap: 1 })),

    { text: '3. Economics (per RN / month)', size: 13, bold: true, gap: 14 },
    { text: `Gross FlorenceRN fee: ${$(b.economics.avgGrossFeePerRnMonth)}   ·   Eligible payroll-tax offset: ${$(b.economics.avgPayrollTaxOffsetPerRnMonth)}`, gap: 3 },
    { text: `Effective monthly cost (fee − offset): ${$(b.economics.avgEffectiveCostPerRnMonth)}   ·   Est. net monthly value: ${$(b.economics.avgNetValuePerRnMonth)}`, gap: 2 },
    { text: 'The payroll-tax offset accrues to the employer as a tax reduction; it is not FlorenceRN revenue.', size: 8, gap: 2 },

    { text: '4. Compensation & benefits observed', size: 13, bold: true, gap: 14 },
    { text: `${b.compensation.listedCount} role(s) with employer-listed pay · ${b.compensation.estimatedCount} with a FlorenceRN local-market estimate`, gap: 3 },
    ...b.compensation.samples.map((s) => ({ text: `– ${s}`, size: 9, gap: 1 })),
    { text: `Benefits observed: ${b.compensation.benefits.map((x) => `${x.tag.replace(/_/g, ' ')} (${x.count})`).join(', ') || 'none extracted from postings'}`, size: 9, gap: 3 },
    { text: 'Listed pay is from the employer posting; estimated pay is a FlorenceRN local-market estimate, not the employer’s posted rate.', size: 8, gap: 2 },

    { text: '5. Pilot recommendation', size: 13, bold: true, gap: 14 },
    { text: `Recommended first wave: ${b.pilot.recommendedFirstWaveStarts} RN start(s) in ${b.pilot.topSpecialties.join(', ') || 'top specialties'}`, gap: 3 },
    { text: `Workflow: ${b.route === 'amn' ? 'route via the AMN account team' : 'direct employer engagement'}.`, gap: 2 },

    { text: '5. Next step', size: 13, bold: true, gap: 14 },
    { text: '30-day design sprint: job-feed setup, candidate packet format, employer review process, ATS/manual bridge.', gap: 3 },

    { text: 'DRAFT — internal review required before sending. Planning estimates from public/partner RN demand + FlorenceRN supply; validate via the Workforce Economist and account review. These are FlorenceRN-matched opportunities, not an employer endorsement.', size: 8, gap: 14 },
  ]
  return composePdf(items)
}
