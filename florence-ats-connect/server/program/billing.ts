// Recurring (24-month) invoice rollup for a Program. A cohort anchors on a HRIS-grade
// VERIFIED start (the billing invariant — never bare ATS status) and then bills the
// per-RN/month fee EACH month for `recurringMonths`, capped at the current month and at
// termination/term-complete.
//
// INVARIANT (preserved): grossUsd = activeRn × fee — FlorenceRN revenue, FICA NEVER
// added. The payroll-tax offset appears solely in customerEffectiveCostUsd, the
// customer-side economics. lifetimeBookedUsd is BOOKED (starts × fee × term), NOT
// revenue-recognized. Read-only rollup; no payments. Mock-safe (pricing-api unreachable
// → runEconomics fallback fee).

import { store, now } from '../db'
import { runEconomics } from '../demand/economics'
import type { Program, VerificationSource } from '../../shared/types'
import type { FlorenceRNJob } from '../../shared/demand-types'

const BILLING_GRADE: VerificationSource[] = ['hris', 'employer_attestation', 'nurse_confirmation']
const RECURRING_MONTHS = process.env.ATS_CONNECT_RECURRING_MONTHS ? Number(process.env.ATS_CONNECT_RECURRING_MONTHS) : 24

const ymIndex = (m: string): number => { const [y, mo] = m.split('-').map(Number); return (y ?? 0) * 12 + ((mo ?? 1) - 1) }
const ymFromIndex = (i: number): string => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`

export interface ProgramInvoiceMonth {
  month: string
  verifiedStarts: number // NEW billing-grade starts that month
  recurringRnCount: number // active billed RN that month (recurring cohort)
  perRnMonthlyFeeUsd: number
  grossUsd: number // = recurringRnCount × fee — FLORENCE REVENUE (no FICA)
  ficaOffsetPerRnUsd: number // customer-side only
  customerEffectiveCostUsd: number // = recurringRnCount × (fee − fica) — NOT revenue
  retained30dCount: number
  retained90dCount: number
}
export interface ProgramInvoiceRollup {
  programId: string
  employerId: string
  perRnMonthlyFeeUsd: number
  ficaOffsetPerRnUsd: number
  feeSource: 'program' | 'pricing_api' | 'fallback'
  recurringMonths: number
  months: ProgramInvoiceMonth[]
  cumulative: { verifiedStarts: number; grossUsd: number; customerEffectiveCostUsd: number; lifetimeBookedUsd: number }
}

function syntheticJob(program: Program, state?: string): FlorenceRNJob {
  return {
    id: `prog-${program.id}`, employerId: program.employerId, employerName: program.name,
    fingerprint: `prog-${program.id}`, title: 'Registered Nurse', normalizedRole: 'registered_nurse',
    setting: 'hospital', status: 'open', confidence: 'low', firstSeenAt: now(), lastSeenAt: now(),
    ...(state ? { state, requiredLicenseState: state } : {}),
  }
}

export async function rollupProgramInvoices(programId: string): Promise<ProgramInvoiceRollup> {
  const program = await store.programs.get(programId)
  if (!program) throw new Error(`program not found: ${programId}`)

  // Fee + FICA: program override wins for the fee; FICA always from the economics engine.
  const openReqs = (await store.requisitions.byEmployer(program.employerId)).filter((r) => r.status === 'open')
  const state = openReqs.find((r) => r.requiredLicenseState)?.requiredLicenseState
  const econ = await runEconomics(syntheticJob(program, state)) // mock-safe fallback
  const ficaOffsetPerRnUsd = econ.estimatedPayrollTaxOffsetPerRnMonth ?? 0
  let perRnMonthlyFeeUsd: number
  let feeSource: ProgramInvoiceRollup['feeSource']
  if (program.perRnMonthlyFeeUsd) { perRnMonthlyFeeUsd = program.perRnMonthlyFeeUsd; feeSource = 'program' }
  else if (econ.recommendedGrossFeePerRnMonth) { perRnMonthlyFeeUsd = econ.recommendedGrossFeePerRnMonth; feeSource = econ.confidence === 'low' ? 'fallback' : 'pricing_api' }
  else { perRnMonthlyFeeUsd = 1750; feeSource = 'fallback' }

  // Scope to this program's locked candidates when a slate exists.
  const slateCands = new Set((await store.programSlates.byProgram(programId)).flatMap((s) => s.candidateIds))
  const inScope = (cid: string) => slateCands.size === 0 || slateCands.has(cid)
  const events = await store.ledger.byEmployer(program.employerId)

  // Per-candidate cohort anchors: earliest billing-grade start, earliest stop
  // (termination/term-complete), plus informational retention counts by month.
  const startMonthByCand = new Map<string, string>()
  const stopMonthByCand = new Map<string, string>()
  const retained30ByMonth = new Map<string, number>()
  const retained90ByMonth = new Map<string, number>()
  const newStartsByMonth = new Map<string, number>()
  const billingGrade = (v?: VerificationSource) => Boolean(v && BILLING_GRADE.includes(v))
  for (const e of events) {
    if (!inScope(e.candidateId)) continue
    const m = e.at.slice(0, 7)
    if (e.stage === 'started' && billingGrade(e.verifiedVia)) {
      const prev = startMonthByCand.get(e.candidateId)
      if (!prev || m < prev) startMonthByCand.set(e.candidateId, m)
    } else if (e.stage === 'withdrawn' || e.stage === 'term_complete') {
      const prev = stopMonthByCand.get(e.candidateId)
      if (!prev || m < prev) stopMonthByCand.set(e.candidateId, m)
    } else if (e.stage === 'retention_30d' && billingGrade(e.verifiedVia)) {
      retained30ByMonth.set(m, (retained30ByMonth.get(m) ?? 0) + 1)
    } else if (e.stage === 'retention_90d' && billingGrade(e.verifiedVia)) {
      retained90ByMonth.set(m, (retained90ByMonth.get(m) ?? 0) + 1)
    }
  }
  for (const sm of startMonthByCand.values()) newStartsByMonth.set(sm, (newStartsByMonth.get(sm) ?? 0) + 1)

  // Recurring tail: each cohort RN bills each month from its start for recurringMonths,
  // capped at the current month and at termination/term-complete.
  const nowIdx = ymIndex(now().slice(0, 7))
  const activeByIdx = new Map<number, number>()
  for (const [cid, sm] of startMonthByCand) {
    const startIdx = ymIndex(sm)
    let endIdx = Math.min(startIdx + RECURRING_MONTHS - 1, nowIdx)
    const stop = stopMonthByCand.get(cid)
    if (stop) endIdx = Math.min(endIdx, ymIndex(stop))
    for (let i = startIdx; i <= endIdx; i += 1) activeByIdx.set(i, (activeByIdx.get(i) ?? 0) + 1)
  }

  const months: ProgramInvoiceMonth[] = [...activeByIdx.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([idx, recurringRnCount]) => {
      const month = ymFromIndex(idx)
      return {
        month,
        verifiedStarts: newStartsByMonth.get(month) ?? 0,
        recurringRnCount,
        perRnMonthlyFeeUsd,
        grossUsd: recurringRnCount * perRnMonthlyFeeUsd,
        ficaOffsetPerRnUsd,
        customerEffectiveCostUsd: recurringRnCount * Math.max(0, perRnMonthlyFeeUsd - ficaOffsetPerRnUsd),
        retained30dCount: retained30ByMonth.get(month) ?? 0,
        retained90dCount: retained90ByMonth.get(month) ?? 0,
      }
    })
  const verifiedStarts = startMonthByCand.size
  return {
    programId,
    employerId: program.employerId,
    perRnMonthlyFeeUsd,
    ficaOffsetPerRnUsd,
    feeSource,
    recurringMonths: RECURRING_MONTHS,
    months,
    cumulative: {
      verifiedStarts,
      grossUsd: months.reduce((s, m) => s + m.grossUsd, 0),
      customerEffectiveCostUsd: months.reduce((s, m) => s + m.customerEffectiveCostUsd, 0),
      lifetimeBookedUsd: verifiedStarts * perRnMonthlyFeeUsd * RECURRING_MONTHS,
    },
  }
}
