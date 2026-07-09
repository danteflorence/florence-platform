// ============================================================================
// Data layer entry point. Selects the backend by env and exposes the async
// `store` plus id/time helpers. Default is Postgres. SQLite is allowed only for
// explicit local throwaway development.
//
//   ATS_DB=postgres               → Postgres (DATABASE_URL, or in-memory PGlite outside production)
//   ATS_DB=postgres DATABASE_URL=…→ networked Postgres (needs `npm i pg`)
//   ATS_DB=sqlite ALLOW_SQLITE_LOCAL_DEV=1 → node:sqlite for local throwaway dev only
// ============================================================================
import { createHash, randomUUID } from 'node:crypto'
import { createPostgresStore } from './store/postgres'
import type { Store } from './store/types'
import type { AuditEntry } from '../shared/types'

export const uid = (): string => randomUUID()
export const now = (): string => new Date().toISOString()

function redactAuditDetail(value: string | undefined): string | undefined {
  if (!value) return value
  const redacted = value
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[REDACTED]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED]')
    .replace(/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, '[REDACTED]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED]')
    .replace(/\b(?:ssn|itin)\s*(?::|=|\s)\s*\d{9}\b/gi, '[REDACTED]')
    .replace(/\bN\d{10}\b/g, '[REDACTED]')
    .replace(/\b(?:passport|sevis|ssn|itin|ds-?160|i-?20|credit|loan|lender(?:\s+application)?|token|secret|api[_ -]?key)(?:\s+(?:number|id|confirmation|application|value))?\s*(?::|=|\s)\s*[A-Z0-9][A-Z0-9_-]{2,}/gi, '[REDACTED]')
    .replace(/\b(?:dob|date\s+of\s+birth|birthDate)\s*(?::|=|\s)\s*[^;,\n]+/gi, '[REDACTED]')
    .replace(/\baddress\s*(?::|=|\s)\s*[^;\n]+/gi, '[REDACTED]')
    .replace(/(?:\/(?:private|tmp|var|Users|vault|documents|restricted-documents)\/[^\s"'<>]+)/g, '[REDACTED]')
  if (redacted !== value) return compactAuditDetail(redacted)
  return compactAuditDetail(value)
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

const SAFE_DETAIL_KEYS = new Set([
  'action',
  'applied',
  'channel',
  'count',
  'created',
  'fee',
  'imported',
  'legacyAction',
  'missing',
  'mode',
  'purpose',
  'reason',
  'scope',
  'status',
  'type',
  'view',
])

const SENSITIVE_DETAIL_KEYS = /candidate|document|employer|packet|program|token|secret|key|url|link|name|email|phone|passport|sevis|ds-?160|i-?20|visa|credit|loan|underwriting|coreLock|ats/i
const SAFE_VALUE = /^[a-z0-9_.:-]{1,80}$/i
const SAFE_COUNT_VALUE = /^[0-9]+(?:\.[0-9]+)?$/

function compactAuditDetail(value: string): string {
  if (!value.trim()) return '[REDACTED]'
  if (/^\s*[{[]/.test(value)) return '[REDACTED]'
  const parts = value.split(';').map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0) return '[REDACTED]'
  const sanitized = parts.map((part) => {
    const match = part.match(/^([a-zA-Z0-9_.-]+)=(.*)$/)
    if (!match) return '[REDACTED]'
    const [, key, raw] = match
    const v = raw.trim()
    if (SENSITIVE_DETAIL_KEYS.test(key)) return `${key}=[REDACTED]`
    if (!SAFE_DETAIL_KEYS.has(key)) return `${key}=[REDACTED]`
    if (key === 'count' || key === 'created' || key === 'imported' || key === 'fee') {
      return SAFE_COUNT_VALUE.test(v) ? `${key}=${v}` : `${key}=[REDACTED]`
    }
    return SAFE_VALUE.test(v) ? `${key}=${v}` : `${key}=[REDACTED]`
  })
  return sanitized.join(';')
}

function auditKey(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value.trim().toLowerCase()).digest('hex').slice(0, 16)}`
}

function redactAuditEntityId(entity: string, entityId: string): string {
  if (/^[-_a-z0-9:.]{1,96}$/i.test(entityId) && !/secret|token|passport|sevis|ds160|i20|ssn|itin|url|https?/i.test(entityId)) {
    if (entity !== 'employer' || /^emp[-_]/i.test(entityId) || /^[0-9a-f-]{32,36}$/i.test(entityId)) return entityId
  }
  return auditKey(entity.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'entity', entityId)
}

const requestedBackend = process.env.ATS_DB ?? 'postgres'
const sqliteAllowed = requestedBackend === 'sqlite' && process.env.ALLOW_SQLITE_LOCAL_DEV === '1' && process.env.NODE_ENV !== 'production'
if (requestedBackend === 'sqlite' && !sqliteAllowed) {
  throw new Error('ATS_DB=sqlite is allowed only with ALLOW_SQLITE_LOCAL_DEV=1 outside production.')
}
if (requestedBackend !== 'postgres' && requestedBackend !== 'sqlite') {
  throw new Error(`Unsupported ATS_DB=${requestedBackend}; use postgres or explicit local sqlite.`)
}
if (requestedBackend === 'postgres' && process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required in production; Employer Connect must use networked Postgres.')
}

export const databaseBackend = requestedBackend === 'sqlite' ? 'sqlite-local-dev' : process.env.DATABASE_URL ? 'postgres' : 'pglite-memory-dev'
export const migrationStatus = () => ({ ok: true, schema: 'ats-postgres-inline-v1' })
export const store: Store = requestedBackend === 'postgres'
  ? await createPostgresStore()
  : (await import('./store/sqlite')).createSqliteStore()
console.log(`[ats-connect] store backend: ${databaseBackend}`)

/** Fire-and-forget audit (best-effort; never blocks or throws into a handler). */
export function audit(actor: AuditEntry['actor'], action: string, entity: string, entityId: string, detail?: string) {
  const canonicalAction = normalizeAuditAction(action)
  void store.audit.log({
    id: uid(),
    at: now(),
    actor,
    action: canonicalAction,
    entity,
    entityId: redactAuditEntityId(entity, entityId),
    detail: redactAuditDetail(detailWithLegacyAction(action, canonicalAction, detail)),
  }).catch(() => {})
}

export type { Store } from './store/types'
