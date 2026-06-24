// Floating voice tutor - a Conversational-AI nurse educator the learner can
// TALK to ("walk me through why it's C"). Renders only when the instance has a
// tutor configured (ELEVENLABS_API_KEY + ELEVENLABS_AGENT_ID); otherwise it's
// invisible, so it's safe to mount globally.
//
// @elevenlabs/react requires its hooks to live inside <ConversationProvider>, so
// the outer component does the config check and ONLY mounts the provider (and
// the hook-using widget) when enabled - no hooks run in the disabled/mock path.
// Realtime audio runs over a server-minted, learner-gated signed URL.

import { useEffect, useState } from "react";
import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
  useConversationMode,
  useConversationInput,
} from "@elevenlabs/react";
import { fetchTutorConfigured, startTutorSession } from "../lib/voiceTutor";
import { setTutorConfigured, subscribeTutor, type TutorSeed } from "../lib/tutorBus";

export default function VoiceTutor() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    fetchTutorConfigured().then((c) => {
      setConfigured(c);
      setTutorConfigured(c); // lets "Ask FlorenceRN about this" buttons appear
    });
  }, []);
  if (!configured) return null; // not enabled (or mock) → no provider, no hooks
  return (
    <ConversationProvider>
      <TutorWidget />
    </ConversationProvider>
  );
}

function TutorWidget() {
  const [open, setOpen] = useState(false);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [seed, setSeed] = useState<TutorSeed | null>(null);
  const { startSession, endSession } = useConversationControls();
  const { status, message } = useConversationStatus();
  const { isSpeaking } = useConversationMode();
  const { isMuted, setMuted } = useConversationInput();

  const active = status === "connected";
  const connecting = status === "connecting";
  const error = preflightError ?? (status === "error" ? message ?? "The tutor hit a problem." : null);

  // A walkthrough's "Ask FlorenceRN about this" opens the panel pre-seeded.
  useEffect(() => subscribeTutor((s) => { setSeed(s); setOpen(true); }), []);

  function start() {
    setPreflightError(null);
    startTutorSession()
      .then((signedUrl) => {
        // Ground the agent on the current question when seeded (best-effort; flat
        // string vars only). Cast keeps it compiling across SDK versions.
        const cfg: Record<string, unknown> = { signedUrl };
        if (seed) {
          cfg["dynamicVariables"] = {
            ...(seed.variables ?? {}),
            ...(seed.context ? { tutor_context: seed.context } : {}),
          };
        }
        return startSession(cfg as Parameters<typeof startSession>[0]);
      })
      .catch((e) => setPreflightError((e as Error).message));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Talk to FlorenceRN"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-florence-teal px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-florence-teal-dark"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /></svg>
        Ask FlorenceRN
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-40 w-80 rounded-2xl border border-florence-line bg-white p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-florence-ink">FlorenceRN</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-florence-slate hover:text-florence-ink">✕</button>
          </div>

          <p className="mt-1 text-xs text-florence-slate">
            Ask about any question or topic - “why is the answer C?”, “prioritize these clients,” “explain SIADH.”
          </p>
          {seed && (
            <p className="mt-1 text-xs font-medium text-florence-teal-dark">
              Loaded this question - press Start, then ask your follow-up.
            </p>
          )}

          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className={`inline-block h-2 w-2 rounded-full ${active ? "bg-florence-teal" : connecting ? "bg-amber-400" : "bg-florence-line"}`} />
            <span className="text-florence-slate">
              {active ? (isSpeaking ? "FlorenceRN is speaking…" : "Listening…") : connecting ? "Connecting…" : "Not connected"}
            </span>
          </div>

          {error && <p className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700">{error}</p>}

          <div className="mt-3 flex gap-2">
            {!active ? (
              <button
                type="button"
                onClick={start}
                disabled={connecting}
                className="flex-1 rounded-lg bg-florence-teal px-3 py-2 text-sm font-semibold text-white transition hover:bg-florence-teal-dark disabled:opacity-60"
              >
                {connecting ? "Connecting…" : "Start talking"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setMuted(!isMuted)}
                  className="rounded-lg border border-florence-line px-3 py-2 text-sm font-semibold text-florence-slate transition hover:border-florence-teal"
                >
                  {isMuted ? "Unmute" : "Mute"}
                </button>
                <button
                  type="button"
                  onClick={endSession}
                  className="flex-1 rounded-lg bg-florence-ink px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  End
                </button>
              </>
            )}
          </div>

          <p className="mt-3 text-[10px] leading-snug text-florence-slate">
            Teaches NCLEX reasoning. Not medical advice. Microphone access required.
          </p>
        </div>
      )}
    </>
  );
}
