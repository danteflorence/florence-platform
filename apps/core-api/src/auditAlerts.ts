import { auditActorKey, type Audit } from "./audit.ts";
import type { AuditRow, Store } from "./store.ts";

export const ALERT_KINDS = [
  "repeated_failed_auth",
  "cross_tenant_access_denied",
  "unusual_document_download_volume",
  "bulk_export",
  "admin_privilege_escalation",
  "multiple_gate_bypass_attempts",
  "webhook_signature_failures",
  "bulk_access",
] as const;

export type AlertKind = (typeof ALERT_KINDS)[number];
export type AlertSeverity = "low" | "medium" | "high" | "critical";

export interface AlertEventSchema {
  kind: AlertKind;
  severity: AlertSeverity;
  actor?: string;
  entity?: string;
  entityId?: string;
  windowSec: number;
  count: number;
  threshold: number;
  detail?: Record<string, unknown>;
}

export interface AlertThresholds {
  repeatedFailedAuth: number;
  crossTenantDenied: number;
  documentDownloads: number;
  bulkExportRows: number;
  gateBypassAttempts: number;
  webhookSignatureFailures: number;
  bulkPassportReads: number;
}

export interface AuditAlertService {
  recordAlert(alert: AlertEventSchema): Promise<void>;
  evaluateSuspiciousActivity(actor: string, opts?: { windowSec?: number; scan?: number }): Promise<AlertEventSchema[]>;
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  repeatedFailedAuth: 5,
  crossTenantDenied: 3,
  documentDownloads: 25,
  bulkExportRows: 1000,
  gateBypassAttempts: 3,
  webhookSignatureFailures: 3,
  bulkPassportReads: 25,
};

export interface BulkReadFinding {
  tripped: boolean;
  actor: string;
  distinctSubjects: number;
  windowSec: number;
  threshold: number;
}

function cutoffMs(windowSec: number): number {
  return Date.now() - windowSec * 1000;
}

function recentForActor(rows: AuditRow[], actor: string, windowSec: number): AuditRow[] {
  const actorKey = auditActorKey(actor);
  const cutoff = cutoffMs(windowSec);
  return rows.filter((r) => r.actor === actorKey && Date.parse(r.at) >= cutoff);
}

function rowCount(rows: AuditRow[], action: string): number {
  return rows.filter((r) => r.action === action).length;
}

function hasWrongTenant(row: AuditRow): boolean {
  const detail = row.detail ?? {};
  return (
    row.action === "tenant.access_denied" ||
    (row.action === "access_policy.deny" && (detail.code === "wrong_tenant" || /tenant/i.test(String(detail.reason ?? ""))))
  );
}

function hasGateBypass(row: AuditRow): boolean {
  const detail = row.detail ?? {};
  return (
    row.action === "application_gate.bypass_attempt" ||
    row.action === "application_gate.submission_blocked" ||
    (row.action === "application_gate.check" && Array.isArray(detail.failureCodes) && detail.failureCodes.includes("workflow_unauthorized"))
  );
}

function hasBulkExport(row: AuditRow, threshold: number): boolean {
  const detail = row.detail ?? {};
  const rowCountValue = Number(detail.rowCount ?? detail.rows ?? detail.count ?? 0);
  return row.action === "export.generated" && (detail.bulk === true || rowCountValue >= threshold);
}

function hasAdminEscalation(row: AuditRow): boolean {
  const detail = row.detail ?? {};
  return (
    row.action === "admin.privilege_escalation" ||
    ((row.action === "role.grant" || row.action === "permission.grant") && ["super_admin", "ops"].includes(String(detail.role ?? "")))
  );
}

function alert(
  kind: AlertKind,
  severity: AlertSeverity,
  actor: string,
  windowSec: number,
  count: number,
  threshold: number,
  detail?: Record<string, unknown>,
): AlertEventSchema {
  return {
    kind,
    severity,
    actor: auditActorKey(actor),
    entity: "actor",
    entityId: auditActorKey(actor),
    windowSec,
    count,
    threshold,
    ...(detail ? { detail } : {}),
  };
}

export function createAuditAlertService(
  store: Store,
  audit: Audit,
  thresholds: Partial<AlertThresholds> = {},
): AuditAlertService {
  const t: AlertThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };

  async function recordAlert(event: AlertEventSchema): Promise<void> {
    await audit("system", "security.alert", event.entity ?? "security_alert", event.entityId, {
      alertKind: event.kind,
      severity: event.severity,
      actor: event.actor,
      windowSec: event.windowSec,
      count: event.count,
      threshold: event.threshold,
      ...(event.detail ?? {}),
    });
  }

  async function evaluateSuspiciousActivity(actor: string, opts: { windowSec?: number; scan?: number } = {}): Promise<AlertEventSchema[]> {
    const windowSec = opts.windowSec ?? 300;
    const rows = recentForActor(await store.recentAudit(opts.scan ?? 2000), actor, windowSec);
    const findings: AlertEventSchema[] = [];

    const failedAuth = rowCount(rows, "auth.login_failed") + rowCount(rows, "auth.failed_login");
    if (failedAuth >= t.repeatedFailedAuth) {
      findings.push(alert("repeated_failed_auth", "high", actor, windowSec, failedAuth, t.repeatedFailedAuth));
    }

    const tenantDenied = rows.filter(hasWrongTenant).length;
    if (tenantDenied >= t.crossTenantDenied) {
      findings.push(alert("cross_tenant_access_denied", "critical", actor, windowSec, tenantDenied, t.crossTenantDenied));
    }

    const downloads = rows.filter((r) => r.action === "document.download").length;
    if (downloads >= t.documentDownloads) {
      findings.push(alert("unusual_document_download_volume", "critical", actor, windowSec, downloads, t.documentDownloads));
    }

    const bulkExports = rows.filter((r) => hasBulkExport(r, t.bulkExportRows)).length;
    if (bulkExports > 0) {
      findings.push(alert("bulk_export", "critical", actor, windowSec, bulkExports, 1));
    }

    const adminEscalations = rows.filter(hasAdminEscalation).length;
    if (adminEscalations > 0) {
      findings.push(alert("admin_privilege_escalation", "critical", actor, windowSec, adminEscalations, 1));
    }

    const gateBypasses = rows.filter(hasGateBypass).length;
    if (gateBypasses >= t.gateBypassAttempts) {
      findings.push(alert("multiple_gate_bypass_attempts", "high", actor, windowSec, gateBypasses, t.gateBypassAttempts));
    }

    const signatureFailures = rowCount(rows, "webhook.signature_failed");
    if (signatureFailures >= t.webhookSignatureFailures) {
      findings.push(alert("webhook_signature_failures", "high", actor, windowSec, signatureFailures, t.webhookSignatureFailures));
    }

    const bulkRead = await bulkReadCheck(store, actor, { windowSec, threshold: t.bulkPassportReads, scan: opts.scan });
    if (bulkRead.tripped) {
      findings.push(alert("bulk_access", "critical", actor, windowSec, bulkRead.distinctSubjects, t.bulkPassportReads, {
        distinctSubjects: bulkRead.distinctSubjects,
      }));
    }

    for (const finding of findings) await recordAlert(finding);
    return findings;
  }

  return { recordAlert, evaluateSuspiciousActivity };
}

export async function bulkReadCheck(
  store: Store,
  actor: string,
  opts?: { windowSec?: number; threshold?: number; scan?: number },
): Promise<BulkReadFinding> {
  const windowSec = opts?.windowSec ?? 300;
  const threshold = opts?.threshold ?? DEFAULT_THRESHOLDS.bulkPassportReads;
  const scan = opts?.scan ?? 2000;
  const cutoff = cutoffMs(windowSec);
  const recent = await store.recentAudit(scan);
  const subjects = new Set<string>();
  const actorKey = auditActorKey(actor);
  for (const r of recent) {
    if (r.actor !== actorKey || r.action !== "passport.read") continue;
    if (Date.parse(r.at) < cutoff) continue;
    if (r.entity_id) subjects.add(r.entity_id);
  }
  return { tripped: subjects.size > threshold, actor: actorKey, distinctSubjects: subjects.size, windowSec, threshold };
}

export async function bulkReadAlert(
  store: Store,
  audit: Audit,
  actor: string,
  opts?: { windowSec?: number; threshold?: number },
): Promise<BulkReadFinding> {
  const finding = await bulkReadCheck(store, actor, opts);
  if (finding.tripped) {
    await audit("system", "security.alert", "actor", finding.actor, {
      alertKind: "bulk_access",
      severity: "critical",
      distinctSubjects: finding.distinctSubjects,
      windowSec: finding.windowSec,
      threshold: finding.threshold,
    });
  }
  return finding;
}
