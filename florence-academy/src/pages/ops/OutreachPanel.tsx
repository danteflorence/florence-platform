import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addCampaignTargets,
  approveActivation,
  createCampaign,
  fetchCampaign,
  fetchCampaigns,
  fetchSchoolReport,
  OpsError,
  previewMailpiece,
  sendCampaign,
  type AddTargetInput,
  type OpsCampaign,
  type OpsTarget,
  type OpsMailPiece,
  type SendInput,
  type SendResult,
} from "../../lib/opsApi";

/**
 * Outreach panel - Lob print + mail for partner outreach.
 *
 * Lifecycle:
 *   create campaign → add targets → preview a mailpiece → launch (test mode
 *   default; live mode requires explicit confirm with cost + count) →
 *   track piece status via Lob webhook → approve activations.
 *
 * The Lob API key is operator-supplied at launch time; it lives in this
 * tab's sessionStorage only. Switching test → live requires re-typing.
 */
export default function OutreachPanel() {
  const [campaigns, setCampaigns] = useState<OpsCampaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const list = await fetchCampaigns();
      setCampaigns(list);
      if (!selectedId && list.length > 0) setSelectedId(list[0].id);
    } catch (e) {
      setError(e instanceof OpsError ? e.message : "Failed to load campaigns.");
    }
  }, [selectedId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-vital-danger/30 bg-vital-danger/5 px-4 py-3 text-sm text-white">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="fl-eyebrow">Campaigns</p>
          {(campaigns ?? []).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                selectedId === c.id
                  ? "border-florence-teal bg-florence-teal/10 text-white"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
              title={`${c.kind} · ${c.mail_format} · ${c.status}`}
            >
              {c.name}{" "}
              <span className="ml-1 font-mono text-white/40">
                {c.totals.sent}/{c.totals.targets}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCreating((s) => !s)}
          className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10"
        >
          {creating ? "Cancel new" : "+ New campaign"}
        </button>
      </div>

      {creating && (
        <CreateCampaign
          onCreated={(c) => {
            setCreating(false);
            void refresh();
            setSelectedId(c.id);
          }}
        />
      )}

      {selectedId ? (
        <CampaignDetail key={selectedId} id={selectedId} onChanged={refresh} />
      ) : campaigns?.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center text-sm text-white/50">
          No campaigns yet. Hit <strong>+ New campaign</strong> to start one.
        </div>
      ) : null}
    </div>
  );
}

// ── Create form ─────────────────────────────────────────────────────────────
function CreateCampaign({ onCreated }: { onCreated: (c: OpsCampaign) => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<OpsCampaign["kind"]>("university");
  const [mailFormat, setMailFormat] = useState<OpsCampaign["mail_format"]>("postcard_6x11");
  const [theme, setTheme] = useState<OpsCampaign["theme"]>("teal");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim() || busy) return;
        setBusy(true);
        setError(null);
        try {
          const c = await createCampaign({
            name: name.trim(),
            kind,
            mail_format: mailFormat,
            theme,
            notes: notes.trim() || undefined,
          });
          onCreated(c);
        } catch (err) {
          setError(err instanceof OpsError ? err.message : "Create failed");
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
    >
      <p className="fl-eyebrow">New campaign</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q3 UK + PH universities"
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
            required
          />
        </Field>
        <Field label="Kind">
          <Select
            value={kind}
            onChange={(v) => setKind(v as OpsCampaign["kind"])}
            options={[
              { value: "university", label: "University" },
              { value: "nursing_association", label: "Nursing association" },
              { value: "employer", label: "Employer" },
              { value: "hospital", label: "Hospital" },
            ]}
          />
        </Field>
        <Field label="Format">
          <Select
            value={mailFormat}
            onChange={(v) => setMailFormat(v as OpsCampaign["mail_format"])}
            options={[
              { value: "postcard_6x11", label: "Postcard 6x11" },
              { value: "letter_us", label: "Letter (US, 8.5x11)" },
            ]}
          />
        </Field>
        <Field label="Theme">
          <Select
            value={theme}
            onChange={(v) => setTheme(v as OpsCampaign["theme"])}
            options={[
              { value: "teal", label: "Teal" },
              { value: "purple", label: "Purple" },
            ]}
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Notes (internal)">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
          />
        </Field>
      </div>
      {error && <p className="mt-3 text-sm text-vital-danger">{error}</p>}
      <div className="mt-4">
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-md bg-florence-teal px-4 py-1.5 text-sm font-semibold text-white hover:bg-florence-teal-dark disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create campaign"}
        </button>
      </div>
    </form>
  );
}

// ── Campaign detail (targets, preview, send) ────────────────────────────────
function CampaignDetail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const [data, setData] = useState<
    { campaign: OpsCampaign; targets: OpsTarget[]; pieces: OpsMailPiece[] } | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<{
    front: string;
    back: string;
    activation_url: string;
  } | null>(null);
  const [tone, setTone] = useState<"quote" | "market">("market");
  const [adding, setAdding] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [lastSend, setLastSend] = useState<SendResult | null>(null);

  const refresh = useCallback(async () => {
    try {
      const d = await fetchCampaign(id);
      setData(d);
      if (previewing) {
        const stillThere = d.targets.find((t) => t.id === previewing);
        if (!stillThere) setPreviewing(null);
      }
    } catch (e) {
      setError(e instanceof OpsError ? e.message : "Load failed");
    }
  }, [id, previewing]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pieceByTarget = useMemo(() => {
    const m = new Map<string, OpsMailPiece>();
    for (const p of data?.pieces ?? []) m.set(p.target_id, p);
    return m;
  }, [data]);

  if (!data) return <p className="animate-pulse text-sm text-white/50">Loading campaign…</p>;
  const { campaign, targets } = data;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="fl-eyebrow">{campaign.kind} · {campaign.mail_format}</p>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-white">
              {campaign.name}
            </h2>
            {campaign.notes && (
              <p className="mt-1 text-sm text-white/60">{campaign.notes}</p>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Stat label="Targets" value={campaign.totals.targets} />
            <Stat label="Sent" value={campaign.totals.sent} />
            <Stat label="Delivered" value={campaign.totals.delivered} />
            <Stat label="Activated" value={campaign.totals.activated} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="fl-eyebrow">Targets ({targets.length})</p>
        <div className="flex items-center gap-2">
          <ToneToggle value={tone} onChange={setTone} />
          <button
            type="button"
            onClick={() => setAdding((s) => !s)}
            className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
          >
            {adding ? "Cancel add" : "+ Add targets"}
          </button>
          <button
            type="button"
            disabled={targets.filter((t) => t.status === "queued" || t.status === "rendered").length === 0}
            onClick={() => setLaunching(true)}
            className="rounded-md bg-florence-indigo px-3 py-1.5 text-sm font-semibold text-white hover:bg-florence-indigo-dark disabled:opacity-50"
          >
            Launch via Lob →
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-vital-danger">{error}</p>}

      {adding && (
        <AddTargets
          campaignId={id}
          onAdded={() => {
            setAdding(false);
            void refresh();
            onChanged();
          }}
        />
      )}

      {/* Targets table */}
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-white/40">
            <tr>
              <th className="px-3 py-2">Organization</th>
              <th className="px-3 py-2">City</th>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {targets.map((t) => {
              const piece = pieceByTarget.get(t.id);
              return (
                <tr key={t.id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-2 text-white">
                    {t.org_name}
                    {t.recipient_title && (
                      <span className="ml-1 text-xs text-white/40">· {t.recipient_title}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-white/60">
                    {t.city}, {t.country}
                  </td>
                  <td className="px-3 py-2 font-mono text-white/80">{t.activation_code}</td>
                  <td className="px-3 py-2">
                    <StatusPill status={t.status} mode={piece?.mode} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={async () => {
                        setPreviewing(t.id);
                        setPreviewHtml(null);
                        try {
                          const p = await previewMailpiece(id, t.id, tone);
                          setPreviewHtml(p);
                        } catch (e) {
                          setError(e instanceof OpsError ? e.message : "Preview failed");
                        }
                      }}
                      className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80 hover:bg-white/10"
                    >
                      Preview
                    </button>
                    {t.status === "delivered" && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await approveActivation(t.activation_code);
                            void refresh();
                            onChanged();
                          } catch (e) {
                            setError(e instanceof OpsError ? e.message : "Approve failed");
                          }
                        }}
                        className="ml-1.5 rounded bg-vital-ok/20 px-2.5 py-1 text-xs font-semibold text-vital-ok hover:bg-vital-ok/30"
                      >
                        Mark activated
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {targets.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-white/50">
                  No targets yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {lastSend && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="fl-eyebrow text-florence-teal">
            Last launch ({lastSend.mode} mode) · {lastSend.results.length} pieces
          </p>
          <ul className="mt-2 space-y-1 text-xs text-white/70">
            {lastSend.results.map((r) => (
              <li key={r.target_id}>
                {r.ok ? "✓" : "✗"} {r.target_id}{" "}
                {r.lob_id ? <span className="font-mono text-white/40">{r.lob_id}</span> : ""}
                {r.error && <span className="ml-1 text-vital-danger">- {r.error}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {previewing && previewHtml && (
        <PreviewModal
          html={previewHtml}
          onClose={() => {
            setPreviewing(null);
            setPreviewHtml(null);
          }}
        />
      )}

      {launching && (
        <LaunchModal
          campaign={campaign}
          targets={targets.filter((t) => t.status === "queued" || t.status === "rendered")}
          tone={tone}
          onCancel={() => setLaunching(false)}
          onDone={(result) => {
            setLastSend(result);
            setLaunching(false);
            void refresh();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/10 px-3 py-2">
      <p className="font-mono text-lg font-semibold text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}

// ── Target picker (paste TSV or pick from /v1/schools) ──────────────────────
function AddTargets({
  campaignId,
  onAdded,
}: {
  campaignId: string;
  onAdded: () => void;
}) {
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ added: number; errors: { index: number; message: string }[] } | null>(
    null,
  );
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="fl-eyebrow">Add targets</p>
      <p className="mt-1 text-xs text-white/50">
        Paste one target per line. Columns separated by TAB or 4+ spaces:
        <br />
        <code className="font-mono text-white/70">
          school_slug{"\t"}org_name{"\t"}recipient_title{"\t"}address_line1{"\t"}city{"\t"}postal{"\t"}country
        </code>
      </p>
      <textarea
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        placeholder={"FLR-UK-EDINBURGH\tUniversity of Edinburgh\tDean of Nursing\tOld College, South Bridge\tEdinburgh\tEH8 9YL\tUnited Kingdom"}
        rows={5}
        className="mt-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white"
      />
      {error && <p className="mt-2 text-sm text-vital-danger">{error}</p>}
      {result && (
        <p className="mt-2 text-xs text-white/60">
          Added {result.added}. Errors: {result.errors.length}.
        </p>
      )}
      <div className="mt-3">
        <button
          type="button"
          disabled={busy || !paste.trim()}
          onClick={async () => {
            setBusy(true);
            setError(null);
            setResult(null);
            try {
              const targets = parsePaste(paste);
              if (targets.length === 0) {
                setError("No rows parsed. Check the format.");
                return;
              }
              const r = await addCampaignTargets(campaignId, targets);
              setResult({ added: r.added, errors: r.errors });
              if (r.errors.length === 0) {
                onAdded();
              }
            } catch (e) {
              setError(e instanceof OpsError ? e.message : "Add failed");
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-md bg-florence-teal px-4 py-1.5 text-sm font-semibold text-white hover:bg-florence-teal-dark disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add to campaign"}
        </button>
      </div>
    </div>
  );
}

function parsePaste(text: string): AddTargetInput[] {
  const out: AddTargetInput[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    // Split on TAB or 4+ spaces.
    const cols = line.split(/\t|\s{4,}/).map((c) => c.trim());
    if (cols.length < 6) continue;
    const [school_slug, org_name, recipient_title, address_line1, city, postal_code, country] = cols;
    out.push({
      ...(school_slug && { school_slug }),
      org_name: org_name ?? "",
      ...(recipient_title && { recipient_title }),
      address_line1: address_line1 ?? "",
      city: city ?? "",
      postal_code: postal_code ?? "",
      country: country ?? "",
    });
  }
  return out;
}

// ── Preview modal ───────────────────────────────────────────────────────────
function PreviewModal({
  html,
  onClose,
}: {
  html: { front: string; back: string; activation_url: string };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4">
      <div className="relative max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#0a0d12]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-florence-teal">
              Mailpiece preview
            </p>
            <p className="mt-0.5 text-xs text-white/60">
              Activation URL: <span className="font-mono">{html.activation_url}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-sm text-white/60 hover:bg-white/10"
          >
            Close
          </button>
        </div>
        <div className="grid max-h-[78vh] gap-3 overflow-auto bg-[#1a1f28] p-4 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white">
            <p className="border-b border-florence-line bg-florence-mist/60 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-florence-slate">
              Front
            </p>
            <iframe title="Mailpiece front" srcDoc={html.front} className="h-[520px] w-full" />
          </div>
          <div className="rounded-lg border border-white/10 bg-white">
            <p className="border-b border-florence-line bg-florence-mist/60 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-florence-slate">
              Back
            </p>
            <iframe title="Mailpiece back" srcDoc={html.back} className="h-[520px] w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Launch modal (Lob key + confirm + cost estimate) ─────────────────────────
function LaunchModal({
  campaign,
  targets,
  tone,
  onCancel,
  onDone,
}: {
  campaign: OpsCampaign;
  targets: OpsTarget[];
  tone: "quote" | "market";
  onCancel: () => void;
  onDone: (r: SendResult) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [confirmLive, setConfirmLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState({
    name: "Florence Academy",
    company: "Florence Academy",
    address_line1: "",
    address_city: "Los Angeles",
    address_state: "CA",
    address_zip: "",
    address_country: "US",
  });

  const mode: "test" | "live" = apiKey.startsWith("live_") ? "live" : "test";
  const estimatePerPieceCents = campaign.mail_format === "postcard_6x11" ? 75 : 150;
  const estimateCents = targets.length * estimatePerPieceCents;
  const canSubmit =
    apiKey.trim().length > 0 &&
    from.address_line1.trim() &&
    from.address_city.trim() &&
    from.address_zip.trim() &&
    (mode === "test" || confirmLive);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0a0d12] p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="fl-eyebrow text-florence-indigo">Launch via Lob</p>
            <h2 className="mt-1 font-serif text-xl font-semibold text-white">
              {targets.length} pieces · {campaign.mail_format.replace("_", " ")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-sm text-white/60 hover:bg-white/10"
          >
            Cancel
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <Field label="Lob API key">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="test_… or live_…"
              autoComplete="off"
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-sm text-white"
            />
            <p className="mt-1 text-[11px] text-white/40">
              Held only in this tab. Never persisted server-side. {" "}
              <span className={mode === "live" ? "font-semibold text-vital-danger" : "text-vital-ok"}>
                {mode === "live"
                  ? "LIVE MODE detected - real mail, real money."
                  : "Test mode - no charge, no real mail."}
              </span>
            </p>
          </Field>
          <Field label="Return address (printed on the piece)">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={from.address_line1}
                onChange={(e) => setFrom({ ...from, address_line1: e.target.value })}
                placeholder="Street address"
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
              />
              <input
                value={from.address_zip}
                onChange={(e) => setFrom({ ...from, address_zip: e.target.value })}
                placeholder="ZIP / Postal code"
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
              />
              <input
                value={from.address_city}
                onChange={(e) => setFrom({ ...from, address_city: e.target.value })}
                placeholder="City"
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
              />
              <input
                value={from.address_state}
                onChange={(e) => setFrom({ ...from, address_state: e.target.value })}
                placeholder="State (US)"
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
              />
            </div>
          </Field>
          <div className="rounded-md border border-white/10 bg-white/[0.02] p-3 text-xs">
            <p className="text-white/60">
              Cost estimate (live mode, USPS marketing):{" "}
              <span className="font-mono text-white">${(estimateCents / 100).toFixed(2)}</span>{" "}
              ({targets.length} × ~${(estimatePerPieceCents / 100).toFixed(2)})
            </p>
            <p className="mt-1 text-white/40">
              Lob returns the exact price per piece on send; this is a rough estimate.
            </p>
          </div>
          {mode === "live" && (
            <label className="flex items-start gap-2 rounded-md border border-vital-danger/40 bg-vital-danger/10 p-3 text-sm text-white">
              <input
                type="checkbox"
                checked={confirmLive}
                onChange={(e) => setConfirmLive(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I understand this sends real mail and bills my Lob account. {targets.length} pieces, est ${(estimateCents / 100).toFixed(2)}.
              </span>
            </label>
          )}
          {error && <p className="text-sm text-vital-danger">{error}</p>}
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit || busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const input: SendInput = {
                  target_ids: targets.map((t) => t.id),
                  api_key: apiKey.trim(),
                  from,
                  tone,
                };
                const r = await sendCampaign(campaign.id, input);
                onDone(r);
              } catch (e) {
                setError(e instanceof OpsError ? e.message : "Send failed");
              } finally {
                setBusy(false);
              }
            }}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50 ${
              mode === "live" ? "bg-vital-danger hover:bg-vital-danger/80" : "bg-florence-indigo hover:bg-florence-indigo-dark"
            }`}
          >
            {busy ? "Sending…" : mode === "live" ? `Send LIVE (${targets.length})` : `Send test (${targets.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────
function ToneToggle({
  value,
  onChange,
}: {
  value: "quote" | "market";
  onChange: (v: "quote" | "market") => void;
}) {
  return (
    <div className="flex rounded-md border border-white/10 bg-white/5 p-0.5 text-xs">
      <button
        type="button"
        onClick={() => onChange("market")}
        className={`rounded px-2 py-1 ${value === "market" ? "bg-white/15 text-white" : "text-white/50"}`}
      >
        Intro tone
      </button>
      <button
        type="button"
        onClick={() => onChange("quote")}
        className={`rounded px-2 py-1 ${value === "quote" ? "bg-white/15 text-white" : "text-white/50"}`}
      >
        Bold lead
      </button>
    </div>
  );
}

function StatusPill({ status, mode }: { status: string; mode?: "test" | "live" }) {
  const tone =
    status === "delivered" || status === "activated"
      ? "bg-vital-ok/15 text-vital-ok border-vital-ok/30"
      : status === "sent" || status === "in_transit" || status === "rendered"
        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
        : status === "returned" || status === "declined"
          ? "bg-vital-danger/15 text-vital-danger border-vital-danger/30"
          : "bg-white/5 text-white/60 border-white/10";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${tone}`}>
      {status.replace("_", " ")}
      {mode === "test" && <span className="rounded bg-white/10 px-1 text-[9px]">test</span>}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
        {label}
      </span>
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
      className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#0a0d12]">
          {o.label}
        </option>
      ))}
    </select>
  );
}

// Unused; reserved for future "pick from schools directory" picker.
void fetchSchoolReport;
