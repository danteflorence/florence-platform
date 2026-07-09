// Append-only, TAMPER-EVIDENT audit helper. Records identity events (login, role
// grant/revoke, org create, key rotation), consent grant/revoke, AND sensitive
// reads (passport.read), so the log answers "who saw what, when, why, and what
// changed". Each row stores the hash of the previous row plus a hash of itself,
// forming a chain that auditVerify.ts can validate; any edit/removal breaks it.
//
// Appends are SERIALIZED through an in-process promise queue so prev_hash is
// consistent under concurrent fire-and-forget callers. (Single-appender model;
// multi-instance Core would need a DB sequence + lock, see docs/security/audit-logging.md.)

import { sha256hex } from "./crypto.ts";
import { redactForLog } from "./classification.ts";
import type { AuditRow, Store } from "./store.ts";
import { id, nowIso } from "./util.ts";

export const AUDIT_ACTIONS = [
  "auth.login",
  "auth.login_failed",
  "auth.insufficient_scope",
  "auth.mfa_change",
  "role.grant",
  "role.revoke",
  "permission.grant",
  "consent.grant",
  "consent.create",
  "consent.revoke",
  "document.upload",
  "document.upload_failed",
  "document.view",
  "document.download",
  "document.share",
  "document.access_denied",
  "document.signed_url.created",
  "document.delete",
  "passport.read",
  "passport.read_denied",
  "employer_packet.create",
  "employer_packet.share",
  "employer_packet.view",
  "lender_packet.create",
  "lender_packet.share",
  "lender_packet.view",
  "application_gate.check",
  "application_gate.submission_attempt",
  "application_gate.submission_blocked",
  "application_gate.submission_allowed",
  "application_gate.bypass_attempt",
  "financing.handoff",
  "lendkey.handoff",
  "sevismate.handoff",
  "ats_vms.submission",
  "tenant.access_denied",
  "webhook.received",
  "webhook.signature_failed",
  "webhook.subscribe",
  "export.generated",
  "bulk_access.detected",
  "immigration.ds160_confirmation.recorded",
  "immigration.visa_outcome.recorded",
  "nclex.registration.recorded",
  "nclex.att.recorded",
  "licensure.submission",
  "consular.i901_payment_order",
  "consular.i901_attestation",
  "consular.i901_receipt_qa",
  "admin.override",
  "security.alert",
  "gateway.rate_limited",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number] | (string & {});
export type AuditOutcome = "success" | "failure" | "denied" | "blocked" | "info";

export const AUDIT_ACTION_ALIASES: Record<string, AuditAction> = {
  "auth.failed_login": "auth.login_failed",
  "mfa.changed": "auth.mfa_change",
  tenant_scope_denied: "tenant.access_denied",
  application_gate_checked: "application_gate.check",
  application_gate_override_rejected: "application_gate.bypass_attempt",
  application_gate_blocked: "application_gate.submission_blocked",
  application_gate_passed: "application_gate.submission_allowed",
  application_submission_attempted: "application_gate.submission_attempt",
  packet_created: "employer_packet.create",
  packet_submitted: "ats_vms.submission",
  webhook_status: "webhook.received",
  document_uploaded: "document.upload",
  ds160_confirmation_recorded: "immigration.ds160_confirmation.recorded",
  visa_outcome_recorded: "immigration.visa_outcome.recorded",
  nclex_registered: "nclex.registration.recorded",
  nclex_att: "nclex.att.recorded",
  licensure_submitted: "licensure.submission",
  i901_payment_order_created: "consular.i901_payment_order",
  i901_payment_order_updated: "consular.i901_payment_order",
  i901_candidate_attested: "consular.i901_attestation",
  i901_handoff_sent: "sevismate.handoff",
  i901_receipt_received: "document.upload",
  i901_receipt_qa_approved: "consular.i901_receipt_qa",
  i901_receipt_rejected: "consular.i901_receipt_qa",
};

export function normalizeAuditAction(action: string): AuditAction {
  return AUDIT_ACTION_ALIASES[action] ?? action;
}

export interface AuditEventInput {
  actor: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  detail?: Record<string, unknown>;
  outcome?: AuditOutcome;
}

export interface AuditEventSchema {
  id: string;
  at: string;
  actor: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  detail?: Record<string, unknown>;
  outcome?: AuditOutcome;
}

export interface AuditEventService {
  record(event: AuditEventInput): Promise<void>;
}

export type Audit = (
  actor: string,
  action: string,
  entity: string,
  entityId?: string,
  detail?: Record<string, unknown>,
) => Promise<void>;

/** Deterministic serialization of a row's chained fields (excludes the hashes). */
export function canonicalAudit(r: Omit<AuditRow, "prev_hash" | "row_hash">): string {
  return JSON.stringify([r.id, r.at, r.actor, r.action, r.entity, r.entity_id ?? null, r.detail ?? null]);
}

export function rowHash(prev: string | null, r: Omit<AuditRow, "prev_hash" | "row_hash">): string {
  return sha256hex((prev ?? "") + canonicalAudit(r));
}

export function auditActorKey(actor: string): string {
  const normalized = actor.trim().toLowerCase();
  if (!normalized) return "unknown";
  if (/@/.test(normalized) || /passport|sevis|token|secret|key/i.test(normalized)) {
    return `actor_${sha256hex(normalized).slice(0, 16)}`;
  }
  return actor;
}

function auditEntityId(entity: string, entityId?: string): string | undefined {
  if (entityId === undefined) return undefined;
  const normalized = entityId.trim().toLowerCase();
  if (entity === "actor" || /@/.test(normalized) || /passport|sevis|token|secret|key/i.test(normalized)) {
    return `${entity}_${sha256hex(normalized).slice(0, 16)}`;
  }
  return entityId;
}

function auditDetail(detail: Record<string, unknown> | undefined, outcome: AuditOutcome | undefined): Record<string, unknown> | undefined {
  const merged = {
    ...(detail ?? {}),
    ...(outcome ? { outcome } : {}),
  };
  if (Object.keys(merged).length === 0) return undefined;
  return redactForLog(merged) as Record<string, unknown>;
}

export function makeAuditService(store: Store): AuditEventService {
  // The queue tail. Each append waits for the prior one so prev_hash is stable.
  let tail: Promise<unknown> = Promise.resolve();

  const record = (event: AuditEventInput): Promise<void> => {
    const run = async (): Promise<void> => {
      const action = normalizeAuditAction(event.action);
      const detail = action === event.action
        ? event.detail
        : { ...(event.detail ?? {}), legacyAction: event.action, canonicalAction: action };
      const base: Omit<AuditRow, "prev_hash" | "row_hash"> = {
        id: id("evt"),
        at: nowIso(),
        actor: auditActorKey(event.actor),
        action,
        entity: event.entity,
        ...(event.entityId !== undefined && { entity_id: auditEntityId(event.entity, event.entityId) }),
        ...(auditDetail(detail, event.outcome) ? { detail: auditDetail(detail, event.outcome) } : {}),
      };
      const prev = await store.lastAuditHash();
      const row: AuditRow = { ...base, ...(prev !== null && { prev_hash: prev }), row_hash: rowHash(prev, base) };
      await store.appendAudit(row);
    };
    const p = tail.then(run, run);
    // Keep the queue alive even if one append rejects (callers still get `p`).
    tail = p.catch(() => {});
    return p;
  };

  return { record };
}

export function makeAudit(store: Store): Audit {
  const service = makeAuditService(store);
  return (actor, action, entity, entityId, detail) => {
    return service.record({ actor, action, entity, ...(entityId !== undefined && { entityId }), ...(detail !== undefined && { detail }) });
  };
}
