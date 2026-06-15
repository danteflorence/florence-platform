// The ONE unified scope catalog for the FlorenceRN Platform API gateway.
//
// Three vocabularies exist today and must converge: Core's role→scope derivation
// (roles.ts), Academy's OAuth scopes (florence-academy/api/src/types.ts), and ats's
// passport/opportunities/applications/ledger scopes (florence-ats-connect/server/
// api/v1/index.ts). The gateway gates on THIS catalog; SCOPE_SUPERSETS lets a broad
// grant satisfy a narrower need, and SCOPE_ALIASES maps legacy names so existing
// tokens keep working during the strangler migration. String-literal unions, NO enums.

export const UNIFIED_SCOPES = [
  // ── Passport (Core canonical) ─────────────────────────────────────────────
  "passport:read", // staff/service: read ANY audience (redaction proxy)
  "passport:read:self", "passport:read:internal", "passport:read:employer",
  "passport:read:candidate", "passport:read:lender", "passport:read:university",
  "passport:write",
  // ── Consent (Core canonical) ──────────────────────────────────────────────
  "consent:read", "consent:write",
  // ── Production Ledger / events (Core canonical) ───────────────────────────
  "ledger:read", "ledger:write",
  // ── Aggregates ────────────────────────────────────────────────────────────
  "control-tower:read", "investor:read", "university:read",
  // ── Model Gateway ─────────────────────────────────────────────────────────
  "model:run", "model:read",
  // ── Lender / financing (consent-gated, fair-lending-scoped) ───────────────
  "credit:read", "credit:decide", "lender:portfolio:read",
  // ── Opportunity / ATS Connect ─────────────────────────────────────────────
  "opportunities:read", "opportunities:interest:create",
  "applications:eligibility", "applications:submit", "packets:qa",
  "pricing:quote", "programs:read",
  // ── Academy (existing OAuth scope universe) ───────────────────────────────
  "candidates:read", "candidates:write", "enrollment:read", "enrollment:write",
  "performance:read", "performance:write", "payments:read", "payments:write",
  "outcomes:read", "outcomes:write", "employer:read", "schools:read", "schools:write",
  "pathway:read", "pathway:write", "webhooks:manage", "clients:manage", "tokens:mint",
  "cohorts:read", "cohorts:write", "leads:read", "leads:write", "outreach:read", "outreach:write",
] as const
export type UnifiedScope = (typeof UNIFIED_SCOPES)[number]

// A broad grant implies the narrower reads it covers. Holding the key satisfies any value.
export const SCOPE_SUPERSETS: Record<string, string[]> = {
  "passport:read": [
    "passport:read:self", "passport:read:internal", "passport:read:employer",
    "passport:read:candidate", "passport:read:lender", "passport:read:university",
  ],
  "ledger:write": ["ledger:read"],
  "consent:write": ["consent:read"],
}

// Legacy / cross-app aliases → the canonical scope they mean. Lets a token minted
// with an older name pass the gateway gate during migration.
export const SCOPE_ALIASES: Record<string, string> = {
  // ats's "internal" passport read maps to Core's full passport:read proxy grant.
  "passport:read:internal": "passport:read:internal",
  // Academy's pathway:write historically implied pathway read access too.
  "pathway:write": "pathway:write",
}

/** True if the held scope set satisfies `need` — directly, via an alias, or via a superset. */
export function scopeSatisfies(held: Iterable<string>, need: string): boolean {
  const set = held instanceof Set ? held : new Set(held)
  if (set.has(need)) return true
  const canonical = SCOPE_ALIASES[need]
  if (canonical && set.has(canonical)) return true
  for (const s of set) if (SCOPE_SUPERSETS[s]?.includes(need)) return true
  return false
}
