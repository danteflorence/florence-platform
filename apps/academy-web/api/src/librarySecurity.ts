import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { LibraryDocumentMime } from "./types.ts";

export const MAX_LIBRARY_DOCUMENT_BYTES = 750_000;
export const LIBRARY_SIGNED_ACCESS_TTL_SEC = 300;
export const LIBRARY_IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-popups";
export const LIBRARY_IFRAME_ALLOW =
  "fullscreen; accelerometer; gyroscope; xr-spatial-tracking";

const ALLOWED_DOCUMENT_MIME = new Set<LibraryDocumentMime>([
  "application/pdf",
  "application/epub+zip",
  "text/plain",
  "text/markdown",
]);

const TEXT_MIME = new Set<LibraryDocumentMime>(["text/plain", "text/markdown"]);
const SENSITIVE_URL_KEY_RE =
  /name|email|phone|passport|sevis|ds160|ds-160|visa|candidate|country|dob|birth|address|token|secret|password|key/i;

export interface SafeDocumentPayload {
  file_name: string;
  mime_type: LibraryDocumentMime;
  size_bytes: number;
  content_sha256: string;
  content_base64: string;
  text_preview?: string;
}

export interface SafeEmbedPayload {
  url: string;
  origin: string;
  iframe_sandbox: string;
  iframe_allow: string;
}

export function isAllowedDocumentMime(value: string): value is LibraryDocumentMime {
  return ALLOWED_DOCUMENT_MIME.has(value as LibraryDocumentMime);
}

export function sanitizeLibraryTitle(value: string | undefined): string {
  const title = (value ?? "").replace(/\s+/g, " ").trim();
  return title.slice(0, 160);
}

export function sanitizeLibraryDescription(value: string | undefined): string | undefined {
  const desc = (value ?? "").replace(/\s+/g, " ").trim();
  return desc ? desc.slice(0, 500) : undefined;
}

export function sanitizeLibraryTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const tag = raw
      .toLowerCase()
      .replace(/[^a-z0-9 _-]+/g, "")
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    if (tag) seen.add(tag);
    if (seen.size >= 12) break;
  }
  return [...seen];
}

export function sanitizeFileName(value: string): string {
  const leaf = value.split(/[\\/]/).pop() ?? "study-resource";
  const clean = leaf
    .replace(/[^\w .()+-]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return clean || "study-resource";
}

export function normalizeDocumentPayload(input: {
  file_name?: string;
  mime_type?: string;
  content_base64?: string;
}): SafeDocumentPayload | { error: string } {
  if (!input.file_name || !input.mime_type || !input.content_base64) {
    return { error: "file_name, mime_type, and content_base64 are required" };
  }
  if (!isAllowedDocumentMime(input.mime_type)) {
    return { error: "file type is not supported" };
  }
  if (!/^[A-Za-z0-9+/=_-]+$/.test(input.content_base64)) {
    return { error: "content_base64 must be valid base64" };
  }
  let buf: Buffer;
  try {
    buf = Buffer.from(input.content_base64, "base64");
  } catch {
    return { error: "content_base64 must be valid base64" };
  }
  if (buf.length === 0) return { error: "file is empty" };
  if (buf.length > MAX_LIBRARY_DOCUMENT_BYTES) {
    return { error: `file must be ${MAX_LIBRARY_DOCUMENT_BYTES} bytes or less` };
  }
  const mime = input.mime_type as LibraryDocumentMime;
  const normalized = buf.toString("base64");
  const out: SafeDocumentPayload = {
    file_name: sanitizeFileName(input.file_name),
    mime_type: mime,
    size_bytes: buf.length,
    content_sha256: createHash("sha256").update(buf).digest("hex"),
    content_base64: normalized,
  };
  if (TEXT_MIME.has(mime)) {
    out.text_preview = buf.toString("utf8").replace(/\s+/g, " ").trim().slice(0, 500);
  }
  return out;
}

export function normalizeEmbedPayload(embedUrl: string | undefined): SafeEmbedPayload | { error: string } {
  if (!embedUrl) return { error: "embed_url is required" };
  if (embedUrl.length > 800) return { error: "embed_url is too long" };
  let parsed: URL;
  try {
    parsed = new URL(embedUrl);
  } catch {
    return { error: "embed_url must be a valid URL" };
  }
  if (parsed.protocol !== "https:") return { error: "embed_url must use https" };
  if (parsed.username || parsed.password) return { error: "embed_url cannot contain credentials" };
  const host = parsed.hostname.toLowerCase();
  if (!(host === "biodigital.com" || host.endsWith(".biodigital.com"))) {
    return { error: "embed origin is not approved" };
  }
  for (const key of parsed.searchParams.keys()) {
    if (SENSITIVE_URL_KEY_RE.test(key)) {
      return { error: "embed_url contains a sensitive parameter name" };
    }
  }
  return {
    url: parsed.toString(),
    origin: parsed.origin,
    iframe_sandbox: LIBRARY_IFRAME_SANDBOX,
    iframe_allow: LIBRARY_IFRAME_ALLOW,
  };
}

function tokenKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function signLibraryAccessToken(input: {
  secret: string;
  resourceId: string;
  ttlSec?: number;
  nowSec?: number;
}): { token: string; expires_at: string } {
  const now = input.nowSec ?? Math.floor(Date.now() / 1000);
  const exp = now + Math.max(60, Math.min(900, input.ttlSec ?? LIBRARY_SIGNED_ACCESS_TTL_SEC));
  const payload = Buffer.from(JSON.stringify({ rid: input.resourceId, exp }), "utf8");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(input.secret), iv);
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  const blob = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
  return { token: `lsa_${blob}`, expires_at: new Date(exp * 1000).toISOString() };
}

export function verifyLibraryAccessToken(
  secret: string,
  token: string,
  nowSec = Math.floor(Date.now() / 1000),
): { resourceId: string; exp: number } | null {
  if (!token.startsWith("lsa_")) return null;
  try {
    const blob = Buffer.from(token.slice(4), "base64url");
    if (blob.length < 29) return null;
    const iv = blob.subarray(0, 12);
    const tag = blob.subarray(12, 28);
    const ciphertext = blob.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", tokenKey(secret), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(plain) as { rid?: unknown; exp?: unknown };
    if (typeof parsed.rid !== "string" || typeof parsed.exp !== "number") return null;
    if (parsed.exp < nowSec) return null;
    return { resourceId: parsed.rid, exp: parsed.exp };
  } catch {
    return null;
  }
}

export function redactLibraryValue(value: unknown): unknown {
  if (typeof value === "string") {
    if (value.length > 120) return "[REDACTED]";
    return value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED]")
      .replace(/\b(?:passport|sevis|ds-?160|visa|candidate|phone|dob|token|secret|password)\b[=: ]+[A-Za-z0-9._-]+/gi, "[REDACTED]");
  }
  if (Array.isArray(value)) return value.map(redactLibraryValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = SENSITIVE_URL_KEY_RE.test(key) || /content_base64|signed_url/i.test(key)
        ? "[REDACTED]"
        : redactLibraryValue(val);
    }
    return out;
  }
  return value;
}
