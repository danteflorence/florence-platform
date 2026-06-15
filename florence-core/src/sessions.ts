// Refresh sessions: long-lived, opaque, ROTATING tokens that back the short
// access token (the fl_session cookie). Only the SHA-256 of the token is stored,
// so the DB never holds anything usable. Rotation on every use means a stolen
// refresh token is invalidated the moment the legitimate one is used; logout
// revokes the row, which is what makes "sign out" actually end the session.

import { randomBytes } from "node:crypto";
import { config } from "./config.ts";
import { sha256hex } from "./crypto.ts";
import type { Store } from "./store.ts";
import { id, nowIso } from "./util.ts";

/** Mint + persist a new refresh token for a user. Returns the RAW token (cookie value). */
export async function issueRefresh(store: Store, userId: string): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  const created = new Date();
  const expires = new Date(created.getTime() + config.refreshTtlSec * 1000);
  await store.insertSession({
    id: id("sess"),
    user_id: userId,
    token_hash: sha256hex(raw),
    created_at: created.toISOString(),
    expires_at: expires.toISOString(),
  });
  return raw;
}

/** Validate a refresh token WITHOUT rotating (used by /login silent re-auth). */
export async function peekRefresh(store: Store, raw: string | undefined): Promise<string | null> {
  if (!raw) return null;
  const row = await store.getSessionByHash(sha256hex(raw));
  if (!row || row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return row.user_id;
}

/** Validate + ROTATE: revoke the presented token, issue a fresh one. */
export async function rotateRefresh(
  store: Store,
  raw: string | undefined,
): Promise<{ userId: string; newRaw: string } | null> {
  if (!raw) return null;
  const row = await store.getSessionByHash(sha256hex(raw));
  if (!row || row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  await store.revokeSession(row.id);
  const newRaw = await issueRefresh(store, row.user_id);
  return { userId: row.user_id, newRaw };
}

/** Revoke the session behind a refresh token (logout). */
export async function revokeRefresh(store: Store, raw: string | undefined): Promise<void> {
  if (!raw) return;
  const row = await store.getSessionByHash(sha256hex(raw));
  if (row && !row.revoked_at) await store.revokeSession(row.id);
}

/** Stamp the user's last_login_at (best-effort). */
export async function touchLogin(store: Store, userId: string): Promise<void> {
  await store.updateUser(userId, { last_login_at: nowIso() });
}
