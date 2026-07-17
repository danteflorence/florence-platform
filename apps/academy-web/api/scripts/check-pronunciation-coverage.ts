// ───────────────────────────────────────────────────────────────────────────
// check-pronunciation-coverage.ts - guardrail so a mispronounced clinical term
// is caught by tooling, not by a learner's ear.
//
//   node scripts/check-pronunciation-coverage.ts        # report
//   node scripts/check-pronunciation-coverage.ts --ci   # exit 1 if gaps found
//
// Scans data/audio-content.json for a curated list of clinical terms that
// generic TTS routinely mis-stresses (the ones that kill credibility for a
// nursing audience) and reports any that appear in content but are NOT in the
// pronunciation dictionary. Additions to HIGH_RISK are cheap insurance.
// ───────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { PronRule } from "../src/elevenlabs.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DICT_FILE = join(HERE, "..", "data", "clinical-pronunciation.json");
const CONTENT_FILE = join(HERE, "..", "data", "audio-content.json");
const ci = process.argv.includes("--ci");

// Clinical terms generic TTS commonly gets wrong (stress or vowel). Not
// exhaustive - grow it whenever a bad pronunciation is reported.
const HIGH_RISK = [
  "saline", "edema", "catheter", "catheters", "catheterization", "nausea", "nauseous",
  "ischemia", "ischemic", "angina", "diuretic", "diuretics", "diuresis", "titrate",
  "titration", "dyspnea", "apnea", "tachypnea", "hypoxia", "cyanosis", "epidural",
  "sublingual", "buccal", "purulent", "feces", "centimeter", "centimeters",
  "micturition", "debridement", "asystole", "diastole", "systole", "defibrillator",
  "hemostasis", "oliguria", "anuria", "paresthesia", "hyperkalemia", "hypokalemia",
  "hyponatremia", "hypernatremia", "peritonitis", "cholecystitis", "pyelonephritis",
];

if (!existsSync(CONTENT_FILE)) {
  console.error(`No content manifest at ${CONTENT_FILE}. Run: node scripts/extract-content.ts`);
  process.exit(ci ? 1 : 0);
}
const content = JSON.parse(readFileSync(CONTENT_FILE, "utf8")) as { text: string }[];
const doc = JSON.parse(readFileSync(DICT_FILE, "utf8")) as { rules: PronRule[] };
const covered = new Set(doc.rules.map((r) => r.string_to_replace.toLowerCase()));
const allText = content.map((c) => c.text).join("\n").toLowerCase();

const gaps: { term: string; occurrences: number }[] = [];
for (const term of HIGH_RISK) {
  if (covered.has(term)) continue;
  const n = (allText.match(new RegExp(`\\b${term}\\b`, "g")) || []).length;
  if (n > 0) gaps.push({ term, occurrences: n });
}
gaps.sort((a, b) => b.occurrences - a.occurrences);

console.log(`[coverage] ${doc.rules.length} dictionary rules; ${HIGH_RISK.length} high-risk terms checked`);
if (gaps.length === 0) {
  console.log("[coverage] PASS - every high-risk term used in content is in the dictionary.");
  process.exit(0);
}
console.log(`[coverage] ${gaps.length} high-risk term(s) appear in content but are NOT in the dictionary:`);
for (const g of gaps) console.log(`   ${g.term.padEnd(18)} ${g.occurrences}× in content`);
console.log("\nFix: add them in scripts/refresh-pronunciation.ts (NEW_RULES) and run it.");
process.exit(ci ? 1 : 0);
