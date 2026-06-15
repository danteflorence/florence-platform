// Live Q&A side panel. Students type questions; the whole room sees the list and
// what's been answered; the instructor can mark a question answered. Rides the
// existing Socket.IO live session (no extra connection).

import { useState } from "react";
import type { QaItem } from "../../lib/liveProtocol";

export default function QnaPanel({
  qa,
  isInstructor,
  onAsk,
  onAnswer,
}: {
  qa: QaItem[];
  isInstructor: boolean;
  onAsk: (text: string) => void;
  onAnswer: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(true);
  const pending = qa.filter((q) => !q.answered).length;

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onAsk(t);
    setText("");
  };

  return (
    <div className="fixed right-2 top-16 z-40 w-[88vw] max-w-[18rem] overflow-hidden rounded-xl border border-white/15 bg-florence-ink/95 text-white shadow-2xl backdrop-blur sm:right-4 sm:top-20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between bg-white/10 px-3 py-2 text-sm font-semibold"
      >
        <span className="inline-flex items-center gap-2">
          Live Q&amp;A
          {pending > 0 && (
            <span className="rounded-full bg-florence-teal px-1.5 py-0.5 text-[10px] font-bold text-white">{pending}</span>
          )}
        </span>
        <span aria-hidden className="text-white/60">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="flex max-h-[60vh] flex-col">
          <ul className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
            {qa.length === 0 && (
              <li className="py-6 text-center text-xs text-white/40">No questions yet — ask one below.</li>
            )}
            {qa.map((q) => (
              <li key={q.id} className={`rounded-lg px-2.5 py-2 text-sm ${q.answered ? "bg-white/5 text-white/50" : "bg-white/10"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 break-words">{q.text}</p>
                  {q.answered && <span aria-hidden className="shrink-0 text-vital-ok">✓</span>}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-white/40">
                  <span>{q.name}</span>
                  {isInstructor && !q.answered && (
                    <button type="button" onClick={() => onAnswer(q.id)} className="font-medium text-florence-teal hover:underline">
                      Mark answered
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-white/10 p-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={2}
              placeholder={isInstructor ? "Post a question to the room…" : "Ask the instructor…"}
              className="w-full resize-none rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-florence-teal focus:outline-none"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!text.trim()}
              className="mt-1.5 w-full rounded-lg bg-florence-teal px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-florence-teal-dark disabled:opacity-40"
            >
              Ask
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
