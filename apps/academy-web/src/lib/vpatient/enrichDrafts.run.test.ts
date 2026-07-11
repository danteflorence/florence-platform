// On-demand batch enrichment runner. It is a vitest file (so it gets Vite's
// module resolution for the extensionless src graph) but is GATED behind
// ENRICH_RUN so it never runs in the normal suite / CI.
//
//   ENRICH_RUN=1 npx vitest run src/lib/vpatient/enrichDrafts.run.test.ts
//
// It rewrites every skeleton draft in data/authored-drafts/ into a playable
// scenario in place (drafts are gitignored) and prints a distribution report.
import { describe, it } from "vitest";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { draftToSeed } from "./enrichDrafts";
import { buildPlayableScenario } from "./scenarioGen";
import { validateScenario } from "../../data/vpatient/validate";

const DIR = "data/authored-drafts";
const shouldRun = process.env.ENRICH_RUN === "1";

describe.skipIf(!shouldRun)("batch enrichment (ENRICH_RUN=1)", () => {
  it("rewrites every draft into a playable scenario", () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith(".json") && f.startsWith("vp-"));
    const report = { total: 0, enriched: 0, invalid: 0, byInsult: {} as Record<string, number>, bySetting: {} as Record<string, number>, failures: [] as string[] };
    for (const f of files) {
      const draft = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));
      report.total++;
      const seed = draftToSeed(draft);
      try {
        const sc = buildPlayableScenario(seed);
        const errs = validateScenario(sc);
        if (errs.length) { report.invalid++; report.failures.push(`${f}: ${errs[0]}`); continue; }
        writeFileSync(`${DIR}/${f}`, JSON.stringify(sc, null, 2) + "\n");
        report.enriched++;
        report.byInsult[seed.insultId] = (report.byInsult[seed.insultId] ?? 0) + 1;
        report.bySetting[seed.careSettingId] = (report.bySetting[seed.careSettingId] ?? 0) + 1;
      } catch (e) {
        report.invalid++;
        report.failures.push(`${f}: ${(e as Error).message}`);
      }
    }
    console.log("ENRICH_REPORT " + JSON.stringify(report));
  });
});
