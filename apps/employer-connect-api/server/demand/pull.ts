// Pull a registered demand source through its connector, then funnel into the
// shared ingest pipeline (normalize + dedup). Also the freshness pass that ages
// out openings no longer seen at their sources.
import { store, now } from '../db'
import { getDemandConnector } from '../connectors/demand'
import { ingestRows, type IngestSummary } from './ingest'
import type { DemandSource } from '../../shared/demand-types'

export interface PullSummary extends IngestSummary {
  mode: 'live' | 'mock' | 'blocked'
  note: string
}

export async function pullSource(source: DemandSource): Promise<PullSummary> {
  const connector = getDemandConnector(source.sourceType)
  if (!connector) throw new Error(`No demand connector for sourceType=${source.sourceType}`)
  const pulled = await connector.listJobs(source)
  const summary = await ingestRows(source.id, source.sourceType, pulled.rows)
  source.lastPulledAt = now()
  await store.demandSources.update(source)
  return { ...summary, mode: pulled.mode, note: pulled.note }
}

/** Age out openings not seen within `days` → status 'stale' (kept, not deleted). */
export async function refreshStale(days = 14): Promise<{ checked: number; markedStale: number }> {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  const jobs = await store.demandJobs.all()
  let markedStale = 0
  for (const j of jobs) {
    if (j.status === 'open' && new Date(j.lastSeenAt).getTime() < cutoff) {
      j.status = 'stale'
      await store.demandJobs.update(j)
      markedStale += 1
    }
  }
  return { checked: jobs.length, markedStale }
}
