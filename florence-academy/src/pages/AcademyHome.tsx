import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  COVERED_THROUGH_SECTION,
  SECTIONS,
  coverageOf,
  type CoverageState,
} from "../data/blueprint";
import { fetchMyCohort, type MyCohort } from "../lib/academyAuth";

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

const STATE_TEXT: Record<CoverageState, string> = {
  covered: "font-semibold text-florence-teal-dark",
  current: "font-semibold text-florence-indigo-dark",
  upcoming: "text-florence-slate/70",
  not_published: "text-florence-slate/70",
};

export default function AcademyHome() {
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

  // The "next live section" the hero deep-links to. If the cohort hasn't started,
  // surface the curriculum entry point instead.
  const current = SECTIONS.find((s) => coverageOf(s, watermark) === "current");
  const heroTarget = current?.slug;
  return (
    <div>
      <section className="relative overflow-hidden border-b border-florence-line bg-white">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-florence-teal-soft/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-florence-indigo-soft/70 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-16">
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
            Pass the NCLEX - one clinical section at a time.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-florence-slate sm:text-lg">
            An interactive bootcamp for internationally educated nurses: real
            clinical content, 3D anatomy you can explore, bedside simulations,
            and a computer-adaptive question bank that works exactly like the
            exam.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {heroTarget ? (
              <Link
                to={`/academy/${heroTarget}`}
                className="rounded-xl bg-florence-indigo px-5 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark"
              >
                Resume current section →
              </Link>
            ) : (
              <a
                href="#sections"
                className="rounded-xl bg-florence-indigo px-5 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark"
              >
                Open the Curriculum Navigator →
              </a>
            )}
            <Link
              to="/academy/practice"
              className="rounded-xl border border-florence-line bg-white px-5 py-3 text-sm font-semibold text-florence-ink hover:bg-florence-mist"
            >
              Nightly practice · 150 adaptive →
            </Link>
            <Link
              to="/academy/tutor"
              className="rounded-xl border border-florence-line bg-white px-5 py-3 text-sm font-semibold text-florence-ink hover:bg-florence-mist"
            >
              Open FlorenceRN Tutor →
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-florence-line bg-florence-mist">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <h2 className="mt-1 text-2xl font-semibold">
              FlorenceRN Tutor for daily clinical judgment practice.
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
              <div key={title} className="rounded-2xl border border-florence-line bg-white p-4 shadow-card">
                <p className="font-semibold text-florence-ink">{title}</p>
                <p className="mt-1 text-sm leading-6 text-florence-slate">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
                  <p className={`mt-0.5 text-xs ${STATE_TEXT[state]}`}>{STATE_LABEL[state]}</p>
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
