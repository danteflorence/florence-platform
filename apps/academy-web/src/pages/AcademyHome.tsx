import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  COVERED_THROUGH_SECTION,
  SECTIONS,
  coverageOf,
  type CoverageState,
} from "../data/blueprint";
import { fetchMyCohort, type MyCohort } from "../lib/academyAuth";
import { useCandidate } from "../lib/CandidateContext";
import { ApplyProgramsCta } from "../components/ApplyProgramsCta";
import ReadinessCard from "../components/ReadinessCard";
import RemediationPanel from "../components/RemediationPanel";
import DailyReviewCard from "../components/DailyReviewCard";
import TodaysPlanCard from "../components/TodaysPlanCard";
import ReasoningProfileCard from "../components/ReasoningProfileCard";
import {
  Badge as FlorenceBadge,
  Card as FlorenceCard,
  StatusPill,
  buttonClassName,
  type FlorenceTone,
} from "@florence/design-system";

const STATE_LABEL: Record<CoverageState, string> = {
  covered: "Covered live · revisit",
  current: "Now studying",
  upcoming: "Coming soon",
  not_published: "Coming soon",
};

const STATE_CARD: Record<CoverageState, string> = {
  covered:
    "border-florence-teal bg-white shadow-card transition-colors hover:bg-florence-teal-soft/40",
  current:
    "border-florence-indigo bg-florence-indigo-soft/40 shadow-card transition-colors hover:bg-florence-indigo-soft/70",
  upcoming: "border-florence-line bg-white/60 opacity-70",
  not_published: "border-florence-line bg-white/60 opacity-70",
};

const STATE_NUM: Record<CoverageState, string> = {
  covered: "bg-florence-teal text-white",
  current: "bg-florence-indigo text-white",
  upcoming: "bg-florence-mist text-florence-slate",
  not_published: "bg-florence-mist text-florence-slate",
};

const STATE_TONE: Record<CoverageState, FlorenceTone> = {
  covered: "success",
  current: "accent",
  upcoming: "neutral",
  not_published: "neutral",
};

// Quiet exploration tiles for everything that is NOT today's work. Frequency
// of use sets visual weight: one primary continue action, then these.
const EXPLORE: { to: string; label: string; hint: string }[] = [
  { to: "/academy/library", label: "Library", hint: "PDFs, handouts, visuals" },
  { to: "/academy/practice", label: "Practice", hint: "Adaptive bank · 10,792 items" },
  { to: "/academy/sims", label: "Virtual patients", hint: "Bedside simulations" },
  { to: "/academy/tutor", label: "Tutor", hint: "Explain, quiz, coach" },
  { to: "/academy/grants", label: "Grants", hint: "Funding support" },
  { to: "/academy/residency", label: "Residency reserve", hint: "Plan your start" },
];

export default function AcademyHome() {
  // Signed-in learners see their readiness band + next study action up top -
  // the same snapshot the API already computes for remediation dispatch.
  const { status, readiness, candidate } = useCandidate();
  // Per-cohort coverage watermark. Falls back to the build-time env var when
  // the student isn't enrolled / isn't signed in / no API. Once /v1/me/cohort
  // resolves, the grid + hero CTA reflect the live cohort's actual progress.
  const [cohort, setCohort] = useState<MyCohort | null>(null);
  useEffect(() => {
    let active = true;
    fetchMyCohort().then((c) => {
      if (active) setCohort(c);
    });
    return () => {
      active = false;
    };
  }, []);
  const watermark = cohort?.covered_through_section ?? COVERED_THROUGH_SECTION;

  // The "next live section" the continue action deep-links to. If the cohort
  // hasn't started, surface the curriculum entry point instead.
  const current = SECTIONS.find((s) => coverageOf(s, watermark) === "current");
  const heroTarget = current?.slug;
  const authed = status === "authenticated";
  const firstName = candidate?.full_name?.split(" ")[0];

  return (
    <div>
      {authed ? (
        /* ── Signed in: the day's work leads. No pitch, no button ladder -
              the plan, the band, then one continue action and quiet tiles. ── */
        <section className="border-b border-florence-line bg-florence-mist/60">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:px-8">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-florence-slate">
                  Florence Academy
                </p>
                <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
                  {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
                </h1>
              </div>
              {heroTarget && (
                <Link
                  to={`/academy/${heroTarget}`}
                  className={`whitespace-nowrap ${buttonClassName({ variant: "primary", size: "md" })}`}
                >
                  Resume section →
                </Link>
              )}
            </div>
            <TodaysPlanCard />
            {readiness && <ReadinessCard snapshot={readiness} />}
            <DailyReviewCard />
            <RemediationPanel />
            <ReasoningProfileCard />
            <nav aria-label="Explore" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {EXPLORE.map((t) => (
                <Link
                  key={t.to}
                  to={t.to}
                  className="rounded-2xl border border-florence-line bg-white px-4 py-3 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-lg"
                >
                  <p className="text-sm font-semibold text-florence-ink">{t.label}</p>
                  <p className="mt-0.5 text-xs text-florence-slate">{t.hint}</p>
                </Link>
              ))}
            </nav>
          </div>
        </section>
      ) : (
        /* ── Signed out: the pitch, with ONE primary action and quiet tiles
              instead of the seven-button ladder. ── */
        <>
          <section className="relative overflow-hidden border-b border-florence-line bg-white">
            <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-florence-teal-soft/70 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-florence-indigo-soft/70 blur-3xl" />
            <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-16">
              <FlorenceBadge tone="accent">Florence Academy</FlorenceBadge>
              <h1 className="mt-3 max-w-3xl font-serif text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                You&apos;re already a nurse. The NCLEX is the last door.
              </h1>
              <p className="mt-3 max-w-2xl text-base text-florence-slate sm:text-lg">
                An interactive bootcamp for internationally educated nurses: real
                clinical content, 3D anatomy you can explore, bedside simulations,
                and a computer-adaptive question bank that works exactly like the
                exam.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                {heroTarget ? (
                  <Link
                    to={`/academy/${heroTarget}`}
                    className={buttonClassName({ variant: "primary", size: "lg" })}
                  >
                    Start studying free →
                  </Link>
                ) : (
                  <a
                    href="#sections"
                    className={buttonClassName({ variant: "primary", size: "lg" })}
                  >
                    Open the Curriculum Navigator →
                  </a>
                )}
                <Link
                  to="/academy/account"
                  className={buttonClassName({ variant: "secondary", size: "lg" })}
                >
                  Sign in
                </Link>
              </div>
              <nav aria-label="Explore" className="mt-6 grid max-w-2xl grid-cols-2 gap-2.5 sm:grid-cols-3">
                {EXPLORE.map((t) => (
                  <Link
                    key={t.to}
                    to={t.to}
                    className="rounded-2xl border border-florence-line bg-white/80 px-4 py-3 transition-colors hover:bg-florence-mist"
                  >
                    <p className="text-sm font-semibold text-florence-ink">{t.label}</p>
                    <p className="mt-0.5 text-xs text-florence-slate">{t.hint}</p>
                  </Link>
                ))}
              </nav>
              <ApplyProgramsCta placement="academy_home" compact className="mt-6 max-w-2xl" />
            </div>
          </section>
          {/* The spaced-review queue is device-local, so anonymous learners keep
              their daily review too. Renders nothing when the queue is empty. */}
          <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-8">
            <DailyReviewCard />
          </section>
        </>
      )}

      {!authed && (
      <>
      <section className="border-b border-florence-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <h2 className="text-2xl font-semibold">Study Library and reader.</h2>
            <p className="mt-2 text-sm leading-6 text-florence-slate">
              Use Academy-published PDFs, handouts, and interactive visuals
              alongside Florence Tutor and practice.
            </p>
            <Link
              to="/academy/library"
              className="mt-4 inline-flex rounded-xl bg-florence-indigo px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark"
            >
              Browse library
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["PDFs", "Admin-published study files and handouts."],
              ["Tutor", "Explain, quiz, flashcards, and study plans."],
              ["Visuals", "Approved interactive resources for clinical review."],
            ].map(([title, body]) => (
              <FlorenceCard key={title} surface="mist" className="p-4">
                <p className="font-semibold text-florence-ink">{title}</p>
                <p className="mt-1 text-sm leading-6 text-florence-slate">{body}</p>
              </FlorenceCard>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-florence-line bg-florence-mist">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <h2 className="mt-1 text-2xl font-semibold">
              Florence Tutor for daily clinical judgment practice.
            </h2>
            <p className="mt-2 text-sm leading-6 text-florence-slate">
              Review missed items, answer similar questions, listen to rationales,
              practice short scenarios, and get a focused next step.
            </p>
            <Link
              to="/academy/tutor"
              className="mt-4 inline-flex rounded-xl bg-florence-teal px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-teal-dark"
            >
              Start today's round
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Review", "Wrong-answer patterns and NCJMM walkthroughs."],
              ["Simulate", "Short patient and SBAR scenarios."],
              ["Practice", "Your next activity adapts to what you just worked on."],
            ].map(([title, body]) => (
              <FlorenceCard key={title} className="p-4">
                <p className="font-semibold text-florence-ink">{title}</p>
                <p className="mt-1 text-sm leading-6 text-florence-slate">{body}</p>
              </FlorenceCard>
            ))}
          </div>
        </div>
      </section>
      </>
      )}

      <section id="sections" className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Curriculum Navigator</h2>
            <p className="mt-1 text-sm text-florence-slate">
              {watermark === 0
                ? cohort
                  ? `${cohort.name} hasn't started yet - sections unlock as your instructor covers them live.`
                  : "Your cohort hasn't started yet - sections unlock as your instructor covers them live."
                : `Sections 1-${watermark} have been covered live${cohort ? ` in ${cohort.name}` : ""}. Revisit any of them; upcoming sections unlock as your instructor reaches them.`}
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => {
            const state = coverageOf(s, watermark);
            const clickable = state === "covered" || state === "current";
            const card = (
              <div
                className={`flex h-full items-start gap-3 rounded-2xl border p-4 ${STATE_CARD[state]}`}
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${STATE_NUM[state]}`}>
                  {s.n}
                </span>
                <div className="min-w-0">
                  <p
                    className={`font-medium ${clickable ? "text-florence-ink" : "text-florence-slate"}`}
                  >
                    {s.title}
                  </p>
                  <StatusPill tone={STATE_TONE[state]} className="mt-2">
                    {STATE_LABEL[state]}
                  </StatusPill>
                </div>
              </div>
            );
            return clickable ? (
              <Link key={s.n} to={`/academy/${s.slug}`}>
                {card}
              </Link>
            ) : (
              <div key={s.n} aria-disabled="true">
                {card}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
