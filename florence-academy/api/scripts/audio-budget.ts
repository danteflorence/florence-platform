// Audio generation budget + coverage report. Shows, per kind, how many characters
// → hours of narration, split into already-GENERATED (fresh in the manifest) vs
// PENDING, as a % of the ElevenLabs grant — so you can see how to allocate the 600h.
// "ebook" is reported as a FACET of the existing `lesson` kind (the reader plays the
// same lesson clips — no separate generation).
//
//   node scripts/audio-budget.ts            # reads data/audio-content.json + manifest
//   AUDIO_GRANT_HOURS=600 node scripts/audio-budget.ts

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { loadManifest } from "../src/audioStore.ts";
import { voiceConfig } from "../src/elevenlabs.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(HERE, "..", "data", "audio-content.json");
const GRANT_HOURS = Number(process.env["AUDIO_GRANT_HOURS"] ?? 600);

interface Item { key: string; kind: string; refId: string; text: string }

if (!existsSync(CONTENT)) {
  console.error(`No content manifest at ${CONTENT}. Run: npm run audio:extract`);
  process.exit(1);
}
const items: Item[] = JSON.parse(readFileSync(CONTENT, "utf8"));
const manifest = loadManifest();
const vc = voiceConfig();
const hashOf = (text: string) => createHash("sha256").update(`${text} ${vc.voiceId} ${vc.modelId} ${vc.dictionaryId}`).digest("hex");
const hours = (chars: number) => chars / 14 / 3600;
const pct = (h: number) => `${(h / GRANT_HOURS * 100).toFixed(1)}%`;

interface Row { items: number; genChars: number; pendChars: number }
const rows = new Map<string, Row>();
const bump = (kind: string, chars: number, fresh: boolean) => {
  const r = rows.get(kind) ?? { items: 0, genChars: 0, pendChars: 0 };
  r.items += 1;
  if (fresh) r.genChars += chars; else r.pendChars += chars;
  rows.set(kind, r);
};

for (const it of items) {
  const fresh = manifest[it.key]?.textHash === hashOf(it.text);
  bump(it.kind, it.text.length, fresh);
  if (it.kind === "lesson") bump("ebook (facet of lesson)", it.text.length, fresh); // reporting facet only
}

const order = ["rationale", "walkthrough", "coaching", "lesson", "ebook (facet of lesson)", "stem"];
const kinds = [...rows.keys()].sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));

console.log(`\nAudio budget — grant ${GRANT_HOURS}h  (speaking rate ~14 chars/sec)\n`);
console.log("kind".padEnd(26) + "items".padStart(8) + "gen h".padStart(9) + "pend h".padStart(9) + "total h".padStart(9) + "%grant".padStart(8));
console.log("-".repeat(69));
let tGen = 0, tPend = 0, tItems = 0;
for (const k of kinds) {
  const r = rows.get(k)!;
  const g = hours(r.genChars), p = hours(r.pendChars), t = g + p;
  console.log(k.padEnd(26) + String(r.items).padStart(8) + g.toFixed(1).padStart(9) + p.toFixed(1).padStart(9) + t.toFixed(1).padStart(9) + pct(t).padStart(8));
  if (k.startsWith("ebook")) continue; // facet — don't double-count in totals
  tGen += g; tPend += p; tItems += r.items;
}
console.log("-".repeat(69));
const total = tGen + tPend;
console.log("TOTAL".padEnd(26) + String(tItems).padStart(8) + tGen.toFixed(1).padStart(9) + tPend.toFixed(1).padStart(9) + total.toFixed(1).padStart(9) + pct(total).padStart(8));
console.log(`\nGenerated so far: ${tGen.toFixed(1)}h (${pct(tGen)}).  Pending: ${tPend.toFixed(1)}h.`);
console.log(`Projected if all generated: ${total.toFixed(1)}h (${pct(total)}) — headroom ${(GRANT_HOURS - total).toFixed(1)}h.`);
process.exit(0);
