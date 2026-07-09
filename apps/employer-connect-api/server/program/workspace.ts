// Derived read-views for the AMN/Kaiser Program Workspace cockpit. Pure aggregation
// over programs/waves/slates + the production ledger. No new truth — just projections.

import { store } from '../db'
import type { LedgerStage, ProductionLedgerEvent, Program, ProgramSlate, ProgramWave } from '../../shared/types'

export interface ProgramOverview {
  program: Program
  waves: ProgramWave[]
  slates: ProgramSlate[]
  lockedCandidates: number
}

export async function programOverview(programId: string): Promise<ProgramOverview> {
  const program = await store.programs.get(programId)
  if (!program) throw new Error(`program not found: ${programId}`)
  const waves = await store.programWaves.byProgram(programId)
  const slates = await store.programSlates.byProgram(programId)
  const lockedCandidates = new Set(slates.filter((s) => s.submittedAt).flatMap((s) => s.candidateIds)).size
  return { program, waves, slates, lockedCandidates }
}

/** All ledger events for a program's locked candidates, grouped by candidate. */
async function programLedger(programId: string): Promise<{ slates: ProgramSlate[]; eventsByCandidate: Map<string, ProductionLedgerEvent[]> }> {
  const program = await store.programs.get(programId)
  if (!program) throw new Error(`program not found: ${programId}`)
  const slates = await store.programSlates.byProgram(programId)
  const candidateIds = new Set(slates.flatMap((s) => s.candidateIds))
  const all = await store.ledger.byEmployer(program.employerId)
  const eventsByCandidate = new Map<string, ProductionLedgerEvent[]>()
  for (const e of all) {
    if (!candidateIds.has(e.candidateId)) continue
    const a = eventsByCandidate.get(e.candidateId) ?? []
    a.push(e)
    eventsByCandidate.set(e.candidateId, a)
  }
  return { slates, eventsByCandidate }
}

const reached = (events: ProductionLedgerEvent[], stage: LedgerStage): boolean => events.some((e) => e.stage === stage)

export interface WaveTrackerRow {
  waveId: string
  waveNumber: number
  targetCount: number
  locked: number
  packetShared: number
  interview: number
  offer: number
  started: number
  retained60: number
  retained90: number
}

export async function waveTracker(programId: string): Promise<WaveTrackerRow[]> {
  const { slates, eventsByCandidate } = await programLedger(programId)
  const waves = await store.programWaves.byProgram(programId)
  return waves.map((w) => {
    const cands = slates.filter((s) => s.waveId === w.id).flatMap((s) => s.candidateIds)
    const ev = (cid: string) => eventsByCandidate.get(cid) ?? []
    return {
      waveId: w.id,
      waveNumber: w.waveNumber,
      targetCount: w.targetCount,
      locked: cands.length,
      packetShared: cands.filter((c) => reached(ev(c), 'ats_application_submitted')).length,
      interview: cands.filter((c) => reached(ev(c), 'interview_scheduled')).length,
      offer: cands.filter((c) => reached(ev(c), 'offer_made') || reached(ev(c), 'offer_accepted')).length,
      started: cands.filter((c) => reached(ev(c), 'started')).length,
      retained60: cands.filter((c) => reached(ev(c), 'retention_60d')).length,
      retained90: cands.filter((c) => reached(ev(c), 'retention_90d')).length,
    }
  })
}

export interface Scorecard { packetsShared: number; interviews: number; offers: number; starts: number; retained30: number; retained60: number; retained90: number }

export async function scorecard(programId: string): Promise<Scorecard> {
  const { eventsByCandidate } = await programLedger(programId)
  const cands = [...eventsByCandidate.keys()]
  const ev = (cid: string) => eventsByCandidate.get(cid) ?? []
  return {
    packetsShared: cands.filter((c) => reached(ev(c), 'ats_application_submitted')).length,
    interviews: cands.filter((c) => reached(ev(c), 'interview_scheduled')).length,
    offers: cands.filter((c) => reached(ev(c), 'offer_made') || reached(ev(c), 'offer_accepted')).length,
    starts: cands.filter((c) => reached(ev(c), 'started')).length,
    retained30: cands.filter((c) => reached(ev(c), 'retention_30d')).length,
    retained60: cands.filter((c) => reached(ev(c), 'retention_60d')).length,
    retained90: cands.filter((c) => reached(ev(c), 'retention_90d')).length,
  }
}

export interface ProgramException { candidateId: string; issue: string }

export async function exceptions(programId: string): Promise<ProgramException[]> {
  const { eventsByCandidate } = await programLedger(programId)
  const out: ProgramException[] = []
  for (const [cid, events] of eventsByCandidate) {
    if (reached(events, 'rejected')) out.push({ candidateId: cid, issue: 'Employer rejected' })
    if (reached(events, 'withdrawn')) out.push({ candidateId: cid, issue: 'Candidate withdrew' })
  }
  return out
}

export interface ExpansionGate { waveNumber: number; targetCount: number; started: number; fillPct: number; readyToAdvance: boolean }

export async function expansionGate(programId: string): Promise<ExpansionGate[]> {
  const tracker = await waveTracker(programId)
  return tracker.map((w) => {
    const fillPct = w.targetCount ? Math.round((w.started / w.targetCount) * 100) : 0
    return { waveNumber: w.waveNumber, targetCount: w.targetCount, started: w.started, fillPct, readyToAdvance: fillPct >= 80 }
  })
}
