import { useState } from "react";
import type { RosterView, StudentStatus } from "../../lib/liveProtocol";

const letter = (i: number) => String.fromCharCode(65 + i); // 0→A, 1→B …

/**
 * Instructor-only live roster: who's in the room and, while a poll is live, what
 * each student picked — updating in real time. Built from the `roster` channel
 * the server sends only to instructors, so classmate answers never leak to the
 * room. Starts collapsed as a small pill so it never covers the slide.
 */
export default function LiveRoster({ roster }: { roster: RosterView | null }) {
  const [open, setOpen] = useState(false);
  if (!roster) return null;

  const { students, answered, total, pollId } = roster;
  const live = pollId != null;
  const count = live ? `${answered}/${total}` : String(total);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        aria-label={`Show the live class roster — ${
          live ? `${answered} of ${total} answered` : `${total} present`
        }`}
        className="fixed right-4 top-16 z-30 inline-flex items-center gap-2 rounded-full border border-florence-line bg-white/95 px-3 py-1.5 text-sm font-semibold text-florence-ink shadow-card backdrop-blur transition-colors hover:bg-florence-mist"
        title="Show the live class roster"
      >
        <span aria-hidden>👥</span>
        Class
        <span className="tabular-nums text-florence-slate">· {count}</span>
        {live && answered < total && (
          <span aria-hidden className="h-2 w-2 rounded-full bg-vital-danger animate-pulse" />
        )}
      </button>
    );
  }

  return (
    <div className="fixed right-4 top-16 z-30 flex max-h-[72vh] w-72 flex-col rounded-2xl border border-florence-line bg-white shadow-2xl ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-2 border-b border-florence-line px-4 py-2.5">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden>👥</span>
          <span className="fl-eyebrow">Live roster</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="text-xs font-medium text-florence-slate">
            <span className="tabular-nums font-bold text-florence-ink">{count}</span>{" "}
            {live ? "answered" : "present"}
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-expanded={true}
            aria-label="Collapse roster"
            className="rounded-lg px-1.5 text-florence-slate transition-colors hover:bg-florence-mist hover:text-florence-ink"
            title="Collapse"
          >
            <span aria-hidden>–</span>
          </button>
        </span>
      </div>

      <ul className="flex-1 divide-y divide-florence-line/70 overflow-y-auto">
        {students.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-florence-slate">
            No students have joined yet.
          </li>
        )}
        {students.map((s, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 px-4 py-2"
          >
            <span className="min-w-0 flex-1 truncate text-sm text-florence-ink">
              {s.name?.trim() || `Student ${i + 1}`}
            </span>
            <StatusChip s={s} live={live} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusChip({ s, live }: { s: StudentStatus; live: boolean }) {
  if (!live) {
    return (
      <span className="shrink-0 rounded-full bg-florence-mist px-2 py-0.5 text-[11px] font-medium text-florence-slate">
        present
      </span>
    );
  }
  if (!s.answered) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-florence-mist px-2 py-0.5 text-[11px] font-medium text-florence-slate/70">
        <span className="h-1.5 w-1.5 rounded-full border border-florence-slate/40" />
        waiting
      </span>
    );
  }
  const tone =
    s.correct === true
      ? "bg-vital-ok text-white"
      : s.correct === false
        ? "bg-vital-danger text-white"
        : "bg-florence-teal text-white";
  const picks = s.choices.length ? s.choices.map(letter).join(" ") : "—";
  const word =
    s.correct === true ? "Correct" : s.correct === false ? "Incorrect" : "Answered";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}
      title={word}
      aria-label={s.choices.length ? `${word}, picked ${picks}` : word}
    >
      {s.correct === true && <span aria-hidden>✓</span>}
      <span aria-hidden>{picks}</span>
    </span>
  );
}
