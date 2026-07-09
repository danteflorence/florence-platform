// ============================================================================
// Inbound ATS webhook application — normalize a provider status event onto our
// ATSApplication + Production Ledger. Extracted from the route so it's testable
// without HTTP/Core. CRITICAL: the same billing invariant holds here — an ATS
// webhook is bare ATS status, so it can advance interview/offer/etc. but CANNOT
// assert start/retention (those require HRIS/attestation; see /ops/hris/sync).
// ============================================================================
import { store, uid, now } from './db'
import { recordLedger, HRIS_GRADE_STAGES } from './ledger'
import type { ATSApplicationStatus, LedgerStage } from '../shared/types'

const STATUS_TO_STAGE: Partial<Record<ATSApplicationStatus, LedgerStage>> = {
  interview: 'interview_scheduled', offer: 'offer_made', hired: 'offer_accepted',
  start_scheduled: 'start_scheduled', started: 'started', rejected: 'rejected', withdrawn: 'withdrawn',
}

export interface WebhookResult { applied: boolean; reason?: string; status?: string }

export async function applyWebhookStatus(provider: string, externalId: string, status: ATSApplicationStatus, atsStage?: string): Promise<WebhookResult> {
  const app = (await store.atsApplications.all()).find((a) => a.atsApplicationId === externalId || a.id === externalId)
  if (!app) return { applied: false, reason: 'application not found' }
  const stage = STATUS_TO_STAGE[status]

  // Invariant: start/retention cannot be sourced from an ATS webhook.
  if (stage && HRIS_GRADE_STAGES.has(stage)) {
    await store.sync.insert({ id: uid(), employerId: app.employerId, atsProvider: app.atsProvider, entityType: 'status', entityId: app.id, direction: 'inbound', status: 'skipped', createdAt: now() })
    return { applied: false, reason: 'start/retention must come from HRIS/attestation, not an ATS webhook' }
  }

  app.status = status
  if (atsStage) app.atsStage = atsStage
  app.lastInboundSyncAt = now()
  await store.atsApplications.update(app)
  await store.sync.insert({ id: uid(), employerId: app.employerId, atsProvider: app.atsProvider, entityType: 'status', entityId: app.id, direction: 'inbound', status: 'success', createdAt: now() })
  if (stage) await recordLedger({ candidateId: app.candidateId, stage, sourceId: app.id, employerId: app.employerId, jobRequisitionId: app.jobRequisitionId, notes: `webhook ${provider} ${status}`, verifiedVia: 'ats' })
  return { applied: true, status }
}
