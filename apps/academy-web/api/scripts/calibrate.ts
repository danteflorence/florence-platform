// ───────────────────────────────────────────────────────────────────────────
// Offline calibration run - the measurement loop closing on real data.
//
//   node --experimental-strip-types scripts/calibrate.ts
//
// Reads the same store the API serves (Postgres when DATABASE_URL is set,
// else the in-memory store - which is empty unless the server seeded it, so
// production runs happen against the database). Produces:
//
//   1. Empirical item difficulties for every question with >=MIN_ATTEMPTS
//      real responses (Rasch inversion of the observed pass rate) - the
//      hand-off that retires the bank's shipped priors item by item.
//   2. Readiness-cut validation: last pre-exam readiness band vs the actual
//      NCLEX result, per band + the green-band PPV.
//
// Output: data/calibration-report.json + a console summary. Read-only - the
// report is reviewed by a human before any difficulty override ships (the
// override lands as a generated overlay in the SPA bank, PR-reviewed like
// any content change).
// ───────────────────────────────────────────────────────────────────────────

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "../src/store.ts";
import { MemoryStore } from "../src/store.ts";
import { PostgresStore, createPgClient } from "../src/store.postgres.ts";
import { makeFieldCrypto, localKeyProvider, keyFromPassphrase } from "../src/crypto.ts";
import { config } from "../src/config.ts";
import { calibrateItems, validateCut, type OutcomePair } from "../src/calibration.ts";
import { computeReadiness } from "../src/readiness.ts";

const MIN_ATTEMPTS = 20;

const databaseUrl = process.env["DATABASE_URL"];
let store: Store;
if (databaseUrl) {
  const sql = await createPgClient(databaseUrl);
  const fieldCrypto = makeFieldCrypto(localKeyProvider(keyFromPassphrase(config.fieldEncPassphrase)));
  store = new PostgresStore(sql, fieldCrypto);
  console.log("[calibrate] store: Postgres");
} else {
  store = new MemoryStore();
  console.log("[calibrate] store: in-memory (fresh = empty; set DATABASE_URL for a real run)");
}

// ── 1. Item difficulty from live responses ─────────────────────────────────
const evidence = await store.questionResponses.topMissed(1_000_000, MIN_ATTEMPTS);
const items = calibrateItems(
  evidence.map((a) => ({ question_id: a.question_id, attempts: a.attempts, pass_rate: a.pass_rate })),
  MIN_ATTEMPTS,
);
console.log(`[calibrate] items with >=${MIN_ATTEMPTS} attempts: ${items.length}`);
for (const it of items.slice(0, 10))
  console.log(`   ${it.question_id}  n=${it.attempts}  p=${it.pass_rate}  b=${it.empirical_b}`);

// ── 2. Readiness cut vs real NCLEX outcomes ────────────────────────────────
// For each candidate with an nclex_result: registry_verified beats
// self_report; the band is recomputed from only the results BEFORE the exam
// date, so late practice can't flatter the validation.
const pairs: OutcomePair[] = [];
let cursor: string | undefined;
let scanned = 0;
do {
  const page = await store.candidates.list(cursor, 200);
  for (const cand of page.data) {
    scanned++;
    const outcomes = await store.outcomes.list(cand.id, undefined, 200);
    const nclex = outcomes.data
      .filter((o) => o.kind === "nclex_result" && (o.status === "pass" || o.status === "fail"))
      .sort((a, b) => {
        const src = (o: typeof a) => ((o.detail as Record<string, unknown> | undefined)?.["source"] === "registry_verified" ? 0 : 1);
        return src(a) - src(b) || (a.occurred_at < b.occurred_at ? 1 : -1);
      })[0];
    if (!nclex) continue;
    const all = await store.assessmentResults.list(cand.id, undefined, 1000);
    const preExam = all.data.filter((r) => r.created_at <= nclex.occurred_at);
    const progress = await store.progress.listByCandidate(cand.id);
    const readiness = computeReadiness({ candidateId: cand.id, results: preExam, progress });
    pairs.push({ band: readiness.band, passed: nclex.status === "pass" });
  }
  cursor = page.next_cursor ?? undefined;
} while (cursor);

const cut = validateCut(pairs);
console.log(`[calibrate] candidates scanned: ${scanned}, outcome pairs: ${cut.pairs}`);
for (const row of cut.by_band)
  console.log(`   ${row.band.padEnd(7)} n=${row.n}  passed=${row.passed}  rate=${row.pass_rate}`);
if (cut.green_ppv !== null)
  console.log(`   green PPV=${cut.green_ppv}  vs non-green pass rate=${cut.non_green_pass_rate}`);

// ── Report ──────────────────────────────────────────────────────────────────
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "data");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "calibration-report.json");
writeFileSync(
  outPath,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      min_attempts: MIN_ATTEMPTS,
      items,
      cut_validation: cut,
    },
    null,
    2,
  ),
);
console.log(`[calibrate] report written: ${outPath}`);
process.exit(0);
