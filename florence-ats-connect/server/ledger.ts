// ============================================================================
// Production Ledger — the spine that ties employer demand → financing → starts.
// Every billing-relevant milestone lands here. start/retention events carry a
// verifiedVia source because those must NOT be trusted from ATS stage data alone.
// ============================================================================
import { store, uid, now } from './db'
import { emitPassport, passportEnabled } from './passport'
import type { ATSApplicationStatus, LedgerStage, ProductionLedgerEvent, VerificationSource } from '../shared/types'

/** ATS ledger stage → canonical Nurse Passport event type (Core spine). */
const STAGE_TO_PASSPORT: Partial<Record<LedgerStage, string>> = {
  matched: 'ats.matched',
  ats_application_submitted: 'ats.packet_submitted',
  interview_scheduled: 'ats.interview',
  offer_made: 'ats.offer',
  offer_accepted: 'ats.offer',
  started: 'ats.started',
  retention_30d: 'ats.retention_30d',
  retention_60d: 'ats.retention_60d',
  retention_90d: 'ats.retention_90d',
  term_complete: 'ats.term_complete',
  rejected: 'ats.rejected',
  withdrawn: 'ats.withdrawn',
  // Application-gate / 3-state additions: map onto EXISTING ats.* where the funnel
  // meaning is identical (keeps verify-spine/control-tower green). visa/license/ready/
  // pre-clearance stay INTERNAL (unmapped → ATS ledger only, never an employer-view event).
  interview_formal_scheduled: 'ats.interview',
  offer_received_subject_to_clearance: 'ats.offer',
  start_cleared: 'ats.started',
}

/** Canonical ATS-status → ledger-stage map (single source for routes/webhooks/poller). */
export const STATUS_TO_STAGE: Partial<Record<ATSApplicationStatus, LedgerStage>> = {
  interview: 'interview_scheduled', offer: 'offer_made', hired: 'offer_accepted',
  start_scheduled: 'start_scheduled', started: 'started', rejected: 'rejected', withdrawn: 'withdrawn',
}

export interface RecordLedgerArgs {
  candidateId: string
  stage: LedgerStage
  sourceId?: string
  employerId?: string
  jobRequisitionId?: string
  notes?: string
  verifiedVia?: VerificationSource
}

// When LEDGER_CANONICAL=core (AND the spine is configured), Core's nurse_events log
// is the canonical Production Ledger: emit to Core FIRST (awaited), then write the
// local row as a rebuildable PROJECTION. Default ('ats') keeps today's behavior —
// local write first, fire-and-forget mirror — so every suite stays green offline.
const LEDGER_CANONICAL_CORE = (process.env.LEDGER_CANONICAL ?? 'ats') === 'core'

export async function recordLedger(args: RecordLedgerArgs): Promise<ProductionLedgerEvent> {
  const type = STAGE_TO_PASSPORT[args.stage]
  const canonical = LEDGER_CANONICAL_CORE && passportEnabled

  // The spine emit (the cross-app funnel signal + verified-start billing trigger).
  const emitToSpine = async () => {
    if (!type || !passportEnabled) return
    const cand = await store.candidates.get(args.candidateId).catch(() => null)
    const employer = args.employerId ? await store.employers.get(args.employerId).catch(() => null) : null
    const sel = { email: cand?.email ?? undefined, name: cand?.fullName, ref: { app: 'ats' as const, externalId: args.candidateId } }
    await emitPassport(sel, type, { employer: employer?.name, employerId: args.employerId, jobReqId: args.jobRequisitionId })
    // A VERIFIED start (HRIS / attestation / nurse confirmation — never bare ATS
    // status) also opens billing → Control Tower billing_active + MRR.
    if ((args.stage === 'started' || args.stage === 'start_cleared') && args.verifiedVia && args.verifiedVia !== 'ats') {
      await emitPassport(sel, 'billing.subscription_started', { employerId: args.employerId })
    }
  }

  // Write-through inversion: Core first (awaited), local row tagged as a projection.
  if (canonical) await emitToSpine().catch(() => undefined)

  const e: ProductionLedgerEvent = { id: uid(), sourceType: 'ats_connect', at: now(), ...args, ...(canonical ? { projectionOf: 'core' as const } : {}) }
  await store.ledger.insert(e)

  // Default path: local is the source of truth, mirror to the spine fire-and-forget.
  if (!canonical && type && passportEnabled) void emitToSpine().catch(() => undefined)
  return e
}

/** Pure payload for an onboarding start-signal emit — ONLY {signal,value,confidence}.
 *  No free-text sentiment, no clinical detail, no PII beyond the candidate ref the
 *  selector carries. Kept pure so it is unit-assertable without the spine running. */
export function startSignalPayload(sig: { signal: string; value: number; confidence?: number }): Record<string, unknown> {
  return { signal: sig.signal, value: sig.value, ...(sig.confidence !== undefined ? { confidence: sig.confidence } : {}) }
}

/** Emit an early onboarding-risk start-signal to the Passport spine (Core). Emit-only,
 *  fire-and-forget, mock-by-default (no-op when the spine is off). Does NOT touch the
 *  HRIS-grade started/retention rules — risk signals never gate billing. */
export async function emitStartSignal(candidateId: string, sig: { signal: string; value: number; confidence?: number }): Promise<void> {
  if (!passportEnabled) return
  const cand = await store.candidates.get(candidateId).catch(() => null)
  const sel = { email: cand?.email ?? undefined, name: cand?.fullName, ref: { app: 'ats' as const, externalId: candidateId } }
  await emitPassport(sel, 'onboarding.start_signal', startSignalPayload(sig))
}

export const FUNNEL_ORDER: LedgerStage[] = [
  'matched', 'packet_created', 'qa_approved', 'ats_application_submitted',
  'interview_scheduled', 'offer_made', 'offer_accepted', 'start_scheduled',
  'started', 'retention_30d', 'retention_60d', 'retention_90d', 'term_complete',
]

/** Distinct candidates that have reached each funnel stage (ever). */
export async function ledgerFunnel(): Promise<{ stage: LedgerStage; candidates: number }[]> {
  const all = await store.ledger.all()
  return FUNNEL_ORDER.map((stage) => ({
    stage,
    candidates: new Set(all.filter((e) => e.stage === stage).map((e) => e.candidateId)).size,
  }))
}

/** Forecast of starts by calendar month, from start_scheduled / started events.
 *  ARR is only reported if an assumed per-start monthly fee is configured — we
 *  do not fabricate revenue. (Pricing belongs to the labor-economics engine.) */
export async function ledgerForecast() {
  const all = await store.ledger.all()
  const byMonth: Record<string, { scheduled: number; started: number }> = {}
  for (const e of all) {
    if (e.stage !== 'start_scheduled' && e.stage !== 'started') continue
    const month = e.at.slice(0, 7) // YYYY-MM
    byMonth[month] ??= { scheduled: 0, started: 0 }
    if (e.stage === 'start_scheduled') byMonth[month].scheduled++
    else byMonth[month].started++
  }
  const fee = process.env.ATS_CONNECT_ASSUMED_MONTHLY_FEE
    ? Number(process.env.ATS_CONNECT_ASSUMED_MONTHLY_FEE)
    : null
  const expectedStartsByMonth = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      ...v,
      // 24-month recurring cohort revenue, only if a fee assumption is set.
      cohortAnnualizedUsd: fee != null ? v.started * fee * 12 : null,
    }))
  return {
    assumedMonthlyFeeUsd: fee,
    note: fee == null
      ? 'Set ATS_CONNECT_ASSUMED_MONTHLY_FEE to project ARR; pricing is owned by the labor-economics engine.'
      : 'Cohorts bill monthly for 24 months; cohortAnnualizedUsd = started × fee × 12.',
    expectedStartsByMonth,
  }
}

/** Stages whose truth must come from HRIS/attestation, never bare ATS status. */
export const HRIS_GRADE_STAGES = new Set<LedgerStage>(['start_scheduled', 'started', 'start_cleared', 'retention_30d', 'retention_60d', 'retention_90d', 'term_complete'])
