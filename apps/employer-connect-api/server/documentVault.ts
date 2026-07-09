import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto'
import { extname } from 'node:path'
import type { Actor } from '../shared/types'
import type {
  DocumentAccessGrantRecord,
  RestrictedDocumentGrantAction,
  RestrictedDocumentRecord,
  RestrictedDocumentRecipientView,
  RestrictedDocumentType,
  Store,
} from './store/types'

const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024
const SIGNED_URL_MAX_TTL_SECONDS = 15 * 60
const SIGNED_URL_DEFAULT_TTL_SECONDS = 10 * 60

export interface DocumentVaultActor {
  id: string
  role: 'ops' | 'employer' | 'system'
  employerId?: string
}

export interface DocumentKeyProvider {
  keyId: string
  getKey(): Buffer
}

export interface DocumentEnvelopeCrypto {
  keyId: string
  encrypt(plaintext: Buffer): string
  decrypt(blob: string): Buffer
}

export interface MalwareScanner {
  scan(input: { filename: string; contentType: string; bytes: Buffer }): Promise<{ status: 'clean' } | { status: 'blocked'; reason: string }>
}

export interface DocumentRetentionPolicy {
  retentionUntil(input: { documentType: RestrictedDocumentType; createdAt: string }): string | undefined
  onDelete(document: RestrictedDocumentRecord): Promise<void>
}

export interface UploadRestrictedDocumentInput {
  documentType: RestrictedDocumentType
  candidateId: string
  employerId: string
  packetId?: string
  applicationId?: string
  filename: string
  contentType: string
  bytes: Buffer
  actor: DocumentVaultActor
}

export interface CreateSignedUrlInput {
  documentId: string
  actor: DocumentVaultActor
  recipientView: RestrictedDocumentRecipientView
  recipientOrgId?: string
  purpose: string
  action?: RestrictedDocumentGrantAction
  ttlSeconds?: number
}

export interface SignedDocumentUrl {
  documentId: string
  url: string
  expiresAt: string
}

export interface RedeemedDocument {
  document: RestrictedDocumentRecord
  bytes: Buffer
  filename: string
  contentType: string
}

export interface DownloadSignedUrlOptions {
  beforeDecrypt?: (input: {
    document: RestrictedDocumentRecord
    grant: DocumentAccessGrantRecord
  }) => Promise<void> | void
}

export class DocumentVaultError extends Error {
  constructor(public code: string, message: string, public status = 403) {
    super(message)
  }
}

class EnvDocumentKeyProvider implements DocumentKeyProvider {
  readonly keyId = 'ats-document-vault-env-v1'
  private key: Buffer

  constructor() {
    const raw = process.env.ATS_DOCUMENT_VAULT_KEY || process.env.ATS_CONNECT_VAULT_KEY || 'dev-insecure-document-vault-key-change-me'
    this.key = scryptSync(raw, 'florence-ats-document-vault.v1', 32)
  }

  getKey(): Buffer {
    return this.key
  }
}

export function createDocumentEnvelopeCrypto(provider: DocumentKeyProvider = new EnvDocumentKeyProvider()): DocumentEnvelopeCrypto {
  return {
    keyId: provider.keyId,
    encrypt(plaintext: Buffer): string {
      const iv = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', provider.getKey(), iv)
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
      const tag = cipher.getAuthTag()
      return `${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`
    },
    decrypt(blob: string): Buffer {
      const [ivB, tagB, dataB] = blob.split('.')
      if (!ivB || !tagB || !dataB) throw new DocumentVaultError('malformed_encrypted_blob', 'Document blob is malformed.', 500)
      const decipher = createDecipheriv('aes-256-gcm', provider.getKey(), Buffer.from(ivB, 'base64url'))
      decipher.setAuthTag(Buffer.from(tagB, 'base64url'))
      return Buffer.concat([decipher.update(Buffer.from(dataB, 'base64url')), decipher.final()])
    },
  }
}

export class AllowingMalwareScanner implements MalwareScanner {
  async scan(): Promise<{ status: 'clean' }> {
    return { status: 'clean' }
  }
}

export class DefaultDocumentRetentionPolicy implements DocumentRetentionPolicy {
  retentionUntil(): string | undefined {
    return undefined
  }

  async onDelete(): Promise<void> {
    return undefined
  }
}

export class DocumentVault {
  constructor(private deps: {
    store: Store
    publicBaseUrl: string
    crypto?: DocumentEnvelopeCrypto
    scanner?: MalwareScanner
    retentionPolicy?: DocumentRetentionPolicy
    now?: () => Date
    newId?: () => string
  }) {}

  async upload(input: UploadRestrictedDocumentInput): Promise<RestrictedDocumentRecord> {
    try {
      this.requireOpsOrSystem(input.actor)
      this.validateUpload(input)
      const scan = await this.scanner.scan({ filename: input.filename, contentType: input.contentType, bytes: input.bytes })
      if (scan.status !== 'clean') {
        throw new DocumentVaultError('malware_blocked', 'Document failed safety scanning.', 400)
      }
    } catch (err) {
      await this.audit(actorFor(input.actor), 'document.upload_failed', 'restricted_document', 'uncreated', `reason=${errorCode(err)};type=${input.documentType}`)
      throw err
    }
    const createdAt = this.nowIso()
    const documentId = this.newId()
    const document: RestrictedDocumentRecord = {
      id: documentId,
      documentType: input.documentType,
      candidateId: input.candidateId,
      employerId: input.employerId,
      packetId: input.packetId,
      applicationId: input.applicationId,
      filename: input.filename,
      contentType: input.contentType,
      sizeBytes: input.bytes.length,
      sha256: sha256(input.bytes),
      encryptedBlob: this.crypto.encrypt(input.bytes),
      storageKey: `document-vault/${documentId}`,
      keyId: this.crypto.keyId,
      status: 'active',
      malwareScanStatus: 'clean',
      retentionUntil: this.retentionPolicy.retentionUntil({ documentType: input.documentType, createdAt }),
      createdAt,
    }
    await this.deps.store.restrictedDocuments.insert(document)
    await this.audit('ops', 'document.upload', 'restricted_document', document.id, `type=${document.documentType}`)
    return document
  }

  async createSignedUrl(input: CreateSignedUrlInput): Promise<SignedDocumentUrl> {
    const document = await this.deps.store.restrictedDocuments.get(input.documentId)
    if (!document) throw new DocumentVaultError('document_not_found', 'Document not found.', 404)
    try {
      await this.authorize(document, input)
    } catch (err) {
      await this.audit(actorFor(input.actor), 'document.access_denied', 'restricted_document', document.id, `reason=${errorCode(err)};view=${input.recipientView}`)
      throw err
    }
    const ttl = Math.max(1, Math.min(input.ttlSeconds ?? SIGNED_URL_DEFAULT_TTL_SECONDS, SIGNED_URL_MAX_TTL_SECONDS))
    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(this.now().getTime() + ttl * 1000).toISOString()
    const grant: DocumentAccessGrantRecord = {
      id: this.newId(),
      tokenHash: sha256(token),
      documentId: document.id,
      candidateId: document.candidateId,
      employerId: document.employerId,
      recipientView: input.recipientView,
      recipientOrgId: input.recipientOrgId,
      actorId: input.actor.id,
      actorRole: input.actor.role,
      action: input.action ?? 'download',
      purpose: input.purpose,
      expiresAt,
      createdAt: this.nowIso(),
    }
    await this.deps.store.documentAccessGrants.insert(grant)
    await this.audit(actorFor(input.actor), 'document.signed_url.created', 'restricted_document', document.id, `view=${input.recipientView};purpose=${input.purpose}`)
    await this.audit(actorFor(input.actor), 'document.share', 'restricted_document', document.id, `view=${input.recipientView};purpose=${input.purpose}`)
    return { documentId: document.id, expiresAt, url: `${trimSlash(this.deps.publicBaseUrl)}/api/p/${token}/resume.pdf` }
  }

  async downloadSignedUrl(token: string, options: DownloadSignedUrlOptions = {}): Promise<RedeemedDocument> {
    const grant = await this.deps.store.documentAccessGrants.byTokenHash(sha256(token))
    if (!grant) {
      await this.audit('system', 'document.access_denied', 'restricted_document', 'unknown', 'reason=grant_not_found')
      throw new DocumentVaultError('grant_not_found', 'Signed URL is invalid or expired.', 404)
    }
    const document = await this.deps.store.restrictedDocuments.get(grant.documentId)
    if (!document) {
      await this.audit('system', 'document.access_denied', 'restricted_document', grant.documentId, 'reason=document_not_found')
      throw new DocumentVaultError('document_not_found', 'Document not found.', 404)
    }
    if (grant.revokedAt) {
      await this.audit('system', 'document.access_denied', 'restricted_document', document.id, 'reason=grant_revoked')
      throw new DocumentVaultError('grant_revoked', 'Signed URL has been revoked.', 403)
    }
    if (new Date(grant.expiresAt).getTime() <= this.now().getTime()) {
      await this.audit('system', 'document.access_denied', 'restricted_document', document.id, 'reason=grant_expired')
      throw new DocumentVaultError('grant_expired', 'Signed URL has expired.', 403)
    }
    if (document.status !== 'active') {
      await this.audit('system', 'document.access_denied', 'restricted_document', document.id, `reason=document_${document.status}`)
      throw new DocumentVaultError(`document_${document.status}`, 'Document is not available.', 403)
    }
    try {
      await this.authorizeGrant(document, grant)
      await options.beforeDecrypt?.({ document, grant })
    } catch (err) {
      await this.audit('system', 'document.access_denied', 'restricted_document', document.id, `reason=${errorCode(err)};view=${grant.recipientView}`)
      throw err
    }
    grant.usedAt = this.nowIso()
    await this.deps.store.documentAccessGrants.update(grant)
    await this.audit('system', grant.action === 'view' ? 'document.view' : 'document.download', 'restricted_document', document.id, `view=${grant.recipientView};purpose=${grant.purpose}`)
    return {
      document,
      bytes: this.crypto.decrypt(document.encryptedBlob),
      filename: document.filename,
      contentType: document.contentType,
    }
  }

  async revokeDocument(documentId: string, actor: DocumentVaultActor): Promise<void> {
    this.requireOpsOrSystem(actor)
    const document = await this.deps.store.restrictedDocuments.get(documentId)
    if (!document) throw new DocumentVaultError('document_not_found', 'Document not found.', 404)
    document.status = 'revoked'
    document.revokedAt = this.nowIso()
    await this.deps.store.restrictedDocuments.update(document)
    const grants = await this.deps.store.documentAccessGrants.byDocument(document.id)
    for (const grant of grants) {
      if (!grant.revokedAt) {
        grant.revokedAt = document.revokedAt
        await this.deps.store.documentAccessGrants.update(grant)
      }
    }
    await this.retentionPolicy.onDelete(document)
    await this.audit(actorFor(actor), 'document.delete', 'restricted_document', document.id, 'status=revoked')
  }

  private get crypto(): DocumentEnvelopeCrypto {
    return this.deps.crypto ?? createDocumentEnvelopeCrypto()
  }

  private get scanner(): MalwareScanner {
    return this.deps.scanner ?? new AllowingMalwareScanner()
  }

  private get retentionPolicy(): DocumentRetentionPolicy {
    return this.deps.retentionPolicy ?? new DefaultDocumentRetentionPolicy()
  }

  private now(): Date {
    return this.deps.now?.() ?? new Date()
  }

  private nowIso(): string {
    return this.now().toISOString()
  }

  private newId(): string {
    return this.deps.newId?.() ?? randomBytes(16).toString('hex')
  }

  private validateUpload(input: UploadRestrictedDocumentInput): void {
    if (!['employer_packet', 'ats_vms_submission_packet'].includes(input.documentType)) {
      throw new DocumentVaultError('unsupported_document_type', 'Document type is not supported.', 400)
    }
    if (input.contentType !== 'application/pdf') {
      throw new DocumentVaultError('unsupported_content_type', 'Only PDF packet documents are supported.', 400)
    }
    if (extname(input.filename).toLowerCase() !== '.pdf') {
      throw new DocumentVaultError('unsupported_extension', 'Only .pdf packet documents are supported.', 400)
    }
    if (input.bytes.length < 5 || input.bytes.length > MAX_DOCUMENT_BYTES) {
      throw new DocumentVaultError('invalid_size', 'Document size is outside allowed limits.', 400)
    }
    if (input.bytes.subarray(0, 5).toString('utf8') !== '%PDF-') {
      throw new DocumentVaultError('invalid_magic', 'Document content does not match PDF format.', 400)
    }
  }

  private async authorize(document: RestrictedDocumentRecord, input: CreateSignedUrlInput): Promise<void> {
    if (document.status !== 'active') throw new DocumentVaultError(`document_${document.status}`, 'Document is not available.', 403)
    if (input.recipientView === 'internal_ops') {
      this.requireOpsOrSystem(input.actor)
      return
    }
    if (!['employer', 'amn_vms_partner'].includes(input.recipientView)) {
      throw new DocumentVaultError('recipient_view_denied', 'Recipient view is not allowed for this document.', 403)
    }
    if (!['employer_packet', 'ats_vms_submission_packet'].includes(document.documentType)) {
      throw new DocumentVaultError('document_type_denied', 'Document type is not allowed for this recipient.', 403)
    }
    if (!input.recipientOrgId || input.recipientOrgId !== document.employerId) {
      throw new DocumentVaultError('wrong_tenant', 'Recipient tenant is not authorized for this document.', 403)
    }
    if (input.actor.role === 'employer' && input.actor.employerId !== document.employerId) {
      throw new DocumentVaultError('wrong_tenant', 'Actor tenant is not authorized for this document.', 403)
    }
    if (!['ops', 'system', 'employer'].includes(input.actor.role)) {
      throw new DocumentVaultError('actor_denied', 'Actor is not authorized for this document.', 403)
    }
    await this.assertExternalSharePolicy({
      document,
      recipientView: input.recipientView,
      recipientOrgId: input.recipientOrgId,
      purpose: input.purpose,
    })
  }

  private async authorizeGrant(document: RestrictedDocumentRecord, grant: DocumentAccessGrantRecord): Promise<void> {
    if (grant.documentId !== document.id || grant.candidateId !== document.candidateId || grant.employerId !== document.employerId) {
      throw new DocumentVaultError('grant_document_mismatch', 'Signed URL grant does not match this document.', 403)
    }
    if (grant.recipientView === 'internal_ops') {
      if (!['ops', 'system'].includes(grant.actorRole)) {
        throw new DocumentVaultError('actor_denied', 'Signed URL grant was not issued by authorized staff.', 403)
      }
      return
    }
    if (!['ops', 'system', 'employer'].includes(grant.actorRole)) {
      throw new DocumentVaultError('actor_denied', 'Signed URL grant was not issued by an authorized actor.', 403)
    }
    await this.assertExternalSharePolicy({
      document,
      recipientView: grant.recipientView,
      recipientOrgId: grant.recipientOrgId,
      purpose: grant.purpose,
    })
  }

  private async assertExternalSharePolicy(input: {
    document: RestrictedDocumentRecord
    recipientView: RestrictedDocumentRecipientView
    recipientOrgId?: string
    purpose: string
  }): Promise<void> {
    const { document, recipientView, recipientOrgId } = input
    if (!['employer', 'amn_vms_partner'].includes(recipientView)) {
      throw new DocumentVaultError('recipient_view_denied', 'Recipient view is not allowed for this document.', 403)
    }
    if (document.documentType === 'employer_packet' && recipientView !== 'employer') {
      throw new DocumentVaultError('document_type_denied', 'Document type is not allowed for this recipient.', 403)
    }
    if (document.documentType === 'ats_vms_submission_packet' && recipientView !== 'amn_vms_partner') {
      throw new DocumentVaultError('document_type_denied', 'Document type is not allowed for this recipient.', 403)
    }
    if (!recipientOrgId || recipientOrgId !== document.employerId) {
      throw new DocumentVaultError('wrong_tenant', 'Recipient tenant is not authorized for this document.', 403)
    }
    const employer = await this.deps.store.employers.get(document.employerId)
    if (!employer) throw new DocumentVaultError('tenant_not_found', 'Document tenant is not available.', 404)
    if (recipientView === 'amn_vms_partner' && employer.sourceChannel !== 'amn') {
      throw new DocumentVaultError('recipient_view_denied', 'Recipient view is not authorized for this employer.', 403)
    }
    if (input.purpose !== 'application_packet_release') {
      throw new DocumentVaultError('purpose_denied', 'Signed URL purpose is not authorized for packet release.', 403)
    }
    const consent = await this.deps.store.consents.live(document.candidateId, document.employerId)
    const allowed = new Set(consent?.allowedData ?? [])
    if (!consent || !['resume', 'credential_summary', 'readiness_summary'].every((field) => allowed.has(field))) {
      throw new DocumentVaultError('missing_consent', 'Live employer-share consent is required before document release.', 403)
    }
  }

  private requireOpsOrSystem(actor: DocumentVaultActor): void {
    if (!['ops', 'system'].includes(actor.role)) {
      throw new DocumentVaultError('staff_required', 'Staff authorization is required.', 403)
    }
  }

  private async audit(actor: Actor, action: string, entity: string, entityId: string, detail?: string): Promise<void> {
    await this.deps.store.audit.log({ id: this.newId(), at: this.nowIso(), actor, action, entity, entityId, detail })
  }
}

export function createAtsDocumentVault(deps: {
  store: Store
  publicBaseUrl: string
  crypto?: DocumentEnvelopeCrypto
  scanner?: MalwareScanner
  retentionPolicy?: DocumentRetentionPolicy
  now?: () => Date
  newId?: () => string
}): DocumentVault {
  return new DocumentVault(deps)
}

function sha256(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex')
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function actorFor(actor: DocumentVaultActor): Actor {
  if (actor.role === 'ops') return 'ops'
  if (actor.role === 'employer') return 'connector'
  return 'system'
}

function errorCode(err: unknown): string {
  return err instanceof DocumentVaultError ? err.code : 'unknown'
}
