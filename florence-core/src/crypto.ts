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
  createPrivateKey,
  createPublicKey,
  createSign,
  createVerify,
  generateKeyPairSync,
  type KeyObject,
} from "node:crypto";

export {
  LocalKeyProvider,
  hashSecret,
  keyFromPassphrase,
  localKeyProvider,
  makeFieldCrypto,
  safeEqual,
  sha256hex,
  signWebhook,
  verifySecret,
  verifyWebhook,
  type FieldCrypto,
  type KeyProvider,
  type Keyring,
} from "@florencern/crypto-shared";

// ── base64url helpers ───────────────────────────────────────────────────────
const enc = (buf: Buffer | string): string =>
  Buffer.from(buf).toString("base64url");
const dec = (s: string): Buffer => Buffer.from(s, "base64url");

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
