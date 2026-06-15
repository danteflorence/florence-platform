// Create the clinical pronunciation dictionary in ElevenLabs from
// data/clinical-pronunciation.json, then print the locator to set as env so
// every generated clip pronounces drug names and clinical terms correctly.
//
//   node scripts/setup-pronunciation.ts          # live (needs ELEVENLABS_API_KEY)
//   node scripts/setup-pronunciation.ts --dry    # print what would be uploaded
//
// After it prints the IDs, set them and regenerate:
//   export ELEVENLABS_DICTIONARY_ID=...  ELEVENLABS_DICTIONARY_VERSION_ID=...
//   node scripts/generate-audio.ts       # textHash changes → clips re-render

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createPronunciationDictionary, elevenlabsConfigured, type PronRule } from "../src/elevenlabs.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = join(HERE, "..", "data", "clinical-pronunciation.json");
const dry = process.argv.includes("--dry");

const doc = JSON.parse(readFileSync(FILE, "utf8")) as { name: string; rules: PronRule[] };
console.log(`[audio] pronunciation dictionary "${doc.name}" — ${doc.rules.length} rules`);

if (dry || !elevenlabsConfigured()) {
  console.log(dry ? "  --dry: not uploading." : "  ELEVENLABS_API_KEY not set — printing sample, not uploading.");
  for (const r of doc.rules.slice(0, 8)) {
    console.log(`   ${r.string_to_replace.padEnd(16)} → ${r.type === "alias" ? r.alias : `${r.phoneme} (${r.alphabet})`}`);
  }
  if (doc.rules.length > 8) console.log(`   …and ${doc.rules.length - 8} more`);
  process.exit(0);
}

const { id, versionId } = await createPronunciationDictionary(doc.name, doc.rules);
console.log(`\n  created dictionary id=${id} version=${versionId}\n`);
console.log(`  Set these and regenerate:`);
console.log(`    export ELEVENLABS_DICTIONARY_ID=${id}`);
console.log(`    export ELEVENLABS_DICTIONARY_VERSION_ID=${versionId}`);
process.exit(0);
