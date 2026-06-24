// ============================================================================
// Auth — FlorenceRN Core SSO. Replaces the local HS256 JWT + in-memory user
// store. The middleware CONTRACT is unchanged (requireAuth / requireRole /
// scopeEmployerId / currentUser), so routes.ts keeps working apart from dropping
// the removed local-login helpers. Identity comes from Core's RS256 token
// (shared cookie OR Bearer), verified via JWKS in ./coreAuth.
//
// Role mapping: Core super_admin|ops → 'ops' (full access); Core employer →
// 'employer' (read-only, scoped to its org_id, which must equal the ATS
// employerId — provisioned in the Core admin console).
// ============================================================================
import type { Request, Response, NextFunction } from 'express'
import { principalFromRequest, atsRole, type CorePrincipal } from './coreAuth'

export type Role = 'ops' | 'employer'
export interface AuthUser { username: string; role: Role; employerId?: string }

function toAuthUser(p: CorePrincipal): AuthUser | null {
  const role = atsRole(p)
  if (!role) return null
  const user: AuthUser = { username: p.email ?? p.userId, role }
  if (role === 'employer') {
    if (!p.orgId) return null
    user.employerId = p.orgId
  }
  return user
}

export function currentUser(req: Request): AuthUser | undefined {
  return (req as Request & { user?: AuthUser }).user
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  principalFromRequest(req)
    .then((p) => {
      const user = p ? toAuthUser(p) : null
      if (!user) {
        res.status(401).json({ error: 'Sign in required.' })
        return
      }
      ;(req as Request & { user?: AuthUser }).user = user
      next()
    })
    .catch(() => res.status(401).json({ error: 'Authentication failed.' }))
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = currentUser(req)
    if (!user || !roles.includes(user.role)) return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}.` })
    next()
  }
}

/** Returns the employerId an employer-role user is scoped to, else undefined (ops sees all). */
export function scopeEmployerId(req: Request): string | undefined {
  const u = currentUser(req)
  return u?.role === 'employer' ? u.employerId : undefined
}
