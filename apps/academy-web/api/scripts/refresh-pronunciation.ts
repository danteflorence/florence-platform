// ───────────────────────────────────────────────────────────────────────────
// refresh-pronunciation.ts - close pronunciation-coverage gaps without
// re-rendering the whole reservoir.
//
//   node --env-file=.env scripts/refresh-pronunciation.ts        # apply
//   node --env-file=.env scripts/refresh-pronunciation.ts --dry  # preview
//
// Idempotent. Steps:
//   1. Merge NEW_RULES into data/clinical-pronunciation.json (source of truth).
//   2. add-rules them to the EXISTING dictionary → a new version (dict id is
//      unchanged, so the ~10k clips that never say these words keep their
//      cache hash and are NOT re-rendered).
//   3. Invalidate only the clips whose text uses a new term (drop them from
//      the audio manifest) so the next `generate-audio` re-renders exactly
//      those, with the new dictionary version.
//
// After it runs: set ELEVENLABS_DICTIONARY_VERSION_ID to the printed value,
// re-attach the dict to the live agent (setup-patient-agent.ts), and run
// `node --env-file=.env scripts/generate-audio.ts` to re-voice the affected
// clips.
// ───────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { addPronunciationRules, elevenlabsConfigured, type PronRule } from "../src/elevenlabs.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DICT_FILE = join(HERE, "..", "data", "clinical-pronunciation.json");
const CONTENT_FILE = join(HERE, "..", "data", "audio-content.json");
const SIM_FILE = join(HERE, "..", "data", "sim-narration.json");
const AUDIO_DIR = join(HERE, "..", "data", "audio");
const MANIFEST_FILE = join(AUDIO_DIR, "manifest.json");
const dry = process.argv.includes("--dry");

// Clinical terms that were missing and appear in the content (data-driven from
// scripts/check-pronunciation-coverage.ts). Alias style matches the existing
// dictionary: hyphenated syllables, PRIMARY stress in CAPS. US clinical norm.
const NEW_RULES: PronRule[] = [
  { string_to_replace: "saline", type: "alias", alias: "SAY-leen" },
  { string_to_replace: "edema", type: "alias", alias: "uh-DEE-muh" },
  { string_to_replace: "catheter", type: "alias", alias: "KATH-eh-ter" },
  { string_to_replace: "catheters", type: "alias", alias: "KATH-eh-ters" },
  { string_to_replace: "catheterization", type: "alias", alias: "kath-eh-ter-ih-ZAY-shun" },
  { string_to_replace: "nausea", type: "alias", alias: "NAW-zee-uh" },
  { string_to_replace: "nauseous", type: "alias", alias: "NAW-shus" },
  { string_to_replace: "ischemic", type: "alias", alias: "is-KEE-mik" },
  { string_to_replace: "diuretic", type: "alias", alias: "dye-yoo-RET-ik" },
  { string_to_replace: "diuretics", type: "alias", alias: "dye-yoo-RET-iks" },
  { string_to_replace: "diuresis", type: "alias", alias: "dye-yoo-REE-sis" },
  { string_to_replace: "titrate", type: "alias", alias: "TY-trayt" },
  { string_to_replace: "titration", type: "alias", alias: "ty-TRAY-shun" },
  { string_to_replace: "epidural", type: "alias", alias: "eh-pih-DOOR-ul" },
  { string_to_replace: "sublingual", type: "alias", alias: "sub-LING-gwul" },
  { string_to_replace: "purulent", type: "alias", alias: "PYUR-yoo-lent" },
  { string_to_replace: "buccal", type: "alias", alias: "BUCK-ul" },
  { string_to_replace: "feces", type: "alias", alias: "FEE-seez" },
  { string_to_replace: "centimeter", type: "alias", alias: "SEN-tih-mee-ter" },
  { string_to_replace: "centimeters", type: "alias", alias: "SEN-tih-mee-ters" },
  { string_to_replace: "micturition", type: "alias", alias: "mik-tyoo-RISH-un" },
  { string_to_replace: "debridement", type: "alias", alias: "dih-BREED-ment" },
  { string_to_replace: "débridement", type: "alias", alias: "dih-BREED-ment" },
];

// ── 1. Merge into the source of truth ──────────────────────────────────────
const doc = JSON.parse(readFileSync(DICT_FILE, "utf8")) as { name: string; _note?: string; rules: PronRule[] };
const have = new Set(doc.rules.map((r) => r.string_to_replace.toLowerCase()));
const toAdd = NEW_RULES.filter((r) => !have.has(r.string_to_replace.toLowerCase()));
console.log(`[pron] ${NEW_RULES.length} candidate rules; ${toAdd.length} are new to the dictionary`);
for (const r of toAdd) console.log(`   + ${r.string_to_replace.padEnd(16)} → ${r.alias}`);

if (toAdd.length === 0) {
  console.log("[pron] dictionary already covers these terms - nothing to do.");
  process.exit(0);
}
if (!dry) {
  doc.rules.push(...toAdd);
  writeFileSync(DICT_FILE, JSON.stringify(doc, null, 2) + "\n");
  console.log(`[pron] merged into ${DICT_FILE} (now ${doc.rules.length} rules)`);
}

// ── 3. Which cached clips use a new term? ──────────────────────────────────
// (Computed even in --dry so you can see the re-render cost before applying.)
const terms = toAdd.map((r) => r.string_to_replace).filter((t) => /^[a-z]+$/i.test(t));
const termRe = new RegExp(`\\b(${terms.join("|")})\\b`, "i");
let affectedKeys: string[] = [];
if (existsSync(CONTENT_FILE) && existsSync(MANIFEST_FILE)) {
  const content = JSON.parse(readFileSync(CONTENT_FILE, "utf8")) as { key: string; text: string }[];
  const manifest = JSON.parse(readFileSync(MANIFEST_FILE, "utf8")) as Record<string, { file: string }>;
  const textByKey = new Map(content.map((c) => [c.key, c.text]));
  // Sim narration clips (keys sim-*) live in a separate content file, rendered
  // by generate-sim-audio.ts - fold them in so they invalidate too.
  if (existsSync(SIM_FILE)) {
    const sim = JSON.parse(readFileSync(SIM_FILE, "utf8")) as { lines?: { key: string; text: string }[] };
    for (const l of sim.lines ?? []) textByKey.set(l.key, l.text);
  }
  affectedKeys = Object.keys(manifest).filter((k) => {
    const t = textByKey.get(k);
    return t ? termRe.test(t) : false;
  });
  console.log(`[pron] cached clips that say a new term: ${affectedKeys.length} (these re-render; the other ${Object.keys(manifest).length - affectedKeys.length} do NOT)`);
  if (!dry) {
    for (const k of affectedKeys) {
      const f = join(AUDIO_DIR, manifest[k].file);
      if (existsSync(f)) rmSync(f);
      delete manifest[k];
    }
    writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
    console.log(`[pron] invalidated ${affectedKeys.length} clips (dropped from manifest + disk)`);
  }
} else {
  console.log("[pron] no local audio manifest - skipping clip invalidation (nothing rendered here yet)");
}

// ── 2. Upload to the existing dictionary → new version ─────────────────────
if (dry) {
  console.log("[pron] --dry: not uploading. Re-run without --dry to apply.");
  process.exit(0);
}
const dictId = process.env["ELEVENLABS_DICTIONARY_ID"] ?? "";
if (!elevenlabsConfigured() || !dictId) {
  console.log("[pron] ELEVENLABS_API_KEY / ELEVENLABS_DICTIONARY_ID not set - merged the JSON but did not upload.");
  process.exit(0);
}
const { versionId } = await addPronunciationRules(dictId, toAdd);
console.log(`\n[pron] uploaded. dictionary ${dictId} → new version ${versionId}\n`);
console.log("Next:");
console.log(`  1. set ELEVENLABS_DICTIONARY_VERSION_ID=${versionId} in api/.env`);
console.log("  2. node --env-file=.env scripts/setup-patient-agent.ts   # attach dict to the live agent");
console.log("  3. node --env-file=.env scripts/generate-audio.ts        # re-voice affected lesson/rationale clips");
console.log("  4. node --env-file=.env scripts/generate-sim-audio.ts    # re-voice affected sim narration clips");
process.exit(0);
