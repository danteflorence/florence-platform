// Proves the VENDORED sdk/coreAuth.ts verifies a real Core token by fetching the
// running server's JWKS over HTTP (the path every app uses). Usage:
//   node scripts/verify-sdk.ts <token>

import { configureCoreAuth, verifyCoreToken } from "../sdk/coreAuth.ts";

configureCoreAuth({
  issuerUrl: process.env.CORE_ISSUER_URL ?? "http://127.0.0.1:8080",
  issuer: "florence-auth",
  audience: "florence",
});

const token = process.argv[2];
if (!token) {
  console.error("usage: node scripts/verify-sdk.ts <token>");
  process.exit(1);
}

const p = await verifyCoreToken(token);
if (!p) {
  console.log("✗ SDK could not verify the token");
  process.exit(1);
}
console.log("✓ SDK verified a real Core token via live JWKS fetch");
console.log(`  userId=${p.userId} email=${p.email} role=${p.role} roles=${JSON.stringify(p.roles)} isService=${p.isService}`);
console.log(`  scopes(${p.scopes.size}): ${[...p.scopes].slice(0, 6).join(", ")}${p.scopes.size > 6 ? " …" : ""}`);
process.exit(0);
