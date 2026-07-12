// ───────────────────────────────────────────────────────────────────────────
// Annual outcomes report - the accountability document. One command turns the
// ledgers into the report universities, partners, and (eventually) investors
// ask for: enrollment funnel, NCLEX outcomes, placement + retention.
//
//   node --experimental-strip-types scripts/outcomes-report.ts [year]
//
// Same store selection as the server (Postgres via DATABASE_URL, else the
// empty in-memory store). K-anonymity: any measure with fewer than 5 people
// prints "suppressed (n<5)" - small cohorts are never quotable. Output:
// data/outcomes-report-<year>.md, reviewed by a human before it leaves the
// building.
// ───────────────────────────────────────────────────────────────────────────

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "../src/store.ts";
import { MemoryStore } from "../src/store.ts";
import { PostgresStore, createPgClient } from "../src/store.postgres.ts";
import { makeFieldCrypto, localKeyProvider, keyFromPassphrase } from "../src/crypto.ts";
import { config } from "../src/config.ts";

const K = 5;
const year = process.argv[2] ?? String(new Date().getUTCFullYear());
const inYear = (iso: string | undefined) => (iso ?? "").startsWith(year);

const databaseUrl = process.env["DATABASE_URL"];
let store: Store;
if (databaseUrl) {
  const sql = await createPgClient(databaseUrl);
  store = new PostgresStore(sql, makeFieldCrypto(localKeyProvider(keyFromPassphrase(config.fieldEncPassphrase))));
  console.log("[report] store: Postgres");
} else {
  store = new MemoryStore();
  console.log("[report] store: in-memory (set DATABASE_URL for a real run)");
}

// One pass over candidates; ledgers per candidate.
let enrolledCandidates = 0;
let completions = 0;
let nclexPass = 0;
let nclexFail = 0;
let offers = 0;
let starts = 0;
let retained = 0;
let attrited = 0;
let cursor: string | undefined;
do {
  const page = await store.candidates.list(cursor, 200);
  for (const cand of page.data) {
    const enrollments = await store.enrollments.byCandidate(cand.id);
    if (enrollments.some((e) => inYear(e.created_at) && e.status !== "withdrawn")) enrolledCandidates++;
    if (enrollments.some((e) => e.status === "completed" && inYear(e.updated_at))) completions++;
    const outcomes = await store.outcomes.list(cand.id, undefined, 200);
    for (const o of outcomes.data) {
      if (!inYear(o.occurred_at)) continue;
      if (o.kind === "nclex_result" && o.status === "pass") nclexPass++;
      if (o.kind === "nclex_result" && o.status === "fail") nclexFail++;
      if (o.kind === "employer_offer" && o.status === "accepted") offers++;
      if (o.kind === "start") starts++;
      if (o.kind === "retention_90d" && o.status === "retained") retained++;
      if (o.kind === "retention_90d" && o.status === "attrited") attrited++;
    }
  }
  cursor = page.next_cursor ?? undefined;
} while (cursor);

const pct = (num: number, den: number) => (den > 0 ? `${Math.round((num / den) * 1000) / 10}%` : "—");
const kGate = (n: number, text: string) => (n >= K ? text : `suppressed (n<${K})`);
const nclexTotal = nclexPass + nclexFail;
const retTotal = retained + attrited;

const md = `# Florence Academy — Outcomes Report ${year}

_Generated ${new Date().toISOString().slice(0, 10)}. Counts below ${K} are suppressed to protect individual candidates. NCLEX results combine self-reports and registry-verified events; the verified share grows over time. This document is reviewed by a human before external distribution._

## Enrollment funnel
| Measure | Value |
|---|---|
| Candidates enrolled (${year}) | ${kGate(enrolledCandidates, String(enrolledCandidates))} |
| Program completions | ${kGate(completions, String(completions))} |

## NCLEX-RN outcomes
| Measure | Value |
|---|---|
| Results reported | ${kGate(nclexTotal, String(nclexTotal))} |
| Pass rate (reported) | ${kGate(nclexTotal, pct(nclexPass, nclexTotal))} |

## Transition to practice
| Measure | Value |
|---|---|
| Offers accepted | ${kGate(offers, String(offers))} |
| RN starts | ${kGate(starts, String(starts))} |
| 90-day retention | ${kGate(retTotal, pct(retained, retTotal))} |

*Methodology: enrollment = any non-withdrawn enrollment created in ${year}; NCLEX pass rate = passes / (passes + fails) among candidates who reported a result dated in ${year} (unreported results are excluded, which can bias the rate in either direction and is disclosed as such); retention = retained / (retained + attrited) among 90-day marks recorded in ${year}.*
`;

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "data");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `outcomes-report-${year}.md`);
writeFileSync(outPath, md);
console.log(`[report] ${year}: enrolled=${enrolledCandidates} completions=${completions} nclex=${nclexTotal} (pass ${pct(nclexPass, nclexTotal)}) starts=${starts}`);
console.log(`[report] written: ${outPath}`);
process.exit(0);
