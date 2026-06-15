// Interactive audio e-book reader. One chapter (lesson segment) at a time, with the
// loop: read → listen → predict → answer → walkthrough → remediate. Reuses the lesson
// prose (LessonBlocks), per-segment audio (lessonKey), the embedded PracticeItem (which
// already shows the clinical-judgment walkthrough), and the section-level progress.
// Progressive enhancement: no audio generated → it's a working text reader.

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLesson } from "../lib/useLesson";
import { buildEbook, type Chapter } from "../lib/ebook";
import { getChapterCursor, setChapterCursor } from "../lib/ebookProgress";
import { Blocks, Widget } from "../components/LessonBlocks";
import PracticeItem from "../components/PracticeItem";
import SectionProgress from "../components/SectionProgress";
import AudioPlayer from "../components/AudioPlayer";
import { useAudioClip } from "../components/RationaleAudio";
import { lessonKey, lessonIntroKey } from "../lib/audioManifest";
import { COVERED_THROUGH_SECTION, SECTIONS, coverageOf } from "../data/blueprint";
import { fetchMyCohort } from "../lib/academyAuth";

export default function SectionEbook() {
  const { sectionSlug } = useParams<{ sectionSlug: string }>();
  const state = useLesson(sectionSlug);
  const [watermark, setWatermark] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    fetchMyCohort().then((c) => { if (active) setWatermark(c?.covered_through_section ?? COVERED_THROUGH_SECTION); });
    return () => { active = false; };
  }, []);

  const section = SECTIONS.find((s) => s.slug === sectionSlug);
  const access = section && watermark !== null ? coverageOf(section, watermark) : null;

  if (state.status === "loading" || watermark === null)
    return <div className="grid min-h-[60vh] place-items-center"><p className="animate-pulse text-sm font-medium text-florence-slate">Loading e-book…</p></div>;
  if (state.status === "not-found" || !section || access === "upcoming" || access === "not_published")
    return (
      <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-5 text-center">
        <div>
          <p className="fl-eyebrow">E-book</p>
          <h1 className="mt-1 text-2xl font-semibold">Not available yet</h1>
          <p className="mt-2 text-sm text-florence-slate">This section isn’t open for your cohort yet.</p>
          <Link to="/learn" className="mt-5 inline-block rounded-xl border border-florence-line bg-white px-5 py-2.5 text-sm font-semibold text-florence-ink hover:bg-florence-mist">← Curriculum Navigator</Link>
        </div>
      </div>
    );
  return <EbookReader slug={sectionSlug!} lessonSegments={state.lesson} />;
}

function EbookReader({ slug, lessonSegments }: { slug: string; lessonSegments: Parameters<typeof buildEbook>[0] }) {
  const book = useMemo(() => buildEbook(lessonSegments), [lessonSegments]);
  const total = book.chapters.length;
  const [idx, setIdx] = useState(() => Math.min(getChapterCursor(slug), Math.max(0, total - 1)));
  const [playAll, setPlayAll] = useState(false);
  const chapter = book.chapters[idx];

  useEffect(() => { setChapterCursor(slug, idx); }, [slug, idx]);

  const go = (n: number) => { setIdx(Math.max(0, Math.min(total - 1, n))); };
  const onChapterAudioEnded = () => { if (playAll && idx < total - 1) go(idx + 1); };

  if (!chapter) return null;
  const pct = Math.round(((idx + 1) / total) * 100);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      {/* Header */}
      <p className="fl-eyebrow">Section {book.section} · interactive e-book</p>
      <h1 className="mt-1 text-3xl font-semibold leading-tight">{book.title}</h1>
      <p className="mt-2 text-florence-slate">{book.tagline}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={() => setPlayAll((p) => !p)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${playAll ? "bg-florence-teal-dark text-white" : "border border-florence-line text-florence-teal-dark hover:bg-florence-mist"}`}>
          {playAll ? "⏸ Stop play-all" : "▶ Play all chapters"}
        </button>
        {getChapterCursor(slug) > 0 && getChapterCursor(slug) !== idx && (
          <button onClick={() => go(getChapterCursor(slug))} className="text-xs font-semibold text-florence-teal-dark hover:underline">
            Continue where you left off → Ch. {getChapterCursor(slug) + 1}
          </button>
        )}
      </div>

      {/* Progress + chapter rail */}
      <div className="mt-5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-florence-line">
          <div className="h-full rounded-full bg-florence-teal" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex gap-1 overflow-x-auto">
          {book.chapters.map((c, i) => (
            <button key={c.id} onClick={() => go(i)} className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${i === idx ? "bg-florence-indigo text-white" : "text-florence-slate hover:bg-florence-mist"}`}>
              {c.number}. {c.title}
            </button>
          ))}
        </div>
      </div>

      {/* Active chapter */}
      <article className="fl-card mt-6 p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="fl-pill font-mono text-florence-teal-dark">Chapter {chapter.number} / {total}</span>
          <span className="text-xs text-florence-slate">{chapter.format}</span>
        </div>
        <h2 className="mb-3 text-2xl font-semibold text-florence-ink">{chapter.title}</h2>

        <ChapterAudio section={book.section} chapter={chapter} autoPlay={playAll} onEnded={onChapterAudioEnded} />

        <div className="mt-4"><Blocks blocks={chapter.segment.blocks} /></div>
        {chapter.segment.widget && <Widget kind={chapter.segment.widget} />}

        {chapter.practiceItem && (
          <div className="mt-5">
            <p className="fl-eyebrow mb-1 text-florence-indigo-dark">Pause &amp; predict</p>
            <p className="mb-3 text-sm text-florence-slate">Before you answer: which option is safest, and why? Commit to an answer, then check the clinical-judgment walkthrough.</p>
            <PracticeItem item={chapter.practiceItem} />
          </div>
        )}
      </article>

      {/* Nav */}
      <div className="mt-5 flex items-center justify-between">
        <button onClick={() => go(idx - 1)} disabled={idx === 0} className="rounded-xl border border-florence-line px-4 py-2 text-sm font-medium text-florence-slate disabled:opacity-40 hover:bg-florence-mist">← Previous</button>
        <span className="text-xs text-florence-slate">{idx + 1} of {total}</span>
        {idx < total - 1 ? (
          <button onClick={() => go(idx + 1)} className="rounded-xl bg-florence-indigo px-4 py-2 text-sm font-semibold text-white hover:bg-florence-indigo-dark">Next chapter →</button>
        ) : (
          <span className="text-sm font-semibold text-florence-teal-dark">End of book ✓</span>
        )}
      </div>

      {/* End-of-section: retrieval practice + progress */}
      {idx === total - 1 && (
        <div className="mt-8">
          <SectionProgress slug={slug} />
          <Link to="/academy/practice" className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-florence-indigo p-5 text-white shadow-card transition-colors hover:bg-florence-indigo-dark">
            <span>
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-white/80">End-of-section retrieval</span>
              <span className="mt-0.5 block text-lg font-semibold">Practice these concepts adaptively</span>
            </span>
            <span className="text-2xl" aria-hidden>→</span>
          </Link>
        </div>
      )}
    </div>
  );
}

function ChapterAudio({ section, chapter, autoPlay, onEnded }: { section: number; chapter: Chapter; autoPlay: boolean; onEnded: () => void }) {
  const clip = useAudioClip(lessonKey(section, chapter.id));
  const intro = useAudioClip(chapter.number === 1 ? lessonIntroKey(section) : "");
  const active = clip ?? intro;
  if (!active) return null;
  return <AudioPlayer src={active.url} durationSec={active.durationSec} label="Listen to this chapter" autoPlay={autoPlay} onEnded={onEnded} />;
}
