// Gateway module: Lender Data API. Lets a CONSENTED, org-bound partner bank read a
// fair-lending credit-decision package for a nurse, subscribe to a consent-scoped
// continuous feed, pull a warehouse pool-performance report, and write back credit
// decisions / adverse-action / data-dispute records. Architected lender-agnostic:
// FlorenceRN's own future bank is just another `lender` org on these same endpoints.
//
// Every disclosure is CONSENT-GATED (purpose=underwriting, recipient_org_id = the bank),
// FAIR-LENDING-SCOPED (no visa/nationality), and AUDITED. Built deterministically.
import { compileGw, type GwCtx, type GwRoute } from "../router.ts";
import type { Store, CreditDecision, DataDispute } from "../../store.ts";
import type { Audit } from "../../audit.ts";
import { readPassportView } from "../../passportRead.ts";
import { lookupNurse, recordEvent } from "../../nurses.ts";
import { consentAllows } from "../../consent.ts";
import { creditDecisionPackage } from "../../creditDecision.ts";
import { isRole, STAFF_ROLES, type Role } from "../../roles.ts";
import { foldPassport } from "../../passport.ts";
import { canonicalStage } from "../../ledgerStages.ts";
import { id, nowIso } from "../../util.ts";
import { actorFromClaims, authorizeTenantAccessWithAudit } from "../../tenantAccess.ts";

const DECISIONS = new Set(["approved", "denied", "pending", "withdrawn"]);
// The events a warehouse bank underwrites a facility against (income starts → retained → repaid).
const LOAN_PERF_EVENTS = new Set([
  "ats.started", "billing.subscription_started", "ats.retention_30d", "ats.retention_60d",
  "ats.retention_90d", "retention.90_day_confirmed", "ats.term_complete", "billing.repayment_started", "credit.decision",
]);
const PORTFOLIO_MIN_CELL = 5; // k-anonymity: suppress aggregates below this cohort size
function isStaffClaims(claims: GwCtx["claims"]): boolean {
  const rs = Array.isArray(claims?.roles) ? claims!.roles : claims?.role ? [claims.role] : [];
  return rs.some((r) => (STAFF_ROLES as readonly string[]).includes(r));
}

/** An org-bound M2M bank token acts AS a lender; a human lender user already is one. */
function lenderRole(claims: GwCtx["claims"]): Role {
  let role: Role = isRole(String(claims?.role ?? "")) ? (claims!.role as Role) : "candidate";
  if (role === "service" && claims?.org_id) role = "lender";
  return role;
}
const actorOf = (claims: GwCtx["claims"]) => String(claims?.email ?? claims?.sub ?? "service");
const scopesOf = (claims: GwCtx["claims"]) => String(claims?.scope ?? "").split(/\s+/).filter(Boolean);
const denied = (reason: string) => ({ status: 403, body: { error: "forbidden", reason } });
function lenderActor(claims: GwCtx["claims"]) {
  return { ...actorFromClaims(claims), role: lenderRole(claims), partnerOrgKind: "lender" as const };
}

export function lenderModule(store: Store, audit: Audit): GwRoute[] {
  return [
    // The fair-lending credit-decision package for one nurse (consent-gated, no visa/nationality).
    compileGw({
      method: "GET",
      pattern: "/v1/nurses/:id/credit-data",
      auth: true,
      scope: "credit:read",
      summary: "Fair-lending credit-decision package for a nurse (consent-gated; excludes national-origin/visa).",
      handler: async (ctx) => {
        const claims = ctx.claims!;
        const role = lenderRole(claims);
        // Resolve the consented lender Passport view first (this enforces scope + consent + policy).
        const view = await readPassportView(store, audit, {
          selector: { nurseId: ctx.params.id },
          role,
          scopes: scopesOf(claims),
          ...(claims.org_id ? { orgId: claims.org_id } : {}),
          actor: actorOf(claims),
          requestedAudience: "lender",
          purpose: "underwriting",
        });
        if (view.status !== 200) return view; // 401/403/404 pass through (fail-closed)
        // Close the allowed_fields gap: intersect with the candidate's consent + the
        // fair-lending allowlist, dropping prohibited-basis fields unconditionally.
        const nurse = await lookupNurse(store, { nurseId: ctx.params.id });
        const allowed = nurse ? consentAllows(await store.consentsByNurse(nurse.id), "underwriting", claims.org_id).allowedFields : undefined;
        const pkg = creditDecisionPackage(view.body as Record<string, unknown>, allowed);
        await audit(actorOf(claims), "credit_data.read", "nurse", ctx.params.id, {
          org: claims.org_id, droppedProhibited: pkg.droppedProhibited, droppedByConsent: pkg.droppedByConsent.length,
        });
        await audit(actorOf(claims), "lender_packet.view", "nurse", ctx.params.id, {
          org: claims.org_id,
          purpose: "underwriting",
          source: "credit_data",
        });
        return { status: 200, body: { nurseId: ctx.params.id, creditData: pkg.fields, excluded: { prohibitedBasis: pkg.droppedProhibited, byConsent: pkg.droppedByConsent } } };
      },
    }),

    // Record a credit decision (a `denied` decision is the ECOA/FCRA adverse-action basis).
    compileGw({
      method: "POST",
      pattern: "/v1/credit-decisions",
      auth: true,
      scope: "credit:decide",
      idempotent: true,
      summary: "Record a lender credit decision (denial requires reason_codes — ECOA/FCRA adverse action).",
      handler: async (ctx) => {
        const claims = ctx.claims!;
        const orgId = claims.org_id;
        if (!orgId) return { status: 400, body: { error: "an org-bound lender token is required" } };
        const b = (ctx.body ?? {}) as Record<string, unknown>;
        const nurseId = typeof b.nurseId === "string" ? b.nurseId : typeof b.candidate_id === "string" ? b.candidate_id : undefined;
        const decision = typeof b.decision === "string" ? b.decision : undefined;
        if (!nurseId || !decision || !DECISIONS.has(decision)) return { status: 400, body: { error: "nurseId + decision (approved|denied|pending|withdrawn) required" } };
        const nurse = await lookupNurse(store, { nurseId });
        if (!nurse) return { status: 404, body: { error: "nurse_not_found" } };
        const consentOk = consentAllows(await store.consentsByNurse(nurse.id), "underwriting", orgId).ok;
        const access = await authorizeTenantAccessWithAudit(audit, {
          actor: lenderActor(claims),
          action: "write",
          purpose: "underwriting",
          resource: { type: "lender_packet", id: nurse.id, ownerOrgId: orgId, consentOk, dataClass: "RESTRICTED_FINANCING" },
        });
        if (!access.allow) return denied(access.reason);
        const reasonCodes = Array.isArray(b.reason_codes) ? (b.reason_codes as unknown[]).filter((x): x is string => typeof x === "string") : [];
        if (decision === "denied" && reasonCodes.length === 0) return { status: 400, body: { error: "reason_codes required for a denial (ECOA/FCRA adverse action)" } };
        const rec: CreditDecision = {
          id: id("cd"), nurse_id: nurse.id, lender_org_id: orgId, decision: decision as CreditDecision["decision"],
          reason_codes: reasonCodes, ...(typeof b.amount_usd === "number" ? { amount_usd: b.amount_usd } : {}),
          decided_by: actorOf(claims), ...(decision === "denied" ? { adverse_action_at: nowIso() } : {}), created_at: nowIso(),
        };
        await store.insertCreditDecision(rec);
        await recordEvent(store, nurse.id, { type: "credit.decision", source: "lender", data: { decision, org: orgId, decisionId: rec.id } });
        await audit(actorOf(claims), "credit.decision", "nurse", nurse.id, { decision, org: orgId, reasonCodes: reasonCodes.length });
        return { status: 201, body: { id: rec.id, nurseId: nurse.id, decision, ...(rec.adverse_action_at ? { adverseActionAt: rec.adverse_action_at } : {}) } };
      },
    }),

    // Stamp the adverse-action notice for a denied decision.
    compileGw({
      method: "POST",
      pattern: "/v1/credit-decisions/:id/adverse-action",
      auth: true,
      scope: "credit:decide",
      summary: "Mark the adverse-action notice as issued for a denied credit decision.",
      handler: async (ctx) => {
        const claims = ctx.claims!;
        const d = await store.getCreditDecision(ctx.params.id);
        if (!d) return { status: 404, body: { error: "decision_not_found" } };
        const access = await authorizeTenantAccessWithAudit(audit, {
          actor: lenderActor(claims),
          action: "write",
          purpose: "underwriting",
          resource: { type: "lender_packet", id: d.id, ownerOrgId: d.lender_org_id, consentOk: true, dataClass: "RESTRICTED_FINANCING" },
        });
        if (!access.allow) return denied(access.reason);
        if (d.decision !== "denied") return { status: 409, body: { error: "adverse action applies only to a denied decision" } };
        const at = nowIso();
        await store.updateCreditDecision(d.id, { adverse_action_at: at });
        await audit(actorOf(ctx.claims), "credit.adverse_action", "nurse", d.nurse_id, { decisionId: d.id, reasonCodes: d.reason_codes });
        return { status: 200, body: { id: d.id, adverseActionAt: at, reasonCodes: d.reason_codes } };
      },
    }),

    // List a nurse's credit decisions for the calling lender org.
    compileGw({
      method: "GET",
      pattern: "/v1/nurses/:id/credit-decisions",
      auth: true,
      scope: "credit:read",
      summary: "List the calling lender's credit decisions for a nurse.",
      handler: async (ctx) => {
        const claims = ctx.claims!;
        const nurse = await lookupNurse(store, { nurseId: ctx.params.id });
        if (!nurse) return { status: 404, body: { error: "nurse_not_found" } };
        const access = await authorizeTenantAccessWithAudit(audit, {
          actor: lenderActor(claims),
          action: "read",
          purpose: "underwriting",
          resource: { type: "lender_packet", id: nurse.id, ownerOrgId: claims.org_id, consentOk: true, dataClass: "RESTRICTED_FINANCING" },
        });
        if (!access.allow) return denied(access.reason);
        const all = await store.creditDecisionsByNurse(nurse.id);
        const mine = claims.org_id ? all.filter((d) => d.lender_org_id === claims.org_id) : all;
        return { status: 200, body: { nurseId: nurse.id, decisions: mine } };
      },
    }),

    // Candidate-initiated data-accuracy dispute (FCRA). Staff or the candidate themselves.
    compileGw({
      method: "POST",
      pattern: "/v1/disputes",
      auth: true,
      scope: null,
      summary: "Raise a data-accuracy dispute on a Passport field (FCRA). Staff or the candidate.",
      handler: async (ctx) => {
        const claims = ctx.claims!;
        const b = (ctx.body ?? {}) as Record<string, unknown>;
        const nurseId = typeof b.nurseId === "string" ? b.nurseId : undefined;
        const field = typeof b.field === "string" ? b.field : undefined;
        const claim = typeof b.claim === "string" ? b.claim : undefined;
        if (!nurseId || !field || !claim) return { status: 400, body: { error: "nurseId + field + claim required" } };
        const nurse = await lookupNurse(store, { nurseId });
        if (!nurse) return { status: 404, body: { error: "nurse_not_found" } };
        if (!isStaffClaims(claims) && claims.cand !== nurse.id) return { status: 403, body: { error: "only the candidate or staff may raise a dispute" } };
        const rec: DataDispute = { id: id("disp"), nurse_id: nurse.id, field, claim, status: "open", raised_by: actorOf(claims), created_at: nowIso() };
        await store.insertDataDispute(rec);
        await audit(actorOf(claims), "data.dispute_raised", "nurse", nurse.id, { field });
        return { status: 201, body: { id: rec.id, nurseId: nurse.id, field, status: "open" } };
      },
    }),

    // List a nurse's disputes (staff or the candidate themselves).
    compileGw({
      method: "GET",
      pattern: "/v1/nurses/:id/disputes",
      auth: true,
      scope: null,
      summary: "List data-accuracy disputes for a nurse (staff or the candidate).",
      handler: async (ctx) => {
        const claims = ctx.claims!;
        const nurse = await lookupNurse(store, { nurseId: ctx.params.id });
        if (!nurse) return { status: 404, body: { error: "nurse_not_found" } };
        if (!isStaffClaims(claims) && claims.cand !== nurse.id) return { status: 403, body: { error: "forbidden" } };
        return { status: 200, body: { nurseId: nurse.id, disputes: await store.disputesByNurse(nurse.id) } };
      },
    }),

    // Continuous feed (pull): loan-performance events across the org's consented nurses.
    compileGw({
      method: "GET",
      pattern: "/v1/lender/events",
      auth: true,
      scope: "credit:read",
      summary: "Loan-performance events (started/retained/repaid) across the lender's consented nurses.",
      handler: async (ctx) => {
        const orgId = ctx.claims?.org_id;
        if (!orgId) return { status: 400, body: { error: "an org-bound lender token is required" } };
        const limit = Math.max(1, Math.min(500, Number(ctx.query.get("limit") ?? "100")));
        const bundles = await store.allNurseBundles();
        const events: { nurseId: string; type: string; at: string }[] = [];
        for (const b of bundles) {
          if (!consentAllows(await store.consentsByNurse(b.nurse.id), "underwriting", orgId).ok) continue;
          for (const e of b.events) if (LOAN_PERF_EVENTS.has(e.type)) events.push({ nurseId: b.nurse.id, type: e.type, at: e.at });
        }
        events.sort((a, z) => (a.at < z.at ? 1 : -1));
        await audit(actorOf(ctx.claims), "lender.feed.read", "org", orgId, { count: events.length });
        return { status: 200, body: { org: orgId, events: events.slice(0, limit) } };
      },
    }),

    // Warehouse pool-performance report (aggregate, k-anonymized).
    compileGw({
      method: "GET",
      pattern: "/v1/lender/portfolio",
      auth: true,
      scope: "lender:portfolio:read",
      summary: "Aggregate pool performance across the lender's consented cohort (k-anonymized).",
      handler: async (ctx) => {
        const orgId = ctx.claims?.org_id;
        if (!orgId) return { status: 400, body: { error: "an org-bound lender token is required" } };
        const bundles = await store.allNurseBundles();
        const byStage: Record<string, number> = {};
        const retention = { d30: 0, d60: 0, d90: 0, termComplete: 0, repayment: 0 };
        const decisions = { approved: 0, denied: 0, pending: 0, withdrawn: 0 };
        let cohort = 0;
        for (const b of bundles) {
          if (!consentAllows(await store.consentsByNurse(b.nurse.id), "underwriting", orgId).ok) continue;
          cohort += 1;
          const p = foldPassport(b.nurse, b.refs, b.events);
          byStage[canonicalStage(p)] = (byStage[canonicalStage(p)] ?? 0) + 1;
          if (p.retention.retained30dAt) retention.d30 += 1;
          if (p.retention.retained60dAt) retention.d60 += 1;
          if (p.retention.retained90dAt) retention.d90 += 1;
          if (p.retention.termCompleteAt) retention.termComplete += 1;
          if (p.retention.repaymentAt) retention.repayment += 1;
          for (const d of await store.creditDecisionsByNurse(b.nurse.id)) {
            if (d.lender_org_id === orgId && d.decision in decisions) decisions[d.decision as keyof typeof decisions] += 1;
          }
        }
        await audit(actorOf(ctx.claims), "lender.portfolio.read", "org", orgId, { cohort });
        if (cohort < PORTFOLIO_MIN_CELL) return { status: 200, body: { org: orgId, cohortSize: cohort, suppressed: true, note: `cohort below the k-anonymity threshold (${PORTFOLIO_MIN_CELL})` } };
        return { status: 200, body: { org: orgId, cohortSize: cohort, byStage, retention, decisions } };
      },
    }),

    // Loan tape: per-consented-nurse performance rows (no prohibited-basis).
    compileGw({
      method: "GET",
      pattern: "/v1/lender/loan-tape",
      auth: true,
      scope: "lender:portfolio:read",
      summary: "Loan-level tape across the lender's consented nurses (no national-origin/visa).",
      handler: async (ctx) => {
        const orgId = ctx.claims?.org_id;
        if (!orgId) return { status: 400, body: { error: "an org-bound lender token is required" } };
        const bundles = await store.allNurseBundles();
        const rows: Record<string, unknown>[] = [];
        for (const b of bundles) {
          if (!consentAllows(await store.consentsByNurse(b.nurse.id), "underwriting", orgId).ok) continue;
          const p = foldPassport(b.nurse, b.refs, b.events);
          const myDecisions = (await store.creditDecisionsByNurse(b.nurse.id)).filter((d) => d.lender_org_id === orgId);
          rows.push({
            nurseId: b.nurse.id,
            currentStage: canonicalStage(p),
            startedAt: p.billing.subscriptionStartedAt ?? null,
            retained90: Boolean(p.retention.retained90dAt),
            termComplete: Boolean(p.retention.termCompleteAt),
            repaymentStartedAt: p.retention.repaymentAt ?? null,
            latestDecision: myDecisions.length ? myDecisions[myDecisions.length - 1]!.decision : null,
          });
        }
        await audit(actorOf(ctx.claims), "lender.loan_tape.read", "org", orgId, { rows: rows.length });
        return { status: 200, body: { org: orgId, loans: rows } };
      },
    }),
  ];
}
