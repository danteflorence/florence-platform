import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchLead,
  fetchLeadRollup,
  fetchLeads,
  fetchRecentLeadEvents,
  OpsError,
  type OpsLead,
  type OpsLeadEvent,
  type OpsLeadFilters,
  type OpsLeadRollup,
} from "../../lib/opsApi";

/**
 * Florence core nurse pipeline mirror - the ops view.
 *
 * This is operator-only data. Never returned in any public endpoint, never
 * shown in the candidate-facing app. The page lets you:
 *   1. See the rollup (total + by country/type/nclex/application status).
 *   2. Search + filter the lead list.
 *   3. Drill down into a single lead's event timeline ("Authorized →
 *      Passed on 2026-05-30").
 *   4. Scan the recent-changes feed across the whole population - useful
 *      after each weekly import to see what moved.
 */
export default function LeadsPanel() {
  const [rollup, setRollup] = useState<OpsLeadRollup | null>(null);
  const [recent, setRecent] = useState<OpsLeadEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<OpsLeadFilters>({});
  const [leads, setLeads] = useState<OpsLead[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);

  const [selected, setSelected] = useState<{ lead: OpsLead; events: OpsLeadEvent[] } | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [r, ev] = await Promise.all([fetchLeadRollup(), fetchRecentLeadEvents(undefined, 50)]);
        setRollup(r);
        setRecent(ev);
      } catch (e) {
        setError(e instanceof OpsError ? e.message : "Failed to load leads.");
      }
    })();
  }, []);

  const load = useCallback(
    async (reset: boolean) => {
      setBusy(true);
      setError(null);
      try {
        const next = await fetchLeads(filters, reset ? undefined : cursor ?? undefined, 100);
        setLeads((prev) => (reset ? next.data : [...prev, ...next.data]));
        setCursor(next.next_cursor);
        setHasMore(!!next.next_cursor);
      } catch (e) {
        setError(e instanceof OpsError ? e.message : "Lead list failed.");
      } finally {
        setBusy(false);
      }
    },
    [filters, cursor],
  );

  // Re-fetch the first page whenever filters change.
  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.country, filters.type, filters.nclex_status, filters.application_status, filters.q]);

  async function openLead(id: string) {
    setSelectedLoading(true);
    try {
      const detail = await fetchLead(id);
      setSelected(detail);
    } catch (e) {
      setError(e instanceof OpsError ? e.message : "Lead detail failed.");
    } finally {
      setSelectedLoading(false);
    }
  }

  const countryOptions = useMemo(() => {
    if (!rollup) return [];
    return Object.entries(rollup.by_country)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => ({ value: k, label: `${k} (${n.toLocaleString()})` }));
  }, [rollup]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-vital-danger/30 bg-vital-danger/5 px-4 py-3 text-sm text-white">
          {error}
        </div>
      )}

      {/* Rollup row */}
      {rollup && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <Metric label="Total leads" value={rollup.total.toLocaleString()} accent />
          <Metric
            label="NCLEX passed"
            value={(rollup.by_nclex_status["Passed"] ?? 0).toLocaleString()}
            sub={`of ${sumValues(rollup.by_nclex_status).toLocaleString()} statused`}
          />
          <Metric
            label="Authorized"
            value={(rollup.by_nclex_status["Authorized"] ?? 0).toLocaleString()}
            sub="cleared to test"
          />
          <Metric
            label="Accepted students"
            value={(rollup.by_application_status["accepted"] ?? 0).toLocaleString()}
            sub="Florence core"
          />
          <Metric
            label="Users in core"
            value={(rollup.by_type["User"] ?? 0).toLocaleString()}
            sub={`+${(rollup.by_type["Imported Lead"] ?? 0).toLocaleString()} imported`}
          />
        </section>
      )}

      {/* Filters */}
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Search">
            <input
              type="search"
              placeholder="email or name…"
              value={filters.q ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, q: e.target.value.length ? e.target.value : undefined }))
              }
              className="w-64 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-white/30 focus:border-florence-teal focus:outline-none"
            />
          </Field>
          <Field label="Country">
            <Select
              value={filters.country ?? ""}
              onChange={(v) => setFilters((f) => ({ ...f, country: v || undefined }))}
              options={[{ value: "", label: "Any country" }, ...countryOptions]}
            />
          </Field>
          <Field label="Type">
            <Select
              value={filters.type ?? ""}
              onChange={(v) =>
                setFilters((f) => ({ ...f, type: (v || undefined) as OpsLead["type"] }))
              }
              options={[
                { value: "", label: "Any type" },
                { value: "User", label: "User" },
                { value: "Student Lead", label: "Student Lead" },
                { value: "Imported Lead", label: "Imported Lead" },
              ]}
            />
          </Field>
          <Field label="NCLEX">
            <Select
              value={filters.nclex_status ?? ""}
              onChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  nclex_status: (v || undefined) as OpsLead["nclex_status"],
                }))
              }
              options={[
                { value: "", label: "Any" },
                { value: "Passed", label: "Passed" },
                { value: "Not Passed", label: "Not Passed" },
                { value: "Authorized", label: "Authorized" },
                { value: "Planned", label: "Planned" },
                { value: "Not_planned", label: "Not planned" },
              ]}
            />
          </Field>
          <Field label="Application">
            <Select
              value={filters.application_status ?? ""}
              onChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  application_status: (v || undefined) as OpsLead["application_status"],
                }))
              }
              options={[
                { value: "", label: "Any" },
                { value: "accepted", label: "Accepted" },
                { value: "applied_not_accepted", label: "Applied · not accepted" },
                { value: "draft", label: "Draft" },
                { value: "not_applied", label: "Not applied" },
              ]}
            />
          </Field>
          {hasFilters(filters) && (
            <button
              type="button"
              onClick={() => setFilters({})}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/70 hover:bg-white/10"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      {/* Roster */}
      <section className="rounded-xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">
          {leads.length.toLocaleString()} lead{leads.length === 1 ? "" : "s"}{" "}
          {hasMore && <span className="ml-1 text-xs text-white/50">(more available)</span>}
        </div>
        <ul className="divide-y divide-white/5">
          {leads.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => openLead(l.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {l.fullname || `${l.firstname ?? ""} ${l.lastname ?? ""}`.trim() || l.email}
                  </p>
                  <p className="truncate text-xs text-white/50">
                    {l.email}
                    {l.country ? ` · ${l.country}` : ""}
                    {l.assigned ? ` · ${l.assigned}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {l.type && <Pill tone="muted">{l.type}</Pill>}
                  {l.nclex_status && <Pill tone={nclexTone(l.nclex_status)}>{l.nclex_status}</Pill>}
                  {l.application_status === "accepted" && <Pill tone="good">Accepted</Pill>}
                </div>
              </button>
            </li>
          ))}
        </ul>
        {leads.length === 0 && !busy && (
          <p className="px-4 py-6 text-center text-sm text-white/50">No leads match these filters.</p>
        )}
        {hasMore && (
          <div className="border-t border-white/10 px-4 py-3 text-center">
            <button
              type="button"
              disabled={busy}
              onClick={() => void load(false)}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10 disabled:opacity-50"
            >
              {busy ? "Loading…" : "Load 100 more"}
            </button>
          </div>
        )}
      </section>

      {/* Recent events */}
      {recent && recent.length > 0 && (
        <section className="rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">
            Recent status changes
          </div>
          <ul className="divide-y divide-white/5">
            {recent.slice(0, 30).map((ev) => (
              <li key={ev.id} className="px-4 py-2 text-xs">
                <p className="text-white/70">
                  <span className="font-mono">{ev.occurred_at.slice(0, 19).replace("T", " ")}</span>{" "}
                  <span className="text-white/50">·</span>{" "}
                  <span className="font-semibold text-white">{ev.kind.replace("_", " ")}</span>{" "}
                  <span className="text-white/50">·</span>{" "}
                  <span className="text-white/70">{ev.source}</span>
                </p>
                {ev.after && (
                  <p className="mt-0.5 text-white/60">
                    {Object.entries(ev.after)
                      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                      .join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Drill-down modal */}
      {selected && (
        <LeadDetailModal
          detail={selected}
          loading={selectedLoading}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── Detail modal ─────────────────────────────────────────────────────────────
function LeadDetailModal({
  detail,
  loading,
  onClose,
}: {
  detail: { lead: OpsLead; events: OpsLeadEvent[] };
  loading: boolean;
  onClose: () => void;
}) {
  const { lead, events } = detail;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4">
      <div className="relative max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0a0d12] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-florence-teal">
              Lead detail
            </p>
            <h2 className="mt-1 font-serif text-xl font-semibold text-white">
              {lead.fullname || `${lead.firstname ?? ""} ${lead.lastname ?? ""}`.trim() || lead.email}
            </h2>
            <p className="mt-0.5 text-sm text-white/60">{lead.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-sm text-white/60 hover:bg-white/10"
          >
            Close
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <Row label="Country" v={lead.country} />
            <Row label="Phone" v={lead.phone} />
            <Row label="Type" v={lead.type} />
            <Row label="Assigned" v={lead.assigned} />
            <Row label="Job unit" v={lead.job_unit} />
            <Row label="NCLEX status" v={lead.nclex_status} />
            <Row label="Application status" v={lead.application_status} />
            <Row label="Evaluation status" v={lead.evaluation_status} />
            <Row
              label="Signed up to core"
              v={lead.signup_at?.slice(0, 10)}
            />
            <Row label="First seen here" v={lead.first_seen_at.slice(0, 10)} />
            <Row label="Last seen here" v={lead.last_seen_at.slice(0, 10)} />
            <Row label="Source" v={lead.source} />
          </dl>
          <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-florence-teal">
            Event timeline
          </h3>
          {loading && <p className="mt-2 text-sm text-white/50">Loading…</p>}
          {!loading && events.length === 0 && (
            <p className="mt-2 text-sm text-white/50">No events recorded.</p>
          )}
          <ol className="mt-3 space-y-2">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/80"
              >
                <p>
                  <span className="font-mono">{ev.occurred_at.slice(0, 19).replace("T", " ")}</span>{" "}
                  <span className="text-white/40">·</span>{" "}
                  <span className="font-semibold text-white">{ev.kind.replace("_", " ")}</span>{" "}
                  <span className="text-white/40">·</span>{" "}
                  <span className="text-white/60">{ev.source}</span>
                </p>
                {ev.before && Object.keys(ev.before).length > 0 && (
                  <p className="mt-1 text-white/50">
                    before: {Object.entries(ev.before).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")}
                  </p>
                )}
                {ev.after && Object.keys(ev.after).length > 0 && (
                  <p className="mt-0.5 text-white/70">
                    after: {Object.entries(ev.after).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────
function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        accent ? "border-florence-teal/40 bg-florence-teal/10" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-white/50">{sub}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white focus:border-florence-teal focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#0a0d12] text-white">
          {o.label}
        </option>
      ))}
    </select>
  );
}

const PILL_TONE: Record<string, string> = {
  good: "bg-vital-ok/15 text-vital-ok border-vital-ok/30",
  warn: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  bad: "bg-vital-danger/15 text-vital-danger border-vital-danger/30",
  muted: "bg-white/5 text-white/60 border-white/10",
};

function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: keyof typeof PILL_TONE }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${PILL_TONE[tone]}`}>
      {children}
    </span>
  );
}

function Row({ label, v }: { label: string; v?: string | null }) {
  return (
    <>
      <dt className="text-white/40">{label}</dt>
      <dd className="text-white/90">{v || <span className="text-white/30">-</span>}</dd>
    </>
  );
}

function nclexTone(s: OpsLead["nclex_status"]): keyof typeof PILL_TONE {
  if (s === "Passed") return "good";
  if (s === "Not Passed") return "bad";
  if (s === "Authorized" || s === "Planned") return "warn";
  return "muted";
}

function sumValues(o: Record<string, number>): number {
  return Object.values(o).reduce((a, b) => a + b, 0);
}

function hasFilters(f: OpsLeadFilters): boolean {
  return !!(f.country || f.type || f.nclex_status || f.application_status || f.q);
}
