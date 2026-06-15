// Job economics — price a canonical RN job per-RN/month via the Workforce
// Economist pricing-api (/price-job does the wage+agency lookup then the engine).
// Mock-by-default: if the pricing-api is unreachable, fall back to the standard
// fee so the pipeline never throws. The FICA offset is recorded ONLY as the
// customer's effective-cost reducer — never as FlorenceRN revenue (the API
// enforces florence_net == fee; we preserve that separation here).
import { store, uid, now } from '../db'
import type { FlorenceRNJob, JobEconomics, Confidence, DemandSpecialty } from '../../shared/demand-types'

const PRICING_API_URL = (process.env.PRICING_API_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')

// Specialty differentials applied to the estimated pay band (high-acuity up, post-acute down).
const SPECIALTY_PAY_MULT: Partial<Record<DemandSpecialty, number>> = {
  icu: 1.06, er: 1.06, or: 1.06, l_and_d: 1.06, telemetry: 1.03,
  snf: 0.95, clinic: 0.95, home_health: 0.95,
}

/** FlorenceRN ESTIMATED hourly pay band from the market median wage — a labeled estimate,
 *  NEVER the employer's posted pay. ±12% spread + specialty/shift differentials. */
export function estimatePayRange(job: FlorenceRNJob, wageHourly: number, confidence: Confidence): { min: number; max: number; confidence: Confidence } | undefined {
  if (!(wageHourly > 0)) return undefined
  const mult = SPECIALTY_PAY_MULT[job.specialty ?? 'other'] ?? 1
  const min = wageHourly * 0.88 * mult
  let max = wageHourly * 1.12 * mult
  if (job.shift === 'night' || job.shift === 'variable') max *= 1.08 // shift premium on the top of the band
  const r1 = (x: number) => Math.round(x * 10) / 10
  return { min: r1(min), max: r1(max), confidence }
}

interface PriceJobResp {
  lookup: { taxable_wage_per_hour?: number; benefit_load_per_hour?: number; all_in_agency_per_hour?: number; agency_premium_per_hour?: number; n: number; basis: string; agency_rate_confidence: number }
  pricing: { florence_monthly_fee_per_rn: number; employer_fica_savings_per_rn_per_month: number; fica_adjusted_effective_cost_per_rn_month: number; net_monthly_savings_per_rn: number; monthly_agency_premium_avoided_per_rn: number; partner_revenue_monthly: number; channel: string; florence_net_monthly: number }
}

export async function runEconomics(job: FlorenceRNJob, opts: { amnMarkupPct?: number } = {}): Promise<JobEconomics> {
  const state = job.requiredLicenseState ?? job.state ?? ''
  let econ: JobEconomics
  try {
    const body = {
      state, setting: job.setting ?? 'hospital', role: 'RN — Med/Surg',
      employer_name: job.employerName, cohort: { eta: 1.0 },
      calibration: opts.amnMarkupPct ? { amn_partner_markup_pct: opts.amnMarkupPct } : {},
    }
    const r = await fetch(`${PRICING_API_URL}/price-job`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(process.env.PRICING_API_TOKEN ? { authorization: `Bearer ${process.env.PRICING_API_TOKEN}` } : {}) },
      body: JSON.stringify(body),
    })
    if (!r.ok) throw new Error(`pricing-api ${r.status}`)
    const d = (await r.json()) as PriceJobResp
    const L = d.lookup
    const P = d.pricing
    const loaded = (L.taxable_wage_per_hour ?? 0) + (L.benefit_load_per_hour ?? 0)
    const confidence: Confidence = L.basis === 'state' && L.agency_rate_confidence >= 0.85 ? 'high' : L.basis === 'state' ? 'medium' : 'low'
    econ = {
      id: uid(), jobId: job.id,
      estimatedStaffWageHourly: L.taxable_wage_per_hour ?? undefined,
      estimatedLoadedStaffCostHourly: loaded || undefined,
      estimatedPremiumLaborCostHourly: L.all_in_agency_per_hour ?? undefined,
      agencyPremiumHourly: L.agency_premium_per_hour ?? undefined,
      recommendedGrossFeePerRnMonth: P.florence_monthly_fee_per_rn,
      estimatedPayrollTaxOffsetPerRnMonth: P.employer_fica_savings_per_rn_per_month,
      effectiveCostPerRnMonth: P.fica_adjusted_effective_cost_per_rn_month,
      estimatedNetValuePerRnMonth: P.net_monthly_savings_per_rn,
      amnMarkupPerRnMonth: P.partner_revenue_monthly || undefined,
      channel: P.channel,
      confidence,
      assumptions: [
        `wage/agency = ${L.basis} median (n=${L.n})`,
        'FICA offset is the customer effective-cost reducer only; FlorenceRN revenue = subscription fee',
        `state=${state || 'unknown'}, setting=${job.setting ?? 'hospital'}`,
      ],
      createdAt: now(),
    }
  } catch (e) {
    econ = {
      id: uid(), jobId: job.id,
      recommendedGrossFeePerRnMonth: 1750, estimatedPayrollTaxOffsetPerRnMonth: 700, effectiveCostPerRnMonth: 1050,
      confidence: 'low',
      assumptions: [`pricing-api unreachable (${(e as Error).message}); standard fallback fee applied`, 'FICA offset is the customer effective-cost reducer only; FlorenceRN revenue = subscription fee', `state=${state || 'unknown'}`],
      createdAt: now(),
    }
  }
  await store.jobEconomics.insert(econ)
  // Write a LABELED estimated pay band onto the job ONLY when the posting had no listed pay
  // (never override or present an estimate as employer-posted).
  if (job.listedPayMin == null && econ.estimatedStaffWageHourly) {
    const est = estimatePayRange(job, econ.estimatedStaffWageHourly, econ.confidence)
    if (est) {
      job.estimatedPayMin = est.min
      job.estimatedPayMax = est.max
      job.estimatedPayConfidence = est.confidence
      await store.demandJobs.update(job)
    }
  }
  await store.attribution.insert({
    id: uid(), jobId: job.id, employerId: job.employerId, eventType: 'pricing.job_priced',
    sourceSystem: 'demand_radar', metadata: { feePerRnMonth: econ.recommendedGrossFeePerRnMonth, confidence: econ.confidence }, occurredAt: now(),
  })
  return econ
}

/** Price every open job missing economics (or all, with force). Returns counts. */
export async function runEconomicsAll(opts: { force?: boolean; amnMarkupPct?: number } = {}): Promise<{ priced: number; skipped: number }> {
  const jobs = await store.demandJobs.open()
  let priced = 0
  let skipped = 0
  for (const job of jobs) {
    if (!opts.force && (await store.jobEconomics.latestByJob(job.id))) { skipped += 1; continue }
    await runEconomics(job, { amnMarkupPct: opts.amnMarkupPct })
    priced += 1
  }
  return { priced, skipped }
}
