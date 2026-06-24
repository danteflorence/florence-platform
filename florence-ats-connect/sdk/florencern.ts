// ============================================================================
// FlorenceRN Platform API — TypeScript SDK (the internal client our own surfaces +
// partners build against). Dependency-free (fetch). Auth via the Core fl_session
// cookie (browser, credentials:'include') or a Bearer token (server-to-server).
//   const fln = new FlorenceRN({ baseUrl: 'https://ats.florenceeducation.com', token })
//   const gate = await fln.eligibilityCheck(candidateId, jobId)
// ============================================================================
export interface FlorenceRNOptions {
  baseUrl?: string          // default '' (same-origin)
  token?: string            // Bearer (server-to-server); omit in the browser (cookie rides along)
  fetchImpl?: typeof fetch
}

export type PassportAudience = 'internal' | 'employer' | 'candidate'

export interface GateResult {
  candidateId: string; jobId: string
  applicationGateStatus: string
  missing: string[]
  allowedAction: 'express_interest' | 'apply_with_packet'
  subjectTo: string[]
  subjectToMessage?: string
}

export class FlorenceRN {
  private base: string
  private token?: string
  private f: typeof fetch
  constructor(o: FlorenceRNOptions = {}) {
    this.base = (o.baseUrl ?? '').replace(/\/$/, '')
    this.token = o.token
    this.f = o.fetchImpl ?? fetch
  }

  private async call<T>(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (this.token) headers.authorization = `Bearer ${this.token}`
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
    const r = await this.f(`${this.base}/v1${path}`, { method, headers, credentials: 'include', body: body === undefined ? undefined : JSON.stringify(body) })
    const text = await r.text()
    const json = text ? JSON.parse(text) : null
    if (!r.ok) throw Object.assign(new Error(json?.error ?? `HTTP ${r.status}`), { status: r.status, body: json })
    return json as T
  }

  // meta / contract
  openapi = () => this.call<Record<string, unknown>>('GET', '/openapi.json')
  meta = () => this.call<{ api: string; version: string; modules: string[] }>('GET', '/')

  // nurses + passport
  nurse = (id: string) => this.call('GET', `/nurses/${encodeURIComponent(id)}`)
  passport = (id: string, view: PassportAudience = 'employer') => this.call('GET', `/nurses/${encodeURIComponent(id)}/passport?view=${view}`)
  nextActions = (id: string) => this.call('GET', `/nurses/${encodeURIComponent(id)}/next-actions`)

  // opportunities
  opportunities = () => this.call<any[]>('GET', '/opportunities')
  opportunity = (id: string) => this.call('GET', `/opportunities/${encodeURIComponent(id)}`)
  expressInterest = (id: string, body: { fullName: string; email?: string; phone?: string; targetState?: string; consentGranted?: boolean }, idemKey?: string) =>
    this.call('POST', `/opportunities/${encodeURIComponent(id)}/interest`, body, idemKey)
  nurseOpportunities = (id: string) => this.call<any[]>('GET', `/nurses/${encodeURIComponent(id)}/opportunities`)

  // applications + gate
  eligibilityCheck = (candidateId: string, jobId: string) => this.call<GateResult>('POST', '/applications/eligibility-check', { candidateId, jobId })
  submitApplication = (packetId: string, override?: { actor: string; role: string; reason: string }, idemKey?: string) =>
    this.call('POST', `/applications/${encodeURIComponent(packetId)}/submit`, override ? { override } : {}, idemKey)

  // pricing
  priceQuote = (body: { state: string; setting?: string; role?: string; employerName?: string }) => this.call('POST', '/pricing/quote', body)

  // programs
  programs = () => this.call<any[]>('GET', '/programs')
  program = (id: string) => this.call('GET', `/programs/${encodeURIComponent(id)}`)

  // production ledger + events
  recordEvent = (body: { event_type: string; candidate_id?: string; employer_id?: string; job_id?: string; payload?: Record<string, unknown> }, idemKey?: string) =>
    this.call('POST', '/events', body, idemKey)
  events = (candidateId?: string) => this.call<any[]>('GET', `/events${candidateId ? `?candidate_id=${encodeURIComponent(candidateId)}` : ''}`)
  ledger = (candidateId?: string) => this.call<any[]>('GET', `/ledger${candidateId ? `?candidate_id=${encodeURIComponent(candidateId)}` : ''}`)
  forecast = () => this.call('GET', '/ledger/forecast')
}
