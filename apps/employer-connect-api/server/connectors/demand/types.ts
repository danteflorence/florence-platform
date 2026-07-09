// DemandSourceConnector — the demand-discovery seam (parallel to the ATSConnector
// submit seam). Each public/partner source implements listJobs(); the pull
// orchestrator + normalizer handle everything downstream. Compliance lives here:
// a connector MUST refuse to fetch a source that hasn't been robots/ToS-reviewed.
import type { DemandSource, DemandSourceType } from '../../../shared/demand-types'
import type { IngestRow } from '../../demand/ingest'

export interface PullResult {
  rows: IngestRow[]
  mode: 'live' | 'mock' | 'blocked'
  note: string
}

/** How a source is connected — informs UI + which compliance gate applies. */
export type ConnectionType = 'public_api' | 'career_page' | 'partner_feed' | 'manual_csv' | 'native_ats'

export interface ConnectorTestResult {
  ok: boolean
  mode: 'live' | 'mock'
  note: string
}

/** The job-source discovery seam (generalized from DemandSourceConnector). `listJobs`
 *  is the only required member; `connectionType`/`test`/`refresh` are additive so existing
 *  connectors keep working unchanged. */
export interface JobSourceConnector {
  sourceType: DemandSourceType
  connectionType?: ConnectionType
  listJobs(source: DemandSource): Promise<PullResult>
  /** Lightweight connectivity probe (mock-safe). */
  test?(source: DemandSource): Promise<ConnectorTestResult>
  /** Explicit refresh hook (defaults to listJobs). Reserved for incremental sync. */
  refresh?(source: DemandSource): Promise<PullResult>
}

/** Back-compat alias — existing connectors typed as DemandSourceConnector still compile. */
export type DemandSourceConnector = JobSourceConnector
