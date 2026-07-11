// ───────────────────────────────────────────────────────────────────────────
// Scenario Studio - the instructor authoring tool. Turn a purchased or
// home-grown scenario document into a working Florence simulation:
//
//   paste/upload the scenario text → "Draft it" (ingest into our schema) →
//   edit the JSON with LIVE validation → play-test it right here →
//   save as a draft → submit for clinical review → approve.
//
// INTERNAL. Reuses the instructor M2M session (cohorts:write). The heavy
// question bank is never loaded here; a play-test renders the pure engine
// directly on the edited scenario, so authors see exactly what a learner will.
//
// PDF/DOCX auto-extraction (pdf.js / mammoth) is a marked follow-up; v1 accepts
// pasted text and .txt uploads, which already closes the authoring loop.
// ───────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  authorTurn,
  ingestScenario,
  instructorConnect,
  instructorSession,
  InstructorError,
  listScenarios,
  requestRender,
  saveScenario,
  setScenarioStatus,
  type AuthoredScenarioRow,
  type AuthorSlot,
} from "../../lib/instructorApi";
import { validateScenario } from "../../data/vpatient/validate";
import { toUnrealManifest } from "../../lib/vpatient/unrealManifest";
import ReviewPacket from "../../components/vpatient/ReviewPacket";
import type { VPatientScenario } from "../../data/vpatient/types";
import { CLIENT_NEEDS } from "../../data/blueprint";
import { SimRunner } from "../VPatientSim";

export default function ScenarioStudio() {
  const [connected, setConnected] = useState(() => Boolean(instructorSession().token));
  if (!connected) return <ConnectGate onConnected={() => setConnected(true)} />;
  return <Studio />;
}

function ConnectGate({ onConnected }: { onConnected: () => void }) {
  const [base, setBase] = useState("");
  const [clientId, setClientId] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid min-h-screen place-items-center bg-florence-mist px-5">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await instructorConnect(base.trim(), clientId.trim(), secret);
            onConnected();
          } catch (err) {
            setError(err instanceof InstructorError ? err.message : "Connection failed");
          } finally {
            setBusy(false);
          }
        }}
        className="w-full max-w-sm rounded-2xl border border-florence-line bg-white p-6"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-florence-slate">Scenario Studio</p>
        <h1 className="mt-1 text-lg font-semibold">Sign in to author</h1>
        <p className="mt-1 text-sm text-florence-slate">Your operator API client. The token stays in this tab only.</p>
        <input value={base} onChange={(e) => setBase(e.target.value)} placeholder="http://localhost:8088" className="mt-4 w-full rounded-md border border-florence-line px-3 py-2 text-sm" />
        <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="instructor-client-id" className="mt-2 w-full rounded-md border border-florence-line px-3 py-2 text-sm" />
        <input value={secret} onChange={(e) => setSecret(e.target.value)} type="password" placeholder="••••••••" className="mt-2 w-full rounded-md border border-florence-line px-3 py-2 text-sm" />
        {error && <p className="mt-2 text-sm text-vital-danger">{error}</p>}
        <button disabled={busy} className="mt-4 w-full rounded-md bg-florence-teal px-4 py-2 text-sm font-semibold text-white hover:bg-florence-teal-dark disabled:opacity-50">
          {busy ? "Connecting…" : "Connect"}
        </button>
        <Link to="/instructor" className="mt-3 block text-center text-xs font-medium text-florence-slate">← Instructor console</Link>
      </form>
    </div>
  );
}

const STARTER = "";

function Studio() {
  // Source-doc panel
  const [title, setTitle] = useState("");
  const [clientNeed, setClientNeed] = useState<string>("physiological-adaptation");
  const [docText, setDocText] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [ingestNotes, setIngestNotes] = useState<string[]>([]);
  // Editor
  const [json, setJson] = useState<string>(STARTER);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [mine, setMine] = useState<AuthoredScenarioRow[]>([]);
  const [mode, setMode] = useState<"document" | "converse">("document");
  // Conversational authoring
  const [chat, setChat] = useState<{ role: "you" | "assistant"; text: string }[]>([
    { role: "assistant", text: "Let's build a scenario together. What should we call it - what's the condition or situation?" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [filled, setFilled] = useState<AuthorSlot[]>([]);
  const [talking, setTalking] = useState(false);

  const sendTurn = async () => {
    const msg = chatInput.trim();
    if (!msg || talking) return;
    setChatInput("");
    setChat((c) => [...c, { role: "you", text: msg }]);
    setTalking(true);
    try {
      let draftObj: Record<string, unknown> | null = null;
      try {
        draftObj = json.trim() ? (JSON.parse(json) as Record<string, unknown>) : null;
      } catch {
        draftObj = null;
      }
      const res = await authorTurn({ message: msg, filled, draft: draftObj });
      setChat((c) => [...c, { role: "assistant", text: res.reply }]);
      setFilled(res.filled);
      setJson(JSON.stringify(res.draft, null, 2));
    } catch (e) {
      setChat((c) => [...c, { role: "assistant", text: e instanceof InstructorError ? e.message : "The assistant hit an error." }]);
    } finally {
      setTalking(false);
    }
  };

  const refreshMine = useCallback(async () => {
    try {
      setMine(await listScenarios());
    } catch {
      /* best-effort */
    }
  }, []);
  useEffect(() => {
    void refreshMine();
  }, [refreshMine]);

  // Live validation: parse the JSON, run the same validator the engine trusts.
  const { parsed, errors, parseError } = useMemo(() => {
    if (!json.trim()) return { parsed: null, errors: [] as string[], parseError: null as string | null };
    let obj: unknown;
    try {
      obj = JSON.parse(json);
    } catch (e) {
      return { parsed: null, errors: [], parseError: e instanceof Error ? e.message : "Invalid JSON" };
    }
    try {
      const errs = validateScenario(obj as VPatientScenario);
      return { parsed: obj as VPatientScenario, errors: errs, parseError: null };
    } catch (e) {
      return { parsed: null, errors: [], parseError: e instanceof Error ? e.message : "Not a scenario" };
    }
  }, [json]);
  const valid = parsed !== null && errors.length === 0;

  const draftIt = async () => {
    if (docText.trim().length < 20) {
      setError("Paste at least a paragraph of the scenario document first.");
      return;
    }
    setIngesting(true);
    setError(null);
    try {
      const res = await ingestScenario({ text: docText, title: title.trim() || undefined, clientNeed });
      setJson(JSON.stringify(res.scenario, null, 2));
      setIngestNotes(res.notes);
      setSavedMsg(null);
    } catch (e) {
      setError(e instanceof InstructorError ? e.message : "Draft failed");
    } finally {
      setIngesting(false);
    }
  };

  const [extracting, setExtracting] = useState(false);
  const onFile = async (file: File) => {
    setError(null);
    setExtracting(true);
    try {
      const { extractDocumentText } = await import("../../lib/vpatient/docExtract");
      const res = await extractDocumentText(file);
      setDocText(res.text);
      if (!title.trim()) setTitle(file.name.replace(/\.(pdf|docx?|txt)$/i, ""));
      if (res.notes.length) setIngestNotes(res.notes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setExtracting(false);
    }
  };

  const save = async (status?: string) => {
    if (!parsed) return;
    setError(null);
    try {
      const row = await saveScenario(parsed, status);
      setSavedMsg(`Saved "${row.title}" (${row.status}).`);
      void refreshMine();
    } catch (e) {
      setError(e instanceof InstructorError ? e.message : "Save failed");
    }
  };

  const approve = async (id: string) => {
    try {
      await setScenarioStatus(id, "approved");
      void refreshMine();
    } catch (e) {
      setError(e instanceof InstructorError ? e.message : "Status change failed");
    }
  };

  const requestRenderFor = async (row: AuthoredScenarioRow) => {
    setError(null);
    try {
      const manifest = toUnrealManifest(row.scenario as VPatientScenario);
      const { render_state } = await requestRender(row.id, manifest);
      setSavedMsg(`3D render ${render_state} for "${row.title}". The 2D sim is already playable.`);
      void refreshMine();
    } catch (e) {
      setError(e instanceof InstructorError ? e.message : "Render request failed");
    }
  };

  return (
    <div className="min-h-screen bg-florence-mist">
      <header className="border-b border-florence-line bg-white px-5 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-florence-slate">Scenario Studio</p>
            <h1 className="text-lg font-semibold">Author a virtual-patient simulation</h1>
          </div>
          <Link to="/instructor" className="text-sm font-medium text-florence-slate">← Console</Link>
        </div>
      </header>

      {/* Mode toggle */}
      <div className="mx-auto max-w-6xl px-5 pt-4">
        <div className="inline-flex overflow-hidden rounded-lg border border-florence-line text-sm">
          {(["document", "converse"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 font-semibold ${mode === m ? "bg-florence-teal text-white" : "bg-white text-florence-slate hover:bg-florence-mist"}`}
            >
              {m === "document" ? "From a document" : "Talk it through"}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-5 p-5 lg:grid-cols-2">
        {/* LEFT: source doc → draft, OR conversational author */}
        <div className="space-y-4">
          {mode === "converse" && (
            <div className="rounded-2xl border border-florence-line bg-white p-4">
              <p className="text-sm font-semibold">Talk it through</p>
              <p className="mt-1 text-xs text-florence-slate">
                Describe the scenario in plain language. I'll ask one thing at a time and build the
                draft on the right as we go.
              </p>
              {/* Completeness checklist */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(["title", "setting", "patient", "presentation", "vitals", "priority", "escalation"] as AuthorSlot[]).map((s) => (
                  <span key={s} className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${filled.includes(s) ? "bg-vital-ok/15 text-emerald-800" : "bg-florence-mist text-florence-slate"}`}>
                    {filled.includes(s) ? "✓ " : ""}{s}
                  </span>
                ))}
              </div>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-lg bg-florence-mist/40 p-3">
                {chat.map((m, i) => (
                  <div key={i} className={m.role === "you" ? "text-right" : ""}>
                    <span className={`inline-block max-w-[85%] rounded-2xl px-3 py-1.5 text-sm ${m.role === "you" ? "bg-florence-indigo text-white" : "bg-white text-florence-ink"}`}>
                      {m.text}
                    </span>
                  </div>
                ))}
                {talking && <p className="text-xs italic text-florence-slate">thinking…</p>}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void sendTurn()}
                  placeholder="Type your answer…"
                  className="flex-1 rounded-md border border-florence-line px-3 py-2 text-sm"
                />
                <button onClick={sendTurn} disabled={talking} className="rounded-md bg-florence-teal px-4 py-2 text-sm font-semibold text-white hover:bg-florence-teal-dark disabled:opacity-50">Send</button>
              </div>
            </div>
          )}

          {mode === "document" && (
          <div className="rounded-2xl border border-florence-line bg-white p-4">
            <p className="text-sm font-semibold">1. Start from a document</p>
            <p className="mt-1 text-xs text-florence-slate">
              Upload a PDF or Word document (or paste the text). We draft it into an editable
              simulation - you refine and validate it before anyone runs it.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Scenario title" className="rounded-md border border-florence-line px-3 py-2 text-sm" />
              <select value={clientNeed} onChange={(e) => setClientNeed(e.target.value)} className="rounded-md border border-florence-line px-3 py-2 text-sm">
                {CLIENT_NEEDS.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
            <textarea
              value={docText}
              onChange={(e) => setDocText(e.target.value)}
              placeholder="Paste the scenario document text here…"
              rows={8}
              className="mt-2 w-full rounded-md border border-florence-line px-3 py-2 font-mono text-xs"
            />
            <div className="mt-2 flex items-center gap-2">
              <button onClick={draftIt} disabled={ingesting} className="rounded-md bg-florence-teal px-4 py-2 text-sm font-semibold text-white hover:bg-florence-teal-dark disabled:opacity-50">
                {ingesting ? "Drafting…" : "Draft it →"}
              </button>
              <label className="cursor-pointer rounded-md border border-florence-line px-3 py-2 text-xs font-medium text-florence-slate hover:bg-florence-mist">
                {extracting ? "Reading…" : "Upload PDF / Word / .txt"}
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  className="hidden"
                  disabled={extracting}
                  onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])}
                />
              </label>
            </div>
            {ingestNotes.length > 0 && (
              <ul className="mt-2 space-y-1 rounded-lg bg-florence-mist/60 p-2 text-[11px] text-florence-slate">
                {ingestNotes.map((n, i) => <li key={i}>• {n}</li>)}
              </ul>
            )}
          </div>
          )}

          {/* My scenarios */}
          <div className="rounded-2xl border border-florence-line bg-white p-4">
            <p className="text-sm font-semibold">Your scenarios</p>
            {mine.length === 0 ? (
              <p className="mt-1 text-xs text-florence-slate">None yet. Draft one and save it.</p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {mine.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-florence-line px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${s.status === "approved" ? "bg-vital-ok/15 text-emerald-800" : "bg-florence-mist text-florence-slate"}`}>{s.status}</span>
                    <button onClick={() => setJson(JSON.stringify(s.scenario, null, 2))} className="shrink-0 text-xs font-semibold text-florence-teal-dark">Load</button>
                    {s.status !== "approved" ? (
                      <button onClick={() => approve(s.id)} className="shrink-0 text-xs font-semibold text-florence-indigo">Approve</button>
                    ) : s.render_state === "ready" ? (
                      <span className="shrink-0 text-[10px] font-bold uppercase text-emerald-700">3D ready</span>
                    ) : s.render_state === "queued" ? (
                      <span className="shrink-0 text-[10px] font-bold uppercase text-amber-700">3D queued</span>
                    ) : (
                      <button onClick={() => requestRenderFor(s)} className="shrink-0 text-xs font-semibold text-florence-indigo">Build 3D</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: editor + validation + actions */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-florence-line bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">2. Edit + validate</p>
              {json.trim() && (
                parseError ? (
                  <span className="rounded-full bg-vital-danger/15 px-2.5 py-0.5 text-xs font-bold text-red-800">JSON error</span>
                ) : valid ? (
                  <span className="rounded-full bg-vital-ok/15 px-2.5 py-0.5 text-xs font-bold text-emerald-800">Valid ✓</span>
                ) : (
                  <span className="rounded-full bg-vital-warn/15 px-2.5 py-0.5 text-xs font-bold text-amber-800">{errors.length} to fix</span>
                )
              )}
            </div>
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              placeholder="Draft a scenario on the left, or paste scenario JSON here…"
              rows={18}
              spellCheck={false}
              className="mt-2 w-full rounded-md border border-florence-line px-3 py-2 font-mono text-[11px] leading-relaxed"
            />
            {parseError && <p className="mt-2 text-xs text-vital-danger">JSON: {parseError}</p>}
            {!parseError && errors.length > 0 && (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg bg-amber-50 p-2 text-[11px] text-amber-900">
                {errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            )}
            {error && <p className="mt-2 text-sm text-vital-danger">{error}</p>}
            {savedMsg && <p className="mt-2 text-sm text-emerald-700">{savedMsg}</p>}

            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setPlaying(true)} disabled={!valid} className="rounded-md bg-florence-indigo px-4 py-2 text-sm font-semibold text-white hover:bg-florence-indigo-dark disabled:opacity-50">
                Play-test →
              </button>
              <button onClick={() => save()} disabled={!parsed} className="rounded-md border border-florence-line px-4 py-2 text-sm font-semibold text-florence-ink hover:bg-florence-mist disabled:opacity-50">
                Save draft
              </button>
              <button onClick={() => setReviewing(true)} disabled={!valid} className="rounded-md border border-florence-line px-4 py-2 text-sm font-semibold text-florence-ink hover:bg-florence-mist disabled:opacity-50">
                Review packet
              </button>
              <button onClick={() => save("sme_reviewed")} disabled={!valid} className="rounded-md border border-florence-line px-4 py-2 text-sm font-semibold text-florence-ink hover:bg-florence-mist disabled:opacity-50">
                Submit for review
              </button>
            </div>
            <p className="mt-2 text-[11px] text-florence-slate/80">
              Learners only ever run <strong>approved</strong> scenarios. Play-test as much as you like - it never saves.
            </p>
          </div>
        </div>
      </div>

      {/* Review packet overlay - the human-readable SME one-pager */}
      {reviewing && parsed && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
          <div className="mx-auto max-w-2xl rounded-2xl bg-white p-5 shadow-card-lg">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Review packet — for the SME</span>
              <button onClick={() => setReviewing(false)} className="rounded-md border border-florence-line px-3 py-1.5 text-sm font-semibold text-florence-ink hover:bg-florence-mist">Close</button>
            </div>
            <ReviewPacket scenario={parsed} />
          </div>
        </div>
      )}

      {/* Play-test overlay - the pure engine on the edited scenario */}
      {playing && parsed && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-florence-mist">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-florence-line bg-white px-4 py-2">
            <span className="text-sm font-semibold">Play-test · {parsed.title}</span>
            <button onClick={() => setPlaying(false)} className="rounded-md border border-florence-line px-3 py-1.5 text-sm font-semibold text-florence-ink hover:bg-florence-mist">Close</button>
          </div>
          <SimRunner key={json} base={parsed} />
        </div>
      )}
    </div>
  );
}
