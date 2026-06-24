import { Link } from "react-router-dom";
import { useCandidate } from "../lib/CandidateContext";
import type { ReadinessBand } from "../lib/academyAuth";

const BAND_DOT: Record<ReadinessBand, string> = {
  green: "bg-vital-ok",
  yellow: "bg-amber-400",
  orange: "bg-orange-500",
  red: "bg-vital-danger",
  none: "bg-florence-slate/40",
};

/**
 * Header affordance: "Sign in" when anonymous, or the learner's first name when
 * signed in. Renders nothing when no API is configured, so the static deploy is
 * unaffected.
 */
export default function AccountNav() {
  const { status, candidate, readiness, apiEnabled } = useCandidate();
  if (!apiEnabled) return null;

  if (status !== "authenticated" || !candidate) {
    return (
      <Link
        to="/academy/account"
        className="whitespace-nowrap rounded-lg px-2 py-1.5 font-medium text-florence-slate transition-colors hover:bg-florence-mist hover:text-florence-ink sm:px-3"
      >
        Sign in
      </Link>
    );
  }

  const first = candidate.full_name.split(" ")[0] || "Account";
  return (
    <Link
      to="/academy/account"
      className="flex items-center gap-1.5 rounded-lg border border-florence-line bg-white px-2 py-1.5 font-medium text-florence-ink transition-colors hover:bg-florence-mist sm:px-3"
      title="Your account"
    >
      {readiness && (
        <span
          className={`h-2 w-2 rounded-full ${BAND_DOT[readiness.band]}`}
          aria-hidden
        />
      )}
      <span className="max-w-[8rem] truncate">{first}</span>
    </Link>
  );
}
