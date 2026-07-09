// Provision the per-app M2M clients that let Academy / ATS / Pathway WRITE to the
// Nurse Passport spine. Idempotent (skips existing). Each app authenticates with
// client_credentials and is scoped to passport:read + passport:write only.
//
//   CORE_STATE_FILE=data/core-dev.json node scripts/seed-app-clients.ts   # file/dev
//   DATABASE_URL=postgres://… node scripts/seed-app-clients.ts            # prod
//
// Secrets come from FLORENCE_{APP}_CLIENT_SECRET. They are never printed.
// NOTE: with a FILE store, run this BEFORE starting Core (the running server
// loads state at boot); with Postgres it can run anytime.

import { config } from "../src/config.ts";
import { createStore } from "../src/store.ts";
import { hashSecret } from "../src/crypto.ts";
import { nowIso } from "../src/util.ts";

const SPINE_SCOPES = ["passport:read", "passport:write", "consent:read", "consent:write", "control-tower:read"];
const APPS: { client_id: string; env: string; scopes?: string[] }[] = [
  { client_id: "florence-academy", env: "FLORENCE_ACADEMY_CLIENT_SECRET" },
  { client_id: "florence-ats", env: "FLORENCE_ATS_CLIENT_SECRET" },
  { client_id: "florence-pathway", env: "FLORENCE_PATHWAY_CLIENT_SECRET" },
  // Reporting clients (read-only, de-identified/k-anon surfaces).
  { client_id: "florence-investor", env: "FLORENCE_INVESTOR_CLIENT_SECRET", scopes: ["investor:read", "control-tower:read"] },
  { client_id: "florence-university-portal", env: "FLORENCE_UNIVERSITY_CLIENT_SECRET", scopes: ["passport:read:university_staff", "university:read"] },
];

const store = await createStore(config);
let created = 0;
let missingSecrets = 0;

for (const a of APPS) {
  const existing = await store.getClient(a.client_id);
  if (existing) {
    console.log(`= ${a.client_id} already exists (scopes: ${existing.allowed_scopes.join(", ")})`);
    continue;
  }
  const secret = process.env[a.env];
  if (!secret) {
    missingSecrets += 1;
    console.error(`✗ missing ${a.env}; provide it from a secrets manager or local shell environment, then rerun.`);
    continue;
  }
  await store.insertClient({
    client_id: a.client_id,
    name: a.client_id,
    secret_hash: hashSecret(secret),
    allowed_scopes: a.scopes ?? SPINE_SCOPES,
    active: true,
    created_at: nowIso(),
  });
  created += 1;
  console.log(`\n✓ created ${a.client_id}`);
  console.log(`    FLORENCE_CORE_CLIENT_ID=${a.client_id}`);
  console.log(`    FLORENCE_CORE_CLIENT_SECRET=[not printed; source ${a.env}]`);
}

console.log(`\n${created} created. store=${config.databaseUrl ? "postgres" : config.stateFile ? `file:${config.stateFile}` : "memory (NOT persisted — set CORE_STATE_FILE or DATABASE_URL)"}`);
process.exit(missingSecrets ? 1 : 0);
