// Candidate session context: bootstraps from a stored token, exposes sign-in /
// sign-up / sign-out and the learner's readiness snapshot. When no API is
// configured (apiEnabled === false), it stays in "anonymous" and the app runs
// exactly as the static build - persistence is purely additive.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as auth from "./academyAuth";
import type { CandidateProfile, ReadinessSnapshot, SignupInput } from "./academyAuth";

export type SessionStatus = "loading" | "anonymous" | "authenticated";

export interface CandidateState {
  status: SessionStatus;
  candidate: CandidateProfile | null;
  readiness: ReadinessSnapshot | null;
  apiEnabled: boolean;
  signup: (input: SignupInput) => Promise<CandidateProfile>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshReadiness: () => Promise<void>;
  /** Re-fetch the signed-in candidate (e.g. after email verification). */
  reloadCandidate: () => Promise<void>;
}

const Ctx = createContext<CandidateState | null>(null);

export function CandidateProvider({ children }: { children: ReactNode }) {
  const apiEnabled = auth.isApiConfigured();
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [readiness, setReadiness] = useState<ReadinessSnapshot | null>(null);
  const [status, setStatus] = useState<SessionStatus>(apiEnabled ? "loading" : "anonymous");

  const loadReadiness = useCallback(async (candidateId: string) => {
    try {
      setReadiness(await auth.fetchReadiness(candidateId));
    } catch {
      /* readiness is best-effort; never block the UI on it */
    }
  }, []);

  // Bootstrap: validate any stored token against /v1/me.
  useEffect(() => {
    if (!apiEnabled) {
      setStatus("anonymous");
      return;
    }
    if (!auth.storedToken()) {
      setStatus("anonymous");
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const me = await auth.fetchMe();
        if (!alive) return;
        setCandidate(me);
        setStatus("authenticated");
        void loadReadiness(me.id);
      } catch {
        if (!alive) return;
        auth.clearSession();
        setStatus("anonymous");
      }
    })();
    return () => {
      alive = false;
    };
  }, [apiEnabled, loadReadiness]);

  const afterAuth = useCallback(
    (c: CandidateProfile) => {
      setCandidate(c);
      setStatus("authenticated");
      void loadReadiness(c.id);
    },
    [loadReadiness],
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      const c = await auth.signup(input);
      afterAuth(c);
      return c;
    },
    [afterAuth],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      afterAuth(await auth.login(email, password));
    },
    [afterAuth],
  );

  const logout = useCallback(async () => {
    await auth.logout();
    setCandidate(null);
    setReadiness(null);
    setStatus("anonymous");
  }, []);

  const refreshReadiness = useCallback(async () => {
    if (candidate) await loadReadiness(candidate.id);
  }, [candidate, loadReadiness]);

  const reloadCandidate = useCallback(async () => {
    try {
      setCandidate(await auth.fetchMe());
    } catch {
      /* keep the current candidate if the refresh fails */
    }
  }, []);

  return (
    <Ctx.Provider
      value={{
        status,
        candidate,
        readiness,
        apiEnabled,
        signup,
        login,
        logout,
        refreshReadiness,
        reloadCandidate,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCandidate(): CandidateState {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCandidate must be used within CandidateProvider");
  return c;
}
