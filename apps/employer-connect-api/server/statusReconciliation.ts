import { store, now } from './db'
import type { LedgerStage, ProductionLedgerEvent } from '../shared/types'

export type OperatingStatus =
  | 'interest'
  | 'matched'
  | 'packet_created'
  | 'submitted'
  | 'interview'
  | 'offer'
  | 'onboarding'
  | 'started'
  | 'retained'

const RETAINED = new Set<LedgerStage>(['retention_30d', 'retention_60d', 'retention_90d'])

function sinceIso(days: number): string {
  return new Date(Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000).toISOString()
}

function candidates(events: ProductionLedgerEvent[], predicate: (event: ProductionLedgerEvent) => boolean): number {
  return new Set(events.filter(predicate).map((event) => event.candidateId)).size
}

function inWindow<T extends { at?: string; createdAt?: string; submittedAt?: string }>(rows: T[], cutoff: string): T[] {
  return rows.filter((row) => String(row.at ?? row.createdAt ?? row.submittedAt ?? '') >= cutoff)
}

export async function statusReconciliation(windowDays = 7): Promise<Record<OperatingStatus, number>> {
  const cutoff = sinceIso(windowDays)
  const [interests, packets, apps, ledger] = await Promise.all([
    store.jobInterests.all(),
    store.packets.all(),
    store.atsApplications.all(),
    store.ledger.all(),
  ])
  const recentInterests = interests.filter((interest) => interest.createdAt >= cutoff)
  const recentPackets = packets.filter((packet) => packet.createdAt >= cutoff)
  const recentApps = apps.filter((app) => app.createdAt >= cutoff || (app.submittedAt ?? '') >= cutoff)
  const recentLedger = inWindow(ledger, cutoff)
  return {
    interest: new Set(recentInterests.map((interest) => interest.candidateId)).size,
    matched: candidates(recentLedger, (event) => event.stage === 'matched'),
    packet_created: new Set([
      ...recentPackets.map((packet) => packet.candidateId),
      ...recentLedger.filter((event) => event.stage === 'packet_created').map((event) => event.candidateId),
    ]).size,
    submitted: new Set([
      ...recentApps.filter((app) => app.status === 'submitted' || !!app.submittedAt).map((app) => app.candidateId),
      ...recentLedger.filter((event) => event.stage === 'ats_application_submitted').map((event) => event.candidateId),
    ]).size,
    interview: new Set([
      ...recentApps.filter((app) => app.status === 'interview').map((app) => app.candidateId),
      ...recentLedger.filter((event) => event.stage === 'interview_scheduled' || event.stage === 'interview_formal_scheduled').map((event) => event.candidateId),
    ]).size,
    offer: new Set([
      ...recentApps.filter((app) => app.status === 'offer' || app.status === 'hired').map((app) => app.candidateId),
      ...recentLedger.filter((event) => event.stage === 'offer_made' || event.stage === 'offer_accepted' || event.stage === 'offer_received_subject_to_clearance').map((event) => event.candidateId),
    ]).size,
    onboarding: new Set([
      ...recentApps.filter((app) => app.status === 'hired' || app.status === 'start_scheduled').map((app) => app.candidateId),
      ...recentLedger.filter((event) => event.stage === 'start_scheduled').map((event) => event.candidateId),
    ]).size,
    started: candidates(recentLedger, (event) => event.stage === 'started' || event.stage === 'start_cleared'),
    retained: candidates(recentLedger, (event) => RETAINED.has(event.stage)),
  }
}

export async function weeklyOperatingDashboard(args: { windowDays?: number } = {}) {
  const windowDays = args.windowDays ?? 7
  const cutoff = sinceIso(windowDays)
  const [programs, slates, apps, ledger] = await Promise.all([
    store.programs.all(),
    store.programSlates.all(),
    store.atsApplications.all(),
    store.ledger.all(),
  ])
  const waves = (await Promise.all(programs.map((program) => store.programWaves.byProgram(program.id)))).flat()
  const recentLedger = inWindow(ledger, cutoff)
  const starts = recentLedger.filter((event) =>
    (event.stage === 'started' || event.stage === 'start_cleared')
    && !!event.verifiedVia
    && event.verifiedVia !== 'ats')
  return {
    generatedAt: now(),
    window: { days: windowDays, since: cutoff },
    statusReconciliation: await statusReconciliation(windowDays),
    programs: {
      total: programs.length,
      active: programs.filter((program) => program.status === 'active').length,
      channels: programs.reduce((acc, program) => {
        acc[program.channel] = (acc[program.channel] ?? 0) + 1
        return acc
      }, {} as Record<string, number>),
      waveTargets: waves.reduce((sum, wave) => sum + wave.targetCount, 0),
      lockedCandidates: new Set(slates.flatMap((slate) => slate.candidateIds)).size,
    },
    submissions: {
      total: apps.length,
      recent: apps.filter((app) => app.createdAt >= cutoff || (app.submittedAt ?? '') >= cutoff).length,
      byStatus: apps.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] ?? 0) + 1
        return acc
      }, {} as Record<string, number>),
    },
    billingReady: {
      verifiedStarts: starts.length,
      candidateIds: [...new Set(starts.map((event) => event.candidateId))],
    },
  }
}
