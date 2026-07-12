// Email one-time-code sign-in for CANDIDATES (C01 full close — see
// docs/security/C01_CANDIDATE_SIGNIN_SCOPE.md). Staff keep Google SSO; external
// nurses get a passwordless 6-digit code so no candidate password ever exists.
//
// Security posture:
// - Enumeration-safe: /auth/otp/request always answers {ok:true}; a code is only
//   actually issued for an active user that HAS a cand_id (candidate accounts).
// - Codes are stored HASHED (scrypt, same helper as passwords), expire in 10
//   minutes, are single-use, and lock after 5 wrong attempts.
// - Rate-limited per email and per IP (token buckets, in-process).
// - Mock-by-default mail: with no POSTMARK_SERVER_TOKEN the code is not sent
//   anywhere; outside production the response carries `dev_code` so local dev
//   and smokes work without a mail provider. In production with no provider,
//   sign-in simply cannot complete — fail closed, never fail open.
import { randomInt } from "node:crypto";
import type { Audit } from "./audit.ts";
import { hashSecret, verifySecret } from "./crypto.ts";
import type { LoginCode, Store, User } from "./store.ts";
import { id, nowIso } from "./util.ts";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

// ── mail seam (Postmark when configured; mock otherwise) ────────────────────
const postmarkToken = process.env.POSTMARK_SERVER_TOKEN ?? "";
const mailFrom = process.env.MAIL_FROM ?? "no-reply@florenceedu.com";
export const mailerConfigured = (): boolean => Boolean(postmarkToken);

async function sendCodeEmail(email: string, code: string): Promise<void> {
  if (!postmarkToken) return; // mock mode — dev_code carries it instead
  const r = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", "X-Postmark-Server-Token": postmarkToken },
    body: JSON.stringify({
      From: mailFrom,
      To: email,
      Subject: "Your Florence sign-in code",
      TextBody: `Your Florence sign-in code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
      MessageStream: "outbound",
    }),
  });
  if (!r.ok) throw new Error(`postmark ${r.status}`);
}

// ── rate limiting (token buckets; in-process, per email + per IP) ────────────
interface Bucket { tokens: number; last: number }
const buckets = new Map<string, Bucket>();
function allow(key: string, capacity: number, refillPerSec: number): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, last: now };
  b.tokens = Math.min(capacity, b.tokens + ((now - b.last) / 1000) * refillPerSec);
  b.last = now;
  if (b.tokens < 1) { buckets.set(key, b); return false; }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}

export interface OtpRequestResult { ok: true; devCode?: string }

/** Issue a login code for a candidate account. ALWAYS resolves {ok:true} so the
 *  endpoint never reveals whether an email exists. */
export async function requestLoginCode(
  store: Store,
  audit: Audit,
  emailRaw: string,
  ip: string,
): Promise<OtpRequestResult> {
  const email = emailRaw.trim().toLowerCase();
  // 3 requests / 10 min per email; 20 / 10 min per IP.
  if (!allow(`e:${email}`, 3, 3 / 600) || !allow(`ip:${ip}`, 20, 20 / 600)) {
    await audit(email || "unknown", "auth.otp_rate_limited", "auth", undefined, { via: "otp" });
    return { ok: true };
  }
  const user = email ? await store.getUserByEmail(email) : undefined;
  // Candidate accounts only: must be active and carry a cand_id link.
  if (!user || user.status !== "active" || !user.cand_id) {
    await audit(email || "unknown", "auth.otp_requested_unknown", "auth", undefined, { via: "otp" });
    return { ok: true };
  }
  // Invalidate any outstanding code, then issue a fresh one.
  const prior = await store.latestLoginCode(email);
  if (prior && !prior.consumed_at) await store.updateLoginCode(prior.id, { consumed_at: nowIso() });
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const row: LoginCode = {
    id: id("otp"),
    email,
    code_hash: hashSecret(code),
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    attempts: 0,
    created_at: nowIso(),
  };
  await store.insertLoginCode(row);
  await audit(email, "auth.otp_requested", "user", user.id, { via: "otp" });
  try {
    await sendCodeEmail(email, code);
  } catch {
    await audit(email, "auth.otp_send_failed", "user", user.id, { via: "otp" });
  }
  // dev echo: mock mail + not production → let local dev / smokes read the code.
  if (!mailerConfigured() && process.env.NODE_ENV !== "production") return { ok: true, devCode: code };
  return { ok: true };
}

/** Verify a login code. Returns the user on success; undefined otherwise.
 *  Burns the code on success; counts and caps wrong attempts. */
export async function verifyLoginCode(
  store: Store,
  audit: Audit,
  emailRaw: string,
  code: string,
): Promise<User | undefined> {
  const email = emailRaw.trim().toLowerCase();
  const row = await store.latestLoginCode(email);
  const fail = async (reason: string) => {
    await audit(email || "unknown", "auth.login_failed", "auth", undefined, { via: "otp", reason });
    return undefined;
  };
  if (!row || row.consumed_at) return fail("no_active_code");
  if (Date.parse(row.expires_at) < Date.now()) return fail("code_expired");
  if (row.attempts >= MAX_ATTEMPTS) return fail("too_many_attempts");
  if (!verifySecret(code, row.code_hash)) {
    await store.updateLoginCode(row.id, { attempts: row.attempts + 1 });
    return fail("invalid_code");
  }
  await store.updateLoginCode(row.id, { consumed_at: nowIso() });
  const user = await store.getUserByEmail(email);
  if (!user || user.status !== "active" || !user.cand_id) return fail("not_a_candidate_account");
  return user;
}
