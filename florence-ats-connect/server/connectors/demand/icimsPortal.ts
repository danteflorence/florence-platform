// iCIMS Job Portal — structured source for iCIMS-hosted career portals. Live
// pulls need the customer's portal/API access (provisioned per the integration
// kit); mock-by-default until then.
import type { DemandSource } from '../../../shared/demand-types'
import type { DemandSourceConnector, PullResult } from './types'
import type { IngestRow } from '../../demand/ingest'

const MOCK: IngestRow[] = [
  { employerName: 'CommonSpirit (iCIMS)', title: 'RN - Telemetry', city: 'Phoenix', state: 'AZ', atsRequisitionId: 'ICIMS-22001', sourceUrl: 'https://careers-commonspirit.icims.com/jobs/22001' },
  { employerName: 'CommonSpirit (iCIMS)', title: 'Registered Nurse, Emergency Department', city: 'Phoenix', state: 'AZ', atsRequisitionId: 'ICIMS-22002', sourceUrl: 'https://careers-commonspirit.icims.com/jobs/22002' },
]

export const icimsPortalConnector: DemandSourceConnector = {
  sourceType: 'icims_portal',
  async listJobs(source: DemandSource): Promise<PullResult> {
    // Live portal search would go here behind the customer's portal credentials.
    return { rows: MOCK.map((m) => ({ ...m, employerName: source.name || m.employerName })), mode: 'mock', note: 'iCIMS portal in MOCK mode — returning sample jobs.' }
  },
}
