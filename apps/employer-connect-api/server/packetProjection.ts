import { getCorePassportView, passportEnabled } from './passport'
import type { ApplicationPacket, FlorenceCandidate } from '../shared/types'

const coreEmployerProjectionRequired = process.env.CORE_EMPLOYER_PROJECTION_REQUIRED === '1' || process.env.NODE_ENV === 'production'

type CorePassportView = {
  passport?: Record<string, unknown>
  withheld?: { field?: unknown; reason?: unknown }[]
}

function asText(value: unknown): string | undefined {
  if (value == null) return undefined
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean).join(', ')
  const text = String(value)
  return text.trim() ? text : undefined
}

function field(passport: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = asText(passport[key])
    if (value) return value
  }
  return undefined
}

function mergeWithheld(packet: ApplicationPacket, core: CorePassportView): ApplicationPacket['withheldFields'] {
  const seen = new Set<string>()
  const rows = [...packet.withheldFields]
  for (const row of rows) seen.add(row.field)
  for (const row of core.withheld ?? []) {
    const fieldName = asText(row.field)
    if (!fieldName || seen.has(fieldName)) continue
    rows.push({ field: fieldName, reason: asText(row.reason) ?? 'Withheld by Core employer projection' })
    seen.add(fieldName)
  }
  return rows
}

export async function applyCoreEmployerProjection(packet: ApplicationPacket, candidate: FlorenceCandidate): Promise<ApplicationPacket> {
  if (!passportEnabled) {
    if (coreEmployerProjectionRequired) throw new Error('Core employer packet projection credentials are required.')
    return packet
  }
  const core = await getCorePassportView({ ref: `ats:${candidate.sourceCandidateId ?? candidate.id}`, ...(candidate.email ? { email: candidate.email } : {}) }, 'employer') as CorePassportView | null
  if (!core?.passport) throw new Error('Core employer packet projection unavailable.')
  const passport = core.passport
  const sharedFields: Record<string, string> = {
    readiness_band: field(passport, 'readinessBand', 'readiness_band') ?? packet.sharedFields.readiness_band ?? 'unknown',
    nclex_status: field(passport, 'nclexStatus', 'nclex_status') ?? packet.sharedFields.nclex_status ?? 'unknown',
    license_status: field(passport, 'licenseStatus', 'license_status') ?? packet.sharedFields.license_status ?? 'unknown',
    license_state_target: field(passport, 'licenseStateTarget', 'license_state_target', 'targetStates') ?? packet.sharedFields.license_state_target ?? 'unknown',
    specialty: field(passport, 'specialtyExperience', 'specialty') ?? packet.sharedFields.specialty ?? 'unknown',
    years_experience: field(passport, 'yearsExperience', 'years_experience') ?? packet.sharedFields.years_experience ?? 'unknown',
    expected_start_window: field(passport, 'expectedStartWindow', 'expected_start_window') ?? packet.sharedFields.expected_start_window ?? 'unknown',
  }
  const serialized = JSON.stringify(sharedFields)
  if (/passport|ds[-_]?160|sevis|visa|nationality|financ|underwrit|credit|loan/i.test(serialized)) {
    throw new Error('Core employer packet projection included restricted fields.')
  }
  return {
    ...packet,
    sharedFields,
    withheldFields: mergeWithheld(packet, core),
  }
}
