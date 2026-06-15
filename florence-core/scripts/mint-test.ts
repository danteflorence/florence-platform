// Phase 0 checkpoint (offline): mint tokens for representative roles, verify
// them against Core's own keys, and assert the role→scope derivation matches
// Academy's expectations. Run: `node scripts/mint-test.ts`.

import { config } from "../src/config.ts";
import { verifyJwtRS256 } from "../src/crypto.ts";
import { KeyManager } from "../src/keys.ts";
import { roleScopes } from "../src/roles.ts";
import { MemoryStore, type RoleGrant, type User } from "../src/store.ts";
import { mintUserSession } from "../src/tokens.ts";
import { nowIso, nowSec } from "../src/util.ts";

let failures = 0;
function check(name: string, cond: boolean, extra?: string): void {
  console.log(`${cond ? "✓" : "✗"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!cond) failures++;
}

const store = new MemoryStore();
const keys = new KeyManager(store);
await keys.init();

const mkUser = (id: string, email: string, cand?: string): User => ({
  id,
  email,
  status: "active",
  ...(cand ? { cand_id: cand } : {}),
  created_at: nowIso(),
  updated_at: nowIso(),
});
const grant = (userId: string, role: RoleGrant["role"], org?: string, territory?: string): RoleGrant => ({
  id: `rg_${role}`,
  user_id: userId,
  role,
  ...(org ? { org_id: org } : {}),
  ...(territory ? { territory } : {}),
  granted_at: nowIso(),
});

const verify = (token: string) =>
  verifyJwtRS256(token, (kid) => keys.resolveKey(kid), nowSec(), { iss: config.issuer, aud: config.audience });

// 1) ops → all 24 Academy scopes, role/iss/aud correct, verifies.
{
  const { token, claims } = mintUserSession(keys, mkUser("usr_ops", "ops@florenceeducation.com"), [grant("usr_ops", "ops")]);
  const r = verify(token);
  check("ops token verifies (RS256 via JWKS key)", r.ok);
  check("ops iss/aud correct", r.ok && r.payload.iss === config.issuer && r.payload.aud === config.audience);
  check("ops role scalar = ops", claims.role === "ops");
  check("ops scope = all 24 Academy scopes", claims.scope.split(" ").filter(Boolean).length === 24, `${claims.scope.split(" ").filter(Boolean).length}`);
}

// 2) candidate → exactly the 8 candidate scopes + cand binding.
{
  const expected = roleScopes("candidate");
  const { token, claims } = mintUserSession(keys, mkUser("usr_c", "nurse@example.com", "cand_123"), [grant("usr_c", "candidate")]);
  const r = verify(token);
  check("candidate token verifies", r.ok);
  check("candidate cand binding present", claims.cand === "cand_123");
  check("candidate scope = CANDIDATE_SESSION_SCOPES (8)", claims.scope === expected.join(" "), claims.scope);
  check("candidate has candidates:read", new Set(claims.scope.split(" ")).has("candidates:read"));
  check("candidate lacks clients:manage", !new Set(claims.scope.split(" ")).has("clients:manage"));
}

// 3) employer → org scoping (org_id + tenant_id mirror), employer:read only.
{
  const { claims } = mintUserSession(keys, mkUser("usr_e", "recruiter@kaiser.com"), [grant("usr_e", "employer", "org_kaiser")]);
  check("employer org_id set", claims.org_id === "org_kaiser");
  check("employer tenant_id mirrors org_id (florenceos compat)", claims.tenant_id === "org_kaiser");
  check("employer scope = employer:read", claims.scope === "employer:read");
}

// 4) rep → territory claim, no Academy scope.
{
  const { claims } = mintUserSession(keys, mkUser("usr_r", "rep@florenceeducation.com"), [grant("usr_r", "rep", undefined, "CA,NV")]);
  check("rep territory claim", claims.territory === "CA,NV");
  check("rep has empty scope (pricing-only)", claims.scope === "");
}

// 5) no grants → authenticated but no role/scope.
{
  const { claims } = mintUserSession(keys, mkUser("usr_n", "new@florenceeducation.com"), []);
  check("ungranted user has no role", claims.role === undefined && (claims.roles ?? []).length === 0);
  check("ungranted user has empty scope", claims.scope === "");
}

// 6) tampering is rejected.
{
  const { token } = mintUserSession(keys, mkUser("usr_t", "t@florenceeducation.com"), [grant("usr_t", "ops")]);
  const parts = token.split(".");
  const tampered = `${parts[0]}.${Buffer.from('{"sub":"hacker","role":"super_admin","scope":"clients:manage","iss":"florence-auth","aud":"florence","exp":9999999999,"jti":"x"}').toString("base64url")}.${parts[2]}`;
  check("tampered payload fails verification", !verify(tampered).ok);
}

// 7) JWKS is publishable.
check("JWKS has at least one RS256 key", keys.jwksJson().keys.length >= 1 && keys.jwksJson().keys[0]?.alg === "RS256");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
