// Generate the virtual-patient narration clips from api/data/sim-narration.json
// (exported by the SPA-side bridge: EXPORT_SIM_AUDIO=1 npx vitest run
// src/lib/vpatient/exportSimNarration.run.test.ts).
//
//   node --env-file=.env scripts/generate-sim-audio.ts          # render missing
//   node --env-file=.env scripts/generate-sim-audio.ts --dry    # print the plan
//
// Each line renders in ITS OWN voice (patient lines = a diverse cast voice,
// clinical narration = the fixed narrator) with the clinical pronunciation
// dictionary attached. Keys are sim-<scenarioId>-<audioId>, matching the SPA's
// simNarrationKey(), so the player's speaker buttons light up as soon as the
// manifest refreshes. textHash-cached: re-runs only render changed lines.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { ttsToMp3, elevenlabsConfigured, voiceConfig, outputBitrateKbps } from "../src/elevenlabs.ts";
import { loadManifest, saveManifest, writeAsset } from "../src/audioStore.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = join(HERE, "..", "data", "sim-narration.json");
const dry = process.argv.includes("--dry");

interface Line {
  key: string;
  scenarioId: string;
  audioId: string;
  text: string;
  voiceId: string;
  speaker: "patient" | "narrator";
}
const doc = JSON.parse(readFileSync(FILE, "utf8")) as { lines: Line[] };
console.log(`[sim-audio] ${doc.lines.length} narration lines`);

if (!elevenlabsConfigured() && !dry) {
  console.error("ELEVENLABS_API_KEY not set - run with --dry or configure api/.env");
  process.exit(1);
}

const manifest = loadManifest();
const cfg = voiceConfig();
let rendered = 0, skipped = 0, chars = 0;

for (const line of doc.lines) {
  // Voice is part of the hash: recasting a line re-renders it.
  const textHash = createHash("sha256").update(`${line.voiceId}|${line.text}`).digest("hex");
  const hit = manifest[line.key];
  if (hit && hit.textHash === textHash) { skipped++; continue; }
  if (dry) {
    console.log(`  would render ${line.key} [${line.speaker}] "${line.text.slice(0, 50)}..."`);
    rendered++; chars += line.text.length;
    continue;
  }
  const bytes = await ttsToMp3(line.text, { voiceId: line.voiceId });
  const durationSec = Math.round(((bytes.length * 8) / (outputBitrateKbps() * 1000)) * 10) / 10;
  manifest[line.key] = writeAsset({
    key: line.key,
    kind: "sim",
    refId: `${line.scenarioId}/${line.audioId}`,
    bytes,
    textHash,
    durationSec,
    chars: line.text.length,
    voiceId: line.voiceId,
    modelId: cfg.modelId,
    generatedAt: new Date().toISOString(),
  });
  rendered++; chars += line.text.length;
  console.log(`  ✓ ${line.key} [${line.speaker}] ${durationSec}s`);
}

if (!dry) saveManifest(manifest);
console.log(`\n[sim-audio] rendered ${rendered}, cached ${skipped}, ~${chars} chars${dry ? " (dry)" : ""}`);
