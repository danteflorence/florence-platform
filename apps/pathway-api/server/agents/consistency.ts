import type { CandidateDossier, ConsistencyFlag, FlagType, RiskLevel } from '../../shared/types'
import { FLAG_META } from '../../shared/constants'
import type { ExtractedFacts } from './dataExtraction'
import { uid, normalizeName, sameNameExact, sameNameTokens, daysUntil, daysBetween } from './util'

// Consistency Agent
// -----------------
// The deterministic core of the product's value: cross-document contradiction
// detection. The marquee check is exact name matching across passport, ID,
// board application, and Pearson — a common, expensive failure mode and pure
// logic. It also surfaces passport validity, DOB conflicts, employment gaps,
// date conflicts, and the sensitive-history facts that must escalate.

const SEVERITY_RANK: Record<RiskLevel, number> = { escalate: 4, high: 3, medium: 2, low: 1, none: 0 }

function mkFlag(type: FlagType, severity: RiskLevel, partial: Partial<ConsistencyFlag>): ConsistencyFlag {
  const escalates = FLAG_META[type].escalates || severity === 'escalate'
  return {
    id: uid(),
    type,
    severity: escalates ? 'escalate' : severity,
    message: '',
    involved: [],
    requiresEscalation: escalates,
    ...partial,
  } as ConsistencyFlag
}

export function checkConsistency(d: CandidateDossier, facts: ExtractedFacts): ConsistencyFlag[] {
  const flags: ConsistencyFlag[] = []

  // 1) NAME MATCH — the showpiece. Reference = passport name if available.
  const reference = facts.passport?.name ?? facts.profileFullName
  const refLabel = facts.passport ? 'Passport' : 'Profile'
  for (const obs of facts.names) {
    if (obs.name === reference || obs.source === refLabel) continue
    if (sameNameExact(obs.name, reference)) continue
    // Same name parts in a different field order (e.g., a passport that prints
    // surname-first vs a given-first record) is a formatting difference that
    // boards reconcile via separate first/last fields — not a real mismatch.
    // The expensive failure is when the name PARTS differ (missing/extra/
    // misspelled), so only flag those.
    if (sameNameTokens(obs.name, reference)) continue
    const critical = obs.critical
    const severity: RiskLevel = critical ? 'high' : 'medium'
    const isPearson = /pearson|nclex/i.test(obs.source)
    flags.push(
      mkFlag('name_mismatch', severity, {
        field: 'legal_name',
        message: isPearson
          ? `Pearson/NCLEX name does not match the passport — this WILL fail at the exam appointment.`
          : `${obs.source} name differs from the ${refLabel}.`,
        detail: `"${obs.name}" vs "${reference}" (${refLabel})`,
        involved: [`${refLabel}: ${reference}`, `${obs.source}: ${obs.name}`],
        suggestedAction: critical
          ? `Confirm the exact legal name and correct ${obs.source} before scheduling.`
          : `Confirm which spelling is correct and align records.`,
      }),
    )
  }

  // 2) PASSPORT VALIDITY
  const expiry = facts.passport?.expiry
  const dUntilExpiry = daysUntil(expiry)
  if (expiry && dUntilExpiry !== null) {
    if (dUntilExpiry < 0) {
      flags.push(mkFlag('passport_expired', 'high', {
        field: 'passport_expiry',
        message: `Passport expired on ${expiry}.`,
        involved: [`Passport expiry: ${expiry}`],
        suggestedAction: 'Renew the passport before any visa filing or appointment.',
      }))
    } else if (dUntilExpiry < 183) {
      flags.push(mkFlag('passport_expiring', 'medium', {
        field: 'passport_expiry',
        message: `Passport expires in ${dUntilExpiry} days (${expiry}). Many visas require ~6 months’ validity.`,
        involved: [`Passport expiry: ${expiry}`],
        suggestedAction: 'Consider renewing now to avoid blocking the visa or appointment.',
      }))
    } else if (d.profile.targetStartDate) {
      const gap = daysBetween(expiry, d.profile.targetStartDate)
      if (gap !== null && gap > -183) {
        flags.push(mkFlag('passport_expiring', 'low', {
          field: 'passport_expiry',
          message: `Passport may not retain 6 months’ validity through the target start (${d.profile.targetStartDate}).`,
          involved: [`Passport expiry: ${expiry}`, `Target start: ${d.profile.targetStartDate}`],
        }))
      }
    }
  }

  // 3) DOB MISMATCH
  const dobSet = new Set(facts.dobs.map((x) => x.dob))
  if (dobSet.size > 1) {
    flags.push(mkFlag('dob_mismatch', 'high', {
      field: 'date_of_birth',
      message: 'Date of birth is not consistent across documents.',
      involved: facts.dobs.map((x) => `${x.source}: ${x.dob}`),
      suggestedAction: 'Resolve the correct DOB from the passport and correct other records.',
    }))
  }

  // 4) EMPLOYMENT GAPS
  const emp = [...d.employment].filter((e) => e.startDate).sort((a, b) => a.startDate.localeCompare(b.startDate))
  for (let i = 1; i < emp.length; i++) {
    const prev = emp[i - 1]
    const gap = daysBetween(prev.endDate, emp[i].startDate)
    if (gap !== null && gap > 120) {
      flags.push(mkFlag('employment_gap', gap > 365 ? 'medium' : 'low', {
        field: 'employment',
        message: `~${Math.round(gap / 30)}-month employment gap between roles.`,
        involved: [`${prev.employer} ended ${prev.endDate ?? '—'}`, `${emp[i].employer} started ${emp[i].startDate}`],
        suggestedAction: 'Capture an explanation for the gap for the visa interview.',
      }))
    }
  }

  // 5) DATE CONFLICT — nursing employment predating graduation
  const firstGrad = [...d.education].map((e) => e.graduationDate).filter(Boolean).sort()[0]
  if (firstGrad) {
    for (const e of d.employment) {
      if (/nurse|rn|nursing/i.test(`${e.role} ${e.specialty ?? ''}`) && e.startDate && e.startDate < firstGrad) {
        flags.push(mkFlag('date_conflict', 'medium', {
          field: 'employment',
          message: `Nursing role at ${e.employer} appears to start (${e.startDate}) before graduation (${firstGrad}).`,
          involved: [`${e.employer}: ${e.startDate}`, `Graduation: ${firstGrad}`],
          suggestedAction: 'Verify dates — interviewers and boards flag this.',
        }))
      }
    }
  }

  // 6) SENSITIVE HISTORY — always escalate
  for (const v of d.visaHistory) {
    if (v.priorRefusal) {
      flags.push(mkFlag('prior_refusal', 'escalate', {
        message: `Prior ${v.visaType} visa refusal on record.`,
        detail: v.refusalDetail,
        involved: [`${v.visaType}: refusal`],
        suggestedAction: 'Escalate to immigration counsel before answering DS-160 refusal questions.',
      }))
    }
    if (v.priorOverstay) {
      flags.push(mkFlag('overstay', 'escalate', {
        message: 'Prior overstay / unlawful presence indicated.',
        involved: [`${v.visaType}: overstay`],
        suggestedAction: 'Escalate to immigration counsel — affects admissibility.',
      }))
    }
  }
  for (const l of d.licenses) {
    if (l.disciplinaryAction) {
      flags.push(mkFlag('license_discipline', 'escalate', {
        message: `Prior disciplinary action on the ${l.jurisdiction} license.`,
        involved: [`${l.jurisdiction} license`],
        suggestedAction: 'Escalate to a licensure specialist; boards require disclosure.',
      }))
    }
  }

  // 7) PRIOR NCLEX FAILURE
  for (const n of d.nclex) {
    if (n.priorAttempts > 0) {
      flags.push(mkFlag('prior_nclex_fail', 'medium', {
        message: `${n.priorAttempts} prior NCLEX attempt(s) recorded.`,
        involved: [`${n.nrb}: ${n.priorAttempts} attempt(s)`],
        suggestedAction: 'Gate scheduling on readiness clearance.',
      }))
    }
  }

  // 8) ENGLISH EXAM MISSING (gating for many boards / school admission)
  const hasEnglish = d.englishExams.some((x) => x.passed)
  if (!hasEnglish && (d.profile.nclexState || d.profile.employmentState)) {
    flags.push(mkFlag('english_missing', 'medium', {
      field: 'english',
      message: 'No passing English exam (IELTS/OET/TOEFL) on file — gating for licensure and school admission.',
      involved: ['English exam: none'],
      suggestedAction: 'Schedule an approved English exam early; it blocks multiple downstream steps.',
    }))
  }

  return flags.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
}

export function highestSeverity(flags: ConsistencyFlag[]): RiskLevel {
  return flags.reduce<RiskLevel>((acc, f) => (SEVERITY_RANK[f.severity] > SEVERITY_RANK[acc] ? f.severity : acc), 'none')
}
