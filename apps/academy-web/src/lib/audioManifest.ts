// Audio manifest client - maps a content key (question rationale / lesson
// segment) to a playable clip URL. Fetched once and cached for the session;
// API-relative URLs are resolved against the API base. When no audio has been
// generated (or the API is down), every lookup simply returns null and the UI
// renders without a player - audio is a progressive enhancement, never required.

import { apiBaseUrl } from "./academyAuth";

export interface AudioEntry {
  url: string;
  durationSec: number;
  kind: "rationale" | "stem" | "lesson" | "walkthrough" | "coaching" | "sim";
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
// Sim narration clips (patient lines + narrate effects). Must match the api
// audioStore.ts builder when these are generated. Null until generated.
export const simNarrationKey = (scenarioId: string, audioId: string) => `sim-${scenarioId}-${audioId}`;

export async function audioFor(key: string): Promise<AudioEntry | null> {
  const m = await loadAudioManifest();
  return m[key] ?? null;
}

/**
 * The spoken tutor: render short dynamic text (a tutor hint, a coaching line)
 * in the product's narrator voice via POST /v1/audio/speak. Server-cached by
 * content hash, so repeats are free. Returns a playable URL, or null when the
 * caller isn't signed in / the API is unreachable - audio stays a progressive
 * enhancement, the text is always shown regardless.
 */
export async function speakText(text: string, token: string | null): Promise<string | null> {
  const base = apiBaseUrl();
  if (!base || !token || !text.trim()) return null;
  try {
    const res = await fetch(`${base}/v1/audio/speak`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: text.slice(0, 600) }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string };
    if (!data.url) return null;
    return data.url.startsWith("/") ? `${base}${data.url}` : data.url;
  } catch {
    return null;
  }
}
