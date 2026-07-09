import { store, uid, now } from './db'
import type {
  ConsularCase,
  ConsularCaseStatus,
  ConsularPaymentOrder,
  DS160WorkbenchStatus,
  I901Receipt,
  SevismateHandoff,
  SevismateHandoffStatus,
  SubmissionEvent,
  VisaAppointment,
  WorkflowInstance,
} from '../shared/types'

type QaQueueItem = {
  kind: 'ds160' | 'visa_appointment' | 'i901_receipt' | 'sevismate_handoff'
  id: string
  candidateId: string
  workflowId?: string
  orderId?: string
  status: string
  reason: string
  updatedAt?: string
}

const statusId = (prefix: string, id: string) => `${prefix}-${id}`

function latestByDate<T>(items: T[], field: keyof T): T | undefined {
  return [...items].sort((a, b) => String(b[field] ?? '').localeCompare(String(a[field] ?? '')))[0]
}

function outcomeToStatus(outcome: WorkflowInstance['visaOutcome']): ConsularCaseStatus | null {
  if (outcome === 'approved') return 'visa_approved'
  if (outcome === 'refused') return 'visa_refused'
  if (outcome === 'administrative_processing') return 'administrative_processing'
  return null
}

async function latestI901Order(candidateId: string): Promise<ConsularPaymentOrder | undefined> {
  return (await store.consularPaymentOrders.byCandidate(candidateId)).find((o) => o.paymentType === 'i901_sevis')
}

async function latestApprovedI901Receipt(orderId: string): Promise<I901Receipt | undefined> {
  return (await store.i901Receipts.byOrder(orderId)).find((r) => r.qaStatus === 'approved')
}

export async function hasSubmittedDs160(candidateId: string): Promise<boolean> {
  const ds160 = (await store.workflows.byCandidate(candidateId)).find((w) => w.type === 'ds160')
  if (!ds160) return false
  const submissions = await store.submissions.byWorkflow(ds160.id)
  return Boolean(ds160.confirmationNumber || ds160.status === 'submitted' || ds160.status === 'completed' || submissions.some((s) => s.mode === 'candidate_self_submit'))
}

export async function refreshDs160WorkbenchStatus(workflowId: string): Promise<DS160WorkbenchStatus | null> {
  const w = await store.workflows.get(workflowId)
  if (!w || w.type !== 'ds160') return null
  const draft = await store.formDrafts.byWorkflow(w.id)
  const answers = draft?.sections.flatMap((s) => s.answers) ?? []
  const sensitive = answers.filter((a) => a.sensitive)
  const answered = sensitive.filter((a) => a.value != null && a.value !== '')
  const latestAttestation = latestByDate(await store.attestations.byWorkflow(w.id), 'attestedAt')
  const submissions = await store.submissions.byWorkflow(w.id)
  const ceacConfirmationCaptured = Boolean(w.confirmationNumber || submissions.some((s) => s.mode === 'candidate_self_submit'))
  const existing = await store.ds160WorkbenchStatuses.get(statusId('ds160-workbench', w.id))
  const timestamp = now()
  const status: DS160WorkbenchStatus['status'] =
    ceacConfirmationCaptured && (w.status === 'submitted' || w.status === 'completed') ? 'submitted_to_ceac'
    : ceacConfirmationCaptured ? 'confirmation_recorded'
    : w.status === 'candidate_signed' ? 'candidate_signed'
    : w.status === 'sent_to_candidate' ? 'sent_to_candidate'
    : w.status === 'qa_approved' ? 'qa_approved'
    : w.status === 'needs_human_qa' ? 'needs_human_qa'
    : w.status === 'needs_candidate_data' || w.status === 'needs_document' ? 'needs_candidate_data'
    : 'draft_in_progress'
  const nextStatus: DS160WorkbenchStatus = {
    id: statusId('ds160-workbench', w.id),
    candidateId: w.candidateId,
    workflowId: w.id,
    status,
    candidateAttestationRequired: true,
    ...(latestAttestation?.attestedAt ? { candidateAttestedAt: latestAttestation.attestedAt } : {}),
    sensitiveQuestionsTotal: sensitive.length,
    sensitiveQuestionsAnswered: answered.length,
    ceacConfirmationCaptured,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
  if (existing) await store.ds160WorkbenchStatuses.update(nextStatus)
  else await store.ds160WorkbenchStatuses.insert(nextStatus)
  return nextStatus
}

async function latestStatusSubmission(workflowId: string): Promise<SubmissionEvent | undefined> {
  const statusRefs = new Set(['expedite_requested', 'passport_returned', 'arrival_gate'])
  return latestByDate((await store.submissions.byWorkflow(workflowId)).filter((s) => typeof s.reference === 'string' && statusRefs.has(s.reference)), 'at')
}

export async function refreshVisaAppointment(workflowId: string): Promise<VisaAppointment | null> {
  const w = await store.workflows.get(workflowId)
  if (!w || w.type !== 'visa_appointment') return null
  const existing = await store.visaAppointments.get(statusId('visa-appointment', w.id))
  const timestamp = now()
  const order = await latestI901Order(w.candidateId)
  const i901ReceiptQaApproved = order ? Boolean(await latestApprovedI901Receipt(order.id)) || order.status === 'receipt_qa_approved' : false
  const ds160Submitted = await hasSubmittedDs160(w.candidateId)
  const appointments = await store.appointments.byWorkflow(w.id)
  const attendedAppt = latestByDate(appointments.filter((a) => a.status === 'attended'), 'scheduledFor')
  const scheduledAppt = latestByDate(appointments.filter((a) => a.status === 'scheduled'), 'scheduledFor')
  const appt = attendedAppt ?? scheduledAppt ?? latestByDate(appointments, 'scheduledFor')
  const statusSubmission = await latestStatusSubmission(w.id)
  const outcomeStatus = outcomeToStatus(w.visaOutcome)
  const derivedStatus: ConsularCaseStatus =
    statusSubmission?.reference === 'arrival_gate' ? 'arrival_gate'
    : statusSubmission?.reference === 'passport_returned' ? 'passport_returned'
    : outcomeStatus ?? (
      attendedAppt ? 'interview_attended'
      : statusSubmission?.reference === 'expedite_requested' ? 'expedite_requested'
      : appt?.status === 'scheduled' ? 'interview_scheduled'
      : ds160Submitted && i901ReceiptQaApproved ? 'expedite_eligible'
      : order && ['receipt_received', 'receipt_pending', 'receipt_rejected_needs_correction'].includes(order.status) ? 'expected_review'
      : 'not_available'
    )
  const submissions = await store.submissions.byWorkflow(w.id)
  const mrvReceiptCaptured = submissions.some((s) => Boolean(s.reference) && s.reference !== 'expedite_requested' && s.reference !== 'passport_returned' && s.reference !== 'arrival_gate')
  const nextStatus: VisaAppointment = {
    id: statusId('visa-appointment', w.id),
    candidateId: w.candidateId,
    workflowId: w.id,
    consularCaseId: statusId('consular-case', w.candidateId),
    status: derivedStatus,
    ...(appt?.location ? { consulate: appt.location, location: appt.location } : {}),
    ...(appt?.scheduledFor ? { appointmentDate: appt.scheduledFor } : {}),
    mrvReceiptCaptured,
    i901ReceiptQaApproved,
    ds160Submitted,
    ...(w.visaOutcome ? { visaOutcome: w.visaOutcome } : {}),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
  if (existing) await store.visaAppointments.update(nextStatus)
  else await store.visaAppointments.insert(nextStatus)
  return nextStatus
}

export async function refreshConsularCase(candidateId: string): Promise<ConsularCase | null> {
  const profile = await store.candidates.get(candidateId)
  if (!profile) return null
  const workflows = await store.workflows.byCandidate(candidateId)
  const ds160 = workflows.find((w) => w.type === 'ds160')
  const visaWorkflow = workflows.find((w) => w.type === 'visa_appointment')
  const order = await latestI901Order(candidateId)
  const ds160Status = ds160 ? await refreshDs160WorkbenchStatus(ds160.id) : null
  const visaStatus = visaWorkflow ? await refreshVisaAppointment(visaWorkflow.id) : null
  const existing = await store.consularCases.get(statusId('consular-case', candidateId))
  const timestamp = now()
  const fallbackStatus: ConsularCaseStatus =
    visaStatus?.status
    ?? (ds160Status?.status === 'submitted_to_ceac' && order?.status === 'receipt_qa_approved' ? 'expedite_eligible'
      : order && ['receipt_received', 'receipt_pending', 'receipt_rejected_needs_correction'].includes(order.status) ? 'expected_review'
      : 'not_available')
  const nextCase: ConsularCase = {
    id: statusId('consular-case', candidateId),
    candidateId,
    status: fallbackStatus,
    ...(ds160 ? { ds160WorkflowId: ds160.id } : {}),
    ...(visaWorkflow ? { visaAppointmentWorkflowId: visaWorkflow.id } : {}),
    ...(order ? { i901OrderId: order.id } : {}),
    ...(visaStatus?.visaOutcome ? { visaOutcome: visaStatus.visaOutcome } : {}),
    ...(visaStatus?.consulate ? { consulate: visaStatus.consulate } : {}),
    ...(visaStatus?.appointmentDate ? { appointmentDate: visaStatus.appointmentDate } : {}),
    ...(fallbackStatus === 'passport_returned' ? { passportReturnedAt: timestamp } : existing?.passportReturnedAt ? { passportReturnedAt: existing.passportReturnedAt } : {}),
    ...(fallbackStatus === 'arrival_gate' ? { arrivalGateOpenedAt: timestamp } : existing?.arrivalGateOpenedAt ? { arrivalGateOpenedAt: existing.arrivalGateOpenedAt } : {}),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
  if (existing) await store.consularCases.update(nextCase)
  else await store.consularCases.insert(nextCase)
  return nextCase
}

export async function recordSevismateHandoffStatus(handoff: SevismateHandoff): Promise<SevismateHandoffStatus> {
  const existing = await store.sevismateHandoffStatuses.get(statusId('sevismate-status', handoff.id))
  const timestamp = now()
  const nextStatus: SevismateHandoffStatus = {
    id: statusId('sevismate-status', handoff.id),
    candidateId: handoff.candidateId,
    paymentOrderId: handoff.paymentOrderId,
    handoffId: handoff.id,
    status: handoff.status,
    ...(handoff.partnerReferenceId ? { partnerReferenceId: handoff.partnerReferenceId } : {}),
    paymentLinkGenerated: Boolean(handoff.paymentLink),
    ...(handoff.status === 'accepted' ? { acceptedAt: timestamp } : {}),
    ...(handoff.completedAt ? { completedAt: handoff.completedAt } : {}),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
  if (existing) await store.sevismateHandoffStatuses.update(nextStatus)
  else await store.sevismateHandoffStatuses.insert(nextStatus)
  return nextStatus
}

export async function pathwayQaQueues(): Promise<{
  counts: Record<QaQueueItem['kind'], number>
  queues: Record<QaQueueItem['kind'], QaQueueItem[]>
}> {
  const ds160 = (await store.ds160WorkbenchStatuses.all())
    .filter((s) => ['needs_candidate_data', 'needs_human_qa', 'sent_to_candidate'].includes(s.status))
    .map((s): QaQueueItem => ({
      kind: 'ds160',
      id: s.id,
      candidateId: s.candidateId,
      workflowId: s.workflowId,
      status: s.status,
      reason: s.status === 'sent_to_candidate' ? 'Candidate attestation pending' : 'DS-160 workbench needs review',
      updatedAt: s.updatedAt,
    }))
  const visaAppointments = (await store.visaAppointments.all())
    .filter((v) => ['expected_review', 'administrative_processing', 'interview_attended'].includes(v.status))
    .map((v): QaQueueItem => ({
      kind: 'visa_appointment',
      id: v.id,
      candidateId: v.candidateId,
      workflowId: v.workflowId,
      status: v.status,
      reason: 'Visa appointment status requires human follow-up',
      updatedAt: v.updatedAt,
    }))
  const i901Receipts = (await store.i901Receipts.all())
    .filter((r) => r.qaStatus !== 'approved')
    .map((r): QaQueueItem => ({
      kind: 'i901_receipt',
      id: r.id,
      candidateId: r.candidateId,
      orderId: r.paymentOrderId,
      status: r.qaStatus,
      reason: r.qaStatus === 'pending' ? 'Receipt must be QA approved' : 'Receipt correction required',
      updatedAt: r.qaReviewedAt ?? r.receivedAt,
    }))
  const sevismate = (await store.sevismateHandoffStatuses.all())
    .filter((s) => ['rejected', 'needs_correction'].includes(s.status))
    .map((s): QaQueueItem => ({
      kind: 'sevismate_handoff',
      id: s.id,
      candidateId: s.candidateId,
      orderId: s.paymentOrderId,
      status: s.status,
      reason: 'SEVISmate handoff needs partner correction',
      updatedAt: s.updatedAt,
    }))
  const queues = {
    ds160,
    visa_appointment: visaAppointments,
    i901_receipt: i901Receipts,
    sevismate_handoff: sevismate,
  }
  return {
    counts: {
      ds160: ds160.length,
      visa_appointment: visaAppointments.length,
      i901_receipt: i901Receipts.length,
      sevismate_handoff: sevismate.length,
    },
    queues,
  }
}
