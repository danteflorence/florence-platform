// Employer Connect production-readiness smoke with a fake local Core.
// Proves Core Application Gate check + submit lock, Core employer packet projection,
// status reconciliation, Program Workspace channels, and tenant-scoped programs.
import { createServer } from 'node:http'
import type { IncomingMessage } from 'node:http'
import type { EmployerAccount, EmployerShareConsent, FlorenceCandidate, JobRequisition, Program } from '../shared/types'
import type { FlorenceRNJob } from '../shared/demand-types'

let pass = 0, fail = 0
const ok = (label: string, condition: boolean, extra?: string) => {
  console.log(`${condition ? '✓' : '✗'} ${label}${extra ? ` — ${extra}` : ''}`)
  condition ? (pass += 1) : (fail += 1)
}

const coreCalls = {
  gateChecks: 0,
  submits: 0,
  passportViews: 0,
  events: [] as string[],
}

function readJson(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8')
      resolve(text ? JSON.parse(text) : {})
    })
  })
}

const core = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json')
  if (req.method === 'POST' && req.url === '/oauth/token') {
    res.end(JSON.stringify({ access_token: 'fake-core-token', expires_in: 3600 }))
    return
  }
  if (req.method === 'POST' && req.url === '/v1/nurse/resolve') {
    const body = await readJson(req)
    res.end(JSON.stringify({ nurseId: `core-${body.ref?.externalId ?? body.email ?? 'nurse'}` }))
    return
  }
  if (req.method === 'POST' && req.url === '/v1/application-gate/check') {
    coreCalls.gateChecks += 1
    res.end(JSON.stringify({ gate: { ok: true, status: 'ready_to_submit', failureCodes: [], reasons: [], subjectTo: ['credentialing'], subjectToMessage: 'Core subject-to message' } }))
    return
  }
  if (req.method === 'POST' && req.url === '/v1/applications/submit') {
    coreCalls.submits += 1
    res.statusCode = 201
    res.end(JSON.stringify({ ok: true, gate: { ok: true, status: 'ready_to_submit', failureCodes: [], reasons: [], subjectTo: ['credentialing'], subjectToMessage: 'Core subject-to message' }, submissionLockId: `core-lock-${coreCalls.submits}` }))
    return
  }
  if (req.method === 'GET' && req.url?.startsWith('/v1/nurse/passport')) {
    coreCalls.passportViews += 1
    res.end(JSON.stringify({
      passport: {
        readinessBand: 'green',
        nclexStatus: 'passed',
        licenseStatus: 'issued',
        licenseStateTarget: 'TX',
        specialtyExperience: ['icu'],
        yearsExperience: 6,
        expectedStartWindow: '2027-Q1',
      },
      withheld: [
        { field: 'passport_number', reason: 'Restricted identity document' },
        { field: 'DS-160', reason: 'Restricted immigration detail' },
        { field: 'financing_underwriting', reason: 'Restricted financing signal' },
      ],
    }))
    return
  }
  if (req.method === 'POST' && req.url === '/v1/nurse/event') {
    const body = await readJson(req)
    coreCalls.events.push(String(body.type ?? 'unknown'))
    res.end(JSON.stringify({ ok: true, nurseId: `core-${body.ref?.externalId ?? 'nurse'}` }))
    return
  }
  res.statusCode = 404
  res.end(JSON.stringify({ error: 'not found' }))
})

await new Promise<void>((resolve) => core.listen(0, '127.0.0.1', () => resolve()))
const coreUrl = `http://127.0.0.1:${(core.address() as { port: number }).port}`

process.env.CORE_ISSUER_URL = coreUrl
process.env.PUBLIC_CORE_URL = coreUrl
process.env.FLORENCE_CORE_CLIENT_ID = 'employer-connect-smoke'
process.env.FLORENCE_CORE_CLIENT_SECRET = 'fake-local-secret'
process.env.LEDGER_CANONICAL = 'core'

const { store, uid, now } = await import('../server/db')
const { buildPacket } = await import('../shared/packet')
const { applyCoreEmployerProjection } = await import('../server/packetProjection')
const { runApplicationGate } = await import('../server/applicationGateEnforce')
const { submitThroughCoreApplicationGate } = await import('../server/coreApplicationGate')
const { recordLedger } = await import('../server/ledger')
const { registerInterest } = await import('../server/demand/interest')
const { weeklyOperatingDashboard } = await import('../server/statusReconciliation')
const { programSubmissionChannel } = await import('../server/program/slate')

try {
  const run = uid().slice(0, 8)
  const employer: EmployerAccount = { id: `emp-${run}`, name: `Employer ${run}`, atsProvider: 'manual', integrationStatus: 'manual', defaultBillingModel: 'direct', sourceChannel: 'direct', createdAt: now(), updatedAt: now() }
  const amnEmployer: EmployerAccount = { ...employer, id: `amn-${run}`, name: `AMN ${run}`, defaultBillingModel: 'channel', sourceChannel: 'amn' }
  const otherEmployer: EmployerAccount = { ...employer, id: `other-${run}`, name: `Other ${run}` }
  await store.employers.insert(employer)
  await store.employers.insert(amnEmployer)
  await store.employers.insert(otherEmployer)

  const req: JobRequisition = { id: `req-${run}`, employerId: employer.id, atsProvider: 'manual', title: 'RN ICU', setting: 'inpatient', status: 'open', requiredLicenseState: 'TX', sourceChannel: 'direct', importedAt: now(), lastSyncedAt: now() }
  await store.requisitions.insert(req)

  const candidate = (over: Partial<FlorenceCandidate> = {}): FlorenceCandidate => ({
    id: uid(), fullName: `Nurse ${uid().slice(0, 5)}`, email: `n.${uid().slice(0, 6)}@example.test`, specialtyExperience: ['icu'], yearsExperience: 6,
    readinessBand: 'green', nclexStatus: 'passed', licenseStatus: 'issued', visaStatus: 'approved', targetStates: ['TX'],
    expectedStartWindow: '2027-Q1', employerShareConsent: 'granted', humanQaStatus: 'approved', createdAt: now(), updatedAt: now(), ...over,
  })
  const ready = candidate()
  const blocked = candidate({ visaStatus: 'pending', licenseStatus: 'submitted', employerShareConsent: 'not_requested' })
  await store.candidates.insert(ready)
  await store.candidates.insert(blocked)

  const consent = (candidateId: string): EmployerShareConsent => ({ id: uid(), candidateId, employerId: employer.id, jobRequisitionId: req.id, purpose: 'employer_share', allowedData: ['resume', 'credential_summary', 'readiness_summary', 'video_profile'], consentTextVersion: 'v1', consentTextHash: 'hash', grantedAt: now() })
  const readyConsent = consent(ready.id)
  await store.consents.insert(readyConsent)

  const packet = await applyCoreEmployerProjection(buildPacket({ candidate: ready, requisition: req, consent: readyConsent, newId: uid, nowIso: now }), ready)
  packet.status = 'ready_to_submit'
  packet.humanQaStatus = 'approved'
  await store.packets.insert(packet)
  ok('Core projection: employer packet came from Core view', coreCalls.passportViews >= 1)
  ok('Core projection: shared fields contain no financing, DS-160, or passport number', !/financ|ds[-_]?160|passport/i.test(JSON.stringify(packet.sharedFields)))
  ok('Core projection: restricted fields are audit-withheld', ['passport', 'ds-160', 'financ'].every((term) => packet.withheldFields.some((field) => new RegExp(term, 'i').test(`${field.field} ${field.reason}`))))

  const gate = await runApplicationGate({ candidate: ready, requisition: req, packet, action: 'submission_attempt', channel: 'direct' })
  ok('Application Gate: Core check is enforced when configured', gate.allowed && gate.coreGate?.checked === true && coreCalls.gateChecks >= 1)
  const blockedGate = await runApplicationGate({ candidate: blocked, requisition: req, packet: null, action: 'submission_attempt', channel: 'direct' })
  ok('Application Gate: pre-gate formal application is blocked', !blockedGate.allowed && blockedGate.result.allowedAction === 'express_interest')

  const coreSubmit = await submitThroughCoreApplicationGate({ candidate: ready, requisition: req, packet, action: 'submission_attempt', channel: 'direct' })
  ok('Core SubmissionLock: formal submit acquires Core lock', coreSubmit.ok && !!coreSubmit.submissionLockId && coreCalls.submits === 1)

  const demandJob: FlorenceRNJob = { id: `job-${run}`, employerId: employer.id, employerName: employer.name, fingerprint: `fp-${run}`, title: 'RN ICU', normalizedRole: 'registered_nurse', setting: 'hospital', status: 'open', displayAllowed: true, confidence: 'low', firstSeenAt: now(), lastSeenAt: now(), state: 'TX', requiredLicenseState: 'TX' }
  await store.demandJobs.insert(demandJob)
  const interest = await registerInterest({ candidateId: blocked.id, jobId: demandJob.id, consentGranted: false })
  ok('Interest: pre-gate nurse can express interest', !!interest.id && interest.status === 'interested')

  await recordLedger({ candidateId: ready.id, stage: 'matched', employerId: employer.id, jobRequisitionId: req.id })
  await recordLedger({ candidateId: ready.id, stage: 'packet_created', sourceId: packet.id, employerId: employer.id, jobRequisitionId: req.id })
  await recordLedger({ candidateId: ready.id, stage: 'qa_approved', sourceId: packet.id, employerId: employer.id, jobRequisitionId: req.id })
  await recordLedger({ candidateId: ready.id, stage: 'application_ready_to_submit', sourceId: packet.id, employerId: employer.id, jobRequisitionId: req.id })
  await recordLedger({ candidateId: ready.id, stage: 'ats_application_submitted', sourceId: packet.id, employerId: employer.id, jobRequisitionId: req.id, verifiedVia: 'ats' })
  await recordLedger({ candidateId: ready.id, stage: 'interview_scheduled', employerId: employer.id })
  await recordLedger({ candidateId: ready.id, stage: 'offer_made', employerId: employer.id })
  await recordLedger({ candidateId: ready.id, stage: 'start_scheduled', employerId: employer.id, verifiedVia: 'employer_attestation' })
  await recordLedger({ candidateId: ready.id, stage: 'started', employerId: employer.id, verifiedVia: 'employer_attestation' })
  await recordLedger({ candidateId: ready.id, stage: 'retention_30d', employerId: employer.id, verifiedVia: 'employer_attestation' })
  ok('Core ledger: packet, ready, submit, start, and billing events mirror to Core', ['employer_packet.created', 'application.ready_to_submit', 'ats.packet_submitted', 'ats.started', 'billing.subscription_started'].every((type) => coreCalls.events.includes(type)))

  const amnProgram: Program = { id: `prog-amn-${run}`, employerId: amnEmployer.id, name: `AMN 100-RN ${run}`, targetCount: 100, waveStructure: [50, 50], status: 'active', channel: 'amn', createdAt: now(), updatedAt: now() }
  const kaiserProgram: Program = { id: `prog-kaiser-${run}`, employerId: employer.id, name: `Kaiser 200-RN ${run}`, targetCount: 200, waveStructure: [50, 50, 100], status: 'active', channel: 'kaiser', createdAt: now(), updatedAt: now() }
  const tenetProgram: Program = { id: `prog-tenet-${run}`, employerId: employer.id, name: `Tenet 100-RN ${run}`, targetCount: 100, waveStructure: [25, 25, 50], status: 'active', channel: 'tenet', createdAt: now(), updatedAt: now() }
  const directProgram: Program = { id: `prog-direct-${run}`, employerId: employer.id, name: `Direct employer ${run}`, targetCount: 100, waveStructure: [100], status: 'active', channel: 'direct_employer', createdAt: now(), updatedAt: now() }
  const vmsProgram: Program = { id: `prog-vms-${run}`, employerId: otherEmployer.id, name: `VMS 200-RN ${run}`, targetCount: 200, waveStructure: [100, 100], status: 'active', channel: 'vms_partner', createdAt: now(), updatedAt: now() }
  for (const program of [amnProgram, kaiserProgram, tenetProgram, directProgram, vmsProgram]) {
    await store.programs.insert(program)
    for (let i = 0; i < program.waveStructure.length; i++) {
      await store.programWaves.insert({ id: uid(), programId: program.id, waveNumber: i + 1, targetCount: program.waveStructure[i]!, status: 'planned', createdAt: now() })
    }
  }
  ok('Program Workspace: AMN/Kaiser/Tenet/direct/VMS channels are representable', [amnProgram, kaiserProgram, tenetProgram, directProgram, vmsProgram].every((program) => program.targetCount === 100 || program.targetCount === 200))
  ok('Program Workspace: channels map to formal submission channels', programSubmissionChannel('amn') === 'amn' && programSubmissionChannel('vms_partner') === 'vms' && programSubmissionChannel('kaiser') === 'direct' && programSubmissionChannel('tenet') === 'direct' && programSubmissionChannel('direct_employer') === 'direct')
  const amnVisible = await store.programs.byEmployer(amnEmployer.id)
  ok('Tenant scope: AMN employer cannot see non-AMN employer programs', amnVisible.length === 1 && amnVisible[0]?.id === amnProgram.id)

  const weekly = await weeklyOperatingDashboard({ windowDays: 7 })
  ok('Weekly dashboard: status ladder exists', ['interest', 'matched', 'packet_created', 'submitted', 'interview', 'offer', 'onboarding', 'started', 'retained'].every((stage) => stage in weekly.statusReconciliation))
  ok('Weekly dashboard: start event is billing-ready', weekly.billingReady.verifiedStarts >= 1 && weekly.statusReconciliation.started >= 1)
  ok('Weekly dashboard: 100/200 nurse waves are represented', weekly.programs.waveTargets >= 700 && weekly.programs.channels.amn >= 1 && weekly.programs.channels.kaiser >= 1 && weekly.programs.channels.vms_partner >= 1)
} finally {
  core.close()
}

console.log(`\n${fail ? 'EMPLOYER CONNECT PRODUCTION SMOKE FAILED' : 'EMPLOYER CONNECT PRODUCTION SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
