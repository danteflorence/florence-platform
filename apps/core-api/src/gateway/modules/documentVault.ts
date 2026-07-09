import type { Audit } from "../../audit.ts";
import { createDefaultDocumentVault, type DocumentVaultActor } from "../../documentVault.ts";
import { isRole } from "../../roles.ts";
import type { RecipientView } from "../../classification.ts";
import type { RestrictedDocumentType, Store } from "../../store.ts";
import { compileGw, type GwCtx, type GwRoute } from "../router.ts";

const DOCUMENT_TYPES = new Set<RestrictedDocumentType>([
  "passport",
  "i20",
  "ds160_confirmation",
  "sevis_i901_receipt",
  "visa_appointment_confirmation",
  "transcript",
  "credential_evaluation",
  "nclex_license_record",
  "financing_packet",
  "lender_document",
  "employer_packet",
  "ats_vms_submission_packet",
]);

const RECIPIENT_VIEWS = new Set<RecipientView>([
  "candidate",
  "internal_ops",
  "employer",
  "lender",
  "university",
  "amn_vms_partner",
  "investor_board_aggregate",
]);

function body(ctx: GwCtx): Record<string, unknown> {
  return (ctx.body ?? {}) as Record<string, unknown>;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function actorOf(ctx: GwCtx): DocumentVaultActor {
  const claims = ctx.claims;
  const role = isRole(String(claims?.role ?? "")) ? claims!.role as DocumentVaultActor["role"] : "candidate";
  return {
    id: String(claims?.email ?? claims?.sub ?? "service"),
    role,
    ...(claims?.org_id ? { orgId: claims.org_id } : {}),
    ...(claims?.cand ? { cand: claims.cand } : {}),
  };
}

export function documentVaultModule(store: Store, audit: Audit): GwRoute[] {
  const vault = createDefaultDocumentVault(store, audit);
  return [
    compileGw({
      method: "POST",
      pattern: "/v1/document-vault/documents",
      auth: true,
      scope: "documents:write",
      summary: "Upload a restricted document through the encrypted Document Vault.",
      handler: async (ctx) => {
        const b = body(ctx);
        const nurseId = str(b.nurseId) ?? str(b.candidateId);
        const documentType = str(b.documentType);
        const filename = str(b.filename);
        const contentType = str(b.contentType);
        const dataBase64 = str(b.dataBase64);
        if (!nurseId || !documentType || !DOCUMENT_TYPES.has(documentType as RestrictedDocumentType) || !filename || !contentType || !dataBase64) {
          return { status: 400, body: { error: "invalid_request" } };
        }
        const uploaded = await vault.upload({
          nurseId,
          documentType: documentType as RestrictedDocumentType,
          filename,
          contentType,
          bytes: Buffer.from(dataBase64, "base64"),
          ...(str(b.ownerOrgId) ? { ownerOrgId: str(b.ownerOrgId) } : {}),
          ...(str(b.programId) ? { programId: str(b.programId) } : {}),
          actor: actorOf(ctx),
        });
        if (!uploaded.ok) return { status: 400, body: { error: uploaded.error, reason: uploaded.reason } };
        return {
          status: 201,
          body: {
            id: uploaded.document.id,
            documentType: uploaded.document.document_type,
            status: uploaded.document.status,
            malwareScanStatus: uploaded.document.malware_scan_status,
            sizeBytes: uploaded.document.size_bytes,
          },
        };
      },
    }),
    compileGw({
      method: "POST",
      pattern: "/v1/document-vault/documents/:id/signed-url",
      auth: true,
      scope: "documents:read",
      summary: "Create a short-lived opaque signed URL after document-level authorization.",
      handler: async (ctx) => {
        const b = body(ctx);
        const recipientView = str(b.recipientView);
        if (!recipientView || !RECIPIENT_VIEWS.has(recipientView as RecipientView)) {
          return { status: 400, body: { error: "invalid_recipient_view" } };
        }
        const signed = await vault.createSignedUrl({
          documentId: ctx.params.id,
          recipientView: recipientView as RecipientView,
          actor: actorOf(ctx),
          ...(str(b.purpose) ? { purpose: str(b.purpose) } : {}),
          action: str(b.action) === "view" ? "view" : "download",
          ...(num(b.expiresInSeconds) ? { expiresInSeconds: num(b.expiresInSeconds) } : {}),
        });
        if (!signed.ok) return { status: 403, body: { error: signed.error, reason: signed.reason } };
        return { status: 201, body: signed };
      },
    }),
    compileGw({
      method: "GET",
      pattern: "/v1/document-vault/signed/:token",
      auth: false,
      scope: null,
      summary: "Redeem a short-lived signed Document Vault URL.",
      handler: async (ctx) => {
        const result = await vault.downloadSignedUrl(ctx.params.token);
        if (!result.ok) return { status: 403, body: { error: result.error, reason: result.reason } };
        return {
          status: 200,
          body: {
            documentType: result.documentType,
            contentType: result.contentType,
            dataBase64: result.bytes.toString("base64"),
          },
        };
      },
    }),
    compileGw({
      method: "DELETE",
      pattern: "/v1/document-vault/documents/:id",
      auth: true,
      scope: "documents:write",
      summary: "Revoke a restricted document through the retention/deletion hook path.",
      handler: async (ctx) => {
        const result = await vault.revokeDocument(ctx.params.id, actorOf(ctx));
        if (!result.ok) return { status: result.error === "document_not_found" ? 404 : 403, body: { error: result.error, reason: result.reason } };
        return { status: 200, body: { ok: true } };
      },
    }),
  ];
}
