import { store, getDossier } from './db'
import type {
  CandidateView, QaQueueItem, QaDetail, AdminMetrics, CandidateSummary, WorkflowCard,
  ChecklistEntry, MustReviewEntry, WorkflowResources, ReminderItem, ArrivalGatedItem,
} from '../shared/views'
import type { WorkflowInstance, WorkflowStatus, WorkflowType, CandidateDossier } from '../shared/types'
import type { ProvenanceItem, PathwayPassport, PassportRow, PassportBand, PathwayClock, SimpleAction, SimpleTask, RequirementGroup, RequirementItem } from '../shared/views'
import { buildPathwayGraph } from '../shared/pathway-graph'
import { recommendRoute } from '../shared/route-recommender'
import { getCountryPlaybook } from '../shared/country-playbooks'
import { classifyDeficiency, deficiencySla } from '../shared/deficiency-engine'
import { RULE_FRESHNESS, isStale } from '../shared/freshness'
import { today, daysBetween, daysUntil } from './agents/util'

/** Monthly recurring subscription value of a started RN (24-month cohort). */
const MONTHLY_SUBSCRIPTION = 1349
import { WORKFLOW_META, STATUS_META } from '../shared/constants'
import { getRule } from '../shared/rules'
import { LEGAL_HELP, DISCLAIMER } from '../shared/help'
import { consentStates, canShare } from '../shared/consent'
import { getSsnPolicy, ssnAction, ssnResources, SSN_PRIVACY_NOTE } from '../shared/ssn-policy'
import { F1_INTERVIEW_PREP } from '../shared/interview-prep'
import { extractFacts } from './agents/dataExtraction'
import { checkConsistency, highestSeverity } from './agents/consistency'
import { findMissing } from './agents/missingData'
import { complianceCheck, flagBlocks } from './agents/compliance'
import { nextActions } from './agents/workflow'
import { deadlines } from './agents/status'

function cardFor(w: WorkflowInstance): WorkflowCard {
  const done = w.steps.filter((s) => s.status === 'done').length
  const progress = w.steps.length ? done / w.steps.length : 0
  const next = w.steps.find((s) => s.status !== 'done')
  return {
    id: w.id, type: w.type, short: WORKFLOW_META[w.type].short, title: w.title,
    status: w.status, progress,
    nextStep: next ? { title: next.title, owner: next.owner } : undefined,
  }
}

// Provenance of the canonical profile's key fields, derived from the verified
// dossier. This is the "collect once, reuse everywhere" surface — every downstream
// packet (visa, licensure, financing, employer) draws from these same fields.
function deriveProvenance(d: CandidateDossier): ProvenanceItem[] {
  const items: ProvenanceItem[] = []
  const id0 = d.identityDocuments[0]
  if (id0) {
    items.push({ field: 'Legal name', value: id0.nameOnDocument, sourceDoc: 'Passport', confidence: id0.confidence, candidateConfirmed: true })
    if (id0.documentNumber) items.push({ field: 'Passport number', value: id0.documentNumber, sourceDoc: 'Passport scan', confidence: id0.confidence, candidateConfirmed: true })
    if (id0.dateOfBirth) items.push({ field: 'Date of birth', value: id0.dateOfBirth, sourceDoc: 'Passport', confidence: id0.confidence, candidateConfirmed: true })
  }
  const edu0 = d.education[0]
  if (edu0) items.push({ field: 'Nursing education', value: edu0.school, sourceDoc: 'Transcript', confidence: 'high', candidateConfirmed: true })
  const lic = d.licenses.find((l) => l.kind === 'home_country') ?? d.licenses[0]
  if (lic?.licenseNumber) items.push({ field: 'Home-country RN license', value: lic.licenseNumber, sourceDoc: 'License verification', confidence: 'high', candidateConfirmed: true })
  const eng = d.englishExams[0]
  if (eng) items.push({ field: 'English exam', value: `${eng.exam}${eng.overall ? ` ${eng.overall}` : ''}`, sourceDoc: 'Score report', confidence: 'high', candidateConfirmed: true })
  return items
}

const BAND_LABEL: Record<PassportBand, string> = {
  not_started: 'Not started',
  building: 'Pathway building',
  qa_needed: 'QA needed',
  candidate_action: 'Candidate action needed',
  start_ready: 'Start-ready',
}

function rowBandFor(status: WorkflowStatus): PassportBand {
  if (status === 'completed' || status === 'submitted') return 'start_ready'
  if (status === 'needs_human_qa') return 'qa_needed'
  if (status === 'deficiency_received' || status === 'needs_candidate_data' || status === 'needs_document' || status === 'sent_to_candidate') return 'candidate_action'
  return 'building' // drafted, qa_approved, candidate_signed, blocked, resolved
}

// The Pathway Passport: roll every workflow domain into one administrative status band.
function buildPassport(d: CandidateDossier, deficiencyCount: number, candidateActionCount: number): PathwayPassport {
  const rows: PassportRow[] = d.workflows.map((w) => {
    const next = w.steps.find((s) => s.status !== 'done')
    const done = w.steps.filter((s) => s.status === 'done').length
    return {
      label: WORKFLOW_META[w.type].short,
      statusLabel: STATUS_META[w.status].label,
      progress: w.steps.length ? done / w.steps.length : 0,
      owner: next?.owner,
      band: rowBandFor(w.status),
    }
  })
  const doneCount = rows.filter((r) => r.band === 'start_ready').length
  const anyCandidate = candidateActionCount > 0 || deficiencyCount > 0 || rows.some((r) => r.band === 'candidate_action')
  const anyQa = rows.some((r) => r.band === 'qa_needed')
  let band: PassportBand
  if (rows.length === 0) band = 'not_started'
  else if (rows.every((r) => r.band === 'start_ready')) band = 'start_ready'
  else if (anyCandidate) band = 'candidate_action'
  else if (anyQa) band = 'qa_needed'
  else band = 'building'
  return { band, bandLabel: BAND_LABEL[band], summary: `${doneCount} of ${rows.length} workflows complete`, rows }
}

export function assembleCandidateView(candidateId: string): CandidateView | null {
  const d = getDossier(candidateId)
  if (!d) return null
  const facts = extractFacts(d)
  const flags = checkConsistency(d, facts)
  const checklist: ChecklistEntry[] = []
  const mustReview: MustReviewEntry[] = []

  // Phase the journey around U.S. arrival: F-1 nurses can't do in-person Live Scan
  // fingerprinting until they land, and can't satisfy SSN-dependent items until
  // they're work-authorized. Pull those out of the "do now" list so the candidate
  // isn't blocked on something they physically cannot complete from abroad.
  const isAbroad = (d.profile.arrivalStatus ?? 'abroad') === 'abroad'
  const hasSsn = d.profile.hasSsn ?? false
  const afterArrival: ArrivalGatedItem[] = []
  const gated = new Set<string>() // `${workflowId}:${fieldId}` currently blocked by arrival/SSN
  for (const w of d.workflows) {
    const draft = store.formDrafts.byWorkflow(w.id)
    if (!draft) continue
    for (const a of draft.sections.flatMap((s) => s.answers)) {
      if (a.value != null && a.value !== '') continue
      if (a.afterArrival && isAbroad) {
        gated.add(`${w.id}:${a.fieldId}`)
        afterArrival.push({ workflowId: w.id, workflowShort: WORKFLOW_META[w.type].short, label: a.label, reason: a.note || 'In-person step — done after you arrive in the U.S.', kind: 'in_person' })
      } else if (a.needsSsn && !hasSsn) {
        gated.add(`${w.id}:${a.fieldId}`)
        afterArrival.push({ workflowId: w.id, workflowShort: WORKFLOW_META[w.type].short, label: a.label, reason: a.note || 'Requires an SSN, which you’ll have once you’re work-authorized.', kind: 'ssn' })
      }
    }
  }

  for (const w of d.workflows) {
    const draft = store.formDrafts.byWorkflow(w.id)
    if (!draft) continue
    for (const m of findMissing(w.type, d, draft)) {
      // Sensitive items go to "you must personally answer/sign"; the checklist
      // surfaces the concrete blocking data we still need (the long tail of
      // optional DS-160 fields is captured in the form draft for guided completion).
      if (m.sensitive || !m.blocker) continue
      if (gated.has(`${w.id}:${m.fieldId}`)) continue // phased to after-arrival
      checklist.push({ workflowId: w.id, workflowShort: WORKFLOW_META[w.type].short, fieldId: m.fieldId, label: m.label, question: m.question, blocker: m.blocker })
    }
    for (const a of draft.sections.flatMap((s) => s.answers)) {
      if (a.sensitive && !a.candidateAttested) {
        mustReview.push({ workflowId: w.id, workflowShort: WORKFLOW_META[w.type].short, label: a.label, reason: 'You must review and confirm this answer yourself.' })
      }
    }
    if (w.type === 'ds160' && !['candidate_signed', 'submitted', 'completed'].includes(w.status)) {
      mustReview.push({ workflowId: w.id, workflowShort: 'DS-160', label: 'Sign your DS-160 in CEAC', reason: 'By law you must personally sign and submit your own DS-160.' })
    }
  }

  // Official resources for each distinct workflow the candidate has.
  const seenTypes = new Set<WorkflowType>()
  const resources: WorkflowResources[] = []
  for (const w of d.workflows) {
    if (seenTypes.has(w.type)) continue
    seenTypes.add(w.type)
    const rule = getRule(w.type)
    resources.push({ workflowShort: WORKFLOW_META[w.type].short, title: rule.title, items: rule.officialResources })
  }

  // Deficiencies + proactive reminders (the "what we'd nudge you about" queue).
  const dl = deadlines(d)
  const deficiencies = store.deficiencies.all().filter((x) => x.candidateId === candidateId && !x.resolvedAt).map((x) => {
    const classes = classifyDeficiency(x.items)
    const sla = deficiencySla(classes)
    const dueDate = new Date(new Date(x.receivedAt).getTime() + sla * 86_400_000).toISOString()
    return {
      id: x.id, workflowId: x.workflowId,
      workflowShort: WORKFLOW_META[store.workflows.get(x.workflowId)?.type ?? 'ds160'].short,
      source: x.source, classification: x.classification, items: x.items, responseDraft: x.responseDraft, receivedAt: x.receivedAt,
      classes, dueInDays: daysUntil(dueDate) ?? undefined,
    }
  })
  const RANK: Record<string, number> = { escalate: 4, high: 3, medium: 2, low: 1, none: 0 }
  const reminders: ReminderItem[] = []
  for (const item of dl) {
    if (item.daysRemaining != null && (item.severity === 'high' || item.severity === 'medium' || item.daysRemaining <= 45)) {
      reminders.push({
        severity: item.severity === 'none' ? 'low' : item.severity,
        title: item.label, date: item.date, daysRemaining: item.daysRemaining,
        detail: item.daysRemaining < 0 ? `${Math.abs(item.daysRemaining)} days overdue` : `${item.daysRemaining} days left`,
      })
    }
  }
  for (const def of deficiencies) reminders.push({ severity: 'high', title: `Respond to your ${def.workflowShort} deficiency`, detail: def.classification })
  reminders.sort((a, b) => (RANK[b.severity] - RANK[a.severity]) || ((a.daysRemaining ?? 999) - (b.daysRemaining ?? 999)))

  // SSN path for the target state — does this board hard-require an SSN, accept an
  // ITIN, take a no-SSN affidavit, or not need one at all? We track only the boolean.
  const ssnPolicy = getSsnPolicy(d.profile.employmentState)
  const ssnAct = ssnAction(ssnPolicy, hasSsn)
  const ssn = {
    state: d.profile.employmentState,
    policy: ssnPolicy,
    hasSsn,
    action: ssnAct,
    requiresSsnApplication: ssnAct === 'apply_ssn', // needs an SSN — obtained via CPT work authorization
    resources: ssnResources(ssnAct, ssnPolicy),
    privacyNote: SSN_PRIVACY_NOTE,
  }

  // Pathway graph + critical-path clock — the route, and what the delay is worth.
  const pathway = buildPathwayGraph(d.workflows)
  const na = nextActions(d)
  const expectedStartDate = new Date(today().getTime() + pathway.remainingDays * 86_400_000).toISOString().slice(0, 10)
  const targetStartDate = d.profile.targetStartDate
  const delayDays = targetStartDate ? (daysBetween(targetStartDate, expectedStartDate) ?? 0) : 0
  const bottleNode = pathway.nodes.find((n) => n.key === pathway.currentNodeKey)
  // Candidate-facing: schedule only. Florence economics are NEVER in this payload —
  // the nurse must never see what we charge or expect to earn. See assembleAdminMetrics
  // for the internal production-value rollup (Operations / Control Tower).
  const clock: PathwayClock = {
    expectedStartDate,
    targetStartDate,
    delayDays,
    remainingDays: pathway.remainingDays,
    bottleneck: bottleNode ? { label: bottleNode.label, reason: bottleNode.statusLabel } : undefined,
    nextAction: na[0]?.title,
  }

  // Radically-simple split: what the candidate must do vs what Florence handles.
  const candidateActions: SimpleAction[] = [
    ...checklist.map((c) => ({ title: c.label, detail: c.question, workflowShort: c.workflowShort, kind: 'provide' as const })),
    ...mustReview.map((m) => ({ title: m.label, detail: m.reason, workflowShort: m.workflowShort, kind: 'review' as const })),
    ...deficiencies.map((df) => ({ title: `Respond to your ${df.workflowShort} deficiency`, detail: df.classification, workflowShort: df.workflowShort, kind: 'deficiency' as const })),
    ...(isAbroad ? [] : afterArrival.map((a) => ({ title: a.label, detail: a.reason, workflowShort: a.workflowShort, kind: 'in_person' as const }))),
  ]
  const backgroundTasks: SimpleTask[] = []
  for (const w of d.workflows) {
    const next = w.steps.find((s) => s.status !== 'done')
    if (next && next.owner !== 'candidate') backgroundTasks.push({ title: next.title, workflowShort: WORKFLOW_META[w.type].short, owner: next.owner })
  }

  // Requirements ledger — every element of every workflow with its fee, official
  // source (always present), and completion status. Fee-transparent + sourced + tracked.
  const requirements: RequirementGroup[] = []
  for (const w of d.workflows) {
    const draft = store.formDrafts.byWorkflow(w.id)
    if (!draft) continue
    const rule = getRule(w.type)
    const ruleSrc = rule.officialResources[0] ?? { label: 'Find your Board of Nursing (NCSBN)', url: 'https://www.ncsbn.org/contact-bon.htm' }
    // Skip the identity-prefill section — those are profile fields (tracked via provenance);
    // the ledger is the actual requirements/steps of the process, each with a board source.
    const items: RequirementItem[] = draft.sections.filter((s) => s.key !== 'identity').flatMap((s) => s.answers).map((a) => {
      const provided = (a.value != null && a.value !== '') || !!a.candidateAttested
      const status: RequirementItem['status'] = a.reviewerApproved ? 'verified' : provided ? 'provided' : 'pending'
      return { fieldId: a.fieldId, label: a.label, detail: a.note, feeUsd: a.feeUsd, source: a.source ?? ruleSrc, status, inPerson: a.afterArrival, sensitive: a.sensitive }
    })
    if (!items.length) continue
    requirements.push({
      workflowId: w.id, workflowShort: WORKFLOW_META[w.type].short, title: rule.title, items,
      completeCount: items.filter((i) => i.status !== 'pending').length, totalCount: items.length,
      totalFeesUsd: items.reduce((sum, i) => sum + (i.feeUsd ?? 0), 0),
    })
  }

  return {
    profile: d.profile,
    workflows: d.workflows.map(cardFor),
    nextActions: na,
    checklist,
    mustReview,
    deadlines: dl,
    flags: flags.filter((f) => !f.requiresEscalation),
    specialistReviewCount: flags.filter((f) => f.requiresEscalation).length,
    ledger: store.ledger.byCandidate(candidateId),
    resources,
    help: LEGAL_HELP,
    disclaimer: DISCLAIMER,
    interviewPrep: d.workflows.some((w) => w.type === 'ds160' || w.type === 'visa_appointment' || w.type === 'sevis_i20')
      ? F1_INTERVIEW_PREP
      : undefined,
    deficiencies,
    reminders,
    documents: d.documents,
    afterArrival,
    isAbroad,
    ssn,
    consents: consentStates(d.profile),
    provenance: deriveProvenance(d),
    passport: buildPassport(d, deficiencies.length, checklist.length + mustReview.length),
    pathway,
    routeRecommendation: recommendRoute(d),
    clock,
    candidateActions,
    backgroundTasks,
    countryPlaybook: getCountryPlaybook(d.profile.citizenship),
    requirements,
  }
}

export function assembleQaQueue(): QaQueueItem[] {
  return store.qaReviews.pending().map((review) => {
    const w = store.workflows.get(review.workflowId)
    const c = store.candidates.get(review.candidateId)
    // The risk badge reflects THIS workflow: an escalation fact only counts if it
    // actually applies here (a visa refusal isn't a licensure risk).
    const wfType = w?.type ?? 'ds160'
    const relevant = review.flags.filter((f) => !f.requiresEscalation || flagBlocks(f.type, wfType))
    return {
      review,
      candidateName: c ? `${c.legalFirstName} ${c.legalLastName}` : '—',
      workflowTitle: w?.title ?? '—',
      workflowType: wfType,
      highestSeverity: highestSeverity(relevant),
      flagCount: review.flags.length,
      missingCount: review.missing.length,
    }
  })
}

export function assembleQaDetail(reviewId: string): QaDetail | null {
  const review = store.qaReviews.get(reviewId)
  if (!review) return null
  const w = store.workflows.get(review.workflowId)
  if (!w) return null
  const d = getDossier(review.candidateId)
  const draft = review.formDraftId ? store.formDrafts.get(review.formDraftId) : store.formDrafts.byWorkflow(w.id)
  const comp = d && draft ? complianceCheck(w.type, draft, d, review.flags) : null
  const c = store.candidates.get(review.candidateId)
  return {
    review,
    draft: draft ?? null,
    workflow: w,
    candidateName: c ? `${c.legalFirstName} ${c.legalLastName}` : '—',
    compliance: comp
      ? { blocked: comp.blocked, requiresApplicantSignature: comp.requiresApplicantSignature, requiresAttestation: comp.requiresAttestation, notes: comp.notes, blocks: comp.blocks }
      : { blocked: false, requiresApplicantSignature: false, requiresAttestation: false, notes: [], blocks: [] },
    rule: getRule(w.type),
    audit: store.audit.byCandidate(review.candidateId).slice(0, 20),
  }
}

const ORDER: WorkflowStatus[] = [
  'drafted', 'needs_candidate_data', 'needs_document', 'needs_human_qa',
  'qa_approved', 'sent_to_candidate', 'candidate_signed', 'submitted', 'completed',
]
function rank(status: WorkflowStatus): number {
  const i = ORDER.indexOf(status)
  if (i >= 0) return i
  if (status === 'blocked') return 3
  if (status === 'deficiency_received') return 7
  if (status === 'resolved') return 7
  return 0
}

// ── Pipeline throughput / lag metrics (Initiative 4 — start) ─────────────────
// Compression of "graduation → licensed with a job" is half the maximize-placements
// goal. These pure helpers expose the lag clock + the FEN-refresher tripwire (a
// stale-graduation flag many U.S. boards / CGFNS raise) so ops can see where time
// is being lost. Pure + testable; surfaced to the admin/candidate views as needed.
export interface PipelineLag {
  daysSinceGraduation: number | null
  monthsSinceGraduation: number | null
  daysGraduationToAtt: number | null
  daysGraduationToLicensure: number | null
  /** True when graduation is older than the refresher window (re-validation likely). */
  fenRefresherRisk: boolean
}

export function pipelineLag(
  graduationDate?: string,
  opts?: { attReceivedOn?: string; licensedOn?: string; refresherWindowYears?: number },
): PipelineLag {
  const todayIso = today().toISOString().slice(0, 10)
  const windowYears = opts?.refresherWindowYears ?? 5
  const days = graduationDate ? daysBetween(graduationDate, todayIso) : null
  return {
    daysSinceGraduation: days,
    monthsSinceGraduation: days == null ? null : Math.round(days / 30.44),
    daysGraduationToAtt: graduationDate && opts?.attReceivedOn ? daysBetween(graduationDate, opts.attReceivedOn) : null,
    daysGraduationToLicensure: graduationDate && opts?.licensedOn ? daysBetween(graduationDate, opts.licensedOn) : null,
    fenRefresherRisk: days != null && days > windowYears * 365,
  }
}

/** Lag metrics for a candidate from their earliest education record. */
export function pipelineLagForCandidate(candidateId: string): PipelineLag {
  const edu = store.education.byCandidate(candidateId)
  const grad = edu.map((e) => e.graduationDate).filter(Boolean).sort()[0]
  return pipelineLag(grad)
}

export function assembleAdminMetrics(): AdminMetrics {
  const workflows = store.workflows.all()
  const candidates = store.candidates.all()

  const byStatusMap: Partial<Record<WorkflowStatus, number>> = {}
  const byTypeMap: Record<string, number> = {}
  for (const w of workflows) {
    byStatusMap[w.status] = (byStatusMap[w.status] ?? 0) + 1
    byTypeMap[w.type] = (byTypeMap[w.type] ?? 0) + 1
  }
  const byStatus = (Object.entries(byStatusMap) as [WorkflowStatus, number][]).map(([status, count]) => ({ status, count }))
  const byType = Object.entries(byTypeMap).map(([type, count]) => ({ type: type as AdminMetrics['byType'][number]['type'], count }))

  // Internal production economics + the Control Tower production funnel — computed
  // per candidate, served ONLY to the admin surface. Never reaches a candidate payload.
  let escalations = 0
  let inFlightStarts = 0
  let cohortValueInFlight = 0
  let revenueAtRiskMonthly = 0
  let expectedStartsNext90d = 0
  const pc = { profiles: 0, qualified: 0, admitted: 0, funded: 0, i20Ready: 0, employerReady: 0, offers: 0, starts: 0 }
  const startBuckets = new Map<string, number>()
  for (const c of candidates) {
    const d = getDossier(c.id)
    if (!d) continue
    escalations += checkConsistency(d, extractFacts(d)).filter((f) => f.requiresEscalation).length
    const g = buildPathwayGraph(d.workflows)
    // Candidate production funnel (the deck's proof counts).
    pc.profiles++
    if (d.licenses.some((l) => l.kind === 'home_country') && d.englishExams.some((e) => e.passed !== false)) pc.qualified++
    if (d.schoolPrograms.length > 0) pc.admitted++
    if (d.financing.some((f) => f.loanApplied) || canShare(d.profile, 'underwriting')) pc.funded++
    if (d.schoolPrograms.some((s) => s.i20Number)) pc.i20Ready++
    if (d.employerOffers.length > 0) pc.offers++
    const licNode = g.nodes.find((n) => n.key === 'licensure')
    if (d.employerOffers.length > 0 && licNode && licNode.state !== 'locked') pc.employerReady++
    const started = g.nodes.find((n) => n.key === 'start')?.state === 'done'
    if (started) { pc.starts++; continue }
    // In-flight economics + expected-start month.
    inFlightStarts++
    cohortValueInFlight += MONTHLY_SUBSCRIPTION * 24
    const expected = new Date(today().getTime() + g.remainingDays * 86_400_000)
    const expectedIso = expected.toISOString().slice(0, 10)
    const delay = d.profile.targetStartDate ? (daysBetween(d.profile.targetStartDate, expectedIso) ?? 0) : 0
    if (delay > 0) revenueAtRiskMonthly += MONTHLY_SUBSCRIPTION
    if (g.remainingDays <= 90) expectedStartsNext90d++
    const month = expectedIso.slice(0, 7)
    startBuckets.set(month, (startBuckets.get(month) ?? 0) + 1)
  }
  const productionCounts = [
    { stage: 'Complete profiles', count: pc.profiles },
    { stage: 'Qualified', count: pc.qualified },
    { stage: 'Admitted', count: pc.admitted },
    { stage: 'Funded', count: pc.funded },
    { stage: 'I-20 ready', count: pc.i20Ready },
    { stage: 'Employer-ready', count: pc.employerReady },
    { stage: 'Contingent offers', count: pc.offers },
    { stage: 'Starts', count: pc.starts },
  ]
  const expectedStartsByMonth = [...startBuckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }))

  const ledgerAll = store.ledger.all()
  const bottleneckStatuses: WorkflowStatus[] = ['needs_candidate_data', 'needs_human_qa', 'needs_document', 'blocked', 'deficiency_received']
  const bottlenecks = byStatus
    .filter((s) => bottleneckStatuses.includes(s.status))
    .map((s) => ({ label: STATUS_META[s.status].label, count: s.count }))
    .sort((a, b) => b.count - a.count)

  const funnelStages: WorkflowStatus[] = ['drafted', 'needs_human_qa', 'qa_approved', 'candidate_signed', 'submitted', 'completed']
  const funnel = funnelStages.map((stage) => ({
    stage: STATUS_META[stage].label,
    count: workflows.filter((w) => rank(w.status) >= rank(stage)).length,
  }))

  return {
    candidates: candidates.length,
    workflows: workflows.length,
    byStatus,
    byType,
    pendingQa: store.qaReviews.pending().length,
    blocked: workflows.filter((w) => w.status === 'blocked').length,
    escalations,
    milestones: ledgerAll.length,
    bottlenecks,
    funnel,
    recentLedger: ledgerAll.slice(0, 12),
    productionValue: { inFlightStarts, cohortValueInFlight, revenueAtRiskMonthly, expectedStartsNext90d, monthlySubscription: MONTHLY_SUBSCRIPTION },
    ruleFreshness: (Object.keys(RULE_FRESHNESS) as WorkflowType[]).map((t) => {
      const f = RULE_FRESHNESS[t]
      return { type: t, title: WORKFLOW_META[t].label, owner: f.owner, lastVerified: f.lastVerified, nextReview: f.nextReview, confidence: f.confidence, active: f.active, requiresCounsel: !!f.requiresCounsel, stale: isStale(f, today()) }
    }).sort((a, b) => Number(b.stale) - Number(a.stale)),
    productionCounts,
    expectedStartsByMonth,
  }
}

export function candidateSummaries(): CandidateSummary[] {
  return store.candidates.all().map((c) => {
    const d = getDossier(c.id)!
    const fl = checkConsistency(d, extractFacts(d))
    return {
      id: c.id,
      name: `${c.legalFirstName} ${c.legalLastName}`,
      nationality: c.nationality,
      visaTarget: c.visaTarget,
      nclexState: c.nclexState,
      workflowCount: d.workflows.length,
      blockedCount: d.workflows.filter((w) => w.status === 'blocked').length,
      escalations: fl.filter((f) => f.requiresEscalation).length,
    }
  })
}
