// Audio asset store - file-backed manifest of generated narration clips.
//
// Generated MP3s are STATIC: render once, serve forever. So we keep them on disk
// (a mounted volume in prod) under AUDIO_DIR and record a manifest mapping a
// stable content key → { file, textHash, durationSec, ... }. The textHash is the
// budget guard: generate-audio re-renders an item ONLY when its text/voice
// changed, so editing one rationale never re-burns the whole grant.
//
// In production, point AUDIO_PUBLIC_BASE at a CDN in front of the same files for
// global low-latency playback; otherwise the API serves them from /v1/audio/file.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const AUDIO_DIR = process.env["AUDIO_DIR"] ?? join(HERE, "..", "data", "audio");
const MANIFEST = join(AUDIO_DIR, "manifest.json");
const PUBLIC_BASE = (process.env["AUDIO_PUBLIC_BASE"] ?? "").replace(/\/$/, "");

export type AudioKind = "rationale" | "stem" | "lesson" | "walkthrough" | "coaching";

/** Audio content keys (must match the frontend audioManifest.ts key builders). */
export const walkthroughKey = (questionId: string): string => `wt-${questionId}`;
export const coachingKey = (questionId: string, optionIndex: number): string => `co-${questionId}-${optionIndex}`;

export interface AudioAsset {
  key: string;
  kind: AudioKind;
  refId: string;
  file: string; // filename within AUDIO_DIR
  textHash: string;
  durationSec: number;
  bytes: number;
  chars: number;
  voiceId: string;
  modelId: string;
  generatedAt: string;
}

export type AudioManifest = Record<string, AudioAsset>;

function ensureDir(): void {
  if (!existsSync(AUDIO_DIR)) mkdirSync(AUDIO_DIR, { recursive: true });
}

export function loadManifest(): AudioManifest {
  try {
    return JSON.parse(readFileSync(MANIFEST, "utf8")) as AudioManifest;
  } catch {
    return {};
  }
}

export function saveManifest(m: AudioManifest): void {
  ensureDir();
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2));
}

/** A filesystem-safe filename for a content key + hash. */
export function fileNameFor(key: string, textHash: string): string {
  const safe = key.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
  return `${safe}.${textHash.slice(0, 8)}.mp3`;
}

/** Write one clip's bytes and return its manifest entry (does not save manifest). */
export function writeAsset(args: {
  key: string;
  kind: AudioKind;
  refId: string;
  bytes: Buffer;
  textHash: string;
  durationSec: number;
  chars: number;
  voiceId: string;
  modelId: string;
  generatedAt: string;
}): AudioAsset {
  ensureDir();
  const file = fileNameFor(args.key, args.textHash);
  writeFileSync(join(AUDIO_DIR, file), args.bytes);
  return {
    key: args.key,
    kind: args.kind,
    refId: args.refId,
    file,
    textHash: args.textHash,
    durationSec: args.durationSec,
    bytes: args.bytes.length,
    chars: args.chars,
    voiceId: args.voiceId,
    modelId: args.modelId,
    generatedAt: args.generatedAt,
  };
}

/** Absolute path to a stored file (for the file-serving route). Returns null if
 *  the name escapes AUDIO_DIR or doesn't exist. */
export function assetFilePath(file: string): string | null {
  if (file.includes("/") || file.includes("..") || file.includes("\\")) return null;
  const p = join(AUDIO_DIR, file);
  return existsSync(p) ? p : null;
}

/** Public URL for a stored file: a CDN URL when AUDIO_PUBLIC_BASE is set,
 *  otherwise an API-relative path the SPA resolves against VITE_API_URL. */
export function publicUrl(file: string): string {
  return PUBLIC_BASE ? `${PUBLIC_BASE}/${file}` : `/v1/audio/file/${file}`;
}

/** The lightweight manifest the SPA fetches: key → { url, durationSec, kind }. */
export function publicManifest(): {
  base: string;
  count: number;
  assets: Record<string, { url: string; durationSec: number; kind: AudioKind }>;
} {
  const m = loadManifest();
  const assets: Record<string, { url: string; durationSec: number; kind: AudioKind }> = {};
  for (const [key, a] of Object.entries(m)) {
    assets[key] = { url: publicUrl(a.file), durationSec: a.durationSec, kind: a.kind };
  }
  return { base: PUBLIC_BASE, count: Object.keys(assets).length, assets };
}
