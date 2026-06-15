// Data-classification model — the spine of the regulated-data security program.
//
// Every Passport field (and, by extension, every entity the platform stores) is
// assigned one of five data classes. The class drives BOTH redaction (which
// audience may see a field) and audit (which classes were actually disclosed on
// a read). This is the single source of truth the security feedback's directive
// #2 ("classify the data before building more features") asks for.
//
// Pure + dependency-free (no enums, Node strip-types safe). See
// docs/security/data-classification.md for the human-readable policy.

/** Five sensitivity tiers, least → most sensitive. */
export type DataClass =
  | "public" //                public job postings, public employer info
  | "internal_business" //     pricing, economics, funnel stage, ids, campaigns
  | "candidate_personal" //    name, email, readiness, NCLEX/licensure status
  | "restricted_pathway_financial" // visa/I-20, documents, financing/billing
  | "regulated_partner"; //    employer-bound placement, ATS/lender packet links

/** Higher rank = more sensitive. Used for ceiling checks + audit summarization. */
export const DATA_CLASS_RANK: Record<DataClass, number> = {
  public: 0,
  internal_business: 1,
  candidate_personal: 2,
  restricted_pathway_financial: 3,
  regulated_partner: 4,
};

export const ALL_DATA_CLASSES: readonly DataClass[] = [
  "public",
  "internal_business",
  "candidate_personal",
  "restricted_pathway_financial",
  "regulated_partner",
];

/**
 * Dotted Passport field-path → data class. Keys correspond to the leaves the
 * foldPassport reducer can emit (see passport.ts Passport interface). classOf()
 * does longest-prefix matching, so a parent path (e.g. "visa") covers all of its
 * children unless a child overrides it.
 */
export const PASSPORT_FIELD_CLASS: Record<string, DataClass> = {
  // identity
  nurseId: "internal_business",
  refs: "internal_business",
  name: "candidate_personal",
  email: "candidate_personal",
  // readiness / exam / licensure — personal but employer-relevant
  readiness: "candidate_personal",
  "readiness.subscaleMastery": "candidate_personal",
  "readiness.theta": "candidate_personal",
  "readiness.passProbability": "candidate_personal",
  "readiness.band": "candidate_personal",
  nclex: "candidate_personal",
  "nclex.status": "candidate_personal",
  "nclex.result": "candidate_personal",
  licensure: "candidate_personal",
  "licensure.status": "candidate_personal",
  "licensure.state": "candidate_personal",
  // restricted pathway / financial
  visa: "restricted_pathway_financial",
  "visa.stage": "restricted_pathway_financial",
  documents: "restricted_pathway_financial",
  billing: "restricted_pathway_financial",
  "billing.subscriptionStartedAt": "restricted_pathway_financial",
  // consent ledger + demand intel — internal
  consents: "internal_business",
  demand: "internal_business",
  // placement: stage/timing is internal; the bound employer identity is partner-restricted
  placement: "internal_business",
  "placement.stage": "internal_business",
  "placement.startDate": "internal_business",
  "placement.closed": "internal_business",
  "placement.employer": "regulated_partner",
  "placement.employerId": "regulated_partner",
  "placement.jobReqId": "regulated_partner",
  "placement.demandSource": "internal_business",
  // university-affiliation annotation (read-only; set by Academy, never event-folded)
  programs: "internal_business",
  // retention tail: milestone timing is internal; termination is a personal outcome
  retention: "internal_business",
  "retention.retained30dAt": "internal_business",
  "retention.retained60dAt": "internal_business",
  "retention.retained90dAt": "internal_business",
  "retention.termCompleteAt": "internal_business",
  "retention.repaymentAt": "restricted_pathway_financial",
  "retention.terminatedAt": "candidate_personal",
  // onboarding-risk inference — internal-operations only
  onboarding: "internal_business",
  "onboarding.riskBand": "internal_business",
  "onboarding.score": "internal_business",
  "onboarding.reasonCodes": "internal_business",
  "onboarding.startSignals": "internal_business",
  "onboarding.readinessGate": "internal_business",
  // funnel rollups — internal
  funnelStage: "internal_business",
  funnelRank: "internal_business",
  eventCount: "internal_business",
  updatedAt: "internal_business",
};

/**
 * Classify a dotted field path by longest-prefix match. Unknown paths default to
 * the MOST restrictive class (fail-closed) so a newly-added field is never
 * accidentally disclosed before it has been classified.
 */
export function classOf(fieldPath: string): DataClass {
  const direct = PASSPORT_FIELD_CLASS[fieldPath];
  if (direct) return direct;
  // walk up dotted segments: "a.b.c" → "a.b" → "a"
  const segs = fieldPath.split(".");
  for (let i = segs.length - 1; i > 0; i--) {
    const prefix = segs.slice(0, i).join(".");
    const hit = PASSPORT_FIELD_CLASS[prefix];
    if (hit) return hit;
  }
  return "regulated_partner";
}

/** True if `c` is at or below the `max` ceiling. */
export function classAtOrBelow(c: DataClass, max: DataClass): boolean {
  return DATA_CLASS_RANK[c] <= DATA_CLASS_RANK[max];
}

/** All known top-level Passport field paths whose class is at or below `max`. */
export function fieldsAtOrBelow(max: DataClass): string[] {
  return Object.keys(PASSPORT_FIELD_CLASS).filter((f) => classAtOrBelow(classOf(f), max));
}

/** Reduce a set of disclosed field paths to the distinct classes they touch (for audit). */
export function classesForFields(fieldPaths: string[]): DataClass[] {
  const seen = new Set<DataClass>();
  for (const f of fieldPaths) seen.add(classOf(f));
  return ALL_DATA_CLASSES.filter((c) => seen.has(c));
}
