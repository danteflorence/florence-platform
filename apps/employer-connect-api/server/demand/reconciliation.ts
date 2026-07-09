// Manual / CSV reconciliation — the bridge before native ATS status sync. AMN or
// an employer reports outcomes (packet shared → interview → offer → start →
// retained) via CSV or manual entry; each maps to a Production Ledger stage and
// (for billing-critical start/retention) is recorded as an ATTESTATION, which is
// exactly the non-ATS verification the billing invariant requires.
import { store, uid, now } from '../db'
import { recordLedger } from '../ledger'
import { parseCsv } from './ingest'
import type { ReconciliationEvent, ReconciliationStatus } from '../../shared/demand-types'
import type { LedgerStage, VerificationSource } from '../../shared/types'

const STATUS_TO_STAGE: Partial<Record<ReconciliationStatus, LedgerStage>> = {
  // Formal packet/application submission is created only by ApplicationGate-owned
  // submit/lock paths. Reconciliation packet events remain attribution-only so
  // external CSV/manual status cannot mint a FlorenceRN submission.
  interview_requested: 'interview_scheduled',
  interview_scheduled: 'interview_scheduled',
  interview_completed: 'interview_scheduled',
  offer_made: 'offer_made',
  offer_accepted: 'offer_accepted',
  start_date_set: 'start_scheduled',
  started: 'started',
  rejected: 'rejected',
  withdrawn: 'withdrawn',
  retained_30: 'retention_30d',
  retained_60: 'retention_30d',
  retained_90: 'retention_90d',
}

export interface ReconRow {
  candidateId: string
  jobId?: string
  status: ReconciliationStatus
  occurredAt?: string
  notes?: string
}

export interface ReconSummary {
  received: number
  recorded: number
  ledgerEvents: number
  skipped: number
  errors: string[]
}

export async function ingestReconciliation(source: ReconciliationEvent['source'], rows: ReconRow[]): Promise<ReconSummary> {
  const s: ReconSummary = { received: rows.length, recorded: 0, ledgerEvents: 0, skipped: 0, errors: [] }
  // CSV/manual/AMN/employer updates are attestations — the trusted non-ATS source
  // for start/retention (ATS status alone may never assert those, by invariant).
  const verifiedVia: VerificationSource = 'employer_attestation'
  for (const row of rows) {
    if (!row.candidateId || !row.status) { s.skipped += 1; continue }
    const cand = await store.candidates.get(row.candidateId)
    if (!cand) { s.errors.push(`unknown candidate ${row.candidateId}`); s.skipped += 1; continue }

    const ev: ReconciliationEvent = {
      id: uid(), source, candidateId: row.candidateId, jobId: row.jobId, status: row.status,
      occurredAt: row.occurredAt ?? now(), notes: row.notes, createdAt: now(),
    }
    await store.reconciliations.insert(ev)
    s.recorded += 1

    const stage = STATUS_TO_STAGE[row.status]
    if (stage) {
      const job = row.jobId ? await store.demandJobs.get(row.jobId) : null
      await recordLedger({
        candidateId: row.candidateId, stage, employerId: job?.employerId,
        notes: `reconciliation:${source}:${row.status}${row.notes ? ` — ${row.notes}` : ''}`, verifiedVia,
      })
      s.ledgerEvents += 1
    }

    await store.attribution.insert({
      id: uid(), candidateId: row.candidateId, jobId: row.jobId, eventType: `recon.${row.status}`,
      sourceSystem: source, metadata: { notes: row.notes }, occurredAt: ev.occurredAt,
    })
  }
  return s
}

const norm = (k: string) => k.toLowerCase().replace(/\s+/g, '')
export function reconRowsFromCsv(text: string): ReconRow[] {
  return parseCsv(text).map((rec) => {
    const get = (key: string): string => {
      const hk = Object.keys(rec).find((h) => norm(h) === key)
      return hk ? rec[hk] : ''
    }
    return {
      candidateId: get('candidateid'),
      jobId: get('jobid') || undefined,
      status: get('status') as ReconciliationStatus,
      occurredAt: get('occurredat') || undefined,
      notes: get('notes') || undefined,
    }
  })
}
