import { useMemo, useState } from "react";
import {
  NGN_BACKGROUND,
  NGN_ITEMS,
  type BowtieItem,
  type DropdownItem,
  type ExtendedItem,
  type HighlightItem,
  type MatrixItem,
  type NgnItem,
  type TrendItem,
} from "../data/ngn";

// ── per-item selection state ────────────────────────────────────────────────
type Selection =
  | { kind: "highlight"; ids: string[] }
  | { kind: "matrix"; choice: Record<string, number> }
  | { kind: "dropdown"; blanks: number[] }
  | { kind: "bowtie"; actions: string[]; monitors: string[] }
  | { kind: "extended"; ids: string[] }
  | { kind: "trend"; choice: Record<string, number> };

function initSelection(item: NgnItem): Selection {
  switch (item.type) {
    case "highlight":
      return { kind: "highlight", ids: [] };
    case "matrix":
      return { kind: "matrix", choice: {} };
    case "dropdown":
      return { kind: "dropdown", blanks: item.blanks.map(() => -1) };
    case "bowtie":
      return { kind: "bowtie", actions: [], monitors: [] };
    case "extended":
      return { kind: "extended", ids: [] };
    case "trend":
      return { kind: "trend", choice: {} };
  }
}

const setEq = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

function isCorrect(item: NgnItem, sel: Selection): boolean {
  switch (item.type) {
    case "highlight":
      return setEq(
        (sel as Extract<Selection, { kind: "highlight" }>).ids,
        item.findings.filter((f) => f.critical).map((f) => f.id),
      );
    case "matrix": {
      const c = (sel as Extract<Selection, { kind: "matrix" }>).choice;
      return item.rows.every((r) => c[r.id] === r.answer);
    }
    case "dropdown": {
      const b = (sel as Extract<Selection, { kind: "dropdown" }>).blanks;
      return item.blanks.every((bl, i) => b[i] === bl.answer);
    }
    case "bowtie": {
      const s = sel as Extract<Selection, { kind: "bowtie" }>;
      return (
        setEq(
          s.actions,
          item.actions.options.filter((o) => o.correct).map((o) => o.id),
        ) &&
        setEq(
          s.monitors,
          item.monitors.options.filter((o) => o.correct).map((o) => o.id),
        )
      );
    }
    case "extended":
      return setEq(
        (sel as Extract<Selection, { kind: "extended" }>).ids,
        item.options.filter((o) => o.correct).map((o) => o.id),
      );
    case "trend": {
      const c = (sel as Extract<Selection, { kind: "trend" }>).choice;
      return item.classifications.every((cl) => c[cl.id] === cl.answer);
    }
  }
}

// ── tiny shared UI ──────────────────────────────────────────────────────────
function StepBadge({ step, index }: { step: string; index: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-florence-indigo text-sm font-bold text-white">
        {index}
      </span>
      <span className="fl-eyebrow text-florence-indigo-dark">{step}</span>
    </div>
  );
}

function chipTone(state: "idle" | "on" | "ok" | "bad" | "missed") {
  switch (state) {
    case "on":
      return "border-florence-teal bg-florence-teal-soft text-florence-teal-dark";
    case "ok":
      return "border-vital-ok bg-emerald-50 text-emerald-800";
    case "bad":
      return "border-vital-danger bg-red-50 text-red-800";
    case "missed":
      return "border-vital-warn bg-amber-50 text-amber-800";
    default:
      return "border-florence-line bg-white text-florence-ink hover:border-florence-teal/60";
  }
}

// ── item renderers ──────────────────────────────────────────────────────────
function Highlight({
  item,
  sel,
  onChange,
  submitted,
}: {
  item: HighlightItem;
  sel: Extract<Selection, { kind: "highlight" }>;
  onChange: (updater: (prev: Selection) => Selection) => void;
  submitted: boolean;
}) {
  const toggle = (id: string) =>
    onChange((prev) => {
      const p = prev as Extract<Selection, { kind: "highlight" }>;
      return {
        kind: "highlight",
        ids: p.ids.includes(id)
          ? p.ids.filter((x) => x !== id)
          : [...p.ids, id],
      };
    });
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-florence-slate">
        {item.noteLead}
      </p>
      <div className="flex flex-wrap gap-2">
        {item.findings.map((f) => {
          const on = sel.ids.includes(f.id);
          let state: "idle" | "on" | "ok" | "bad" | "missed" = on ? "on" : "idle";
          if (submitted) {
            if (f.critical && on) state = "ok";
            else if (f.critical && !on) state = "missed";
            else if (!f.critical && on) state = "bad";
            else state = "idle";
          }
          return (
            <button
              key={f.id}
              disabled={submitted}
              onClick={() => toggle(f.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${chipTone(state)}`}
            >
              {f.text}
              {submitted && state === "missed" && (
                <span className="ml-1 text-xs font-semibold">· missed</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Matrix({
  item,
  sel,
  onChange,
  submitted,
}: {
  item: MatrixItem;
  sel: Extract<Selection, { kind: "matrix" }>;
  onChange: (updater: (prev: Selection) => Selection) => void;
  submitted: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left font-semibold text-florence-slate">
              Finding
            </th>
            {item.columns.map((c) => (
              <th key={c} className="p-2 text-center font-semibold text-florence-slate">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {item.rows.map((r) => {
            const picked = sel.choice[r.id];
            const rowRight = submitted && picked === r.answer;
            return (
              <tr key={r.id} className="border-t border-florence-line">
                <td className="p-2 font-medium text-florence-ink">
                  {r.finding}
                  {submitted && (
                    <span
                      className={`ml-2 text-xs font-semibold ${
                        rowRight ? "text-vital-ok" : "text-vital-danger"
                      }`}
                    >
                      {rowRight ? "✓" : "✕"}
                    </span>
                  )}
                </td>
                {item.columns.map((_, ci) => {
                  const on = picked === ci;
                  const isAns = r.answer === ci;
                  let ring = "border-florence-line";
                  if (submitted && isAns) ring = "border-vital-ok bg-emerald-50";
                  else if (submitted && on && !isAns)
                    ring = "border-vital-danger bg-red-50";
                  else if (on) ring = "border-florence-teal bg-florence-teal-soft";
                  return (
                    <td key={ci} className="p-2 text-center">
                      <button
                        disabled={submitted}
                        aria-label={`${r.finding}: ${item.columns[ci]}`}
                        onClick={() =>
                          onChange((prev) => {
                            const p = prev as Extract<
                              Selection,
                              { kind: "matrix" }
                            >;
                            return {
                              kind: "matrix",
                              choice: { ...p.choice, [r.id]: ci },
                            };
                          })
                        }
                        className={`h-6 w-6 rounded-full border-2 transition-colors ${ring}`}
                      >
                        {on && <span className="block h-full w-full rounded-full" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Dropdown({
  item,
  sel,
  onChange,
  submitted,
}: {
  item: DropdownItem;
  sel: Extract<Selection, { kind: "dropdown" }>;
  onChange: (updater: (prev: Selection) => Selection) => void;
  submitted: boolean;
}) {
  const parts = item.template.split(/(\{\{\d+\}\})/g);
  return (
    <p className="text-base leading-loose text-florence-ink">
      {parts.map((part, i) => {
        const m = part.match(/\{\{(\d+)\}\}/);
        if (!m) return <span key={i}>{part}</span>;
        const bi = Number(m[1]);
        const blank = item.blanks[bi];
        const val = sel.blanks[bi];
        const right = submitted && val === blank.answer;
        return (
          <select
            key={i}
            disabled={submitted}
            value={val}
            onChange={(e) => {
              const value = Number(e.target.value);
              onChange((prev) => {
                const p = prev as Extract<Selection, { kind: "dropdown" }>;
                const blanks = [...p.blanks];
                blanks[bi] = value;
                return { kind: "dropdown", blanks };
              });
            }}
            className={`mx-1 rounded-lg border px-2 py-1 text-sm font-medium ${
              submitted
                ? right
                  ? "border-vital-ok bg-emerald-50 text-emerald-800"
                  : "border-vital-danger bg-red-50 text-red-800"
                : "border-florence-indigo/40 bg-florence-indigo-soft/40 text-florence-indigo-dark"
            }`}
          >
            <option value={-1}>— select —</option>
            {blank.options.map((o, oi) => (
              <option key={oi} value={oi}>
                {o}
              </option>
            ))}
          </select>
        );
      })}
    </p>
  );
}

function MultiPick({
  title,
  options,
  picked,
  cap,
  submitted,
  onToggle,
}: {
  title: string;
  options: { id: string; text: string; correct: boolean }[];
  picked: string[];
  cap: number;
  submitted: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <p className="fl-eyebrow mb-2">
        {title} · choose {cap}
      </p>
      <div className="flex flex-col gap-2">
        {options.map((o) => {
          const on = picked.includes(o.id);
          const atCap = picked.length >= cap && !on;
          let tone = "border-florence-line bg-white hover:border-florence-teal/60";
          if (submitted && o.correct) tone = "border-vital-ok bg-emerald-50";
          else if (submitted && on && !o.correct) tone = "border-vital-danger bg-red-50";
          else if (on) tone = "border-florence-teal bg-florence-teal-soft";
          else if (atCap) tone = "border-florence-line bg-florence-mist opacity-50";
          return (
            <button
              key={o.id}
              disabled={submitted || atCap}
              onClick={() => onToggle(o.id)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${tone}`}
            >
              {o.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Bowtie({
  item,
  sel,
  onChange,
  submitted,
}: {
  item: BowtieItem;
  sel: Extract<Selection, { kind: "bowtie" }>;
  onChange: (updater: (prev: Selection) => Selection) => void;
  submitted: boolean;
}) {
  const toggle = (which: "actions" | "monitors", id: string, cap: number) => {
    onChange((prev) => {
      const p = prev as Extract<Selection, { kind: "bowtie" }>;
      const cur = p[which];
      const next = cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length < cap
          ? [...cur, id]
          : cur;
      return { ...p, [which]: next };
    });
  };
  return (
    <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
      <MultiPick
        title="Priority actions"
        options={item.actions.options}
        picked={sel.actions}
        cap={item.actions.pick}
        submitted={submitted}
        onToggle={(id) => toggle("actions", id, item.actions.pick)}
      />
      <div className="mx-auto rounded-2xl bg-indigo-gradient px-5 py-4 text-center text-white shadow-card-lg">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
          Priority condition
        </p>
        <p className="font-serif text-lg">{item.center}</p>
      </div>
      <MultiPick
        title="Parameters to monitor"
        options={item.monitors.options}
        picked={sel.monitors}
        cap={item.monitors.pick}
        submitted={submitted}
        onToggle={(id) => toggle("monitors", id, item.monitors.pick)}
      />
    </div>
  );
}

function Extended({
  item,
  sel,
  onChange,
  submitted,
}: {
  item: ExtendedItem;
  sel: Extract<Selection, { kind: "extended" }>;
  onChange: (updater: (prev: Selection) => Selection) => void;
  submitted: boolean;
}) {
  const toggle = (id: string) =>
    onChange((prev) => {
      const p = prev as Extract<Selection, { kind: "extended" }>;
      return {
        kind: "extended",
        ids: p.ids.includes(id)
          ? p.ids.filter((x) => x !== id)
          : [...p.ids, id],
      };
    });
  return (
    <div className="flex flex-col gap-2">
      {item.options.map((o) => {
        const on = sel.ids.includes(o.id);
        let tone = "border-florence-line bg-white hover:border-florence-teal/60";
        if (submitted && o.correct) tone = "border-vital-ok bg-emerald-50";
        else if (submitted && on && !o.correct) tone = "border-vital-danger bg-red-50";
        else if (on) tone = "border-florence-teal bg-florence-teal-soft";
        return (
          <button
            key={o.id}
            disabled={submitted}
            onClick={() => toggle(o.id)}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${tone}`}
          >
            <span
              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${
                on ? "border-current bg-current/10" : "border-florence-line"
              }`}
            >
              {on ? "✓" : ""}
            </span>
            <span>
              <span className="font-medium text-florence-ink">{o.text}</span>
              {submitted && o.note && (
                <span className="mt-0.5 block text-xs text-florence-slate">
                  {o.note}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Trend({
  item,
  sel,
  onChange,
  submitted,
}: {
  item: TrendItem;
  sel: Extract<Selection, { kind: "trend" }>;
  onChange: (updater: (prev: Selection) => Selection) => void;
  submitted: boolean;
}) {
  return (
    <div>
      <div className="mb-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-florence-slate">
              <th className="p-2 text-left font-semibold">Time</th>
              {item.data.map((d) => (
                <th key={d.time} className="p-2 text-center font-semibold">
                  {d.time}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono">
            <tr className="border-t border-florence-line">
              <td className="p-2 font-sans font-medium">BP (mmHg)</td>
              {item.data.map((d) => (
                <td key={d.time} className="p-2 text-center">
                  {d.bp}
                </td>
              ))}
            </tr>
            <tr className="border-t border-florence-line">
              <td className="p-2 font-sans font-medium">HR (bpm)</td>
              {item.data.map((d) => (
                <td key={d.time} className="p-2 text-center">
                  {d.hr}
                </td>
              ))}
            </tr>
            <tr className="border-t border-florence-line">
              <td className="p-2 font-sans font-medium">Troponin (ng/mL)</td>
              {item.data.map((d) => (
                <td key={d.time} className="p-2 text-center">
                  {d.troponin}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3">
        {item.classifications.map((cl) => {
          const val = sel.choice[cl.id];
          const right = submitted && val === cl.answer;
          return (
            <div key={cl.id} className="flex flex-wrap items-center gap-2">
              <span className="w-32 font-medium text-florence-ink">
                {cl.parameter}
              </span>
              <select
                disabled={submitted}
                value={val ?? -1}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  onChange((prev) => {
                    const p = prev as Extract<Selection, { kind: "trend" }>;
                    return {
                      kind: "trend",
                      choice: { ...p.choice, [cl.id]: value },
                    };
                  });
                }}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-sm ${
                  submitted
                    ? right
                      ? "border-vital-ok bg-emerald-50 text-emerald-800"
                      : "border-vital-danger bg-red-50 text-red-800"
                    : "border-florence-line"
                }`}
              >
                <option value={-1}>— select —</option>
                {cl.options.map((o, oi) => (
                  <option key={oi} value={oi}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderItem(
  item: NgnItem,
  sel: Selection,
  onChange: (updater: (prev: Selection) => Selection) => void,
  submitted: boolean,
) {
  switch (item.type) {
    case "highlight":
      return <Highlight item={item} sel={sel as never} onChange={onChange} submitted={submitted} />;
    case "matrix":
      return <Matrix item={item} sel={sel as never} onChange={onChange} submitted={submitted} />;
    case "dropdown":
      return <Dropdown item={item} sel={sel as never} onChange={onChange} submitted={submitted} />;
    case "bowtie":
      return <Bowtie item={item} sel={sel as never} onChange={onChange} submitted={submitted} />;
    case "extended":
      return <Extended item={item} sel={sel as never} onChange={onChange} submitted={submitted} />;
    case "trend":
      return <Trend item={item} sel={sel as never} onChange={onChange} submitted={submitted} />;
  }
}

// ── main component ──────────────────────────────────────────────────────────
export default function NgnCase() {
  const [current, setCurrent] = useState(0);
  const [selections, setSelections] = useState<Record<string, Selection>>(() =>
    Object.fromEntries(NGN_ITEMS.map((it) => [it.id, initSelection(it)])),
  );
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  const item = NGN_ITEMS[current];
  const sel = selections[item.id];
  const isDone = submitted[item.id];
  const correct = useMemo(() => isCorrect(item, sel), [item, sel]);

  const allSubmitted = NGN_ITEMS.every((it) => submitted[it.id]);
  const score = NGN_ITEMS.filter(
    (it) => submitted[it.id] && isCorrect(it, selections[it.id]),
  ).length;

  return (
    <div className="fl-card my-6 overflow-hidden">
      {/* background */}
      <div className="border-b border-florence-line bg-florence-indigo-soft/40 px-5 py-4">
        <p className="fl-eyebrow text-florence-indigo-dark">Unfolding case</p>
        <p className="mt-1 text-sm leading-relaxed text-florence-ink/90">
          {NGN_BACKGROUND}
        </p>
      </div>

      {/* stepper */}
      <div className="flex flex-wrap gap-1.5 border-b border-florence-line px-5 py-3">
        {NGN_ITEMS.map((it, i) => {
          const done = submitted[it.id];
          const ok = done && isCorrect(it, selections[it.id]);
          return (
            <button
              key={it.id}
              onClick={() => setCurrent(i)}
              className={`grid h-8 w-8 place-items-center rounded-full border text-sm font-bold transition-colors ${
                i === current
                  ? "border-florence-indigo bg-florence-indigo text-white"
                  : done
                    ? ok
                      ? "border-vital-ok bg-emerald-50 text-emerald-700"
                      : "border-vital-danger bg-red-50 text-red-700"
                    : "border-florence-line bg-white text-florence-slate hover:bg-florence-mist"
              }`}
              aria-label={`Item ${i + 1}: ${it.step}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* current item */}
      <div className="px-5 py-5">
        <StepBadge step={item.step} index={item.index} />
        <h3 className="mt-3 font-serif text-xl text-florence-ink">{item.title}</h3>
        <p className="mb-4 mt-1 text-sm text-florence-slate">{item.prompt}</p>

        {renderItem(
          item,
          sel,
          (updater) =>
            setSelections((prev) => ({
              ...prev,
              [item.id]: updater(prev[item.id]),
            })),
          !!isDone,
        )}

        {/* controls */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {!isDone ? (
            <button
              onClick={() =>
                setSubmitted((prev) => ({ ...prev, [item.id]: true }))
              }
              className="rounded-lg bg-florence-indigo px-4 py-2 text-sm font-semibold text-white shadow-card"
            >
              Submit
            </button>
          ) : (
            <>
              <span
                className={`text-sm font-semibold ${
                  correct ? "text-vital-ok" : "text-vital-danger"
                }`}
              >
                {correct ? "Correct" : "Review the rationale"}
              </span>
              <button
                onClick={() =>
                  setSubmitted((prev) => ({ ...prev, [item.id]: false }))
                }
                className="rounded-lg border border-florence-line px-3 py-2 text-sm font-medium text-florence-slate hover:bg-florence-mist"
              >
                Retry
              </button>
            </>
          )}
          {current < NGN_ITEMS.length - 1 && (
            <button
              onClick={() => setCurrent((c) => c + 1)}
              className="ml-auto rounded-lg border border-florence-indigo px-4 py-2 text-sm font-semibold text-florence-indigo hover:bg-florence-indigo-soft"
            >
              Next item →
            </button>
          )}
        </div>

        {isDone && (
          <div className="mt-4 animate-fade-up rounded-xl border border-florence-line bg-florence-mist px-4 py-3">
            <p className="fl-eyebrow mb-1">{item.step} · rationale</p>
            <p className="text-sm leading-relaxed text-florence-ink/90">
              {item.rationale}
            </p>
          </div>
        )}

        {allSubmitted && (
          <div className="mt-5 animate-fade-up rounded-xl border border-florence-teal bg-florence-teal-soft px-5 py-4">
            <p className="font-serif text-lg text-florence-ink">
              Case complete — {score}/{NGN_ITEMS.length} items correct
            </p>
            <p className="mt-1 text-sm text-florence-ink/90">
              You worked one patient through all six steps of clinical judgment:
              Recognize, Analyze, Prioritize, Generate Solutions, Take Action,
              and Evaluate Outcomes. This is the reasoning pattern NGN items
              reward.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
