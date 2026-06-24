// Payload shapes returned by the API to each surface. Shared so the React
// client and the Express server agree on the wire format.
import type {
  CandidateProfile, WorkflowType, WorkflowStatus, WorkflowInstance,
  ConsistencyFlag, MissingItem, LedgerMilestone, RiskLevel, Owner,
  QaReview, FormDraft, AuditEntry, OfficialResource, JurisdictionRule, PathwayDocument,
  Confidence, ConsularPaymentStatus, ConsularPaymentOrder,
} from './types'
import type { InterviewPrep } from './interview-prep'
import type { SsnPolicy, SsnAction } from './ssn-policy'
import type { ConsentState } from './consent'
import type { PathwayGraphView } from './pathway-graph'
import type { RouteRecommendation } from './route-recommender'
import type { CountryPlaybook } from './country-playbooks'
import type { DeficiencyClass } from './deficiency-engine'

/** The candidate-facing critical-path clock. SCHEDULE ONLY — never any Florence
 *  economics (subscription / cohort value / revenue at risk). Those are internal
 *  and live on the Operations / Control Tower surfaces only. */
export interface PathwayClock {
  expectedStartDate?: string
  targetStartDate?: string
  /** Expected minus target, in days. Positive = behind schedule. */
  delayDays: number
  /** Working days of incomplete work on the critical path. */
  remainingDays: number
  bottleneck?: { label: string; reason: string }
  nextAction?: string
}

/** A thing the candidate must personally do this week. */
export interface SimpleAction {
  title: string
  detail?: string
  workflowShort?: string
  kind: 'provide' | 'review' | 'deficiency' | 'in_person'
}

/** A task Florence is handling in the background (AI / QA / system owned). */
export interface SimpleTask {
  title: string
  workflowShort: string
  owner: Owner
}

/** The administrative version of the candidate's profile — one status per domain,
 *  rolled up into a single band. The Pathway OS analog of Academy's Readiness Passport. */
export type PassportBand = 'not_started' | 'building' | 'qa_needed' | 'candidate_action' | 'start_ready'

export interface PassportRow {
  label: string
  statusLabel: string
  progress: number
  owner?: Owner
  band: PassportBand
}

export interface PathwayPassport {
  band: PassportBand
  bandLabel: string
  summary: string
  rows: PassportRow[]
}

/** One requirement / element of a workflow, with its fee, official source, and
 *  completion status — so the whole process is fee-transparent, sourced, and tracked. */
export interface RequirementItem {
  fieldId: string
  label: string
  detail?: string
  feeUsd?: number
  /** Always present — the element ties back to an official board/.gov source. */
  source: OfficialResource
  status: 'pending' | 'provided' | 'verified'
  inPerson?: boolean
  sensitive?: boolean
}

export interface RequirementGroup {
  workflowId: string
  workflowShort: string
  title: string
  items: RequirementItem[]
  completeCount: number
  totalCount: number
  totalFeesUsd: number
}

export interface I901PaymentSummary {
  required: boolean
  eligible: boolean
  missing: string[]
  status: ConsularPaymentStatus
  statusLabel: string
  orderId?: string
  paymentLink?: string
  receiptQaStatus?: 'pending' | 'approved' | 'rejected'
  receiptDocumentId?: string
  sevisIdMasked?: string
  school?: string
  nextStep: string
}

export interface ConsularPaymentsView {
  i901: I901PaymentSummary
}

export interface ConsularPaymentDashboardRow {
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

export interface ConsularPaymentDashboard {
  counts: Record<string, number>
  queues: {
    readyForPayment: ConsularPaymentDashboardRow[]
    awaitingCandidateAttestation: ConsularPaymentDashboardRow[]
    paymentInProgress: ConsularPaymentDashboardRow[]
    receiptPending: ConsularPaymentDashboardRow[]
    receiptQaNeeded: ConsularPaymentDashboardRow[]
    blockedCorrectionNeeded: ConsularPaymentDashboardRow[]
    interviewAtRisk: ConsularPaymentDashboardRow[]
    completed: ConsularPaymentDashboardRow[]
  }
  rows: ConsularPaymentDashboardRow[]
}

export interface ConsularPaymentReconciliation {
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

/** A canonical-profile field with its provenance — collect once, reuse everywhere. */
export interface ProvenanceItem {
  field: string
  value?: string
  sourceDoc: string
  confidence: Confidence
  candidateConfirmed: boolean
}

export interface WorkflowResources {
  workflowShort: string
  title: string
  items: OfficialResource[]
}

export interface NextActionView {
  workflowId: string
  type: WorkflowType
  workflowShort: string
  title: string
  description?: string
}

export interface StatusItemView {
  kind: string
  label: string
  date?: string
  daysRemaining?: number | null
  severity: RiskLevel
}

export interface WorkflowCard {
  id: string
  type: WorkflowType
  short: string
  title: string
  status: WorkflowStatus
  progress: number
  nextStep?: { title: string; owner: Owner }
}

export interface ChecklistEntry {
  workflowId: string
  workflowShort: string
  fieldId: string
  label: string
  question: string
  blocker: boolean
}

export interface MustReviewEntry {
  workflowId: string
  workflowShort: string
  label: string
  reason: string
}

export interface DeficiencyView {
  id: string
  workflowId: string
  workflowShort: string
  source: string
  classification: string
  items: string[]
  responseDraft?: string
  receivedAt: string
  /** Classified, routed, SLA'd breakdown of the notice. */
  classes: DeficiencyClass[]
  /** Days until the tightest SLA is due (negative = overdue). */
  dueInDays?: number
}

/** A proactive nudge — what the system would notify the candidate about. */
export interface ReminderItem {
  severity: RiskLevel
  title: string
  detail?: string
  date?: string
  daysRemaining?: number | null
}

/** The SSN path for the candidate's target state. We never collect the number —
 *  only whether they have one, and whether this state even requires one. */
export interface SsnPathwayView {
  state?: string
  policy: SsnPolicy
  hasSsn: boolean
  /** What the nurse must do for this state: nothing, get an SSN, get an ITIN, or sign an affidavit. */
  action: SsnAction
  /** True when the state requires obtaining an SSN — achievable via CPT work authorization. */
  requiresSsnApplication: boolean
  resources: OfficialResource[]
  privacyNote: string
}

/** A step that genuinely can't be completed from abroad — in-person fingerprinting,
 *  or an SSN-dependent item the nurse can't satisfy until work-authorized. */
export interface ArrivalGatedItem {
  workflowId: string
  workflowShort: string
  label: string
  reason: string
  kind: 'in_person' | 'ssn'
}

export interface CandidateView {
  profile: CandidateProfile
  workflows: WorkflowCard[]
  nextActions: NextActionView[]
  checklist: ChecklistEntry[]
  mustReview: MustReviewEntry[]
  deadlines: StatusItemView[]
  flags: ConsistencyFlag[]
  specialistReviewCount: number
  ledger: LedgerMilestone[]
  resources: WorkflowResources[]
  help: OfficialResource[]
  disclaimer: string
  /** F-1 visa interview prep — present when the candidate is on the F-1 journey. */
  interviewPrep?: InterviewPrep
  deficiencies: DeficiencyView[]
  reminders: ReminderItem[]
  documents: PathwayDocument[]
  /** Steps phased to "after you arrive in Los Angeles" — in-person / SSN-gated. */
  afterArrival: ArrivalGatedItem[]
  /** Whether the nurse is still abroad — drives the before/after-arrival phasing. */
  isAbroad: boolean
  /** SSN path for the target state — required vs SEVIS-ID-sufficient. */
  ssn: SsnPathwayView
  /** Consent-gated reuse of the profile across FlorenceRN products. */
  consents: ConsentState[]
  /** Provenance of the canonical profile's key fields. */
  provenance: ProvenanceItem[]
  /** One-band administrative status across every workflow domain. */
  passport: PathwayPassport
  /** The dependency graph + critical path to a U.S. RN start. */
  pathway: PathwayGraphView
  /** Transparent route recommendation — the fastest compliant licensure route. */
  routeRecommendation: RouteRecommendation
  /** Expected start, delay risk, bottleneck — SCHEDULE ONLY (no Florence economics). */
  clock: PathwayClock
  /** Radically-simple split: what the candidate does vs what Florence handles. */
  candidateActions: SimpleAction[]
  backgroundTasks: SimpleTask[]
  /** Source-country corridor playbook (doc gaps, consular timing, verification norms). */
  countryPlaybook: CountryPlaybook | null
  /** Every requirement element across the pathway — fee, official source, completion. */
  requirements: RequirementGroup[]
  /** Consular Payments V1: I-901 SEVIS fee orchestration. */
  consularPayments: ConsularPaymentsView
}

export interface QaQueueItem {
  review: QaReview
  candidateName: string
  workflowTitle: string
  workflowType: WorkflowType
  highestSeverity: RiskLevel
  flagCount: number
  missingCount: number
}

export interface ComplianceSummary {
  blocked: boolean
  requiresApplicantSignature: boolean
  requiresAttestation: boolean
  notes: string[]
  blocks: ConsistencyFlag[]
}

export interface QaDetail {
  review: QaReview
  draft: FormDraft | null
  workflow: WorkflowInstance
  candidateName: string
  compliance: ComplianceSummary
  rule: JurisdictionRule
  audit: AuditEntry[]
}

export interface AdminMetrics {
  candidates: number
  workflows: number
  byStatus: { status: WorkflowStatus; count: number }[]
  byType: { type: WorkflowType; count: number }[]
  pendingQa: number
  blocked: number
  escalations: number
  milestones: number
  bottlenecks: { label: string; count: number }[]
  funnel: { stage: string; count: number }[]
  recentLedger: LedgerMilestone[]
  /** INTERNAL production economics (Control Tower) — never sent to candidates. */
  productionValue: {
    inFlightStarts: number
    /** 24-month recurring cohort value of in-flight starts. */
    cohortValueInFlight: number
    /** Monthly subscription value deferred by candidates currently behind schedule. */
    revenueAtRiskMonthly: number
    /** In-flight starts expected within the next 90 days. */
    expectedStartsNext90d: number
    monthlySubscription: number
  }
  /** Regulatory-source freshness governance — owner, last-verified, staleness per rule. */
  ruleFreshness: {
    type: WorkflowType
    title: string
    owner: string
    lastVerified: string
    nextReview: string
    confidence: string
    active: boolean
    requiresCounsel: boolean
    stale: boolean
  }[]
  /** Control Tower: the candidate production funnel (the deck's proof counts). */
  productionCounts: { stage: string; count: number }[]
  /** Control Tower: in-flight starts bucketed by expected-start month. */
  expectedStartsByMonth: { month: string; count: number }[]
  /** Staff summary for Consular Payments. Detailed queues come from /v1/consular/payments/dashboard. */
  consularPayments: {
    totalOrders: number
    awaitingAttestation: number
    receiptQaNeeded: number
    completed: number
    blockedOrCorrection: number
    studentsBlockedByMissingPayment: number
  }
}

export interface CandidateSummary {
  id: string
  name: string
  nationality: string
  visaTarget?: string
  nclexState?: string
  workflowCount: number
  blockedCount: number
  escalations: number
}
