// Audio manifest client — maps a content key (question rationale / lesson
// segment) to a playable clip URL. Fetched once and cached for the session;
// API-relative URLs are resolved against the API base. When no audio has been
// generated (or the API is down), every lookup simply returns null and the UI
// renders without a player — audio is a progressive enhancement, never required.

import { apiBaseUrl } from "./academyAuth";

export interface AudioEntry {
  url: string;
  durationSec: number;
  kind: "rationale" | "stem" | "lesson" | "walkthrough" | "coaching";
}

let cache: Promise<Record<string, AudioEntry>> | null = null;

async function load(): Promise<Record<string, AudioEntry>> {
  const base = apiBaseUrl();
  try {
    const res = await fetch(`${base}/v1/audio/manifest`);
    if (!res.ok) return {};
    const data = (await res.json()) as { assets?: Record<string, AudioEntry> };
    const assets = data.assets ?? {};
    for (const k of Object.keys(assets)) {
      const u = assets[k].url;
      if (u.startsWith("/")) assets[k] = { ...assets[k], url: `${base}${u}` };
    }
    return assets;
  } catch {
    return {};
  }
}

/** The manifest, fetched once per session. */
export function loadAudioManifest(): Promise<Record<string, AudioEntry>> {
  if (!cache) cache = load();
  return cache;
}

export const rationaleKey = (questionId: string) => `q-${questionId}-rationale`;
export const lessonKey = (section: number, segmentId: string) => `lesson-${section}-${segmentId}`;
export const lessonIntroKey = (section: number) => `lesson-${section}-intro`;
// Walkthrough audio keys (must match the api audioStore.ts builders).
export const walkthroughKey = (questionId: string) => `wt-${questionId}`;
export const coachingKey = (questionId: string, optionIndex: number) => `co-${questionId}-${optionIndex}`;

export async function audioFor(key: string): Promise<AudioEntry | null> {
  const m = await loadAudioManifest();
  return m[key] ?? null;
}
