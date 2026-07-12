// Candidate sign-in: email one-time codes (OTP / magic-code) + candidate account
// provisioning. This is the auth method that lets PATHWAY_REQUIRE_AUTH flip ON
// (the C01 full close): external nurse candidates cannot use staff Google SSO, and
// we deliberately never store candidate passwords.
//
// Security posture:
//   • only the sha256 HASH of a code is stored; the raw code is delivered
//     out-of-band (email) and never logged or audited.
//   • codes are single-use, expire in CODE_TTL_MIN, and lock after MAX_ATTEMPTS
//     wrong guesses (constant-time compare).
//   • requesting a code NEVER reveals whether an account exists (generic ok).
//   • OTP login is CANDIDATE-only: a user holding any staff role must use
//     password/Google (OTP would bypass the Workspace-domain policy).
//   • mock-by-default: with no email transport configured the code goes nowhere;
//     CANDIDATE_OTP_DEV_ECHO=1 (local dev/smokes only) returns it in the response.
import { randomInt } from "node:crypto";
import type { Store, User, LoginCode } from "./store.ts";
import type { Audit } from "./audit.ts";
import { sha256hex, safeEqual } from "./crypto.ts";
import { STAFF_ROLES, type Role } from "./roles.ts";
import { id, nowIso } from "./util.ts";

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const REQUEST_WINDOW_MIN = 15;
const MAX_REQUESTS_PER_WINDOW = 5;

const devEcho = () => process.env["CANDIDATE_OTP_DEV_ECHO"] === "1";

/** Is this user allowed to sign in via OTP? Candidate-role users only, never staff. */
async function otpEligible(store: Store, user: User): Promise<boolean> {
  if (user.status !== "active") return false;
  const grants = await store.grantsByUser(user.id);
  const roles = grants.map((g) => g.role as Role);
  if (roles.some((r) => (STAFF_ROLES as readonly Role[]).includes(r))) return false;
  return roles.includes("candidate");
}

export interface RequestCodeResult {
  ok: boolean;
  rateLimited?: boolean;
  /** Present ONLY when CANDIDATE_OTP_DEV_ECHO=1 (local dev / smokes). */
  devCode?: string;
}

/** Mint + (mock-)deliver a one-time login code. Always generic toward the caller —
 *  an unknown or ineligible email still gets {ok:true} so accounts can't be enumerated. */
export async function requestLoginCode(store: Store, audit: Audit, rawEmail: string): Promise<RequestCodeResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) return { ok: true };

  const windowStart = new Date(Date.now() - REQUEST_WINDOW_MIN * 60_000).toISOString();
  if ((await store.loginCodesSince(email, windowStart)) >= MAX_REQUESTS_PER_WINDOW) {
    await audit(email, "auth.otp_rate_limited", "auth", undefined, {});
    return { ok: false, rateLimited: true };
  }

  const user = await store.getUserByEmail(email);
  if (!user || !(await otpEligible(store, user))) {
    // Generic: no code minted, no existence signal. Audited for security review.
    await audit(email, "auth.otp_requested", "auth", undefined, { minted: false });
    return { ok: true };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const row: LoginCode = {
    id: id("otp"),
    email,
    code_hash: sha256hex(code),
    expires_at: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(),
    attempts: 0,
    created_at: nowIso(),
  };
  await store.insertLoginCode(row);
  await audit(email, "auth.otp_requested", "auth", undefined, { minted: true });
  // Delivery seam — mock-by-default. A live deploy wires a transactional email
  // provider here (operator-provisioned); the code itself is never logged.
  return { ok: true, ...(devEcho() ? { devCode: code } : {}) };
}

export interface VerifyCodeResult {
  ok: boolean;
  user?: User;
  reason?: "invalid" | "expired" | "locked";
}

/** Verify a one-time code: single-use, expiry-checked, attempt-capped, constant-time. */
export async function verifyLoginCode(store: Store, audit: Audit, rawEmail: string, code: string): Promise<VerifyCodeResult> {
  const email = rawEmail.trim().toLowerCase();
  const row = await store.latestLoginCode(email);
  if (!row) return { ok: false, reason: "invalid" };
  if (row.attempts >= MAX_ATTEMPTS) {
    await audit(email, "auth.otp_locked", "auth", undefined, {});
    return { ok: false, reason: "locked" };
  }
  if (row.expires_at < nowIso()) return { ok: false, reason: "expired" };
  if (!safeEqual(sha256hex(String(code ?? "")), row.code_hash)) {
    await store.updateLoginCode(row.id, { attempts: row.attempts + 1 });
    await audit(email, "auth.otp_failed", "auth", undefined, { attempts: row.attempts + 1 });
    return { ok: false, reason: "invalid" };
  }
  await store.updateLoginCode(row.id, { consumed_at: nowIso() });
  const user = await store.getUserByEmail(email);
  if (!user || !(await otpEligible(store, user))) return { ok: false, reason: "invalid" };
  return { ok: true, user };
}

export interface ProvisionInput {
  email: string;
  name?: string;
  /** The app-local candidate id — becomes the token's `cand` claim binding. */
  candId: string;
  actor: string;
}

/** Idempotently provision a Core account for an app candidate: user (by email) +
 *  `cand_id` binding + a candidate role grant. Never touches staff users: an email
 *  that already holds a staff grant is refused (a staff account must not silently
 *  become candidate-bound). Used by app M2M at intake + the back-fill script. */
export async function provisionCandidateUser(
  store: Store,
  audit: Audit,
  inp: ProvisionInput,
): Promise<{ ok: true; userId: string; created: boolean } | { ok: false; error: string }> {
  const email = inp.email.trim().toLowerCase();
  if (!email.includes("@") || !inp.candId) return { ok: false, error: "email + candId required" };

  let user = await store.getUserByEmail(email);
  let created = false;
  if (user) {
    const grants = await store.grantsByUser(user.id);
    if (grants.some((g) => (STAFF_ROLES as readonly Role[]).includes(g.role as Role))) {
      return { ok: false, error: "email belongs to a staff account" };
    }
    if (user.cand_id && user.cand_id !== inp.candId) {
      // A user already bound to a DIFFERENT candidate record must be reconciled by
      // ops, not silently re-bound (that would re-open the C02 BOLA surface).
      return { ok: false, error: "email is bound to a different candidate record" };
    }
    if (!user.cand_id) await store.updateUser(user.id, { cand_id: inp.candId, updated_at: nowIso() });
  } else {
    user = {
      id: id("usr"),
      email,
      ...(inp.name ? { name: inp.name } : {}),
      status: "active",
      cand_id: inp.candId,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    await store.insertUser(user);
    created = true;
  }
  const grants = await store.grantsByUser(user.id);
  if (!grants.some((g) => g.role === "candidate")) {
    await store.insertGrant({ id: id("grant"), user_id: user.id, role: "candidate", granted_at: nowIso() });
  }
  await audit(inp.actor, "candidate.provisioned", "user", user.id, { created, candId: inp.candId });
  return { ok: true, userId: user.id, created };
}
