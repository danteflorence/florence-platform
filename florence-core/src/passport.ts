// The Nurse Passport — a PROJECTION folded from the append-only nurse_events log.
// The log is the source of truth; this module is the single reducer that turns a
// nurse's cross-app event stream into one current-state Passport. Pure +
// dependency-free so it's trivially testable and can never drift from storage.
//
// CANONICAL EVENT VOCABULARY (emitted by the apps via POST /v1/nurse/event):
//   academy.enrolled              { cohort?, sectionPlan? }
//   academy.assessment_completed  { theta, passProbability, band, clientNeed?, mastery? }
//   academy.readiness_band_changed{ band, prevBand?, theta? }
//   academy.section_completed     { section }
//   pathway.nclex_status          { status: not_started|scheduled|passed|failed, scheduledFor?, result? }
//   pathway.licensure_status      { status, state }
//   pathway.visa_status           { stage, outcome?: approved|refused|administrative_processing|expired }
//   pathway.document_verified     { key }
//   consent.updated               { scope, status: granted|revoked }
//   ats.matched                   { employer?, employerId?, jobReqId? }
//   ats.packet_submitted          { employer, employerId, jobReqId }
//   ats.interview | ats.offer     { employer?, jobReqId? }
//   ats.started                   { employer?, startDate? }
//   university.job_matched | university.job_offered | university.job_started
//                                 { employerId, jobReqId?, universityOrgId?, startDate? }
//                                 (employer-backed only — no-op without employerId; marks demandSource='university')
//   ats.retention_30d | ats.retention_60d | ats.retention_90d
//   ats.term_complete             { }   (contract term completed, still employed)
//   billing.repayment_started     { }   (fires the canonical repayment funnel stage)
//   ats.rejected | ats.withdrawn  { reason? }
//   demand.link_clicked           { frnClickId, campaign?, jobId? }   (Demand Radar)
//   demand.job_viewed             { jobId?, campaign? }
//   demand.interest_registered    { jobId?, employer?, campaign? }
//   employment.offer_received     { employer? }      (reconciliation-sourced)
//   employment.started            { employer?, startDate? }
//   billing.subscription_started  { }
//   pathway.readiness_gate_applied{ decision, wouldBlock, band?, passProbability?, theta?, shadow }
//   onboarding.start_signal       { signal, value, confidence?, verifiedVia? }   (early at-risk signal)
//   onboarding.risk_assessed      { riskBand, score?, reasonCodes[] }            (computed stratification)
//   retention.90_day_confirmed    { employer? }

import type { Nurse, NurseEvent, NurseRef } from "./store.ts";

/** Funnel ladder — index = rank. funnelStage is the highest rung reached. */
export const FUNNEL_STAGES = [
  "prospect",
  "enrolled",
  "readiness_assessed",
  "nclex_passed",
  "licensed",
  "matched",
  "packet_submitted",
  "interview",
  "offer",
  "started",
  "retained_30d",
  "retained_60d",
  "retained_90d",
  "term_complete",
  "repayment",
] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export interface Passport {
  nurseId: string;
  email?: string;
  name?: string;
  refs: { app: string; externalId: string }[];
  readiness: {
    theta?: number;
    passProbability?: number;
    band?: string;
    lastAssessedAt?: string;
    /** Per-subscale mastery (by client_need / cjmm) folded from the assessment payload. */
    subscaleMastery?: { dim: string; key: string; theta: number; passProb: number; items: number }[];
  };
  nclex: { status?: string; scheduledFor?: string; result?: string; updatedAt?: string };
  licensure: { status?: string; state?: string; updatedAt?: string };
  visa: { stage?: string; outcome?: string; updatedAt?: string };
  documents: Record<string, boolean>;
  consents: Record<string, string>;
  placement: {
    stage?: string;
    employer?: string;
    employerId?: string;
    jobReqId?: string;
    startDate?: string;
    /** Demand source of this placement: 'university' when university-brokered. */
    demandSource?: string;
    closed?: "rejected" | "withdrawn";
    updatedAt?: string;
  };
  /** Demand Radar signal: tracked-link clicks + job interest (the pull side). */
  demand: {
    lastClickAt?: string;
    lastViewedAt?: string;
    lastInterestAt?: string;
    jobInterests: { jobId?: string; employer?: string; expressedAt: string }[];
    clickIds: string[];
    campaigns: string[];
  };
  billing: { subscriptionStartedAt?: string };
  /** Retention tail — timestamped milestone facts (cohort anchor stays placement.startDate). */
  retention: {
    retained30dAt?: string;
    retained60dAt?: string;
    retained90dAt?: string;
    termCompleteAt?: string;
    repaymentAt?: string;
    terminatedAt?: string;
  };
  /** Onboarding-risk facet — INTERNAL ONLY (never disclosed to partner audiences). */
  onboarding: {
    riskBand?: string;
    score?: number;
    lastAssessedAt?: string;
    reasonCodes?: string[];
    startSignals: { signal: string; value: number; confidence?: number; at: string }[];
    readinessGate?: { decision: string; wouldBlock: boolean; shadow: boolean; at: string };
  };
  funnelStage: FunnelStage;
  funnelRank: number;
  eventCount: number;
  updatedAt?: string;
}

const str = (d: Record<string, unknown>, k: string): string | undefined =>
  typeof d[k] === "string" ? (d[k] as string) : undefined;
const numOf = (d: Record<string, unknown>, k: string): number | undefined =>
  typeof d[k] === "number" ? (d[k] as number) : undefined;

/** Map an event to the funnel rung it implies (or -1 if it doesn't advance). */
function rankForEvent(e: NurseEvent): number {
  const d = e.data ?? {};
  switch (e.type) {
    case "academy.enrolled":
      return 1;
    case "academy.assessment_completed":
      return 2;
    case "pathway.nclex_status":
      return str(d, "status") === "passed" ? 3 : -1;
    case "pathway.licensure_status":
      return ["issued", "active", "licensed", "granted"].includes(str(d, "status") ?? "") ? 4 : -1;
    case "ats.matched":
      return 5;
    case "ats.packet_submitted":
      return 6;
    case "ats.interview":
      return 7;
    case "ats.offer":
      return 8;
    case "ats.started":
      return 9;
    // University-brokered placements advance the funnel ONLY when employer-backed.
    case "university.job_matched":
      return str(d, "employerId") ? 5 : -1;
    case "university.job_offered":
      return str(d, "employerId") ? 8 : -1;
    case "university.job_started":
      return str(d, "employerId") ? 9 : -1;
    case "ats.retention_30d":
      return 10;
    case "ats.retention_60d":
      return 11;
    case "ats.retention_90d":
      return 12;
    case "ats.term_complete":
      return 13;
    case "billing.repayment_started":
      return 14;
    // Demand Radar reconciliation can also source employment milestones.
    case "employment.offer_received":
      return 8;
    case "employment.started":
      return 9;
    case "retention.90_day_confirmed":
      return 12;
    default:
      return -1;
  }
}

/** Fold a nurse's events (oldest→newest) into the current Passport. */
export function foldPassport(nurse: Nurse, refs: NurseRef[], events: NurseEvent[]): Passport {
  const p: Passport = {
    nurseId: nurse.id,
    email: nurse.email,
    name: nurse.name,
    refs: refs.map((r) => ({ app: r.app, externalId: r.external_id })),
    readiness: {},
    nclex: {},
    licensure: {},
    visa: {},
    documents: {},
    consents: {},
    placement: {},
    demand: { jobInterests: [], clickIds: [], campaigns: [] },
    billing: {},
    retention: {},
    onboarding: { startSignals: [] },
    funnelStage: "prospect",
    funnelRank: 0,
    eventCount: events.length,
  };

  const ordered = [...events].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  let maxRank = 0;

  for (const e of ordered) {
    const d = e.data ?? {};
    switch (e.type) {
      case "academy.assessment_completed": {
        const mastery = Array.isArray(d.mastery)
          ? (d.mastery as Record<string, unknown>[]).map((m) => ({ dim: String(m.dim ?? ""), key: String(m.key ?? ""), theta: Number(m.theta ?? 0), passProb: Number(m.passProb ?? m.passProbability ?? 0), items: Number(m.items ?? 0) }))
          : p.readiness.subscaleMastery;
        p.readiness = {
          ...p.readiness,
          theta: numOf(d, "theta") ?? p.readiness.theta,
          passProbability: numOf(d, "passProbability") ?? p.readiness.passProbability,
          band: str(d, "band") ?? p.readiness.band,
          lastAssessedAt: e.at,
          ...(mastery ? { subscaleMastery: mastery } : {}),
        };
        break;
      }
      case "academy.readiness_band_changed":
        p.readiness = { ...p.readiness, band: str(d, "band") ?? p.readiness.band, ...(numOf(d, "theta") !== undefined ? { theta: numOf(d, "theta") } : {}) };
        break;
      case "pathway.readiness_gate_applied":
        p.onboarding.readinessGate = { decision: str(d, "decision") ?? "allow", wouldBlock: d.wouldBlock === true, shadow: d.shadow !== false, at: e.at };
        break;
      case "onboarding.start_signal": {
        const signal = str(d, "signal");
        if (signal) p.onboarding.startSignals.push({ signal, value: numOf(d, "value") ?? 0, ...(numOf(d, "confidence") !== undefined ? { confidence: numOf(d, "confidence") } : {}), at: e.at });
        break;
      }
      case "onboarding.risk_assessed":
        p.onboarding = {
          ...p.onboarding,
          riskBand: str(d, "riskBand") ?? p.onboarding.riskBand,
          score: numOf(d, "score") ?? p.onboarding.score,
          reasonCodes: Array.isArray(d.reasonCodes) ? (d.reasonCodes as unknown[]).map(String) : p.onboarding.reasonCodes,
          lastAssessedAt: e.at,
        };
        break;
      case "pathway.nclex_status":
        p.nclex = {
          status: str(d, "status") ?? p.nclex.status,
          scheduledFor: str(d, "scheduledFor") ?? p.nclex.scheduledFor,
          result: str(d, "result") ?? p.nclex.result,
          updatedAt: e.at,
        };
        break;
      case "pathway.licensure_status":
        p.licensure = { status: str(d, "status") ?? p.licensure.status, state: str(d, "state") ?? p.licensure.state, updatedAt: e.at };
        break;
      case "pathway.visa_status":
        p.visa = { stage: str(d, "stage") ?? p.visa.stage, outcome: str(d, "outcome") ?? p.visa.outcome, updatedAt: e.at };
        break;
      case "pathway.document_verified": {
        const key = str(d, "key");
        if (key) p.documents[key] = true;
        break;
      }
      case "consent.updated": {
        const scope = str(d, "scope");
        if (scope) p.consents[scope] = str(d, "status") ?? "granted";
        break;
      }
      case "ats.matched":
      case "ats.packet_submitted":
      case "ats.interview":
      case "ats.offer":
      case "ats.started":
        p.placement = {
          ...p.placement,
          stage: e.type.replace("ats.", ""),
          employer: str(d, "employer") ?? p.placement.employer,
          employerId: str(d, "employerId") ?? p.placement.employerId,
          jobReqId: str(d, "jobReqId") ?? p.placement.jobReqId,
          startDate: str(d, "startDate") ?? p.placement.startDate,
          updatedAt: e.at,
        };
        break;
      case "university.job_matched":
      case "university.job_offered":
      case "university.job_started": {
        const employerId = str(d, "employerId");
        if (!employerId) break; // billing-grade only: no-op without an employer-backed placement
        const stage = e.type === "university.job_started" ? "started" : e.type === "university.job_offered" ? "offer" : "matched";
        p.placement = {
          ...p.placement,
          stage,
          employerId,
          demandSource: "university",
          ...(str(d, "jobReqId") ? { jobReqId: str(d, "jobReqId") } : {}),
          ...(str(d, "startDate") ? { startDate: str(d, "startDate") } : {}),
          updatedAt: e.at,
        };
        break;
      }
      case "ats.retention_30d":
        p.placement = { ...p.placement, stage: "retention_30d", updatedAt: e.at };
        p.retention.retained30dAt = e.at;
        break;
      case "ats.retention_60d":
        p.placement = { ...p.placement, stage: "retention_60d", updatedAt: e.at };
        p.retention.retained60dAt = e.at;
        break;
      case "ats.retention_90d":
        p.placement = { ...p.placement, stage: "retention_90d", updatedAt: e.at };
        p.retention.retained90dAt = e.at;
        break;
      case "ats.term_complete":
        p.placement = { ...p.placement, stage: "term_complete", updatedAt: e.at };
        p.retention.termCompleteAt = e.at;
        break;
      case "billing.repayment_started":
        p.retention.repaymentAt = e.at;
        break;
      case "ats.rejected":
      case "ats.withdrawn":
        p.placement = { ...p.placement, closed: e.type.replace("ats.", "") as "rejected" | "withdrawn", updatedAt: e.at };
        if (e.type === "ats.withdrawn") p.retention.terminatedAt = e.at;
        break;
      case "demand.link_clicked": {
        const cid = str(d, "frnClickId") ?? str(d, "frn_click_id");
        if (cid && !p.demand.clickIds.includes(cid)) p.demand.clickIds.push(cid);
        const c = str(d, "campaign");
        if (c && !p.demand.campaigns.includes(c)) p.demand.campaigns.push(c);
        p.demand.lastClickAt = e.at;
        break;
      }
      case "demand.job_viewed":
        p.demand.lastViewedAt = e.at;
        break;
      case "demand.interest_registered": {
        p.demand.jobInterests.push({ jobId: str(d, "jobId"), employer: str(d, "employer"), expressedAt: e.at });
        const c = str(d, "campaign");
        if (c && !p.demand.campaigns.includes(c)) p.demand.campaigns.push(c);
        p.demand.lastInterestAt = e.at;
        break;
      }
      case "employment.offer_received":
        p.placement = { ...p.placement, stage: "offer", employer: str(d, "employer") ?? p.placement.employer, updatedAt: e.at };
        break;
      case "employment.started":
        p.placement = { ...p.placement, stage: "started", employer: str(d, "employer") ?? p.placement.employer, startDate: str(d, "startDate") ?? p.placement.startDate, updatedAt: e.at };
        break;
      case "retention.90_day_confirmed":
        p.placement = { ...p.placement, stage: "retained_90d", updatedAt: e.at };
        p.retention.retained90dAt = e.at;
        break;
      case "billing.subscription_started":
        p.billing = { subscriptionStartedAt: e.at };
        break;
      default:
        break;
    }
    const r = rankForEvent(e);
    if (r > maxRank) maxRank = r;
    p.updatedAt = e.at;
  }

  p.funnelRank = maxRank;
  p.funnelStage = FUNNEL_STAGES[maxRank] ?? "prospect";
  return p;
}
