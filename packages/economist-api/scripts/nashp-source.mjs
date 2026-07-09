import { createHash } from "node:crypto";

export const NASHP_SOURCE_URL = "https://nashp.org/hospital-cost-tool-and-resources/";

export async function fetchNashpSourceSnapshot(url = NASHP_SOURCE_URL) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "Florence-Education-NASHP-HCT-Freshness/1.0",
    },
  });
  if (!response.ok) {
    throw new Error(`NASHP source page returned ${response.status}`);
  }
  const html = await response.text();
  return sourceSnapshotFromHtml(html, url);
}

export function sourceSnapshotFromHtml(html, url = NASHP_SOURCE_URL) {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const updatedMatch = normalizedText.match(/Updated On\s+(\d{2}-\d{2}-\d{4})/i);
  return {
    url,
    pageUpdatedOn: updatedMatch?.[1] ?? null,
    checkedAt: new Date().toISOString(),
    pageSha256: sha256(html),
  };
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
