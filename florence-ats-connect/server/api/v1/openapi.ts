// FlorenceRN Platform API — OpenAPI 3.1 contract (authored). Served at GET /v1/openapi.json.
// The machine-readable contract every client (our apps + partners) builds against.
export const OPENAPI_V1: Record<string, unknown> = {
  openapi: '3.1.0',
  info: {
    title: 'FlorenceRN Platform API',
    version: 'v1',
    description: 'Headless nurse-production platform. The Nurse Passport is the central object (permissioned views); the Production Ledger is the system of record; every workflow is an event. Auth: Core RS256 (fl_session cookie or Bearer). Scoped per role. Creates accept an Idempotency-Key header. The employer audience NEVER receives visa/nationality/financing (Title VII/IRCA).',
  },
  servers: [{ url: '/v1' }],
  components: {
    securitySchemes: {
      coreCookie: { type: 'apiKey', in: 'cookie', name: 'fl_session' },
      coreBearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    parameters: {
      IdempotencyKey: { name: 'Idempotency-Key', in: 'header', required: false, schema: { type: 'string' }, description: 'Retry-safe key; a duplicate create returns the original result.' },
    },
  },
  security: [{ coreCookie: [] }, { coreBearer: [] }],
  'x-scopes': {
    'passport:read:internal': 'Full internal nurse record', 'passport:read:employer': 'Redacted employer packet view (no visa/financing)',
    'passport:read:candidate': 'A nurse\'s own view', 'opportunities:read': 'Read jobs', 'opportunities:interest:create': 'Register interest',
    'applications:eligibility': 'Run the application gate', 'applications:submit': 'Submit a QA-cleared, gate-cleared packet',
    'packets:qa': 'Packet QA', 'pricing:quote': 'Per-RN/month quote', 'programs:read': 'AMN/Kaiser programs', 'ledger:read': 'Read ledger/events', 'ledger:write': 'Write events',
  },
  paths: {
    '/nurses/{id}': { get: { summary: 'Internal nurse record', 'x-scope': 'passport:read:internal', responses: { '200': { description: 'ok' }, '404': { description: 'not found' } } } },
    '/nurses/{id}/passport': { get: { summary: 'Permissioned passport view', parameters: [{ name: 'view', in: 'query', schema: { enum: ['internal', 'employer', 'candidate'] } }], responses: { '200': { description: 'Audience-redacted view; employer omits visa/nationality/financing' }, '403': { description: 'scope' } } } },
    '/nurses/{id}/next-actions': { get: { summary: 'Gate-missing actions across interested jobs', 'x-scope': 'passport:read:internal', responses: { '200': { description: 'ok' } } } },
    '/opportunities': { get: { summary: 'Open, displayable opportunities', 'x-scope': 'opportunities:read', responses: { '200': { description: 'ok' } } } },
    '/opportunities/{id}': { get: { summary: 'Redacted opportunity card', 'x-scope': 'opportunities:read', responses: { '200': { description: 'ok' }, '404': { description: 'not found / not displayable' } } } },
    '/opportunities/{id}/interest': { post: { summary: 'Express interest (free signal; not an application)', 'x-scope': 'opportunities:interest:create', parameters: [{ $ref: '#/components/parameters/IdempotencyKey' }], responses: { '201': { description: 'interest recorded' } } } },
    '/nurses/{id}/opportunities': { get: { summary: 'Ranked opportunities for a nurse (gate-aware CTA)', 'x-scope': 'passport:read:internal', responses: { '200': { description: 'ok' } } } },
    '/applications/eligibility-check': { post: { summary: 'Run the Application Submission Gate', 'x-scope': 'applications:eligibility', responses: { '200': { description: 'gate status + missing[] + allowedAction + subjectTo + subjectToMessage' } } } },
    '/applications/{packetId}/gate-check': { get: { summary: 'Run the packet-aware Application Gate', 'x-scope': 'applications:eligibility', responses: { '200': { description: 'gate status + missing[] + reasons[] + subjectTo + subjectToMessage' } } } },
    '/applications/{packetId}/submit': { post: { summary: 'Submit a packet (hard-gated; duplicate-lock protected)', 'x-scope': 'applications:submit', parameters: [{ $ref: '#/components/parameters/IdempotencyKey' }], responses: { '201': { description: 'submitted' }, '409': { description: 'gate not cleared (missing[])' } } } },
    '/pricing/quote': { post: { summary: 'Per-RN/month quote (deterministic; FICA customer-side)', 'x-scope': 'pricing:quote', responses: { '200': { description: 'ok' } } } },
    '/programs': { get: { summary: 'AMN/Kaiser programs', 'x-scope': 'programs:read', responses: { '200': { description: 'ok' } } } },
    '/programs/{id}': { get: { summary: 'Program + waves', 'x-scope': 'programs:read', responses: { '200': { description: 'ok' } } } },
    '/events': {
      post: { summary: 'Record a platform event (→ Production Ledger spine)', 'x-scope': 'ledger:write', parameters: [{ $ref: '#/components/parameters/IdempotencyKey' }], responses: { '201': { description: 'ok' } } },
      get: { summary: 'Events by candidate', 'x-scope': 'ledger:read', parameters: [{ name: 'candidate_id', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'ok' } } },
    },
    '/ledger': { get: { summary: 'Production ledger events', 'x-scope': 'ledger:read', parameters: [{ name: 'candidate_id', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'ok' } } } },
    '/ledger/forecast': { get: { summary: 'Expected starts + recurring MRR by month', 'x-scope': 'ledger:read', responses: { '200': { description: 'ok' } } } },
  },
}
