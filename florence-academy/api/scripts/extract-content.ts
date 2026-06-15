// Build the audio CONTENT manifest the generator consumes: a flat list of
// { key, kind, refId, title, text } pulled from the Academy's authored content —
// question rationales (the bulk) and lesson narration. Decoupling extraction
// from generation means the generator never needs to understand content shapes,
// and we can add sources here without touching the TTS pipeline.
//
//   node scripts/extract-content.ts [--with-stems]
//
// Sources:
//   - src/assets/banks/*.json  → one entry per question rationale (+ stem with --with-stems)
//   - src/data/hour{1..20}.ts  → one entry per lesson segment (narration) + an intro
//
// NOTE: rationale TEXT is the source of truth and must be clinically reviewed
// BEFORE it's voiced — audio is strictly downstream. The textHash in the
// generator means an edited rationale re-renders only that one clip.

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "..", "src");
const OUT = join(HERE, "..", "data", "audio-content.json");
const withStems = process.argv.includes("--with-stems");

interface ContentItem {
  key: string;
  kind: "rationale" | "stem" | "lesson" | "walkthrough" | "coaching";
  refId: string;
  title: string;
  text: string;
}

const items: ContentItem[] = [];
const counts: Record<string, number> = { rationale: 0, stem: 0, lesson: 0, walkthrough: 0, coaching: 0 };
// Question topic + options, captured from the banks, to narrate approved walkthroughs.
const qMeta = new Map<string, { topic: string; options: string[] }>();

// --- question banks ---------------------------------------------------------
const banksDir = join(SRC, "assets", "banks");
if (existsSync(banksDir)) {
  for (const f of readdirSync(banksDir).filter((n) => n.endsWith(".json"))) {
    let arr: unknown;
    try {
      arr = JSON.parse(readFileSync(join(banksDir, f), "utf8"));
    } catch {
      console.warn(`  skip ${f}: not valid JSON`);
      continue;
    }
    if (!Array.isArray(arr)) continue;
    for (const q of arr as Array<Record<string, unknown>>) {
      const id = typeof q["id"] === "string" ? (q["id"] as string) : null;
      if (!id) continue;
      const topic = typeof q["topic"] === "string" ? (q["topic"] as string) : "NCLEX item";
      if (Array.isArray(q["options"])) {
        qMeta.set(id, { topic, options: (q["options"] as unknown[]).map((o) => (typeof o === "string" ? o : String((o as { text?: unknown })?.text ?? o))) });
      }
      const rationale = typeof q["rationale"] === "string" ? (q["rationale"] as string).trim() : "";
      if (rationale) {
        items.push({ key: `q-${id}-rationale`, kind: "rationale", refId: id, title: topic, text: rationaleScript(topic, rationale) });
        counts["rationale"] += 1;
      }
      const stem = typeof q["stem"] === "string" ? (q["stem"] as string).trim() : "";
      if (withStems && stem) {
        items.push({ key: `q-${id}-stem`, kind: "stem", refId: id, title: topic, text: stem });
        counts["stem"] += 1;
      }
    }
  }
} else {
  console.warn(`  no banks dir at ${banksDir}`);
}

// --- lessons (hour1..hour20) ------------------------------------------------
for (let n = 1; n <= 20; n += 1) {
  const path = join(SRC, "data", `hour${n}.ts`);
  if (!existsSync(path)) continue;
  try {
    const mod = (await import(path)) as { lesson?: Lesson };
    const lesson = mod.lesson;
    if (!lesson) continue;
    const title = lesson.meta?.title ?? `Section ${n}`;
    // intro: tagline + objectives
    const objectives = (lesson.objectives ?? []).join(". ");
    const intro = [lesson.meta?.tagline, objectives && `In this section: ${objectives}.`].filter(Boolean).join(" ");
    if (intro.trim()) {
      items.push({ key: `lesson-${n}-intro`, kind: "lesson", refId: `${n}/intro`, title: `${title} — overview`, text: intro });
      counts["lesson"] += 1;
    }
    for (const seg of lesson.segments ?? []) {
      const text = segmentNarration(seg);
      if (text.trim().length < 8) continue;
      items.push({ key: `lesson-${n}-${seg.id}`, kind: "lesson", refId: `${n}/${seg.id}`, title: `${title} — ${seg.title}`, text });
      counts["lesson"] += 1;
    }
  } catch (e) {
    console.warn(`  skip hour${n}.ts: ${(e as Error).message.slice(0, 120)}`);
  }
}

// --- approved clinical-judgment walkthroughs (+ per-distractor coaching) -----
// Audio is emitted ONLY for status='approved' walkthroughs (the store's listApproved).
// With no DATABASE_URL the MemoryStore is empty → no walkthrough audio (correct).
try {
  const { MemoryStore } = await import("../src/store.ts");
  const { walkthroughAudioItems } = await import("../src/walkthroughNarration.ts");
  let store: { walkthroughs: { listApproved(): Promise<unknown[]> } };
  if (process.env["DATABASE_URL"]) {
    const { PostgresStore, createPgClient } = await import("../src/store.postgres.ts");
    const { makeFieldCrypto, localKeyProvider, keyFromPassphrase } = await import("../src/crypto.ts");
    const { config } = await import("../src/config.ts");
    const sql = await createPgClient(process.env["DATABASE_URL"]);
    store = new PostgresStore(sql, makeFieldCrypto(localKeyProvider(keyFromPassphrase(config.fieldEncPassphrase)))) as never;
  } else {
    store = new MemoryStore() as never;
  }
  const approved = (await store.walkthroughs.listApproved()) as Parameters<typeof walkthroughAudioItems>[0];
  for (const it of walkthroughAudioItems(approved, (id) => qMeta.get(id))) {
    items.push(it);
    counts[it.kind] = (counts[it.kind] ?? 0) + 1;
  }
} catch (e) {
  console.warn(`  walkthrough audio skipped: ${(e as Error).message.slice(0, 120)}`);
}

// minimal local shapes (mirror src/data/lessonTypes.ts; runtime-erased types)
interface Lesson {
  meta?: { title?: string; tagline?: string };
  objectives?: string[];
  segments?: Segment[];
}
interface Segment {
  id: string;
  title: string;
  blocks: ContentBlock[];
}
type ContentBlock =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "callout"; tone: string; title: string; text: string };

function segmentNarration(seg: Segment): string {
  const parts: string[] = [seg.title.endsWith(".") ? seg.title : `${seg.title}.`];
  for (const b of seg.blocks ?? []) {
    if (b.kind === "p" || b.kind === "h") parts.push(b.text);
    else if (b.kind === "list") parts.push(b.items.join(". "));
    else if (b.kind === "callout") parts.push(`${b.title}: ${b.text}`);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** Frame a rationale as a spoken review line (designed for the ear, not the page). */
function rationaleScript(topic: string, rationale: string): string {
  return `Rationale. ${topic}. ${rationale}`;
}

if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(items, null, 2));

const totalChars = items.reduce((s, it) => s + it.text.length, 0);
console.log(`[audio] extracted ${items.length} items → ${OUT}`);
console.log(`        rationales=${counts["rationale"]}  stems=${counts["stem"]}  lessons=${counts["lesson"]}`);
console.log(`        total characters: ${totalChars.toLocaleString()}  (~${Math.round(totalChars / 14 / 60).toLocaleString()} min spoken est.)`);
process.exit(0);
