// User / org / role-grant operations + the first-admin bootstrap (generalized
// from labor-economics-agent/rbac.py:bootstrap_first_admin). Google sign-in
// upserts by google_sub→email; external users authenticate by password.

import type { Audit } from "./audit.ts";
import { hashSecret, verifySecret } from "./crypto.ts";
import type { Role } from "./roles.ts";
import type { Org, RoleGrant, Store, User } from "./store.ts";
import { id, nowIso } from "./util.ts";

export interface Session {
  user: User;
  grants: RoleGrant[];
}

export async function sessionFor(store: Store, userId: string): Promise<Session | undefined> {
  const user = await store.getUserById(userId);
  if (!user) return undefined;
  return { user, grants: await store.grantsByUser(userId) };
}

export async function findOrCreateGoogleUser(
  store: Store,
  audit: Audit,
  p: { sub: string; email: string; name?: string },
): Promise<User> {
  const bySub = await store.getUserByGoogleSub(p.sub);
  if (bySub) return bySub;
  const byEmail = await store.getUserByEmail(p.email);
  if (byEmail) {
    const patch: Partial<User> = { google_sub: p.sub };
    if (p.name && !byEmail.name) patch.name = p.name;
    await store.updateUser(byEmail.id, patch);
    return (await store.getUserById(byEmail.id))!;
  }
  const u: User = {
    id: id("usr"),
    email: p.email.toLowerCase(),
    ...(p.name && { name: p.name }),
    google_sub: p.sub,
    status: "active",
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  await store.insertUser(u);
  await audit(u.email, "user.create", "user", u.id, { via: "google" });
  return u;
}

/** If no super_admin exists yet, promote this user. Idempotent. */
export async function bootstrapFirstAdmin(store: Store, audit: Audit, user: User): Promise<boolean> {
  if (await store.anyGrantWithRole("super_admin")) return false;
  await grantRole(store, audit, { userId: user.id, role: "super_admin", grantedBy: "bootstrap" });
  await audit("bootstrap", "user.bootstrap_admin", "user", user.id, { email: user.email });
  return true;
}

/** Verify an external user's password. Always runs a scrypt to avoid a timing oracle. */
export async function verifyPassword(store: Store, email: string, password: string): Promise<User | undefined> {
  const user = await store.getUserByEmail(email);
  const stored = user?.password_hash ?? "00:00";
  const ok = verifySecret(password, stored);
  if (user && user.password_hash && ok && user.status === "active") return user;
  return undefined;
}

export async function createUser(
  store: Store,
  audit: Audit,
  p: { email: string; name?: string; password?: string; status?: User["status"]; cand_id?: string; actor?: string },
): Promise<User> {
  if (await store.getUserByEmail(p.email)) throw new Error("a user with that email already exists");
  const u: User = {
    id: id("usr"),
    email: p.email.toLowerCase(),
    ...(p.name && { name: p.name }),
    status: p.status ?? "active",
    ...(p.password && { password_hash: hashSecret(p.password) }),
    ...(p.cand_id && { cand_id: p.cand_id }),
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  await store.insertUser(u);
  await audit(p.actor ?? "system", "user.create", "user", u.id, { email: u.email });
  return u;
}

export async function setPassword(store: Store, userId: string, password: string): Promise<void> {
  await store.updateUser(userId, { password_hash: hashSecret(password) });
}

export async function grantRole(
  store: Store,
  audit: Audit,
  p: { userId: string; role: Role; orgId?: string; territory?: string; grantedBy?: string },
): Promise<RoleGrant> {
  const g: RoleGrant = {
    id: id("rg"),
    user_id: p.userId,
    role: p.role,
    ...(p.orgId && { org_id: p.orgId }),
    ...(p.territory && { territory: p.territory }),
    ...(p.grantedBy && { granted_by: p.grantedBy }),
    granted_at: nowIso(),
  };
  await store.insertGrant(g);
  await audit(p.grantedBy ?? "system", "role.grant", "user", p.userId, {
    role: p.role,
    ...(p.orgId && { org_id: p.orgId }),
    ...(p.territory && { territory: p.territory }),
  });
  return g;
}

export async function createOrg(
  store: Store,
  audit: Audit,
  p: { kind: Org["kind"]; name: string; externalRef?: string; actor?: string },
): Promise<Org> {
  const o: Org = {
    id: id("org"),
    kind: p.kind,
    name: p.name,
    ...(p.externalRef && { external_ref: p.externalRef }),
    created_at: nowIso(),
  };
  await store.insertOrg(o);
  await audit(p.actor ?? "system", "org.create", "org", o.id, { kind: o.kind, name: o.name });
  return o;
}

/** True when an email belongs to a staff (auto-eligible) domain. */
export function isStaffEmail(email: string, allowedDomains: string[]): boolean {
  const d = email.split("@")[1]?.toLowerCase() ?? "";
  return allowedDomains.includes(d);
}
