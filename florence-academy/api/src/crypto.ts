// All cryptography in one place: JWT (HS256), client-secret hashing (scrypt),
// and webhook signatures (HMAC-SHA256).
//
// Reference-grade. Production notes:
//   • JWT → switch to RS256/ES256 with KMS-held keys (the `kid` header is
//     already emitted so verifiers can select the right public key).
//   • Secrets/keys live in a KMS/secret manager, never in app config.

import { createHmac } from "node:crypto";
import { safeEqual } from "@florencern/crypto-shared";

export {
  LocalKeyProvider,
  hashSecret,
  keyFromPassphrase,
  localKeyProvider,
  makeFieldCrypto,
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
