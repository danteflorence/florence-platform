import type { CandidateDossier, WorkflowType, JurisdictionRule, LedgerMilestone, AuditEntry } from '@shared/types'
import type { CandidateView, QaQueueItem, QaDetail, AdminMetrics, CandidateSummary } from '@shared/views'
import type { WorkflowMeta } from './types'

// FlorenceRN Core SSO. Staff surfaces (QA + Operations) require a Core staff role;
// the shared fl_session cookie is sent automatically on these same-origin /api
// calls. `isStaff()` reflects the Core session, fetched via /api/session.
const CORE_URL = (import.meta as any).env?.VITE_CORE_URL ?? 'http://id.lvh.me:8080'
let staffOk = false
const staffListeners = new Set<() => void>()
export function isStaff(): boolean { return staffOk }
export function onStaffChange(fn: () => void): () => void { staffListeners.add(fn); return () => { staffListeners.delete(fn) } }
function notifyStaff(): void { staffListeners.forEach((fn) => fn()) }
export async function refreshSession(): Promise<boolean> {
  try {
    const s = await fetch('/api/session', { credentials: 'include' }).then((r) => r.json())
    staffOk = !!s?.staff
  } catch { staffOk = false }
  notifyStaff()
  return staffOk
}
export function staffLogin(): void {
  window.location.href = `${CORE_URL}/login?redirect=${encodeURIComponent(location.href)}`
}
export function staffLogout(): void {
  staffOk = false
  window.location.href = `${CORE_URL}/logout?redirect=${encodeURIComponent(location.origin)}`
}

async function j<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error((body as any).error ? JSON.stringify((body as any).error) : r.statusText)
  }
  return r.json() as Promise<T>
}
function get<T>(url: string): Promise<T> {
  return fetch(url, { credentials: 'include' }).then(j<T>)
}
function post<T>(url: string, body: unknown): Promise<T> {
  return fetch(url, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(j<T>)
}

export interface Meta {
  llmMode: 'anthropic' | 'heuristic'
  workflows: Record<WorkflowType, WorkflowMeta>
  rules: JurisdictionRule[]
}

export const api = {
  meta: () => fetch('/api/meta').then(j<Meta>),
  candidates: () => fetch('/api/candidates').then(j<CandidateSummary[]>),
  candidateView: (id: string) => fetch(`/api/candidates/${id}/view`).then(j<CandidateView>),
  dossier: (id: string) => fetch(`/api/candidates/${id}`).then(j<CandidateDossier>),
  chat: (id: string, question: string) => post<{ reply: string }>(`/api/candidates/${id}/chat`, { question }),

  createWorkflow: (candidateId: string, type: WorkflowType) => post<any>('/api/workflows', { candidateId, type }),
  workflow: (id: string) => fetch(`/api/workflows/${id}`).then(j<any>),
  answer: (id: string, fieldId: string, value: string) => post<any>(`/api/workflows/${id}/answer`, { fieldId, value }),
  attest: (id: string, signatureName: string) => post<any>(`/api/workflows/${id}/attest`, { signatureName, acknowledge: true }),
  reviewAndSign: (
    id: string,
    body: { signatureName: string; answers: { fieldId: string; value: string; note?: string }[]; confirmedFieldIds: string[] },
  ) => post<{ status: string; attestedFields: number }>(`/api/workflows/${id}/review-and-sign`, { ...body, acknowledge: true }),
  recordConfirmation: (id: string, confirmationNumber: string) =>
    post<{ status: string; confirmationNumber: string }>(`/api/workflows/${id}/record-confirmation`, { confirmationNumber }),
  scheduleAppointment: (id: string, body: { consulate: string; appointmentDate: string; location?: string; mrvReceipt?: string }) =>
    post<{ status: string }>(`/api/workflows/${id}/appointment`, body),
  nclexRegister: (id: string, body: { nameOnPearson: string; programCode?: string; email?: string; registered: boolean }) =>
    post<{ status: string; nameMatchResolved: boolean }>(`/api/workflows/${id}/nclex-register`, body),
  nclexAtt: (id: string, body: { attNumber?: string; attExpiresOn?: string; examDate?: string; testCenter?: string; readinessConfirmed?: boolean }) =>
    post<{ status: string }>(`/api/workflows/${id}/nclex-att`, body),
  licensureSubmit: (id: string, body: { signatureName: string; answers: { fieldId: string; value: string; note?: string }[]; confirmedFieldIds: string[] }) =>
    post<{ status: string }>(`/api/workflows/${id}/licensure-submit`, { ...body, acknowledge: true }),
  submit: (id: string) => post<any>(`/api/workflows/${id}/submit`, {}),
  resolveDeficiency: (deficiencyId: string) => post<{ ok: boolean }>(`/api/deficiencies/${deficiencyId}/resolve`, {}),
  logDeficiency: (workflowId: string, source: string, items: string[]) => post<any>(`/api/workflows/${workflowId}/deficiency`, { source, items }),
  notify: (candidateId: string) => post<{ sent: number; channel: string }>(`/api/candidates/${candidateId}/notify`, {}),
  uploadDocument: (candidateId: string, body: { kind: string; filename: string }) => post<{ id: string; extracted: boolean; fields?: Record<string, string> }>(`/api/candidates/${candidateId}/documents`, body),
  chooseState: (candidateId: string, state: string) => post<{ path: 'endorsement' | 'exam'; state: string; workflowId: string; type: string; created: boolean }>(`/api/candidates/${candidateId}/choose-state`, { state }),
  setSsnStatus: (candidateId: string, hasSsn: boolean) => post<{ hasSsn: boolean }>(`/api/candidates/${candidateId}/ssn-status`, { hasSsn }),
  setConsent: (candidateId: string, scope: string, granted: boolean) => post<{ scope: string; granted: boolean }>(`/api/candidates/${candidateId}/consent`, { scope, granted }),

  qaQueue: () => get<QaQueueItem[]>('/api/qa/queue'),
  qaReview: (id: string) => get<QaDetail>(`/api/qa/reviews/${id}`),
  qaDecide: (id: string, decision: 'approve' | 'request_changes', reviewer: string, notes?: string) =>
    post<any>(`/api/qa/reviews/${id}/decide`, { decision, reviewer, notes }),

  metrics: () => get<AdminMetrics>('/api/admin/metrics'),
  ledger: () => get<LedgerMilestone[]>('/api/admin/ledger'),
  audit: () => get<AuditEntry[]>('/api/admin/audit'),
}
