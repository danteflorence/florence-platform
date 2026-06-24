import { useState } from "react";
import type {
  Answer,
  BowtieQuestion,
  ClozeSegment,
  DragDropQuestion,
  DropdownClozeQuestion,
  FillInBlankQuestion,
  GraphicHotspotQuestion,
  GraphicOptionsQuestion,
  HighlightQuestion,
  MatrixQuestion,
  MediaAsset,
  MediaExhibitQuestion,
  MultipleChoiceQuestion,
  OrderedResponseQuestion,
  Question,
  SelectAllQuestion,
  TrendQuestion,
} from "../../types/question";
import QuestionTutorButton from "../QuestionTutorButton";
import type { QuestionTutorContext } from "../../lib/questionTutor";

/**
 * Renders the interactive body for any NCLEX item type. All interactions are
 * click/tap-based (no native HTML5 drag) so they work on touch + keyboard and
 * never desync. When `revealed` is true (tutor mode, post-submit), each control
 * paints correct / incorrect / missed states.
 *
 * `onChange` accepts a functional updater. Every handler that derives the next
 * answer from the previous one uses that form, so multiple selections fired in
 * a single tick all register (no stale-closure collapse).
 */
type Update = (a: Answer | ((prev: Answer) => Answer)) => void;

type BodyProps<Q, A> = {
  q: Q;
  a: A;
  onChange: Update;
  revealed: boolean;
  disabled: boolean;
};

export default function QuestionBody(props: {
  question: Question;
  answer: Answer;
  onChange: Update;
  revealed: boolean;
  disabled: boolean;
  tutorContext?: QuestionTutorContext;
}) {
  const { question, answer, onChange, revealed, disabled, tutorContext } = props;
  const shared = { onChange, revealed, disabled };
  let body;
  switch (question.type) {
    case "multiple-choice":
      body = <MultipleChoiceBody q={question} a={answer as MCA} {...shared} />;
      break;
    case "select-all":
      body = <SelectAllBody q={question} a={answer as SAA} {...shared} />;
      break;
    case "fill-in-blank":
      body = <FillInBlankBody q={question} a={answer as FIBA} {...shared} />;
      break;
    case "ordered-response":
      body = <OrderedResponseBody q={question} a={answer as ORA} {...shared} />;
      break;
    case "matrix":
      body = <MatrixBody q={question} a={answer as MXA} {...shared} />;
      break;
    case "dropdown-cloze":
      body = <DropdownClozeBody q={question} a={answer as DCA} {...shared} />;
      break;
    case "highlight":
      body = <HighlightBody q={question} a={answer as HLA} {...shared} />;
      break;
    case "bowtie":
      body = <BowtieBody q={question} a={answer as BTA} {...shared} />;
      break;
    case "drag-drop":
      body = <DragDropBody q={question} a={answer as DDA} {...shared} />;
      break;
    case "trend":
      body = <TrendBody q={question} a={answer as TRA} {...shared} />;
      break;
    case "graphic-hotspot":
      body = <GraphicHotspotBody q={question} a={answer as GHA} {...shared} />;
      break;
    case "graphic-options":
      body = <GraphicOptionsBody q={question} a={answer as GOA} {...shared} />;
      break;
    case "media-exhibit":
      body = <MediaExhibitBody q={question} a={answer as MEA} {...shared} />;
      break;
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <QuestionTutorButton
          question={question}
          answer={answer}
          revealed={revealed}
          context={tutorContext}
        />
      </div>
      {body}
    </div>
  );
}

type MCA = Extract<Answer, { type: "multiple-choice" }>;
type SAA = Extract<Answer, { type: "select-all" }>;
type FIBA = Extract<Answer, { type: "fill-in-blank" }>;
type ORA = Extract<Answer, { type: "ordered-response" }>;
type MXA = Extract<Answer, { type: "matrix" }>;
type DCA = Extract<Answer, { type: "dropdown-cloze" }>;
type HLA = Extract<Answer, { type: "highlight" }>;
type BTA = Extract<Answer, { type: "bowtie" }>;
type DDA = Extract<Answer, { type: "drag-drop" }>;
type TRA = Extract<Answer, { type: "trend" }>;
type GHA = Extract<Answer, { type: "graphic-hotspot" }>;
type GOA = Extract<Answer, { type: "graphic-options" }>;
type MEA = Extract<Answer, { type: "media-exhibit" }>;

// ---------------------------------------------------------------------------
// shared bits
// ---------------------------------------------------------------------------

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" aria-hidden>
      <path
        d="M5 10.5l3.2 3.2L15 6.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function Cross() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" aria-hidden>
      <path
        d="M6 6l8 8M14 6l-8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const OPT_BASE =
  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors";

function optionClass(opts: {
  selected: boolean;
  revealed: boolean;
  isCorrect: boolean;
  disabled: boolean;
}) {
  const { selected, revealed, isCorrect, disabled } = opts;
  if (revealed) {
    if (isCorrect) return `${OPT_BASE} border-vital-ok bg-emerald-50 text-emerald-900`;
    if (selected) return `${OPT_BASE} border-vital-danger bg-red-50 text-red-900`;
    return `${OPT_BASE} border-florence-line bg-white text-florence-slate`;
  }
  if (selected)
    return `${OPT_BASE} border-florence-teal bg-florence-teal-soft text-florence-teal-dark`;
  return `${OPT_BASE} border-florence-line bg-white ${
    disabled ? "" : "hover:bg-florence-mist"
  }`;
}

function Marker({
  revealed,
  selected,
  isCorrect,
}: {
  revealed: boolean;
  selected: boolean;
  isCorrect: boolean;
}) {
  if (revealed && isCorrect) return <span className="text-vital-ok"><Check /></span>;
  if (revealed && selected && !isCorrect)
    return <span className="text-vital-danger"><Cross /></span>;
  return null;
}

const LETTERS = "ABCDEFGH".split("");

const MODALITY_LABEL: Record<NonNullable<MediaAsset["modality"]>, string> = {
  ecg: "ECG",
  rhythm: "Rhythm strip",
  xray: "X-ray",
  ct: "CT",
  wound: "Wound",
  photo: "Photo",
  diagram: "Diagram",
  other: "Exhibit",
};

/**
 * Renders a clinical image. Until the asset binary lands (`src` empty) it shows
 * a labelled placeholder carrying the modality + alt text, so the item is fully
 * reviewable before its artwork exists. `alt` always drives the accessible name.
 */
function Media({ asset, className }: { asset: MediaAsset; className?: string }) {
  const ratio = asset.aspect && asset.aspect > 0 ? asset.aspect : 16 / 10;
  const modality = asset.modality ? MODALITY_LABEL[asset.modality] : null;
  return (
    <figure className={className}>
      <div
        className="relative overflow-hidden rounded-xl border border-florence-line bg-florence-mist/40"
        style={{ aspectRatio: String(ratio) }}
      >
        {asset.src ? (
          <img
            src={asset.src}
            alt={asset.alt}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center p-4 text-center">
            <div className="max-w-xs">
              <p className="text-3xl" aria-hidden>
                🖼️
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-florence-slate">
                {modality ? `${modality} · ` : ""}media pending
              </p>
              <p className="mt-1 text-xs leading-snug text-florence-slate/80">
                {asset.alt}
              </p>
            </div>
          </div>
        )}
        {modality && asset.src && (
          <span className="absolute left-2 top-2 rounded-md bg-florence-ink/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            {modality}
          </span>
        )}
      </div>
      {asset.caption && (
        <figcaption className="mt-1.5 text-xs text-florence-slate">
          {asset.caption}
        </figcaption>
      )}
    </figure>
  );
}

// ---------------------------------------------------------------------------
// multiple choice
// ---------------------------------------------------------------------------

function MultipleChoiceBody({
  q,
  a,
  onChange,
  revealed,
  disabled,
}: BodyProps<MultipleChoiceQuestion, MCA>) {
  return (
    <div className="space-y-2.5">
      {q.options.map((opt, i) => {
        const selected = a.choice === i;
        const isCorrect = q.correct === i;
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onChange({ type: "multiple-choice", choice: i })}
            className={optionClass({ selected, revealed, isCorrect, disabled })}
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current text-xs font-bold">
              {LETTERS[i]}
            </span>
            <span className="flex-1">{opt}</span>
            <Marker revealed={revealed} selected={selected} isCorrect={isCorrect} />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// select all
// ---------------------------------------------------------------------------

function SelectAllBody({
  q,
  a,
  onChange,
  revealed,
  disabled,
}: BodyProps<SelectAllQuestion, SAA>) {
  const toggle = (i: number) =>
    onChange((prev) => {
      const p = prev as SAA;
      const set = new Set(p.choices);
      set.has(i) ? set.delete(i) : set.add(i);
      return { type: "select-all", choices: [...set].sort((x, y) => x - y) };
    });
  return (
    <div className="space-y-2.5">
      <p className="text-xs font-medium text-florence-slate">Select all that apply.</p>
      {q.options.map((opt, i) => {
        const selected = a.choices.includes(i);
        const isCorrect = q.correct.includes(i);
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => toggle(i)}
            className={optionClass({ selected, revealed, isCorrect, disabled })}
          >
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${
                selected ? "border-current" : "border-florence-line"
              }`}
            >
              {selected && <span className="text-current"><Check /></span>}
            </span>
            <span className="flex-1">{opt}</span>
            <Marker revealed={revealed} selected={selected} isCorrect={isCorrect} />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// fill in the blank
// ---------------------------------------------------------------------------

function FillInBlankBody({
  q,
  a,
  onChange,
  revealed,
  disabled,
}: BodyProps<FillInBlankQuestion, FIBA>) {
  const correct =
    revealed && Math.abs(Number(a.value) - q.answer) <= (q.tolerance ?? 0);
  const border = revealed
    ? correct
      ? "border-vital-ok"
      : "border-vital-danger"
    : "border-florence-line focus-within:border-florence-teal";
  return (
    <div className="space-y-2">
      <div className={`inline-flex items-center gap-2 rounded-xl border ${border} bg-white px-3 py-2`}>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          disabled={disabled}
          value={a.value}
          onChange={(e) => onChange({ type: "fill-in-blank", value: e.target.value })}
          className="w-32 bg-transparent text-lg font-semibold text-florence-ink outline-none"
          aria-label="Answer"
        />
        {q.unit && <span className="text-sm text-florence-slate">{q.unit}</span>}
      </div>
      {revealed && !correct && (
        <p className="text-sm font-medium text-vital-danger">
          Correct answer: {q.answer}
          {q.unit ? ` ${q.unit}` : ""}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ordered response
// ---------------------------------------------------------------------------

function OrderedResponseBody({
  q,
  a,
  onChange,
  revealed,
  disabled,
}: BodyProps<OrderedResponseQuestion, ORA>) {
  const move = (pos: number, dir: -1 | 1) =>
    onChange((prev) => {
      const p = prev as ORA;
      const next = [...p.order];
      const target = pos + dir;
      if (target < 0 || target >= next.length) return p;
      [next[pos], next[target]] = [next[target], next[pos]];
      return { type: "ordered-response", order: next };
    });
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-florence-slate">
        Use the arrows to place the steps in order (top = first).
      </p>
      {a.order.map((stepIdx, pos) => {
        const inPlace = revealed && stepIdx === pos;
        const outOfPlace = revealed && stepIdx !== pos;
        return (
          <div
            key={pos}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${
              inPlace
                ? "border-vital-ok bg-emerald-50"
                : outOfPlace
                  ? "border-vital-danger bg-red-50"
                  : "border-florence-line bg-white"
            }`}
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-florence-mist text-xs font-bold text-florence-slate">
              {pos + 1}
            </span>
            <span className="flex-1">{q.steps[stepIdx]}</span>
            {!revealed && (
              <span className="flex flex-col">
                <button
                  type="button"
                  disabled={disabled || pos === 0}
                  onClick={() => move(pos, -1)}
                  aria-label="Move up"
                  className="px-1 text-florence-slate hover:text-florence-ink disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={disabled || pos === a.order.length - 1}
                  onClick={() => move(pos, 1)}
                  aria-label="Move down"
                  className="px-1 text-florence-slate hover:text-florence-ink disabled:opacity-30"
                >
                  ▼
                </button>
              </span>
            )}
          </div>
        );
      })}
      {revealed && (
        <p className="pt-1 text-xs text-florence-slate">
          Correct order: {q.steps.map((s, i) => `${i + 1}. ${s}`).join("  ·  ")}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// matrix / grid
// ---------------------------------------------------------------------------

function MatrixBody({
  q,
  a,
  onChange,
  revealed,
  disabled,
}: BodyProps<MatrixQuestion, MXA>) {
  const setCell = (r: number, c: number) =>
    onChange((prev) => {
      const p = prev as MXA;
      const next = p.selected.map((row) => [...row]);
      if (q.mode === "single") {
        next[r] = [c];
      } else {
        const set = new Set(next[r]);
        set.has(c) ? set.delete(c) : set.add(c);
        next[r] = [...set];
      }
      return { type: "matrix", selected: next };
    });
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-florence-line p-2 text-left" />
            {q.columns.map((c, ci) => (
              <th
                key={ci}
                className="border-b border-florence-line p-2 text-center text-xs font-semibold text-florence-slate"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {q.rows.map((row, ri) => (
            <tr key={ri}>
              <td className="border-b border-florence-line p-2 pr-3 font-medium text-florence-ink">
                {row}
              </td>
              {q.columns.map((_, ci) => {
                const selected = a.selected[ri]?.includes(ci) ?? false;
                const isCorrect = q.correct[ri]?.includes(ci) ?? false;
                const tone = revealed
                  ? isCorrect
                    ? "text-vital-ok"
                    : selected
                      ? "text-vital-danger"
                      : "text-florence-line"
                  : selected
                    ? "text-florence-teal"
                    : "text-florence-line";
                return (
                  <td key={ci} className="border-b border-florence-line p-2 text-center">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setCell(ri, ci)}
                      aria-label={`${row} - ${q.columns[ci]}`}
                      className={`grid h-7 w-7 place-items-center ${
                        q.mode === "single" ? "rounded-full" : "rounded-md"
                      } border-2 border-current ${tone}`}
                    >
                      {selected && <span className="h-3 w-3 rounded-[2px] bg-current" />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// dropdown cloze
// ---------------------------------------------------------------------------

function DropdownClozeBody({
  q,
  a,
  onChange,
  revealed,
  disabled,
}: BodyProps<DropdownClozeQuestion, DCA>) {
  let blankIndex = -1;
  const setBlank = (bi: number, value: number | null) =>
    onChange((prev) => {
      const p = prev as DCA;
      const next = [...p.choices];
      next[bi] = value;
      return { type: "dropdown-cloze", choices: next };
    });
  return (
    <p className="text-base leading-loose text-florence-ink">
      {q.segments.map((seg: ClozeSegment, i) => {
        if (seg.kind === "text") return <span key={i}>{seg.text}</span>;
        blankIndex += 1;
        const bi = blankIndex;
        const value = a.choices[bi];
        const correct = revealed && value === seg.correct;
        const wrong = revealed && value !== seg.correct;
        return (
          <span key={i} className="inline-flex flex-col align-middle">
            <select
              disabled={disabled}
              value={value ?? ""}
              onChange={(e) =>
                setBlank(bi, e.target.value === "" ? null : Number(e.target.value))
              }
              className={`mx-1 rounded-md border bg-white px-2 py-1 text-sm font-semibold ${
                correct
                  ? "border-vital-ok text-emerald-800"
                  : wrong
                    ? "border-vital-danger text-red-700"
                    : "border-florence-teal text-florence-teal-dark"
              }`}
            >
              <option value="">Select…</option>
              {seg.options.map((o, oi) => (
                <option key={oi} value={oi}>
                  {o}
                </option>
              ))}
            </select>
            {wrong && (
              <span className="mx-1 text-xs text-vital-danger">
                → {seg.options[seg.correct]}
              </span>
            )}
          </span>
        );
      })}
    </p>
  );
}

// ---------------------------------------------------------------------------
// highlight
// ---------------------------------------------------------------------------

function HighlightBody({
  q,
  a,
  onChange,
  revealed,
  disabled,
}: BodyProps<HighlightQuestion, HLA>) {
  const toggle = (i: number) =>
    onChange((prev) => {
      const p = prev as HLA;
      const set = new Set(p.selected);
      set.has(i) ? set.delete(i) : set.add(i);
      return { type: "highlight", selected: [...set].sort((x, y) => x - y) };
    });
  return (
    <div className="space-y-2">
      {q.instruction && (
        <p className="text-xs font-medium text-florence-slate">{q.instruction}</p>
      )}
      <div className="flex flex-wrap gap-2 rounded-xl border border-florence-line bg-florence-mist/60 p-3">
        {q.tokens.map((tok, i) => {
          const selected = a.selected.includes(i);
          const isCorrect = q.correct.includes(i);
          const cls = revealed
            ? isCorrect
              ? "bg-emerald-100 text-emerald-900 ring-2 ring-vital-ok"
              : selected
                ? "bg-red-100 text-red-900 ring-2 ring-vital-danger"
                : "bg-white text-florence-slate"
            : selected
              ? "bg-florence-teal-soft text-florence-teal-dark ring-2 ring-florence-teal"
              : "bg-white text-florence-ink";
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => toggle(i)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${cls}`}
            >
              {tok}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// bow-tie
// ---------------------------------------------------------------------------

function BowtieBody({
  q,
  a,
  onChange,
  revealed,
  disabled,
}: BodyProps<BowtieQuestion, BTA>) {
  const setCondition = (i: number) =>
    onChange((prev) => ({ ...(prev as BTA), type: "bowtie", condition: i }));
  const toggleCapped = (key: "actions" | "parameters", i: number, cap: number) =>
    onChange((prev) => {
      const p = prev as BTA;
      const cur = p[key];
      let next: number[];
      if (cur.includes(i)) next = cur.filter((x) => x !== i);
      else if (cur.length >= cap) next = [...cur.slice(1), i];
      else next = [...cur, i];
      return { ...p, type: "bowtie", [key]: next };
    });

  const Wing = ({
    title,
    options,
    selected,
    correct,
    onPick,
  }: {
    title: string;
    options: string[];
    selected: number[];
    correct: number[];
    onPick: (i: number) => void;
  }) => (
    <div className="flex-1 space-y-2">
      <p className="fl-eyebrow">{title}</p>
      {options.map((opt, i) => {
        const isSel = selected.includes(i);
        const isCor = correct.includes(i);
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onPick(i)}
            className={optionClass({ selected: isSel, revealed, isCorrect: isCor, disabled })}
          >
            <span className="flex-1">{opt}</span>
            <Marker revealed={revealed} selected={isSel} isCorrect={isCor} />
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Wing
        title={`Action to take (choose ${q.actions.correct.length})`}
        options={q.actions.options}
        selected={a.actions}
        correct={q.actions.correct}
        onPick={(i) => toggleCapped("actions", i, q.actions.correct.length)}
      />
      <div className="flex-1 space-y-2">
        <p className="fl-eyebrow">Condition (choose 1)</p>
        {q.condition.options.map((opt, i) => {
          const isSel = a.condition === i;
          const isCor = q.condition.correct === i;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => setCondition(i)}
              className={optionClass({ selected: isSel, revealed, isCorrect: isCor, disabled })}
            >
              <span className="flex-1 font-medium">{opt}</span>
              <Marker revealed={revealed} selected={isSel} isCorrect={isCor} />
            </button>
          );
        })}
      </div>
      <Wing
        title={`Parameter to monitor (choose ${q.parameters.correct.length})`}
        options={q.parameters.options}
        selected={a.parameters}
        correct={q.parameters.correct}
        onPick={(i) => toggleCapped("parameters", i, q.parameters.correct.length)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// drag and drop (click-to-place)
// ---------------------------------------------------------------------------

function DragDropBody({
  q,
  a,
  onChange,
  revealed,
  disabled,
}: BodyProps<DragDropQuestion, DDA>) {
  const [held, setHeld] = useState<string | null>(null);
  const place = (tokenId: string, zoneId: string | null) =>
    onChange((prev) => {
      const p = prev as DDA;
      return { type: "drag-drop", placement: { ...p.placement, [tokenId]: zoneId } };
    });

  const tray = q.tokens.filter((t) => a.placement[t.id] == null);
  const onZoneClick = (zoneId: string) => {
    if (disabled || !held) return;
    place(held, zoneId);
    setHeld(null);
  };

  return (
    <div className="space-y-3">
      {!revealed && (
        <p className="text-xs font-medium text-florence-slate">
          Tap a card to pick it up, then tap a box to place it.
        </p>
      )}
      {tray.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-florence-line bg-florence-mist/50 p-3">
          {tray.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={disabled}
              onClick={() => setHeld(held === t.id ? null : t.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                held === t.id
                  ? "border-florence-teal bg-florence-teal-soft text-florence-teal-dark"
                  : "border-florence-line bg-white hover:bg-florence-mist"
              }`}
            >
              {t.text}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {q.zones.map((z) => {
          const placed = q.tokens.filter((t) => a.placement[t.id] === z.id);
          return (
            <button
              key={z.id}
              type="button"
              disabled={disabled || !held}
              onClick={() => onZoneClick(z.id)}
              className={`min-h-[64px] rounded-xl border-2 p-3 text-left transition-colors ${
                held && !disabled
                  ? "border-florence-teal bg-florence-teal-soft/40"
                  : "border-dashed border-florence-line bg-white"
              }`}
            >
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-florence-slate">
                {z.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {placed.map((t) => {
                  const ok = t.correctZone === z.id;
                  const cls = revealed
                    ? ok
                      ? "border-vital-ok bg-emerald-50 text-emerald-900"
                      : "border-vital-danger bg-red-50 text-red-900"
                    : "border-florence-line bg-florence-mist text-florence-ink";
                  return (
                    <span
                      key={t.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!revealed && !disabled) place(t.id, null);
                      }}
                      className={`rounded-md border px-2 py-1 text-xs ${cls}`}
                    >
                      {t.text}
                      {!revealed && !disabled && <span className="ml-1 opacity-50">×</span>}
                    </span>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// trend
// ---------------------------------------------------------------------------

function TrendBody({
  q,
  a,
  onChange,
  revealed,
  disabled,
}: BodyProps<TrendQuestion, TRA>) {
  const correctArr = Array.isArray(q.correct) ? q.correct : [q.correct];
  const toggle = (i: number) => {
    if (q.multi) {
      onChange((prev) => {
        const p = prev as TRA;
        const set = new Set(p.choices);
        set.has(i) ? set.delete(i) : set.add(i);
        return { ...p, type: "trend", choices: [...set].sort((x, y) => x - y) };
      });
    } else {
      onChange((prev) => ({ ...(prev as TRA), type: "trend", choice: i }));
    }
  };
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-florence-line">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-florence-mist">
            <tr>
              {q.table.columns.map((c, i) => (
                <th key={i} className="p-2 text-left text-xs font-semibold text-florence-slate">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.table.rows.map((row, ri) => (
              <tr key={ri} className="odd:bg-white even:bg-florence-mist/40">
                {row.map((cell, ci) => (
                  <td key={ci} className="p-2 text-florence-ink">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-2.5">
        {q.options.map((opt, i) => {
          const selected = q.multi ? a.choices.includes(i) : a.choice === i;
          const isCorrect = correctArr.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => toggle(i)}
              className={optionClass({ selected, revealed, isCorrect, disabled })}
            >
              <span className="flex-1">{opt}</span>
              <Marker revealed={revealed} selected={selected} isCorrect={isCorrect} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// graphic hot-spot (click regions on an image)
// ---------------------------------------------------------------------------

function GraphicHotspotBody({
  q,
  a,
  onChange,
  revealed,
  disabled,
}: BodyProps<GraphicHotspotQuestion, GHA>) {
  const multi = q.multi ?? true;
  const toggle = (i: number) =>
    onChange((prev) => {
      const p = prev as GHA;
      if (!multi)
        return {
          type: "graphic-hotspot",
          selected: p.selected.includes(i) ? [] : [i],
        };
      const set = new Set(p.selected);
      set.has(i) ? set.delete(i) : set.add(i);
      return { type: "graphic-hotspot", selected: [...set].sort((x, y) => x - y) };
    });
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-florence-slate">
        {q.instruction ??
          (multi
            ? "Tap every region that applies."
            : "Tap the correct region.")}
      </p>
      <div className="relative">
        <Media asset={q.image} />
        <div className="absolute inset-0">
          {q.hotspots.map((h, i) => {
            const selected = a.selected.includes(i);
            const isCorrect = q.correct.includes(i);
            const tone = revealed
              ? isCorrect
                ? "border-vital-ok bg-vital-ok/20"
                : selected
                  ? "border-vital-danger bg-vital-danger/20"
                  : "border-transparent"
              : selected
                ? "border-florence-teal bg-florence-teal/25"
                : "border-white/80 bg-white/10 hover:bg-florence-teal/15";
            return (
              <button
                key={h.id}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                aria-label={h.label}
                title={h.label}
                onClick={() => toggle(i)}
                className={`absolute border-2 ${
                  h.shape === "ellipse" ? "rounded-full" : "rounded-md"
                } ${tone} transition-colors`}
                style={{
                  left: `${h.x}%`,
                  top: `${h.y}%`,
                  width: `${h.width}%`,
                  height: `${h.height}%`,
                }}
              />
            );
          })}
        </div>
      </div>
      {revealed && (
        <p className="text-xs text-florence-slate">
          Correct region{q.correct.length === 1 ? "" : "s"}:{" "}
          {q.correct.map((i) => q.hotspots[i]?.label).filter(Boolean).join("  ·  ")}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// graphic answer options (each choice is an image)
// ---------------------------------------------------------------------------

function GraphicOptionsBody({
  q,
  a,
  onChange,
  revealed,
  disabled,
}: BodyProps<GraphicOptionsQuestion, GOA>) {
  const multi = !!q.multi;
  const correctArr = Array.isArray(q.correct) ? q.correct : [q.correct];
  const toggle = (i: number) => {
    if (multi) {
      onChange((prev) => {
        const p = prev as GOA;
        const set = new Set(p.choices);
        set.has(i) ? set.delete(i) : set.add(i);
        return {
          ...p,
          type: "graphic-options",
          choices: [...set].sort((x, y) => x - y),
        };
      });
    } else {
      onChange((prev) => ({ ...(prev as GOA), type: "graphic-options", choice: i }));
    }
  };
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-florence-slate">
        {multi ? "Select all images that apply." : "Select the correct image."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {q.options.map((opt, i) => {
          const selected = multi ? a.choices.includes(i) : a.choice === i;
          const isCorrect = correctArr.includes(i);
          const ring = revealed
            ? isCorrect
              ? "ring-2 ring-vital-ok"
              : selected
                ? "ring-2 ring-vital-danger"
                : "ring-1 ring-florence-line"
            : selected
              ? "ring-2 ring-florence-teal"
              : `ring-1 ring-florence-line ${disabled ? "" : "hover:ring-florence-teal/60"}`;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`Option ${LETTERS[i]}: ${opt.alt}`}
              onClick={() => toggle(i)}
              className={`rounded-xl bg-white p-2 text-left transition ${ring}`}
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current text-xs font-bold text-florence-slate">
                  {LETTERS[i]}
                </span>
                <Marker revealed={revealed} selected={selected} isCorrect={isCorrect} />
              </div>
              <Media asset={opt} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// media exhibit (ECG / X-ray / wound stimulus + text options)
// ---------------------------------------------------------------------------

function MediaExhibitBody({
  q,
  a,
  onChange,
  revealed,
  disabled,
}: BodyProps<MediaExhibitQuestion, MEA>) {
  const multi = !!q.multi;
  const correctArr = Array.isArray(q.correct) ? q.correct : [q.correct];
  const toggle = (i: number) => {
    if (multi) {
      onChange((prev) => {
        const p = prev as MEA;
        const set = new Set(p.choices);
        set.has(i) ? set.delete(i) : set.add(i);
        return {
          ...p,
          type: "media-exhibit",
          choices: [...set].sort((x, y) => x - y),
        };
      });
    } else {
      onChange((prev) => ({ ...(prev as MEA), type: "media-exhibit", choice: i }));
    }
  };
  return (
    <div className="space-y-4">
      <Media asset={q.exhibit} />
      <div className="space-y-2.5">
        {multi && (
          <p className="text-xs font-medium text-florence-slate">
            Select all that apply.
          </p>
        )}
        {q.options.map((opt, i) => {
          const selected = multi ? a.choices.includes(i) : a.choice === i;
          const isCorrect = correctArr.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => toggle(i)}
              className={optionClass({ selected, revealed, isCorrect, disabled })}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current text-xs font-bold">
                {LETTERS[i]}
              </span>
              <span className="flex-1">{opt}</span>
              <Marker revealed={revealed} selected={selected} isCorrect={isCorrect} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
