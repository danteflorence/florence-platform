import { useState, useEffect } from 'react'
import { getSession, onStaffChange, refreshSession, type Session } from '../api'

/** Reactive Core-SSO session (role + employerId + staff). Refreshes on mount. */
export function useSession(): Session {
  const [s, setS] = useState<Session>(getSession())
  useEffect(() => {
    const off = onStaffChange(() => setS(getSession()))
    void refreshSession()
    return off
  }, [])
  return s
}
