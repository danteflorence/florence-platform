// Hard NCLEX readiness gate (Initiative 1d) — the single highest-leverage safety
// mechanism in the pass-rate engine. The IEN first-time pass rate is ~54% and the
// RETAKE pass rate is only ~30%, so letting an under-prepared nurse sit the exam
// is catastrophic. This gate reads the candidate's readiness from the Core Nurse
// Passport (via the SECURED, audited passportView) and decides whether scheduling
// the sit is allowed.
//
// SHADOW-FIRST: until the theta→pass-probability threshold is calibrated against
// real cohort outcomes (see the cohort data asset + the strategy's calibration
// plan), the gate is ADVISORY — it computes and records the decision but does NOT
// block. Flip READINESS_GATE_ENFORCE=1 to hard-block once calibrated.
//
// MOCK-BY-DEFAULT: with the spine off (no Core creds) the gate is inactive and
// Pathway behaves exactly as before.

import { readPassport, emitForCandidate } from './passport'

const MIN = Number(process.env.READINESS_GATE_MIN ?? 0.8) // pass-probability standard
const ENFORCE = process.env.READINESS_GATE_ENFORCE === '1' // off ⇒ shadow/advisory

export interface OverrideTicket {
  actor: string
  role: string // instructor | ops | super_admin
  reason: string
}

export interface GateDecision {
  /** Whether scheduling is permitted (always true in shadow mode + when inactive). */
  allowed: boolean
  /** Whether the candidate is actually below the readiness standard. */
  wouldBlock: boolean
  /** True when the gate is computing but not enforcing (shadow) or off (spine). */
  shadow: boolean
  band?: string
  passProbability?: number
  theta?: number
  overridden: boolean
  reason: string
}

const OVERRIDE_ROLES = ['instructor', 'ops', 'super_admin']

export function validOverride(o?: OverrideTicket): boolean {
  return !!o && OVERRIDE_ROLES.includes(o.role) && o.reason.trim().length > 0
}

/** Pure gate decision from a pass probability + config. Unit-testable, no I/O. */
export function decideGate(
  passProbability: number | undefined,
  cfg: { min: number; enforce: boolean; override?: OverrideTicket; band?: string; theta?: number },
): GateDecision {
  const p = passProbability ?? 0
  const wouldBlock = p < cfg.min
  const overridden = wouldBlock && validOverride(cfg.override)
  const base = {
    wouldBlock,
    ...(cfg.band ? { band: cfg.band } : {}),
    passProbability: p,
    ...(cfg.theta != null ? { theta: cfg.theta } : {}),
  }
  if (!wouldBlock) return { ...base, allowed: true, shadow: false, overridden: false, reason: `at or above the ${Math.round(cfg.min * 100)}% readiness standard` }
  if (!cfg.enforce) return { ...base, allowed: true, shadow: true, overridden: false, reason: `below the ${Math.round(cfg.min * 100)}% standard — ADVISORY only (gate not enforcing yet)` }
  if (overridden) return { ...base, allowed: true, shadow: false, overridden: true, reason: 'below standard but overridden by staff' }
  return { ...base, allowed: false, shadow: false, overridden: false, reason: `pass probability ${Math.round(p * 100)}% is below the ${Math.round(cfg.min * 100)}% readiness standard` }
}

/**
 * Decide whether a candidate may schedule the NCLEX. Reads readiness from Core.
 * When the spine is off, the gate is inactive (allowed, shadow=true). When on
 * but not enforcing, it records the would-block decision but allows. When
 * enforcing, a sub-threshold candidate is blocked unless a valid override exists.
 */
export async function checkReadinessGate(candidateId: string, opts?: { override?: OverrideTicket }): Promise<GateDecision> {
  const passport = await readPassport(candidateId)
  if (!passport) {
    return { allowed: true, wouldBlock: false, shadow: true, overridden: false, reason: 'readiness gate inactive (spine off or unreachable)' }
  }
  const readiness = (passport['readiness'] ?? {}) as { passProbability?: number; theta?: number; band?: string }
  const decision = decideGate(readiness.passProbability, {
    min: MIN,
    enforce: ENFORCE,
    ...(opts?.override ? { override: opts.override } : {}),
    ...(readiness.band ? { band: readiness.band } : {}),
    ...(readiness.theta != null ? { theta: readiness.theta } : {}),
  })
  // Record the gate decision on the Passport (onboarding-risk input). Fire-and-forget +
  // mock-safe: emitForCandidate returns immediately when the spine is off (no throw).
  emitForCandidate(candidateId, 'pathway.readiness_gate_applied', {
    decision: decision.allowed ? 'allow' : 'block',
    wouldBlock: decision.wouldBlock,
    shadow: decision.shadow,
    ...(decision.band ? { band: decision.band } : {}),
    ...(decision.passProbability != null ? { passProbability: decision.passProbability } : {}),
    ...(decision.theta != null ? { theta: decision.theta } : {}),
  })
  return decision
}
