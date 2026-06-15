// ============================================================================
// Status-sync poller — the "status both ways" half of the rail. On an interval
// (and on demand from ops), every non-terminal native-API application is checked
// against its employer's connector; transitions update the application, write a
// sync event, and land the corresponding stage in the Production Ledger.
//
// INVARIANT (same as the PATCH route + webhooks): billing-critical stages
// (start/retention) are NEVER applied from bare ATS status — those wait for
// HRIS or attestation. The poller records a 'skipped' sync event instead.
// ============================================================================
import { store, uid, now, audit } from './db'
import { getConnector } from './connectors'
import { HRIS_GRADE_STAGES, STATUS_TO_STAGE, recordLedger } from './ledger'
import type { ATSApplication } from '../shared/types'

const TERMINAL = new Set(['hired', 'rejected', 'withdrawn', 'started'])
const SYNCABLE_INTEGRATION = new Set(['active', 'sandbox'])

export interface StatusSyncResult {
  at: string
  checked: number
  updated: number
  skippedBillingCritical: number
  errors: { applicationId: string; error: string }[]
  changes: { applicationId: string; from: string; to: string; stage?: string }[]
}

let lastRun: StatusSyncResult | null = null
export function lastStatusSync(): StatusSyncResult | null {
  return lastRun
}

export async function runStatusSync(): Promise<StatusSyncResult> {
  const result: StatusSyncResult = { at: now(), checked: 0, updated: 0, skippedBillingCritical: 0, errors: [], changes: [] }
  const apps = (await store.atsApplications.all()).filter(
    (a) => a.submissionMode === 'native_api' && !TERMINAL.has(a.status),
  )
  for (const app of apps) {
    try {
      const employer = await store.employers.get(app.employerId)
      if (!employer || !SYNCABLE_INTEGRATION.has(employer.integrationStatus)) continue
      const connector = getConnector(employer.atsProvider)
      if (!connector) continue
      result.checked += 1

      const r = await connector.getApplicationStatus(app.atsApplicationId ?? app.id)
      if (!r || r.status === app.status) continue

      const stage = STATUS_TO_STAGE[r.status]
      if (stage && HRIS_GRADE_STAGES.has(stage)) {
        // Billing line: ATS status may not move start/retention truth.
        result.skippedBillingCritical += 1
        await store.sync.insert({
          id: uid(), employerId: app.employerId, atsProvider: app.atsProvider, entityType: 'status',
          entityId: app.id, direction: 'inbound', status: 'skipped',
          errorMessage: `ATS reported '${r.status}' — billing-critical; awaiting HRIS/attestation`, createdAt: now(),
        })
        continue
      }

      const from = app.status
      app.status = r.status
      app.atsStage = r.atsStage
      app.lastInboundSyncAt = now()
      await store.atsApplications.update(app)
      await store.sync.insert({
        id: uid(), employerId: app.employerId, atsProvider: app.atsProvider, entityType: 'status',
        entityId: app.id, direction: 'inbound', status: 'success', createdAt: now(),
      })
      if (stage) {
        await recordLedger({
          candidateId: app.candidateId, stage, sourceId: app.id, employerId: app.employerId,
          jobRequisitionId: app.jobRequisitionId, notes: `status-sync: ${from} → ${r.status} (${r.atsStage})`, verifiedVia: 'ats',
        })
      }
      audit('connector', 'ats_status_synced', 'application', app.id, `${from} → ${r.status}`)
      result.updated += 1
      result.changes.push({ applicationId: app.id, from, to: r.status, ...(stage ? { stage } : {}) })
    } catch (e) {
      result.errors.push({ applicationId: app.id, error: String((e as Error)?.message ?? e) })
    }
  }
  lastRun = result
  return result
}

/** Start the background loop. STATUS_SYNC_INTERVAL_MS (default 10 min; 0 = off). */
export function startStatusSyncLoop(): void {
  const ms = Number(process.env.STATUS_SYNC_INTERVAL_MS ?? 600_000)
  if (!ms || Number.isNaN(ms)) {
    console.log('[ats-connect] status-sync loop disabled (STATUS_SYNC_INTERVAL_MS=0)')
    return
  }
  const tick = () => {
    runStatusSync()
      .then((r) => {
        if (r.checked || r.updated) console.log(`[ats-connect] status-sync: checked ${r.checked}, updated ${r.updated}${r.skippedBillingCritical ? `, skipped ${r.skippedBillingCritical} billing-critical` : ''}`)
      })
      .catch((e) => console.error('[ats-connect] status-sync failed', e))
  }
  const t = setInterval(tick, ms)
  ;(t as { unref?: () => void }).unref?.()
  console.log(`[ats-connect] status-sync loop every ${Math.round(ms / 1000)}s`)
}
