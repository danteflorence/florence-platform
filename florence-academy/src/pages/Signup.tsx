import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useCandidate } from "../lib/CandidateContext";
import {
  ApiError,
  attestAffiliation,
  fetchCohortsPublic,
  fetchSchoolsPublic,
  startSponsoredAccessCheckout,
  type PublicCohort,
  type PublicSchool,
} from "../lib/academyAuth";

/**
 * Public signup conversion route - the path from the marketing landing to a
 * sponsored Global Live access, in one screen.
 *
 * Query params, pre-selected by the landing CTAs:
 *   ?cohort=MNL-2026-07   - pre-select a cohort card
 *   ?school=FLR-PH-UST    - pre-select the user's school
 *
 * Flow on submit:
 *   1. signup → returns a candidate-bound session token
 *   2. attestAffiliation(...) (only if a school was selected)
 *   3. startSponsoredAccessCheckout() redirects to hosted processor
 *
 * Each step has independent failure handling - auth succeeds even if the
 * checkout redirect fails, so the student can retry from their account page.
 */
export default function Signup() {
  const { status, signup: doSignup } = useCandidate();
  const [search] = useSearchParams();
  const cohortParam = search.get("cohort");
  const schoolParam = search.get("school");

  // Already logged in? Skip the form, go to the account page (which is where
  // any in-progress checkout or cohort selection happens once you're signed in).
  if (status === "authenticated") return <Navigate to="/academy/account" replace />;

  return (
    <div className="min-h-screen bg-florence-mist/40 text-florence-ink">
      <Header />
      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:gap-10 sm:px-8 sm:py-12 lg:grid-cols-[1fr_1.1fr] lg:py-16">
        <SidebarBrief cohortCode={cohortParam} schoolSlug={schoolParam} />
        <SignupForm
          doSignup={doSignup}
          preselectedCohort={cohortParam}
          preselectedSchool={schoolParam}
        />
      </main>
    </div>
  );
}

// ── Header ──────────────────────────────────────────────────────────────────
function Header() {
  return (
    <header className="border-b border-florence-line bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-florence-gradient text-sm font-bold text-white">
            F
          </span>
          <span className="whitespace-nowrap font-serif text-base font-semibold sm:text-lg">
            Florence Academy
          </span>
        </Link>
        <Link
          to="/academy/account"
          className="whitespace-nowrap text-sm font-medium text-florence-slate hover:text-florence-ink"
        >
          <span className="hidden sm:inline">Already have an account? </span>
          Sign in →
        </Link>
      </div>
    </header>
  );
}

// ── Left column: what you're signing up for ─────────────────────────────────
function SidebarBrief({
  cohortCode,
  schoolSlug,
}: {
  cohortCode: string | null;
  schoolSlug: string | null;
}) {
  const [cohort, setCohort] = useState<PublicCohort | null | undefined>(undefined);
  const [school, setSchool] = useState<PublicSchool | null | undefined>(undefined);

  useEffect(() => {
    if (!cohortCode) {
      setCohort(null);
      return;
    }
    fetchCohortsPublic().then((all) => setCohort(all.find((c) => c.code === cohortCode) ?? null));
  }, [cohortCode]);

  useEffect(() => {
    if (!schoolSlug) {
      setSchool(null);
      return;
    }
    fetchSchoolsPublic().then((all) => setSchool(all.find((s) => s.slug === schoolSlug) ?? null));
  }, [schoolSlug]);

  return (
    <aside>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-florence-slate">Sponsored live access</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
        Create your account, then start Global Live NCLEX Access.
      </h1>

      <div className="mt-8 space-y-4 rounded-2xl border border-florence-line bg-white p-6">
        <Row label="Cohort">
          {cohort === undefined && cohortCode ? (
            <span className="text-florence-slate">Loading cohort…</span>
          ) : cohort ? (
            <>
              <span className="font-semibold text-florence-ink">{cohort.name}</span>
              <span className="block text-xs text-florence-slate">
                Code {cohort.code}
                {cohort.seats_remaining !== null
                  ? ` · ${cohort.seats_remaining} seats left`
                  : ""}
              </span>
            </>
          ) : (
            <span className="text-florence-slate">
              Choose a cohort after signup - schedule lives on the{" "}
              <Link to="/#cohorts" className="font-semibold text-florence-teal-dark">
                landing page
              </Link>
              .
            </span>
          )}
        </Row>
        <Row label="School">
          {school === undefined && schoolSlug ? (
            <span className="text-florence-slate">Loading…</span>
          ) : school ? (
            <>
              <span className="font-semibold text-florence-ink">{school.name}</span>
              <span className="block text-xs text-florence-slate">
                {school.city ? `${school.city} · ` : ""}
                {school.country}
              </span>
            </>
          ) : (
            <span className="text-florence-slate">
              Not selected - you can add it later from your account.
            </span>
          )}
        </Row>
        <Row label="Access">
          <span className="font-semibold text-florence-ink">$100</span>
          <span className="block text-xs text-florence-slate">
            $200 value with $100 university sponsorship.
          </span>
        </Row>
      </div>

      <ul className="mt-6 space-y-2 text-sm text-florence-slate">
        <li className="flex gap-2">
          <span className="mt-0.5 text-florence-teal-dark">✓</span>
          Save your progress and readiness across devices.
        </li>
        <li className="flex gap-2">
          <span className="mt-0.5 text-florence-teal-dark">✓</span>
          See exactly who has accessed your record, anytime.
        </li>
        <li className="flex gap-2">
          <span className="mt-0.5 text-florence-teal-dark">✓</span>
          Card data never touches our servers. Checkout is hosted.
        </li>
      </ul>
    </aside>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-florence-line/70 pb-3 last:border-0 last:pb-0">
      <span className="w-20 shrink-0 text-xs font-medium uppercase tracking-[0.14em] text-florence-slate">
        {label}
      </span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

// ── Right column: the form ──────────────────────────────────────────────────
function SignupForm({
  doSignup,
  preselectedCohort,
  preselectedSchool,
}: {
  doSignup: (input: {
    full_name: string;
    email: string;
    password: string;
    country?: string;
  }) => Promise<unknown>;
  preselectedCohort: string | null;
  preselectedSchool: string | null;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"form" | "redirecting">("form");

  const valid = useMemo(
    () => fullName.trim().length >= 2 && email.includes("@") && password.length >= 8,
    [fullName, email, password],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      // 1. Create account + receive candidate-bound session token.
      const cand = (await doSignup({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        country: country.trim() || undefined,
      })) as { id: string };

      // 2. Best-effort affiliation attestation. Do not block signup if it fails.
      if (preselectedSchool) {
        try {
          await attestAffiliation(cand.id, preselectedSchool, "student");
        } catch {
          // swallow - non-blocking
        }
      }

      // 3. Stash the desired cohort code so the account page can join it after
      //    checkout succeeds.
      if (preselectedCohort) {
        try {
          sessionStorage.setItem("florence:pending_cohort", preselectedCohort);
        } catch {
          // private browsing - ignore
        }
      }

      // 4. Kick off hosted-processor checkout.
      setPhase("redirecting");
      const checkout = await startSponsoredAccessCheckout();
      window.location.href = checkout.checkout_url;
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong creating your account. Please try again.",
      );
      setBusy(false);
      setPhase("form");
    }
  }

  if (phase === "redirecting") {
    return (
      <div className="rounded-2xl border border-florence-line bg-white p-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-florence-slate">Hold on</p>
        <h2 className="mt-2 text-xl font-semibold">Sending you to checkout...</h2>
        <p className="mt-2 text-sm text-florence-slate">
          You&apos;ll be redirected to our hosted payment processor. If nothing
          happens in a few seconds,{" "}
          <Link to="/academy/account" className="font-semibold text-florence-teal-dark">
            open your account
          </Link>{" "}
          and start Global Live access.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-florence-line bg-white p-8">
      <h2 className="text-xl font-semibold">Create your account</h2>
      <p className="mt-1 text-sm text-florence-slate">
        Eight characters minimum on the password. Anything else is fair game.
      </p>

      <div className="mt-6 space-y-4">
        <Field label="Full name">
          <input
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="fl-input"
            placeholder="Ana Reyes"
            required
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="fl-input"
            placeholder="you@example.com"
            required
          />
        </Field>
        <Field label="Password" hint="Min 8 characters.">
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="fl-input"
            placeholder="••••••••"
            required
          />
        </Field>
        <Field label="Country" hint="Optional. Used to surface the right cohort.">
          <input
            type="text"
            autoComplete="country-name"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="fl-input"
            placeholder="Philippines"
          />
        </Field>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-vital-danger/30 bg-vital-danger/5 px-3 py-2 text-sm text-vital-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!valid || busy}
        className="mt-6 w-full rounded-xl bg-florence-indigo px-5 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark disabled:cursor-not-allowed disabled:bg-florence-slate/40"
      >
        {busy ? "Creating account..." : "Create account and continue to checkout"}
      </button>

      <p className="mt-4 text-xs text-florence-slate">
        By creating an account you agree to study, attend the cohort live, and
        be honest about your nursing credentials. We&apos;ll send a verification
        email once you sign in.
      </p>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-florence-ink">{label}</span>
      {hint && <span className="ml-2 text-xs text-florence-slate">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
