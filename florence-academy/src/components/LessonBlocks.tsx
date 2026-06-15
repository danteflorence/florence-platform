// Shared lesson-prose renderer — extracted from SectionLesson so the e-book reader
// renders identical content. `Blocks` renders the typed ContentBlock prose; `Widget`
// mounts the optional interactive widget after a segment.

import type { CalloutTone, ContentBlock, LessonWidget } from "../data/lessonTypes";
import HeartViewer from "./HeartViewer";
import RhythmDrill from "./RhythmDrill";
import VitalsMonitor from "./VitalsMonitor";
import NgnCase from "./NgnCase";

export const CALLOUT_STYLE: Record<CalloutTone, { ring: string; label: string; chip: string }> = {
  key: { ring: "border-l-4 border-florence-teal bg-florence-teal-soft/50", label: "Key point", chip: "text-florence-teal-dark" },
  warn: { ring: "border-l-4 border-vital-warn bg-amber-50", label: "Watch out", chip: "text-amber-700" },
  info: { ring: "border-l-4 border-florence-indigo bg-florence-indigo-soft/50", label: "Note", chip: "text-florence-indigo-dark" },
};

export function Blocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="fl-prose">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "p":
            return <p key={i}>{b.text}</p>;
          case "h":
            return (
              <h4 key={i} className="mb-1.5 mt-5 text-base font-semibold text-florence-ink">
                {b.text}
              </h4>
            );
          case "list":
            return (
              <ul key={i} className="mb-3 ml-1 space-y-1.5">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2.5 text-florence-ink/90">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-florence-teal" />
                    <span className="leading-relaxed">{it}</span>
                  </li>
                ))}
              </ul>
            );
          case "callout": {
            const s = CALLOUT_STYLE[b.tone];
            return (
              <aside key={i} className={`my-4 rounded-r-xl px-4 py-3 ${s.ring}`}>
                <p className={`fl-eyebrow mb-1 ${s.chip}`}>
                  {s.label} · {b.title}
                </p>
                <p className="text-sm leading-relaxed text-florence-ink/90">{b.text}</p>
              </aside>
            );
          }
        }
      })}
    </div>
  );
}

export function Widget({ kind }: { kind: LessonWidget }) {
  switch (kind) {
    case "heart":
      return <HeartViewer />;
    case "rhythms":
      return <RhythmDrill />;
    case "sim":
      return <VitalsMonitor />;
    case "ngn":
      return <NgnCase />;
  }
}
