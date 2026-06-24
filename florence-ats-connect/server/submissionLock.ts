// Duplicate-submission guard. A candidate may express interest freely, but a
// formal submission to an employer must hold one active lock.
import { store, uid, now, audit } from './db'
import type { SubmissionChannel, SubmissionLock } from '../shared/vms-types'

export interface SubmissionLockScope {
  candidateId: string
  employerId: string
  requisitionId?: string
  channel: SubmissionChannel
}

export async function activeSubmissionLock(scope: Pick<SubmissionLockScope, 'candidateId' | 'employerId'>): Promise<SubmissionLock | null> {
  return store.submissionLocks.active(scope.candidateId, scope.employerId)
}

export async function acquireSubmissionLock(scope: SubmissionLockScope, submissionId?: string): Promise<{ ok: true; lock: SubmissionLock } | { ok: false; lock: SubmissionLock }> {
  const existing = await activeSubmissionLock(scope)
  if (existing) return { ok: false, lock: existing }
  const lock: SubmissionLock = {
    id: uid(),
    candidateId: scope.candidateId,
    employerId: scope.employerId,
    requisitionId: scope.requisitionId,
    channel: scope.channel,
    submissionId,
    status: 'active',
    lockedAt: now(),
  }
  try {
    await store.submissionLocks.insert(lock)
  } catch (err) {
    const existing = await activeSubmissionLock(scope)
    if (existing) return { ok: false, lock: existing }
    throw err
  }
  audit('system', 'submission_lock_acquired', 'candidate', scope.candidateId, `employer=${scope.employerId};channel=${scope.channel}`)
  return { ok: true, lock }
}

export async function attachSubmissionToLock(lock: SubmissionLock, submissionId: string): Promise<SubmissionLock> {
  lock.submissionId = submissionId
  await store.submissionLocks.update(lock)
  return lock
}

export async function releaseSubmissionLock(lock: SubmissionLock, reason: string): Promise<void> {
  lock.status = 'released'
  await store.submissionLocks.update(lock)
  audit('system', 'submission_lock_released', 'candidate', lock.candidateId, `employer=${lock.employerId};channel=${lock.channel};reason=${reason}`)
}
