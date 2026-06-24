// Emit ATS funnel milestones to the FlorenceRN Nurse Passport spine (Core).
// Fire-and-forget + mock-by-default: with no FLORENCE_CORE_CLIENT_ID/SECRET the
// app behaves exactly as before (passportEnabled=false, emits are no-ops). A
// failed emit never breaks a ledger write — the spine is an overlay, not a
// dependency.
import { createPassportClient, type NurseSelector } from './coreAuth'

const coreUrl = process.env.CORE_ISSUER_URL ?? process.env.PUBLIC_CORE_URL ?? 'http://id.lvh.me:8080'
const clientId = process.env.FLORENCE_CORE_CLIENT_ID ?? ''
const clientSecret = process.env.FLORENCE_CORE_CLIENT_SECRET ?? ''

export const passportEnabled = Boolean(clientId && clientSecret)
const client = passportEnabled ? createPassportClient({ coreUrl, clientId, clientSecret }) : null

export async function emitPassport(sel: NurseSelector, type: string, data?: Record<string, unknown>): Promise<void> {
  if (!client) return
  try {
    await client.emit(sel, type, data)
  } catch (e) {
    console.warn(`[ats-connect] passport emit ${type} failed:`, (e as Error).message)
  }
}

// Dual-write employer-share consent to Core (the canonical consent store).
// Returns true only when Core affirmatively recorded the grant; the caller is
// fail-closed (does not surface sharing as enabled unless this — or the local
// record — confirms). No-op (returns true, local-only) when the spine is off.
export async function mirrorConsentGrant(args: {
  sel: NurseSelector
  recipientOrgId: string
  recipientProgramId?: string
  allowedFields: string[]
  consentTextVersion: string
  consentTextHash: string
}): Promise<{ ok: boolean; coreConsentId?: string }> {
  if (!client) return { ok: true } // spine off → local-only, not a failure
  try {
    const r = await client.grantConsent({
      ...args.sel,
      purpose: 'employer_share',
      recipientCategory: 'employer',
      recipientOrgId: args.recipientOrgId,
      ...(args.recipientProgramId ? { recipientProgramId: args.recipientProgramId } : {}),
      allowedFields: args.allowedFields,
      consentTextVersion: args.consentTextVersion,
      consentTextHash: args.consentTextHash,
    })
    const id = (r.consent as { id?: string } | undefined)?.id
    return { ok: true, ...(id ? { coreConsentId: id } : {}) }
  } catch (e) {
    console.warn('[ats-connect] consent grant mirror failed:', (e as Error).message)
    return { ok: false }
  }
}

export async function mirrorConsentRevoke(args: { sel: NurseSelector; consentId: string }): Promise<void> {
  if (!client) return
  try {
    await client.revokeConsent({ ...args.sel, consentId: args.consentId, purpose: 'employer_share' })
  } catch (e) {
    console.warn('[ats-connect] consent revoke mirror failed:', (e as Error).message)
  }
}

/** Read the employer-redacted Passport view from Core (null if spine off or unreachable). */
export async function getEmployerView(sel: { email?: string; ref?: string }): Promise<Record<string, unknown> | null> {
  if (!client) return null
  try {
    return await client.getView(sel, 'employer', 'employer_share')
  } catch {
    return null
  }
}

// Map the ats /v1 `view` name → the Core passportView audience + access purpose.
const VIEW_TO_CORE: Record<string, { audience: string; purpose: string }> = {
  employer: { audience: 'employer', purpose: 'employer_share' },
  internal: { audience: 'internal_ops', purpose: 'internal' },
  candidate: { audience: 'self', purpose: 'self' },
}

/** Read ANY audience's redacted Passport view from Core (the canonical redactor).
 *  Returns null when the spine is off or Core is unreachable — the caller then
 *  falls back to its local projection (strangler-fig with a circuit breaker). */
export async function getCorePassportView(sel: { email?: string; ref?: string }, view: string): Promise<Record<string, unknown> | null> {
  if (!client) return null
  const m = VIEW_TO_CORE[view] ?? VIEW_TO_CORE.employer!
  try {
    return await client.getView(sel, m.audience, m.purpose)
  } catch {
    return null
  }
}
