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
  tick,
  type SimState,
} from "../lib/vpatient/engine";
import type { ActionCategory, VPatientScenario } from "../data/vpatient/types";
import VitalsDisplay from "../components/vpatient/VitalsDisplay";
import SimDebrief from "../components/vpatient/SimDebrief";

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
  return <SimRunner scenario={scenario} />;
}

function SimRunner({ scenario }: { scenario: VPatientScenario }) {
  const [state, dispatch] = useReducer(reducer, scenario, init);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [askText, setAskText] = useState("");
  const [askReply, setAskReply] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

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
    setStarted(true);
    setRunning(true);
  }, [scenario]);

  const actions = availableActions(state, scenario);
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
          <button
            onClick={() => setChartOpen((o) => !o)}
            className="shrink-0 rounded-lg border border-florence-line bg-white px-3 py-1.5 text-xs font-semibold text-florence-ink hover:bg-florence-mist"
          >
            {chartOpen ? "Close chart" : "Chart"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-3 px-4 py-3">
        <VitalsDisplay vitals={state.vitals} clockSec={state.clockSec} />

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
          </div>
        )}

        {/* Not started: brief the learner */}
        {!started && (
          <div className="rounded-2xl border border-florence-line bg-white p-5 text-center">
            <p className="text-sm text-florence-slate">You're picking up {scenario.patient.name} at the start of your shift.</p>
            <p className="mt-1 text-sm font-medium text-florence-ink">Watch, assess, and act. The clock runs in real time.</p>
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
                {state.narrationLog.slice(-4).map((n, i) => (
                  <p key={`${n.atSec}-${i}`} className="text-sm italic leading-relaxed text-florence-ink/90">
                    "{n.text}"
                  </p>
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
