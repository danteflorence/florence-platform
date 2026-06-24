// Application Submission Gate proof: interest is free, but submission requires
// consent + visa-approved + license-verified + QA + job-open + channel-authorized +
// docs + duplicate-lock clearance + data minimization. FAIL-CLOSED (visa unknown
// ⇒ blocked). Override requests are audited but cannot bypass failed gates.
// Employer surfaces never expose visa. Runs on sqlite AND ATS_DB=postgres.
import { store, uid, now } from '../server/db'
import { applicationGate, candidateApplicationReady, SUBJECT_TO_MESSAGE } from '../shared/applicationGate'
import { effectiveCta } from '../shared/opportunityState'
import { runApplicationGate, validApplicationOverride } from '../server/applicationGateEnforce'
import { generateLicensedSlate } from '../server/program/slate'
import { recordLedger, HRIS_GRADE_STAGES } from '../server/ledger'
import { registerInterest } from '../server/demand/interest'
import { acquireSubmissionLock, releaseSubmissionLock } from '../server/submissionLock'
import { buildPacket } from '../shared/packet'
import type { FlorenceCandidate, JobRequisition, EmployerAccount, EmployerShareConsent, Program } from '../shared/types'
import type { FlorenceRNJob } from '../shared/demand-types'

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
const READY_OPTS = {
  employerShareConsentGranted: true,
  packetQaApproved: true,
  documentsComplete: true,
  dataMinimizedPacketGenerated: true,
  duplicateSubmissionLockClear: true,
}

// ── Pure gate ────────────────────────────────────────────────────────────────
const fullyReady = applicationGate({ candidate: mkCand({}), job, opportunityState: 'direct_partner', opts: READY_OPTS })
ok('gate: fully-ready ⇒ ok + ready_to_submit + apply_with_packet', fullyReady.ok && fullyReady.status === 'ready_to_submit' && fullyReady.allowedAction === 'apply_with_packet')
ok('gate: carries candidate/employer subject-to message', fullyReady.subjectToMessage === SUBJECT_TO_MESSAGE && /consular processing, final work authorization, credentialing, onboarding, and employer approval/i.test(fullyReady.subjectToMessage))

ok('gate: visa UNKNOWN ⇒ BLOCKED (headline, fail-closed)', (() => { const g = applicationGate({ candidate: mkCand({ visaStatus: 'unknown' }), job, opportunityState: 'direct_partner', opts: READY_OPTS }); return !g.ok && g.missing.includes('visa_approved') && g.status === 'visa_pending' && g.allowedAction === 'express_interest' })())
ok('gate: visa UNDEFINED ⇒ BLOCKED', (() => { const g = applicationGate({ candidate: mkCand({ visaStatus: undefined }), job, opportunityState: 'direct_partner', opts: READY_OPTS }); return !g.ok && g.missing.includes('visa_approved') })())
ok('gate: visa not_required ⇒ passes that clause', applicationGate({ candidate: mkCand({ visaStatus: 'not_required' }), job, opportunityState: 'direct_partner', opts: READY_OPTS }).ok)
ok('gate: no consent ⇒ missing_consent', (() => { const g = applicationGate({ candidate: mkCand({}), job, opportunityState: 'direct_partner', opts: { ...READY_OPTS, employerShareConsentGranted: false } }); return g.missing.includes('employer_share_consent') && g.status === 'missing_consent' })())
ok('gate: license not verified ⇒ license_pending', (() => { const g = applicationGate({ candidate: mkCand({ licenseStatus: 'submitted' }), job, opportunityState: 'direct_partner', opts: READY_OPTS }); return g.missing.includes('license_verified_active') && g.status === 'license_pending' })())
ok('gate: wrong state ⇒ license clause blocks', applicationGate({ candidate: mkCand({ targetStates: ['CA'] }), job, opportunityState: 'direct_partner', opts: READY_OPTS }).missing.includes('license_verified_active'))
ok('gate: public channel ⇒ channel_authorized missing', applicationGate({ candidate: mkCand({}), job, opportunityState: 'public', opts: READY_OPTS }).missing.includes('channel_authorized'))
ok('gate: closed job ⇒ job_open missing', applicationGate({ candidate: mkCand({}), job: { ...job, status: 'closed' }, opportunityState: 'direct_partner', opts: READY_OPTS }).missing.includes('job_open'))
ok('gate: no QA ⇒ qa_pending + docs missing', (() => { const g = applicationGate({ candidate: mkCand({}), job, opportunityState: 'direct_partner', opts: {} }); return g.missing.includes('employer_packet_qa_approved') && g.missing.includes('documents_complete') && g.status === 'qa_pending' })())
ok('gate: duplicate submission lock ⇒ duplicate_submission', (() => { const g = applicationGate({ candidate: mkCand({}), job, opportunityState: 'direct_partner', opts: { ...READY_OPTS, duplicateSubmissionLockClear: false } }); return g.missing.includes('duplicate_submission_lock_clear') && g.status === 'duplicate_submission' })())
ok('gate: missing data-minimized packet ⇒ not_ready', (() => { const g = applicationGate({ candidate: mkCand({}), job, opportunityState: 'direct_partner', opts: { ...READY_OPTS, dataMinimizedPacketGenerated: false } }); return g.missing.includes('data_minimized_packet_generated') && g.status === 'not_ready' })())
ok('gate: multi-fail surfaces all missing gates (queue input)', (() => { const g = applicationGate({ candidate: mkCand({ visaStatus: 'unknown', employerShareConsent: 'not_requested', licenseStatus: 'submitted' }), job, opportunityState: 'public', opts: {} }); return g.missing.length >= 5 })())

// ── candidateApplicationReady + effectiveCta ──────────────────────────────────
ok('candidateApplicationReady: true only when consent+visa+license+state', candidateApplicationReady(mkCand({}), job) && !candidateApplicationReady(mkCand({ visaStatus: 'pending' }), job))
ok('effectiveCta: direct_partner + gateOk ⇒ apply_with_packet', effectiveCta('direct_partner', true) === 'apply_with_packet')
ok('effectiveCta: direct_partner + NOT ready ⇒ express_interest', effectiveCta('direct_partner', false) === 'express_interest')
ok('effectiveCta: public + ready ⇒ express_interest', effectiveCta('public', true) === 'express_interest')

// ── Enforcer (hard-block + audited override rejection) ───────────────────────
const employer: EmployerAccount = { id: `emp-${run}`, name: `Gate Emp ${run}`, atsProvider: 'manual', integrationStatus: 'manual', defaultBillingModel: 'direct', sourceChannel: 'direct', createdAt: now(), updatedAt: now() }
await store.employers.insert(employer)
const req2: JobRequisition = { ...job, id: `req2-${run}`, employerId: employer.id }
await store.requisitions.insert(req2)
const mkConsent = (candidateId: string): EmployerShareConsent => ({ id: uid(), candidateId, employerId: employer.id, purpose: 'employer_share', allowedData: ['resume', 'credential_summary', 'readiness_summary', 'video_profile'], consentTextVersion: 'v1', consentTextHash: 'hash', grantedAt: now() })
const blockedCand = mkCand({ visaStatus: 'unknown' }); await store.candidates.insert(blockedCand)
const blockedConsent = mkConsent(blockedCand.id); await store.consents.insert(blockedConsent)
const qaPacket = buildPacket({ candidate: { ...blockedCand, employerShareConsent: 'granted' }, requisition: req2, consent: blockedConsent, newId: uid, nowIso: now })
qaPacket.status = 'ready_to_submit'; qaPacket.humanQaStatus = 'approved'; await store.packets.insert(qaPacket)
const e1 = await runApplicationGate({ candidate: blockedCand, requisition: req2, packet: qaPacket, action: 'gate_check' })
ok('enforcer: visa-unknown ⇒ NOT allowed (hard-block default ON)', !e1.allowed && e1.wouldBlock && !e1.shadow)
const e2 = await runApplicationGate({ candidate: blockedCand, requisition: req2, packet: qaPacket, override: { actor: 'admin', role: 'super_admin', reason: 'consular delay, employer pre-cleared' } })
ok('enforcer: override request on failed gate remains blocked', !e2.allowed && !e2.overridden)
ok('enforcer: overrides cannot clear failed gates', !validApplicationOverride({ actor: 'o', role: 'ops', reason: 'x' }, ['employer_packet_qa_approved']))
const approvedCand = mkCand({}); await store.candidates.insert(approvedCand)
const approvedConsent = mkConsent(approvedCand.id); await store.consents.insert(approvedConsent)
const approvedPacket = buildPacket({ candidate: approvedCand, requisition: req2, consent: approvedConsent, newId: uid, nowIso: now })
approvedPacket.status = 'ready_to_submit'; approvedPacket.humanQaStatus = 'approved'; await store.packets.insert(approvedPacket)
const e3 = await runApplicationGate({ candidate: approvedCand, requisition: req2, packet: approvedPacket, action: 'submission_attempt' })
ok('enforcer: fully-ready visa-approved ⇒ allowed, not overridden', e3.allowed && !e3.wouldBlock && !e3.overridden)
ok('enforcer: returns subject-to message for API surfaces', e3.result.subjectToMessage === SUBJECT_TO_MESSAGE)
const noConsentCand = mkCand({}); await store.candidates.insert(noConsentCand)
const noConsentPacket = buildPacket({ candidate: noConsentCand, requisition: req2, consent: mkConsent(noConsentCand.id), newId: uid, nowIso: now })
noConsentPacket.status = 'ready_to_submit'; noConsentPacket.humanQaStatus = 'approved'; await store.packets.insert(noConsentPacket)
const eNoConsent = await runApplicationGate({ candidate: noConsentCand, requisition: req2, packet: noConsentPacket, action: 'submission_attempt' })
ok('enforcer: missing stored consent blocks submission', !eNoConsent.allowed && eNoConsent.result.missing.includes('employer_share_consent'))
const licensePendingCand = mkCand({ licenseStatus: 'submitted' }); await store.candidates.insert(licensePendingCand)
const licensePendingConsent = mkConsent(licensePendingCand.id); await store.consents.insert(licensePendingConsent)
const licensePendingPacket = buildPacket({ candidate: licensePendingCand, requisition: req2, consent: licensePendingConsent, newId: uid, nowIso: now })
licensePendingPacket.status = 'ready_to_submit'; licensePendingPacket.humanQaStatus = 'approved'; await store.packets.insert(licensePendingPacket)
const eLicense = await runApplicationGate({ candidate: licensePendingCand, requisition: req2, packet: licensePendingPacket, action: 'submission_attempt' })
ok('enforcer: license pending blocks submission', !eLicense.allowed && eLicense.result.missing.includes('license_verified_active'))
const qaPendingCand = mkCand({}); await store.candidates.insert(qaPendingCand)
const qaPendingConsent = mkConsent(qaPendingCand.id); await store.consents.insert(qaPendingConsent)
const qaPendingPacket = buildPacket({ candidate: qaPendingCand, requisition: req2, consent: qaPendingConsent, newId: uid, nowIso: now })
await store.packets.insert(qaPendingPacket)
const eQa = await runApplicationGate({ candidate: qaPendingCand, requisition: req2, packet: qaPendingPacket, action: 'submission_attempt' })
ok('enforcer: QA pending blocks submission', !eQa.allowed && eQa.result.missing.includes('employer_packet_qa_approved'))
const statusOnlyQaPacket = buildPacket({ candidate: qaPendingCand, requisition: req2, consent: qaPendingConsent, newId: uid, nowIso: now })
statusOnlyQaPacket.status = 'ready_to_submit'
await store.packets.insert(statusOnlyQaPacket)
const eQaStatusOnly = await runApplicationGate({ candidate: qaPendingCand, requisition: req2, packet: statusOnlyQaPacket, action: 'submission_attempt' })
ok('enforcer: ready_to_submit status without human QA still blocks', !eQaStatusOnly.allowed && eQaStatusOnly.result.missing.includes('employer_packet_qa_approved'))
const closedReq: JobRequisition = { ...req2, id: `closed-${run}`, status: 'closed' }; await store.requisitions.insert(closedReq)
const closedCand = mkCand({}); await store.candidates.insert(closedCand)
const closedConsent = { ...mkConsent(closedCand.id), jobRequisitionId: closedReq.id }; await store.consents.insert(closedConsent)
const closedPacket = buildPacket({ candidate: closedCand, requisition: closedReq, consent: closedConsent, newId: uid, nowIso: now })
closedPacket.status = 'ready_to_submit'; closedPacket.humanQaStatus = 'approved'; await store.packets.insert(closedPacket)
const eClosed = await runApplicationGate({ candidate: closedCand, requisition: closedReq, packet: closedPacket, action: 'submission_attempt' })
ok('enforcer: closed job blocks submission', !eClosed.allowed && eClosed.result.missing.includes('job_open'))
const unauthorizedEmployer: EmployerAccount = { id: `unauth-${run}`, name: `Cold Employer ${run}`, atsProvider: 'manual', integrationStatus: 'not_started', defaultBillingModel: 'direct', sourceChannel: 'direct', createdAt: now(), updatedAt: now() }
await store.employers.insert(unauthorizedEmployer)
const unauthorizedReq: JobRequisition = { ...job, id: `unauth-req-${run}`, employerId: unauthorizedEmployer.id }
await store.requisitions.insert(unauthorizedReq)
const unauthorizedCand = mkCand({}); await store.candidates.insert(unauthorizedCand)
const unauthorizedConsent: EmployerShareConsent = { ...mkConsent(unauthorizedCand.id), employerId: unauthorizedEmployer.id }
await store.consents.insert(unauthorizedConsent)
const unauthorizedPacket = buildPacket({ candidate: unauthorizedCand, requisition: unauthorizedReq, consent: unauthorizedConsent, newId: uid, nowIso: now })
unauthorizedPacket.status = 'ready_to_submit'; unauthorizedPacket.humanQaStatus = 'approved'; await store.packets.insert(unauthorizedPacket)
const eUnauthorized = await runApplicationGate({ candidate: unauthorizedCand, requisition: unauthorizedReq, packet: unauthorizedPacket, action: 'submission_attempt' })
ok('enforcer: unauthorized channel blocks submission', !eUnauthorized.allowed && eUnauthorized.result.missing.includes('channel_authorized'))
const lock = await acquireSubmissionLock({ candidateId: approvedCand.id, employerId: employer.id, requisitionId: req2.id, channel: 'direct' })
const e4 = await runApplicationGate({ candidate: approvedCand, requisition: req2, packet: approvedPacket, action: 'submission_attempt' })
ok('enforcer: duplicate submission lock blocks submission', lock.ok && !e4.allowed && e4.result.missing.includes('duplicate_submission_lock_clear'))
const secondLock = await acquireSubmissionLock({ candidateId: approvedCand.id, employerId: employer.id, requisitionId: req2.id, channel: 'direct' })
ok('lock: duplicate active lock acquisition returns existing lock', !secondLock.ok && secondLock.lock.id === lock.lock.id)
const crossChannelLock = await acquireSubmissionLock({ candidateId: approvedCand.id, employerId: employer.id, requisitionId: req2.id, channel: 'ats' })
ok('lock: active direct lock blocks ATS/channel duplicate too', !crossChannelLock.ok && crossChannelLock.lock.id === lock.lock.id)
if (lock.ok) await releaseSubmissionLock(lock.lock, 'smoke_cleanup')
const gateAudits = await store.audit.recent(50)
ok('enforcer: every gate check writes an audit event', gateAudits.filter((a) => a.action === 'application_gate.check').length >= 4)
ok('enforcer: rejected override writes an audit event', gateAudits.some((a) => a.action === 'application_gate.bypass_attempt'))

// ── Interest remains free before clearance ──────────────────────────────────
const interestCand = mkCand({ visaStatus: 'pending', licenseStatus: 'submitted', employerShareConsent: 'not_requested' }); await store.candidates.insert(interestCand)
const interestJob: FlorenceRNJob = { id: `job-${run}`, employerId: employer.id, employerName: employer.name, fingerprint: `fp-${run}`, title: 'RN', normalizedRole: 'registered_nurse', setting: 'hospital', status: 'open', displayAllowed: true, confidence: 'low', firstSeenAt: now(), lastSeenAt: now(), state: ST, requiredLicenseState: ST }
await store.demandJobs.insert(interestJob)
const interest = await registerInterest({ candidateId: interestCand.id, jobId: interestJob.id, consentGranted: false })
ok('interest: registration works before clearance', !!interest.id && interest.status === 'interested')

// ── Slate: visa-blocked drops to gatePending (Kaiser sees only cleared) ───────
const program: Program = { id: `prog-${run}`, employerId: employer.id, name: `Prog ${run}`, targetCount: 5, waveStructure: [5], status: 'active', channel: 'direct', createdAt: now(), updatedAt: now() } as Program
await store.programs.insert(program)
await store.consents.insert({ ...mkConsent(approvedCand.id), id: uid(), programId: program.id, grantedAt: now() })
await store.consents.insert({ ...mkConsent(blockedCand.id), id: uid(), programId: program.id, grantedAt: now() })
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
