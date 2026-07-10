// ───────────────────────────────────────────────────────────────────────────
// Bulk-import the batch-converted draft scenarios into a running Academy API,
// so they show up in the Scenario Studio library (as DRAFTS - an SME still
// approves each before learners see it).
//
// Run (from apps/academy-web), against a running API with an authoring client:
//   API_URL=http://localhost:8088 \
//   CLIENT_ID=demo-crm CLIENT_SECRET=… \
//   node scripts/bulkImportScenarios.ts [draftsDir]
// ───────────────────────────────────────────────────────────────────────────

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const API = (process.env.API_URL ?? "http://localhost:8088").replace(/\/$/, "");
const CLIENT_ID = process.env.CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.CLIENT_SECRET ?? "";
const DIR = process.argv[2] ?? join(process.cwd(), "data", "authored-drafts");

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set CLIENT_ID + CLIENT_SECRET (an authoring client with cohorts:write).");
  process.exit(1);
}

async function token(): Promise<string> {
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: CLIENT_ID, client_secret: CLIENT_SECRET, scope: "cohorts:write" }),
  });
  const j = (await res.json()) as { access_token?: string };
  if (!j.access_token) throw new Error("could not mint a token - check credentials/scope");
  return j.access_token;
}

async function main() {
  const tok = await token();
  const files = readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "MANIFEST.json");
  let ok = 0;
  for (const f of files) {
    const scenario = JSON.parse(readFileSync(join(DIR, f), "utf8"));
    const res = await fetch(`${API}/v1/sim/scenarios`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
      body: JSON.stringify({ scenario }),
    });
    if (res.ok) ok++;
    else console.error(`  ! ${f}: ${res.status}`);
  }
  console.log(`Imported ${ok}/${files.length} draft scenarios into ${API} (all status: draft).`);
}

void main();
