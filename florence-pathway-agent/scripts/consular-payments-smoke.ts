// Consular Payments V1 smoke.
// Covers the I-901 eligibility gate, SEVISmate handoff minimization, receipt QA,
// appointment gating, dashboard/reconciliation reads, and Core auth boundaries.
import { createServer } from 'node:http'
import { generateKeyPairSync, createSign } from 'node:crypto'
import express from 'express'
import { api } from '../server/routes'
import { apiV1 } from '../server/api/v1'
import { configureCoreAuth } from '../server/coreAuth'
import { store, uid, now } from '../server/db'
import {
  ConsularPaymentError,
  approveI901Receipt,
  attestI901Order,
  consularPaymentsDashboard,
  consularPaymentsReconciliation,
  createI901Order,
  createSevismateHandoff,
  recordI901Receipt,
} from '../server/consularPayments'
import type {
  CandidateProfile,
  IdentityDocument,
  PathwayDocument,
  SchoolProgram,
  WorkflowInstance,
} from '../shared/types'

let pass = 0
let fail = 0
const ok = (label: string, condition: boolean, extra?: string) => {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra ? ` - ${extra}` : ''}`)
  condition ? (pass += 1) : (fail += 1)
}

const run = uid().slice(0, 8)
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const kid = `consular-${run}`
const jwk = { ...(publicKey.export({ format: 'jwk' }) as Record<string, unknown>), kid, use: 'sig', alg: 'RS256' }
const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')

function mint(claims: Record<string, unknown>): string {
  const header = { alg: 'RS256', typ: 'JWT', kid }
  const t = Math.floor(Date.now() / 1000)
  const payload = { iss: 'florence-auth', aud: 'florence', sub: `u-${uid().slice(0, 6)}`, iat: t, exp: t + 3600, ...claims }
  const input = `${b64url(header)}.${b64url(payload)}`
  return `${input}.${createSign('RSA-SHA256').update(input).end().sign(privateKey).toString('base64url')}`
}

function expectConsularError(label: string, fn: () => unknown, status?: number): ConsularPaymentError | null {
  try {
    fn()
    ok(label, false, 'expected an error')
    return null
  } catch (e) {
    const err = e instanceof ConsularPaymentError ? e : null
    ok(label, !!err && (status == null || err.status === status), err ? err.message : String(e))
    return err
  }
}

function seedCandidate(opts: {
  id: string
  first?: string
  last?: string
  dob?: string
  visaTarget?: string
  withI20?: boolean
  qaApproved?: boolean
  sevisId?: string
  schoolCode?: string
}): { profile: CandidateProfile; school?: SchoolProgram; sevisWorkflow?: WorkflowInstance; visaWorkflow: WorkflowInstance } {
  const first = opts.first ?? 'Iesha'
  const last = opts.last ?? 'Mensah'
  const legalName = `${first} ${last}`.toUpperCase()
  const profile: CandidateProfile = {
    id: opts.id,
    legalFirstName: first,
    legalLastName: last,
    aliases: [],
    dateOfBirth: opts.dob ?? '1996-05-03',
    citizenship: 'GH',
    nationality: 'GH',
    countryOfResidence: 'GH',
    email: `${opts.id}@example.dev`,
    phone: '+2335550101',
    visaTarget: opts.visaTarget ?? 'F-1',
    arrivalStatus: 'abroad',
    createdAt: now(),
    updatedAt: now(),
  }
  store.candidates.insert(profile)

  const identity: IdentityDocument = {
    id: `${opts.id}-passport`,
    candidateId: opts.id,
    kind: 'passport',
    documentNumber: `P-${run}`,
    nameOnDocument: legalName,
    dateOfBirth: profile.dateOfBirth,
    issuingAuthority: 'Ghana',
    expirationDate: '2032-01-01',
    status: 'human_verified',
    confidence: 'high',
  }
  store.identityDocuments.insert(identity)

  let school: SchoolProgram | undefined
  if (opts.withI20) {
    school = {
      id: `${opts.id}-school`,
      candidateId: opts.id,
      schoolName: 'Florence SEVP College',
      programName: 'RN Bridge',
      i20Number: opts.sevisId ?? `N00${run}42`,
      sevisSchoolCode: opts.schoolCode ?? 'BOS214F12345000',
      startDate: '2026-08-19',
      nameOnI20: legalName,
    }
    store.schoolPrograms.insert(school)
    const doc: PathwayDocument = {
      id: `${opts.id}-i20`,
      candidateId: opts.id,
      kind: 'i20',
      filename: `${opts.id}-i20.pdf`,
      uploadedAt: now(),
      extracted: true,
      extractionConfidence: 'high',
      fields: {
        sevisId: school.i20Number!,
        schoolCode: school.sevisSchoolCode!,
        programStartDate: school.startDate!,
        nameOnI20: school.nameOnI20!,
      },
    }
    store.documents.insert(doc)
  }

  const sevisWorkflow = opts.withI20
    ? {
        id: `${opts.id}-sevis`,
        candidateId: opts.id,
        type: 'sevis_i20',
        title: 'SEVIS / I-20',
        status: opts.qaApproved ? 'qa_approved' : 'needs_human_qa',
        steps: [],
        createdAt: now(),
        updatedAt: now(),
      } satisfies WorkflowInstance
    : undefined
  if (sevisWorkflow) store.workflows.insert(sevisWorkflow)

  const visaWorkflow: WorkflowInstance = {
    id: `${opts.id}-visa-appt`,
    candidateId: opts.id,
    type: 'visa_appointment',
    title: 'Visa appointment',
    status: 'drafted',
    steps: [],
    createdAt: now(),
    updatedAt: now(),
  }
  store.workflows.insert(visaWorkflow)
  return { profile, school, sevisWorkflow, visaWorkflow }
}

async function main() {
  const jwks = createServer((req, res) => {
    if (req.url?.startsWith('/.well-known/jwks.json')) {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ keys: [jwk] }))
      return
    }
    res.statusCode = 404
    res.end('{}')
  })
  await new Promise<void>((resolve) => jwks.listen(0, '127.0.0.1', resolve))
  const jwksPort = (jwks.address() as { port: number }).port
  configureCoreAuth({ issuerUrl: `http://127.0.0.1:${jwksPort}`, issuer: 'florence-auth', audience: 'florence' })

  const app = express()
  app.use(express.json())
  app.use('/api', api)
  app.use('/v1', apiV1)
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>((resolve) => server.on('listening', () => resolve()))
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`

  const call = async (path: string, opts: { method?: string; token?: string; body?: unknown } = {}) => {
    const headers: Record<string, string> = opts.token ? { authorization: `Bearer ${opts.token}` } : {}
    if (opts.body !== undefined) headers['content-type'] = 'application/json'
    const res = await fetch(`${base}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
    })
    const text = await res.text()
    return { status: res.status, body: text ? JSON.parse(text) : null }
  }

  const incompleteId = `cand-i901-missing-${run}`
  seedCandidate({ id: incompleteId, first: 'Noemi', last: 'Missing', withI20: false })
  const missing = expectConsularError('order creation fails without I-20 metadata / QA-approved sevis_i20', () => createI901Order({ candidateId: incompleteId, visaType: 'F1' }), 409)
  ok('eligibility error names missing I-20 metadata', Array.isArray((missing?.details as { missing?: string[] } | undefined)?.missing) && (missing!.details as { missing: string[] }).missing.some((m) => /I-20/.test(m)))

  const dependentId = `cand-i901-f2-${run}`
  seedCandidate({ id: dependentId, first: 'Fiona', last: 'Dependent', visaTarget: 'F-2', withI20: false })
  const dependentOrder = createI901Order({ candidateId: dependentId, visaType: 'F2' })
  ok('F2 dependent order is marked not required', dependentOrder.status === 'not_required' && dependentOrder.required === false)
  expectConsularError('dependent cannot generate a SEVISmate handoff', () => createSevismateHandoff(dependentOrder.id), 409)

  const candidateId = `cand-i901-ready-${run}`
  const { school, visaWorkflow } = seedCandidate({ id: candidateId, withI20: true, qaApproved: true, sevisId: `N00${run}99`, schoolCode: 'SFR214F55555000' })
  const order = createI901Order({
    candidateId,
    visaType: 'F1',
    payerType: 'student',
    officialFeeUsd: 350,
    serviceFeeUsd: 40,
    taxOrProcessingFeeUsd: 5,
    localCurrency: 'GHS',
    localAmount: 4700,
    dueDate: '2026-07-15',
    interviewDate: '2026-08-14',
    ownerUserId: 'navigator-smoke',
    serviceSpeed: 'standard',
  })
  ok('valid I-901 order starts awaiting attestation', order.status === 'awaiting_student_attestation')
  expectConsularError('candidate cannot hand off before attestation', () => createSevismateHandoff(order.id), 409)

  attestI901Order(order.id, 'Iesha Mensah')
  const handoff = createSevismateHandoff(order.id)
  const blockedFields = ['passport_scan', 'ds160_draft', 'financing_data', 'employer_packet', 'sensitive_notes', 'passportScan', 'ds160Draft', 'financingData', 'employerPacket', 'sensitiveNotes']
  const allowedFields = new Set(['legalName', 'email', 'phone', 'sevisId', 'formType', 'schoolCode', 'visaCategory', 'country', 'paymentSpeed', 'candidateConsentId', 'florenceCaseReference'])
  ok('handoff packet is minimal and excludes broad Nurse Passport data', handoff.handoff.fieldsSent.every((f) => allowedFields.has(f)) && blockedFields.every((f) => !handoff.handoff.fieldsSent.includes(f)) && handoff.handoff.documentsSent.length === 0)
  ok('handoff URL never exposes SEVIS ID', !handoff.handoff.paymentLink || !handoff.handoff.paymentLink.includes(school!.i20Number!))

  recordI901Receipt(order.id, {
    filename: 'bad-i901.pdf',
    sevisId: 'N0099999999',
    legalName: 'Wrong Person',
    schoolCode: school!.sevisSchoolCode,
    formType: 'I-20',
    visaType: 'F1',
    receiptDate: '2026-07-03',
    amountUsd: 350,
    source: 'student_upload',
    extractionConfidence: 'high',
  })
  expectConsularError('receipt mismatch is rejected by QA approval', () => approveI901Receipt(order.id, 'qa-smoke'), 409)

  const beforeAppt = await call(`/api/workflows/${visaWorkflow.id}/appointment`, {
    method: 'POST',
    body: { consulate: 'Accra', appointmentDate: '2026-08-14' },
  })
  ok('visa appointment scheduling fails before receipt QA approval', beforeAppt.status === 409)

  const goodReceipt = recordI901Receipt(order.id, {
    filename: 'i901-official-receipt.pdf',
    sevisId: school!.i20Number!,
    legalName: school!.nameOnI20,
    schoolCode: school!.sevisSchoolCode,
    formType: 'I-20',
    visaType: 'F1',
    receiptDate: '2026-07-04',
    amountUsd: 350,
    source: 'student_upload',
    extractionConfidence: 'high',
  })
  ok('receipt upload creates metadata-first document link', goodReceipt.document.kind === 'i901_receipt' && goodReceipt.receipt.documentId === goodReceipt.document.id && goodReceipt.receipt.qaStatus === 'pending')
  const approved = approveI901Receipt(order.id, 'qa-smoke')
  ok('matching receipt is QA-approved', approved.order.status === 'receipt_qa_approved' && approved.receipt.qaStatus === 'approved')

  const afterAppt = await call(`/api/workflows/${visaWorkflow.id}/appointment`, {
    method: 'POST',
    body: { consulate: 'Accra', appointmentDate: '2026-08-14' },
  })
  ok('visa appointment scheduling succeeds after receipt QA approval', afterAppt.status === 200 && afterAppt.body.status === 'submitted')

  const eventTypes = store.consularPaymentEvents.byOrder(order.id).map((e) => e.eventType)
  ok('payment audit event stream includes receipt QA approval', ['i901_payment_order_created', 'i901_candidate_attested', 'i901_handoff_sent', 'i901_receipt_received', 'i901_receipt_qa_approved'].every((e) => eventTypes.includes(e as any)))
  const milestones = store.ledger.byCandidate(candidateId).map((m) => m.milestone)
  ok('ledger milestones were emitted for receipt upload and approval', milestones.includes('I-901 receipt uploaded') && milestones.includes('I-901 receipt QA approved'))

  const dashboard = consularPaymentsDashboard()
  const reconciliation = consularPaymentsReconciliation()
  ok('dashboard counts include seeded/demo payment records', dashboard.rows.some((r) => r.order.id === order.id) && dashboard.counts.receipt_qa_approved >= 1)
  ok('reconciliation separates payer/fees/local currency', reconciliation.studentPaid >= 1 && reconciliation.officialFeeUsd >= 350 && reconciliation.serviceFeeUsd >= 40 && reconciliation.localAmountByCurrency.some((x) => x.currency === 'GHS' && x.amount >= 4700))

  const staff = mint({ role: 'ops', roles: ['ops'], email: `ops.${run}@florence.dev` })
  const self = mint({ role: 'candidate', roles: ['candidate'], cand: candidateId })
  const other = mint({ role: 'candidate', roles: ['candidate'], cand: `other-${run}` })
  ok('staff-only dashboard rejects non-staff', (await call('/v1/consular/payments/dashboard', { token: self })).status === 403)
  ok('staff-only dashboard accepts staff', (await call('/v1/consular/payments/dashboard', { token: staff })).status === 200)
  ok('candidate-bound token can read own I-901 order', (await call(`/v1/consular/payments/i901/orders/${order.id}`, { token: self })).status === 200)
  ok('candidate-bound token cannot read another candidate order', (await call(`/v1/consular/payments/i901/orders/${order.id}`, { token: other })).status === 403)

  server.close()
  jwks.close()
  console.log(`\n${fail ? 'CONSULAR PAYMENTS SMOKE FAILED' : 'CONSULAR PAYMENTS SMOKE PASSED'} - ${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
