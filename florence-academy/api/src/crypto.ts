// All cryptography in one place: JWT (HS256), client-secret hashing (scrypt),
// and webhook signatures (HMAC-SHA256).
//
// Reference-grade. Production notes:
//   • JWT → switch to RS256/ES256 with KMS-held keys (the `kid` header is
//     already emitted so verifiers can select the right public key).
//   • Secrets/keys live in a KMS/secret manager, never in app config.

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

// ── base64url helpers ───────────────────────────────────────────────────────
const enc = (buf: Buffer | string): string =>
  Buffer.from(buf).toString("base64url");

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// ── JWT (HS256) ─────────────────────────────────────────────────────────────
export interface JwtPayload {
  iss: string;
  aud: string;
  sub: string;
  iat: number;
  exp: number;
  jti: string;
  scope: string;
  /** Subject-binding: when present, the token may only touch this candidate. */
  cand?: string;
}

export function signJwt(payload: JwtPayload, secret: string): string {
  const header = enc(JSON.stringify({ alg: "HS256", typ: "JWT", kid: "dev" }));
  const body = enc(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const sig = createHmac("sha256", secret).update(signingInput).digest("base64url");
  return `${signingInput}.${sig}`;
}

export type JwtResult =
  | { ok: true; payload: JwtPayload }
  | { ok: false; error: string };

export function verifyJwt(token: string, secret: string, nowSec: number): JwtResult {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, error: "malformed token" };
  const [header, body, sig] = parts as [string, string, string];
  const expected = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  if (!safeEqual(sig, expected)) return { ok: false, error: "bad signature" };
  let payload: JwtPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, error: "bad payload" };
  }
  if (typeof payload.exp !== "number" || payload.exp < nowSec)
    return { ok: false, error: "token expired" };
  return { ok: true, payload };
}

// ── client-secret hashing (scrypt) ──────────────────────────────────────────
export function hashSecret(secret: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(secret, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifySecret(secret: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const hash = scryptSync(secret, Buffer.from(saltHex, "hex"), 64);
  return safeEqual(hash.toString("hex"), hashHex);
}

// ── webhook signatures (HMAC-SHA256, replay-protected) ──────────────────────
const MAX_WEBHOOK_AGE_SEC = 300;

/** Returns the `Florence-Signature` header value: `t=<unix>,v1=<hex>`. */
export function signWebhook(secret: string, body: string, tsSec: number): string {
  const v1 = createHmac("sha256", secret).update(`${tsSec}.${body}`).digest("hex");
  return `t=${tsSec},v1=${v1}`;
}

export function verifyWebhook(
  secret: string,
  header: string,
  body: string,
  nowSec: number,
): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((kv) => kv.split("=") as [string, string]),
  );
  const t = Number(parts["t"]);
  const v1 = parts["v1"];
  if (!Number.isFinite(t) || !v1) return false;
  if (Math.abs(nowSec - t) > MAX_WEBHOOK_AGE_SEC) return false; // replay window
  const expected = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  return safeEqual(v1, expected);
}

// ── column-level field encryption (AES-256-GCM) ─────────────────────────────
// Encrypts a single PII/financial field for at-rest storage. The key is a
// 32-byte data key — in production fetched/unwrapped from a KMS, never stored
// beside the ciphertext. Output: base64(iv[12] | tag[16] | ciphertext).
export interface FieldCrypto {
  encrypt(plaintext: string): Promise<string>;
  decrypt(token: string): Promise<string>;
}

export interface Keyring {
  /** Key id used to wrap new ciphertext. */
  activeId: string;
  /** All key-encryption keys available for unwrap, keyed by id (32 bytes each). */
  keys: Record<string, Buffer>;
}

function gcmSeal(key: Buffer, plaintext: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]); // iv | tag | ct
}
function gcmOpen(key: Buffer, blob: Buffer): Buffer {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ct = blob.subarray(28);
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}

/**
 * Wraps/unwraps per-value data keys (DEKs) under a key-encryption key (KEK). The
 * KEK material stays inside the provider — in production that's a KMS, so the
 * app never holds the KEK (see src/kms.ts). Swapping the provider is the only
 * change needed to move field encryption onto a managed KMS. Async because real
 * KMS calls are network calls.
 */
export interface KeyProvider {
  /** Id of the KEK used to wrap new data keys. */
  activeKeyId(): string;
  wrap(keyId: string, dataKey: Buffer): Promise<Buffer>;
  unwrap(keyId: string, wrapped: Buffer): Promise<Buffer>;
}

/** Local KEK provider (dev/test): KEKs are in-process AES-256 keys. */
export class LocalKeyProvider implements KeyProvider {
  private keys: Record<string, Buffer>;
  private active: string;
  constructor(keyring: Keyring) {
    this.keys = keyring.keys;
    this.active = keyring.activeId;
    const k = this.keys[this.active];
    if (!k || k.length !== 32)
      throw new Error("active KEK must be present and 32 bytes (256-bit)");
  }
  activeKeyId(): string {
    return this.active;
  }
  async wrap(keyId: string, dataKey: Buffer): Promise<Buffer> {
    const kek = this.keys[keyId];
    if (!kek) throw new Error(`unknown KEK id: ${keyId}`);
    return gcmSeal(kek, dataKey);
  }
  async unwrap(keyId: string, wrapped: Buffer): Promise<Buffer> {
    const kek = this.keys[keyId];
    if (!kek) throw new Error(`unknown KEK id: ${keyId}`);
    return gcmOpen(kek, wrapped);
  }
}

/**
 * Envelope field encryption over any KeyProvider. A fresh per-value DEK encrypts
 * the plaintext; the active KEK wraps the DEK. Ciphertext carries the KEK id, so
 * KEKs ROTATE cleanly (old values still decrypt with the KEK that wrote them).
 * Format: fe1.<kekId>.<base64(wrapped DEK)>.<base64(iv|tag|ct)>
 */
export function makeFieldCrypto(provider: KeyProvider): FieldCrypto {
  return {
    async encrypt(plaintext: string): Promise<string> {
      const dek = randomBytes(32);
      const keyId = provider.activeKeyId();
      const wrapped = (await provider.wrap(keyId, dek)).toString("base64");
      const data = gcmSeal(dek, Buffer.from(plaintext, "utf8")).toString("base64");
      return `fe1.${keyId}.${wrapped}.${data}`;
    },
    async decrypt(token: string): Promise<string> {
      const [tag, keyId, wrappedB64, dataB64] = token.split(".");
      if (tag !== "fe1" || !keyId || !wrappedB64 || !dataB64)
        throw new Error("malformed field ciphertext");
      const dek = await provider.unwrap(keyId, Buffer.from(wrappedB64, "base64"));
      return gcmOpen(dek, Buffer.from(dataB64, "base64")).toString("utf8");
    },
  };
}

/** Convenience: a local single-key provider (id "k0"). */
export function localKeyProvider(key: Buffer): KeyProvider {
  return new LocalKeyProvider({ activeId: "k0", keys: { k0: key } });
}

/** Derive a 32-byte key from a passphrase (dev). Production: use a KMS data key. */
export function keyFromPassphrase(passphrase: string): Buffer {
  return scryptSync(passphrase, "florence-field-enc", 32);
}
