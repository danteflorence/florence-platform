// Append-only audit trail. Every authenticated request lands here. We record
// WHO did WHAT to WHICH resource under WHICH scope - never the PII/financial
// VALUES.
//
// Tamper-evidence: each entry hash-chains the previous (hash = SHA-256 over the
// entry incl. prev_hash), so any later edit/reorder/deletion breaks the chain
// and `verifyChain()` catches it. Production writes this to a WORM/append-only
// store (audit_log, INSERT/SELECT only - see db/schema.sql).

import { createHash } from "node:crypto";
import type { AuditEntry } from "./types.ts";

export interface AuditSink {
  append(e: AuditEntry): void;
  recent(n?: number): AuditEntry[];
  /** Entries that touched a specific resource (resource_id match), newest-first. */
  byResource?(resourceId: string, limit?: number): AuditEntry[];
}

const GENESIS = "0".repeat(64);

function shortHash(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 16);
}

function auditActorKey(actor: string | undefined): string | undefined {
  if (!actor) return actor;
  return /@/.test(actor) || /token|secret|passport|sevis/i.test(actor) ? `actor_${shortHash(actor)}` : actor;
}

function auditIpKey(ip: string | undefined): string | undefined {
  return ip ? `ip_${shortHash(ip)}` : undefined;
}

/** SHA-256 over the entry, excluding its own `hash` field. */
function hashEntry(e: AuditEntry): string {
  const { hash: _omit, ...rest } = e;
  void _omit;
  return createHash("sha256").update(JSON.stringify(rest)).digest("hex");
}

export class MemoryAuditSink implements AuditSink {
  private entries: AuditEntry[] = [];
  private echo: boolean;

  constructor(echo = true) {
    this.echo = echo;
  }

  append(e: AuditEntry): void {
    const seq = this.entries.length;
    const prev = seq > 0 ? this.entries[seq - 1] : undefined;
    const sanitized: AuditEntry = {
      ...e,
      ...(e.actor ? { actor: auditActorKey(e.actor) } : {}),
      ...(e.ip ? { ip: auditIpKey(e.ip) } : {}),
    };
    const chained: AuditEntry = { ...sanitized, seq, prev_hash: prev?.hash ?? GENESIS };
    chained.hash = hashEntry(chained);
    this.entries.push(chained);
    if (this.echo) console.log(`[audit] ${JSON.stringify(chained)}`);
  }

  recent(n = 50): AuditEntry[] {
    return this.entries.slice(-n);
  }

  byResource(resourceId: string, limit = 100): AuditEntry[] {
    const matched = this.entries.filter((e) => e.resource_id === resourceId);
    return matched.slice(-limit).reverse();
  }

  /** True iff the chain is intact - no entry was altered, dropped, or reordered. */
  verifyChain(): boolean {
    let prev = GENESIS;
    for (let i = 0; i < this.entries.length; i++) {
      const en = this.entries[i];
      if (!en || en.seq !== i || en.prev_hash !== prev) return false;
      if (hashEntry(en) !== en.hash) return false;
      prev = en.hash ?? GENESIS;
    }
    return true;
  }
}
