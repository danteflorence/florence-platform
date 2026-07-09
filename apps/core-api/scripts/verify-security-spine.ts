// Security-spine smoke: deterministic, in-process (no server). Proves the five
// load-bearing controls of the regulated-data security program:
//   1. Data classification drives redaction
//   2. The employer view omits visa/financing (Title VII/IRCA), band only
//   3. Consent-gated audiences (lender) disclose ONLY with a live consent
//   4. The audit log is tamper-evident (chain verifies; any edit breaks it) + reads are logged
//   5. Purpose-based policy (ABAC) enforces role × purpose × consent × class
//
//   node scripts/verify-security-spine.ts

import { foldPassport } from "../src/passport.ts";
import type { Nurse, NurseEvent, NurseRef } from "../src/store.ts";
import { MemoryStore } from "../src/store.ts";
import { classOf, redactAnalyticsEvent, redactApiResponse, redactError, redactExport, redactForLog, serializeForRecipient } from "../src/classification.ts";
import { passportView } from "../src/passportView.ts";
import { audienceForClaims } from "../src/passportRead.ts";
import { evaluatePolicy, isPurposeAllowed } from "../src/policy.ts";
import { grantConsent, revokeConsentById, consentAllows } from "../src/consent.ts";
import { makeAudit } from "../src/audit.ts";
import { verifyAuditChain, verifyChain } from "../src/auditVerify.ts";
import { bulkReadAlert } from "../src/auditAlerts.ts";
import { nowIso } from "../src/util.ts";

let pass = 0;
let fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` - ${extra}` : ""}`);
  cond ? (pass += 1) : (fail += 1);
};

// ── Build a representative folded Passport ─────────────────────────────────────
const nurse: Nurse = { id: "nrs_test", email: "synthetic.candidate@example.invalid", name: "Synthetic Candidate", created_at: nowIso(), updated_at: nowIso() };
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
ok("classOf(visa.stage) = RESTRICTED_IMMIGRATION", classOf("visa.stage") === "RESTRICTED_IMMIGRATION");
ok("classOf(readiness.band) = CANDIDATE_PERSONAL", classOf("readiness.band") === "CANDIDATE_PERSONAL");
ok("classOf(placement.employerId) = PARTNER_RESTRICTED", classOf("placement.employerId") === "PARTNER_RESTRICTED");
ok("classOf(unknown.new.field) defaults most-restrictive", classOf("totally.new.field") === "SECRET");
ok("classOf(identity.passportNumber) = RESTRICTED_IDENTITY", classOf("identity.passportNumber") === "RESTRICTED_IDENTITY");
ok("classOf(profile.dateOfBirth) = RESTRICTED_IDENTITY", classOf("profile.dateOfBirth") === "RESTRICTED_IDENTITY");
ok("classOf(profile.address.line1) = RESTRICTED_IDENTITY", classOf("profile.address.line1") === "RESTRICTED_IDENTITY");
ok("classOf(i20.sevisId) = RESTRICTED_IMMIGRATION", classOf("i20.sevisId") === "RESTRICTED_IMMIGRATION");
ok("classOf(ds160.confirmationNumber) = RESTRICTED_IMMIGRATION", classOf("ds160.confirmationNumber") === "RESTRICTED_IMMIGRATION");
ok("classOf(creditScore) = RESTRICTED_FINANCING", classOf("creditScore") === "RESTRICTED_FINANCING");
ok("classOf(employerPacket) = RESTRICTED_EMPLOYER_PACKET", classOf("employerPacket") === "RESTRICTED_EMPLOYER_PACKET");
ok("classOf(schoolRecords) = RESTRICTED_EDUCATION", classOf("schoolRecords") === "RESTRICTED_EDUCATION");
ok("classOf(documentId) = RESTRICTED_IDENTITY", classOf("documentId") === "RESTRICTED_IDENTITY");
ok("classOf(signedUrl) = SECRET", classOf("signedUrl") === "SECRET");

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

const sensitiveApiPayload = {
  nurseId: "nrs_test",
  name: "Synthetic Candidate",
  email: "synthetic.candidate@example.invalid",
  passportNumber: "TEST_PASSPORT_VALUE",
  dateOfBirth: "1990-01-01",
  i20: { sevisId: "TEST_SEVIS_VALUE" },
  ds160: { confirmationNumber: "TEST_DS160_VALUE" },
  visaStatus: "ds160_filed",
  readiness: { band: "green", theta: 0.9, passProbability: 0.91 },
  nclex: { status: "passed", attNumber: "ATT-123" },
  licensure: { status: "issued", state: "CA" },
  financing: { amount: 12000, creditScore: 710 },
  loan: { status: "approved" },
  employerNotes: "private recruiter note",
  employerPacket: { summary: "eligible RN", internalUnderwriting: "do not share", applicationStatus: "ready" },
  academy: { remediationHistory: ["sepsis prioritization"] },
  documentId: "doc_123",
  signedUrl: "https://signed.example.test/file?X-Amz-Signature=abc",
  funnelStage: "licensed",
};
const employerSerialized = serializeForRecipient(sensitiveApiPayload, "employer");
const employerJson = JSON.stringify(employerSerialized);
ok("employer serializer keeps employer-safe readiness/license", (employerSerialized as any).readiness?.band === "green" && (employerSerialized as any).licensure?.state === "CA");
ok("employer serializer removes passport, DS-160, visa, financing, signed URLs, and remediation", !/TEST_PASSPORT_VALUE|TEST_DS160_VALUE|ds160_filed|12000|signed\.example|sepsis/i.test(employerJson));
ok("employer serializer removes internal underwriting", !/internalUnderwriting|do not share/i.test(employerJson));

// ── 3. lender view requires underwriting consent ───────────────────────────────
const lenderNo = passportView(passport, { audience: "lender", purpose: "underwriting", consentOk: false });
ok("lender view WITHOUT consent → stub (no billing)", (lenderNo.passport as any).billing === undefined && (lenderNo.passport as any).readiness === undefined);
const lenderOk = passportView(passport, { audience: "lender", purpose: "underwriting", consentOk: true });
ok("lender view WITH consent → financing + visa timing present", (lenderOk.passport as any).billing !== undefined && (lenderOk.passport as any).visa?.stage === "ds160_filed");
ok("lender view discloses retention milestone status (90d underwriting-relevant)", "retention" in (lenderOk.passport as any) && (lenderOk.passport as any).retention.terminatedAt === undefined);
const lenderSerialized = serializeForRecipient(sensitiveApiPayload, "lender");
const lenderJson = JSON.stringify(lenderSerialized);
ok("lender serializer keeps consented financing summary", (lenderSerialized as any).financing?.amount === 12000 && (lenderSerialized as any).loan?.status === "approved");
ok("lender serializer removes employer notes and employer packet internals", !/private recruiter|internalUnderwriting|eligible RN|applicationStatus/i.test(lenderJson));
const lenderNotesPermitted = serializeForRecipient(sensitiveApiPayload, { recipient: "lender", explicitlyAllowedFields: ["employerNotes"] });
ok("lender serializer allows employer notes only when explicitly permitted", (lenderNotesPermitted as any).employerNotes === "private recruiter note" && !/internalUnderwriting|eligible RN|applicationStatus/i.test(JSON.stringify(lenderNotesPermitted)));

// investor view is de-identified
const inv = passportView(passport, { audience: "investor", consentOk: true });
ok("investor view has NO retention facet (internal-only)", !("retention" in (inv.passport as any)));
ok("investor view de-identified (no nurseId/name/email)", (inv.passport as any).nurseId === undefined && (inv.passport as any).name === undefined);

const universitySerialized = serializeForRecipient([sensitiveApiPayload, { ...sensitiveApiPayload, name: "Synthetic Peer", readiness: { band: "yellow" }, nclex: { status: "scheduled" }, licensure: { state: "TX" }, funnelStage: "enrolled" }], "university");
const universityJson = JSON.stringify(universitySerialized);
ok("university serializer is aggregate/anonymized by default", (universitySerialized as any).aggregate === true && (universitySerialized as any).total === 2);
ok("university serializer contains no named candidate data", !/Synthetic Candidate|Synthetic Peer|synthetic\.candidate@example\.invalid|nrs_test|TEST_PASSPORT_VALUE/i.test(universityJson));
const exportRow = redactExport(sensitiveApiPayload, { recipient: "employer" });
const apiResponse = redactApiResponse(sensitiveApiPayload, { recipient: "employer" });
ok("API/export redactors apply recipient-safe projection", !/TEST_PASSPORT_VALUE|TEST_DS160_VALUE|12000|signed\.example|private recruiter/i.test(JSON.stringify(apiResponse)) && JSON.stringify(apiResponse) === JSON.stringify(exportRow));
const apiListResponse = redactApiResponse([sensitiveApiPayload], { recipient: "employer" });
ok("API response redaction preserves arrays", Array.isArray(apiListResponse) && !/TEST_PASSPORT_VALUE|TEST_DS160_VALUE|12000|signed\.example|private recruiter/i.test(JSON.stringify(apiListResponse)));

// self/internal full
const full = passportView(passport, { audience: "internal_ops", consentOk: true, internalRole: true });
ok("internal_ops view is full (visa + billing present)", (full.passport as any).visa?.stage === "ds160_filed" && (full.passport as any).billing !== undefined);
const deniedFull = passportView(passport, { audience: "internal_ops", consentOk: true });
ok("internal_ops view fails closed without internal role", (deniedFull.passport as any).visa === undefined && deniedFull.withheld.some((w) => w.field === "*"));
ok("employer requesting internal view is pinned to employer", audienceForClaims("employer", "internal_ops") === "employer");
const dEmpInternal = evaluatePolicy({ role: "employer", orgId: "emp-1", subjectNurseId: nurse.id, relationship: "org_matched", classification: "SECRET", purpose: "employer_share", consentOk: true, nowSec: 0 });
ok("internal view data class requires internal role", dEmpInternal.allow === false);

const redactedLog = redactForLog({
  email: "synthetic.candidate@example.invalid",
  passportNumber: "TEST_PASSPORT_VALUE",
  sevisId: "TEST_SEVIS_VALUE",
  message: "DS-160 confirmation TEST_DS160_VALUE for synthetic.candidate@example.invalid",
  status: "visa approved for synthetic candidate",
  safeCount: 2,
});
const redactedLogJson = JSON.stringify(redactedLog);
ok("logs redact sensitive values", !/synthetic\.candidate@example\.invalid|TEST_PASSPORT_VALUE|TEST_SEVIS_VALUE|TEST_DS160_VALUE|visa approved/i.test(redactedLogJson) && /safeCount/.test(redactedLogJson));
const redactedErr = redactError(new Error("passport number TEST_PASSPORT_VALUE and SEVIS TEST_SEVIS_VALUE failed"));
ok("errors redact sensitive values", !/TEST_PASSPORT_VALUE|TEST_SEVIS_VALUE/.test(JSON.stringify(redactedErr)));
const freeTextLog = redactForLog("date of birth: 1990-01-01; address: 100 Test Way");
ok("free-text logs redact DOB/address phrases", !/1990-01-01|100 Test Way/i.test(String(freeTextLog)));
const analytics = redactAnalyticsEvent({ event: "packet_view", email: "synthetic.candidate@example.invalid", signedUrl: "https://signed.example.test/file?X-Amz-Signature=abc", safeCount: 1 });
ok("analytics redactor removes sensitive values", !/synthetic\.candidate@example\.invalid|signed\.example|X-Amz/i.test(JSON.stringify(analytics)) && /safeCount/.test(JSON.stringify(analytics)));

// ── 4. purpose-based policy (ABAC) ─────────────────────────────────────────────
ok("isPurposeAllowed(employer, underwriting) = false", isPurposeAllowed("employer", "underwriting") === false);
ok("isPurposeAllowed(employer, employer_share) = true", isPurposeAllowed("employer", "employer_share") === true);
const dEmpUnder = evaluatePolicy({ role: "employer", orgId: "emp-1", subjectNurseId: nurse.id, relationship: "org_matched", classification: "CANDIDATE_PERSONAL", purpose: "underwriting", consentOk: true, nowSec: 0 });
ok("policy DENIES employer asserting underwriting purpose", dEmpUnder.allow === false);
const dEmpNoConsent = evaluatePolicy({ role: "employer", orgId: "emp-1", subjectNurseId: nurse.id, relationship: "org_matched", classification: "CANDIDATE_PERSONAL", purpose: "employer_share", consentOk: false, nowSec: 0 });
ok("policy DENIES employer without consent", dEmpNoConsent.allow === false);
const dEmpOk = evaluatePolicy({ role: "employer", orgId: "emp-1", subjectNurseId: nurse.id, relationship: "org_matched", classification: "CANDIDATE_PERSONAL", purpose: "employer_share", consentOk: true, nowSec: 0 });
ok("policy ALLOWS employer with consent + valid purpose", dEmpOk.allow === true);
const dCandSelf = evaluatePolicy({ role: "candidate", cand: "c1", subjectNurseId: nurse.id, relationship: "self", classification: "PARTNER_RESTRICTED", purpose: "self", consentOk: true, nowSec: 0 });
ok("policy ALLOWS candidate self-access", dCandSelf.allow === true);
const dCandOther = evaluatePolicy({ role: "candidate", cand: "c1", subjectNurseId: nurse.id, relationship: "none", classification: "CANDIDATE_PERSONAL", purpose: "self", consentOk: true, nowSec: 0 });
ok("policy DENIES candidate reading another's record", dCandOther.allow === false);

// ── 5. consent service ─────────────────────────────────────────────────────────
const store = new MemoryStore();
const audit = makeAudit(store);
await store.insertNurse(nurse);
const granted = await grantConsent(store, audit, {
  nurseId: nurse.id, purpose: "underwriting", recipientCategory: "lender", recipientOrgId: "lender-1",
  allowedFields: ["readiness.band"], consentTextVersion: "v1", grantedBy: "synthetic.candidate@example.invalid",
});
let consents = await store.consentsByNurse(nurse.id);
ok("consent grant persists + consentAllows() true for matching purpose/org", consentAllows(consents, "underwriting", "lender-1").ok === true);
ok("consentAllows() false for a different purpose", consentAllows(consents, "employer_share", "lender-1").ok === false);
await revokeConsentById(store, audit, { id: granted.id, nurseId: nurse.id, purpose: "underwriting", by: "synthetic.candidate@example.invalid" });
consents = await store.consentsByNurse(nurse.id);
ok("after revoke, consentAllows() false", consentAllows(consents, "underwriting", "lender-1").ok === false);

// ── 6. tamper-evident audit + read logging ─────────────────────────────────────
await audit("emp@x.com", "passport.read", "nurse", nurse.id, { audience: "employer", purpose: "employer_share", consentOk: true });
await audit("ops@florence", "passport.read", "nurse", nurse.id, { audience: "internal_ops" });
await audit("system", "security.redaction_test", "nurse", nurse.id, {
  passportNumber: "TEST_PASSPORT_VALUE",
  sevisId: "TEST_SEVIS_VALUE",
  email: "synthetic.candidate@example.invalid",
  token: "TEST_TOKEN_VALUE",
  audience: "employer",
});
const chain1 = await verifyAuditChain(store);
ok("audit chain intact across grant/revoke/read rows", chain1.ok === true, `${chain1.checked} rows`);
const readRows = (await store.allAuditOrdered()).filter((r) => r.action === "passport.read");
ok("sensitive READS are logged (passport.read rows exist)", readRows.length >= 2);
const redactionRows = (await store.allAuditOrdered()).filter((r) => r.action === "security.redaction_test");
ok("audit detail redacts sensitive values", redactionRows.length === 1 && !/TEST_PASSPORT_VALUE|TEST_SEVIS_VALUE|synthetic\.candidate@example\.invalid|TEST_TOKEN_VALUE/i.test(JSON.stringify(redactionRows[0]?.detail)));

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
ok("audit rows do not store raw actor emails", !/emp@x\.com|ops@florence|synthetic\.candidate@example\.invalid|scraper@x\.com/i.test(JSON.stringify(await store.allAuditOrdered())));
const chain3 = await verifyAuditChain(store);
ok("chain still intact after alert write", chain3.ok === true);

console.log(`\n${fail ? "SECURITY SPINE FAILED" : "SECURITY SPINE PASSED"} - ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
