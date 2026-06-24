import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { makeAudit } from "../src/audit.ts";
import { grantConsent } from "../src/consent.ts";
import { createDocumentEnvelopeCrypto, DocumentVault } from "../src/documentVault.ts";
import { keyFromPassphrase, localKeyProvider } from "../src/crypto.ts";
import { MemoryStore } from "../src/store.ts";

let pass = 0;
let fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` - ${extra}` : ""}`);
  cond ? pass++ : fail++;
};

const NURSE = "nurse_vault";
const OTHER_NURSE = "nurse_other";
const ORG_EMP = "org_employer_vault";
const ORG_OTHER = "org_wrong_tenant";
const ORG_LENDER = "org_lender_vault";
const PROGRAM = "prog_vault";
const NOW = "2026-06-15T00:00:00.000Z";
const PDF = Buffer.from("%PDF-1.7\nsynthetic restricted document\n%%EOF", "utf8");

function tokenFrom(url: string): string {
  return url.split("/").pop()!;
}

const store = new MemoryStore();
const audit = makeAudit(store);
const crypto = createDocumentEnvelopeCrypto(localKeyProvider(keyFromPassphrase("document-vault-test-key")));
let deletionHooks = 0;
const vault = new DocumentVault({
  store,
  audit,
  crypto,
  retention: {
    schedule() {
      return {
        policy: "test_restricted_document_retention",
        retainUntil: "2031-06-15T00:00:00.000Z",
        deleteAfter: "2033-06-15T00:00:00.000Z",
      };
    },
    async onDelete() {
      deletionHooks += 1;
    },
  },
  signedUrlBase: "https://docs.example.test",
});

await store.insertNurse({ id: NURSE, email: "vault@example.test", name: "Vault Test", created_at: NOW, updated_at: NOW });
await store.insertNurse({ id: OTHER_NURSE, email: "other-vault@example.test", name: "Other Vault", created_at: NOW, updated_at: NOW });
await store.upsertPartnerOrg({ id: ORG_EMP, kind: "employer", name: "Employer Vault", tenant_id: ORG_EMP, status: "active", created_at: NOW });
await store.upsertTenantScope({ id: `ts_${ORG_EMP}`, org_id: ORG_EMP, tenant_id: ORG_EMP, partner_org_id: ORG_EMP, partner_kind: "employer", allowed_program_ids: [PROGRAM], allowed_purposes: ["employer_share"], created_at: NOW });
await store.upsertPartnerOrg({ id: ORG_OTHER, kind: "employer", name: "Wrong Tenant", tenant_id: ORG_OTHER, status: "active", created_at: NOW });
await store.upsertTenantScope({ id: `ts_${ORG_OTHER}`, org_id: ORG_OTHER, tenant_id: ORG_OTHER, partner_org_id: ORG_OTHER, partner_kind: "employer", allowed_program_ids: [PROGRAM], allowed_purposes: ["employer_share"], created_at: NOW });
await store.upsertPartnerOrg({ id: ORG_LENDER, kind: "lender", name: "Lender Vault", tenant_id: ORG_LENDER, status: "active", created_at: NOW });
await store.upsertTenantScope({ id: `ts_${ORG_LENDER}`, org_id: ORG_LENDER, tenant_id: ORG_LENDER, partner_org_id: ORG_LENDER, partner_kind: "lender", allowed_program_ids: ["*"], allowed_purposes: ["underwriting"], created_at: NOW });

const ops = { id: "ops_test", role: "ops" as const };
const candidate = { id: "candidate_test", role: "candidate" as const, cand: NURSE };
const wrongCandidate = { id: "candidate_wrong", role: "candidate" as const, cand: OTHER_NURSE };
const employer = { id: "employer_test", role: "employer" as const, orgId: ORG_EMP };
const wrongTenantEmployer = { id: "wrong_employer", role: "employer" as const, orgId: ORG_OTHER };
const lender = { id: "lender_test", role: "lender" as const, orgId: ORG_LENDER };

await grantConsent(store, audit, {
  nurseId: NURSE,
  purpose: "employer_share",
  recipientCategory: "employer",
  recipientOrgId: ORG_EMP,
  recipientProgramId: PROGRAM,
  consentTextVersion: "doc-employer-v1",
  grantedBy: "candidate_test",
});
await grantConsent(store, audit, {
  nurseId: NURSE,
  purpose: "underwriting",
  recipientCategory: "lender",
  recipientOrgId: ORG_LENDER,
  consentTextVersion: "doc-lender-v1",
  grantedBy: "candidate_test",
});

const employerPacket = await vault.upload({
  nurseId: NURSE,
  documentType: "employer_packet",
  filename: "safe-employer-packet.pdf",
  contentType: "application/pdf",
  bytes: PDF,
  ownerOrgId: ORG_EMP,
  programId: PROGRAM,
  actor: ops,
  now: NOW,
});
ok("DocumentVault stores employer packet", employerPacket.ok);
if (!employerPacket.ok) throw new Error("setup failed");
ok("Document is encrypted at rest", !employerPacket.document.encrypted_blob.includes(PDF.toString("utf8")));
ok("Retention policy hook schedules document lifecycle", employerPacket.document.retention_policy === "test_restricted_document_retention" && employerPacket.document.delete_after === "2033-06-15T00:00:00.000Z");

const unauthorizedUpload = await vault.upload({
  nurseId: NURSE,
  documentType: "passport",
  filename: "safe-passport.pdf",
  contentType: "application/pdf",
  bytes: PDF,
  actor: wrongCandidate,
  now: NOW,
});
ok("Unauthorized user cannot upload for another candidate", !unauthorizedUpload.ok && unauthorizedUpload.reason === "upload_not_authorized", unauthorizedUpload.ok ? undefined : unauthorizedUpload.reason);

const invalidDocumentType = await vault.upload({
  nurseId: NURSE,
  documentType: "not_a_document_type" as never,
  filename: "safe.pdf",
  contentType: "application/pdf",
  bytes: PDF,
  actor: candidate,
  now: NOW,
});
ok("Upload rejects unknown restricted document type", !invalidDocumentType.ok && invalidDocumentType.reason === "document_type_not_allowed", invalidDocumentType.ok ? undefined : invalidDocumentType.reason);

const financingPacket = await vault.upload({
  nurseId: NURSE,
  documentType: "financing_packet",
  filename: "safe-financing-packet.pdf",
  contentType: "application/pdf",
  bytes: PDF,
  ownerOrgId: ORG_EMP,
  actor: ops,
  now: NOW,
});
ok("DocumentVault stores financing packet", financingPacket.ok);
if (!financingPacket.ok) throw new Error("setup failed");

const lenderOwnedEmployerNotes = await vault.upload({
  nurseId: NURSE,
  documentType: "employer_packet",
  filename: "safe-employer-notes.pdf",
  contentType: "application/pdf",
  bytes: PDF,
  ownerOrgId: ORG_LENDER,
  actor: ops,
  now: NOW,
});
ok("DocumentVault stores employer-note packet for lender denial test", lenderOwnedEmployerNotes.ok);
if (!lenderOwnedEmployerNotes.ok) throw new Error("setup failed");

const unauthorized = await vault.createSignedUrl({
  documentId: employerPacket.document.id,
  recipientView: "candidate",
  actor: wrongCandidate,
  now: NOW,
});
ok("Unauthorized user cannot generate signed URL", !unauthorized.ok && unauthorized.reason === "candidate_mismatch", unauthorized.ok ? undefined : unauthorized.reason);

const wrongTenant = await vault.createSignedUrl({
  documentId: employerPacket.document.id,
  recipientView: "employer",
  actor: wrongTenantEmployer,
  now: NOW,
});
ok("Wrong tenant cannot access document", !wrongTenant.ok && wrongTenant.reason === "wrong_tenant", wrongTenant.ok ? undefined : wrongTenant.reason);

const employerFinancing = await vault.createSignedUrl({
  documentId: financingPacket.document.id,
  recipientView: "employer",
  actor: employer,
  now: NOW,
});
ok("Employer cannot access financing packet", !employerFinancing.ok && employerFinancing.reason === "recipient_view_not_allowed_for_document_type", employerFinancing.ok ? undefined : employerFinancing.reason);

const lenderEmployerNotes = await vault.createSignedUrl({
  documentId: lenderOwnedEmployerNotes.document.id,
  recipientView: "lender",
  actor: lender,
  now: NOW,
});
ok("Lender cannot access employer notes", !lenderEmployerNotes.ok && lenderEmployerNotes.reason === "recipient_view_not_allowed_for_document_type", lenderEmployerNotes.ok ? undefined : lenderEmployerNotes.reason);

const opsExternalView = await vault.createSignedUrl({
  documentId: employerPacket.document.id,
  recipientView: "employer",
  actor: ops,
  now: NOW,
});
ok("Internal staff cannot bypass external tenant policy", !opsExternalView.ok && opsExternalView.reason === "tenant_required", opsExternalView.ok ? undefined : opsExternalView.reason);

const opsInternalView = await vault.createSignedUrl({
  documentId: financingPacket.document.id,
  recipientView: "internal_ops",
  actor: ops,
  now: NOW,
});
ok("Internal staff can use internal_ops view for restricted documents", opsInternalView.ok, opsInternalView.ok ? undefined : opsInternalView.reason);

const shortUrl = await vault.createSignedUrl({
  documentId: employerPacket.document.id,
  recipientView: "employer",
  actor: employer,
  expiresInSeconds: 1,
  now: NOW,
});
ok("Authorized employer can generate short-lived signed URL", shortUrl.ok);
if (!shortUrl.ok) throw new Error("setup failed");
ok("Signed URL is opaque and contains no candidate/document identifiers", !shortUrl.url.includes(NURSE) && !shortUrl.url.includes(employerPacket.document.id) && !/vault@example|passport|sevis/i.test(shortUrl.url));
const expired = await vault.downloadSignedUrl(tokenFrom(shortUrl.url), "2026-06-15T00:00:02.000Z");
ok("Expired URL fails", !expired.ok && expired.reason === "signed_url_expired", expired.ok ? undefined : expired.reason);

const revocableUrl = await vault.createSignedUrl({
  documentId: employerPacket.document.id,
  recipientView: "employer",
  actor: employer,
  expiresInSeconds: 60,
  now: NOW,
});
ok("Authorized employer can generate revocation test URL", revocableUrl.ok);
if (!revocableUrl.ok) throw new Error("setup failed");
await vault.revokeDocument(employerPacket.document.id, ops, "2026-06-15T00:00:05.000Z");
const revoked = await vault.downloadSignedUrl(tokenFrom(revocableUrl.url), "2026-06-15T00:00:06.000Z");
ok("Revoked document fails", !revoked.ok && revoked.reason === "document_revoked", revoked.ok ? undefined : revoked.reason);
ok("Deletion policy hook runs on document revocation", deletionHooks === 1, String(deletionHooks));

const unsafe = await vault.upload({
  nurseId: NURSE,
  documentType: "passport",
  filename: "unsafe.exe",
  contentType: "application/x-msdownload",
  bytes: Buffer.from("MZ synthetic executable", "utf8"),
  actor: candidate,
  now: NOW,
});
ok("Upload rejects unsafe file type", !unsafe.ok && unsafe.reason === "content_type_not_allowed", unsafe.ok ? undefined : unsafe.reason);

let malwareScans = 0;
const blockingVault = new DocumentVault({
  store,
  audit,
  crypto,
  scanner: {
    async scan() {
      malwareScans += 1;
      return { ok: false, verdict: "blocked", reason: "malware_detected" } as const;
    },
  },
  signedUrlBase: "https://docs.example.test",
});
const malwareBlocked = await blockingVault.upload({
  nurseId: NURSE,
  documentType: "passport",
  filename: "blocked-passport.pdf",
  contentType: "application/pdf",
  bytes: PDF,
  actor: candidate,
  now: NOW,
});
ok("Malware scanner hook can block upload", !malwareBlocked.ok && malwareBlocked.reason === "malware_detected" && malwareScans === 1, malwareBlocked.ok ? undefined : malwareBlocked.reason);

const fresh = await vault.upload({
  nurseId: NURSE,
  documentType: "employer_packet",
  filename: "fresh-employer-packet.pdf",
  contentType: "application/pdf",
  bytes: PDF,
  ownerOrgId: ORG_EMP,
  programId: PROGRAM,
  actor: ops,
  now: NOW,
});
if (!fresh.ok) throw new Error("setup failed");
const accessUrl = await vault.createSignedUrl({
  documentId: fresh.document.id,
  recipientView: "employer",
  actor: employer,
  expiresInSeconds: 60,
  now: NOW,
});
if (!accessUrl.ok) throw new Error("setup failed");
const downloaded = await vault.downloadSignedUrl(tokenFrom(accessUrl.url), "2026-06-15T00:00:10.000Z");
ok("Valid signed URL downloads document bytes", downloaded.ok && downloaded.bytes.equals(PDF));
const viewUrl = await vault.createSignedUrl({
  documentId: fresh.document.id,
  recipientView: "employer",
  actor: employer,
  action: "view",
  expiresInSeconds: 60,
  now: NOW,
});
if (!viewUrl.ok) throw new Error("setup failed");
const viewed = await vault.downloadSignedUrl(tokenFrom(viewUrl.url), "2026-06-15T00:00:11.000Z");
ok("Valid signed URL views document bytes", viewed.ok && viewed.bytes.equals(PDF));
const policyUrl = await vault.createSignedUrl({
  documentId: fresh.document.id,
  recipientView: "employer",
  actor: employer,
  expiresInSeconds: 60,
  now: NOW,
});
if (!policyUrl.ok) throw new Error("setup failed");
await store.upsertTenantScope({ id: `ts_${ORG_EMP}`, org_id: ORG_EMP, tenant_id: ORG_EMP, partner_org_id: ORG_EMP, partner_kind: "employer", allowed_program_ids: [PROGRAM], allowed_purposes: [], created_at: NOW });
const policyBlocked = await vault.downloadSignedUrl(tokenFrom(policyUrl.url), "2026-06-15T00:00:12.000Z");
ok("Signed URL redemption revalidates current tenant policy", !policyBlocked.ok && policyBlocked.reason === "purpose_not_in_tenant_scope", policyBlocked.ok ? undefined : policyBlocked.reason);
await store.upsertTenantScope({ id: `ts_${ORG_EMP}`, org_id: ORG_EMP, tenant_id: ORG_EMP, partner_org_id: ORG_EMP, partner_kind: "employer", allowed_program_ids: [PROGRAM], allowed_purposes: ["employer_share"], created_at: NOW });

function sourceFiles(dir: URL): URL[] {
  const files: URL[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, dir);
    if (entry.isDirectory()) files.push(...sourceFiles(url));
    else if (entry.name.endsWith(".ts")) files.push(url);
  }
  return files;
}

const allowedDirectWriteFiles = new Set(["src/documentVault.ts", "src/store.ts", "src/store.postgres.ts"]);
const directDocumentWrites = sourceFiles(new URL("../src/", import.meta.url))
  .map((url) => ({
    rel: fileURLToPath(url).split("/florence-core/")[1] ?? fileURLToPath(url),
    source: readFileSync(url, "utf8"),
  }))
  .filter(({ rel, source }) => !allowedDirectWriteFiles.has(rel) && /insertRestrictedDocument|insertDocumentAccessGrant/.test(source))
  .map(({ rel }) => rel);
ok("Application code stores restricted documents only through DocumentVault", directDocumentWrites.length === 0, directDocumentWrites.join(", "));

const rows = await store.allAuditOrdered();
ok("Document upload creates audit event", rows.some((r) => r.action === "document.upload" && r.entity === "restricted_document"));
ok("Document access creates audit event", rows.some((r) => r.action === "document.download" && r.entity === "restricted_document"));
ok("Document view creates audit event", rows.some((r) => r.action === "document.view" && r.entity === "restricted_document"));
ok("Document share creates audit event", rows.some((r) => r.action === "document.share" && r.entity === "restricted_document"));
ok("Failed document access creates audit event", rows.some((r) => r.action === "document.access_denied" && r.entity === "restricted_document"));
ok("Document deletion creates audit event", rows.some((r) => r.action === "document.delete" && r.entity === "restricted_document"));

console.log(`\n${fail ? "DOCUMENT VAULT FAILED" : "DOCUMENT VAULT PASSED"} - ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
