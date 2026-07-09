// ============================================================================
// Credential vault — encrypt ATS credentials (OAuth account tokens, API keys)
// at rest. AES-256-GCM via node:crypto (no deps). The key is derived from
// ATS_CONNECT_VAULT_KEY; set a strong value in prod. Secrets are stored only as
// the opaque blob below, never in an entity's json and never returned to clients.
// Blob format: base64url(iv).base64url(authTag).base64url(ciphertext)
// ============================================================================
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

const RAW_KEY = process.env.ATS_CONNECT_VAULT_KEY || 'dev-insecure-vault-key-change-me'
if (!process.env.ATS_CONNECT_VAULT_KEY) {
  console.warn('[ats-connect] ATS_CONNECT_VAULT_KEY not set — using an insecure dev key. Set it in any real environment.')
}
// 32-byte key for AES-256, derived deterministically from the configured secret.
const KEY = scryptSync(RAW_KEY, 'florence-ats-vault.v1', 32)

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', KEY, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`
}

export function decryptSecret(blob: string): string {
  const [ivB, tagB, dataB] = blob.split('.')
  if (!ivB || !tagB || !dataB) throw new Error('vault: malformed secret blob')
  const decipher = createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivB, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagB, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(dataB, 'base64url')), decipher.final()]).toString('utf8')
}
