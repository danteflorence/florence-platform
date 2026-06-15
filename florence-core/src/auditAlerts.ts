// Anomaly detection over the audit log. The first detector flags a partner/actor
// who reads an unusually large number of DISTINCT nurses in a short window — the
// classic bulk-export / scraping signal the security feedback calls out. When
// tripped it writes a `security.alert` audit row (mock-by-default; a webhook can
// be wired later behind SECURITY_ALERT_WEBHOOK without changing callers).

import type { Audit } from "./audit.ts";
import type { Store } from "./store.ts";

export interface BulkReadFinding {
  tripped: boolean;
  actor: string;
  distinctSubjects: number;
  windowSec: number;
  threshold: number;
}

/**
 * Inspect recent audit rows for `actor` and report whether their distinct
 * passport.read subjects in the last `windowSec` exceeds `threshold`.
 */
export async function bulkReadCheck(
  store: Store,
  actor: string,
  opts?: { windowSec?: number; threshold?: number; scan?: number },
): Promise<BulkReadFinding> {
  const windowSec = opts?.windowSec ?? 300;
  const threshold = opts?.threshold ?? 25;
  const scan = opts?.scan ?? 2000;
  const cutoff = Date.now() - windowSec * 1000;
  const recent = await store.recentAudit(scan);
  const subjects = new Set<string>();
  for (const r of recent) {
    if (r.actor !== actor || r.action !== "passport.read") continue;
    if (Date.parse(r.at) < cutoff) continue;
    if (r.entity_id) subjects.add(r.entity_id);
  }
  return { tripped: subjects.size > threshold, actor, distinctSubjects: subjects.size, windowSec, threshold };
}

/** Run the check and, if tripped, record a security.alert audit row. */
export async function bulkReadAlert(
  store: Store,
  audit: Audit,
  actor: string,
  opts?: { windowSec?: number; threshold?: number },
): Promise<BulkReadFinding> {
  const finding = await bulkReadCheck(store, actor, opts);
  if (finding.tripped) {
    await audit("system", "security.alert", "actor", actor, {
      kind: "bulk_passport_read",
      distinctSubjects: finding.distinctSubjects,
      windowSec: finding.windowSec,
      threshold: finding.threshold,
    });
  }
  return finding;
}
