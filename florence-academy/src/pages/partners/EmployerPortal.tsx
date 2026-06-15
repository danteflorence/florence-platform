import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  BAND_HEX,
  BAND_LABEL,
  fetchEmployerCandidates,
  issueOffer,
  needLabel,
  partnerConnect,
  partnerDisconnect,
  partnerSession,
  PartnerError,
  type InterviewPacket,
} from "../../lib/partnerApi";

/**
 * Employer portal — readiness-cleared interview packets only. Education
 * readiness, strengths, gaps — NEVER deposits, ARR, financing, or visa detail.
 * Internal-only credentials entered at runtime (session storage), never bundled.
 */
export default function EmployerPortal() {
  const [status, setStatus] = useState<"checking" | "disconnected" | "loading" | "ready" | "error">("checking");
  const [packets, setPackets] = useState<InterviewPacket[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      setPackets(await fetchEmployerCandidates());
      setStatus("ready");
    } catch (e) {
      if (e instanceof PartnerError && e.status === 401) {
        partnerDisconnect("employer");
        setStatus("disconnected");
        return;
      }
      setError(e instanceof Error ? e.message : "Failed to load");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (partnerSession("employer").token) void load();
    else setStatus("disconnected");
  }, [load]);

  if (status === "disconnected")
    return (
      <Frame>
        <ConnectForm onConnected={() => void load()} />
      </Frame>
    );

  return (
    <Frame>
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-florence-teal">
              FlorenceRN · Employer Portal
            </p>
            <h1 className="font-serif text-2xl font-semibold text-white">Interview-day candidates</h1>
            <p className="text-sm text-white/50">Readiness-cleared nurses · education readiness only</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10"
            >
              ↻ Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                partnerDisconnect("employer");
                setStatus("disconnected");
                setPackets([]);
              }}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/60 hover:bg-white/10"
            >
              Disconnect
            </button>
          </div>
        </div>

        {status === "loading" && <p className="mt-10 animate-pulse text-sm text-white/60">Loading…</p>}
        {status === "error" && (
          <p className="mt-10 rounded-lg bg-vital-danger/15 px-4 py-3 text-sm text-vital-danger">{error}</p>
        )}

        {status === "ready" && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packets.length === 0 ? (
              <p className="col-span-full text-sm text-white/50">No readiness-cleared candidates yet.</p>
            ) : (
              packets.map((p) => <PacketCard key={p.candidate_id} packet={p} />)
            )}
          </div>
        )}

        <p className="mt-10 pb-10 text-xs leading-relaxed text-white/40">
          Education readiness only — no financial, visa, or pathway detail. Contingent offers create an
          outcome event for the production ledger.
        </p>
      </div>
    </Frame>
  );
}

function PacketCard({ packet }: { packet: InterviewPacket }) {
  const [busy, setBusy] = useState(false);
  const [offered, setOffered] = useState(false);

  async function offer() {
    setBusy(true);
    const ok = await issueOffer(packet.candidate_id, "offered");
    setOffered(ok);
    setBusy(false);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-white">{packet.full_name}</h3>
          {packet.country && <p className="text-xs text-white/40">{packet.country}</p>}
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/85"
          title="Readiness band"
        >
          <span className="h-2 w-2 rounded-full" style={{ background: BAND_HEX[packet.band] }} />
          {BAND_LABEL[packet.band]}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <Metric label="Projected pass" value={packet.readiness != null ? `${Math.round(packet.readiness * 100)}%` : "—"} />
        <Metric label="Sections" value={`${packet.sections_completed} / ${packet.sections_total}`} />
      </div>

      {packet.strengths.length > 0 && (
        <ChipRow label="Strengths" items={packet.strengths.map(needLabel)} accent />
      )}
      {packet.focus_areas.length > 0 && (
        <ChipRow label="Focus areas" items={packet.focus_areas.map(needLabel)} />
      )}

      <button
        type="button"
        onClick={offer}
        disabled={busy || offered}
        className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
          offered ? "bg-vital-ok/20 text-vital-ok" : "bg-florence-teal text-florence-ink hover:bg-florence-teal/90"
        }`}
      >
        {offered ? "✓ Contingent offer sent" : busy ? "Sending…" : "Issue contingent offer"}
      </button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xl font-semibold tabular-nums text-white">{value}</p>
      <p className="text-[11px] text-white/50">{label}</p>
    </div>
  );
}

function ChipRow({ label, items, accent }: { label: string; items: string[]; accent?: boolean }) {
  return (
    <div className="mt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((x) => (
          <span
            key={x}
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              accent ? "bg-florence-teal/15 text-florence-teal" : "bg-white/[0.06] text-white/75"
            }`}
          >
            {x}
          </span>
        ))}
      </div>
    </div>
  );
}

function ConnectForm({ onConnected }: { onConnected: () => void }) {
  const [base, setBase] = useState("http://localhost:8088");
  const [clientId, setClientId] = useState("demo-crm");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await partnerConnect("employer", base.trim(), clientId.trim(), secret);
      onConnected();
    } catch (err) {
      setError(err instanceof PartnerError ? err.message : "Connection failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[80vh] max-w-md place-items-center px-5">
      <form onSubmit={onSubmit} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-florence-teal">FlorenceRN · Employer</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-white">Sign in</h1>
        <p className="mt-1 text-sm text-white/50">Read-only access to readiness-cleared interview packets.</p>
        <div className="mt-5 space-y-3">
          <Field label="API base URL"><input value={base} onChange={(e) => setBase(e.target.value)} className="ops-input" /></Field>
          <Field label="Client ID"><input value={clientId} onChange={(e) => setClientId(e.target.value)} className="ops-input" /></Field>
          <Field label="Client secret"><input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} className="ops-input" placeholder="••••••••" /></Field>
          {error && <p className="rounded-lg bg-vital-danger/15 px-3 py-2 text-sm text-vital-danger">{error}</p>}
          <button type="submit" disabled={busy || !secret} className="w-full rounded-xl bg-florence-teal px-5 py-2.5 text-sm font-semibold text-florence-ink hover:bg-florence-teal/90 disabled:opacity-50">
            {busy ? "Connecting…" : "Connect"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-white/60">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-florence-ink">{children}</div>;
}
