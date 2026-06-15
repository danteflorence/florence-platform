// passportView — the single, canonical redactor. Turns the ONE folded Passport
// into a per-audience, minimum-necessary projection so no partner ever receives
// the full nurse record. This is the security feedback's "single highest-leverage
// decision": the Passport is a permissions-controlled VIEW, not a row everyone
// can read.
//
// Generalizes the proven ATS data-minimization pattern (florence-ats-connect/
// shared/packet.ts sharedFields/withheldFields with legal reasons) and the
// k-anonymized Academy partner projections (api/src/partners.ts) into one place.
//
// Pure + dependency-free. The route (routes.ts GET /v1/nurse/passport) computes
// consent + the policy decision, then calls this to build the response body.

import type { Passport } from "./passport.ts";
import { classesForFields } from "./classification.ts";

export type Audience =
  | "self" //          the nurse's own full record
  | "internal_ops" //  Florence staff / trusted service — full
  | "instructor" //    faculty — readiness/remediation, no placement/visa/financial
  | "employer" //      licensed-RN packet; NEVER visa/financing/other-employer placement
  | "lender" //        consented financing + readiness summary + offer-backed status
  | "university" //    consented named-student academic view (aggregates live elsewhere)
  | "investor"; //     de-identified funnel rollup only — zero PII

export interface ViewContext {
  audience: Audience;
  /** The caller's org (employer/lender/university) — scopes placement disclosure. */
  orgId?: string;
  purpose?: string;
  /** Whether a live consent exists for this (audience, org) — consent-gated audiences. */
  consentOk?: boolean;
}

export interface Withheld {
  field: string;
  reason: string;
}

export interface PassportView {
  view: Audience;
  passport: Record<string, unknown>;
  withheld: Withheld[];
  /** Distinct data classes actually present in `passport` — recorded in the audit log. */
  classesReturned: ReturnType<typeof classesForFields>;
  consentApplied?: { purpose: string };
}

// Standard legal/operational reasons (mirrors packet.ts withheldFields).
const R = {
  nationality: "National-origin data withheld (Title VII / IRCA)",
  visa: "Immigration / visa status withheld for this audience",
  financing: "Financing / underwriting data out of scope for this audience",
  documents: "Source documents withheld for this audience",
  otherEmployer: "Placement at another employer withheld (tenant isolation)",
  rawScores: "Raw ability scores withheld — band only shared",
  consent: "Disclosure requires a live candidate consent that is not present",
  pii: "Personally-identifying data withheld for this audience",
  retention: "Retention / employment-tenure detail is internal-operations only for this audience",
  onboarding: "Onboarding-risk inference is internal-operations only",
  subscaleMastery: "Per-subscale ability detail withheld — band only shared",
};

const FULL_SENSITIVE: Withheld[] = [
  { field: "visa", reason: R.visa },
  { field: "documents", reason: R.documents },
  { field: "billing", reason: R.financing },
];

/** Distinct, de-identified funnel rollup — safe for investor / no-consent stubs. */
function funnelStub(p: Passport): Record<string, unknown> {
  return { funnelStage: p.funnelStage, funnelRank: p.funnelRank };
}

function build(view: Audience, passport: Record<string, unknown>, withheld: Withheld[], consentApplied?: { purpose: string }): PassportView {
  const out: PassportView = {
    view,
    passport,
    withheld,
    classesReturned: classesForFields(Object.keys(passport)),
  };
  if (consentApplied) out.consentApplied = consentApplied;
  return out;
}

/**
 * Project a folded Passport down to the audience's minimum-necessary view.
 * Fail-closed: unknown audiences fall through to the investor (de-identified) stub.
 */
export function passportView(p: Passport, ctx: ViewContext): PassportView {
  switch (ctx.audience) {
    case "self":
    case "internal_ops":
      // Full record, no redaction. (Staff/service reads are still audited upstream.)
      return build(ctx.audience, { ...p }, []);

    case "instructor":
      // Readiness + exam/licensure status for teaching. No placement, visa, financial.
      return build("instructor", {
        nurseId: p.nurseId,
        name: p.name,
        readiness: p.readiness,
        nclex: { status: p.nclex.status, updatedAt: p.nclex.updatedAt },
        licensure: p.licensure,
        funnelStage: p.funnelStage,
      }, [
        { field: "visa", reason: R.visa },
        { field: "documents", reason: R.documents },
        { field: "billing", reason: R.financing },
        { field: "placement", reason: "Placement detail withheld from faculty view" },
        { field: "retention", reason: R.retention },
        { field: "onboarding", reason: R.onboarding },
        { field: "financing", reason: R.financing },
      ]);

    case "employer": {
      if (!ctx.consentOk) {
        return build("employer", funnelStub(p), [{ field: "*", reason: R.consent }]);
      }
      // Licensed-RN packet: band (not raw theta), NCLEX + license status, name.
      // Placement disclosed ONLY if it is THIS employer's (tenant isolation).
      const ownPlacement = ctx.orgId && p.placement.employerId === ctx.orgId;
      const view: Record<string, unknown> = {
        nurseId: p.nurseId,
        name: p.name,
        readiness: { band: p.readiness.band, lastAssessedAt: p.readiness.lastAssessedAt },
        nclex: { status: p.nclex.status },
        licensure: { status: p.licensure.status, state: p.licensure.state },
        funnelStage: p.funnelStage,
      };
      if (ownPlacement) view.placement = { stage: p.placement.stage, startDate: p.placement.startDate };
      // Retention/tenure is disclosed ONLY for this employer's own placement.
      if (ownPlacement) view.retention = p.retention;
      return build("employer", view, [
        { field: "nationality", reason: R.nationality },
        { field: "visa", reason: R.visa },
        { field: "documents", reason: R.documents },
        { field: "billing", reason: R.financing },
        { field: "readiness.theta", reason: R.rawScores },
        { field: "readiness.subscaleMastery", reason: R.subscaleMastery },
        { field: "onboarding", reason: R.onboarding },
        { field: "financing", reason: R.financing },
        ...(ownPlacement ? [] : [{ field: "placement.employer", reason: R.otherEmployer }, { field: "retention", reason: R.otherEmployer }]),
      ], { purpose: ctx.purpose ?? "employer_share" });
    }

    case "lender": {
      if (!ctx.consentOk) {
        return build("lender", funnelStub(p), [{ field: "*", reason: R.consent }]);
      }
      // Consented financing view: readiness summary, pathway/visa timing, billing,
      // and offer-backed status. No other-employer comments / partner free-text.
      return build("lender", {
        nurseId: p.nurseId,
        name: p.name,
        readiness: { band: p.readiness.band, passProbability: p.readiness.passProbability },
        nclex: { status: p.nclex.status },
        licensure: { status: p.licensure.status, state: p.licensure.state },
        visa: { stage: p.visa.stage },
        billing: p.billing,
        placement: { stage: p.placement.stage }, // offer-backed status, no employer identity
        // Retention MILESTONE status only (a reached 90-day milestone is underwriting-
        // relevant). Termination is withheld — a negative employment fact (policy-gated).
        retention: {
          retained30dAt: p.retention.retained30dAt,
          retained60dAt: p.retention.retained60dAt,
          retained90dAt: p.retention.retained90dAt,
          termCompleteAt: p.retention.termCompleteAt,
        },
        funnelStage: p.funnelStage,
      }, [
        { field: "placement.employer", reason: R.otherEmployer },
        { field: "documents", reason: R.documents },
        { field: "readiness.theta", reason: R.rawScores },
        { field: "readiness.subscaleMastery", reason: R.subscaleMastery },
        { field: "onboarding", reason: R.onboarding },
        { field: "retention.terminatedAt", reason: R.retention },
      ], { purpose: ctx.purpose ?? "underwriting" });
    }

    case "university": {
      if (!ctx.consentOk) {
        return build("university", funnelStub(p), [{ field: "*", reason: R.consent }]);
      }
      // Named-student academic view (cohort aggregates are a separate endpoint).
      return build("university", {
        nurseId: p.nurseId,
        name: p.name,
        readiness: { band: p.readiness.band },
        nclex: { status: p.nclex.status },
        licensure: { status: p.licensure.status, state: p.licensure.state },
        funnelStage: p.funnelStage,
      }, [
        { field: "visa", reason: R.visa },
        { field: "documents", reason: R.documents },
        { field: "billing", reason: R.financing },
        { field: "placement", reason: R.otherEmployer },
        { field: "retention", reason: R.retention },
        { field: "onboarding", reason: R.onboarding },
        { field: "financing", reason: R.financing },
      ], { purpose: ctx.purpose ?? "education" });
    }

    case "investor":
    default:
      // De-identified rollup only. No nurseId, name, email — ever.
      return build("investor", funnelStub(p), [{ field: "identity", reason: R.pii }, ...FULL_SENSITIVE, { field: "onboarding", reason: R.onboarding }, { field: "financing", reason: R.financing }]);
  }
}
