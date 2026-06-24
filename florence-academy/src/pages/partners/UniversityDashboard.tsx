import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BAND_HEX,
  BAND_LABEL,
  fetchUniversityOverview,
  needLabel,
  partnerConnect,
  partnerDisconnect,
  partnerSession,
  PartnerError,
  type Band,
  type UniversityOverview,
} from "../../lib/partnerApi";

/**
 * University partner dashboard - program-level readiness distribution, top gaps,
 * and an education-only funnel. NO financial, ARR, employer, or visa fields ever
 * appear here. Mission alignment: even students who don't migrate become stronger
 * nurses at home.
 */
export default function UniversityDashboard() {
  const [status, setStatus] = useState<"checking" | "disconnected" | "loading" | "ready" | "error">("checking");
  const [overview, setOverview] = useState<UniversityOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      setOverview(await fetchUniversityOverview());
      setStatus("ready");
    } catch (e) {
      if (e instanceof PartnerError && e.status === 401) {
        partnerDisconnect("university");
        setStatus("disconnected");
        return;
      }
      setError(e instanceof Error ? e.message : "Failed to load");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (partnerSession("university").token) void load();
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
              FlorenceRN · University Partner
            </p>
            <h1 className="font-serif text-2xl font-semibold text-white">Program readiness overview</h1>
            <p className="text-sm text-white/50">Stronger nurses, whether they migrate or not</p>
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
                partnerDisconnect("university");
                setStatus("disconnected");
                setOverview(null);
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

        {status === "ready" && overview && <Dashboard o={overview} />}
      </div>
    </Frame>
  );
}

function Dashboard({ o }: { o: UniversityOverview }) {
  const bandData = (["green", "yellow", "orange", "red", "none"] as Band[]).map((b) => ({
    name: BAND_LABEL[b],
    band: b,
    value: o.band_counts[b],
  }));

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Students activated" value={String(o.candidates)} />
        <Metric label="Assessed" value={String(o.assessed)} />
        <Metric label="Avg readiness" value={o.avg_readiness != null ? `${Math.round(o.avg_readiness * 100)}%` : "-"} />
        <Metric label="Avg sections" value={`${o.avg_sections_completed} / ${o.sections_total}`} accent />
      </div>

      <Panel title="Readiness distribution" subtitle="Latest assessment per student">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={bandData} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
            <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={48} />
            <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff", fontSize: 12 }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {bandData.map((d, i) => (
                <Cell key={i} fill={BAND_HEX[d.band]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Education funnel" subtitle="Registered → assessed → readiness-cleared">
        <div className="grid grid-cols-3 gap-3">
          <Funnel label="Registered" value={o.funnel.registered} />
          <Funnel label="Assessed" value={o.funnel.assessed} />
          <Funnel label="Readiness-cleared" value={o.funnel.readiness_cleared} accent />
        </div>
      </Panel>

      <Panel title="Top cohort weaknesses" subtitle="Where to focus next">
        {o.top_gaps.length === 0 ? (
          <p className="text-sm text-white/40">Not enough data yet.</p>
        ) : (
          <ol className="space-y-2">
            {o.top_gaps.map((g, i) => (
              <li key={g.client_need} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                <span className="text-sm text-white/85">
                  {i + 1}. {needLabel(g.client_need)}
                </span>
                <span className="text-sm tabular-nums text-white/60">{Math.round(g.mean_score * 100)}%</span>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <p className="pb-10 text-xs leading-relaxed text-white/40">
        Education readiness only. No financial, employer, visa, or pathway data crosses this surface.
      </p>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-florence-teal/40 bg-florence-teal/10" : "border-white/10 bg-white/[0.03]"}`}>
      <p className={`text-2xl font-semibold tabular-nums ${accent ? "text-florence-teal" : "text-white"}`}>{value}</p>
      <p className="mt-0.5 text-xs font-medium text-white/60">{label}</p>
    </div>
  );
}

function Funnel({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
      <p className={`text-2xl font-semibold tabular-nums ${accent ? "text-florence-teal" : "text-white"}`}>{value}</p>
      <p className="text-[11px] text-white/50">{label}</p>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
      </div>
      {children}
    </section>
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
      await partnerConnect("university", base.trim(), clientId.trim(), secret);
      onConnected();
    } catch (err) {
      setError(err instanceof PartnerError ? err.message : "Connection failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[80vh] max-w-md place-items-center px-5">
      <form onSubmit={onSubmit} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-florence-teal">FlorenceRN · University</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-white">Sign in</h1>
        <p className="mt-1 text-sm text-white/50">Read-only program overview · education readiness only.</p>
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
