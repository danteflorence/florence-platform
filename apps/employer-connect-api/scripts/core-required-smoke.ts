// Production Core-required smoke: production must not silently fall back to
// local-only gate/projection when Core M2M credentials are missing.
import type { ApplicationPacket, FlorenceCandidate, JobRequisition } from '../shared/types'

process.env.NODE_ENV = 'production'
delete process.env.FLORENCE_CORE_CLIENT_ID
delete process.env.FLORENCE_CORE_CLIENT_SECRET
delete process.env.CORE_ISSUER_URL
delete process.env.PUBLIC_CORE_URL

let pass = 0, fail = 0
const ok = (label: string, condition: boolean, extra?: string) => {
  console.log(`${condition ? '✓' : '✗'} ${label}${extra ? ` — ${extra}` : ''}`)
  condition ? (pass += 1) : (fail += 1)
}

const { checkCoreApplicationGate, submitThroughCoreApplicationGate, coreApplicationGateRequired } = await import('../server/coreApplicationGate')
const { applyCoreEmployerProjection } = await import('../server/packetProjection')

const candidate: FlorenceCandidate = {
  id: 'nurse-core-required',
  fullName: 'Synthetic Nurse',
  specialtyExperience: ['icu'],
  readinessBand: 'green',
  nclexStatus: 'passed',
  licenseStatus: 'issued',
  visaStatus: 'approved',
  targetStates: ['TX'],
  employerShareConsent: 'granted',
  humanQaStatus: 'approved',
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-06-25T00:00:00.000Z',
}
const requisition: JobRequisition = {
  id: 'req-core-required',
  employerId: 'emp-core-required',
  atsProvider: 'manual',
  title: 'RN',
  setting: 'inpatient',
  status: 'open',
  requiredLicenseState: 'TX',
  sourceChannel: 'direct',
  importedAt: '2026-06-25T00:00:00.000Z',
  lastSyncedAt: '2026-06-25T00:00:00.000Z',
}
const packet: ApplicationPacket = {
  id: 'packet-core-required',
  candidateId: candidate.id,
  jobRequisitionId: requisition.id,
  employerId: requisition.employerId,
  readinessPassport: {
    candidateId: candidate.id,
    readinessBand: 'green',
    nclexStatus: 'passed',
    licenseStatus: 'issued',
    licenseStateTarget: 'TX',
    specialtyExperience: ['icu'],
    yearsExperience: 5,
    credentialCompletenessPct: 100,
    humanQaStatus: 'approved',
    shareableSummaryText: 'Synthetic employer-safe readiness summary.',
  },
  documents: [],
  sharedFields: { readiness_band: 'green' },
  withheldFields: [],
  humanQaStatus: 'approved',
  status: 'ready_to_submit',
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-06-25T00:00:00.000Z',
}

ok('Core gate is required in production', coreApplicationGateRequired)
const gate = await checkCoreApplicationGate({ candidate, requisition, packet, action: 'submission_attempt', channel: 'direct' })
ok('production gate check fails closed without Core credentials', gate.checked && !gate.ok && /credentials are required/i.test(gate.error ?? ''))
const submit = await submitThroughCoreApplicationGate({ candidate, requisition, packet, action: 'submission_attempt', channel: 'direct' })
ok('production Core submit lock fails closed without Core credentials', submit.checked && !submit.ok && /credentials are required/i.test(submit.error ?? ''))
let projectionBlocked = false
try {
  await applyCoreEmployerProjection(packet, candidate)
} catch (error) {
  projectionBlocked = /credentials are required/i.test((error as Error).message)
}
ok('production employer packet projection fails closed without Core credentials', projectionBlocked)

console.log(`\n${fail ? 'CORE REQUIRED SMOKE FAILED' : 'CORE REQUIRED SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
