import { useEffect, useState, type ReactNode } from "react";
import QuizRunner from "../components/quiz/QuizRunner";
import CaseRunner from "../components/quiz/CaseRunner";
import LevelChooser from "../components/quiz/LevelChooser";
import {
  BANK_SIZE,
  loadQuestionBank,
  loadedQuestionBank,
} from "../data/questionBank";
import { CASE_COUNT, loadCaseBank, loadedCaseBank } from "../data/caseBank";
import {
  applyLevel,
  CAT_MODES,
  type CatMode,
  type DifficultyLevel,
} from "../lib/cat";

/** A session is either an adaptive item set (one of the CAT modes) or NGN cases. */
type SessionKind = CatMode | "cases";

interface ModeCard {
  key: SessionKind;
  title: string;
  count: string;
  blurb: string;
  accent: string;
}

const MODES: ModeCard[] = [
  {
    key: "tutor",
    title: "Tutor practice",
    count: "10 items",
    blurb:
      "A short adaptive set with the rationale revealed after every item. Best for learning a topic.",
    accent: "from-florence-teal to-florence-teal-dark",
  },
  {
    key: "nightly",
    title: "Nightly 150",
    count: "150 items",
    blurb:
      "The nightly homework. A full adaptive set that builds knowledge, stamina, and resilience — feedback comes at the end.",
    accent: "from-florence-indigo to-florence-indigo-dark",
  },
  {
    key: "exam",
    title: "Adaptive exam",
    count: "85–150 items",
    blurb:
      "Real NCLEX-style: variable length that ends when the 95% confidence-interval rule decides the result.",
    accent: "from-florence-ink to-florence-slate",
  },
  {
    key: "timed",
    title: "Timed test",
    count: "75 items · 90 min",
    blurb:
      "A fixed-length test against the clock. The timer counts down and auto-submits at zero — train your pacing and stamina under real exam pressure.",
    accent: "from-amber-500 to-florence-indigo-dark",
  },
  {
    key: "cases",
    title: "Unfolding cases",
    count: `NGN · ${CASE_COUNT} cases`,
    blurb:
      "Next-Gen unfolding cases: one scenario, six clinical-judgment steps, rationale after every step. Difficulty climbs case to case.",
    accent: "from-florence-indigo to-florence-teal-dark",
  },
];

const SUBTITLE: Record<SessionKind, string> = {
  tutor:
    "Pick where your tutor set begins, or let FlorenceRN choose and adapt from the first item.",
  nightly:
    "Set the opening difficulty of your nightly 150, or hand the dial to FlorenceRN's adaptive engine.",
  exam:
    "Choose your starting difficulty, or let the adaptive exam find your level from the first item.",
  timed:
    "Set the opening difficulty of your timed test, or let FlorenceRN choose — then race the countdown to the finish.",
  cases:
    "Choose how hard the first unfolding case should be, or let FlorenceRN choose — either way it climbs as you go.",
};

export default function Practice() {
  const [kind, setKind] = useState<SessionKind | null>(null);
  const [level, setLevel] = useState<DifficultyLevel | null>(null);
  const [runKey, setRunKey] = useState(0);

  const reset = () => {
    setKind(null);
    setLevel(null);
  };

  // Step 2: a kind + a level are chosen → load the bank, then run the session.
  if (kind && level) {
    if (kind === "cases") {
      return (
        <SessionGate load={loadCaseBank} cached={loadedCaseBank} onExit={reset}>
          {(data) => (
            <CaseRunner
              key={runKey}
              cases={data.cases}
              caseItems={data.items}
              level={level}
              onExit={reset}
              onRestart={() => setRunKey((k) => k + 1)}
            />
          )}
        </SessionGate>
      );
    }
    const card = MODES.find((m) => m.key === kind)!;
    return (
      <SessionGate
        load={loadQuestionBank}
        cached={loadedQuestionBank}
        onExit={reset}
      >
        {(pool) => (
          <QuizRunner
            key={runKey}
            pool={pool}
            config={applyLevel(CAT_MODES[kind], level)}
            title={card.title}
            onExit={reset}
            onRestart={() => setRunKey((k) => k + 1)}
          />
        )}
      </SessionGate>
    );
  }

  // Step 1b: a kind is chosen → choose the starting difficulty.
  if (kind) {
    const card = MODES.find((m) => m.key === kind)!;
    return (
      <LevelChooser
        title={card.title}
        subtitle={SUBTITLE[kind]}
        onBack={reset}
        onPick={(lv) => {
          setRunKey((k) => k + 1);
          setLevel(lv);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <p className="fl-eyebrow">Adaptive practice</p>
      <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
        Practice the way the exam{" "}
        <span className="italic text-florence-indigo">actually works.</span>
      </h1>
      <p className="mt-3 max-w-2xl text-florence-slate">
        Every set is computer-adaptive: get items right and the questions get
        harder; miss them and they ease off — the same Rasch logic the NCLEX
        uses. All item types are here, from single-answer to bow-tie and
        unfolding-case formats.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setKind(m.key)}
            className="group flex h-full flex-col rounded-2xl border border-florence-line bg-white p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-lg"
          >
            <div
              className={`mb-3 inline-flex w-fit rounded-lg bg-gradient-to-br ${m.accent} px-2.5 py-1 text-xs font-semibold text-white`}
            >
              {m.count}
            </div>
            <h3 className="text-lg font-semibold text-florence-ink">{m.title}</h3>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-florence-slate">
              {m.blurb}
            </p>
            <span className="mt-4 text-sm font-semibold text-florence-teal-dark group-hover:underline">
              Start →
            </span>
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-florence-line bg-white p-5">
        <h2 className="text-base font-semibold">How it adapts</h2>
        <ol className="mt-2 space-y-1.5 text-sm text-florence-slate">
          <li>
            1. After every answer your ability estimate is recomputed (EAP on a
            Rasch model).
          </li>
          <li>
            2. The next item is the most informative one near your current
            ability, kept on the NCSBN blueprint mix.
          </li>
          <li>
            3. Sessions end on length or, in exam mode, when a 95% confidence
            interval clears the passing standard.
          </li>
        </ol>
        <p className="mt-3 text-[11px] text-florence-slate/70">
          Pool: {BANK_SIZE} items — the original seed set plus your imported
          NCLEX question bank. All Florence-owned.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session gate — defers the heavy question/case bank out of the Practice chunk,
// fetching it on demand when a session starts (with a loading + retry state).
// `cached` lets a restart reuse an already-loaded bank with no loading flash.
// ---------------------------------------------------------------------------

function SessionGate<T>({
  load,
  cached,
  onExit,
  children,
}: {
  load: () => Promise<T>;
  cached: () => T | null;
  onExit: () => void;
  children: (data: T) => ReactNode;
}) {
  const [data, setData] = useState<T | null>(cached);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (data) return;
    let alive = true;
    setError(null);
    load().then(
      (d) => {
        if (alive) setData(d);
      },
      (e) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      },
    );
    return () => {
      alive = false;
    };
  }, [data, attempt, load]);

  if (data) return <>{children(data)}</>;

  if (error) {
    return (
      <BankFallback>
        <p className="text-sm font-semibold text-vital-danger">
          Couldn’t load the question bank.
        </p>
        <p className="mt-1 max-w-sm text-sm text-florence-slate">{error}</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setAttempt((a) => a + 1)}
            className="rounded-xl bg-florence-teal px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-teal-dark"
          >
            Try again
          </button>
          <button onClick={onExit} className="fl-pill">
            ← Back
          </button>
        </div>
      </BankFallback>
    );
  }

  return (
    <BankFallback>
      <span
        className="mb-3 h-7 w-7 animate-spin rounded-full border-2 border-florence-line border-t-florence-teal"
        aria-hidden
      />
      <p className="text-sm font-medium text-florence-slate">
        Preparing your adaptive session…
      </p>
    </BankFallback>
  );
}

function BankFallback({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-5">
      <div className="flex flex-col items-center text-center">{children}</div>
    </div>
  );
}
