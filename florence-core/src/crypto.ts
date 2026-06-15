// All cryptography in one place: RS256 JWT (sign + local verify), client-secret
// and password hashing (scrypt), webhook signatures (HMAC-SHA256), and
// column-level field encryption (AES-256-GCM envelope).
//
// This file is adapted from florence-academy/api/src/crypto.ts. The scrypt,
// webhook, and field-encryption sections are carried over verbatim (the proven
// engine the user chose to reuse). The JWT section is UPGRADED from Academy's
// HS256 to RS256 + JWKS: Core is the only minter, every other service verifies
// with the public key, so a leak anywhere downstream can never forge a token.

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  createSign,
  createVerify,
  generateKeyPairSync,
  randomBytes,
  scryptSync,
  timingSafeEqual,
  type KeyObject,
} from "node:crypto";

// ── base64url helpers ───────────────────────────────────────────────────────
const enc = (buf: Buffer | string): string =>
  Buffer.from(buf).toString("base64url");
const dec = (s: string): Buffer => Buffer.from(s, "base64url");

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// ── JWT claim contract (RS256) ──────────────────────────────────────────────
// Aligned with extracted/florenceos/docs/JWT_VERIFICATION.md AND with what each
// existing app already reads: `scope` (Academy), scalar `role` (ATS), `roles[]`
// (florenceos), `cand` (Academy/Pathway candidate binding), `org_id`+`tenant_id`.
export interface CoreClaims {
  iss: string;
  aud: string;
  sub: string;
  email?: string;
  name?: string;
  /** Highest-privilege role (scalar) — ATS and Streamlit read this. */
  role?: string;
  /** All granted roles — florenceos reads this; future multi-role. */
  roles?: string[];
  /** Org scope for employer/university users. */
  org_id?: string;
  /** Mirror of org_id for florenceos compatibility. */
  tenant_id?: string;
  /** Candidate binding: when present the token may only touch this candidate. */
  cand?: string;
  /** Space-delimited scopes — DERIVED from role so Academy's checks work unchanged. */
  scope: string;
  /** Optional rep territory (Streamlit). */
  territory?: string;
  iat: number;
  exp: number;
  jti: string;
  /** Marks a machine (client_credentials) token vs a human session. */
  m2m?: boolean;
}

export interface PublicJwk {
  kty: string;
  n: string;
  e: string;
  kid: string;
  alg: "RS256";
  use: "sig";
}

/** Generate an RSA-2048 signing key. Returns the PKCS8 private PEM + the public JWK. */
export function generateRsaKeyPair(kid: string): { privatePem: string; publicJwk: PublicJwk } {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const jwk = publicKey.export({ format: "jwk" }) as { kty: string; n: string; e: string };
  return {
    privatePem,
    publicJwk: { kty: jwk.kty, n: jwk.n, e: jwk.e, kid, alg: "RS256", use: "sig" },
  };
}

/** Build a verify-only KeyObject from a public JWK. */
export function keyFromJwk(jwk: PublicJwk): KeyObject {
  return createPublicKey({ key: jwk as any, format: "jwk" });
}

export function signJwtRS256(payload: CoreClaims, privatePem: string, kid: string): string {
  const header = enc(JSON.stringify({ alg: "RS256", typ: "JWT", kid }));
  const body = enc(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const sig = createSign("RSA-SHA256")
    .update(signingInput)
    .end()
    .sign(createPrivateKey(privatePem))
    .toString("base64url");
  return `${signingInput}.${sig}`;
}

export type JwtResult =
  | { ok: true; payload: CoreClaims }
  | { ok: false; error: string };

/**
 * Verify an RS256 token locally (Core's own /me + middleware). `resolveKey` maps
 * a `kid` to a public KeyObject (Core's active + retiring keys). Other services
 * use the JWKS-fetching verifier in sdk/coreAuth.ts instead.
 */
export function verifyJwtRS256(
  token: string,
  resolveKey: (kid: string) => KeyObject | undefined,
  nowSec: number,
  expect: { iss: string; aud: string | string[]; leewaySec?: number },
): JwtResult {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, error: "malformed token" };
  const [h, b, sig] = parts as [string, string, string];
  let header: { kid?: string; alg?: string };
  try {
    header = JSON.parse(dec(h).toString("utf8"));
  } catch {
    return { ok: false, error: "bad header" };
  }
  if (header.alg !== "RS256") return { ok: false, error: "unexpected alg" };
  if (!header.kid) return { ok: false, error: "missing kid" };
  const key = resolveKey(header.kid);
  if (!key) return { ok: false, error: "unknown kid" };
  const ok = createVerify("RSA-SHA256").update(`${h}.${b}`).end().verify(key, sig, "base64url");
  if (!ok) return { ok: false, error: "bad signature" };
  let payload: CoreClaims;
  try {
    payload = JSON.parse(dec(b).toString("utf8"));
  } catch {
    return { ok: false, error: "bad payload" };
  }
  const leeway = expect.leewaySec ?? 60;
  if (typeof payload.exp !== "number" || payload.exp + leeway < nowSec)
    return { ok: false, error: "token expired" };
  if (payload.iss !== expect.iss) return { ok: false, error: "bad issuer" };
  const auds = Array.isArray(expect.aud) ? expect.aud : [expect.aud];
  if (!auds.includes(payload.aud)) return { ok: false, error: "bad audience" };
  return { ok: true, payload };
}

// ── fast hash for high-entropy opaque tokens (refresh tokens) ───────────────
// Refresh tokens are 256-bit random, so a plain SHA-256 (not scrypt) is the
// correct, fast choice for the at-rest lookup hash.
export function sha256hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

// ── client-secret + password hashing (scrypt) ───────────────────────────────
// (carried over verbatim from florence-academy/api/src/crypto.ts)
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

export function signWebhook(secret: string, body: string, tsSec: number): string {
  const v1 = createHmac("sha256", secret).update(`${tsSec}.${body}`).digest("hex");
  return `t=${tsSec},v1=${v1}`;
}

export function verifyWebhook(secret: string, header: string, body: string, nowSec: number): boolean {
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = Number(parts["t"]);
  const v1 = parts["v1"];
  if (!Number.isFinite(t) || !v1) return false;
  if (Math.abs(nowSec - t) > MAX_WEBHOOK_AGE_SEC) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  return safeEqual(v1, expected);
}

// ── column-level field encryption (AES-256-GCM envelope) ────────────────────
// (carried over verbatim from florence-academy/api/src/crypto.ts) — Core uses
// this to encrypt RSA signing private keys at rest in the store.
export interface FieldCrypto {
  encrypt(plaintext: string): Promise<string>;
  decrypt(token: string): Promise<string>;
}

export interface Keyring {
  activeId: string;
  keys: Record<string, Buffer>;
}

function gcmSeal(key: Buffer, plaintext: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]);
}
function gcmOpen(key: Buffer, blob: Buffer): Buffer {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ct = blob.subarray(28);
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}

export interface KeyProvider {
  activeKeyId(): string;
  wrap(keyId: string, dataKey: Buffer): Promise<Buffer>;
  unwrap(keyId: string, wrapped: Buffer): Promise<Buffer>;
}

export class LocalKeyProvider implements KeyProvider {
  private keys: Record<string, Buffer>;
  private active: string;
  constructor(keyring: Keyring) {
    this.keys = keyring.keys;
    this.active = keyring.activeId;
    const k = this.keys[this.active];
    if (!k || k.length !== 32) throw new Error("active KEK must be present and 32 bytes (256-bit)");
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

export function localKeyProvider(key: Buffer): KeyProvider {
  return new LocalKeyProvider({ activeId: "k0", keys: { k0: key } });
}

export function keyFromPassphrase(passphrase: string): Buffer {
  return scryptSync(passphrase, "florence-field-enc", 32);
}
