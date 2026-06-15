// Builds the unified token claim contract from a user + their role grants, then
// signs it. The `scope` claim is DERIVED from the highest role so Academy's
// existing scope checks work unchanged; `org_id`/`tenant_id`/`territory`/`cand`
// come from the user + primary grant. A user with NO grants is authenticated but
// carries no role and an empty scope (apps treat this as "no access").

import { config } from "./config.ts";
import type { CoreClaims } from "./crypto.ts";
import type { KeyManager } from "./keys.ts";
import { ROLE_RANK, highestRole, roleScopes, type Role } from "./roles.ts";
import type { RoleGrant, User } from "./store.ts";
import { id, nowSec } from "./util.ts";

export function buildUserClaims(user: User, grants: RoleGrant[]): CoreClaims {
  const roles = grants.map((g) => g.role);
  const now = nowSec();
  const claims: CoreClaims = {
    iss: config.issuer,
    aud: config.audience,
    sub: user.id,
    scope: "",
    iat: now,
    exp: now + config.humanSessionTtlSec,
    jti: id("jti"),
  };
  if (user.email) claims.email = user.email;
  if (user.name) claims.name = user.name;
  if (user.cand_id) claims.cand = user.cand_id;

  if (roles.length > 0) {
    const role: Role = highestRole(roles);
    claims.role = role;
    claims.roles = roles;
    claims.scope = roleScopes(role).join(" ");
    // primary grant = highest-ranked grant; supplies org/territory scoping.
    const primary = grants.slice().sort((a, b) => ROLE_RANK[b.role] - ROLE_RANK[a.role])[0];
    if (primary?.org_id) {
      claims.org_id = primary.org_id;
      claims.tenant_id = primary.org_id;
    }
    if (primary?.territory) claims.territory = primary.territory;
  } else {
    claims.roles = [];
  }
  return claims;
}

export function mintUserSession(
  keys: KeyManager,
  user: User,
  grants: RoleGrant[],
): { token: string; claims: CoreClaims } {
  const claims = buildUserClaims(user, grants);
  return { token: keys.sign(claims), claims };
}
