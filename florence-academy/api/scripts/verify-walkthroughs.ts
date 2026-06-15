// Build invariant: every walkthrough/coaching audio item must map to an APPROVED
// walkthrough — the machine-checkable form of "no unreviewed clinical reasoning is
// narrated to nurses." Reads the generated audio-content.json + the store.
//
//   node scripts/verify-walkthroughs.ts                 # MemoryStore (CI: trivially passes — no walkthrough audio without a DB)
//   DATABASE_URL=postgres://… node scripts/verify-walkthroughs.ts   # real check

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MemoryStore } from "../src/store.ts";
import type { Store } from "../src/store.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(HERE, "..", "data", "audio-content.json");

interface Item { key: string; kind: string; refId: string }

async function getStore(): Promise<Store> {
  if (process.env["DATABASE_URL"]) {
    const { PostgresStore, createPgClient } = await import("../src/store.postgres.ts");
    const { makeFieldCrypto, localKeyProvider, keyFromPassphrase } = await import("../src/crypto.ts");
    const { config } = await import("../src/config.ts");
    const sql = await createPgClient(process.env["DATABASE_URL"]);
    return new PostgresStore(sql, makeFieldCrypto(localKeyProvider(keyFromPassphrase(config.fieldEncPassphrase))));
  }
  return new MemoryStore();
}

const items: Item[] = existsSync(CONTENT) ? JSON.parse(readFileSync(CONTENT, "utf8")) : [];
const audioWalk = items.filter((i) => i.kind === "walkthrough" || i.kind === "coaching");
const store = await getStore();

let broken = 0;
for (const it of audioWalk) {
  const qid = it.refId.split("#")[0]!; // coaching refId is "<qid>#<optionIndex>"
  const w = await store.walkthroughs.get(qid);
  if (!w || w.status !== "approved") {
    broken += 1;
    console.error(`✗ ${it.kind} audio ${it.key} → walkthrough ${qid} is ${w ? w.status : "MISSING"} (not approved)`);
  }
}

if (broken === 0) {
  console.log(`✓ walkthrough audio invariant holds — ${audioWalk.length} walkthrough/coaching clips all map to approved walkthroughs`);
  process.exit(0);
}
console.error(`\n✗ INVARIANT VIOLATED — ${broken} audio clip(s) map to non-approved walkthroughs`);
process.exit(1);
