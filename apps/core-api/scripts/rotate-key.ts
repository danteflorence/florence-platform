// Rotate Core's RS256 signing key. Generates a new active key and marks the old
// one `retiring` (still in JWKS so live tokens keep verifying). Run against the
// SAME store/Postgres + FIELD_ENC_PASSPHRASE the server uses.
//
//   node scripts/rotate-key.ts
//
// After your verifier cache TTL (~1h) elapses, drop the old key from JWKS:
//   UPDATE signing_keys SET status='revoked' WHERE kid='<retired-kid>';

import { config } from "../src/config.ts";
import { KeyManager } from "../src/keys.ts";
import { createStore } from "../src/store.ts";

const store = await createStore(config);
const keys = new KeyManager(store);
await keys.init();
const r = await keys.rotate();

console.log(`✓ rotated signing key — new active: ${r.newKid}${r.retired ? `, retiring: ${r.retired}` : ""}`);
console.log("  Both keys are now published at /.well-known/jwks.json.");
if (r.retired) {
  console.log(`  After ~1h (verifier JWKS cache TTL), finalize with:`);
  console.log(`    UPDATE signing_keys SET status='revoked' WHERE kid='${r.retired}';`);
}
process.exit(0);
