// Pathway capability — OpenAPI 3.1 fragment. Served at GET /v1/openapi.json.
// These endpoints are STAFF or candidate-self only; visa/immigration detail is
// INTERNAL-only and never exposed to an employer (there is no employer audience
// here). Part of the FlorenceRN Platform API (Pathway capability module).
export const PATHWAY_OPENAPI: Record<string, unknown> = {
  openapi: '3.1.0',
  info: {
    title: 'FlorenceRN Platform API — Pathway capability',
    version: 'v1',
    description:
      'Visa / I-20 / NCLEX-ATT / licensure / workflow status + the readiness gate for one nurse. Auth: Core RS256 (fl_session cookie or Bearer). STAFF (super_admin/ops/qa/instructor) or the candidate themselves (cand binding) only — visa/immigration detail is INTERNAL and never exposed to employers (Title VII / IRCA).',
  },
  servers: [{ url: '/v1' }],
  components: {
    securitySchemes: {
      coreCookie: { type: 'apiKey', in: 'cookie', name: 'fl_session' },
      coreBearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  security: [{ coreCookie: [] }, { coreBearer: [] }],
  'x-scopes': {
    'pathway:read': 'Read a nurse\'s pathway status / tasks / readiness (staff or self)',
  },
  paths: {
    '/pathway/{id}/status': { get: { summary: 'Workflow status across the nurse\'s pathway (staff/self).', responses: { '200': { description: 'ok' }, '401': { description: 'auth required' }, '403': { description: 'forbidden' }, '404': { description: 'not found' } } } },
    '/pathway/{id}/tasks': { get: { summary: 'Immediate candidate-owned next actions.', responses: { '200': { description: 'ok' }, '401': { description: 'auth required' }, '403': { description: 'forbidden' }, '404': { description: 'not found' } } } },
    '/pathway/{id}/readiness': { get: { summary: 'NCLEX readiness gate decision (shadow-aware).', responses: { '200': { description: 'ok' }, '401': { description: 'auth required' }, '403': { description: 'forbidden' } } } },
  },
}
