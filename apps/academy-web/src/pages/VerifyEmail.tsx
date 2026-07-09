import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../lib/academyAuth";
import { useCandidate } from "../lib/CandidateContext";

/** Landing page for the verification link in the email. Verifies the token on
 * mount, refreshes the signed-in candidate, and reports success/failure. */
export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { reloadCandidate } = useCandidate();
  const [state, setState] = useState<"verifying" | "ok" | "fail">("verifying");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void (async () => {
      if (!token) {
        setState("fail");
        return;
      }
      const ok = await verifyEmail(token);
      setState(ok ? "ok" : "fail");
      if (ok) void reloadCandidate();
    })();
  }, [token, reloadCandidate]);

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-5 text-center">
      <div>
        {state === "verifying" && (
          <p className="animate-pulse text-sm font-medium text-florence-slate">Verifying your email…</p>
        )}
        {state === "ok" && (
          <>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-vital-ok/15 text-2xl text-vital-ok">
              ✓
            </div>
            <h1 className="mt-3 text-2xl font-semibold">Email verified</h1>
            <p className="mt-1 text-sm text-florence-slate">Thanks - your email is confirmed.</p>
            <Link
              to="/academy/account"
              className="mt-5 inline-block rounded-xl bg-florence-indigo px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-florence-indigo-dark"
            >
              Go to your account
            </Link>
          </>
        )}
        {state === "fail" && (
          <>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-vital-danger/15 text-2xl text-vital-danger">
              !
            </div>
            <h1 className="mt-3 text-2xl font-semibold">Link invalid or expired</h1>
            <p className="mt-1 text-sm text-florence-slate">
              Request a fresh verification email from your account.
            </p>
            <Link
              to="/academy/account"
              className="mt-5 inline-block rounded-xl border border-florence-line bg-white px-5 py-2.5 text-sm font-semibold text-florence-ink hover:bg-florence-mist"
            >
              Go to your account
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
