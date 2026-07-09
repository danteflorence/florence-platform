// Verify the readiness-gate decision logic (shadow-first, override, enforce) and
// the mock-by-default behavior (spine off ⇒ gate inactive).
//
//   node verify-readiness-gate.ts   (from server/, toolchain node)

import { decideGate, validOverride, checkReadinessGate } from './readinessGate'

let pass = 0, fail = 0
const ok = (label: string, cond: boolean, extra?: string) => {
  console.log(`${cond ? '✓' : '✗'} ${label}${extra ? ` — ${extra}` : ''}`)
  cond ? (pass += 1) : (fail += 1)
}

// above standard → allowed, not shadow
ok('above standard → allowed', decideGate(0.85, { min: 0.8, enforce: true }).allowed === true)

// below standard, ENFORCE off (shadow) → allowed but wouldBlock + shadow
const shadow = decideGate(0.6, { min: 0.8, enforce: false })
ok('below standard + shadow → allowed but flagged wouldBlock', shadow.allowed === true && shadow.wouldBlock === true && shadow.shadow === true)

// below standard, ENFORCE on, no override → BLOCKED
const blocked = decideGate(0.6, { min: 0.8, enforce: true })
ok('below standard + enforce + no override → BLOCKED', blocked.allowed === false && blocked.wouldBlock === true)

// below standard, ENFORCE on, valid staff override → allowed + overridden
const overridden = decideGate(0.6, { min: 0.8, enforce: true, override: { actor: 'ops@florence', role: 'ops', reason: 'clinical judgment' } })
ok('valid staff override unblocks', overridden.allowed === true && overridden.overridden === true)

// invalid override (candidate role / empty reason) does NOT unblock
ok('candidate-role override rejected', !validOverride({ actor: 'x', role: 'candidate', reason: 'pls' }))
ok('empty-reason override rejected', !validOverride({ actor: 'x', role: 'ops', reason: '  ' }))
const notOver = decideGate(0.6, { min: 0.8, enforce: true, override: { actor: 'x', role: 'candidate', reason: 'pls' } })
ok('non-staff override does NOT unblock', notOver.allowed === false)

// mock-by-default: spine off (no Core creds in this process) → gate inactive
const live = await checkReadinessGate('cand_x')
ok('mock-by-default: spine off → gate inactive (allowed, shadow)', live.allowed === true && live.shadow === true)

console.log(`\n${fail ? 'READINESS GATE FAILED' : 'READINESS GATE PASSED'} — ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
