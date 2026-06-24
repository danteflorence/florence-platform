// ============================================================================
// FlorenceRN Platform API — Pathway capability module (/v1). A scoped, versioned
// read surface over the EXISTING pathway handlers (views / readinessGate / workflow),
// so the platform reads pathway state through ONE API instead of the app's internal
// routes. Mounted at /v1, alongside the internal /api routes (which keep working).
//
// AUTH: every route is STAFF (super_admin/ops/qa/instructor) OR the candidate
// themselves (Core token `cand` binding). There is NO employer audience here —
// visa/immigration detail is INTERNAL-only (Title VII / IRCA). Built deterministically.
// ============================================================================
import { Router, type Request, type Response } from 'express'
import { getDossier } from '../../db'
import { principalFromRequest, isStaff, type CorePrincipal } from '../../coreAuth'
import { nextActions } from '../../agents/workflow'
import { checkReadinessGate } from '../../readinessGate'
import { PATHWAY_OPENAPI } from './openapi'
import {
  createI901OrderSchema,
  i901AttestationSchema,
  i901QaDecisionSchema,
  i901ReceiptSchema,
  patchI901OrderSchema,
  sevismateHandoffSchema,
} from '../../../shared/schema'
import {
  ConsularPaymentError,
  approveI901Receipt,
  attestI901Order,
  consularPaymentsDashboard,
  consularPaymentsReconciliation,
  createI901Order,
  createSevismateHandoff,
  detailForOrder,
  patchI901Order,
  recordI901Receipt,
  rejectI901Receipt,
  sevismateCsv,
} from '../../consularPayments'
import { store } from '../../db'

export const apiV1 = Router()

const h = (fn: (req: Request, res: Response) => unknown | Promise<unknown>) =>
  (req: Request, res: Response) => {
    Promise.resolve(fn(req, res)).catch((err) => {
      if (res.headersSent) return
      if (err instanceof ConsularPaymentError) return res.status(err.status).json({ error: err.message, details: err.details })
      res.status(500).json({ error: String(err?.message ?? err) })
    })
  }

// Authorize a per-candidate read: STAFF may read anyone; a candidate token may read
// only its own bound candidate (principal.cand). Fail-closed (401 then 403).
async function authFor(req: Request, res: Response, candidateId: string): Promise<CorePrincipal | null> {
  const p = await principalFromRequest(req)
  if (!p) { res.status(401).json({ error: 'authentication required' }); return null }
  if (isStaff(p) || p.cand === candidateId) return p
  res.status(403).json({ error: 'forbidden' }); return null
}

async function authStaff(req: Request, res: Response): Promise<CorePrincipal | null> {
  const p = await principalFromRequest(req)
  if (!p) { res.status(401).json({ error: 'authentication required' }); return null }
  if (isStaff(p)) return p
  res.status(403).json({ error: 'staff role required' })
  return null
}

async function authForOrder(req: Request, res: Response, orderId: string): Promise<CorePrincipal | null> {
  const order = store.consularPaymentOrders.get(orderId)
  if (!order) { res.status(404).json({ error: 'payment order not found' }); return null }
  return authFor(req, res, order.candidateId)
}

// Public contract.
apiV1.get('/openapi.json', (_req, res) => res.json(PATHWAY_OPENAPI))

apiV1.get('/', (_req, res) => res.json({ api: 'florencern-platform', capability: 'pathway', version: 'v1', modules: ['status', 'tasks', 'readiness'] }))

// Workflow status across the nurse's pathway. visaOutcome is surfaced only to
// staff/self (the only audiences here) — never to any employer surface.
apiV1.get('/pathway/:id/status', h(async (req, res) => {
  const p = await authFor(req, res, req.params.id); if (!p) return
  const d = getDossier(req.params.id)
  if (!d) return res.status(404).json({ error: 'not found' })
  res.json({
    candidateId: req.params.id,
    arrivalStatus: d.profile.arrivalStatus ?? 'abroad',
    workflows: d.workflows.map((w) => ({ id: w.id, type: w.type, title: w.title, status: w.status, ...(w.visaOutcome ? { visaOutcome: w.visaOutcome } : {}) })),
  })
}))

// Immediate candidate-owned next actions.
apiV1.get('/pathway/:id/tasks', h(async (req, res) => {
  const p = await authFor(req, res, req.params.id); if (!p) return
  const d = getDossier(req.params.id)
  if (!d) return res.status(404).json({ error: 'not found' })
  res.json({ candidateId: req.params.id, tasks: nextActions(d) })
}))

// NCLEX readiness gate decision (shadow-aware; mock-by-default when the spine is off).
apiV1.get('/pathway/:id/readiness', h(async (req, res) => {
  const p = await authFor(req, res, req.params.id); if (!p) return
  const gate = await checkReadinessGate(req.params.id)
  res.json({ candidateId: req.params.id, ...gate })
}))

// --- Consular Payments: I-901 SEVIS fee -----------------------------------
apiV1.get('/consular/payments/dashboard', h(async (req, res) => {
  const p = await authStaff(req, res); if (!p) return
  res.json(consularPaymentsDashboard())
}))

apiV1.get('/consular/payments/reconciliation', h(async (req, res) => {
  const p = await authStaff(req, res); if (!p) return
  res.json(consularPaymentsReconciliation())
}))

apiV1.get('/consular/payments/i901/handoff/sevismate.csv', h(async (req, res) => {
  const p = await authStaff(req, res); if (!p) return
  res.type('text/csv').send(sevismateCsv())
}))

apiV1.post('/consular/payments/i901/orders', h(async (req, res) => {
  const p = await authStaff(req, res); if (!p) return
  const parsed = createI901OrderSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const order = createI901Order(parsed.data)
  res.json(detailForOrder(order))
}))

apiV1.get('/consular/payments/i901/orders/:orderId', h(async (req, res) => {
  const p = await authForOrder(req, res, req.params.orderId); if (!p) return
  const order = store.consularPaymentOrders.get(req.params.orderId)
  if (!order) return res.status(404).json({ error: 'payment order not found' })
  res.json(detailForOrder(order))
}))

apiV1.patch('/consular/payments/i901/orders/:orderId', h(async (req, res) => {
  const p = await authStaff(req, res); if (!p) return
  const parsed = patchI901OrderSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const body = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== null))
  const order = patchI901Order(req.params.orderId, body)
  res.json(detailForOrder(order))
}))

apiV1.post('/consular/payments/i901/:orderId/attest', h(async (req, res) => {
  const p = await authForOrder(req, res, req.params.orderId); if (!p) return
  const parsed = i901AttestationSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const requiredFields = new Set(['legal_name', 'date_of_birth', 'sevis_id', 'school_code', 'form_type', 'program_start_date'])
  if (!parsed.data.confirmedFields.every((f) => requiredFields.has(f)) || parsed.data.confirmedFields.length < requiredFields.size) {
    return res.status(400).json({ error: 'confirm every required I-901 field before handoff' })
  }
  const order = attestI901Order(req.params.orderId, parsed.data.signatureName)
  res.json(detailForOrder(order))
}))

apiV1.post('/consular/payments/i901/:orderId/handoff/sevismate', h(async (req, res) => {
  const p = await authForOrder(req, res, req.params.orderId); if (!p) return
  const parsed = sevismateHandoffSchema.safeParse(req.body ?? {})
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  res.json(createSevismateHandoff(req.params.orderId, parsed.data.integrationMode))
}))

apiV1.post('/consular/payments/i901/:orderId/receipt', h(async (req, res) => {
  const p = await authForOrder(req, res, req.params.orderId); if (!p) return
  const parsed = i901ReceiptSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  res.json(recordI901Receipt(req.params.orderId, parsed.data))
}))

apiV1.post('/consular/payments/i901/:orderId/qa-approve', h(async (req, res) => {
  const p = await authStaff(req, res); if (!p) return
  const parsed = i901QaDecisionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  res.json(approveI901Receipt(req.params.orderId, parsed.data.reviewer))
}))

apiV1.post('/consular/payments/i901/:orderId/qa-reject', h(async (req, res) => {
  const p = await authStaff(req, res); if (!p) return
  const parsed = i901QaDecisionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  res.json(rejectI901Receipt(req.params.orderId, parsed.data.reviewer, parsed.data.notes))
}))
