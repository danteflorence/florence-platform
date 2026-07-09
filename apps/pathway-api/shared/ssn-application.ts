import type {
  CandidateProfile,
  F1SsnApplicationProgress,
  F1SsnApplicationStatus,
  F1SsnWorkAuthorizationKind,
  OfficialResource,
} from './types'
import type { SsnAction, SsnPolicy } from './ssn-policy'

export type F1SsnStepKey =
  | 'arrive_us'
  | 'confirm_work_authorization'
  | 'start_online_application'
  | 'schedule_ssa_visit'
  | 'attend_ssa_visit'
  | 'receive_card'

export type F1SsnStepStatus = 'done' | 'ready' | 'blocked' | 'not_applicable'

export interface F1SsnApplicationStepView {
  key: F1SsnStepKey
  label: string
  detail: string
  status: F1SsnStepStatus
  blocker?: string
}

export interface F1SsnApplicationView {
  applicable: boolean
  status: F1SsnApplicationStatus
  progress: F1SsnApplicationProgress
  steps: F1SsnApplicationStepView[]
  nextStep?: F1SsnApplicationStepView
  officeVisitDueDate?: string
  sourceNotes: string[]
  resources: OfficialResource[]
}

export type F1SsnApplicationAction =
  | 'confirm_work_authorization'
  | 'start_online_application'
  | 'schedule_ssa_visit'
  | 'complete_ssa_visit'
  | 'mark_card_received'
  | 'reset'

export interface F1SsnApplicationPatch {
  action: F1SsnApplicationAction
  workAuthorizationKind?: F1SsnWorkAuthorizationKind
  scheduledFor?: string
  officeName?: string
  officeCity?: string
  officeState?: string
}

export const SSA_FIRST_TIME_NUMBER_RESOURCE: OfficialResource = {
  label: 'SSA - Request a Social Security number for the first time',
  url: 'https://www.ssa.gov/number-card/request-number-first-time',
  note: 'Start online, then visit a local Social Security office or Card Center with documents.',
}

export const SSA_INTERNATIONAL_STUDENTS_RESOURCE: OfficialResource = {
  label: 'SSA - International Students and Social Security Numbers',
  url: 'https://www.ssa.gov/pubs/EN-05-10181.pdf',
  note: 'F-1 students need work authorization evidence; CPT applicants show the signed I-20 employment page.',
}

export const SSA_APPOINTMENT_RESOURCE: OfficialResource = {
  label: 'SSA - Make or change an appointment',
  url: 'https://www.ssa.gov/manage-benefits/make-an-appointment',
  note: 'Some tasks start online and then SSA helps schedule an office appointment when needed.',
}

export const SSA_OFFICE_LOCATOR_RESOURCE: OfficialResource = {
  label: 'SSA - Field Office Locator',
  url: 'https://www.ssa.gov/locator/',
  note: 'Find a Social Security office or Card Center after the online application is started.',
}

export const F1_SSN_SOURCE_NOTES = [
  'SSA assigns SSNs only to people authorized to work in the United States; an SSN is not issued just for school enrollment.',
  'SSA guidance says to wait 48 hours after reporting to school before applying so DHS status can be verified.',
  'After starting online, the applicant completes the SSN request by visiting SSA/Card Center with documentation within 45 calendar days.',
  'For F-1 CPT, SSA requires the Form I-20 employment page completed and signed by the DSO.',
  'Most cards arrive by mail after SSA approves the application; Florence tracks only receipt status, never the number.',
]

export const F1_SSN_APPLICATION_RESOURCES = [
  SSA_FIRST_TIME_NUMBER_RESOURCE,
  SSA_INTERNATIONAL_STUDENTS_RESOURCE,
  SSA_APPOINTMENT_RESOURCE,
  SSA_OFFICE_LOCATOR_RESOURCE,
]

const SSN_VALUE = /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/
const FORBIDDEN_KEY = /^(ssn|socialSecurityNumber|social_security_number|ssnLast4|last4|cardNumber|card_number|ssaConfirmation|ssa_confirmation|confirmationNumber|confirmation_number|referenceNumber|reference_number)$/i

export function defaultF1SsnApplicationProgress(nowIso: string): F1SsnApplicationProgress {
  return { status: 'not_started', updatedAt: nowIso }
}

export function payloadContainsSsn(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'string') return SSN_VALUE.test(value)
  if (typeof value === 'number') return SSN_VALUE.test(String(value))
  if (typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some(payloadContainsSsn)
  return Object.entries(value as Record<string, unknown>).some(([key, child]) => FORBIDDEN_KEY.test(key) || payloadContainsSsn(child))
}

export function sanitizeF1SsnApplicationPatch(input: unknown): F1SsnApplicationPatch {
  if (payloadContainsSsn(input)) throw new Error('Florence never stores SSNs, SSN fragments, or SSA confirmation/reference values.')
  const body = (input ?? {}) as Record<string, unknown>
  const action = body.action
  if (!isAction(action)) throw new Error('Invalid SSN application action.')
  const out: F1SsnApplicationPatch = { action }
  if (body.workAuthorizationKind != null) {
    if (!['cpt_i20', 'on_campus', 'ead'].includes(String(body.workAuthorizationKind))) throw new Error('Invalid work authorization kind.')
    out.workAuthorizationKind = body.workAuthorizationKind as F1SsnWorkAuthorizationKind
  }
  for (const key of ['scheduledFor', 'officeName', 'officeCity', 'officeState'] as const) {
    const val = body[key]
    if (val != null) {
      if (typeof val !== 'string' || val.length > 100) throw new Error(`Invalid ${key}.`)
      out[key] = val.trim()
    }
  }
  if (out.action === 'schedule_ssa_visit' && !out.scheduledFor) throw new Error('scheduledFor is required to track the SSA visit.')
  return out
}

function isAction(action: unknown): action is F1SsnApplicationAction {
  return typeof action === 'string' && [
    'confirm_work_authorization',
    'start_online_application',
    'schedule_ssa_visit',
    'complete_ssa_visit',
    'mark_card_received',
    'reset',
  ].includes(action)
}

export function applyF1SsnApplicationPatch(
  profile: CandidateProfile,
  patch: F1SsnApplicationPatch,
  nowIso: string,
): CandidateProfile {
  const current = profile.ssnApplication ?? defaultF1SsnApplicationProgress(nowIso)
  let next: F1SsnApplicationProgress = { ...current, updatedAt: nowIso }

  switch (patch.action) {
    case 'reset':
      next = defaultF1SsnApplicationProgress(nowIso)
      profile.hasSsn = false
      break
    case 'confirm_work_authorization':
      next.workAuthorizationKind = patch.workAuthorizationKind ?? current.workAuthorizationKind ?? 'cpt_i20'
      next.workAuthorizationConfirmedAt = nowIso
      if (next.status === 'not_started') next.status = 'ready_to_apply'
      break
    case 'start_online_application':
      next.onlineApplicationStartedAt = nowIso
      next.status = 'online_application_started'
      break
    case 'schedule_ssa_visit':
      next.ssaVisit = {
        scheduledFor: patch.scheduledFor,
        officeName: patch.officeName,
        officeCity: patch.officeCity,
        officeState: patch.officeState,
        scheduledAt: nowIso,
      }
      next.status = 'ssa_visit_scheduled'
      break
    case 'complete_ssa_visit':
      next.ssaVisitCompletedAt = nowIso
      next.status = 'ssa_visit_completed'
      break
    case 'mark_card_received':
      next.cardReceivedAt = nowIso
      next.status = 'card_received'
      profile.hasSsn = true
      break
  }

  profile.ssnApplication = next
  profile.updatedAt = nowIso
  return profile
}

export function buildF1SsnApplicationView(
  profile: CandidateProfile,
  action: SsnAction,
  policy: SsnPolicy,
): F1SsnApplicationView {
  const applicable = action === 'apply_ssn' && !profile.hasSsn
  const progress = profile.ssnApplication ?? {
    status: profile.hasSsn ? 'card_received' : applicable ? 'not_started' : 'not_applicable',
    updatedAt: profile.updatedAt,
  } satisfies F1SsnApplicationProgress
  const arrived = profile.arrivalStatus === 'arrived'
  const workAuth = !!progress.workAuthorizationConfirmedAt
  const online = !!progress.onlineApplicationStartedAt
  const scheduled = !!progress.ssaVisit?.scheduledFor
  const visited = !!progress.ssaVisitCompletedAt
  const received = !!progress.cardReceivedAt || !!profile.hasSsn
  const officeVisitDueDate = progress.onlineApplicationStartedAt ? addDays(progress.onlineApplicationStartedAt, 45) : undefined

  const steps: F1SsnApplicationStepView[] = applicable ? [
    {
      key: 'arrive_us',
      label: 'Arrive and report to school',
      detail: 'SSA suggests waiting 48 hours after reporting to school before applying so DHS status can verify cleanly.',
      status: arrived ? 'done' : 'blocked',
      blocker: arrived ? undefined : 'Available after U.S. arrival and school check-in.',
    },
    {
      key: 'confirm_work_authorization',
      label: 'Confirm F-1 work authorization evidence',
      detail: 'For CPT, use the I-20 employment page completed and signed by the DSO. On-campus work needs DSO and employer evidence.',
      status: workAuth ? 'done' : arrived ? 'ready' : 'blocked',
      blocker: arrived ? undefined : 'Work authorization evidence is confirmed after arrival/check-in.',
    },
    {
      key: 'start_online_application',
      label: 'Start SSA application online',
      detail: 'Start the first-time SSN request on SSA.gov. Do not enter the SSN or any SSA confirmation back into Florence.',
      status: online ? 'done' : workAuth ? 'ready' : 'blocked',
      blocker: workAuth ? undefined : 'Confirm work authorization evidence first.',
    },
    {
      key: 'schedule_ssa_visit',
      label: 'Schedule SSA/Card Center visit',
      detail: 'After the online start, schedule or record the SSA office/Card Center visit. Complete the visit within 45 calendar days.',
      status: scheduled ? 'done' : online ? 'ready' : 'blocked',
      blocker: online ? undefined : 'Start the SSA online application first.',
    },
    {
      key: 'attend_ssa_visit',
      label: 'Attend SSA visit with original documents',
      detail: 'Bring original work-authorized immigration status, age, and identity documents. Photocopies and notarized copies are not accepted.',
      status: visited ? 'done' : scheduled ? 'ready' : 'blocked',
      blocker: scheduled ? undefined : 'Schedule the SSA visit first.',
    },
    {
      key: 'receive_card',
      label: 'Receive card and unblock state license gate',
      detail: 'Mark the card received after it arrives by mail. Florence stores only this status, never the number.',
      status: received ? 'done' : visited ? 'ready' : 'blocked',
      blocker: visited ? undefined : 'Attend the SSA visit first.',
    },
  ] : [
    {
      key: 'receive_card',
      label: 'SSN application not required for this current pathway',
      detail: policy.summary,
      status: 'not_applicable',
    },
  ]

  return {
    applicable,
    status: progress.status,
    progress,
    steps,
    nextStep: steps.find((s) => s.status === 'ready') ?? steps.find((s) => s.status === 'blocked'),
    officeVisitDueDate,
    sourceNotes: F1_SSN_SOURCE_NOTES,
    resources: F1_SSN_APPLICATION_RESOURCES,
  }
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
