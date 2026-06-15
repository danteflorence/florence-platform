// Append-only, TAMPER-EVIDENT audit helper. Records identity events (login, role
// grant/revoke, org create, key rotation), consent grant/revoke, AND sensitive
// reads (passport.read) — so the log answers "who saw what, when, why, and what
// changed". Each row stores the hash of the previous row plus a hash of itself,
// forming a chain that auditVerify.ts can validate; any edit/removal breaks it.
//
// Appends are SERIALIZED through an in-process promise queue so prev_hash is
// consistent under concurrent fire-and-forget callers. (Single-appender model;
// multi-instance Core would need a DB sequence + lock — see docs/security/audit-logging.md.)

import { sha256hex } from "./crypto.ts";
import type { AuditRow, Store } from "./store.ts";
import { id, nowIso } from "./util.ts";

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

export function makeAudit(store: Store): Audit {
  // The queue tail. Each append waits for the prior one so prev_hash is stable.
  let tail: Promise<unknown> = Promise.resolve();

  return (actor, action, entity, entityId, detail) => {
    const run = async (): Promise<void> => {
      const base: Omit<AuditRow, "prev_hash" | "row_hash"> = {
        id: id("evt"),
        at: nowIso(),
        actor,
        action,
        entity,
        ...(entityId !== undefined && { entity_id: entityId }),
        ...(detail !== undefined && { detail }),
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
}
