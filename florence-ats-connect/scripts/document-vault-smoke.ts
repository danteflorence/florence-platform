// ============================================================================
// ATS Connect Document Vault smoke.
// Runs without an HTTP listener so local security verification is not blocked by
// environments that disallow binding localhost.
// ============================================================================
import { store, uid, now } from '../server/db'
import { createAtsDocumentVault, DocumentVaultError } from '../server/documentVault'
import { buildResumePdf, resumeFilename } from '../server/resumePdf'
import { runApplicationGate } from '../server/applicationGateEnforce'
import { buildPacket } from '../shared/packet'
import type { EmployerAccount, EmployerShareConsent, FlorenceCandidate, JobRequisition } from '../shared/types'

let pass = 0, fail = 0
const ok = (label: string, condition: boolean, extra?: string) => {
  console.log(`${condition ? '✓' : '✗'} ${label}${extra ? ` — ${extra}` : ''}`)
  condition ? (pass += 1) : (fail += 1)
}

const run = uid().slice(0, 8)
const state = 'WA'
let clock = new Date()
const vault = createAtsDocumentVault({
  store,
  publicBaseUrl: 'https://ats-connect.test',
  newId: uid,
  now: () => clock,
})

function signedToken(url: string): string {
  const marker = '/api/p/'
  const start = url.indexOf(marker)
  if (start === -1) throw new Error('signed URL missing vault token path')
  return url.slice(start + marker.length).replace(/\/resume\.pdf$/, '')
}

function mkCandidate(overrides: Partial<FlorenceCandidate> = {}): FlorenceCandidate {
  return {
    id: uid(),
    fullName: `Synthetic Nurse ${uid().slice(0, 6)}`,
    email: `nurse.${uid().slice(0, 6)}@example.test`,
    specialtyExperience: ['med_surg'],
    yearsExperience: 4,
    readinessBand: 'green',
    nclexStatus: 'passed',
    licenseStatus: 'issued',
    visaStatus: 'approved',
    targetStates: [state],
    expectedStartWindow: 'Q1 2027',
    employerShareConsent: 'granted',
    humanQaStatus: 'approved',
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  }
}

function mkConsent(candidateId: string, employerId: string): EmployerShareConsent {
  return {
    id: uid(),
    candidateId,
    employerId,
    purpose: 'employer_share',
    allowedData: ['resume', 'credential_summary', 'readiness_summary', 'video_profile'],
    consentTextVersion: 'employer-share-v1',
    consentTextHash: `hash-${run}`,
    grantedAt: now(),
  }
}

function mkPacket(candidate: FlorenceCandidate, requisition: JobRequisition, consent: EmployerShareConsent) {
  const packet = buildPacket({ candidate, requisition, consent, newId: uid, nowIso: now })
  packet.status = 'ready_to_submit'
  packet.humanQaStatus = 'approved'
  return packet
}

async function expectVaultError(label: string, expectedCode: string, fn: () => Promise<unknown>) {
  try {
    await fn()
    ok(label, false, 'expected denial')
  } catch (err) {
    ok(label, err instanceof DocumentVaultError && err.code === expectedCode, err instanceof Error ? err.message : String(err))
  }
}

async function main() {
  const employer: EmployerAccount = {
    id: `emp-vault-${run}`,
    name: `Vault Employer ${run}`,
    atsProvider: 'manual',
    integrationStatus: 'manual',
    defaultBillingModel: 'direct',
    sourceChannel: 'direct',
    createdAt: now(),
    updatedAt: now(),
  }
  const otherEmployer: EmployerAccount = {
    ...employer,
    id: `emp-other-${run}`,
    name: `Other Employer ${run}`,
  }
  await store.employers.insert(employer)
  await store.employers.insert(otherEmployer)

  const requisition: JobRequisition = {
    id: `req-vault-${run}`,
    employerId: employer.id,
    atsProvider: 'manual',
    title: 'Registered Nurse',
    setting: 'inpatient',
    status: 'open',
    sourceChannel: 'direct',
    requiredLicenseState: state,
    importedAt: now(),
    lastSyncedAt: now(),
  }
  await store.requisitions.insert(requisition)

  const candidate = mkCandidate()
  await store.candidates.insert(candidate)
  const consent = mkConsent(candidate.id, employer.id)
  await store.consents.insert(consent)
  const packet = mkPacket(candidate, requisition, consent)
  await store.packets.insert(packet)
  const pdf = buildResumePdf({ packet, candidate, requisition })
  const document = await vault.upload({
    documentType: 'employer_packet',
    candidateId: candidate.id,
    employerId: employer.id,
    packetId: packet.id,
    filename: resumeFilename(packet, candidate),
    contentType: 'application/pdf',
    bytes: pdf,
    actor: { id: 'ops-vault-smoke', role: 'ops' },
  })
  ok('vault: upload stores encrypted packet bytes', !document.encryptedBlob.includes('%PDF-') && !document.encryptedBlob.includes(candidate.fullName))

  const signed = await vault.createSignedUrl({
    documentId: document.id,
    actor: { id: 'ops-vault-smoke', role: 'ops' },
    recipientView: 'employer',
    recipientOrgId: employer.id,
    purpose: 'application_packet_release',
  })
  ok('vault: signed URL is opaque', signed.url.includes('/api/p/') && !signed.url.includes(candidate.id) && !signed.url.includes(packet.id) && !signed.url.includes(candidate.fullName))
  const redeemed = await vault.downloadSignedUrl(signedToken(signed.url), {
    beforeDecrypt: async () => {
      const gate = await runApplicationGate({ candidate, requisition, packet, auditEntity: 'packet', action: 'packet_release', channel: 'ats' })
      if (!gate.allowed) throw new DocumentVaultError('application_gate_not_cleared', 'Application gate is not cleared.', 409)
    },
  })
  ok('vault: signed URL redeems only after gate revalidation', redeemed.bytes.subarray(0, 5).toString('utf8') === '%PDF-')

  await expectVaultError('vault: wrong tenant cannot generate signed URL', 'wrong_tenant', () => vault.createSignedUrl({
    documentId: document.id,
    actor: { id: 'other-employer', role: 'employer', employerId: otherEmployer.id },
    recipientView: 'employer',
    recipientOrgId: otherEmployer.id,
    purpose: 'application_packet_release',
  }))

  await expectVaultError('vault: employer view cannot access ATS/VMS packet', 'document_type_denied', async () => {
    const vmsDoc = await vault.upload({
      documentType: 'ats_vms_submission_packet',
      candidateId: candidate.id,
      employerId: employer.id,
      packetId: packet.id,
      filename: resumeFilename(packet, candidate),
      contentType: 'application/pdf',
      bytes: pdf,
      actor: { id: 'ops-vault-smoke', role: 'ops' },
    })
    await vault.createSignedUrl({
      documentId: vmsDoc.id,
      actor: { id: 'ops-vault-smoke', role: 'ops' },
      recipientView: 'employer',
      recipientOrgId: employer.id,
      purpose: 'application_packet_release',
    })
  })

  const blockedCandidate = mkCandidate({ visaStatus: 'unknown' })
  await store.candidates.insert(blockedCandidate)
  const blockedConsent = mkConsent(blockedCandidate.id, employer.id)
  await store.consents.insert(blockedConsent)
  const blockedPacket = mkPacket(blockedCandidate, requisition, blockedConsent)
  await store.packets.insert(blockedPacket)
  const blockedPdf = buildResumePdf({ packet: blockedPacket, candidate: blockedCandidate, requisition })
  const blockedDoc = await vault.upload({
    documentType: 'employer_packet',
    candidateId: blockedCandidate.id,
    employerId: employer.id,
    packetId: blockedPacket.id,
    filename: resumeFilename(blockedPacket, blockedCandidate),
    contentType: 'application/pdf',
    bytes: blockedPdf,
    actor: { id: 'ops-vault-smoke', role: 'ops' },
  })
  const blockedSigned = await vault.createSignedUrl({
    documentId: blockedDoc.id,
    actor: { id: 'ops-vault-smoke', role: 'ops' },
    recipientView: 'employer',
    recipientOrgId: employer.id,
    purpose: 'application_packet_release',
  })
  await expectVaultError('vault: signed URL still fails when Application Gate blocks', 'application_gate_not_cleared', () => vault.downloadSignedUrl(signedToken(blockedSigned.url), {
    beforeDecrypt: async () => {
      const gate = await runApplicationGate({ candidate: blockedCandidate, requisition, packet: blockedPacket, auditEntity: 'packet', action: 'packet_release', channel: 'ats' })
      if (!gate.allowed) throw new DocumentVaultError('application_gate_not_cleared', 'Application gate is not cleared.', 409)
    },
  }))

  const revokedConsentSigned = await vault.createSignedUrl({
    documentId: document.id,
    actor: { id: 'ops-vault-smoke', role: 'ops' },
    recipientView: 'employer',
    recipientOrgId: employer.id,
    purpose: 'application_packet_release',
  })
  consent.revokedAt = now()
  await store.consents.update(consent)
  await expectVaultError('vault: signed URL revalidates live consent before decryption', 'missing_consent', () => vault.downloadSignedUrl(signedToken(revokedConsentSigned.url)))

  consent.revokedAt = undefined
  await store.consents.update(consent)
  const expiring = await vault.createSignedUrl({
    documentId: document.id,
    actor: { id: 'ops-vault-smoke', role: 'ops' },
    recipientView: 'employer',
    recipientOrgId: employer.id,
    purpose: 'application_packet_release',
    ttlSeconds: 1,
  })
  clock = new Date(clock.getTime() + 2_000)
  await expectVaultError('vault: expired signed URL fails closed', 'grant_expired', () => vault.downloadSignedUrl(signedToken(expiring.url)))
  clock = new Date()

  const revoked = await vault.createSignedUrl({
    documentId: document.id,
    actor: { id: 'ops-vault-smoke', role: 'ops' },
    recipientView: 'employer',
    recipientOrgId: employer.id,
    purpose: 'application_packet_release',
  })
  await vault.revokeDocument(document.id, { id: 'ops-vault-smoke', role: 'ops' })
  await expectVaultError('vault: revoked document grant fails closed', 'grant_revoked', () => vault.downloadSignedUrl(signedToken(revoked.url)))

  await expectVaultError('vault: unsafe upload type is rejected', 'unsupported_content_type', () => vault.upload({
    documentType: 'employer_packet',
    candidateId: candidate.id,
    employerId: employer.id,
    packetId: packet.id,
    filename: 'packet.exe',
    contentType: 'application/octet-stream',
    bytes: Buffer.from('not-a-pdf'),
    actor: { id: 'ops-vault-smoke', role: 'ops' },
  }))

  const blockingVault = createAtsDocumentVault({
    store,
    publicBaseUrl: 'https://ats-connect.test',
    newId: uid,
    now: () => clock,
    scanner: {
      async scan() {
        return { status: 'blocked', reason: 'synthetic_malware' }
      },
    },
  })
  await expectVaultError('vault: malware scanner hook can block upload', 'malware_blocked', () => blockingVault.upload({
    documentType: 'employer_packet',
    candidateId: candidate.id,
    employerId: employer.id,
    packetId: packet.id,
    filename: 'blocked-packet.pdf',
    contentType: 'application/pdf',
    bytes: pdf,
    actor: { id: 'ops-vault-smoke', role: 'ops' },
  }))

  const audits = await store.audit.recent(500)
  ok('vault: upload/share/download/failed/delete audit events are recorded', ['document.upload', 'document.share', 'document.download', 'document.access_denied', 'document.delete'].every((action) => audits.some((a) => a.action === action)))

  if (fail) {
    console.error(`\n${fail} failed, ${pass} passed`)
    process.exit(1)
  }
  console.log(`\n${pass} passed`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
