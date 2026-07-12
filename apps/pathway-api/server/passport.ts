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
  const c = await store.candidates.get(candidateId)
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

// ── Candidate Core-account provisioning (OTP sign-in / C01 full close) ──────
// Every candidate gets a Core user whose `cand` claim equals their Pathway
// candidate id — the binding PATHWAY_REQUIRE_AUTH enforces. Same mock-by-default
// posture as the spine: no client creds → no-op, and a failed provision never
// breaks intake (the back-fill script sweeps stragglers).
let provisionToken = ''
let provisionExp = 0
async function provisionTokenGet(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (provisionToken && now < provisionExp - 30) return provisionToken
  const r = await fetch(`${coreUrl.replace(/\/$/, '')}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, scope: 'identity:provision' }),
  })
  if (!r.ok) throw new Error(`provision: token failed ${r.status}`)
  const j = (await r.json()) as { access_token: string; expires_in?: number }
  provisionToken = j.access_token
  provisionExp = now + (j.expires_in ?? 3600)
  return provisionToken
}

/** Create/link the candidate's Core sign-in account. Resolves true on success. */
export async function provisionCandidateUser(candidateId: string): Promise<boolean> {
  if (!passportEnabled) return false
  const c = await store.candidates.get(candidateId)
  if (!c?.email) return false
  try {
    const t = await provisionTokenGet()
    const r = await fetch(`${coreUrl.replace(/\/$/, '')}/v1/candidate-users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${t}` },
      body: JSON.stringify({
        email: c.email,
        name: `${c.legalFirstName} ${c.legalLastName}`.trim(),
        candidate_id: candidateId,
      }),
    })
    if (r.status === 409) {
      // Email already linked to a DIFFERENT candidate — surface loudly, never repoint.
      console.warn(`[pathway] provision conflict for candidate ${candidateId} (email linked elsewhere)`)
      return false
    }
    return r.ok
  } catch (e) {
    console.warn(`[pathway] candidate provisioning failed:`, (e as Error).message)
    return false
  }
}

/** Emit a journey event for a Pathway candidate (resolved by email + pathway ref). */
export function emitForCandidate(candidateId: string, type: string, data?: Record<string, unknown>): void {
  if (!client) return
  void (async () => {
    const c = await store.candidates.get(candidateId)
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
