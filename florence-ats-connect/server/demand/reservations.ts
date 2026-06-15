// Demand Reservations — SOFT, priced, cancellable commitments of FlorenceRN capacity
// to an employer's demand. A reservation is a demand-layer signal ONLY: it never
// triggers billing, payment, or any employer-facing action; it is NOT exclusive (a
// nurse reserved for Job-A can still reserve/match Job-B); the per-RN/month fee is
// SNAPSHOTTED at reservation time (market shifts don't mutate it); and cancellation is
// a tombstone (status→'cancelled', never a delete). Verified starts in the Production
// Ledger remain the billing-grade truth — the cockpit READS both, writes neither.
//
// Events land in attribution_events (sourceSystem='demand_radar', demand.* prefix). We
// deliberately do NOT bridge to the Core Passport (its reducer has no demand.reservation_*
// case — an emit would be a silent no-op), keeping florence-core untouched.

import { store, now, uid } from '../db'
import { runEconomics } from './economics'
import type { DemandReservation, ReservationFeeSource } from '../../shared/demand-types'

export interface ReservationCockpit {
  totalReservedSupply: number
  totalFilled: number
  totalReservedVolume: number // sum of reservation volume (RN starts reserved)
  slateMix: Record<string, number> // live reservations by slateStatus (supply maturity)
  reservedByJob: Record<string, { jobId: string; employerName: string; count: number; perRnMonthlyFeeUsd: number; reservedAt: string }>
  reservedByEmployer: Record<string, { employerName: string; count: number; pipelineFeeUsd: number }>
  generatedAt: string
}

async function feeSnapshot(jobId: string): Promise<{ fee: number; fica: number; source: ReservationFeeSource; employerId?: string; employerName: string }> {
  const job = await store.demandJobs.get(jobId)
  if (!job) throw new Error(`demand job not found: ${jobId}`)
  const econ = await runEconomics(job) // mock-safe: pricing-api down → fallback fee
  const fee = econ.recommendedGrossFeePerRnMonth ?? 1750
  const source: ReservationFeeSource = econ.recommendedGrossFeePerRnMonth && econ.confidence !== 'low' ? 'pricing_api' : 'fallback'
  return { fee, fica: econ.estimatedPayrollTaxOffsetPerRnMonth ?? 0, source, ...(job.employerId ? { employerId: job.employerId } : {}), employerName: job.employerName }
}

export interface CreateReservationOpts {
  nurseId?: string
  ttlDays?: number
  notes?: string
  // Richer capacity-reservation detail (all optional; sensible defaults from the job).
  specialty?: DemandReservation['specialty']
  region?: string
  volume?: number
  startWindow?: string
  channel?: 'amn' | 'direct'
  slateStatus?: DemandReservation['slateStatus']
  confidence?: DemandReservation['confidence']
  gate?: string
}

export async function createReservation(jobId: string, opts?: CreateReservationOpts): Promise<DemandReservation> {
  const snap = await feeSnapshot(jobId)
  const job = await store.demandJobs.get(jobId)
  const reservedAt = now()
  const r: DemandReservation = {
    id: uid(),
    jobId,
    ...(snap.employerId ? { employerId: snap.employerId } : {}),
    employerName: snap.employerName,
    ...(opts?.nurseId ? { nurseId: opts.nurseId } : {}),
    perRnMonthlyFeeUsd: snap.fee,
    feeSource: snap.source,
    ficaOffsetPerRnUsd: snap.fica,
    status: 'live',
    ...(opts?.ttlDays ? { ttlDays: opts.ttlDays, expiresAt: new Date(Date.parse(reservedAt) + opts.ttlDays * 86_400_000).toISOString() } : {}),
    // Richer detail — default specialty/region from the job; volume defaults to 1.
    ...((opts?.specialty ?? job?.specialty) ? { specialty: opts?.specialty ?? job?.specialty } : {}),
    ...((opts?.region ?? job?.requiredLicenseState ?? job?.state) ? { region: opts?.region ?? job?.requiredLicenseState ?? job?.state } : {}),
    volume: opts?.volume ?? 1,
    ...(opts?.startWindow ? { startWindow: opts.startWindow } : {}),
    ...(opts?.channel ? { channel: opts.channel } : {}),
    ...(opts?.slateStatus ? { slateStatus: opts.slateStatus } : {}),
    ...(opts?.confidence ? { confidence: opts.confidence } : {}),
    ...(opts?.gate ? { gate: opts.gate } : {}),
    reservedAt,
    ...(opts?.notes ? { notes: opts.notes } : {}),
  }
  await store.reservations.insert(r)
  await store.attribution.insert({ id: uid(), jobId, ...(snap.employerId ? { employerId: snap.employerId } : {}), ...(opts?.nurseId ? { candidateId: opts.nurseId } : {}), eventType: 'demand.reservation_created', sourceSystem: 'demand_radar', metadata: { reservationId: r.id, perRnMonthlyFeeUsd: snap.fee, feeSource: snap.source }, occurredAt: reservedAt })
  return r
}

export async function cancelReservation(id: string, reason?: string): Promise<DemandReservation> {
  const r = await store.reservations.get(id)
  if (!r) throw new Error(`reservation not found: ${id}`)
  const updated: DemandReservation = { ...r, status: 'cancelled', cancelledAt: now(), ...(reason ? { cancelReason: reason } : {}) }
  await store.reservations.update(updated) // tombstone — never deleted
  await store.attribution.insert({ id: uid(), jobId: r.jobId, ...(r.employerId ? { employerId: r.employerId } : {}), eventType: 'demand.reservation_cancelled', sourceSystem: 'demand_radar', metadata: { reservationId: id, ...(reason ? { reason } : {}) }, occurredAt: updated.cancelledAt! })
  return updated
}

export async function markReservationFilled(id: string, candidateId?: string): Promise<DemandReservation> {
  const r = await store.reservations.get(id)
  if (!r) throw new Error(`reservation not found: ${id}`)
  const updated: DemandReservation = { ...r, status: 'filled', filledAt: now(), ...(candidateId ? { nurseId: candidateId } : {}) }
  await store.reservations.update(updated)
  await store.attribution.insert({ id: uid(), jobId: r.jobId, ...(r.employerId ? { employerId: r.employerId } : {}), ...(candidateId ? { candidateId } : {}), eventType: 'demand.reservation_filled', sourceSystem: 'demand_radar', metadata: { reservationId: id }, occurredAt: updated.filledAt! })
  return updated
}

export const listLiveReservations = (): Promise<DemandReservation[]> => store.reservations.live()

export async function reservationCockpit(): Promise<ReservationCockpit> {
  const all = await store.reservations.all()
  const live = all.filter((r) => r.status === 'live')
  const reservedByJob: ReservationCockpit['reservedByJob'] = {}
  const reservedByEmployer: ReservationCockpit['reservedByEmployer'] = {}
  const slateMix: Record<string, number> = {}
  let totalReservedVolume = 0
  for (const r of live) {
    const j = (reservedByJob[r.jobId] ??= { jobId: r.jobId, employerName: r.employerName, count: 0, perRnMonthlyFeeUsd: r.perRnMonthlyFeeUsd, reservedAt: r.reservedAt })
    j.count += 1
    const e = (reservedByEmployer[r.employerName] ??= { employerName: r.employerName, count: 0, pipelineFeeUsd: 0 })
    e.count += 1
    e.pipelineFeeUsd += r.perRnMonthlyFeeUsd
    const slate = r.slateStatus ?? 'unspecified'
    slateMix[slate] = (slateMix[slate] ?? 0) + 1
    totalReservedVolume += r.volume ?? 1
  }
  return {
    totalReservedSupply: live.length,
    totalFilled: all.filter((r) => r.status === 'filled').length,
    totalReservedVolume,
    slateMix,
    reservedByJob,
    reservedByEmployer,
    generatedAt: now(),
  }
}
