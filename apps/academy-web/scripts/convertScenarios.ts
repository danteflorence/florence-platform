// ───────────────────────────────────────────────────────────────────────────
// Batch scenario converter. Walks a folder of purchased/authored scenario
// documents (PDF/Word), extracts the text, runs the SAME ingest the Scenario
// Studio uses, validates each result, and writes one draft scenario JSON per
// file plus a manifest report.
//
// HONEST OUTPUT: these are auto-drafted SKELETONS - real title, detected
// vitals, patient name, and a valid one-phase shell with "Edit:" placeholders.
// They are starting points for an instructor or the conversational author to
// flesh out and a clinical SME to approve, NOT finished gold scenarios. The
// four hand-authored scenarios (sepsis/HF/hemorrhage/hypovolemic) are the bar;
// these get a file into the library so nobody starts from a blank page.
//
// The licensed SOURCE documents are never copied into the repo - only our own
// schema drafts (clinical facts, which aren't copyrightable) land in the
// gitignored output dir.
//
// Run (from apps/academy-web):
//   node scripts/convertScenarios.ts "<pack dir>" [outDir]
// ───────────────────────────────────────────────────────────────────────────

import { readdirSync, statSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, extname, basename, relative } from "node:path";
import mammoth from "mammoth";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { scenarioSkeleton } from "../api/src/scenarioIngest.ts";
import { validateScenario } from "../src/data/vpatient/validate.ts";
import type { VPatientScenario } from "../src/data/vpatient/types.ts";

const PACK = process.argv[2];
const OUT = process.argv[3] ?? join(process.cwd(), "data", "authored-drafts");
if (!PACK) {
  console.error('Usage: node scripts/convertScenarios.ts "<pack dir>" [outDir]');
  process.exit(1);
}

// Skip non-scenario documents: white papers, checklists, template forms,
// supplements, and the BioGears engine binaries.
const SKIP = /white\s*paper|checklist|skills check|support-maximized|maximized-util|csa\.whitepaper|template|supplement|biogears|\.tgz$|\.zip$|\.pptx$|\.gz$/i;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(pdf|docx)$/i.test(name) && !SKIP.test(name)) out.push(p);
  }
  return out;
}

async function extract(path: string): Promise<string> {
  if (extname(path).toLowerCase() === ".docx") {
    const { value } = await mammoth.extractRawText({ path });
    return value;
  }
  const data = new Uint8Array(readFileSync(path));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const parts: string[] = [];
  const pages = Math.min(doc.numPages, 25);
  for (let p = 1; p <= pages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    parts.push(content.items.map((i: { str?: string }) => i.str ?? "").join(" "));
  }
  return parts.join("\n");
}

function titleFromFile(path: string): string {
  return basename(path)
    .replace(/\.(pdf|docx)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\d{2,4}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface Row {
  source: string;
  title: string;
  draftFile: string;
  vitalsDetected: boolean;
  valid: boolean;
  errorCount: number;
}

async function main() {
  const files = walk(PACK);
  mkdirSync(OUT, { recursive: true });
  const rows: Row[] = [];
  let ok = 0;
  let failed = 0;

  for (const file of files) {
    const rel = relative(PACK, file);
    try {
      const text = await extract(file);
      if (text.trim().length < 200) {
        rows.push({ source: rel, title: titleFromFile(file), draftFile: "", vitalsDetected: false, valid: false, errorCount: -1 });
        failed++;
        continue;
      }
      const { scenario } = scenarioSkeleton({ text, title: titleFromFile(file) });
      const errors = validateScenario(scenario as unknown as VPatientScenario);
      const slug = String((scenario as { id: string }).id);
      const draftFile = `${slug}.json`;
      writeFileSync(join(OUT, draftFile), JSON.stringify(scenario, null, 2));
      const vitals = (scenario as { initialVitals: { hr: number } }).initialVitals;
      rows.push({
        source: rel,
        title: titleFromFile(file),
        draftFile,
        vitalsDetected: vitals.hr !== 88, // 88 is the skeleton default
        valid: errors.length === 0,
        errorCount: errors.length,
      });
      if (errors.length === 0) ok++;
      else failed++;
    } catch (e) {
      rows.push({ source: rel, title: titleFromFile(file), draftFile: "", vitalsDetected: false, valid: false, errorCount: -2 });
      failed++;
      console.error(`  ! ${rel}: ${e instanceof Error ? e.message : e}`);
    }
  }

  writeFileSync(join(OUT, "MANIFEST.json"), JSON.stringify({ generated_at: new Date().toISOString(), total: files.length, valid: ok, needs_work: failed, rows }, null, 2));
  console.log(`\nConverted ${files.length} documents → ${OUT}`);
  console.log(`  ${ok} valid draft skeletons, ${failed} need manual attention.`);
  console.log(`  ${rows.filter((r) => r.vitalsDetected).length} had vitals auto-detected from the text.`);
  console.log(`  Manifest: ${join(OUT, "MANIFEST.json")}`);
}

void main();
