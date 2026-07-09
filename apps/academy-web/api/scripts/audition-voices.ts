// Voice audition - render the SAME NCLEX rationale line in several ElevenLabs
// voices so a human can pick by ear before we commit the grant to 71h of
// narration (the voice is baked into every clip's cache key, so choosing it
// up front avoids a full re-render).
//
//   node --env-file=.env scripts/audition-voices.ts            # all premade + your custom voices (cap 8)
//   node --env-file=.env scripts/audition-voices.ts --limit 5
//   node --env-file=.env scripts/audition-voices.ts --say "Custom line to read."
//
// Reads ELEVENLABS_API_KEY from the env (use --env-file=.env so the key never
// leaves that gitignored file). Writes data/audio/auditions/<name>.mp3 and
// prints the files to open. Negligible grant cost (one short line each).

import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ttsToMp3, elevenlabsConfigured } from "../src/elevenlabs.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "data", "audio", "auditions");
const API = "https://api.elevenlabs.io";

const args = process.argv.slice(2);
const flag = (n: string): string | undefined => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};
const LIMIT = Number(flag("--limit") ?? 8);
const SAMPLE =
  flag("--say") ??
  // A representative NCLEX rationale: clinical terms, a number, a "because".
  "For a client in heart failure with crackles and an oxygen saturation of 88 percent, the priority action is to raise the head of the bed and apply oxygen. This improves gas exchange before you give the prescribed furosemide, because positioning and oxygen address the immediate breathing problem first.";

if (!elevenlabsConfigured()) {
  console.error(
    "ELEVENLABS_API_KEY is not set. Add it to api/.env and run with:\n" +
      "  node --env-file=.env scripts/audition-voices.ts",
  );
  process.exit(1);
}

const KEY = process.env["ELEVENLABS_API_KEY"] as string;

interface ElVoice {
  voice_id: string;
  name: string;
  category?: string; // "premade" | "cloned" | "professional" | "generated"
  labels?: Record<string, string>;
}

async function listVoices(): Promise<ElVoice[]> {
  const res = await fetch(`${API}/v1/voices`, { headers: { "xi-api-key": KEY } });
  if (!res.ok) {
    throw new Error(`GET /v1/voices failed: ${res.status} ${await res.text().catch(() => "")}`);
  }
  const j = (await res.json()) as { voices?: ElVoice[] };
  return j.voices ?? [];
}

function pick(voices: ElVoice[]): ElVoice[] {
  // Your own (cloned/professional/generated) first - those are most likely the
  // brand voice - then a spread of premade voices. Cap at LIMIT.
  const own = voices.filter((v) => v.category && v.category !== "premade");
  const premade = voices.filter((v) => v.category === "premade");
  return [...own, ...premade].slice(0, LIMIT);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function main() {
  mkdirSync(OUT, { recursive: true });
  const all = await listVoices();
  if (all.length === 0) {
    console.error("No voices on this account. Add some in the ElevenLabs Voice Library first.");
    process.exit(1);
  }
  const chosen = pick(all);
  console.log(`Auditioning ${chosen.length} of ${all.length} voices.`);
  console.log(`Sample line (${SAMPLE.length} chars):\n  "${SAMPLE}"\n`);
  const results: { name: string; voice_id: string; file: string; category?: string }[] = [];
  for (const v of chosen) {
    process.stdout.write(`  rendering ${v.name} (${v.category ?? "?"})… `);
    try {
      const mp3 = await ttsToMp3(SAMPLE, { voiceId: v.voice_id });
      const file = join(OUT, `${slug(v.name)}__${v.voice_id}.mp3`);
      writeFileSync(file, mp3);
      results.push({ name: v.name, voice_id: v.voice_id, file, ...(v.category && { category: v.category }) });
      console.log(`ok (${(mp3.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.log(`FAILED: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`\nDone. Open these and pick one:\n`);
  for (const r of results) console.log(`  ${r.name.padEnd(22)} ${r.category ?? ""}\n    ${r.file}`);
  console.log(
    `\nTo open the folder:  open "${OUT}"\n` +
      `Then tell me the name (or paste ELEVENLABS_VOICE_ID=<the voice_id> into api/.env).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
