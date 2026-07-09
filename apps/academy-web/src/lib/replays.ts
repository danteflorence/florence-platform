// Replay-library client: list past live-class recordings + build playback URLs.
// The mp4s live in your storage bucket; the API returns object keys + a public
// base (a CDN in front of the bucket). Playback URL = base + key.

import { apiBaseUrl } from "./academyAuth";

export interface Replay {
  id: string;
  channel: string;
  files: string[];
  startedAt: string;
  endedAt: string;
  durationSec: number;
  by?: string;
}

export async function fetchReplays(channel?: string): Promise<{ recordings: Replay[]; base: string }> {
  const api = apiBaseUrl();
  if (!api) return { recordings: [], base: "" };
  try {
    const r = await fetch(`${api}/v1/live/recordings`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(channel ? { channel } : {}),
    }).then((x) => x.json());
    return { recordings: r?.recordings ?? [], base: r?.base ?? "" };
  } catch {
    return { recordings: [], base: "" };
  }
}

export function replayUrl(base: string, file: string): string {
  if (!base || !file) return "";
  return `${base.replace(/\/$/, "")}/${file.replace(/^\//, "")}`;
}

export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m || 1}m`;
}
