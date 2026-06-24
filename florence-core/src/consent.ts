// Consent service — the canonical, versioned consent layer. Granting writes the
// `consents` store AND emits the legacy `consent.updated` spine event so the
// folded Passport's coarse `consents` map stays populated for existing readers.
//
// consentAllows() is the single gate passportView/policy consult — it generalizes
// the pathway canShare() check and the ATS packet consent gate into one place.
// Pure where it can be; the grant/revoke helpers take the store + audit.

import type { Audit } from "./audit.ts";
import { sha256hex } from "./crypto.ts";
import { recordEvent } from "./nurses.ts";
import type { ConsentRow, Store } from "./store.ts";
import { id, nowIso } from "./util.ts";

export interface GrantConsentInput {
  nurseId: string;
  purpose: string; // employer_share | underwriting | education | visa | demand_radar
  recipientCategory: string; // employer | lender | university | internal
  recipientOrgId?: string;
  recipientProgramId?: string;
  allowedFields?: string[];
  consentTextVersion: string;
  /** If omitted, derived from the text version (a deterministic fingerprint). */
  consentTextHash?: string;
  ipHash?: string;
  deviceHash?: string;
  grantedBy: string;
}

const ORG_SCOPED_RECIPIENTS = new Set(["employer", "lender", "university", "ats", "vms"]);

export function requiresRecipientOrg(recipientCategory: string): boolean {
  return ORG_SCOPED_RECIPIENTS.has(recipientCategory);
}

/** Record a consent grant, audit it, and emit the legacy spine event. */
export async function grantConsent(store: Store, audit: Audit, in_: GrantConsentInput): Promise<ConsentRow> {
  const row: ConsentRow = {
    id: id("cns"),
    nurse_id: in_.nurseId,
    purpose: in_.purpose,
    recipient_category: in_.recipientCategory,
    ...(in_.recipientOrgId ? { recipient_org_id: in_.recipientOrgId } : {}),
    ...(in_.recipientProgramId ? { recipient_program_id: in_.recipientProgramId } : {}),
    allowed_fields: in_.allowedFields ?? [],
    consent_text_version: in_.consentTextVersion,
    consent_text_hash: in_.consentTextHash ?? sha256hex(in_.consentTextVersion),
    ...(in_.ipHash ? { ip_hash: in_.ipHash } : {}),
    ...(in_.deviceHash ? { device_hash: in_.deviceHash } : {}),
    status: "granted",
    granted_at: nowIso(),
    granted_by: in_.grantedBy,
  };
  await store.insertConsent(row);
  await audit(in_.grantedBy, "consent.grant", "nurse", in_.nurseId, {
    consentId: row.id,
    purpose: row.purpose,
    recipient: in_.recipientOrgId ?? in_.recipientCategory,
    programId: in_.recipientProgramId,
  });
  // Keep the folded Passport's coarse consents map in sync.
  await recordEvent(store, in_.nurseId, {
    type: "consent.updated",
    source: "core",
    data: { scope: in_.purpose, status: "granted" },
  });
  return row;
}

/** Revoke a consent by id, audit it, and re-derive the coarse Passport flag. */
export async function revokeConsentById(
  store: Store,
  audit: Audit,
  args: { id: string; nurseId: string; purpose: string; by: string },
): Promise<void> {
  await store.revokeConsent(args.id, args.by);
  await audit(args.by, "consent.revoke", "nurse", args.nurseId, { consentId: args.id, purpose: args.purpose });
  // The coarse map is per-purpose; only flip it to revoked if NO live consent for
  // this purpose remains. This intentionally checks all recipient orgs because
  // external disclosure now requires named-org consent, not category-wide matching.
  const stillLive = (await store.consentsByNurse(args.nurseId)).some(
    (c) => c.purpose === args.purpose && c.status === "granted",
  );
  await recordEvent(store, args.nurseId, {
    type: "consent.updated",
    source: "core",
    data: { scope: args.purpose, status: stillLive ? "granted" : "revoked" },
  });
}

export interface ConsentDecision {
  ok: boolean;
  consentId?: string;
  allowedFields?: string[];
  reason?: string;
}

/**
 * The canonical consent gate. Given the nurse's consent rows, is there a live
 * grant for (purpose, recipientOrgId)? Org-specific requests require an exact
 * org match; category-wide rows do not unlock named partner disclosures.
 */
export function consentAllows(consents: ConsentRow[], purpose: string, recipientOrgId?: string, recipientProgramId?: string): ConsentDecision {
  const hit = consents
    .filter(
      (c) =>
        c.status === "granted" &&
        c.purpose === purpose &&
        (recipientOrgId ? c.recipient_org_id === recipientOrgId : !c.recipient_org_id) &&
        (recipientProgramId ? c.recipient_program_id === recipientProgramId : true),
    )
    .sort((a, b) => (a.granted_at < b.granted_at ? 1 : -1))[0];
  if (!hit) return { ok: false };
  return { ok: true, consentId: hit.id, allowedFields: hit.allowed_fields };
}

/** Store-backed central consent check for purpose-specific external disclosure. */
export async function checkConsent(
  store: Store,
  args: { nurseId: string; purpose: string; recipientOrgId?: string; recipientProgramId?: string },
): Promise<ConsentDecision> {
  const consents = await store.consentsByNurse(args.nurseId);
  const decision = consentAllows(consents, args.purpose, args.recipientOrgId, args.recipientProgramId);
  if (decision.ok) return decision;
  return {
    ok: false,
    reason: args.recipientOrgId
      ? `No live ${args.purpose} consent for recipient ${args.recipientOrgId}${args.recipientProgramId ? ` and program ${args.recipientProgramId}` : ""}`
      : `No live category-level ${args.purpose} consent`,
  };
}

export function employerShareConsentAllows(consents: ConsentRow[], employerOrgId: string, programId: string): ConsentDecision {
  return consentAllows(consents, "employer_share", employerOrgId, programId);
}

export async function checkEmployerShareConsent(
  store: Store,
  args: { nurseId: string; employerOrgId: string; programId: string },
): Promise<ConsentDecision> {
  return checkConsent(store, {
    nurseId: args.nurseId,
    purpose: "employer_share",
    recipientOrgId: args.employerOrgId,
    recipientProgramId: args.programId,
  });
}
