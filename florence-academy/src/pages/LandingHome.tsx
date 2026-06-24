import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useCandidate } from "../lib/CandidateContext";
import {
  fetchCohortsPublic,
  fetchSchoolsPublic,
  type PublicCohort,
  type PublicSchool,
} from "../lib/academyAuth";
import { SECTIONS, CLIENT_NEEDS } from "../data/blueprint";
import manifest from "../data/bankManifest.json";

/**
 * Public landing page - the front door for nurses who don't have an account yet.
 *
 * What we say here matters:
 *   - We cite only things we can prove from code (bank sizes, cohort schedule
 *     pulled from API, school list size). No pass-rate claims, no testimonials,
 *     no instructor names, no university endorsements.
 *   - We say nothing about visa, F-1, financing, FICA - those live behind auth.
 *   - We sell the product, not aspirations. The bootcamp is the bootcamp.
 *
 * Authenticated visitors are redirected to /learn - they've already bought
 * the thing, no point selling them again.
 */
export default function LandingHome() {
  const { status } = useCandidate();
  if (status === "authenticated") return <Navigate to="/learn" replace />;

  return (
    <div className="min-h-screen bg-white text-florence-ink">
      <MarketingHeader />
      <Hero />
      <ProofRow />
      <WhatYouGet />
      <HowItWorks />
      <CohortsSection />
      <DepositSection />
      <SchoolQualifier />
      <Faq />
      <MarketingFooter />
    </div>
  );
}

// ── Header ──────────────────────────────────────────────────────────────────
function MarketingHeader() {
  return (
    <header className="border-b border-florence-line/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-florence-gradient text-sm font-bold text-white">
            F
          </span>
          <span className="flex flex-col leading-none">
            <span className="whitespace-nowrap font-serif text-base font-semibold sm:text-lg">
              Florence Academy
            </span>
            {/* Mobile drops the "NCLEX-RN Bootcamp" subline - header has to
                fit the wordmark, sign-in, and reserve CTA on one row. */}
            <span className="hidden whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.16em] text-florence-slate sm:block">
              NCLEX-RN Bootcamp
            </span>
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-1 text-sm font-medium text-florence-slate">
          <a
            href="#cohorts"
            className="hidden whitespace-nowrap rounded-lg px-3 py-1.5 transition-colors hover:bg-florence-mist hover:text-florence-ink sm:block"
          >
            Cohorts
          </a>
          <a
            href="#qualifier"
            className="hidden whitespace-nowrap rounded-lg px-3 py-1.5 transition-colors hover:bg-florence-mist hover:text-florence-ink md:block"
          >
            Eligible schools
          </a>
          <a
            href="#faq"
            className="hidden whitespace-nowrap rounded-lg px-3 py-1.5 transition-colors hover:bg-florence-mist hover:text-florence-ink sm:block"
          >
            FAQ
          </a>
          <Link
            to="/academy/account"
            className="whitespace-nowrap rounded-lg px-2.5 py-1.5 transition-colors hover:bg-florence-mist hover:text-florence-ink"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="ml-1 whitespace-nowrap rounded-lg bg-florence-indigo px-3 py-1.5 text-white transition-colors hover:bg-florence-indigo-dark"
          >
            Reserve a seat
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="border-b border-florence-line/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:py-24">
        <div>
          <p className="fl-eyebrow">NCLEX-RN bootcamp · for internationally educated nurses</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
            A live cohort, an adaptive question bank, and a readiness band that
            tells you the truth.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-florence-slate sm:text-lg">
            Twenty sections taught live, in order, by an instructor who works
            with internationally educated nurses every week. Between sessions
            you train on a content-balanced bank built to the 2026 NCSBN test
            plan. We tell you where you stand - green, yellow, orange, red -
            and we don&apos;t move on until the band moves.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/signup"
              className="rounded-xl bg-florence-indigo px-5 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark"
            >
              Reserve a seat →
            </Link>
            <a
              href="#cohorts"
              className="rounded-xl border border-florence-line bg-white px-5 py-3 text-sm font-semibold text-florence-ink transition-colors hover:bg-florence-mist"
            >
              See the schedule
            </a>
            <p className="text-xs text-florence-slate">
              Deposit reserves your seat · $75 if your school is on the
              eligible list, $100 otherwise · applied to tuition.
            </p>
          </div>
        </div>

        {/* Real product preview, not a mockup. The curriculum grid is the */}
        {/* actual home page of the enrolled-student app, rendered compact. */}
        <CurriculumPreview />
      </div>
    </section>
  );
}

function CurriculumPreview() {
  // First nine sections, the visual signature of the product.
  const sample = SECTIONS.slice(0, 9);
  return (
    <div className="self-start rounded-2xl border border-florence-line bg-florence-mist/40 p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <p className="fl-eyebrow text-florence-teal-dark">Curriculum Navigator</p>
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-florence-slate">
          20 sections · taught live
        </span>
      </div>
      <ul className="mt-3 grid gap-1.5">
        {sample.map((s) => (
          <li
            key={s.n}
            className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-2 text-sm"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-florence-teal-soft text-xs font-bold text-florence-teal-dark">
              {s.n}
            </span>
            <span className="truncate text-florence-ink/90">{s.title}</span>
          </li>
        ))}
        <li className="px-1 pt-1 text-xs text-florence-slate">
          + 11 more (Cardiac, Respiratory, Endocrine, Renal &amp; GI, Neuro &amp;
          MSK, Maternity, Pediatrics, Mental Health, Infection Control,
          Management of Care, NGN Cases, Full Simulation, Targeted Review,
          Exam Day)
        </li>
      </ul>
    </div>
  );
}

// ── Proof row (real numbers, no fluff) ──────────────────────────────────────
function ProofRow() {
  const items = useMemo(() => {
    const bankTotal =
      manifest.fab + manifest.sata + manifest.bowtie + manifest.dragdrop +
      manifest.extendedMr + manifest.cases + manifest.imported;
    return [
      { value: SECTIONS.length.toString(), label: "live sections, taught in order" },
      { value: bankTotal.toLocaleString(), label: "items in the practice bank" },
      { value: manifest.cases.toString(), label: "NGN unfolding case studies" },
      { value: CLIENT_NEEDS.length.toString(), label: "client-needs categories balanced" },
    ];
  }, []);
  return (
    <section className="border-b border-florence-line/70 bg-florence-mist/40">
      <div className="mx-auto grid max-w-6xl gap-px overflow-hidden rounded-none border-x border-florence-line/70 sm:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="bg-white px-5 py-6 text-center sm:py-7">
            <p className="font-serif text-3xl font-semibold text-florence-ink">{it.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-florence-slate">
              {it.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── What you get ────────────────────────────────────────────────────────────
function WhatYouGet() {
  const cards: { title: string; body: string }[] = [
    {
      title: "Twenty sections, taught live",
      body:
        "Cardiac, Respiratory, Endocrine, Renal & GI, Neuro & MSK, Maternity, Pediatrics, Mental Health, Infection Control, Management of Care, three pharmacology blocks, lab values, NGN cases, full simulation, targeted review, exam day. In order. By someone who teaches this every week.",
    },
    {
      title: "Adaptive practice that maps to the test plan",
      body:
        "Multiple choice, select-all-that-apply, drag-and-drop, extended multiple-response, bow-tie, NGN unfolding cases. Content-balanced to the 2026 NCSBN RN plan - your nightly 150 mirrors the real mix.",
    },
    {
      title: "A readiness band that doesn't flatter you",
      body:
        "Green, yellow, orange, red. Computed from your actual performance against blueprint targets. We tell you what to work on, by category, with the lessons that target it. We tell you when you're ready.",
    },
    {
      title: "3D anatomy and bedside simulations",
      body:
        "Explorable heart and rhythm drills, a vitals monitor that reacts to your interventions, a clinical-judgment unfolding-case runner. Built for the way internationally trained nurses actually study.",
    },
  ];
  return (
    <section className="border-b border-florence-line/70">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-20">
        <p className="fl-eyebrow">What you get</p>
        <h2 className="mt-2 max-w-2xl font-serif text-3xl font-semibold sm:text-4xl">
          The whole product, not a sample chapter.
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {cards.map((c) => (
            <div key={c.title} className="rounded-2xl border border-florence-line p-6">
              <h3 className="text-lg font-semibold text-florence-ink">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-florence-slate">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How it works ────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps: { n: string; title: string; body: string }[] = [
    {
      n: "01",
      title: "Reserve a seat",
      body: "$75 if your school is on the eligible list, $100 otherwise. Applied to tuition when you enroll.",
    },
    {
      n: "02",
      title: "Show up for the live cohort",
      body: "Twenty sections in order. Attendance and live polling tracked so your instructor knows where the room is.",
    },
    {
      n: "03",
      title: "Train every night on the bank",
      body: "Content-balanced adaptive set. The CAT engine picks the right mix; you finish a session, your readiness band updates.",
    },
    {
      n: "04",
      title: "Sit for the NCLEX-RN when the band says you're ready",
      body: "Not before, not based on a calendar. When the readiness model says green, you've done the work.",
    },
  ];
  return (
    <section className="border-b border-florence-line/70 bg-florence-mist/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-20">
        <p className="fl-eyebrow">How it works</p>
        <h2 className="mt-2 max-w-2xl font-serif text-3xl font-semibold sm:text-4xl">
          Four steps. Nothing magical.
        </h2>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="rounded-2xl border border-florence-line bg-white p-6">
              <p className="font-mono text-sm font-semibold text-florence-teal-dark">{s.n}</p>
              <h3 className="mt-2 text-base font-semibold text-florence-ink">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-florence-slate">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ── Cohorts ─────────────────────────────────────────────────────────────────
function CohortsSection() {
  const [cohorts, setCohorts] = useState<PublicCohort[] | null>(null);
  useEffect(() => {
    fetchCohortsPublic().then(setCohorts);
  }, []);

  return (
    <section id="cohorts" className="border-b border-florence-line/70">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="fl-eyebrow">Upcoming cohorts</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">
              Pick a city and a month.
            </h2>
          </div>
          <p className="max-w-md text-sm text-florence-slate">
            Cohort size is capped. Seats remaining is live - when it hits zero,
            we close enrollment and open the next.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cohorts === null ? (
            <CohortSkeleton count={3} />
          ) : cohorts.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-florence-line p-8 text-center">
              <p className="text-sm text-florence-slate">
                The next cohort schedule is being finalized.
              </p>
              <Link
                to="/signup"
                className="mt-3 inline-block text-sm font-semibold text-florence-indigo hover:text-florence-indigo-dark"
              >
                Get notified →
              </Link>
            </div>
          ) : (
            cohorts.map((c) => <CohortCard key={c.code} cohort={c} />)
          )}
        </div>
      </div>
    </section>
  );
}

function CohortSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-44 animate-pulse rounded-2xl border border-florence-line bg-florence-mist/40"
        />
      ))}
    </>
  );
}

function CohortCard({ cohort }: { cohort: PublicCohort }) {
  const tight =
    cohort.seats_remaining !== null && cohort.seats_remaining > 0 && cohort.seats_remaining <= 5;
  const full = cohort.seats_remaining === 0;
  const startsLabel = cohort.starts_at ? formatCohortStart(cohort.starts_at) : null;
  return (
    <div className="flex h-full flex-col rounded-2xl border border-florence-line bg-white p-6">
      <p className="fl-eyebrow text-florence-teal-dark">{cohort.code}</p>
      <h3 className="mt-1.5 text-lg font-semibold text-florence-ink">{cohort.name}</h3>
      {startsLabel && (
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-florence-slate">
          Starts {startsLabel}
        </p>
      )}
      <p className="mt-2 text-sm text-florence-slate">
        {cohort.capacity != null && cohort.seats_remaining !== null ? (
          full ? (
            <span className="font-semibold text-vital-danger">Fully enrolled</span>
          ) : tight ? (
            <span className="font-semibold text-amber-600">
              Only {cohort.seats_remaining} of {cohort.capacity} seats left
            </span>
          ) : (
            <>
              {cohort.seats_remaining} of {cohort.capacity} seats open
            </>
          )
        ) : (
          <>Open enrollment</>
        )}
      </p>
      <div className="mt-auto pt-5">
        {full ? (
          <span className="inline-block rounded-lg border border-florence-line bg-florence-mist/50 px-4 py-2 text-sm font-semibold text-florence-slate">
            Waitlist closed
          </span>
        ) : (
          <Link
            to={`/signup?cohort=${encodeURIComponent(cohort.code)}`}
            className="inline-block rounded-lg bg-florence-indigo px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-florence-indigo-dark"
          >
            Reserve this cohort →
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Deposit explainer ───────────────────────────────────────────────────────
function DepositSection() {
  return (
    <section className="border-b border-florence-line/70 bg-florence-mist/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-8 sm:py-20 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="fl-eyebrow">The deposit</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">
            One small number, transparently explained.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-florence-slate">
            The deposit reserves your seat in a cohort and is applied to
            tuition when you enroll. We charge two tiers - not to be coy, but
            because graduates of an established nursing program have already
            cleared a real bar, and we want the math to reflect that.
          </p>
          <p className="mt-4 max-w-md text-sm text-florence-slate">
            Your card data never touches our servers - checkout runs through a
            hosted processor.
          </p>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border-2 border-florence-teal bg-white p-6">
            <div className="flex items-baseline justify-between">
              <p className="fl-eyebrow text-florence-teal-dark">Preferred</p>
              <p className="font-serif text-3xl font-semibold text-florence-teal-dark">
                $75
              </p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-florence-ink/90">
              If you graduated from (or are currently in) a school on the
              eligible list. The list is maintained from public regulator
              registries - Philippines (CHED), Kenya (NCK), UK (NMC-approved),
              and more added per cohort.
            </p>
            <a
              href="#qualifier"
              className="mt-4 inline-block text-sm font-semibold text-florence-teal-dark hover:text-florence-ink"
            >
              Check if your school qualifies →
            </a>
          </div>
          <div className="rounded-2xl border border-florence-line bg-white p-6">
            <div className="flex items-baseline justify-between">
              <p className="fl-eyebrow">Standard</p>
              <p className="font-serif text-3xl font-semibold">$100</p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-florence-ink/90">
              If your school isn&apos;t on the list yet. You still get the
              full bootcamp. Self-attestation about your credentials is on the
              honor system - and we audit.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── School qualifier ────────────────────────────────────────────────────────
function SchoolQualifier() {
  const [schools, setSchools] = useState<PublicSchool[] | null>(null);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<PublicSchool | null>(null);

  useEffect(() => {
    fetchSchoolsPublic().then(setSchools);
  }, []);

  const matches = useMemo(() => {
    if (!schools || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    return schools
      .filter((s) => s.name.toLowerCase().includes(q) || (s.city ?? "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [schools, query]);

  return (
    <section id="qualifier" className="border-b border-florence-line/70">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-20">
        <p className="fl-eyebrow">Eligible school check</p>
        <h2 className="mt-2 max-w-2xl font-serif text-3xl font-semibold sm:text-4xl">
          Type your school. We&apos;ll tell you which tier you&apos;re in.
        </h2>

        <div className="mt-8 max-w-2xl">
          <label htmlFor="school-q" className="sr-only">
            School name
          </label>
          <input
            id="school-q"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPicked(null);
            }}
            placeholder="e.g. University of Santo Tomas, Kenyatta University, University of Edinburgh…"
            className="w-full rounded-xl border border-florence-line bg-white px-4 py-3 text-base focus:border-florence-indigo focus:outline-none focus:ring-2 focus:ring-florence-indigo-soft"
            autoComplete="off"
          />
          {schools === null && (
            <p className="mt-2 text-xs text-florence-slate">Loading school directory…</p>
          )}
          {schools && schools.length > 0 && !picked && query.trim().length > 0 && (
            <ul className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-florence-line bg-white shadow-sm">
              {matches.length === 0 ? (
                <li className="px-4 py-3 text-sm text-florence-slate">
                  Not in our directory yet - you&apos;d enroll at the standard
                  $100 tier. (We add new schools per cohort; let us know yours.)
                </li>
              ) : (
                matches.map((s) => (
                  <li key={s.slug}>
                    <button
                      type="button"
                      onClick={() => setPicked(s)}
                      className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left text-sm hover:bg-florence-mist"
                    >
                      <span className="font-medium text-florence-ink">{s.name}</span>
                      <span className="text-xs text-florence-slate">
                        {s.city ? `${s.city} · ` : ""}
                        {s.country}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
          {picked && <QualifierResult school={picked} onClear={() => { setPicked(null); setQuery(""); }} />}
          {schools && schools.length > 0 && (
            <p className="mt-3 text-xs text-florence-slate">
              {schools.length.toLocaleString()} schools currently in the
              directory across {countCountries(schools)} countries.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function countCountries(schools: PublicSchool[]): number {
  return new Set(schools.map((s) => s.country)).size;
}

/** "2026-07-06T00:00:00Z" → "Mon Jul 6, 2026" (locale-aware). */
function formatCohortStart(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function QualifierResult({ school, onClear }: { school: PublicSchool; onClear: () => void }) {
  const preferred = school.tier === "eligible" || school.tier === "affiliate";
  return (
    <div
      className={`mt-3 rounded-xl border p-5 ${
        preferred
          ? "border-florence-teal bg-florence-teal-soft/30"
          : "border-florence-line bg-white"
      }`}
    >
      <p className="fl-eyebrow text-florence-teal-dark">{school.name}</p>
      <p className="mt-2 text-base font-semibold text-florence-ink">
        {preferred ? (
          <>You qualify for the $75 preferred deposit.</>
        ) : (
          <>Standard $100 tier.</>
        )}
      </p>
      <p className="mt-1.5 text-sm text-florence-slate">
        {school.city ? `${school.city} · ` : ""}
        {school.country}
        {school.tier === "affiliate" && " · affiliate partner"}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          to={`/signup?school=${encodeURIComponent(school.slug)}`}
          className="rounded-lg bg-florence-indigo px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-florence-indigo-dark"
        >
          Reserve at {preferred ? "$75" : "$100"} →
        </Link>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-florence-line bg-white px-4 py-2 text-sm font-semibold text-florence-ink transition-colors hover:bg-florence-mist"
        >
          Pick another
        </button>
      </div>
    </div>
  );
}

// ── FAQ ─────────────────────────────────────────────────────────────────────
const FAQ: { q: string; a: string }[] = [
  {
    q: "Is this for the NCLEX-RN specifically?",
    a: "Yes - the RN exam, current 2026 NCSBN test plan. The bootcamp does not cover the PN (practical-nurse) variant.",
  },
  {
    q: "Do I need to be in the United States to enroll?",
    a: "No. The bootcamp runs live online; you can attend from anywhere. You'll sit the NCLEX at a Pearson VUE test center in the country you're authorized to test in.",
  },
  {
    q: "What does the deposit get me - what's the rest of tuition?",
    a: "The deposit reserves your seat in a cohort and is credited toward tuition when you enroll. Full tuition is set per cohort and shared during enrollment. We don't quote it publicly because it varies with payment plan, sponsorship, and your country.",
  },
  {
    q: "How is my school being on \"the eligible list\" decided?",
    a: "We build the list from public regulator registries - CHED (Philippines), the Nursing Council of Kenya, the UK NMC-approved programmes, and so on. If your school is regulator-approved and isn't on the list yet, tell us at signup and we add it.",
  },
  {
    q: "What if I attend and decide it isn't for me?",
    a: "Reach out before your cohort starts and we'll discuss refund eligibility. After the cohort starts the deposit isn't refundable, but you can transfer to a later cohort at no cost.",
  },
  {
    q: "What time commitment is expected?",
    a: "Sections run live for the duration of the cohort (typically four weeks). Outside live time, plan on roughly two hours per night on the adaptive bank. Your readiness band will tell you when you've done enough.",
  },
  {
    q: "Who teaches?",
    a: "A small group of nurse educators who work with internationally educated nurses every week. Instructor names are shared at enrollment - we don't put them on a marketing page.",
  },
  {
    q: "Is my data private?",
    a: "Yes. The learner app only holds your study data - identity, progress, performance, readiness. Financial and regulatory workflows live elsewhere, behind separate authentication. You can see exactly who has accessed your record from your account page.",
  },
];

function Faq() {
  return (
    <section id="faq" className="border-b border-florence-line/70 bg-florence-mist/40">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-20">
        <p className="fl-eyebrow">Common questions</p>
        <h2 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">
          The questions every applicant asks.
        </h2>
        <div className="mt-8 divide-y divide-florence-line">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-semibold text-florence-ink">
                {item.q}
                <span
                  aria-hidden
                  className="mt-0.5 text-florence-slate transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-florence-slate">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Footer ──────────────────────────────────────────────────────────────────
function MarketingFooter() {
  return (
    <footer className="border-t border-florence-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-xs text-florence-slate sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="space-y-1">
          <p>Florence Academy - NCLEX-RN preparation for internationally educated nurses.</p>
          <p className="text-florence-slate/80">
            Educational use only. Clinical content reflects current NCLEX
            teaching frameworks; it is not medical advice.
          </p>
        </div>
        <div className="flex gap-5">
          <Link to="/academy/account" className="hover:text-florence-ink">
            Sign in
          </Link>
          <a href="#cohorts" className="hover:text-florence-ink">
            Cohorts
          </a>
          <a href="#faq" className="hover:text-florence-ink">
            FAQ
          </a>
        </div>
      </div>
    </footer>
  );
}
