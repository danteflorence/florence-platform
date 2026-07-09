import { createHash, randomBytes } from "node:crypto";
import type { Audit } from "./audit.ts";
import { config } from "./config.ts";
import { consentAllows } from "./consent.ts";
import { keyFromPassphrase, localKeyProvider, makeFieldCrypto, type KeyProvider } from "./crypto.ts";
import type { DataClass, RecipientView } from "./classification.ts";
import { isRole, STAFF_ROLES, type Role } from "./roles.ts";
import type { DocumentAccessGrantRow, RestrictedDocumentRow, RestrictedDocumentType, Store } from "./store.ts";
import { id, nowIso } from "./util.ts";

export type DocumentVaultAction = "view" | "download";

export interface DocumentVaultActor {
  id: string;
  role: Role;
  orgId?: string;
  cand?: string;
}

export interface UploadValidation {
  maxBytes: number;
  allowed: Record<string, readonly string[]>;
}

export interface MalwareScanInput {
  bytes: Buffer;
  documentType: RestrictedDocumentType;
  contentType: string;
  sha256: string;
}

export interface MalwareScanner {
  scan(input: MalwareScanInput): Promise<{ ok: true; verdict: "clean" } | { ok: false; verdict: "blocked"; reason: string }>;
}

export interface DocumentRetentionPolicy {
  schedule(input: { documentType: RestrictedDocumentType; uploadedAt: string }): {
    policy?: string;
    retainUntil?: string;
    deleteAfter?: string;
  };
  onDelete?(input: { document: RestrictedDocumentRow; actor: string; at: string }): Promise<void>;
}

export interface DocumentEnvelopeCrypto {
  encryptBytes(bytes: Buffer): Promise<string>;
  decryptBytes(ciphertext: string): Promise<Buffer>;
}

export interface UploadDocumentInput {
  nurseId: string;
  documentType: RestrictedDocumentType;
  filename: string;
  contentType: string;
  bytes: Buffer;
  ownerOrgId?: string;
  programId?: string;
  actor: DocumentVaultActor;
  now?: string;
}

export interface SignedUrlInput {
  documentId: string;
  recipientView: RecipientView;
  actor: DocumentVaultActor;
  purpose?: string;
  action?: DocumentVaultAction;
  expiresInSeconds?: number;
  now?: string;
}

export type SignedUrlResult = {
  ok: true;
  url: string;
  expiresAt: string;
  documentId: string;
} | {
  ok: false;
  error: string;
  reason: string;
};

export type DownloadResult = {
  ok: true;
  documentId: string;
  documentType: RestrictedDocumentType;
  contentType: string;
  bytes: Buffer;
} | {
  ok: false;
  error: string;
  reason: string;
};

const DEFAULT_VALIDATION: UploadValidation = {
  maxBytes: 15 * 1024 * 1024,
  allowed: {
    "application/pdf": [".pdf"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
  },
};

const DOCUMENT_CLASS: Record<RestrictedDocumentType, DataClass> = {
  passport: "RESTRICTED_IDENTITY",
  i20: "RESTRICTED_IMMIGRATION",
  ds160_confirmation: "RESTRICTED_IMMIGRATION",
  sevis_i901_receipt: "RESTRICTED_IMMIGRATION",
  visa_appointment_confirmation: "RESTRICTED_IMMIGRATION",
  transcript: "RESTRICTED_EDUCATION",
  credential_evaluation: "RESTRICTED_EDUCATION",
  nclex_license_record: "RESTRICTED_EDUCATION",
  financing_packet: "RESTRICTED_FINANCING",
  lender_document: "RESTRICTED_FINANCING",
  employer_packet: "RESTRICTED_EMPLOYER_PACKET",
  ats_vms_submission_packet: "RESTRICTED_EMPLOYER_PACKET",
};
const DOCUMENT_TYPES = new Set<RestrictedDocumentType>(Object.keys(DOCUMENT_CLASS) as RestrictedDocumentType[]);

const VIEW_ALLOWED_TYPES: Record<RecipientView, readonly RestrictedDocumentType[]> = {
  candidate: Object.keys(DOCUMENT_CLASS) as RestrictedDocumentType[],
  internal_ops: Object.keys(DOCUMENT_CLASS) as RestrictedDocumentType[],
  employer: ["employer_packet", "ats_vms_submission_packet"],
  amn_vms_partner: ["employer_packet", "ats_vms_submission_packet"],
  lender: ["financing_packet", "lender_document"],
  university: ["transcript", "credential_evaluation", "nclex_license_record"],
  investor_board_aggregate: [],
};

const VIEW_PURPOSE: Partial<Record<RecipientView, string>> = {
  employer: "employer_share",
  amn_vms_partner: "employer_share",
  lender: "underwriting",
  university: "education",
};

const SIGNED_URL_MAX_TTL_SECONDS = 15 * 60;

function sha256Bytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function addSeconds(iso: string, seconds: number): string {
  return new Date(new Date(iso).getTime() + seconds * 1000).toISOString();
}

function extensionOf(filename: string): string {
  const m = /\.[A-Za-z0-9]+$/.exec(filename.trim());
  return (m?.[0] ?? "").toLowerCase();
}

function hasExpectedMagic(contentType: string, bytes: Buffer): boolean {
  if (contentType === "application/pdf") return bytes.subarray(0, 4).toString("utf8") === "%PDF";
  if (contentType === "image/png") return bytes.length > 8 && bytes[0] === 0x89 && bytes.subarray(1, 4).toString("utf8") === "PNG";
  if (contentType === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return false;
}

function isStaff(role: Role): boolean {
  return (STAFF_ROLES as readonly Role[]).includes(role);
}

function roleFromActor(actor: DocumentVaultActor): Role {
  return isRole(actor.role) ? actor.role : "candidate";
}

function defaultPurpose(view: RecipientView): string {
  return VIEW_PURPOSE[view] ?? (view === "candidate" ? "self" : "internal");
}

function publicUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, "")}/v1/document-vault/signed/${token}`;
}

function tenantAllows(items: readonly string[] | undefined, value: string | undefined): boolean {
  return Boolean(value && (items?.includes("*") || items?.includes(value)));
}

function tenantKindAllows(view: RecipientView, kind: string): boolean {
  if (view === "employer") return kind === "employer";
  if (view === "amn_vms_partner") return kind === "amn" || kind === "ats_vms";
  if (view === "lender") return kind === "lender";
  if (view === "university") return kind === "university";
  return false;
}

function isRecipientView(view: string): view is RecipientView {
  return Object.prototype.hasOwnProperty.call(VIEW_ALLOWED_TYPES, view);
}

function packetKind(documentType: RestrictedDocumentType): "employer" | "lender" | undefined {
  if (documentType === "employer_packet" || documentType === "ats_vms_submission_packet") return "employer";
  if (documentType === "financing_packet" || documentType === "lender_document") return "lender";
  return undefined;
}

function packetAction(documentType: RestrictedDocumentType, action: "create" | "share" | "view"): string | undefined {
  const kind = packetKind(documentType);
  return kind ? `${kind}_packet.${action}` : undefined;
}

export function createDocumentEnvelopeCrypto(provider: KeyProvider): DocumentEnvelopeCrypto {
  const field = makeFieldCrypto(provider);
  return {
    encryptBytes(bytes: Buffer) {
      return field.encrypt(bytes.toString("base64"));
    },
    async decryptBytes(ciphertext: string) {
      return Buffer.from(await field.decrypt(ciphertext), "base64");
    },
  };
}

export class AllowingMalwareScanner implements MalwareScanner {
  async scan(): Promise<{ ok: true; verdict: "clean" }> {
    return { ok: true, verdict: "clean" };
  }
}

export class DefaultDocumentRetentionPolicy implements DocumentRetentionPolicy {
  schedule() {
    return { policy: "default_restricted_document" };
  }
}

export class DocumentVault {
  private store: Store;
  private audit: Audit;
  private crypto: DocumentEnvelopeCrypto;
  private scanner: MalwareScanner;
  private retention: DocumentRetentionPolicy;
  private validation: UploadValidation;
  private signedUrlBase: string;

  constructor(args: {
    store: Store;
    audit: Audit;
    crypto: DocumentEnvelopeCrypto;
    scanner?: MalwareScanner;
    retention?: DocumentRetentionPolicy;
    validation?: UploadValidation;
    signedUrlBase?: string;
  }) {
    this.store = args.store;
    this.audit = args.audit;
    this.crypto = args.crypto;
    this.scanner = args.scanner ?? new AllowingMalwareScanner();
    this.retention = args.retention ?? new DefaultDocumentRetentionPolicy();
    this.validation = args.validation ?? DEFAULT_VALIDATION;
    this.signedUrlBase = args.signedUrlBase ?? config.publicUrl;
  }

  private validateUpload(input: UploadDocumentInput): { ok: true; extension: string } | { ok: false; reason: string } {
    const extension = extensionOf(input.filename);
    const allowedExtensions = this.validation.allowed[input.contentType];
    if (!allowedExtensions) return { ok: false, reason: "content_type_not_allowed" };
    if (!extension || !allowedExtensions.includes(extension)) return { ok: false, reason: "extension_not_allowed" };
    if (input.bytes.length <= 0) return { ok: false, reason: "empty_file" };
    if (input.bytes.length > this.validation.maxBytes) return { ok: false, reason: "file_too_large" };
    if (!hasExpectedMagic(input.contentType, input.bytes)) return { ok: false, reason: "file_signature_mismatch" };
    return { ok: true, extension };
  }

  async upload(input: UploadDocumentInput): Promise<{ ok: true; document: RestrictedDocumentRow } | { ok: false; error: string; reason: string }> {
    const at = input.now ?? nowIso();
    if (!DOCUMENT_TYPES.has(input.documentType)) {
      await this.audit(input.actor.id, "document.upload_failed", "restricted_document", undefined, {
        documentType: String(input.documentType),
        reason: "document_type_not_allowed",
      });
      return { ok: false, error: "invalid_upload", reason: "document_type_not_allowed" };
    }
    const actorRole = roleFromActor(input.actor);
    const uploadAllowed = isStaff(actorRole) || actorRole === "super_admin" || (actorRole === "candidate" && input.actor.cand === input.nurseId);
    if (!uploadAllowed) {
      await this.audit(input.actor.id, "document.upload_failed", "restricted_document", undefined, {
        documentType: input.documentType,
        reason: "upload_not_authorized",
      });
      return { ok: false, error: "document_access_denied", reason: "upload_not_authorized" };
    }
    const validation = this.validateUpload(input);
    if (!validation.ok) {
      await this.audit(input.actor.id, "document.upload_failed", "restricted_document", undefined, {
        documentType: input.documentType,
        contentType: input.contentType,
        sizeBytes: input.bytes.length,
        reason: validation.reason,
      });
      return { ok: false, error: "invalid_upload", reason: validation.reason };
    }

    const scan = await this.scanner.scan({
      bytes: input.bytes,
      documentType: input.documentType,
      contentType: input.contentType,
      sha256: sha256Bytes(input.bytes),
    });
    if (!scan.ok) {
      await this.audit(input.actor.id, "document.upload_failed", "restricted_document", undefined, {
        documentType: input.documentType,
        contentType: input.contentType,
        sizeBytes: input.bytes.length,
        reason: "malware_scan_blocked",
      });
      return { ok: false, error: "invalid_upload", reason: scan.reason };
    }

    const documentId = id("doc");
    const retention = this.retention.schedule({ documentType: input.documentType, uploadedAt: at });
    const encrypted = await this.crypto.encryptBytes(input.bytes);
    const row: RestrictedDocumentRow = {
      id: documentId,
      nurse_id: input.nurseId,
      document_type: input.documentType,
      data_class: DOCUMENT_CLASS[input.documentType],
      ...(input.ownerOrgId ? { owner_org_id: input.ownerOrgId } : {}),
      ...(input.programId ? { program_id: input.programId } : {}),
      content_type: input.contentType,
      extension: validation.extension,
      size_bytes: input.bytes.length,
      sha256: sha256Bytes(input.bytes),
      encrypted_blob: encrypted,
      storage_key: `vault/${documentId}`,
      status: "active",
      ...(retention.policy ? { retention_policy: retention.policy } : {}),
      ...(retention.retainUntil ? { retain_until: retention.retainUntil } : {}),
      ...(retention.deleteAfter ? { delete_after: retention.deleteAfter } : {}),
      malware_scan_status: "clean",
      created_by: input.actor.id,
      created_at: at,
    };
    await this.store.insertRestrictedDocument(row);
    await this.audit(input.actor.id, "document.upload", "restricted_document", row.id, {
      documentType: row.document_type,
      dataClass: row.data_class,
      contentType: row.content_type,
      extension: row.extension,
      sizeBytes: row.size_bytes,
      ownerOrgId: row.owner_org_id,
      programId: row.program_id,
      malwareScanStatus: row.malware_scan_status,
      retentionPolicy: row.retention_policy,
    });
    const createAction = packetAction(row.document_type, "create");
    if (createAction) {
      await this.audit(input.actor.id, createAction, "restricted_document", row.id, {
        documentType: row.document_type,
        recipientView: packetKind(row.document_type) === "employer" ? "employer" : "lender",
        ownerOrgId: row.owner_org_id,
        programId: row.program_id,
      });
    }
    return { ok: true, document: row };
  }

  private async authorize(
    doc: RestrictedDocumentRow,
    actor: DocumentVaultActor,
    view: RecipientView,
    purpose: string,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (doc.status !== "active") return { ok: false, reason: `document_${doc.status}` };
    const role = roleFromActor(actor);
    if (view === "internal_ops") {
      if (isStaff(role)) return { ok: true };
      return { ok: false, reason: "internal_view_requires_internal_role" };
    }
    if (view === "candidate") {
      if (role === "candidate" && actor.cand === doc.nurse_id) return { ok: true };
      return { ok: false, reason: "candidate_mismatch" };
    }
    const allowedTypes = VIEW_ALLOWED_TYPES[view] ?? [];
    if (!allowedTypes.includes(doc.document_type)) return { ok: false, reason: "recipient_view_not_allowed_for_document_type" };
    if (!actor.orgId) return { ok: false, reason: "tenant_required" };
    const tenant = await this.store.getTenantScopeByOrgId(actor.orgId);
    if (!tenant) return { ok: false, reason: "tenant_scope_missing" };
    const partner = await this.store.getPartnerOrg(tenant.partner_org_id);
    if (!partner || partner.status !== "active") return { ok: false, reason: "partner_inactive_or_missing" };
    if (tenant.partner_kind !== partner.kind) return { ok: false, reason: "tenant_scope_kind_mismatch" };
    if (!tenantKindAllows(view, tenant.partner_kind)) return { ok: false, reason: "tenant_kind_not_allowed_for_view" };
    if (!tenantAllows(tenant.allowed_purposes, purpose)) return { ok: false, reason: "purpose_not_in_tenant_scope" };
    if (doc.program_id && !tenantAllows(tenant.allowed_program_ids, doc.program_id)) return { ok: false, reason: "program_not_in_tenant_scope" };
    if (doc.owner_org_id && doc.owner_org_id !== actor.orgId) return { ok: false, reason: "wrong_tenant" };
    const expectedPurpose = defaultPurpose(view);
    if (purpose !== expectedPurpose) return { ok: false, reason: "purpose_not_allowed_for_view" };
    const consents = await this.store.consentsByNurse(doc.nurse_id);
    const consent = consentAllows(consents, expectedPurpose, actor.orgId, doc.program_id);
    if (!consent.ok) return { ok: false, reason: "missing_consent" };
    return { ok: true };
  }

  private async authorizeGrant(
    doc: RestrictedDocumentRow,
    grant: DocumentAccessGrantRow,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (doc.status !== "active") return { ok: false, reason: `document_${doc.status}` };
    if (!isRecipientView(grant.recipient_view)) return { ok: false, reason: "recipient_view_unknown" };
    const view = grant.recipient_view;
    if (view === "internal_ops" || view === "candidate") return { ok: true };

    const allowedTypes = VIEW_ALLOWED_TYPES[view] ?? [];
    if (!allowedTypes.includes(doc.document_type)) return { ok: false, reason: "recipient_view_not_allowed_for_document_type" };
    if (!grant.recipient_org_id) return { ok: false, reason: "tenant_required" };
    const tenant = await this.store.getTenantScopeByOrgId(grant.recipient_org_id);
    if (!tenant) return { ok: false, reason: "tenant_scope_missing" };
    const partner = await this.store.getPartnerOrg(tenant.partner_org_id);
    if (!partner || partner.status !== "active") return { ok: false, reason: "partner_inactive_or_missing" };
    if (tenant.partner_kind !== partner.kind) return { ok: false, reason: "tenant_scope_kind_mismatch" };
    if (!tenantKindAllows(view, tenant.partner_kind)) return { ok: false, reason: "tenant_kind_not_allowed_for_view" };
    if (!tenantAllows(tenant.allowed_purposes, grant.purpose)) return { ok: false, reason: "purpose_not_in_tenant_scope" };
    if (doc.program_id && !tenantAllows(tenant.allowed_program_ids, doc.program_id)) return { ok: false, reason: "program_not_in_tenant_scope" };
    if (doc.owner_org_id && doc.owner_org_id !== grant.recipient_org_id) return { ok: false, reason: "wrong_tenant" };
    const expectedPurpose = defaultPurpose(view);
    if (grant.purpose !== expectedPurpose) return { ok: false, reason: "purpose_not_allowed_for_view" };
    const consents = await this.store.consentsByNurse(doc.nurse_id);
    const consent = consentAllows(consents, expectedPurpose, grant.recipient_org_id, doc.program_id);
    if (!consent.ok) return { ok: false, reason: "missing_consent" };
    return { ok: true };
  }

  async createSignedUrl(input: SignedUrlInput): Promise<SignedUrlResult> {
    const at = input.now ?? nowIso();
    const doc = await this.store.getRestrictedDocument(input.documentId);
    if (!doc) {
      await this.audit(input.actor.id, "document.access_denied", "restricted_document", undefined, {
        action: input.action ?? "download",
        recipientView: input.recipientView,
        reason: "document_not_found",
      });
      return { ok: false, error: "document_access_denied", reason: "document_not_found" };
    }
    const purpose = input.purpose ?? defaultPurpose(input.recipientView);
    const auth = await this.authorize(doc, input.actor, input.recipientView, purpose);
    if (!auth.ok) {
      await this.audit(input.actor.id, "document.access_denied", "restricted_document", doc.id, {
        action: input.action ?? "download",
        recipientView: input.recipientView,
        purpose,
        reason: auth.reason,
        ownerOrgId: doc.owner_org_id,
      });
      return { ok: false, error: "document_access_denied", reason: auth.reason };
    }

    const token = randomBytes(32).toString("base64url");
    const ttl = Math.max(1, Math.min(input.expiresInSeconds ?? 300, SIGNED_URL_MAX_TTL_SECONDS));
    const grant: DocumentAccessGrantRow = {
      id: id("docgrant"),
      token_hash: sha256Bytes(Buffer.from(token, "utf8")),
      document_id: doc.id,
      nurse_id: doc.nurse_id,
      recipient_view: input.recipientView,
      ...(input.actor.orgId ? { recipient_org_id: input.actor.orgId } : {}),
      actor: input.actor.id,
      purpose,
      action: input.action ?? "download",
      expires_at: addSeconds(at, ttl),
      created_at: at,
    };
    await this.store.insertDocumentAccessGrant(grant);
    await this.audit(input.actor.id, "document.signed_url.created", "restricted_document", doc.id, {
      action: grant.action,
      recipientView: grant.recipient_view,
      recipientOrgId: grant.recipient_org_id,
      purpose,
      expiresAt: grant.expires_at,
    });
    await this.audit(input.actor.id, "document.share", "restricted_document", doc.id, {
      action: grant.action,
      recipientView: grant.recipient_view,
      recipientOrgId: grant.recipient_org_id,
      purpose,
      expiresAt: grant.expires_at,
    });
    const shareAction = packetAction(doc.document_type, "share");
    if (shareAction) {
      await this.audit(input.actor.id, shareAction, "restricted_document", doc.id, {
        action: grant.action,
        recipientView: grant.recipient_view,
        recipientOrgId: grant.recipient_org_id,
        purpose,
        expiresAt: grant.expires_at,
      });
    }
    return { ok: true, url: publicUrl(this.signedUrlBase, token), expiresAt: grant.expires_at, documentId: doc.id };
  }

  async downloadSignedUrl(token: string, now = nowIso()): Promise<DownloadResult> {
    const grant = await this.store.getDocumentAccessGrantByHash(sha256Bytes(Buffer.from(token, "utf8")));
    if (!grant) {
      await this.audit("signed_url", "document.access_denied", "restricted_document", undefined, { reason: "signed_url_not_found" });
      return { ok: false, error: "document_access_denied", reason: "signed_url_not_found" };
    }
    const doc = await this.store.getRestrictedDocument(grant.document_id);
    if (!doc) {
      await this.audit(grant.actor, "document.access_denied", "restricted_document", grant.document_id, { reason: "document_not_found" });
      return { ok: false, error: "document_access_denied", reason: "document_not_found" };
    }
    if (grant.revoked_at) {
      await this.audit(grant.actor, "document.access_denied", "restricted_document", doc.id, { reason: "signed_url_revoked" });
      return { ok: false, error: "document_access_denied", reason: "signed_url_revoked" };
    }
    if (grant.expires_at <= now) {
      await this.audit(grant.actor, "document.access_denied", "restricted_document", doc.id, { reason: "signed_url_expired" });
      return { ok: false, error: "document_access_denied", reason: "signed_url_expired" };
    }
    if (doc.status !== "active") {
      await this.audit(grant.actor, "document.access_denied", "restricted_document", doc.id, { reason: `document_${doc.status}` });
      return { ok: false, error: "document_access_denied", reason: `document_${doc.status}` };
    }
    const grantAuth = await this.authorizeGrant(doc, grant);
    if (!grantAuth.ok) {
      await this.audit(grant.actor, "document.access_denied", "restricted_document", doc.id, {
        reason: grantAuth.reason,
        recipientView: grant.recipient_view,
        recipientOrgId: grant.recipient_org_id,
        purpose: grant.purpose,
      });
      return { ok: false, error: "document_access_denied", reason: grantAuth.reason };
    }
    const bytes = await this.crypto.decryptBytes(doc.encrypted_blob);
    await this.store.updateDocumentAccessGrant(grant.id, { used_at: now });
    await this.audit(grant.actor, grant.action === "view" ? "document.view" : "document.download", "restricted_document", doc.id, {
      recipientView: grant.recipient_view,
      recipientOrgId: grant.recipient_org_id,
      purpose: grant.purpose,
      contentType: doc.content_type,
      sizeBytes: doc.size_bytes,
    });
    const viewAction = packetAction(doc.document_type, "view");
    if (viewAction) {
      await this.audit(grant.actor, viewAction, "restricted_document", doc.id, {
        action: grant.action,
        recipientView: grant.recipient_view,
        recipientOrgId: grant.recipient_org_id,
        purpose: grant.purpose,
      });
    }
    return { ok: true, documentId: doc.id, documentType: doc.document_type, contentType: doc.content_type, bytes };
  }

  async revokeDocument(documentId: string, actor: DocumentVaultActor, now = nowIso()): Promise<{ ok: true } | { ok: false; error: string; reason: string }> {
    const doc = await this.store.getRestrictedDocument(documentId);
    if (!doc) {
      await this.audit(actor.id, "document.access_denied", "restricted_document", undefined, {
        action: "delete",
        reason: "document_not_found",
      });
      return { ok: false, error: "document_not_found", reason: "document_not_found" };
    }
    if (!isStaff(roleFromActor(actor))) {
      await this.audit(actor.id, "document.access_denied", "restricted_document", documentId, {
        action: "delete",
        reason: "internal_role_required",
      });
      return { ok: false, error: "document_access_denied", reason: "internal_role_required" };
    }
    await this.store.updateRestrictedDocument(documentId, { status: "revoked", revoked_at: now, revoked_by: actor.id });
    await this.retention.onDelete?.({ document: doc, actor: actor.id, at: now });
    await this.audit(actor.id, "document.delete", "restricted_document", documentId, { status: "revoked", documentType: doc.document_type });
    return { ok: true };
  }
}

export function createDefaultDocumentVault(store: Store, audit: Audit): DocumentVault {
  return new DocumentVault({
    store,
    audit,
    crypto: createDocumentEnvelopeCrypto(localKeyProvider(keyFromPassphrase(config.fieldEncPassphrase))),
    signedUrlBase: config.publicUrl,
  });
}
