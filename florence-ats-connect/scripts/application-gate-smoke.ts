// Application Submission Gate proof: interest is free, but submission requires
// consent + visa-approved + license-verified + QA + job-open + channel-authorized +
// docs. FAIL-CLOSED (visa unknown ⇒ blocked). Hard-block + audited super_admin
// override. Employer surfaces never expose visa. Runs on sqlite AND ATS_DB=postgres.
import { store, uid, now } from '../server/db'
import { applicationGate, candidateApplicationReady } from '../shared/applicationGate'
import { effectiveCta } from '../shared/opportunityState'
import { runApplicationGate, validApplicationOverride } from '../server/applicationGateEnforce'
import { generateLicensedSlate } from '../server/program/slate'
import { recordLedger, HRIS_GRADE_STAGES } from '../server/ledger'
import { buildPacket } from '../shared/packet'
import type { FlorenceCandidate, JobRequisition, EmployerAccount, EmployerShareConsent, Program } from '../shared/types'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }
const run = uid().slice(0, 8)
const ST = 'NV'

const mkCand = (over: Partial<FlorenceCandidate>): FlorenceCandidate => ({
  id: uid(), fullName: `Nurse ${uid().slice(0, 5)}`, email: `n.${uid().slice(0, 6)}@t.dev`, specialtyExperience: ['med_surg'],
  readinessBand: 'green', nclexStatus: 'passed', licenseStatus: 'issued', visaStatus: 'approved', targetStates: [ST],
  employerShareConsent: 'granted', humanQaStatus: 'approved', createdAt: now(), updatedAt: now(), ...over,
})
const job: JobRequisition = { id: `req-${run}`, employerId: `emp-${run}`, atsProvider: 'manual', title: 'RN', setting: 'inpatient', status: 'open', requiredLicenseState: ST, sourceChannel: 'direct', importedAt: now(), lastSyncedAt: now() }
const READY_OPTS = { packetQaApproved: true, documentsComplete: true }

// ── Pure gate ────────────────────────────────────────────────────────────────
const fullyReady = applicationGate({ candidate: mkCand({}), job, opportunityState: 'direct_partner', opts: READY_OPTS })
ok('gate: fully-ready ⇒ ok + ready_to_submit + apply_with_packet', fullyReady.ok && fullyReady.status === 'ready_to_submit' && fullyReady.allowedAction === 'apply_with_packet')

ok('gate: visa UNKNOWN ⇒ BLOCKED (headline, fail-closed)', (() => { const g = applicationGate({ candidate: mkCand({ visaStatus: 'unknown' }), job, opportunityState: 'direct_partner', opts: READY_OPTS }); return !g.ok && g.missing.includes('visa_approved') && g.status === 'visa_pending' && g.allowedAction === 'express_interest' })())
ok('gate: visa UNDEFINED ⇒ BLOCKED', (() => { const g = applicationGate({ candidate: mkCand({ visaStatus: undefined }), job, opportunityState: 'direct_partner', opts: READY_OPTS }); return !g.ok && g.missing.includes('visa_approved') })())
ok('gate: visa not_required ⇒ passes that clause', applicationGate({ candidate: mkCand({ visaStatus: 'not_required' }), job, opportunityState: 'direct_partner', opts: READY_OPTS }).ok)
ok('gate: no consent ⇒ missing_consent', (() => { const g = applicationGate({ candidate: mkCand({ employerShareConsent: 'not_requested' }), job, opportunityState: 'direct_partner', opts: READY_OPTS }); return g.missing.includes('employer_share_consent') && g.status === 'missing_consent' })())
ok('gate: license not verified ⇒ license_pending', (() => { const g = applicationGate({ candidate: mkCand({ licenseStatus: 'submitted' }), job, opportunityState: 'direct_partner', opts: READY_OPTS }); return g.missing.includes('license_verified_active') && g.status === 'license_pending' })())
ok('gate: wrong state ⇒ license clause blocks', applicationGate({ candidate: mkCand({ targetStates: ['CA'] }), job, opportunityState: 'direct_partner', opts: READY_OPTS }).missing.includes('license_verified_active'))
ok('gate: public channel ⇒ channel_authorized missing', applicationGate({ candidate: mkCand({}), job, opportunityState: 'public', opts: READY_OPTS }).missing.includes('channel_authorized'))
ok('gate: closed job ⇒ job_open missing', applicationGate({ candidate: mkCand({}), job: { ...job, status: 'closed' }, opportunityState: 'direct_partner', opts: READY_OPTS }).missing.includes('job_open'))
ok('gate: no QA ⇒ qa_pending + docs missing', (() => { const g = applicationGate({ candidate: mkCand({}), job, opportunityState: 'direct_partner', opts: {} }); return g.missing.includes('employer_packet_qa_approved') && g.missing.includes('documents_complete') && g.status === 'qa_pending' })())
ok('gate: multi-fail surfaces all missing gates (queue input)', (() => { const g = applicationGate({ candidate: mkCand({ visaStatus: 'unknown', employerShareConsent: 'not_requested', licenseStatus: 'submitted' }), job, opportunityState: 'public', opts: {} }); return g.missing.length >= 5 })())

// ── candidateApplicationReady + effectiveCta ──────────────────────────────────
ok('candidateApplicationReady: true only when consent+visa+license+state', candidateApplicationReady(mkCand({}), job) && !candidateApplicationReady(mkCand({ visaStatus: 'pending' }), job))
ok('effectiveCta: direct_partner + gateOk ⇒ apply_with_packet', effectiveCta('direct_partner', true) === 'apply_with_packet')
ok('effectiveCta: direct_partner + NOT ready ⇒ express_interest', effectiveCta('direct_partner', false) === 'express_interest')
ok('effectiveCta: public + ready ⇒ express_interest', effectiveCta('public', true) === 'express_interest')

// ── Enforcer (hard-block + audited override) ─────────────────────────────────
const employer: EmployerAccount = { id: `emp-${run}`, name: `Gate Emp ${run}`, atsProvider: 'manual', integrationStatus: 'manual', defaultBillingModel: 'direct', sourceChannel: 'direct', createdAt: now(), updatedAt: now() }
await store.employers.insert(employer)
const req2: JobRequisition = { ...job, id: `req2-${run}`, employerId: employer.id }
await store.requisitions.insert(req2)
const mkConsent = (candidateId: string): EmployerShareConsent => ({ id: uid(), candidateId, employerId: employer.id, purpose: 'employer_share', allowedData: ['resume', 'credential_summary', 'readiness_summary', 'video_profile'], consentTextVersion: 'v1', consentTextHash: 'hash', grantedAt: now() })
const blockedCand = mkCand({ visaStatus: 'unknown' }); await store.candidates.insert(blockedCand)
const qaPacket = buildPacket({ candidate: { ...blockedCand, employerShareConsent: 'granted' }, requisition: req2, consent: mkConsent(blockedCand.id), newId: uid, nowIso: now })
qaPacket.status = 'ready_to_submit'; qaPacket.humanQaStatus = 'approved'; await store.packets.insert(qaPacket)
const e1 = await runApplicationGate({ candidate: blockedCand, requisition: req2, packet: qaPacket })
ok('enforcer: visa-unknown ⇒ NOT allowed (hard-block default ON)', !e1.allowed && e1.wouldBlock && !e1.shadow)
const e2 = await runApplicationGate({ candidate: blockedCand, requisition: req2, packet: qaPacket, override: { actor: 'admin', role: 'super_admin', reason: 'consular delay, employer pre-cleared' } })
ok('enforcer: super_admin override on visa ⇒ allowed + overridden (audited)', e2.allowed && e2.overridden)
ok('enforcer: ops override CANNOT clear the visa clause (super_admin only)', !validApplicationOverride({ actor: 'o', role: 'ops', reason: 'x' }, ['visa_approved']))
ok('enforcer: ops override CAN clear non-visa clauses', validApplicationOverride({ actor: 'o', role: 'ops', reason: 'x' }, ['employer_packet_qa_approved']))
const approvedCand = mkCand({}); await store.candidates.insert(approvedCand)
const e3 = await runApplicationGate({ candidate: approvedCand, requisition: req2, packet: qaPacket })
ok('enforcer: fully-ready visa-approved ⇒ allowed, not overridden', e3.allowed && !e3.wouldBlock && !e3.overridden)

// ── Slate: visa-blocked drops to gatePending (Kaiser sees only cleared) ───────
const program: Program = { id: `prog-${run}`, employerId: employer.id, name: `Prog ${run}`, targetCount: 5, waveStructure: [5], status: 'active', channel: 'direct', createdAt: now(), updatedAt: now() } as Program
await store.programs.insert(program)
const slate = await generateLicensedSlate(program.id)
ok('slate: visa-approved candidate is ELIGIBLE', slate.eligible.some((e) => e.candidateId === approvedCand.id))
ok('slate: visa-unknown (else-ready) candidate is in gatePending, NOT eligible', slate.gatePending.some((e) => e.candidateId === blockedCand.id) && !slate.eligible.some((e) => e.candidateId === blockedCand.id))

// ── New ledger events ────────────────────────────────────────────────────────
for (const stage of ['visa_approved', 'license_verified', 'application_ready_to_submit', 'interview_pre_clearance_requested', 'interview_formal_scheduled', 'offer_received_subject_to_clearance', 'start_cleared'] as const) {
  await recordLedger({ candidateId: approvedCand.id, stage, employerId: employer.id })
}
const led = await store.ledger.byCandidate(approvedCand.id)
ok('ledger: all new gate/3-state stages record', ['visa_approved', 'application_ready_to_submit', 'interview_pre_clearance_requested', 'start_cleared'].every((s) => led.some((e) => e.stage === s)))
ok('ledger: start_cleared is HRIS-grade (billing-grade)', HRIS_GRADE_STAGES.has('start_cleared'))

// ── Employer-view invariant: visa NEVER leaks to an employer payload ─────────
const pkt = buildPacket({ candidate: { ...approvedCand, employerShareConsent: 'granted' }, requisition: req2, consent: mkConsent(approvedCand.id), newId: uid, nowIso: now })
ok('employer-view: packet withholds visa/immigration', pkt.withheldFields.some((w) => /visa|immigration/i.test(w.field) || /immigration|visa/i.test(w.reason)))
ok('employer-view: packet payload contains NO visaStatus / visa value', !/visastatus|"visa"/i.test(JSON.stringify(pkt)))

console.log(`\n${fail ? 'APPLICATION GATE SMOKE FAILED' : 'APPLICATION GATE SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
