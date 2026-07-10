import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import QuizRunner from "../components/quiz/QuizRunner";
import CaseRunner from "../components/quiz/CaseRunner";
import LevelChooser from "../components/quiz/LevelChooser";
import {
  BANK_SIZE,
  loadQuestionBank,
  loadedQuestionBank,
} from "../data/questionBank";
import { CLIENT_NEED_LABEL } from "../data/blueprint";
import { CLIENT_NEEDS } from "../data/blueprint";
import type { ClientNeed, Question } from "../types/question";
import { useCandidate } from "../lib/CandidateContext";
import { dueEntries, loadQueue } from "../lib/spacedQueue";
import { CASE_COUNT, loadCaseBank, loadedCaseBank } from "../data/caseBank";
import {
  applyLevel,
  CAT_MODES,
  type CatMode,
  type DifficultyLevel,
} from "../lib/cat";
import { ApplyProgramsCta } from "../components/ApplyProgramsCta";
import {
  Badge as FlorenceBadge,
  Button as FlorenceButton,
  Card as FlorenceCard,
} from "@florence/design-system";

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
      "The nightly homework. A full adaptive set that builds knowledge, stamina, and resilience - feedback comes at the end.",
    accent: "from-florence-indigo to-florence-indigo-dark",
  },
  {
    key: "exam",
    title: "Adaptive exam",
    count: "85-150 items",
    blurb:
      "Real NCLEX-style: variable length that ends when the 95% confidence-interval rule decides the result.",
    accent: "from-florence-ink to-florence-slate",
  },
  {
    key: "timed",
    title: "Timed test",
    count: "75 items · 90 min",
    blurb:
      "A fixed-length test against the clock. The timer counts down and auto-submits at zero - train your pacing and stamina under real exam pressure.",
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
    "Pick where your tutor set begins, or let Florence choose and adapt from the first item.",
  nightly:
    "Set the opening difficulty of your nightly 150, or hand the dial to Florence's adaptive engine.",
  exam:
    "Choose your starting difficulty, or let the adaptive exam find your level from the first item.",
  timed:
    "Set the opening difficulty of your timed test, or let Florence choose - then race the countdown to the finish.",
  cases:
    "Choose how hard the first unfolding case should be, or let Florence choose - either way it climbs as you go.",
};

const VALID_NEEDS = new Set(CLIENT_NEEDS.map((c) => c.key));

export default function Practice() {
  const [params, setParams] = useSearchParams();
  // Remediation deep-link: ?focus=<clientNeed> starts a focused adaptive drill
  // on exactly that weak area; ?mode=cases jumps straight into unfolding cases.
  const focus = params.get("focus");
  const focusNeed = focus && VALID_NEEDS.has(focus as ClientNeed) ? (focus as ClientNeed) : null;
  const deepCases = params.get("mode") === "cases";
  const reviewMode = params.get("mode") === "review";

  const [kind, setKind] = useState<SessionKind | null>(deepCases ? "cases" : null);
  // A focus drill auto-picks its difficulty (medium) so it starts in one tap.
  const [level, setLevel] = useState<DifficultyLevel | null>(focusNeed ? "moderate" : null);
  const [runKey, setRunKey] = useState(0);

  const reset = () => {
    setKind(null);
    setLevel(null);
    // Drop the deep-link params so "Start another session" returns to the menu.
    if (focus || deepCases || reviewMode) setParams({}, { replace: true });
  };

  // Spaced re-practice: a session on exactly the items whose review is due.
  if (reviewMode) {
    return (
      <SessionGate load={loadQuestionBank} cached={loadedQuestionBank} onExit={reset}>
        {(pool) => (
          <ReviewSession key={runKey} pool={pool} onExit={reset} onRestart={() => setRunKey((k) => k + 1)} />
        )}
      </SessionGate>
    );
  }

  // Remediation focus drill: a tutor set narrowed to ONE Client Need, launched
  // straight from the learner's remediation plan. Reuses the exact CAT engine
  // (selectNextItem is safe on a single-category pool - it just always picks
  // from the one category present) so the drill is adaptive within the area.
  if (focusNeed && kind !== "cases") {
    return (
      <SessionGate load={loadQuestionBank} cached={loadedQuestionBank} onExit={reset}>
        {(pool) => (
          <FocusDrill
            key={runKey}
            pool={pool}
            need={focusNeed}
            onExit={reset}
            onRestart={() => setRunKey((k) => k + 1)}
          />
        )}
      </SessionGate>
    );
  }

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
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-florence-slate">Adaptive practice</p>
      <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
        Practice with exam-style timing and review.
      </h1>
      <p className="mt-3 max-w-2xl text-florence-slate">
        Every set is computer-adaptive: get items right and the questions get
        harder; miss them and they ease off - the same Rasch logic the NCLEX
        uses. All item types are here, from single-answer to bow-tie and
        unfolding-case formats.
      </p>
      <ApplyProgramsCta placement="practice" compact className="mt-5 max-w-2xl" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setKind(m.key)}
            className="group flex h-full flex-col rounded-2xl border border-florence-line bg-white p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-lg"
          >
            <FlorenceBadge tone={m.key === "nightly" || m.key === "cases" ? "accent" : "primary"} className="mb-3 w-fit">
              {m.count}
            </FlorenceBadge>
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

      <FlorenceCard title="How it adapts" className="mt-8 p-5">
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
          Pool: {BANK_SIZE} items - the original seed set plus your imported
          NCLEX question bank. All Florence-owned.
        </p>
      </FlorenceCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session gate - defers the heavy question/case bank out of the Practice chunk,
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
          <FlorenceButton
            onClick={() => setAttempt((a) => a + 1)}
            variant="primary"
          >
            Try again
          </FlorenceButton>
          <FlorenceButton onClick={onExit} variant="secondary">
            ← Back
          </FlorenceButton>
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

// ---------------------------------------------------------------------------
// Daily review - spaced re-practice on exactly the queued items that are due
// (Leitner 1/3/7/14-day curve, see src/lib/spacedQueue.ts). Results.tsx
// applies the outcomes back to the queue, so a correct answer here advances
// the box and a miss resets it - no extra wiring.
// ---------------------------------------------------------------------------
const REVIEW_SESSION_CAP = 20; // oldest-due first; keeps a session doable

function ReviewSession({
  pool,
  onExit,
  onRestart,
}: {
  pool: Question[];
  onExit: () => void;
  onRestart: () => void;
}) {
  const { candidate } = useCandidate();
  // Freeze the due set at mount so the session doesn't shift under the learner.
  const duePool = useMemo(() => {
    const due = dueEntries(loadQueue(candidate?.id ?? null), Date.now());
    const ids = new Set(due.slice(0, REVIEW_SESSION_CAP).map((e) => e.id));
    return pool.filter((q) => ids.has(q.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

  if (duePool.length === 0) {
    return (
      <BankFallback>
        <p className="text-sm font-semibold text-florence-ink">Nothing due for review</p>
        <p className="mt-1 max-w-sm text-sm text-florence-slate">
          Missed items resurface on a 1/3/7/14-day curve. Keep practicing - the queue fills
          itself.
        </p>
        <FlorenceButton onClick={onExit} variant="primary" className="mt-4">
          ← Back to practice
        </FlorenceButton>
      </BankFallback>
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <div className="rounded-2xl border border-florence-indigo/30 bg-florence-indigo-soft/30 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-florence-indigo-dark">
            Daily review
          </p>
          <p className="text-sm text-florence-ink">
            {duePool.length} {duePool.length === 1 ? "item" : "items"} you missed before, back on
            their curve. Clear each one four times and it graduates.
          </p>
        </div>
      </div>
      <QuizRunner
        pool={duePool}
        config={{ ...CAT_MODES.tutor, minItems: duePool.length, maxItems: duePool.length }}
        title="Daily review"
        onExit={onExit}
        onRestart={onRestart}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Focus drill - a tutor set filtered to ONE Client Need, launched from the
// learner's remediation plan (RemediationPanel deep-links here with ?focus=).
// Same adaptive engine, narrowed pool + a banner naming the area being drilled.
// ---------------------------------------------------------------------------
function FocusDrill({
  pool,
  need,
  onExit,
  onRestart,
}: {
  pool: Question[];
  need: ClientNeed;
  onExit: () => void;
  onRestart: () => void;
}) {
  const focused = useMemo(() => pool.filter((q) => q.clientNeed === need), [pool, need]);
  const label = CLIENT_NEED_LABEL[need];

  // Enough items to drill? (Guard the rare case an imported bank is thin here.)
  if (focused.length < 3) {
    return (
      <BankFallback>
        <p className="text-sm font-semibold text-florence-ink">Not enough {label} items yet</p>
        <p className="mt-1 max-w-sm text-sm text-florence-slate">
          Practice the full adaptive set instead - it still weights your weak areas.
        </p>
        <FlorenceButton onClick={onExit} variant="primary" className="mt-4">
          ← Back to practice
        </FlorenceButton>
      </BankFallback>
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <div className="rounded-2xl border border-florence-teal/30 bg-florence-teal-soft/30 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-florence-teal-dark">
            Remediation drill
          </p>
          <p className="text-sm text-florence-ink">
            Focused practice on <span className="font-semibold">{label}</span>. Rationale after
            every item.
          </p>
        </div>
      </div>
      <QuizRunner
        pool={focused}
        config={applyLevel(CAT_MODES.tutor, "moderate")}
        title={`Remediation · ${label}`}
        onExit={onExit}
        onRestart={onRestart}
      />
    </div>
  );
}
