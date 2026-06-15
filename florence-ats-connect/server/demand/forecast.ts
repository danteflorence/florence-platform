// Job → start forecasting. Probability-weighted expected RN starts by month from the
// live opportunity pipeline (interests × eligibility maturity × start feasibility),
// and the recurring MRR those starts imply. Conversion rates are CONSERVATIVE
// PLACEHOLDERS (env-overridable) until calibrated against real outcomes — never
// presented as a promise. FICA stays customer-side; MRR here is FlorenceRN fee only.
import { store } from '../db'
import { eligibilityCoaching, type StartFeasibility } from './opportunityFit'
import type { InterestStatus } from '../../shared/demand-types'

// Conservative start-probability by interest maturity (override via env).
const P = {
  licensed_packet_ready: Number(process.env.FORECAST_P_LICENSED ?? 0.5),
  interested: Number(process.env.FORECAST_P_NEAR ?? 0.25), // near-licensed
  pathway_first: Number(process.env.FORECAST_P_PATHWAY ?? 0.08),
  not_eligible: 0,
  withdrawn: 0,
}
// Months from now until an expected start, by feasibility band.
const MONTHS: Record<StartFeasibility, number> = { now: 1, d30_60: 2, d60_120: 4, longer: 7 }
const DEFAULT_FEE = Number(process.env.CONTROL_TOWER_MONTHLY_FEE_USD ?? 1750)

const startProb = (s: InterestStatus): number => P[s] ?? 0

function monthKey(baseMs: number, addMonths: number): string {
  const d = new Date(baseMs)
  const m = d.getUTCMonth() + addMonths
  const y = d.getUTCFullYear() + Math.floor(m / 12)
  const mm = ((m % 12) + 12) % 12
  return `${y}-${String(mm + 1).padStart(2, '0')}`
}

export interface ForecastMonth {
  month: string
  expectedStarts: number
  expectedMrrUsd: number // FlorenceRN fee only (starts × fee)
}

export interface StartForecast {
  generatedAt: string
  assumptions: string[]
  monthlyFeeUsd: number
  pipelineInterests: number
  expectedStartsTotal: number
  byMonth: ForecastMonth[]
  /** Annualized recurring revenue from the expected cohort (24-month model basis). */
  expectedAnnualizedMrrUsd: number
}

export async function forecastStarts(opts: { nowMs: number; monthlyFeeUsd?: number }): Promise<StartForecast> {
  const fee = opts.monthlyFeeUsd ?? DEFAULT_FEE
  const interests = (await store.jobInterests.all()).filter((i) => i.status !== 'withdrawn')
  const monthMap = new Map<string, number>() // month → expected starts
  let expectedStartsTotal = 0

  for (const i of interests) {
    const prob = startProb(i.status)
    if (prob <= 0) continue
    const candidate = await store.candidates.get(i.candidateId)
    const job = await store.demandJobs.get(i.jobId)
    if (!candidate || !job) continue
    const feasibility = eligibilityCoaching(candidate, job).startFeasibility
    const month = monthKey(opts.nowMs, MONTHS[feasibility])
    monthMap.set(month, (monthMap.get(month) ?? 0) + prob)
    expectedStartsTotal += prob
  }

  const byMonth: ForecastMonth[] = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, starts]) => ({ month, expectedStarts: Math.round(starts * 100) / 100, expectedMrrUsd: Math.round(starts * fee) }))

  return {
    generatedAt: '',
    assumptions: [
      `start probability by maturity: licensed ${P.licensed_packet_ready}, near ${P.interested}, pathway ${P.pathway_first} (CONSERVATIVE PLACEHOLDERS — calibrate against real outcomes)`,
      `per-RN/month fee = $${fee} (FlorenceRN subscription; FICA stays customer-side, not counted here)`,
      'expected start month derived from eligibility start-feasibility, not a commitment',
    ],
    monthlyFeeUsd: fee,
    pipelineInterests: interests.length,
    expectedStartsTotal: Math.round(expectedStartsTotal * 100) / 100,
    byMonth,
    expectedAnnualizedMrrUsd: Math.round(expectedStartsTotal * fee * 12),
  }
}
