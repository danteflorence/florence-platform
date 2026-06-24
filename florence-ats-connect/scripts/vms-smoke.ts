// VMS Connect proof. V1 slice = the compliance core: canSubmitToVMS (channel-aware
// Application Gate) + the VMS-safe (employer-safe) packet. Interest is free; FlorenceRN
// submits to a VMS/MSP ONLY when consent + visa + license + QA + job-open + channel are all
// clear (fail-closed). The VMS packet excludes financing/visa/nationality by default.
// Pure (no store) — runs identically on any backend.
import { randomUUID } from 'node:crypto'
import { canSubmitToVMS, VMS_SUBJECT_TO } from '../shared/vms'
import { buildPacket } from '../shared/packet'
import type { FlorenceCandidate, JobRequisition, EmployerShareConsent } from '../shared/types'
import type { VMSProgram, VMSRequisition } from '../shared/vms-types'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }
const uid = () => randomUUID()
const now = () => new Date('2026-06-15T00:00:00Z').toISOString()
const ST = 'NV'

const mkCand = (over: Partial<FlorenceCandidate>): FlorenceCandidate => ({
  id: uid(), fullName: `Nurse ${uid().slice(0, 5)}`, email: `n.${uid().slice(0, 6)}@t.dev`, specialtyExperience: ['med_surg'],
  readinessBand: 'green', nclexStatus: 'passed', licenseStatus: 'issued', visaStatus: 'approved', targetStates: [ST],
  employerShareConsent: 'granted', humanQaStatus: 'approved', createdAt: now(), updatedAt: now(), ...over,
})

const EMP = `emp-${uid().slice(0, 6)}`
const program = (over: Partial<VMSProgram> = {}): VMSProgram => ({
  id: `vmsprog-${uid().slice(0, 6)}`, provider: 'amn', partnerOrgId: 'org-amn', partnerName: 'AMN',
  customerEmployerId: EMP, programType: 'msp', integrationMode: 'csv', status: 'active', integrationAuthorized: true,
  allowedScopes: [], createdAt: now(), updatedAt: now(), ...over,
})
const requisition = (over: Partial<VMSRequisition> = {}): VMSRequisition => ({
  id: `vmsreq-${uid().slice(0, 6)}`, vmsProgramId: 'vmsprog', employerId: EMP, title: 'RN — Med/Surg',
  normalizedRole: 'registered_nurse', specialty: 'med_surg', setting: 'hospital', state: ST, requiredLicenseState: ST,
  status: 'open', firstSeenAt: now(), ...over,
})
const READY = {
  employerShareConsentGranted: true,
  packetQaApproved: true,
  documentsComplete: true,
  dataMinimizedPacketGenerated: true,
  duplicateSubmissionLockClear: true,
}

// ── canSubmitToVMS — fully ready ───────────────────────────────────────────────
const ready = canSubmitToVMS({ candidate: mkCand({}), requisition: requisition(), program: program(), opts: READY })
ok('vms-gate: fully ready ⇒ ok + ready_to_submit + submit_vms_packet', ready.ok && ready.gate_status === 'ready_to_submit' && ready.allowed_action === 'submit_vms_packet')
ok('vms-gate: ready decision carries vms_or_msp_acceptance in subject_to', ready.subject_to.includes('vms_or_msp_acceptance') && VMS_SUBJECT_TO.includes('consular_processing'))

// ── Fail-closed on each gate ───────────────────────────────────────────────────
const visaUnknown = canSubmitToVMS({ candidate: mkCand({ visaStatus: 'unknown' }), requisition: requisition(), program: program(), opts: READY })
ok('vms-gate: visa unknown ⇒ BLOCKED + express_interest (fail-closed headline)', !visaUnknown.ok && visaUnknown.missing_gates.includes('visa_approved') && visaUnknown.gate_status === 'visa_pending' && visaUnknown.allowed_action === 'express_interest')
ok('vms-gate: visa undefined ⇒ BLOCKED', !canSubmitToVMS({ candidate: mkCand({ visaStatus: undefined }), requisition: requisition(), program: program(), opts: READY }).ok)
ok('vms-gate: no consent ⇒ missing_consent', (() => { const g = canSubmitToVMS({ candidate: mkCand({}), requisition: requisition(), program: program(), opts: { ...READY, employerShareConsentGranted: false } }); return g.missing_gates.includes('employer_share_consent') && g.gate_status === 'missing_consent' })())
ok('vms-gate: license not verified ⇒ license_pending', (() => { const g = canSubmitToVMS({ candidate: mkCand({ licenseStatus: 'submitted' }), requisition: requisition(), program: program(), opts: READY }); return g.missing_gates.includes('license_verified_active') && g.gate_status === 'license_pending' })())
ok('vms-gate: no QA ⇒ qa_pending', canSubmitToVMS({ candidate: mkCand({}), requisition: requisition(), program: program(), opts: {} }).gate_status === 'qa_pending')
ok('vms-gate: requisition on hold ⇒ job_open missing', canSubmitToVMS({ candidate: mkCand({}), requisition: requisition({ status: 'hold' }), program: program(), opts: READY }).missing_gates.includes('job_open'))

// ── Channel authorization (the VMS-specific gate) ──────────────────────────────
ok('vms-gate: program PAUSED ⇒ vms_authorized missing', canSubmitToVMS({ candidate: mkCand({}), requisition: requisition(), program: program({ status: 'paused' }), opts: READY }).missing_gates.includes('vms_authorized'))
ok('vms-gate: integration NOT authorized ⇒ vms_authorized missing', canSubmitToVMS({ candidate: mkCand({}), requisition: requisition(), program: program({ integrationAuthorized: false }), opts: READY }).missing_gates.includes('vms_authorized'))
ok('vms-gate: sandbox program (not active) ⇒ blocked', !canSubmitToVMS({ candidate: mkCand({}), requisition: requisition(), program: program({ status: 'sandbox' }), opts: READY }).ok)

// ── VMS-safe packet = employer-safe packet (excludes financing/visa/nationality) ──
const cand = mkCand({})
const jobReq: JobRequisition = { id: `req-${uid().slice(0, 6)}`, employerId: EMP, atsProvider: 'manual', title: 'RN — Med/Surg', setting: 'inpatient', status: 'open', requiredLicenseState: ST, sourceChannel: 'amn', importedAt: now(), lastSyncedAt: now() }
const consent: EmployerShareConsent = { id: uid(), candidateId: cand.id, employerId: EMP, purpose: 'employer_share', allowedData: ['resume', 'credential_summary', 'readiness_summary'], consentTextVersion: 'v1', consentTextHash: 'hash', grantedAt: now() }
const pkt = buildPacket({ candidate: cand, requisition: jobReq, consent, newId: uid, nowIso: now })
ok('vms-packet: consent-gated employer-safe packet builds', !!pkt.id && pkt.employerId === EMP)
ok('vms-packet: withholds visa/immigration + financing (audit-named)', pkt.withheldFields.some((w) => /visa|immigration/i.test(w.field + w.reason)) && pkt.withheldFields.some((w) => /financ|underwrit/i.test(w.field + w.reason)))
// The SHAREABLE payload (what actually reaches the VMS) must carry none of the prohibited
// data — the withheldFields list legitimately NAMES them (that's the audit trail).
const shareable = JSON.stringify({ sharedFields: pkt.sharedFields, readinessPassport: pkt.readinessPassport, documents: pkt.documents })
ok('vms-packet: SHAREABLE payload carries NO visa/nationality/financing', !/visa|nationality|financ|underwrit/i.test(shareable))
let threw = false
try { buildPacket({ candidate: cand, requisition: jobReq, consent: null, newId: uid, nowIso: now }) } catch { threw = true }
ok('vms-packet: NO consent ⇒ ConsentRequiredError (fail-closed)', threw)

console.log(`\n${fail ? 'VMS SMOKE FAILED' : 'VMS SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
