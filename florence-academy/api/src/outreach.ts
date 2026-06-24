// ───────────────────────────────────────────────────────────────────────────
// Outreach helpers - activation codes + Lob signature verification.
//
// Activation code: stable per (campaign × school_slug) so reruns and
// cross-tool references (Florence labor-economics) produce the same code.
// Algorithm mirrors the Python implementation in lob_send.code_for() byte
// for byte, so codes minted here are interchangeable with codes minted
// there. Crockford-style alphabet (no 0/O/1/I, no vowels in the body) to
// keep printed codes legible on a postcard.
// ───────────────────────────────────────────────────────────────────────────

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Deterministic activation code for a given seed string. Returns "FLOR-XXXXX".
 *
 * Use `${campaign_id}|${school_slug || org_name}` as the seed so the same
 * (campaign, target) always yields the same code on re-run.
 *
 * IMPLEMENTATION NOTE: the original Florence Python reference (lob_send.py)
 * used FNV-1a → glibc LCG → `alphabet[h % 32]` 5 times. That algorithm has
 * a hidden flaw: an LCG modulo 32 only sees the bottom 5 bits of the
 * previous state, so two inputs with different FNV hashes but the same
 * low 5 bits produce IDENTICAL output codes. With long seeds (camp_… +
 * school slug) we hit this collision regime constantly.
 *
 * We use SHA-256 instead - first 25 bits of the digest, sliced into 5
 * five-bit groups, mapped through the alphabet. Full uniformity, no
 * collisions until ~2^12.5 = 5,800 inputs (birthday paradox on 32^5),
 * which is plenty for a campaign.
 *
 * The Python reference's algorithm still works for HHA outreach (the CCN
 * inputs are short numeric strings that don't hit the collision class);
 * we just don't share codes across tools.
 */
export function activationCode(seed: string): string {
  const digest = createHash("sha256").update(seed).digest();
  // Read the first 25 bits as a big-endian integer: bytes [0..3] give
  // 32 bits, of which we take the top 25.
  const u32 = digest.readUInt32BE(0);
  const top25 = u32 >>> 7; // drop the bottom 7 bits
  let out = "";
  for (let i = 4; i >= 0; i--) {
    const idx = (top25 >>> (i * 5)) & 0x1f;
    out += ALPHABET[idx];
  }
  return `FLOR-${out}`;
}

/**
 * Lob webhook signature verification.
 *
 * Lob signs each webhook with HMAC-SHA256 over `${timestamp}.${rawBody}`.
 * Caller checks the timestamp is within tolerance (default 5min) and the
 * signature matches in constant time. Returns true on valid signature.
 *
 * If secret is empty, returns false - never accept unsigned webhooks in
 * production (the API gate ensures secret is present before calling here).
 */
export function verifyLobSignature(opts: {
  secret: string;
  signature: string | undefined;
  timestamp: string | undefined;
  rawBody: string;
  nowSec?: number;
  toleranceSec?: number;
}): boolean {
  const tolerance = opts.toleranceSec ?? 5 * 60;
  if (!opts.secret) return false;
  if (!opts.signature || !opts.timestamp) return false;
  const tsNum = Number(opts.timestamp);
  if (!Number.isFinite(tsNum)) return false;
  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - tsNum) > tolerance) return false;
  const expected = createHmac("sha256", opts.secret)
    .update(`${opts.timestamp}.${opts.rawBody}`)
    .digest();
  // Lob's signature header is hex.
  let provided: Buffer;
  try {
    provided = Buffer.from(opts.signature, "hex");
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

/** Detect whether a Lob API key is a test key (renders preview PDF, no charge)
 *  or a live key (real mail, real money). Lob prefixes the two - `test_…` vs
 *  `live_…`. We default to assuming `test` if the prefix isn't recognized,
 *  so accidentally pasting a malformed key never accidentally sends real mail. */
export function lobKeyMode(key: string): "test" | "live" {
  return key.startsWith("live_") ? "live" : "test";
}

/** Idempotency key for a Lob create call. Stable per (campaign, target) so
 *  retries from the same target don't double-mail. */
export function lobIdempotencyKey(campaignId: string, targetId: string): string {
  const h = createHash("sha256")
    .update(`${campaignId}:${targetId}`)
    .digest("hex")
    .slice(0, 32);
  return `fl-out-${h}`;
}

/** Lob's address_country wants ISO-3166 alpha-2. Our schools/leads use a mix
 *  of country names and codes. Map the names we actually have in the directory;
 *  pass through anything that's already 2 chars. The full ISO list isn't shipped
 *  here - when we hit a country not in the map, return uppercase truncated to
 *  2 chars so Lob can flag it on send. */
const COUNTRY_TO_ISO2: Record<string, string> = {
  "united states": "US",
  "united kingdom": "GB",
  philippines: "PH",
  kenya: "KE",
  ghana: "GH",
  nigeria: "NG",
  "south africa": "ZA",
  zimbabwe: "ZW",
  ethiopia: "ET",
  argentina: "AR",
  pakistan: "PK",
  bangladesh: "BD",
  zambia: "ZM",
  india: "IN",
  uganda: "UG",
  nepal: "NP",
  "the gambia": "GM",
  rwanda: "RW",
  canada: "CA",
  australia: "AU",
  ireland: "IE",
};
export function countryToIso2(country: string): string {
  const t = country.trim();
  if (t.length === 2) return t.toUpperCase();
  const key = t.toLowerCase();
  return COUNTRY_TO_ISO2[key] ?? t.slice(0, 2).toUpperCase();
}
