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

export const apiV1 = Router()

const h = (fn: (req: Request, res: Response) => unknown | Promise<unknown>) =>
  (req: Request, res: Response) => { Promise.resolve(fn(req, res)).catch((err) => { if (!res.headersSent) res.status(500).json({ error: String(err?.message ?? err) }) }) }

// Authorize a per-candidate read: STAFF may read anyone; a candidate token may read
// only its own bound candidate (principal.cand). Fail-closed (401 then 403).
async function authFor(req: Request, res: Response, candidateId: string): Promise<CorePrincipal | null> {
  const p = await principalFromRequest(req)
  if (!p) { res.status(401).json({ error: 'authentication required' }); return null }
  if (isStaff(p) || p.cand === candidateId) return p
  res.status(403).json({ error: 'forbidden' }); return null
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
