// ───────────────────────────────────────────────────────────────────────────
// LivePatientOverlay - the pilot conversational patient. A real spoken
// back-and-forth: the learner talks, the patient answers in the persona's
// voice, with natural turn-taking and interruption (ElevenLabs Agents).
//
// Guardrails, in order:
//   - renders only when the server says the pilot is enabled (?check=1)
//   - explicit consent before the first connection (voice audio is processed
//     by ElevenLabs to power the conversation - stated, not buried)
//   - the agent's dynamic variables carry ONLY what the patient knows:
//     name, age, setting, feelings, own history. Never diagnosis or rubric.
//   - sessions are server-minted signed URLs (no keys in the browser) and
//     capped per day (agent minutes are metered)
//   - the SDK loads via dynamic import so the main bundle pays nothing
// ───────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import type { VPatientScenario } from "../../data/vpatient/types";
import { call } from "../../lib/academyAuth";
import { CAST } from "../../data/vpatient/voiceCast";

type Phase = "consent" | "connecting" | "live" | "ended" | "error";

interface TranscriptLine {
  source: "you" | "patient";
  text: string;
}

/** What the PATIENT knows, assembled from the scenario - the safety boundary. */
function patientKnowledge(scenario: VPatientScenario) {
  const feelings = [
    scenario.phases[0]?.patientLine?.text,
    ...scenario.patientResponses.slice(0, 4).map((r) => r.text),
  ]
    .filter(Boolean)
    .join(" ");
  return {
    patient_name: scenario.patient.name,
    patient_age: String(scenario.patient.age),
    setting: scenario.setting,
    feelings: feelings || "Unwell, tired, and a bit frightened.",
    history: scenario.patient.history.join("; ") || "Nothing they can recall.",
    persona_notes: "Cooperative but unwell; short sentences.",
    first_line: scenario.phases[0]?.patientLine?.text ?? "Nurse… I don't feel right.",
  };
}

/** Persona-matched cast voice (same rule the narration exporter uses). */
function patientVoiceId(scenario: VPatientScenario): string | undefined {
  const want = /^f/i.test(scenario.patient.sex) ? "female" : "male";
  const options = CAST.filter((v) => v.roleHints.includes("patient") && v.gender === want);
  if (options.length === 0) return undefined;
  let h = 5381;
  for (const c of scenario.id) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  return options[h % options.length].id;
}

export default function LivePatientOverlay({
  scenario,
  onClose,
}: {
  scenario: VPatientScenario;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("consent");
  const [mode, setMode] = useState<"listening" | "speaking">("listening");
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const session = useRef<{ endSession: () => Promise<void> } | null>(null);

  const hangUp = async () => {
    try {
      await session.current?.endSession();
    } catch {
      /* already closed */
    }
    session.current = null;
    setPhase("ended");
  };

  // Never leave a metered session running if the component unmounts.
  useEffect(() => {
    return () => {
      void session.current?.endSession().catch(() => undefined);
    };
  }, []);

  const start = async () => {
    setPhase("connecting");
    try {
      const grant = await call<{ signed_url: string; sessions_left_today: number }>(
        "/v1/sim/patient-call",
      );
      setLeft(grant.sessions_left_today);
      const { Conversation } = await import("@elevenlabs/client");
      const k = patientKnowledge(scenario);
      const voiceId = patientVoiceId(scenario);
      session.current = await Conversation.startSession({
        signedUrl: grant.signed_url,
        dynamicVariables: k,
        overrides: {
          agent: { firstMessage: k.first_line },
          ...(voiceId ? { tts: { voiceId } } : {}),
        },
        onMessage: ({ message, source }: { message: string; source: string }) => {
          setLines((cur) => [...cur, { source: source === "user" ? "you" : "patient", text: message }]);
        },
        onModeChange: ({ mode: m }: { mode: string }) => setMode(m === "speaking" ? "speaking" : "listening"),
        onStatusChange: ({ status }: { status: string }) => {
          if (status === "disconnected") setPhase((p) => (p === "live" ? "ended" : p));
        },
        onError: () => {
          setError("The call dropped. Your run isn't affected - you can keep going with tap-to-ask.");
          setPhase("error");
        },
      });
      setPhase("live");
    } catch (e) {
      setError(
        e instanceof Error && /denied|permission/i.test(e.message)
          ? "Microphone permission was blocked - allow it in your browser and try again."
          : "Couldn't start the live conversation. The tap-to-ask patient still works.",
      );
      setPhase("error");
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-florence-ink/80 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-florence-ink">
            🗣 Talk with {scenario.patient.name} <span className="ml-1 rounded bg-florence-indigo-soft px-1.5 py-0.5 text-[11px] font-bold uppercase text-florence-indigo">beta</span>
          </p>
          <button onClick={phase === "live" ? hangUp : onClose} className="text-xs font-semibold text-florence-slate hover:text-florence-ink">
            {phase === "live" ? "End call" : "Close"}
          </button>
        </div>

        {phase === "consent" && (
          <div className="mt-3">
            <p className="text-sm leading-relaxed text-florence-slate">
              This is a live voice conversation: speak out loud and the patient answers.
              Your voice is sent to ElevenLabs to power the conversation and is not added
              to your Florence record. The conversation is practice only - it is never scored.
            </p>
            <button
              onClick={() => void start()}
              className="mt-3 w-full rounded-xl bg-florence-teal px-4 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-florence-teal-dark"
            >
              I understand - start the conversation
            </button>
          </div>
        )}

        {phase === "connecting" && <p className="mt-4 text-sm text-florence-slate">Connecting…</p>}

        {phase === "live" && (
          <>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-florence-slate">
              <span className={`h-2 w-2 rounded-full ${mode === "speaking" ? "animate-pulse bg-florence-teal" : "bg-vital-ok"}`} />
              {mode === "speaking" ? `${scenario.patient.name} is speaking…` : "Listening - go ahead"}
              {left !== null && <span className="ml-2 text-florence-slate/70">· {left} live sessions left today</span>}
            </p>
            <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto rounded-xl bg-florence-mist/60 p-3">
              {lines.length === 0 && (
                <p className="text-xs text-florence-slate">Say hello - introduce yourself the way you would at the bedside.</p>
              )}
              {lines.map((l, i) => (
                <p key={i} className={`text-sm leading-snug ${l.source === "you" ? "text-florence-slate" : "italic text-florence-indigo"}`}>
                  <span className="font-semibold">{l.source === "you" ? "You: " : ""}</span>
                  {l.source === "you" ? l.text : `"${l.text}"`}
                </p>
              ))}
            </div>
          </>
        )}

        {phase === "ended" && (
          <div className="mt-3">
            <p className="text-sm text-florence-slate">
              Call ended. What you learned from the conversation still counts - act on it in the sim.
            </p>
            <button onClick={onClose} className="mt-3 w-full rounded-xl border border-florence-line bg-white px-4 py-2.5 text-sm font-semibold text-florence-ink hover:bg-florence-mist">
              Back to the bedside
            </button>
          </div>
        )}

        {phase === "error" && (
          <div className="mt-3">
            <p className="text-sm text-vital-danger">{error}</p>
            <button onClick={onClose} className="mt-3 w-full rounded-xl border border-florence-line bg-white px-4 py-2.5 text-sm font-semibold text-florence-ink hover:bg-florence-mist">
              Back to the bedside
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
