// Verify the tamper-evidence chain of the audit log. Recomputes each row's hash
// from the previous row and confirms the stored linkage. Any insertion, edit, or
// deletion anywhere in the chain makes a downstream row_hash mismatch.

import { canonicalAudit, rowHash } from "./audit.ts";
import type { AuditRow, Store } from "./store.ts";

export interface ChainResult {
  ok: boolean;
  checked: number;
  /** id of the first row whose hash/linkage failed, if any. */
  brokenAt?: string;
  reason?: string;
}

export function verifyChain(rows: AuditRow[]): ChainResult {
  let prev: string | null = null;
  let checked = 0;
  for (const r of rows) {
    // Legacy rows (written before chaining) have no row_hash — skip but keep prev.
    if (r.row_hash === undefined) {
      prev = null; // a gap resets the chain anchor
      continue;
    }
    const expectedPrev = prev;
    if ((r.prev_hash ?? null) !== expectedPrev) {
      return { ok: false, checked, brokenAt: r.id, reason: "prev_hash linkage mismatch" };
    }
    const base: Omit<AuditRow, "prev_hash" | "row_hash"> = {
      id: r.id,
      at: r.at,
      actor: r.actor,
      action: r.action,
      entity: r.entity,
      ...(r.entity_id !== undefined && { entity_id: r.entity_id }),
      ...(r.detail !== undefined && { detail: r.detail }),
    };
    const recomputed = rowHash(expectedPrev, base);
    if (recomputed !== r.row_hash) {
      return { ok: false, checked, brokenAt: r.id, reason: "row_hash mismatch (row altered)" };
    }
    void canonicalAudit; // referenced for parity with the writer
    prev = r.row_hash;
    checked += 1;
  }
  return { ok: true, checked };
}

export async function verifyAuditChain(store: Store): Promise<ChainResult> {
  const rows = await store.allAuditOrdered();
  return verifyChain(rows);
}
