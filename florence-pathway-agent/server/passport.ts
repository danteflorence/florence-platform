// Emit Pathway licensure / NCLEX / visa / document milestones to the FlorenceRN
// Nurse Passport spine (Core). Fire-and-forget + mock-by-default: with no
// FLORENCE_CORE_CLIENT_ID/SECRET this is a no-op and Pathway behaves exactly as
// before. A failed emit never breaks a request — the spine is a cross-app
// overlay, not a dependency.
import { createPassportClient, type NurseSelector } from './coreAuth'
import { store } from './db'

const coreUrl = process.env.CORE_ISSUER_URL ?? process.env.PUBLIC_CORE_URL ?? 'http://id.lvh.me:8080'
const clientId = process.env.FLORENCE_CORE_CLIENT_ID ?? ''
const clientSecret = process.env.FLORENCE_CORE_CLIENT_SECRET ?? ''

export const passportEnabled = Boolean(clientId && clientSecret)
const client = passportEnabled ? createPassportClient({ coreUrl, clientId, clientSecret }) : null

/** Read the candidate's folded Passport from Core via the secured, audited view.
 *  Returns null when the spine is off (mock-by-default) or Core is unreachable. */
export async function readPassport(candidateId: string): Promise<Record<string, unknown> | null> {
  if (!client) return null
  const c = store.candidates.get(candidateId)
  const sel = { ...(c?.email ? { email: c.email } : {}), ref: `pathway:${candidateId}` }
  try {
    // internal_ops audience (full) for a trusted service token; the read is
    // policy-checked + audited in Core as a purpose-tagged passport.read.
    return await client.getView(sel, 'internal_ops', 'readiness_gate')
  } catch (e) {
    console.warn(`[pathway] passport read failed:`, (e as Error).message)
    return null
  }
}

/** Emit a journey event for a Pathway candidate (resolved by email + pathway ref). */
export function emitForCandidate(candidateId: string, type: string, data?: Record<string, unknown>): void {
  if (!client) return
  void (async () => {
    const c = store.candidates.get(candidateId)
    const sel: NurseSelector = {
      email: c?.email,
      name: c ? `${c.legalFirstName} ${c.legalLastName}`.trim() : undefined,
      ref: { app: 'pathway', externalId: candidateId },
    }
    try {
      await client!.emit(sel, type, data)
    } catch (e) {
      console.warn(`[pathway] passport emit ${type} failed:`, (e as Error).message)
    }
  })().catch(() => undefined)
}
