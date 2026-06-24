// In-process smoke for the onboarding-risk engine (no server, no DB): fold persistence
// of subscaleMastery + startSignals, stratify band logic (readiness baseline + escalate-only
// signals + insufficient-evidence), playbookFor dispatch, controlTower roll-up, and the
// passportView withholding of the internal-only onboarding facet.
//
//   node scripts/verify-onboarding-risk.ts

import { foldPassport } from "../src/passport.ts";
import type { Nurse, NurseEvent, NurseRef } from "../src/store.ts";
import { stratify } from "../src/onboardingRisk.ts";
import { playbookFor } from "../src/retentionPlaybook.ts";
import { controlTower, type NurseBundle } from "../src/controlTower.ts";
import { passportView } from "../src/passportView.ts";
import { classOf } from "../src/classification.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` - ${extra}` : ""}`);
  cond ? (pass += 1) : (fail += 1);
};

let t = 0;
const ev = (id: string, type: string, data: Record<string, unknown>): NurseEvent => ({ id: `e${t}`, nurse_id: id, type, source: "test", at: new Date(Date.UTC(2027, 0, 1, 0, 0, t++)).toISOString(), data, created_at: "" });
const fold = (id: string, events: NurseEvent[]) => foldPassport({ id, email: `${id}@x.com`, name: id, created_at: "", updated_at: "" } as Nurse, [] as NurseRef[], events);
const bundle = (id: string, events: NurseEvent[]): NurseBundle => ({ nurse: { id, email: `${id}@x.com`, name: id, created_at: "", updated_at: "" } as Nurse, refs: [] as NurseRef[], events });

// ── Fold persistence ─────────────────────────────────────────────────────────
const folded = fold("f1", [
  ev("f1", "academy.assessment_completed", { theta: 0.2, band: "yellow", mastery: [{ dim: "client_need", key: "pharm", theta: -0.5, passProb: 0.3, items: 8 }, { dim: "cjmm", key: "analyze", theta: 0.4, passProb: 0.6, items: 7 }] }),
  ev("f1", "onboarding.start_signal", { signal: "start_date_drift", value: 0.9, confidence: 0.9 }),
]);
ok("fold persists readiness.subscaleMastery (was dropped before)", (folded.readiness.subscaleMastery?.length ?? 0) === 2);
ok("fold persists onboarding.startSignals", folded.onboarding.startSignals.length === 1 && folded.onboarding.startSignals[0]?.signal === "start_date_drift");

const onlyNew = fold("f2", [
  ev("f2", "onboarding.start_signal", { signal: "candidate_silence", value: 1 }),
  ev("f2", "pathway.readiness_gate_applied", { decision: "allow", wouldBlock: false, shadow: true }),
  ev("f2", "onboarding.risk_assessed", { riskBand: "high", reasonCodes: ["x"] }),
  ev("f2", "academy.readiness_band_changed", { band: "green" }),
]);
ok("4 new event types fold to rank -1 (funnel unchanged: prospect/0)", onlyNew.funnelStage === "prospect" && onlyNew.funnelRank === 0);
ok("pathway.readiness_gate_applied folds into onboarding.readinessGate", onlyNew.onboarding.readinessGate?.shadow === true);

// ── stratify ─────────────────────────────────────────────────────────────────
const green = fold("g", [ev("g", "academy.assessment_completed", { band: "green", theta: 1 })]);
const rg = stratify(green);
ok("stratify green → low and band === baselineBand", rg.band === "low" && rg.band === rg.baselineBand);
const red = fold("r", [ev("r", "academy.assessment_completed", { band: "red", theta: -1 })]);
ok("stratify red → critical", stratify(red).band === "critical");
const yellowDrift = fold("yd", [ev("yd", "academy.assessment_completed", { band: "yellow", theta: 0.1 }), ev("yd", "onboarding.start_signal", { signal: "start_date_drift", value: 0.9, confidence: 1 })]);
const ryd = stratify(yellowDrift);
ok("stratify yellow + strong start_date_drift escalates above medium", ryd.band === "high" || ryd.band === "critical", ryd.band);
ok("escalation reason 'start_date_drift' recorded", ryd.reasonCodes.includes("start_date_drift"));
const yellowNoSig = stratify(fold("yn", [ev("yn", "academy.assessment_completed", { band: "yellow", theta: 0.1 })]));
ok("stratify never below baseline (yellow no-signal stays medium)", yellowNoSig.band === "medium" && yellowNoSig.band === yellowNoSig.baselineBand);
const insuff = stratify(fold("ins", [ev("ins", "academy.assessment_completed", { band: "green", theta: 1, mastery: [{ dim: "client_need", key: "pharm", theta: -0.5, passProb: 0.3, items: 2 }] })]));
ok("subscale items<minItems → 'insufficient_evidence', not 'weak_subscale'", insuff.reasonCodes.includes("insufficient_evidence") && !insuff.reasonCodes.includes("weak_subscale"));

// ── playbookFor ──────────────────────────────────────────────────────────────
ok("playbook low has NO manager_outreach", !playbookFor(rg).actions.some((a) => a.actionType === "manager_outreach"));
const critPb = playbookFor(stratify(red));
ok("playbook critical has manager_outreach priority 1", critPb.actions.some((a) => a.actionType === "manager_outreach" && a.priority === 1));
const twoGaps = stratify(fold("tg", [ev("tg", "academy.assessment_completed", { band: "orange", theta: -0.2, mastery: [{ dim: "client_need", key: "pharm", theta: -0.8, passProb: 0.2, items: 9 }, { dim: "cjmm", key: "analyze", theta: -0.3, passProb: 0.4, items: 9 }] })]));
const tgPb = playbookFor(twoGaps);
const nudges = tgPb.actions.filter((a) => a.actionType === "remediation_nudge");
ok("playbook: one remediation_nudge per gap (2)", nudges.length === 2);
ok("playbook: first nudge = lowest-theta gap (pharm)", nudges[0]?.gapType === "pharm", nudges[0]?.gapType);
ok("playbook: every contentRef matches /^[a-z0-9_.:-]+$/", tgPb.actions.every((a) => /^[a-z0-9_.:-]+$/.test(a.contentRef)));

// ── controlTower roll-up ─────────────────────────────────────────────────────
const ct = controlTower([
  bundle("cred", [ev("cred", "academy.assessment_completed", { band: "red", theta: -1 })]),
  bundle("cgr", [ev("cgr", "academy.assessment_completed", { band: "green", theta: 1 })]),
  bundle("cor", [ev("cor", "academy.assessment_completed", { band: "orange", theta: -0.2 })]),
], { feeUsd: 1750, now: "2027-01-01T00:00:00Z" });
ok("onboardingRisks.bandDistribution critical=1, low=1, high=1", ct.onboardingRisks.bandDistribution.critical === 1 && ct.onboardingRisks.bandDistribution.low === 1 && ct.onboardingRisks.bandDistribution.high === 1, JSON.stringify(ct.onboardingRisks.bandDistribution));
ok("onboardingRisks.highestRiskCount = 2 (high+critical)", ct.onboardingRisks.highestRiskCount === 2);
ok("atRiskRoster length 2, all in {high,critical}", ct.atRiskRoster.length === 2 && ct.atRiskRoster.every((r) => r.riskBand === "high" || r.riskBand === "critical"));
ok("recommendedActionsByBand.critical[0] = manager_outreach", ct.onboardingRisks.recommendedActionsByBand.critical[0]?.actionType === "manager_outreach");

// ── passportView withholding (internal-only facet) ───────────────────────────
const pv = fold("pv", [ev("pv", "academy.assessment_completed", { band: "green", theta: 1, mastery: [{ dim: "client_need", key: "pharm", theta: 0.5, passProb: 0.7, items: 8 }] }), ev("pv", "onboarding.start_signal", { signal: "manager_concern", value: 0.6 })]);
ok("internal_ops view INCLUDES onboarding", (passportView(pv, { audience: "internal_ops", internalRole: true }).passport as any).onboarding !== undefined);
for (const aud of ["employer", "lender", "instructor", "university", "investor"] as const) {
  const v = passportView(pv, { audience: aud, orgId: "x", consentOk: true });
  ok(`${aud} view WITHHOLDS onboarding`, !("onboarding" in (v.passport as any)) && v.withheld.some((w) => w.field === "onboarding"));
}
ok("classOf(onboarding.startSignals) = INTERNAL", classOf("onboarding.startSignals") === "INTERNAL");
ok("classOf(readiness.subscaleMastery) = RESTRICTED_EDUCATION", classOf("readiness.subscaleMastery") === "RESTRICTED_EDUCATION");

console.log(`\n${fail ? "ONBOARDING RISK FAILED" : "ONBOARDING RISK PASSED"} - ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
