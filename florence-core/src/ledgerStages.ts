// The canonical Production Ledger progression — ONE stage vocabulary spanning the
// academic funnel (Academy/Pathway) and the placement funnel (ATS), plus the
// billing/retention tail. `canonicalStage` derives a nurse's current stage from the
// folded Passport (its facets + funnelStage), returning the HIGHEST rung reached —
// mirroring foldPassport's "highest rung" rule. Pure + dependency-free, no enums.

import type { Passport } from "./passport.ts";

export const CANONICAL_STAGES = [
  "profile_created",
  "credentials_uploaded",
  "qualified_screened",
  "academy_active",
  "readiness_cleared",
  "nclex_att_active",
  "licensed_rn",
  "employer_ready_packet",
  "matched",
  "packet_shared",
  "interview",
  "offer",
  "offer_accepted",
  "start_scheduled",
  "started",
  "billing_active",
  "retained_30d",
  "retained_60d",
  "retained_90d",
  "term_complete",
  "repayment",
] as const;

export type CanonicalStage = (typeof CANONICAL_STAGES)[number];

export function canonicalRank(stage: CanonicalStage): number {
  return CANONICAL_STAGES.indexOf(stage);
}

const LICENSED = ["issued", "active", "licensed", "granted"];

// Predicates ordered HIGHEST → LOWEST. The first match wins. Stages with no spine
// event yet (qualified_screened, offer_accepted, start_scheduled) are reserved — they
// never match until their events exist, so they don't mis-rank. The retention tail (retained_60d,
// term_complete, repayment) is now event-sourced via the Passport.retention facet.
// The retention tail (repayment/term_complete) is driven by the Passport.retention facet;
// any future driver should OR-widen these predicates, not add duplicate RULES.
// employer_ready_packet = licensed AND a credential packet is present, but not yet
// matched into a placement (the gap between licensure and an active match).
const RULES: { stage: CanonicalStage; when: (p: Passport) => boolean }[] = [
  { stage: "repayment", when: (p) => Boolean(p.retention.repaymentAt) || p.placement.stage === "repayment" || p.funnelStage === "repayment" },
  { stage: "term_complete", when: (p) => Boolean(p.retention.termCompleteAt) || p.placement.stage === "term_complete" || p.funnelStage === "term_complete" },
  { stage: "retained_90d", when: (p) => Boolean(p.retention.retained90dAt) || p.placement.stage === "retained_90d" || p.funnelStage === "retained_90d" },
  { stage: "retained_60d", when: (p) => Boolean(p.retention.retained60dAt) || p.placement.stage === "retained_60d" || p.funnelStage === "retained_60d" },
  { stage: "retained_30d", when: (p) => Boolean(p.retention.retained30dAt) || p.placement.stage === "retained_30d" || p.funnelStage === "retained_30d" },
  { stage: "billing_active", when: (p) => Boolean(p.billing.subscriptionStartedAt) },
  { stage: "started", when: (p) => p.placement.stage === "started" || p.funnelStage === "started" },
  { stage: "offer", when: (p) => p.placement.stage === "offer" || p.funnelStage === "offer" },
  { stage: "interview", when: (p) => p.placement.stage === "interview" || p.funnelStage === "interview" },
  { stage: "packet_shared", when: (p) => p.placement.stage === "packet_submitted" || p.funnelStage === "packet_submitted" },
  { stage: "matched", when: (p) => p.placement.stage === "matched" || p.funnelStage === "matched" },
  { stage: "employer_ready_packet", when: (p) => LICENSED.includes(p.licensure.status ?? "") && Object.keys(p.documents).length > 0 && !p.placement.stage },
  { stage: "licensed_rn", when: (p) => LICENSED.includes(p.licensure.status ?? "") || p.funnelStage === "licensed" },
  { stage: "nclex_att_active", when: (p) => ["passed", "scheduled", "registered", "att_received"].includes(p.nclex.status ?? "") || p.funnelStage === "nclex_passed" },
  { stage: "readiness_cleared", when: (p) => ["green", "yellow"].includes(p.readiness.band ?? "") },
  { stage: "academy_active", when: (p) => p.readiness.lastAssessedAt !== undefined || p.funnelStage === "readiness_assessed" || p.funnelStage === "enrolled" },
  { stage: "credentials_uploaded", when: (p) => Object.keys(p.documents).length > 0 },
];

/** Stages that have a derivation predicate (reachable via canonicalStage). */
export const RULE_STAGES: CanonicalStage[] = RULES.map((r) => r.stage);
/** profile_created is the default (no predicate). */
export const DEFAULT_STAGE: CanonicalStage = "profile_created";
/** Reserved: no spine event yet, so intentionally not derivable until their events ship. */
export const RESERVED_STAGES: CanonicalStage[] = ["qualified_screened", "offer_accepted", "start_scheduled"];

/** The highest canonical stage a nurse has reached. Defaults to profile_created. */
export function canonicalStage(p: Passport): CanonicalStage {
  for (const r of RULES) if (r.when(p)) return r.stage;
  return "profile_created";
}

/** Group: which canonical stages count as "licensed and available" supply. */
export function isLicensedStage(s: CanonicalStage): boolean {
  return canonicalRank(s) >= canonicalRank("licensed_rn");
}
