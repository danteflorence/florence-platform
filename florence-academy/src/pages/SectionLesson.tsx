import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Lesson } from "../data/lessonTypes";
import { useLesson } from "../lib/useLesson";
import { Blocks, Widget } from "../components/LessonBlocks";
import PracticeItem from "../components/PracticeItem";
import SectionProgress from "../components/SectionProgress";
import { COVERED_THROUGH_SECTION, SECTIONS, coverageOf } from "../data/blueprint";
import { fetchMyCohort } from "../lib/academyAuth";

function LessonReader({ lesson, slug }: { lesson: Lesson; slug: string }) {
  const { meta, objectives, timing, segments, practiceItems } = lesson;
  const [activeId, setActiveId] = useState(segments[0]?.id ?? "");

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -65% 0px", threshold: 0 },
    );
    segments.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [segments]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-florence-line bg-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-florence-teal-soft/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-florence-indigo-soft/60 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <p className="fl-eyebrow">
            Section {meta.number} · {meta.durationMin} min · {meta.contentWeight}
          </p>
          <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            {meta.title}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-florence-slate">{meta.tagline}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to={`/academy/${slug}/present`}
              className="inline-flex items-center gap-2 rounded-xl bg-florence-indigo px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark"
            >
              <span aria-hidden>▶</span> Present this section
            </Link>
            <Link
              to="/academy/live"
              className="inline-flex items-center gap-2 rounded-xl border border-florence-line bg-white px-5 py-2.5 text-sm font-semibold text-florence-indigo shadow-sm transition-colors hover:bg-florence-mist"
            >
              <span aria-hidden>📡</span> Go live with a cohort
            </Link>
            <Link
              to={`/academy/${slug}/ebook`}
              className="inline-flex items-center gap-2 rounded-xl border border-florence-line bg-white px-5 py-2.5 text-sm font-semibold text-florence-teal-dark shadow-sm transition-colors hover:bg-florence-mist"
            >
              <span aria-hidden>🎧</span> Read as e-book
            </Link>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="fl-card p-5">
              <p className="fl-eyebrow mb-3">Learning objectives</p>
              <ul className="space-y-2">
                {objectives.map((o, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-florence-ink/90">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-florence-teal-soft text-[11px] font-bold text-florence-teal-dark">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{o}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="fl-card p-5">
              <p className="fl-eyebrow mb-3">Timing</p>
              <ul className="space-y-1.5 text-sm">
                {timing.map((row) => (
                  <li
                    key={row.minutes}
                    className="flex items-baseline gap-3 border-b border-florence-line/60 pb-1.5 last:border-0"
                  >
                    <span className="w-14 shrink-0 font-mono text-xs text-florence-teal-dark">
                      {row.minutes}
                    </span>
                    <span className="text-florence-ink/90">{row.segment}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky table of contents */}
      <nav className="sticky top-16 z-30 border-b border-florence-line bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-5 py-2 sm:px-8">
          {segments.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeId === s.id
                  ? "bg-florence-indigo text-white"
                  : "text-florence-slate hover:bg-florence-mist hover:text-florence-ink"
              }`}
            >
              {s.title}
            </a>
          ))}
        </div>
      </nav>

      {/* Segments */}
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        {segments.map((seg) => (
          <section key={seg.id} id={seg.id} className="mb-12 scroll-mt-28">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="fl-pill font-mono text-florence-teal-dark">{seg.minutes} min</span>
              <span className="text-xs text-florence-slate">{seg.format}</span>
            </div>
            <h2 className="mb-3 text-2xl font-semibold text-florence-ink">{seg.title}</h2>
            <Blocks blocks={seg.blocks} />
            {seg.widget && <Widget kind={seg.widget} />}
            {seg.practiceItemId && practiceItems[seg.practiceItemId] && (
              <PracticeItem item={practiceItems[seg.practiceItemId]!} />
            )}
          </section>
        ))}
      </div>

      {/* Progress + companion → nightly adaptive practice */}
      <div className="mx-auto max-w-3xl px-5 pb-16 sm:px-8">
        <SectionProgress slug={slug} />
        <Link
          to="/academy/practice"
          className="flex items-center justify-between gap-4 rounded-2xl bg-florence-indigo p-5 text-white shadow-card transition-colors hover:bg-florence-indigo-dark"
        >
          <span>
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
              Tonight's practice
            </span>
            <span className="mt-0.5 block text-lg font-semibold">150 adaptive questions</span>
          </span>
          <span className="text-2xl" aria-hidden>
            →
          </span>
        </Link>
      </div>
    </div>
  );
}

export default function SectionLesson() {
  const { sectionSlug } = useParams<{ sectionSlug: string }>();
  const state = useLesson(sectionSlug);

  // Per-cohort coverage watermark. We start with the env-var default so the
  // first render is correct for unauthenticated visitors and known-anonymous
  // builds; once /v1/me/cohort resolves we use the real cohort watermark.
  // `null` here means "not yet fetched" - we treat it as not-loaded to avoid
  // briefly showing the upcoming-gate to a student whose cohort would unlock it.
  const [watermark, setWatermark] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    fetchMyCohort().then((c) => {
      if (!active) return;
      setWatermark(c?.covered_through_section ?? COVERED_THROUGH_SECTION);
    });
    return () => {
      active = false;
    };
  }, []);

  // Coverage gate - block direct-URL access to sections the cohort hasn't
  // reached yet, so the only way "in" is through the Curriculum Navigator's
  // covered/current sections.
  const section = SECTIONS.find((s) => s.slug === sectionSlug);
  const access = section && watermark !== null ? coverageOf(section, watermark) : null;

  if (state.status === "loading" || watermark === null)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <p className="animate-pulse text-sm font-medium text-florence-slate">Loading section…</p>
      </div>
    );
  if (state.status === "not-found" || !section)
    return (
      <ComingSoon
        title="This section isn’t published yet"
        body="We’re still building this one out. Open the Curriculum Navigator to revisit any section your cohort has already covered."
      />
    );
  if (access === "upcoming" || access === "not_published")
    return (
      <ComingSoon
        title={`Section ${section.n} · ${section.title}`}
        body="Your cohort hasn’t covered this section yet - it will unlock once your instructor reaches it live."
      />
    );
  return <LessonReader lesson={state.lesson} slug={sectionSlug!} />;
}

function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-5 text-center">
      <div>
        <p className="fl-eyebrow">Coming soon</p>
        <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-florence-slate">{body}</p>
        <Link
          to="/learn"
          className="mt-5 inline-block rounded-xl border border-florence-line bg-white px-5 py-2.5 text-sm font-semibold text-florence-ink hover:bg-florence-mist"
        >
          ← Curriculum Navigator
        </Link>
      </div>
    </div>
  );
}
