// Security-spine smoke — deterministic, in-process (no server). Proves the five
// load-bearing controls of the regulated-data security program:
//   1. Data classification drives redaction
//   2. The employer view omits visa/financing (Title VII/IRCA) — band only
//   3. Consent-gated audiences (lender) disclose ONLY with a live consent
//   4. The audit log is tamper-evident (chain verifies; any edit breaks it) + reads are logged
//   5. Purpose-based policy (ABAC) enforces role × purpose × consent × class
//
//   node scripts/verify-security-spine.ts

import { foldPassport } from "../src/passport.ts";
import type { Nurse, NurseEvent, NurseRef } from "../src/store.ts";
import { MemoryStore } from "../src/store.ts";
import { classOf } from "../src/classification.ts";
import { passportView } from "../src/passportView.ts";
import { evaluatePolicy, isPurposeAllowed } from "../src/policy.ts";
import { grantConsent, revokeConsentById, consentAllows } from "../src/consent.ts";
import { makeAudit } from "../src/audit.ts";
import { verifyAuditChain, verifyChain } from "../src/auditVerify.ts";
import { bulkReadAlert } from "../src/auditAlerts.ts";
import { nowIso } from "../src/util.ts";

let pass = 0;
let fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
  cond ? (pass += 1) : (fail += 1);
};

// ── Build a representative folded Passport ─────────────────────────────────────
const nurse: Nurse = { id: "nrs_test", email: "maria@example.com", name: "Maria Santos", created_at: nowIso(), updated_at: nowIso() };
const refs: NurseRef[] = [{ app: "ats", external_id: "ats-1", nurse_id: nurse.id, created_at: nowIso() }];
const ev = (type: string, data: Record<string, unknown>): NurseEvent => ({ id: "e", nurse_id: nurse.id, type, source: "test", at: nowIso(), data, created_at: nowIso() });
const passport = foldPassport(nurse, refs, [
  ev("academy.assessment_completed", { theta: 0.9, passProbability: 0.9, band: "green" }),
  ev("pathway.nclex_status", { status: "passed" }),
  ev("pathway.licensure_status", { status: "issued", state: "CA" }),
  ev("pathway.visa_status", { stage: "ds160_filed" }),
  ev("billing.subscription_started", {}),
  ev("ats.started", { employer: "Sutter Health", employerId: "emp-1", startDate: "2027-01-15" }),
]);
// Separate passport carrying a retention milestone (kept apart so the placement-stage
// assertions above stay byte-exact).
const passportR = foldPassport(nurse, refs, [
  ev("pathway.licensure_status", { status: "issued", state: "CA" }),
  ev("ats.started", { employer: "Sutter Health", employerId: "emp-1", startDate: "2027-01-15" }),
  ev("billing.subscription_started", {}),
  ev("ats.retention_30d", {}),
]);

// ── 1. classification ──────────────────────────────────────────────────────────
ok("classOf(visa.stage) = restricted_pathway_financial", classOf("visa.stage") === "restricted_pathway_financial");
ok("classOf(readiness.band) = candidate_personal", classOf("readiness.band") === "candidate_personal");
ok("classOf(placement.employerId) = regulated_partner", classOf("placement.employerId") === "regulated_partner");
ok("classOf(unknown.new.field) defaults most-restrictive", classOf("totally.new.field") === "regulated_partner");

// ── 2. employer view (consented) omits visa/financing, band only ───────────────
const empOk = passportView(passport, { audience: "employer", orgId: "emp-1", purpose: "employer_share", consentOk: true });
const ep = empOk.passport as any;
ok("employer view present after consent (band, license)", ep.readiness?.band === "green" && ep.licensure?.state === "CA");
ok("employer view OMITS visa", ep.visa === undefined);
ok("employer view OMITS billing/financing", ep.billing === undefined);
ok("employer view OMITS raw theta (band only)", ep.readiness?.theta === undefined);
ok("employer view discloses OWN placement only", ep.placement?.stage === "started");
ok("employer withheld[] documents visa + financing reasons", empOk.withheld.some((w) => w.field === "visa") && empOk.withheld.some((w) => /financ/i.test(w.reason)));
const empR = passportView(passportR, { audience: "employer", orgId: "emp-1", purpose: "employer_share", consentOk: true }).passport as any;
ok("employer view discloses OWN-placement retention (30d milestone)", !!empR.retention && empR.retention.retained30dAt !== undefined);

// employer WITHOUT consent → stub
const empNo = passportView(passport, { audience: "employer", orgId: "emp-1", purpose: "employer_share", consentOk: false });
ok("employer view WITHOUT consent → stub (no readiness)", (empNo.passport as any).readiness === undefined && (empNo.passport as any).funnelStage !== undefined);

// employer view of OTHER employer's nurse hides placement
const empOther = passportView(passport, { audience: "employer", orgId: "emp-OTHER", purpose: "employer_share", consentOk: true });
ok("employer view hides OTHER-employer placement (tenant isolation)", (empOther.passport as any).placement === undefined);
ok("employer view hides OTHER-employer retention (tenant isolation)", (empOther.passport as any).retention === undefined && empOther.withheld.some((w) => w.field === "retention"));

// ── 3. lender view requires underwriting consent ───────────────────────────────
const lenderNo = passportView(passport, { audience: "lender", purpose: "underwriting", consentOk: false });
ok("lender view WITHOUT consent → stub (no billing)", (lenderNo.passport as any).billing === undefined && (lenderNo.passport as any).readiness === undefined);
const lenderOk = passportView(passport, { audience: "lender", purpose: "underwriting", consentOk: true });
ok("lender view WITH consent → financing + visa timing present", (lenderOk.passport as any).billing !== undefined && (lenderOk.passport as any).visa?.stage === "ds160_filed");
ok("lender view discloses retention milestone status (90d underwriting-relevant)", "retention" in (lenderOk.passport as any) && (lenderOk.passport as any).retention.terminatedAt === undefined);

// investor view is de-identified
const inv = passportView(passport, { audience: "investor", consentOk: true });
ok("investor view has NO retention facet (internal-only)", !("retention" in (inv.passport as any)));
ok("investor view de-identified (no nurseId/name/email)", (inv.passport as any).nurseId === undefined && (inv.passport as any).name === undefined);

// self/internal full
const full = passportView(passport, { audience: "internal_ops", consentOk: true });
ok("internal_ops view is full (visa + billing present)", (full.passport as any).visa?.stage === "ds160_filed" && (full.passport as any).billing !== undefined);

// ── 4. purpose-based policy (ABAC) ─────────────────────────────────────────────
ok("isPurposeAllowed(employer, underwriting) = false", isPurposeAllowed("employer", "underwriting") === false);
ok("isPurposeAllowed(employer, employer_share) = true", isPurposeAllowed("employer", "employer_share") === true);
const dEmpUnder = evaluatePolicy({ role: "employer", orgId: "emp-1", subjectNurseId: nurse.id, relationship: "org_matched", classification: "candidate_personal", purpose: "underwriting", consentOk: true, nowSec: 0 });
ok("policy DENIES employer asserting underwriting purpose", dEmpUnder.allow === false);
const dEmpNoConsent = evaluatePolicy({ role: "employer", orgId: "emp-1", subjectNurseId: nurse.id, relationship: "org_matched", classification: "candidate_personal", purpose: "employer_share", consentOk: false, nowSec: 0 });
ok("policy DENIES employer without consent", dEmpNoConsent.allow === false);
const dEmpOk = evaluatePolicy({ role: "employer", orgId: "emp-1", subjectNurseId: nurse.id, relationship: "org_matched", classification: "candidate_personal", purpose: "employer_share", consentOk: true, nowSec: 0 });
ok("policy ALLOWS employer with consent + valid purpose", dEmpOk.allow === true);
const dCandSelf = evaluatePolicy({ role: "candidate", cand: "c1", subjectNurseId: nurse.id, relationship: "self", classification: "regulated_partner", purpose: "self", consentOk: true, nowSec: 0 });
ok("policy ALLOWS candidate self-access", dCandSelf.allow === true);
const dCandOther = evaluatePolicy({ role: "candidate", cand: "c1", subjectNurseId: nurse.id, relationship: "none", classification: "candidate_personal", purpose: "self", consentOk: true, nowSec: 0 });
ok("policy DENIES candidate reading another's record", dCandOther.allow === false);

// ── 5. consent service ─────────────────────────────────────────────────────────
const store = new MemoryStore();
const audit = makeAudit(store);
await store.insertNurse(nurse);
const granted = await grantConsent(store, audit, {
  nurseId: nurse.id, purpose: "underwriting", recipientCategory: "lender", recipientOrgId: "lender-1",
  allowedFields: ["readiness.band"], consentTextVersion: "v1", grantedBy: "maria@example.com",
});
let consents = await store.consentsByNurse(nurse.id);
ok("consent grant persists + consentAllows() true for matching purpose/org", consentAllows(consents, "underwriting", "lender-1").ok === true);
ok("consentAllows() false for a different purpose", consentAllows(consents, "employer_share", "lender-1").ok === false);
await revokeConsentById(store, audit, { id: granted.id, nurseId: nurse.id, purpose: "underwriting", by: "maria@example.com" });
consents = await store.consentsByNurse(nurse.id);
ok("after revoke, consentAllows() false", consentAllows(consents, "underwriting", "lender-1").ok === false);

// ── 6. tamper-evident audit + read logging ─────────────────────────────────────
await audit("emp@x.com", "passport.read", "nurse", nurse.id, { audience: "employer", purpose: "employer_share", consentOk: true });
await audit("ops@florence", "passport.read", "nurse", nurse.id, { audience: "internal_ops" });
const chain1 = await verifyAuditChain(store);
ok("audit chain intact across grant/revoke/read rows", chain1.ok === true, `${chain1.checked} rows`);
const readRows = (await store.allAuditOrdered()).filter((r) => r.action === "passport.read");
ok("sensitive READS are logged (passport.read rows exist)", readRows.length >= 2);

// tamper: alter a row in a copy and re-verify
const rows = await store.allAuditOrdered();
const tampered = rows.map((r, i) => (i === 1 ? { ...r, actor: "attacker@evil.com" } : r));
const chain2 = verifyChain(tampered);
ok("tampered chain is DETECTED (broken)", chain2.ok === false, chain2.reason);

// bulk-read anomaly alert
for (let i = 0; i < 30; i++) await audit("scraper@x.com", "passport.read", "nurse", `subj-${i}`, {});
const finding = await bulkReadAlert(store, audit, "scraper@x.com", { threshold: 25 });
ok("bulk-read anomaly tripped + security.alert recorded", finding.tripped === true, `${finding.distinctSubjects} distinct subjects`);
const alertRows = (await store.allAuditOrdered()).filter((r) => r.action === "security.alert");
ok("security.alert row written", alertRows.length === 1);
const chain3 = await verifyAuditChain(store);
ok("chain still intact after alert write", chain3.ok === true);

console.log(`\n${fail ? "SECURITY SPINE FAILED" : "SECURITY SPINE PASSED"} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
