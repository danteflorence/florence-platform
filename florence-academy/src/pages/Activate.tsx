import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchActivation, type ActivationLookup } from "../lib/academyAuth";

/**
 * Partner activation landing - what a Dean of Nursing sees when they scan
 * the QR or type the code from their postcard / letter.
 *
 * Confirms the offer they read on paper, lets them request a follow-up
 * contact, and (eventually, once approved by ops) drops them into the
 * partner dashboard signup.
 *
 * Public route. The code is the only auth.
 */
export default function Activate() {
  const [search] = useSearchParams();
  const code = search.get("code")?.trim().toUpperCase() ?? "";
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "not_found" }
    | { kind: "ok"; data: ActivationLookup }
    | { kind: "needs_code" }
  >(code ? { kind: "loading" } : { kind: "needs_code" });

  useEffect(() => {
    if (!code) return;
    void (async () => {
      const data = await fetchActivation(code);
      setState(data ? { kind: "ok", data } : { kind: "not_found" });
    })();
  }, [code]);

  return (
    <div className="min-h-screen bg-white text-florence-ink">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
        {state.kind === "loading" && (
          <p className="animate-pulse text-sm text-florence-slate">Checking your code…</p>
        )}
        {state.kind === "needs_code" && <NeedCode />}
        {state.kind === "not_found" && <NotFound code={code} />}
        {state.kind === "ok" && <OfferPanel data={state.data} />}
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-florence-line/70">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-florence-gradient text-sm font-bold text-white">
            F
          </span>
          <span className="whitespace-nowrap font-serif text-base font-semibold sm:text-lg">
            Florence Academy
          </span>
        </Link>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-florence-slate">
          Partner Activation
        </span>
      </div>
    </header>
  );
}

function NeedCode() {
  return (
    <div className="rounded-2xl border border-florence-line bg-white p-6 sm:p-8">
      <p className="fl-eyebrow">Partner activation</p>
      <h1 className="mt-2 font-serif text-2xl font-semibold">Enter your code.</h1>
      <p className="mt-2 text-sm text-florence-slate">
        Your code looks like <code className="font-mono text-florence-ink">FLOR-XXXXX</code>.
        It is printed on the postcard or letter we sent your nursing department.
      </p>
      <form
        className="mt-5 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = (e.currentTarget.elements.namedItem("code") as HTMLInputElement)?.value
            .trim()
            .toUpperCase();
          if (v) window.location.hash = `/activate?code=${encodeURIComponent(v)}`;
        }}
      >
        <input
          name="code"
          type="text"
          placeholder="FLOR-XXXXX"
          autoCapitalize="characters"
          autoComplete="off"
          className="w-48 rounded-xl border border-florence-line bg-white px-4 py-2.5 text-center font-mono uppercase tracking-[0.16em] focus:border-florence-indigo focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-xl bg-florence-indigo px-4 py-2.5 text-sm font-semibold text-white hover:bg-florence-indigo-dark"
        >
          Look up →
        </button>
      </form>
    </div>
  );
}

function NotFound({ code }: { code: string }) {
  return (
    <div className="rounded-2xl border border-florence-line bg-white p-6 sm:p-8">
      <p className="fl-eyebrow text-vital-danger">Code not recognized</p>
      <h1 className="mt-2 font-serif text-2xl font-semibold">
        We don&apos;t recognize{" "}
        <code className="font-mono text-vital-danger">{code}</code>.
      </h1>
      <p className="mt-2 text-sm text-florence-slate">
        Check for typos. Codes look like <code className="font-mono">FLOR-XXXXX</code>{" "}
        and contain only letters and digits 2-9. If you copied it from the postcard
        and it still doesn&apos;t work, write us at{" "}
        <a href="mailto:partners@florenceedu.com" className="font-semibold text-florence-indigo">
          partners@florenceedu.com
        </a>{" "}
        and we&apos;ll sort it out.
      </p>
      <div className="mt-5">
        <Link
          to="/activate"
          className="inline-block rounded-xl border border-florence-line bg-white px-4 py-2 text-sm font-semibold text-florence-ink hover:bg-florence-mist"
        >
          ← Try another code
        </Link>
      </div>
    </div>
  );
}

function OfferPanel({ data }: { data: ActivationLookup }) {
  const activated = data.status === "activated";
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-florence-teal bg-florence-teal-soft/40 p-6 sm:p-8">
        <p className="fl-eyebrow text-florence-teal-dark">
          {activated ? "Already activated" : "Welcome"}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
          {data.org_name}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-florence-ink/90">
          Thanks for opening this. We sent your nursing department a Florence Academy
          partner postcard with code <code className="font-mono">{data.code}</code>.
          Here is exactly what you get.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <Block
          eyebrow="For your alumni"
          headline={`${data.offer.alumni_discount_pct} percent off the seat deposit`}
        >
          Alumni of {data.org_name} pay ${data.offer.preferred_deposit_usd} instead of
          ${data.offer.standard_deposit_usd} to reserve a seat in the live cohort. Same
          bootcamp, same instructors, same outcomes track. Lower price, because we
          trust your credential.
        </Block>
        <Block eyebrow="For your nursing department" headline="Anonymized alumni dashboard">
          See how your alumni perform in our program. Readiness trend, NCLEX pass rate,
          peer comparison to other schools in the partner network. K-anonymized at 10
          students minimum so no single learner is identifiable.
        </Block>
      </section>

      <section className="rounded-2xl border border-florence-line bg-white p-6">
        <p className="fl-eyebrow text-florence-indigo-dark">Coming next</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {data.offer.coming_next.map((s) => (
            <li key={s} className="flex gap-2 text-sm text-florence-ink/90">
              <span className="mt-0.5 text-florence-indigo">→</span>
              {s}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-florence-slate">
          Partner schools get first access when these ship.
        </p>
      </section>

      <section className="rounded-2xl border border-florence-line bg-white p-6 sm:p-8">
        <h2 className="font-serif text-xl font-semibold">What happens next</h2>
        <ol className="mt-3 space-y-2 text-sm">
          <li className="flex gap-3">
            <span className="font-mono font-semibold text-florence-teal-dark">01</span>
            <span>
              <strong className="font-semibold">Confirm you are who we addressed this to.</strong>{" "}
              We send the postcard to the Dean of Nursing or alumni affairs office.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono font-semibold text-florence-teal-dark">02</span>
            <span>
              <strong className="font-semibold">We open the alumni dashboard for your school.</strong>{" "}
              You get a partner-access link by email within 48 hours.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono font-semibold text-florence-teal-dark">03</span>
            <span>
              <strong className="font-semibold">Your alumni see the 25 percent rate</strong>{" "}
              the next time they sign up on{" "}
              <a href="#/" className="font-semibold text-florence-indigo">
                florenceedu.com
              </a>{" "}
              and pick {data.org_name} as their school.
            </span>
          </li>
        </ol>
        {!activated && (
          <div className="mt-6 rounded-xl border border-florence-line bg-florence-mist/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-florence-slate">
              Activate the partnership
            </p>
            <form
              className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                const f = e.currentTarget.elements;
                const name = (f.namedItem("name") as HTMLInputElement)?.value.trim();
                const email = (f.namedItem("email") as HTMLInputElement)?.value.trim();
                if (!name || !email) return;
                window.location.href = `mailto:partners@florenceedu.com?subject=${encodeURIComponent(
                  `Activate ${data.org_name} (${data.code})`,
                )}&body=${encodeURIComponent(
                  `Hi Florence Academy team,\n\nI'd like to activate the partnership for ${data.org_name}.\n\nCode: ${data.code}\nName: ${name}\nEmail: ${email}\n\nPlease send the partner-access link.\n\nThanks,\n${name}`,
                )}`;
              }}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  name="name"
                  type="text"
                  placeholder="Your name"
                  required
                  className="rounded-lg border border-florence-line bg-white px-3 py-2 text-sm"
                />
                <input
                  name="email"
                  type="email"
                  placeholder="your.work@email"
                  required
                  className="rounded-lg border border-florence-line bg-white px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-florence-indigo px-4 py-2 text-sm font-semibold text-white hover:bg-florence-indigo-dark"
              >
                Activate {data.org_name} →
              </button>
            </form>
            <p className="mt-2 text-[11px] text-florence-slate">
              Sends an email to partners@florenceedu.com so a human at Florence can confirm and
              open the dashboard for you. We do this manually for the first batch on purpose.
            </p>
          </div>
        )}
        {activated && (
          <div className="mt-6 rounded-xl border border-florence-teal bg-florence-teal-soft/40 p-4 text-sm text-florence-teal-dark">
            This partnership is already activated. Your alumni see the 25 percent rate on
            signup. If you need the dashboard link resent, write us at{" "}
            <a href="mailto:partners@florenceedu.com" className="font-semibold">
              partners@florenceedu.com
            </a>
            .
          </div>
        )}
      </section>
    </div>
  );
}

function Block({
  eyebrow,
  headline,
  children,
}: {
  eyebrow: string;
  headline: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-florence-line bg-white p-6">
      <p className="fl-eyebrow text-florence-teal-dark">{eyebrow}</p>
      <h3 className="mt-1.5 text-lg font-semibold text-florence-ink">{headline}</h3>
      <p className="mt-2 text-sm leading-relaxed text-florence-slate">{children}</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-florence-line">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-8 text-xs text-florence-slate sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>Florence Academy - NCLEX-RN preparation for internationally educated nurses.</p>
        <Link to="/" className="hover:text-florence-ink">
          ← florenceedu.com
        </Link>
      </div>
    </footer>
  );
}
