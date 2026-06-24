// Licensed RN Slate generator — produces employer-ready packets ONLY for nurses
// who are licensed + employer-ready (matching's `ready_to_submit`), operationalizing
// "Kaiser sees only licensed RNs". Pure composition over the existing gates:
//   - eligibility = matchCandidateToRequisition().category === 'ready_to_submit'
//     (requires nclex passed + license issued/approved + state-feasible + consent + no blockers)
//   - redaction  = buildPacket() consent gate + withheldFields (visa/nationality/financing)
// Riskiest decision (handled): we do NOT fabricate one program-wide license state.
// Each candidate is matched against the employer's REAL open requisitions; only when
// the employer has none do we fall back to a synthetic, state-agnostic requisition.

import { store, uid, now, audit } from '../db'
import { matchCandidateToRequisition } from '../../shared/matching'
import { buildPacket, ConsentRequiredError } from '../../shared/packet'
import { recordLedger } from '../ledger'
import { applicationGate } from '../../shared/applicationGate'
import { runApplicationGate } from '../applicationGateEnforce'
import { requireEmployerShareConsent } from '../consentService'
import { acquireSubmissionLock, releaseSubmissionLock } from '../submissionLock'
import type { ApplicationPacket, FlorenceCandidate, JobRequisition, MatchResult, Program, ProgramSlate } from '../../shared/types'
import type { SubmissionLock } from '../../shared/vms-types'

export interface SlateCandidate {
  candidateId: string
  fullName: string
  matchScore: number
  requisitionId: string
  lockedInSlateId?: string
  /** Why a candidate is in gatePending (e.g. 'work authorization not cleared'). */
  gateReason?: string
}
export interface LicensedSlate {
  programId: string
  employerId: string
  eligible: SlateCandidate[]        // ready_to_submit + consented + visa-cleared + not locked
  consentPending: SlateCandidate[]  // licensed/ready but employer-share consent missing
  gatePending: SlateCandidate[]     // matched ready_to_submit but blocked by the application gate (e.g. visa)
  lockedCount: number
}

function syntheticReq(program: Program): JobRequisition {
  // Fallback ONLY when the employer has no open reqs. State-agnostic on purpose so
  // it never silently excludes a genuinely-licensed nurse on a fabricated state.
  return {
    id: `prog-${program.id}`, employerId: program.employerId, atsProvider: 'manual',
    title: `${program.name} placement`, setting: 'inpatient', status: 'open',
    sourceChannel: program.channel === 'amn' ? 'amn' : 'direct', importedAt: now(), lastSyncedAt: now(),
  }
}

function bestMatch(c: FlorenceCandidate, reqs: JobRequisition[]): MatchResult | null {
  let best: MatchResult | null = null
  for (const r of reqs) {
    const m = matchCandidateToRequisition(c, r)
    if (!best || m.matchScore > best.matchScore) best = m
  }
  return best
}

export async function generateLicensedSlate(programId: string): Promise<LicensedSlate> {
  const program = await store.programs.get(programId)
  if (!program) throw new Error(`program not found: ${programId}`)
  // Candidates already locked into a SUBMITTED slate are off the board.
  const slates = await store.programSlates.byProgram(programId)
  const locked = new Map<string, string>()
  for (const s of slates) if (s.submittedAt) for (const cid of s.candidateIds) locked.set(cid, s.id)

  const openReqs = (await store.requisitions.byEmployer(program.employerId)).filter((r) => r.status === 'open')
  const reqs = openReqs.length ? openReqs : [syntheticReq(program)]
  const candidates = await store.candidates.all()

  const eligible: SlateCandidate[] = []
  const consentPending: SlateCandidate[] = []
  const gatePending: SlateCandidate[] = []
  const reqById = new Map(reqs.map((r) => [r.id, r]))
  for (const c of candidates) {
    const m = bestMatch(c, reqs)
    if (!m) continue
    if (locked.has(c.id)) continue // already submitted in another wave
    const row: SlateCandidate = { candidateId: c.id, fullName: c.fullName, matchScore: m.matchScore, requisitionId: m.requisitionId }
    if (m.category === 'ready_to_submit') {
      // Matched ready, but the Application Gate adds the work-authorization (visa) clause
      // on top of matching — a visa-uncleared nurse is NOT employer-eligible (fail-closed).
      const req = reqById.get(m.requisitionId)
      const consent = req ? await requireEmployerShareConsent({ candidateId: c.id, employerId: program.employerId, jobRequisitionId: req.id, programId: program.id }) : null
      const gate = req ? applicationGate({
        candidate: c,
        job: req,
        opportunityState: program.channel === 'amn' ? 'amn_channel' : 'direct_partner',
        opts: {
          employerShareConsentGranted: !!consent,
          packetQaApproved: true,
          documentsComplete: true,
          dataMinimizedPacketGenerated: true,
          duplicateSubmissionLockClear: true,
        },
      }) : null
      if (gate?.ok) eligible.push(row)
      else gatePending.push({ ...row, gateReason: gate?.reasons[0] ?? 'application gate not cleared' })
    } else if (m.category === 'ready_after_milestone' && m.blockers.length === 1 && /consent/i.test(m.blockers[0]!)) {
      // Licensed + passed + state-feasible — the ONLY gap is employer-share consent.
      consentPending.push(row)
    }
  }
  return { programId, employerId: program.employerId, eligible, consentPending, gatePending, lockedCount: locked.size }
}

export interface BuildSlateResult {
  packets: ApplicationPacket[]
  skipped: { candidateId: string; reason: string }[]
}

/** Build the redacted employer packets for the given candidates (consent-gated). */
export async function buildSlatePackets(programId: string, candidateIds: string[]): Promise<BuildSlateResult> {
  const program = await store.programs.get(programId)
  if (!program) throw new Error(`program not found: ${programId}`)
  const openReqs = (await store.requisitions.byEmployer(program.employerId)).filter((r) => r.status === 'open')
  const packets: ApplicationPacket[] = []
  const skipped: { candidateId: string; reason: string }[] = []
  for (const candidateId of candidateIds) {
    const c = await store.candidates.get(candidateId)
    if (!c) { skipped.push({ candidateId, reason: 'candidate not found' }); continue }
    const m = bestMatch(c, openReqs.length ? openReqs : [syntheticReq(program)])
    const requisition = openReqs.find((r) => r.id === m?.requisitionId) ?? syntheticReq(program)
    const consent = await requireEmployerShareConsent({ candidateId: c.id, employerId: program.employerId, jobRequisitionId: requisition.id, programId: program.id })
    try {
      const packet = buildPacket({ candidate: c, requisition, consent, newId: uid, nowIso: now })
      packet.programId = program.id
      await store.packets.insert(packet)
      await recordLedger({ candidateId: c.id, stage: 'packet_created', sourceId: packet.id, employerId: program.employerId, notes: `Program ${program.name}` })
      packets.push(packet)
    } catch (e) {
      // Consent missing → skip, never throw (the slate keeps producing).
      skipped.push({ candidateId, reason: e instanceof ConsentRequiredError ? 'no live employer-share consent' : (e as Error).message })
    }
  }
  return { packets, skipped }
}

/** Lock a wave's candidates into an immutable, submitted slate + record the ledger. */
export async function lockSlate(programId: string, waveId: string, candidateIds: string[]): Promise<ProgramSlate> {
  const program = await store.programs.get(programId)
  if (!program) throw new Error(`program not found: ${programId}`)
  // Re-validate full packet-aware gate at lock time. A slate lock is a formal
  // employer submission, so an approved packet and duplicate-lock clearance are required.
  const approvals: { candidateId: string; requisitionId: string; packetId: string }[] = []
  const invalid: string[] = []
  for (const candidateId of candidateIds) {
    audit('ops', 'program_slate_submission_attempted', 'program', program.id, `candidate=${candidateId};wave=${waveId}`)
    const candidate = await store.candidates.get(candidateId)
    const packets = (await store.packets.byCandidate(candidateId)).filter((p) => p.employerId === program.employerId && p.status === 'ready_to_submit')
    let approved: { requisitionId: string; packetId: string } | null = null
    for (const packet of packets) {
      const requisition = await store.requisitions.get(packet.jobRequisitionId)
      if (!candidate || !requisition) continue
      const gate = await runApplicationGate({ candidate, requisition, packet, auditEntity: 'program', action: 'slate_lock', channel: program.channel === 'amn' ? 'amn' : 'direct', programId: program.id })
      if (gate.allowed) { approved = { requisitionId: requisition.id, packetId: packet.id }; break }
    }
    if (approved) approvals.push({ candidateId, ...approved })
    else invalid.push(candidateId)
  }
  if (invalid.length) throw new Error(`not eligible to lock: ${invalid.join(', ')}`)
  const locks: SubmissionLock[] = []
  for (const a of approvals) {
    const lock = await acquireSubmissionLock({ candidateId: a.candidateId, employerId: program.employerId, requisitionId: a.requisitionId, channel: program.channel === 'amn' ? 'amn' : 'direct' })
    if (!lock.ok) {
      for (const l of locks) await releaseSubmissionLock(l, 'slate_lock_failed')
      throw new Error(`duplicate submission lock active: ${a.candidateId}`)
    }
    locks.push(lock.lock)
  }
  const record: ProgramSlate = { id: uid(), programId, waveId, candidateIds: [...candidateIds], createdAt: now(), submittedAt: now() }
  await store.programSlates.insert(record)
  const wave = await store.programWaves.get(waveId)
  if (wave && wave.status === 'planned') { wave.status = 'active'; await store.programWaves.update(wave) }
  for (const a of approvals) {
    const lock = locks.find((l) => l.candidateId === a.candidateId)
    if (lock) { lock.submissionId = record.id; await store.submissionLocks.update(lock) }
    await recordLedger({ candidateId: a.candidateId, stage: 'ats_application_submitted', sourceId: record.id, employerId: program.employerId, jobRequisitionId: a.requisitionId, notes: `Locked into ${program.name} wave ${wave?.waveNumber ?? '?'}` })
  }
  return record
}
