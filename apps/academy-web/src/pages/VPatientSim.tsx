// ───────────────────────────────────────────────────────────────────────────
// Virtual-patient sim player - full-screen, mobile-first, tap-only.
//
// Layout (top → bottom): vitals strip, patient/cue feed, chart drawer, and a
// bottom action sheet grouped by category. Drives the pure engine at 1 Hz
// (setInterval, low-end-Android friendly). On end, renders SimDebrief.
//
// Route: /sim/:scenarioId. Learners reach only status:"approved" scenarios;
// ?preview=1 (ops/authoring) also reveals drafts. sepsis01 is draft, so during
// QA it is reachable at /#/sim/vp-sepsis-01?preview=1.
// ───────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { getScenario } from "../data/vpatient/registry";
import { apiBaseUrl, call, storedToken } from "../lib/academyAuth";
import {
  availableActions,
  dispatch as engineDispatch,
  init,
  resultedLabPanels,
  tick,
  type SimState,
} from "../lib/vpatient/engine";
import type { ActionCategory, VPatientScenario } from "../data/vpatient/types";
import type { CjmmStep } from "../types/question";
import { coachingFocus } from "../lib/vpatient/score";
import {
  applyDifficulty,
  DIFFICULTIES,
  DIFFICULTY_BLURB,
  DIFFICULTY_LABEL,
  isDifficulty,
  type Difficulty,
} from "../lib/vpatient/difficulty";
import VitalsDisplay, { type VitalsSample } from "../components/vpatient/VitalsDisplay";
import PatientPresence from "../components/vpatient/PatientPresence";
import LabsPanel from "../components/vpatient/LabsPanel";
import SimNarrationAudio from "../components/vpatient/SimNarrationAudio";
import SimDebrief from "../components/vpatient/SimDebrief";
import { speakText } from "../lib/audioManifest";
import { useMonitorAudio } from "../lib/vpatient/monitorAudio";

const CATEGORY_LABEL: Record<ActionCategory, string> = {
  assess: "Assess",
  intervene: "Intervene",
  med: "Medication",
  communicate: "Communicate",
};
const CATEGORY_ORDER: ActionCategory[] = ["assess", "communicate", "intervene", "med"];

const CATEGORY_TONE: Record<ActionCategory, string> = {
  assess: "border-florence-teal/40 bg-florence-teal-soft/40 text-florence-teal-dark",
  communicate: "border-florence-indigo/40 bg-florence-indigo-soft/50 text-florence-indigo",
  intervene: "border-amber-400/50 bg-amber-50 text-amber-800",
  med: "border-purple-400/40 bg-purple-50 text-purple-800",
};

const CHANNEL_LABEL = {
  monitor: "Monitor",
  patient: "Patient",
  chart: "Chart",
  assessment: "Assessment",
} as const;

// Offline Socratic nudges - mirror the server's mock tutor so a hint works
// with no network. Never names a correct action; coaches the reasoning step.
const STEP_FALLBACK: Record<CjmmStep, string> = {
  "recognize-cues": "Slow down and look before you act. What have you actually assessed versus assumed? Some dangerous findings only appear if you go looking.",
  "analyze-cues": "You have some data. Which single finding worries you most, and what is it pointing to? Name the pattern before you decide.",
  "prioritize-hypotheses": "Unsure of the cause? Ask which possibility is the most dangerous to miss, and rule that out first.",
  "generate-solutions": "You sense what is wrong. What are your options, and which can you do on your own versus which needs an order?",
  "take-actions": "You have decided. What is the very first thing, and is anything time-critical slipping while you set up?",
  "evaluate-outcomes": "You acted - how will you KNOW it worked? What will you reassess, and how soon?",
};

// Reducer wrapping the pure engine so React batches state cleanly.
type Action =
  | { type: "tick"; scenario: VPatientScenario }
  | { type: "dispatch"; scenario: VPatientScenario; actionId: string }
  | { type: "reset"; scenario: VPatientScenario }
  | { type: "hint" };

function reducer(state: SimState, action: Action): SimState {
  switch (action.type) {
    case "tick":
      return tick(state, action.scenario);
    case "dispatch": {
      const r = engineDispatch(state, action.scenario, action.actionId);
      return r.ok ? r.state : state;
    }
    case "reset":
      return init(action.scenario);
    case "hint":
      return { ...state, hinted: true };
  }
}

export default function VPatientSim() {
  const { scenarioId = "" } = useParams();
  const [params] = useSearchParams();
  const preview = params.get("preview") === "1";
  const urlDifficulty = params.get("difficulty");
  const scenario = useMemo(() => getScenario(scenarioId, preview), [scenarioId, preview]);

  if (!scenario) {
    return (
      <div className="grid min-h-screen place-items-center bg-florence-mist p-6 text-center">
        <div>
          <p className="text-lg font-semibold text-florence-ink">Scenario unavailable</p>
          <p className="mt-1 text-sm text-florence-slate">
            This simulation is not published yet.
          </p>
          <Link to="/academy" className="mt-4 inline-block text-sm font-semibold text-florence-teal-dark">
            Back to the Academy
          </Link>
        </div>
      </div>
    );
  }
  return (
    <SimRunner base={scenario} initialDifficulty={isDifficulty(urlDifficulty) ? urlDifficulty : "standard"} />
  );
}

export function SimRunner({
  base,
  initialDifficulty = "standard",
}: {
  base: VPatientScenario;
  initialDifficulty?: Difficulty;
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  // The scenario actually run - difficulty scales timing without changing
  // the clinical content. Recomputed only when the base or level changes.
  const scenario = useMemo(() => applyDifficulty(base, difficulty), [base, difficulty]);
  const [state, dispatch] = useReducer(reducer, scenario, init);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [askText, setAskText] = useState("");
  const [askReply, setAskReply] = useState<string | null>(null);
  const [tutorHint, setTutorHint] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Vitals trend history for the tile sparklines: sample every 2s, keep the
  // last 90 points (~a 3-minute rolling window). Plain state - 1 Hz is cheap.
  const [history, setHistory] = useState<VitalsSample[]>([]);
  useEffect(() => {
    if (!started || state.clockSec % 2 !== 0) return;
    setHistory((h) => {
      const next = [
        ...h,
        {
          atSec: state.clockSec,
          hr: state.vitals.hr,
          sbp: state.vitals.sbp,
          spo2: state.vitals.spo2,
          rr: state.vitals.rr,
          tempC: state.vitals.tempC,
        },
      ];
      return next.length > 90 ? next.slice(next.length - 90) : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.clockSec, started]);

  // The bedside soundscape: HR-synced pulse + two-tone critical alarm.
  useMonitorAudio({ vitals: state.vitals, running, muted });

  // Re-arm the run whenever the difficulty changes before the shift starts
  // (locked once started - you can't change the clock mid-code).
  useEffect(() => {
    if (!started) dispatch({ type: "reset", scenario });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]);

  // 1 Hz clock. setInterval (not rAF) so a backgrounded phone tab still
  // advances predictably and CPU stays near zero between ticks.
  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(() => dispatch({ type: "tick", scenario }), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running, scenario]);

  useEffect(() => {
    if (state.ended && running) setRunning(false);
  }, [state.ended, running]);

  const start = () => {
    setStarted(true);
    setRunning(true);
  };
  const restart = useCallback(() => {
    dispatch({ type: "reset", scenario });
    setAskReply(null);
    setHistory([]);
    setStarted(true);
    setRunning(true);
  }, [scenario]);

  const actions = availableActions(state, scenario);
  const resultedPanels = resultedLabPanels(state, scenario);
  const revealedCues = scenario.phases
    .flatMap((p) => p.cues ?? [])
    .filter((c) => state.revealedCueIds.includes(c.id));

  const ask = async () => {
    const q = askText.trim();
    if (!q) return;
    setAskText("");
    const localReply = () => {
      const ql = q.toLowerCase();
      const match = scenario.patientResponses.find((r) => r.match.some((k) => ql.includes(k)));
      return match ? match.text : "The patient looks at you but doesn't respond to that.";
    };
    // Prefer the server PatientVoice proxy: conversational when the model
    // gateway is wired, byte-identical keyword behavior in mock mode. The
    // prompt only ever carries findings the learner has ALREADY revealed -
    // the patient must not do the assessment for you. Local fallback on any
    // failure so a dead network never mutes the patient.
    try {
      if (storedToken() && apiBaseUrl()) {
        const revealedTexts = scenario.phases
          .flatMap((p) => p.cues ?? [])
          .filter((c) => state.revealedCueIds.includes(c.id))
          .map((c) => c.text);
        const reply = await call<{ text: string }>("/v1/sim/patient-voice", {
          method: "POST",
          body: {
            question: q.slice(0, 300),
            persona: {
              name: scenario.patient.name,
              age: scenario.patient.age,
              sex: scenario.patient.sex,
              setting: scenario.setting,
            },
            revealed: revealedTexts,
            canned: scenario.patientResponses.map((r) => ({ match: r.match, text: r.text })),
          },
        });
        setAskReply(reply.text);
        return;
      }
    } catch {
      /* fall through to the local keyword match */
    }
    setAskReply(localReply());
  };

  // Ask the AI tutor for a safe-to-fail nudge. Coaches the NCJMM step the
  // learner is stuck on; the server never learns the correct action, so it
  // can't hand over the answer. Using a hint flags the run (down-weighted,
  // not reported) - the price of a hint is an honest score.
  // The spoken tutor: say the hint aloud in the narrator voice (server-cached
  // TTS). Best-effort - the text hint always renders; audio only when signed
  // in, unmuted, and the API answers.
  const speakHint = async (text: string) => {
    if (muted) return;
    const url = await speakText(text, storedToken());
    if (!url || muted) return;
    const el = new Audio(url);
    el.preload = "none";
    void el.play().catch(() => undefined);
  };

  const askTutor = async () => {
    const focus = coachingFocus(state, scenario);
    dispatch({ type: "hint" });
    const situation = `Patient ${scenario.patient.name}, ${scenario.setting}. The learner has surfaced ${state.revealedCueIds.length} findings and taken ${state.actionLog.length} actions with ${focus.openDecisions} clinical decisions still open.`;
    const fallback = STEP_FALLBACK[focus.step];
    try {
      if (storedToken() && apiBaseUrl()) {
        const reply = await call<{ text: string }>("/v1/sim/tutor-hint", {
          method: "POST",
          body: { step: focus.step, criticalCuesRemaining: focus.criticalCuesRemaining, situation },
        });
        setTutorHint(reply.text);
        void speakHint(reply.text);
        return;
      }
    } catch {
      /* fall through to the offline nudge */
    }
    setTutorHint(fallback);
    void speakHint(fallback);
  };

  if (state.ended) {
    return <SimDebrief scenario={scenario} state={state} onReplay={restart} />;
  }

  return (
    <div className="min-h-screen bg-florence-mist pb-40">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-florence-line bg-white/95 px-4 py-2.5 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-florence-ink">{scenario.title}</p>
            <p className="truncate text-[11px] text-florence-slate">{scenario.setting}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute patient audio" : "Mute patient audio"}
              aria-pressed={muted}
              className="grid h-8 w-8 place-items-center rounded-lg border border-florence-line bg-white text-florence-ink hover:bg-florence-mist"
            >
              {muted ? (
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M9 4 5.5 7H3v6h2.5L9 16V4Z" />
                  <path d="M13 8l4 4m0-4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M9 4 5.5 7H3v6h2.5L9 16V4Z" />
                  <path d="M12.5 7a4 4 0 0 1 0 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setChartOpen((o) => !o)}
              className="relative rounded-lg border border-florence-line bg-white px-3 py-1.5 text-xs font-semibold text-florence-ink hover:bg-florence-mist"
            >
              {chartOpen ? "Close chart" : "Chart"}
              {!chartOpen && resultedPanels.length > 0 && (
                <span
                  className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-vital-danger ring-2 ring-white"
                  aria-label="New lab results"
                />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-3 px-4 py-3">
        <VitalsDisplay vitals={state.vitals} clockSec={state.clockSec} history={started ? history : undefined} />

        {started && <PatientPresence vitals={state.vitals} name={scenario.patient.name} />}

        {/* Chart drawer */}
        {chartOpen && (
          <div className="rounded-2xl border border-florence-line bg-white p-4">
            <p className="text-sm font-semibold text-florence-ink">
              {scenario.patient.name}, {scenario.patient.age} {scenario.patient.sex}
            </p>
            <p className="mt-0.5 text-xs text-florence-slate">
              Allergies: {scenario.patient.allergies.join(", ")} · Meds:{" "}
              {scenario.patient.meds.join(", ")}
            </p>
            <div className="mt-3 space-y-2">
              {scenario.patient.chart.map((tab) => (
                <details key={tab.id} className="rounded-lg border border-florence-line bg-florence-mist/40 p-2.5">
                  <summary className="cursor-pointer text-sm font-medium text-florence-ink">{tab.label}</summary>
                  <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-florence-ink/85">{tab.body}</p>
                </details>
              ))}
            </div>

            {/* Resulted labs - the biology behind the picture */}
            {resultedPanels.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-florence-slate">Labs</p>
                <LabsPanel panels={resultedPanels} />
              </div>
            )}
            {(scenario.labPanels?.length ?? 0) > 0 && resultedPanels.length === 0 && (
              <p className="mt-3 rounded-lg bg-florence-mist/60 px-3 py-2 text-xs text-florence-slate">
                No labs back yet. Order a panel from the action menu and results post after the turnaround.
              </p>
            )}
          </div>
        )}

        {/* Not started: brief the learner + let them pick the difficulty */}
        {!started && (
          <div className="rounded-2xl border border-florence-line bg-white p-5 text-center">
            <p className="text-sm text-florence-slate">You're picking up {scenario.patient.name} at the start of your shift.</p>
            <p className="mt-1 text-sm font-medium text-florence-ink">Watch, assess, and act. The clock runs in real time.</p>

            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-florence-slate">Difficulty</p>
              <div className="mt-1.5 inline-flex flex-wrap justify-center gap-1.5">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      difficulty === d
                        ? "border-florence-teal bg-florence-teal/10 text-florence-teal-dark"
                        : "border-florence-line bg-white text-florence-slate hover:bg-florence-mist"
                    }`}
                  >
                    {DIFFICULTY_LABEL[d]}
                  </button>
                ))}
              </div>
              <p className="mx-auto mt-1.5 max-w-sm text-[11px] leading-relaxed text-florence-slate">
                {DIFFICULTY_BLURB[difficulty]}
              </p>
            </div>

            <button
              onClick={start}
              className="mt-4 rounded-xl bg-florence-teal px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-florence-teal-dark"
            >
              Start the shift →
            </button>
          </div>
        )}

        {/* Narration + cue feed */}
        {started && (
          <>
            <div className="rounded-2xl border border-florence-line bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-florence-slate">What you notice</p>
              <div className="mt-2 space-y-2">
                {state.narrationLog.slice(-4).map((n, i, arr) => (
                  <div key={`${n.atSec}-${i}`} className="flex items-start gap-2">
                    {n.audioId && (
                      <SimNarrationAudio
                        scenarioId={scenario.id}
                        audioId={n.audioId}
                        muted={muted}
                        autoPlay={!muted && i === arr.length - 1}
                      />
                    )}
                    <p className="text-sm italic leading-relaxed text-florence-ink/90">"{n.text}"</p>
                  </div>
                ))}
                {revealedCues.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 rounded-lg bg-florence-mist/60 px-3 py-2">
                    <span className="mt-0.5 shrink-0 rounded bg-florence-ink/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                      {CHANNEL_LABEL[c.channel]}
                    </span>
                    <span className={`text-sm leading-snug ${c.critical ? "font-medium text-florence-ink" : "text-florence-ink/85"}`}>
                      {c.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Ask the patient (v1 keyword Q&A) */}
              <div className="mt-3 flex gap-2">
                <input
                  value={askText}
                  onChange={(e) => setAskText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && ask()}
                  placeholder="Ask the patient…"
                  className="flex-1 rounded-lg border border-florence-line bg-white px-3 py-2 text-sm"
                />
                <button onClick={ask} className="rounded-lg border border-florence-line bg-white px-3 py-2 text-sm font-semibold text-florence-ink hover:bg-florence-mist">
                  Ask
                </button>
              </div>
              {askReply && <p className="mt-2 text-sm italic text-florence-indigo">"{askReply}"</p>}

              {/* Safe-to-fail tutor: a Socratic nudge, never the answer. */}
              <div className="mt-3 border-t border-florence-line pt-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-florence-slate">
                    Stuck? The tutor will nudge your thinking, not give the answer.
                  </p>
                  <button
                    onClick={askTutor}
                    className="shrink-0 rounded-lg border border-florence-teal/40 bg-florence-teal-soft/40 px-3 py-1.5 text-xs font-semibold text-florence-teal-dark hover:bg-florence-teal-soft"
                  >
                    Ask the tutor
                  </button>
                </div>
                {tutorHint && (
                  <div className="mt-2 rounded-lg bg-florence-teal-soft/40 px-3 py-2">
                    <p className="text-sm leading-relaxed text-florence-ink">{tutorHint}</p>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-florence-slate">
                      Hint used · this run won't be scored
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Bottom action sheet */}
      {started && !state.ended && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-florence-line bg-white/97 px-3 pb-4 pt-2.5 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            {state.busyUntilSec !== null && state.clockSec < state.busyUntilSec ? (
              <p className="pb-2 text-center text-xs font-medium text-florence-slate">
                In progress… ({state.busyUntilSec - state.clockSec}s)
              </p>
            ) : (
              <p className="pb-2 text-center text-[11px] text-florence-slate">Tap what you do next</p>
            )}
            <div className="max-h-52 space-y-2 overflow-y-auto">
              {CATEGORY_ORDER.map((cat) => {
                const inCat = actions.filter((a) => a.category === cat);
                if (inCat.length === 0) return null;
                return (
                  <div key={cat}>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-florence-slate">
                      {CATEGORY_LABEL[cat]}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {inCat.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => dispatch({ type: "dispatch", scenario, actionId: a.id })}
                          disabled={state.busyUntilSec !== null && state.clockSec < state.busyUntilSec}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${CATEGORY_TONE[a.category]}`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
