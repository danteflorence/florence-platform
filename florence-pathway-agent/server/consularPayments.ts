import { store, getDossier, uid, now, audit } from './db'
import { pushMilestone } from './agents'
import { applyStatus } from './agents/workflow'
import { emitForCandidate } from './passport'
import type {
  CandidateDossier,
  CandidateProfile,
  ConsularPaymentEvent,
  ConsularPaymentOrder,
  ConsularPaymentStatus,
  ConsularPayerType,
  ConsularVisaType,
  I901Receipt,
  PathwayDocument,
  SchoolProgram,
  SevismateHandoff,
} from '../shared/types'

export class ConsularPaymentError extends Error {
  status: number
  details?: unknown
  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

const PAYMENT_STATUS_LABEL: Record<ConsularPaymentStatus, string> = {
  not_required: 'Not required',
  not_started: 'Not started',
  eligible_for_i901_payment: 'Eligible for I-901 payment',
  awaiting_student_attestation: 'Awaiting student attestation',
  ready_for_sevismate: 'Ready for SEVISmate',
  payment_link_generated: 'Payment link generated',
  student_opened_payment: 'Student opened payment',
  payment_started: 'Payment started',
  payment_failed: 'Payment failed',
  payment_confirmed_by_sevismate: 'Payment confirmed by SEVISmate',
  submitted_to_fmjfee: 'Submitted to FMJfee',
  receipt_pending: 'Receipt pending',
  receipt_received: 'Receipt received',
  receipt_qa_approved: 'Receipt QA approved',
  receipt_rejected_needs_correction: 'Receipt rejected',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  case_escalated: 'Case escalated',
}

const ORDER_READY_STATUSES = new Set(['qa_approved', 'sent_to_candidate', 'candidate_signed', 'submitted', 'completed'])
const DEPENDENT_VISAS = new Set<ConsularVisaType>(['F2', 'M2', 'J2'])
const I901_FIELDS_SENT = [
  'legalName',
  'email',
  'phone',
  'sevisId',
  'formType',
  'schoolCode',
  'visaCategory',
  'country',
  'paymentSpeed',
  'candidateConsentId',
  'florenceCaseReference',
]

export interface CreateI901OrderArgs {
  candidateId: string
  visaType?: ConsularVisaType
  payerType?: Extract<ConsularPayerType, 'student' | 'florence'>
  officialFeeUsd?: number
  serviceFeeUsd?: number
  taxOrProcessingFeeUsd?: number
  localCurrency?: string
  localAmount?: number
  dueDate?: string
  interviewDate?: string
  ownerUserId?: string
  serviceSpeed?: 'basic' | 'standard' | 'express'
}

export interface PaymentDashboardRow {
  order: ConsularPaymentOrder
  candidateName: string
  country: string
  school: string
  maskedSevisId: string
  i20Status: string
  paymentStatus: ConsularPaymentStatus
  statusLabel: string
  slaDaysLeft?: number
  interviewDate?: string
  risk: 'green' | 'orange' | 'red'
  owner?: string
  nextAction: string
}

export interface PaymentDashboard {
  counts: Record<string, number>
  queues: {
    readyForPayment: PaymentDashboardRow[]
    awaitingCandidateAttestation: PaymentDashboardRow[]
    paymentInProgress: PaymentDashboardRow[]
    receiptPending: PaymentDashboardRow[]
    receiptQaNeeded: PaymentDashboardRow[]
    blockedCorrectionNeeded: PaymentDashboardRow[]
    interviewAtRisk: PaymentDashboardRow[]
    completed: PaymentDashboardRow[]
  }
  rows: PaymentDashboardRow[]
}

export interface PaymentReconciliation {
  totalPaymentOrders: number
  studentPaid: number
  florencePaid: number
  officialFeeUsd: number
  serviceFeeUsd: number
  taxOrProcessingFeeUsd: number
  localAmountByCurrency: { currency: string; amount: number }[]
  failedPaymentReasons: { reason: string; count: number }[]
  refundRequests: number
  receiptsVerified: number
  receiptsRejected: number
  studentsBlockedByMissingPayment: number
  averageDaysI20ToReceipt: number | null
}

function normalize(s: string | undefined): string {
  return (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]/gi, '').toLowerCase()
}

function legalName(c: CandidateProfile): string {
  return [c.legalFirstName, c.legalMiddleName, c.legalLastName].filter(Boolean).join(' ')
}

function maskSevisId(id?: string): string {
  if (!id) return '—'
  return id.length <= 4 ? '••••' : `${id.slice(0, 3)}…${id.slice(-2)}`
}

function daysLeft(date?: string): number | undefined {
  if (!date) return undefined
  const today = new Date()
  const due = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(due.getTime())) return undefined
  return Math.ceil((due.getTime() - Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) / 86_400_000)
}

export function normalizeVisaType(v?: string): ConsularVisaType {
  const s = (v ?? '').replace(/[-_\s]/g, '').toUpperCase()
  if (s === 'F1' || s === 'F2' || s === 'M1' || s === 'M2' || s === 'J1' || s === 'J2') return s as ConsularVisaType
  return 'other'
}

export function latestI901Order(candidateId: string): ConsularPaymentOrder | null {
  return store.consularPaymentOrders.byCandidate(candidateId).find((o) => o.paymentType === 'i901_sevis') ?? null
}

export function latestI901Receipt(orderId: string): I901Receipt | null {
  return store.i901Receipts.byOrder(orderId)[0] ?? null
}

export function i901ReceiptApproved(candidateId: string): boolean {
  const order = latestI901Order(candidateId)
  if (!order) return false
  return order.status === 'receipt_qa_approved' || store.i901Receipts.byOrder(order.id).some((r) => r.qaStatus === 'approved')
}

function event(order: ConsularPaymentOrder, eventType: ConsularPaymentEvent['eventType'], metadata?: Record<string, unknown>): void {
  store.consularPaymentEvents.insert({ id: uid(), candidateId: order.candidateId, paymentOrderId: order.id, eventType, occurredAt: now(), ...(metadata ? { metadata } : {}) })
}

function sevisWorkflow(d: CandidateDossier) {
  return d.workflows.find((w) => w.type === 'sevis_i20') ?? null
}

function assertCandidate(candidateId: string): CandidateDossier {
  const d = getDossier(candidateId)
  if (!d) throw new ConsularPaymentError(404, 'candidate not found')
  return d
}

export function evaluateI901Eligibility(candidateId: string, visaTypeArg?: ConsularVisaType): {
  eligible: boolean
  notRequired: boolean
  missing: string[]
  visaType: ConsularVisaType
  school?: SchoolProgram
  consularCaseId: string
} {
  const d = assertCandidate(candidateId)
  const visaType = visaTypeArg ?? normalizeVisaType(d.profile.visaTarget)
  const wf = sevisWorkflow(d)
  if (DEPENDENT_VISAS.has(visaType)) {
    return { eligible: true, notRequired: true, missing: [], visaType, school: d.schoolPrograms[0], consularCaseId: wf?.id ?? candidateId }
  }

  const school = d.schoolPrograms[0]
  const identity = d.identityDocuments[0]
  const i20Doc = d.documents.find((doc) => doc.kind === 'i20')
  const missing: string[] = []
  if (!school) missing.push('university admission / school program')
  if (!i20Doc) missing.push('I-20 document metadata')
  if (!school?.i20Number) missing.push('SEVIS ID')
  if (!school?.sevisSchoolCode) missing.push('school code')
  if (!school?.startDate) missing.push('program start date')
  if (!school?.nameOnI20) missing.push('student legal name on I-20')
  if (!d.profile.email) missing.push('student email')
  if (!d.profile.dateOfBirth) missing.push('date of birth')
  if (!identity) missing.push('passport identity record')
  if (identity && school?.nameOnI20 && normalize(identity.nameOnDocument) !== normalize(school.nameOnI20)) missing.push('passport name and I-20 name match')
  if (wf && !ORDER_READY_STATUSES.has(wf.status)) missing.push('SEVIS / I-20 workflow QA approved')
  if (!wf) missing.push('SEVIS / I-20 workflow')

  return { eligible: missing.length === 0, notRequired: false, missing, visaType, school, consularCaseId: wf?.id ?? candidateId }
}

export function createI901Order(args: CreateI901OrderArgs): ConsularPaymentOrder {
  const d = assertCandidate(args.candidateId)
  const visaType = args.visaType ?? normalizeVisaType(d.profile.visaTarget)
  const existing = latestI901Order(args.candidateId)
  if (existing && !['cancelled', 'refunded'].includes(existing.status)) {
    throw new ConsularPaymentError(409, 'candidate already has an active I-901 payment order', { orderId: existing.id })
  }

  const eligibility = evaluateI901Eligibility(args.candidateId, visaType)
  if (!eligibility.notRequired && !eligibility.eligible) {
    throw new ConsularPaymentError(409, 'I-901 payment order is not eligible yet', { missing: eligibility.missing })
  }

  const order: ConsularPaymentOrder = {
    id: uid(),
    candidateId: args.candidateId,
    consularCaseId: eligibility.consularCaseId,
    paymentType: 'i901_sevis',
    visaType,
    required: !eligibility.notRequired,
    status: eligibility.notRequired ? 'not_required' : 'awaiting_student_attestation',
    payerType: args.payerType ?? 'student',
    partner: 'sevismate',
    createdAt: now(),
    updatedAt: now(),
    ...(args.officialFeeUsd != null ? { officialFeeUsd: args.officialFeeUsd } : {}),
    ...(args.serviceFeeUsd != null ? { serviceFeeUsd: args.serviceFeeUsd } : {}),
    ...(args.taxOrProcessingFeeUsd != null ? { taxOrProcessingFeeUsd: args.taxOrProcessingFeeUsd } : {}),
    ...(args.localCurrency ? { localCurrency: args.localCurrency.toUpperCase() } : {}),
    ...(args.localAmount != null ? { localAmount: args.localAmount } : {}),
    ...(args.dueDate ? { dueDate: args.dueDate } : {}),
    ...(args.interviewDate ? { interviewDate: args.interviewDate } : {}),
    ...(args.ownerUserId ? { ownerUserId: args.ownerUserId } : {}),
    ...(args.serviceSpeed ? { serviceSpeed: args.serviceSpeed } : {}),
    ...(eligibility.notRequired ? { statusReason: 'Dependents generally do not pay the I-901 SEVIS fee.' } : {}),
  }
  store.consularPaymentOrders.insert(order)
  audit('system', 'i901_payment_order_created', 'consular_payment_order', order.id, order.candidateId, order.status)
  event(order, 'i901_payment_order_created', { visaType: order.visaType, payerType: order.payerType })
  return order
}

export function patchI901Order(orderId: string, patch: Partial<ConsularPaymentOrder>): ConsularPaymentOrder {
  const order = store.consularPaymentOrders.get(orderId)
  if (!order) throw new ConsularPaymentError(404, 'payment order not found')
  const updated: ConsularPaymentOrder = {
    ...order,
    ...patch,
    id: order.id,
    candidateId: order.candidateId,
    paymentType: 'i901_sevis',
    updatedAt: now(),
  }
  store.consularPaymentOrders.update(updated)
  audit('system', 'i901_payment_order_updated', 'consular_payment_order', updated.id, updated.candidateId, updated.status)
  return updated
}

export function attestI901Order(orderId: string, signatureName: string): ConsularPaymentOrder {
  const order = store.consularPaymentOrders.get(orderId)
  if (!order) throw new ConsularPaymentError(404, 'payment order not found')
  if (!order.required) throw new ConsularPaymentError(409, 'I-901 payment is not required for this order')
  if (!['awaiting_student_attestation', 'eligible_for_i901_payment', 'not_started'].includes(order.status)) {
    throw new ConsularPaymentError(409, `payment order is not awaiting attestation (${order.status})`)
  }
  const d = assertCandidate(order.candidateId)
  const school = d.schoolPrograms[0]
  const attestation = {
    id: uid(),
    workflowId: order.consularCaseId,
    candidateId: order.candidateId,
    statement: `I confirm my legal name, date of birth, SEVIS ID (${school?.i20Number ?? '—'}), school code (${school?.sevisSchoolCode ?? '—'}), form type, and program start date are accurate for I-901 SEVIS fee processing through SEVISmate.`,
    signatureName,
    attestedAt: now(),
  }
  store.attestations.insert(attestation)
  order.candidateAttestationId = attestation.id
  order.status = 'ready_for_sevismate'
  order.updatedAt = now()
  store.consularPaymentOrders.update(order)
  audit('candidate', 'i901_candidate_attested', 'consular_payment_order', order.id, order.candidateId, signatureName)
  event(order, 'i901_candidate_attested', { attestationId: attestation.id })
  return order
}

export function createSevismateHandoff(orderId: string, integrationMode: SevismateHandoff['integrationMode'] = 'deep_link'): { handoff: SevismateHandoff; order: ConsularPaymentOrder; instructions: string[] } {
  const order = store.consularPaymentOrders.get(orderId)
  if (!order) throw new ConsularPaymentError(404, 'payment order not found')
  if (!order.required) throw new ConsularPaymentError(409, 'I-901 payment is not required for this order')
  if (!order.candidateAttestationId || order.status !== 'ready_for_sevismate') {
    throw new ConsularPaymentError(409, 'candidate attestation is required before SEVISmate handoff')
  }
  const d = assertCandidate(order.candidateId)
  const base = process.env.SEVISMATE_I901_URL?.replace(/\/$/, '')
  const paymentLink = base ? `${base}?florence_order=${encodeURIComponent(order.id)}` : undefined
  const handoff: SevismateHandoff = {
    id: uid(),
    paymentOrderId: order.id,
    candidateId: order.candidateId,
    integrationMode,
    partnerReferenceId: `florence-${order.id}`,
    ...(paymentLink ? { paymentLink } : {}),
    fieldsSent: I901_FIELDS_SENT,
    documentsSent: [],
    consentId: order.candidateAttestationId,
    status: 'sent',
    createdAt: now(),
    sentAt: now(),
  }
  store.sevismateHandoffs.insert(handoff)
  order.status = paymentLink ? 'payment_link_generated' : 'ready_for_sevismate'
  order.updatedAt = now()
  store.consularPaymentOrders.update(order)
  audit('system', 'i901_handoff_sent', 'consular_payment_order', order.id, order.candidateId, integrationMode)
  event(order, 'i901_handoff_sent', { integrationMode, fieldsSent: handoff.fieldsSent, documentsSent: handoff.documentsSent })
  return {
    handoff,
    order,
    instructions: [
      'Use SEVISmate only through the student-facing guided flow or an approved partner channel.',
      'Do not share passport scans, DS-160 drafts, financing details, employer packets, or sensitive immigration notes.',
      `Candidate: ${legalName(d.profile)}`,
      `SEVIS ID: ${d.schoolPrograms[0]?.i20Number ?? 'missing'}`,
    ],
  }
}

export function recordI901Receipt(orderId: string, input: {
  filename: string
  sevisId: string
  legalName?: string
  schoolCode?: string
  formType?: 'I-20' | 'DS-2019'
  visaType?: ConsularVisaType
  receiptDate?: string
  amountUsd?: number
  source: I901Receipt['source']
  extractionConfidence: I901Receipt['extractionConfidence']
}): { order: ConsularPaymentOrder; receipt: I901Receipt; document: PathwayDocument } {
  const order = store.consularPaymentOrders.get(orderId)
  if (!order) throw new ConsularPaymentError(404, 'payment order not found')
  if (!order.required) throw new ConsularPaymentError(409, 'I-901 payment is not required for this order')
  const document: PathwayDocument = {
    id: uid(),
    candidateId: order.candidateId,
    kind: 'i901_receipt',
    filename: input.filename,
    uploadedAt: now(),
    extracted: true,
    extractionConfidence: input.extractionConfidence,
    fields: {
      sevisId: input.sevisId,
      ...(input.legalName ? { legalName: input.legalName } : {}),
      ...(input.schoolCode ? { schoolCode: input.schoolCode } : {}),
      ...(input.formType ? { formType: input.formType } : {}),
      ...(input.receiptDate ? { receiptDate: input.receiptDate } : {}),
      ...(input.amountUsd != null ? { amountUsd: String(input.amountUsd) } : {}),
    },
  }
  store.documents.insert(document)
  const receipt: I901Receipt = {
    id: uid(),
    paymentOrderId: order.id,
    candidateId: order.candidateId,
    documentId: document.id,
    sevisId: input.sevisId,
    ...(input.legalName ? { legalName: input.legalName } : {}),
    ...(input.schoolCode ? { schoolCode: input.schoolCode } : {}),
    ...(input.formType ? { formType: input.formType } : {}),
    ...(input.visaType ? { visaType: input.visaType } : {}),
    ...(input.receiptDate ? { receiptDate: input.receiptDate } : {}),
    ...(input.amountUsd != null ? { amountUsd: input.amountUsd } : {}),
    source: input.source,
    extractionConfidence: input.extractionConfidence,
    qaStatus: 'pending',
  }
  store.i901Receipts.insert(receipt)
  order.status = 'receipt_received'
  order.updatedAt = now()
  store.consularPaymentOrders.update(order)
  audit('candidate', 'i901_receipt_received', 'consular_payment_order', order.id, order.candidateId, document.filename)
  event(order, 'i901_receipt_received', { receiptId: receipt.id, documentId: document.id })
  pushMilestone(order.candidateId, order.consularCaseId, 'I-901 receipt uploaded')
  emitForCandidate(order.candidateId, 'consular.i901_receipt_uploaded', { orderId: order.id, receiptId: receipt.id })
  return { order, receipt, document }
}

export function receiptMismatches(order: ConsularPaymentOrder, receipt: I901Receipt): string[] {
  const d = assertCandidate(order.candidateId)
  const school = d.schoolPrograms[0]
  const expectedName = school?.nameOnI20 ?? legalName(d.profile)
  const mismatches: string[] = []
  if (receipt.sevisId && school?.i20Number && normalize(receipt.sevisId) !== normalize(school.i20Number)) mismatches.push('SEVIS ID')
  if (receipt.legalName && normalize(receipt.legalName) !== normalize(expectedName)) mismatches.push('legal name')
  if (receipt.schoolCode && school?.sevisSchoolCode && normalize(receipt.schoolCode) !== normalize(school.sevisSchoolCode)) mismatches.push('school code')
  if (receipt.visaType && receipt.visaType !== order.visaType) mismatches.push('visa category')
  if (receipt.amountUsd != null && order.officialFeeUsd != null && Math.abs(receipt.amountUsd - order.officialFeeUsd) > 0.01) mismatches.push('official fee amount')
  return mismatches
}

export function approveI901Receipt(orderId: string, reviewer: string): { order: ConsularPaymentOrder; receipt: I901Receipt } {
  const order = store.consularPaymentOrders.get(orderId)
  if (!order) throw new ConsularPaymentError(404, 'payment order not found')
  const receipt = latestI901Receipt(order.id)
  if (!receipt) throw new ConsularPaymentError(409, 'upload the I-901 receipt before QA approval')
  const mismatches = receiptMismatches(order, receipt)
  if (mismatches.length) throw new ConsularPaymentError(409, 'receipt does not match the I-20/payment order', { mismatches })

  receipt.qaStatus = 'approved'
  receipt.qaReviewerId = reviewer
  receipt.qaReviewedAt = now()
  store.i901Receipts.update(receipt)
  order.status = 'receipt_qa_approved'
  order.updatedAt = now()
  store.consularPaymentOrders.update(order)

  const w = store.workflows.get(order.consularCaseId)
  if (w && w.type === 'sevis_i20' && w.status !== 'completed') {
    applyStatus(w, 'completed')
    store.workflows.update(w)
  }

  audit('qa', 'i901_receipt_qa_approved', 'consular_payment_order', order.id, order.candidateId, reviewer)
  event(order, 'i901_receipt_qa_approved', { receiptId: receipt.id, reviewer })
  pushMilestone(order.candidateId, order.consularCaseId, 'SEVIS I-901 fee paid')
  pushMilestone(order.candidateId, order.consularCaseId, 'I-901 receipt QA approved')
  emitForCandidate(order.candidateId, 'consular.i901_paid', { orderId: order.id })
  emitForCandidate(order.candidateId, 'consular.i901_receipt_qa_approved', { orderId: order.id, receiptId: receipt.id })
  emitForCandidate(order.candidateId, 'pathway.visa_appointment_prerequisites_updated', { i901ReceiptVerified: true })
  return { order, receipt }
}

export function rejectI901Receipt(orderId: string, reviewer: string, notes?: string): { order: ConsularPaymentOrder; receipt: I901Receipt } {
  const order = store.consularPaymentOrders.get(orderId)
  if (!order) throw new ConsularPaymentError(404, 'payment order not found')
  const receipt = latestI901Receipt(order.id)
  if (!receipt) throw new ConsularPaymentError(409, 'upload the I-901 receipt before QA rejection')
  receipt.qaStatus = 'rejected'
  receipt.qaReviewerId = reviewer
  receipt.qaReviewedAt = now()
  receipt.rejectionReason = notes ?? (receiptMismatches(order, receipt).join(', ') || 'Correction required')
  store.i901Receipts.update(receipt)
  order.status = 'receipt_rejected_needs_correction'
  order.statusReason = receipt.rejectionReason
  order.updatedAt = now()
  store.consularPaymentOrders.update(order)
  audit('qa', 'i901_receipt_rejected', 'consular_payment_order', order.id, order.candidateId, reviewer)
  event(order, 'i901_correction_required', { receiptId: receipt.id, reviewer, notes: receipt.rejectionReason })
  return { order, receipt }
}

export function detailForOrder(order: ConsularPaymentOrder) {
  return {
    order,
    handoffs: store.sevismateHandoffs.byOrder(order.id),
    receipt: latestI901Receipt(order.id),
    events: store.consularPaymentEvents.byOrder(order.id),
  }
}

function nextActionFor(order: ConsularPaymentOrder): string {
  switch (order.status) {
    case 'not_required': return 'No I-901 payment required'
    case 'awaiting_student_attestation': return 'Collect candidate attestation'
    case 'ready_for_sevismate': return 'Send guided SEVISmate handoff'
    case 'payment_link_generated': return 'Chase payment completion'
    case 'payment_started': return 'Monitor payment'
    case 'payment_failed': return 'Resolve failed payment'
    case 'payment_confirmed_by_sevismate':
    case 'submitted_to_fmjfee':
    case 'receipt_pending': return 'Chase receipt'
    case 'receipt_received': return 'QA receipt'
    case 'receipt_rejected_needs_correction': return 'Collect corrected receipt'
    case 'receipt_qa_approved': return 'Ready for DS-160 and appointment flow'
    case 'case_escalated': return 'Resolve escalation'
    default: return 'Monitor order'
  }
}

function rowFor(order: ConsularPaymentOrder): PaymentDashboardRow {
  const d = assertCandidate(order.candidateId)
  const school = d.schoolPrograms[0]
  const wf = store.workflows.get(order.consularCaseId)
  const left = daysLeft(order.dueDate)
  const risk: PaymentDashboardRow['risk'] =
    order.status === 'case_escalated' || order.status === 'payment_failed' || order.status === 'receipt_rejected_needs_correction'
      ? 'red'
      : (left != null && left <= 2) || (!!order.interviewDate && order.status !== 'receipt_qa_approved')
        ? 'orange'
        : 'green'
  return {
    order,
    candidateName: legalName(d.profile),
    country: d.profile.countryOfResidence,
    school: school?.schoolName ?? '—',
    maskedSevisId: maskSevisId(school?.i20Number),
    i20Status: wf?.status ?? 'not_started',
    paymentStatus: order.status,
    statusLabel: PAYMENT_STATUS_LABEL[order.status],
    ...(left != null ? { slaDaysLeft: left } : {}),
    ...(order.interviewDate ? { interviewDate: order.interviewDate } : {}),
    risk,
    ...(order.ownerUserId ? { owner: order.ownerUserId } : {}),
    nextAction: nextActionFor(order),
  }
}

export function consularPaymentsDashboard(): PaymentDashboard {
  const rows = store.consularPaymentOrders.all().filter((o) => o.paymentType === 'i901_sevis').map(rowFor)
  const counts: Record<string, number> = {}
  for (const row of rows) counts[row.paymentStatus] = (counts[row.paymentStatus] ?? 0) + 1
  return {
    counts,
    rows,
    queues: {
      readyForPayment: rows.filter((r) => r.paymentStatus === 'ready_for_sevismate' || r.paymentStatus === 'payment_link_generated'),
      awaitingCandidateAttestation: rows.filter((r) => r.paymentStatus === 'awaiting_student_attestation'),
      paymentInProgress: rows.filter((r) => ['student_opened_payment', 'payment_started', 'payment_confirmed_by_sevismate', 'submitted_to_fmjfee'].includes(r.paymentStatus)),
      receiptPending: rows.filter((r) => r.paymentStatus === 'receipt_pending'),
      receiptQaNeeded: rows.filter((r) => r.paymentStatus === 'receipt_received'),
      blockedCorrectionNeeded: rows.filter((r) => ['payment_failed', 'receipt_rejected_needs_correction', 'case_escalated'].includes(r.paymentStatus)),
      interviewAtRisk: rows.filter((r) => r.risk !== 'green' && r.paymentStatus !== 'receipt_qa_approved'),
      completed: rows.filter((r) => r.paymentStatus === 'receipt_qa_approved' || r.paymentStatus === 'not_required'),
    },
  }
}

export function consularPaymentsReconciliation(): PaymentReconciliation {
  const orders = store.consularPaymentOrders.all().filter((o) => o.paymentType === 'i901_sevis')
  const receipts = store.i901Receipts.all()
  const currencies = new Map<string, number>()
  for (const o of orders) if (o.localCurrency && o.localAmount != null) currencies.set(o.localCurrency, (currencies.get(o.localCurrency) ?? 0) + o.localAmount)
  const i20ToReceiptDays = receipts
    .map((r) => {
      const o = store.consularPaymentOrders.get(r.paymentOrderId)
      if (!o) return null
      const created = new Date(o.createdAt).getTime()
      const receiptDate = new Date(r.receiptDate ? `${r.receiptDate}T00:00:00Z` : o.updatedAt).getTime()
      return Number.isFinite(created) && Number.isFinite(receiptDate) ? Math.max(0, Math.round((receiptDate - created) / 86_400_000)) : null
    })
    .filter((n): n is number => n != null)
  const failed = new Map<string, number>()
  for (const o of orders.filter((x) => x.status === 'payment_failed')) {
    const reason = o.statusReason ?? 'unknown'
    failed.set(reason, (failed.get(reason) ?? 0) + 1)
  }
  return {
    totalPaymentOrders: orders.length,
    studentPaid: orders.filter((o) => o.payerType === 'student').length,
    florencePaid: orders.filter((o) => o.payerType === 'florence').length,
    officialFeeUsd: orders.reduce((sum, o) => sum + (o.officialFeeUsd ?? 0), 0),
    serviceFeeUsd: orders.reduce((sum, o) => sum + (o.serviceFeeUsd ?? 0), 0),
    taxOrProcessingFeeUsd: orders.reduce((sum, o) => sum + (o.taxOrProcessingFeeUsd ?? 0), 0),
    localAmountByCurrency: [...currencies.entries()].map(([currency, amount]) => ({ currency, amount })),
    failedPaymentReasons: [...failed.entries()].map(([reason, count]) => ({ reason, count })),
    refundRequests: orders.filter((o) => o.status === 'refunded').length,
    receiptsVerified: receipts.filter((r) => r.qaStatus === 'approved').length,
    receiptsRejected: receipts.filter((r) => r.qaStatus === 'rejected').length,
    studentsBlockedByMissingPayment: orders.filter((o) => o.required && o.status !== 'receipt_qa_approved').length,
    averageDaysI20ToReceipt: i20ToReceiptDays.length ? Math.round(i20ToReceiptDays.reduce((a, b) => a + b, 0) / i20ToReceiptDays.length) : null,
  }
}

export function sevismateCsv(): string {
  const header = ['florence_order', 'candidate_name', 'email', 'phone', 'sevis_id', 'form_type', 'school_code', 'visa_category', 'country', 'payment_speed', 'consent_id']
  const rows = store.consularPaymentOrders.all()
    .filter((o) => o.paymentType === 'i901_sevis' && o.required && ['ready_for_sevismate', 'payment_link_generated'].includes(o.status))
    .map((o) => {
      const d = assertCandidate(o.candidateId)
      const s = d.schoolPrograms[0]
      return [o.id, legalName(d.profile), d.profile.email, d.profile.phone ?? '', s?.i20Number ?? '', 'I-20', s?.sevisSchoolCode ?? '', o.visaType, d.profile.countryOfResidence, o.serviceSpeed ?? 'standard', o.candidateAttestationId ?? '']
    })
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export function candidatePaymentSummary(candidateId: string) {
  const d = assertCandidate(candidateId)
  const order = latestI901Order(candidateId)
  const eligibility = evaluateI901Eligibility(candidateId, order?.visaType ?? normalizeVisaType(d.profile.visaTarget))
  const receipt = order ? latestI901Receipt(order.id) : null
  const handoff = order ? store.sevismateHandoffs.byOrder(order.id)[0] : null
  const school = d.schoolPrograms[0]
  return {
    i901: {
      required: order ? order.required : !eligibility.notRequired,
      eligible: eligibility.eligible,
      missing: eligibility.missing,
      status: order?.status ?? (eligibility.notRequired ? 'not_required' : eligibility.eligible ? 'eligible_for_i901_payment' : 'not_started'),
      statusLabel: PAYMENT_STATUS_LABEL[order?.status ?? (eligibility.notRequired ? 'not_required' : eligibility.eligible ? 'eligible_for_i901_payment' : 'not_started')],
      orderId: order?.id,
      paymentLink: handoff?.paymentLink,
      receiptQaStatus: receipt?.qaStatus,
      receiptDocumentId: receipt?.documentId,
      sevisIdMasked: maskSevisId(school?.i20Number),
      school: school?.schoolName,
      nextStep: order ? nextActionFor(order) : eligibility.eligible ? 'Florence creates the I-901 payment order' : 'Finish I-20 verification first',
    },
  }
}
