// Seed (or reset) a password-based super_admin for LOCAL dev — so you can prove
// the SSO loop without a real Google OAuth client. Uses the same store the dev
// server uses (set CORE_STATE_FILE so both share state).
//
//   CORE_STATE_FILE=data/core-dev.json \
//   CORE_BOOTSTRAP_ADMIN_EMAIL=dev@florenceeducation.com \
//   CORE_BOOTSTRAP_ADMIN_PASSWORD=florence-dev \
//   node scripts/seed-admin.ts

import { makeAudit } from "../src/audit.ts";
import { config } from "../src/config.ts";
import { createStore } from "../src/store.ts";
import { bootstrapFirstAdmin, createUser, grantRole, setPassword } from "../src/users.ts";

const email = (process.env.CORE_BOOTSTRAP_ADMIN_EMAIL ?? process.argv[2] ?? "dev@florenceeducation.com").toLowerCase();
const password = process.env.CORE_BOOTSTRAP_ADMIN_PASSWORD ?? process.argv[3] ?? "florence-dev";

const store = await createStore(config);
const audit = makeAudit(store);

let user = await store.getUserByEmail(email);
if (!user) {
  user = await createUser(store, audit, { email, name: "Local Admin", password, actor: "seed" });
} else {
  await setPassword(store, user.id, password);
}

const promoted = await bootstrapFirstAdmin(store, audit, user);
if (!promoted) {
  const grants = await store.grantsByUser(user.id);
  if (!grants.some((g) => g.role === "super_admin")) {
    await grantRole(store, audit, { userId: user.id, role: "super_admin", grantedBy: "seed" });
  }
}

console.log(`✓ seeded super_admin: ${email} / ${password}`);
console.log(`  store=${config.databaseUrl ? "postgres" : config.stateFile ? `file:${config.stateFile}` : "memory (NOT persisted — set CORE_STATE_FILE)"}`);
process.exit(0);
