// ============================================================================
// Data layer entry point. Selects the backend by env and exposes the async
// `store` plus id/time helpers. Default is node:sqlite; set ATS_DB=postgres to
// use Postgres (embedded PGlite, or a networked server via DATABASE_URL).
//
//   ATS_DB=sqlite                 → node:sqlite (default)
//   ATS_DB=postgres               → embedded PGlite (data/ats-connect-pg)
//   ATS_DB=postgres DATABASE_URL=…→ networked Postgres (needs `npm i pg`)
// ============================================================================
import { randomUUID } from 'node:crypto'
import { createSqliteStore } from './store/sqlite'
import { createPostgresStore } from './store/postgres'
import type { Store } from './store/types'
import type { AuditEntry } from '../shared/types'

export const uid = (): string => randomUUID()
export const now = (): string => new Date().toISOString()

function redactAuditDetail(value: string | undefined): string | undefined {
  if (!value) return value
  const redacted = value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED]')
    .replace(/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, '[REDACTED]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED]')
    .replace(/\b(?:ssn|itin)\s*(?::|=|\s)\s*\d{9}\b/gi, '[REDACTED]')
    .replace(/\bN\d{10}\b/g, '[REDACTED]')
    .replace(/\b(?:passport|sevis|ssn|itin|ds-?160|i-?20|credit|loan|lender(?:\s+application)?|token|secret|api[_ -]?key)(?:\s+(?:number|id|confirmation|application|value))?\s*(?::|=|\s)\s*[A-Z0-9][A-Z0-9_-]{2,}/gi, '[REDACTED]')
    .replace(/\b(?:dob|date\s+of\s+birth|birthDate)\s*(?::|=|\s)\s*[^;,\n]+/gi, '[REDACTED]')
    .replace(/\baddress\s*(?::|=|\s)\s*[^;\n]+/gi, '[REDACTED]')
    .replace(/https?:\/\/[^\s"'<>]*(?:X-Amz-Signature|Signature|token|signed)[^\s"'<>]*/gi, '[REDACTED]')
    .replace(/(?:\/(?:private|tmp|var|Users|vault|documents|restricted-documents)\/[^\s"'<>]+)/g, '[REDACTED]')
  return redacted === value && /passport|sevis|ssn|itin|ds160|i20|visa|dob|address|phone|credit|loan|underwriting|candidate|packet|document|token|secret/i.test(value)
    ? '[REDACTED]'
    : redacted
}

const AUDIT_ACTION_ALIASES: Record<string, string> = {
  tenant_scope_denied: 'tenant.access_denied',
  application_gate_checked: 'application_gate.check',
  application_gate_override_rejected: 'application_gate.bypass_attempt',
  application_gate_blocked: 'application_gate.submission_blocked',
  application_gate_passed: 'application_gate.submission_allowed',
  application_submission_attempted: 'application_gate.submission_attempt',
  packet_created: 'employer_packet.create',
  packet_submitted: 'ats_vms.submission',
  webhook_status: 'webhook.received',
}

function normalizeAuditAction(action: string): string {
  return AUDIT_ACTION_ALIASES[action] ?? action
}

function detailWithLegacyAction(action: string, canonicalAction: string, detail?: string): string | undefined {
  if (action === canonicalAction) return detail
  return detail ? `legacyAction=${action};detail=[REDACTED]` : `legacyAction=${action}`
}

const backend = process.env.ATS_DB === 'postgres' ? 'postgres' : 'sqlite'
export const store: Store = backend === 'postgres' ? await createPostgresStore() : createSqliteStore()
console.log(`[ats-connect] store backend: ${backend}${backend === 'postgres' ? (process.env.DATABASE_URL ? ' (networked pg)' : ' (embedded PGlite)') : ''}`)

/** Fire-and-forget audit (best-effort; never blocks or throws into a handler). */
export function audit(actor: AuditEntry['actor'], action: string, entity: string, entityId: string, detail?: string) {
  const canonicalAction = normalizeAuditAction(action)
  void store.audit.log({
    id: uid(),
    at: now(),
    actor,
    action: canonicalAction,
    entity,
    entityId,
    detail: redactAuditDetail(detailWithLegacyAction(action, canonicalAction, detail)),
  }).catch(() => {})
}

export type { Store } from './store/types'
