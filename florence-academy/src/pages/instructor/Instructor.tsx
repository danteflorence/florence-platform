import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  bumpCoverage,
  fetchCohorts,
  fetchCopilot,
  fetchRoster,
  instructorConnect,
  instructorDisconnect,
  instructorSession,
  InstructorError,
  recordAttendance,
  type CohortCopilot,
  type InstructorCohort,
  type RosterMember,
} from "../../lib/instructorApi";
import { SECTIONS } from "../../data/blueprint";

// ── Top-level page ──────────────────────────────────────────────────────────
/**
 * /instructor — the instructor's home for running a live cohort.
 *
 * INTERNAL ONLY. NOT linked from the public app. Connects with an instructor
 * API client entered at runtime (never bundled), scope set narrower than ops.
 *
 * Day-one walkthrough:
 *   1. Sign in (operator API client + secret)
 *   2. Land on today's cohort — roster, deposit-paid count, next live section
 *   3. Run the pre-class checklist
 *   4. Hit "Start live session" → routes into the slide presenter
 *   5. Mark attendance during/after class
 *   6. Post-class wrap: bump coverage, generate the cohort copilot memo
 */
export default function Instructor() {
  const [status, setStatus] = useState<"checking" | "disconnected" | "loading" | "ready" | "error">(
    "checking",
  );
  const [error, setError] = useState<string | null>(null);
  const [cohorts, setCohorts] = useState<InstructorCohort[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const all = await fetchCohorts();
      const sorted = [...all].sort((a, b) => sortPriority(b) - sortPriority(a));
      setCohorts(sorted);
      // Auto-select the most-active cohort if nothing's selected yet.
      if (!selectedCode && sorted.length > 0) setSelectedCode(sorted[0].code);
      setStatus("ready");
    } catch (e) {
      if (e instanceof InstructorError && e.status === 401) {
        instructorDisconnect();
        setStatus("disconnected");
        return;
      }
      setError(e instanceof Error ? e.message : "Failed to load cohorts");
      setStatus("error");
    }
  }, [selectedCode]);

  useEffect(() => {
    if (instructorSession().token) void load();
    else setStatus("disconnected");
  }, [load, refreshKey]);

  const selected = useMemo(
    () => cohorts.find((c) => c.code === selectedCode) ?? null,
    [cohorts, selectedCode],
  );

  if (status === "checking") {
    return <InstructorShell><Loading /></InstructorShell>;
  }
  if (status === "disconnected") {
    return (
      <InstructorShell>
        <ConnectForm onConnected={() => setRefreshKey((k) => k + 1)} />
      </InstructorShell>
    );
  }
  if (status === "loading") {
    return <InstructorShell><Loading /></InstructorShell>;
  }
  if (status === "error") {
    return (
      <InstructorShell>
        <ErrorPane
          message={error ?? "Something went wrong"}
          onRetry={() => setRefreshKey((k) => k + 1)}
          onReconnect={() => {
            instructorDisconnect();
            setStatus("disconnected");
          }}
        />
      </InstructorShell>
    );
  }

  return (
    <InstructorShell>
      <CohortPicker
        cohorts={cohorts}
        selectedCode={selectedCode}
        onSelect={setSelectedCode}
      />
      {selected ? (
        <CohortConsole
          cohort={selected}
          onCohortChange={(updated) => {
            setCohorts((all) => all.map((c) => (c.id === updated.id ? updated : c)));
          }}
        />
      ) : (
        <EmptyState />
      )}
      <FooterDisconnect
        onDisconnect={() => {
          instructorDisconnect();
          setStatus("disconnected");
        }}
      />
    </InstructorShell>
  );
}

// Higher score = surface first. Active cohorts > scheduled with nearest start.
function sortPriority(c: InstructorCohort): number {
  if (c.status === "active") return 1000;
  if (c.status === "scheduled" && c.starts_at) {
    const days = Math.max(0, (Date.parse(c.starts_at) - Date.now()) / 86_400_000);
    return 500 - days;
  }
  if (c.status === "scheduled") return 100;
  if (c.status === "completed") return 10;
  return 1;
}

// ── Shell ───────────────────────────────────────────────────────────────────
function InstructorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-florence-mist/40 text-florence-ink">
      <header className="border-b border-florence-line bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-florence-indigo text-sm font-bold text-white">
              F
            </span>
            <div className="flex flex-col leading-tight">
              <span className="font-serif text-base font-semibold">Florence Academy</span>
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-florence-slate">
                Instructor Console
              </span>
            </div>
          </div>
          <Link
            to="/"
            className="text-sm font-medium text-florence-slate hover:text-florence-ink"
          >
            ← Public site
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}

function Loading() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <p className="animate-pulse text-sm font-medium text-florence-slate">Loading…</p>
    </div>
  );
}

function ErrorPane({
  message,
  onRetry,
  onReconnect,
}: {
  message: string;
  onRetry: () => void;
  onReconnect: () => void;
}) {
  return (
    <div className="rounded-2xl border border-vital-danger/30 bg-vital-danger/5 p-6">
      <p className="fl-eyebrow text-vital-danger">Something went wrong</p>
      <p className="mt-2 text-sm text-florence-ink">{message}</p>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-florence-indigo px-4 py-2 text-sm font-semibold text-white hover:bg-florence-indigo-dark"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={onReconnect}
          className="rounded-lg border border-florence-line bg-white px-4 py-2 text-sm font-semibold text-florence-ink hover:bg-florence-mist"
        >
          Reconnect
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-florence-line bg-white p-10 text-center">
      <p className="text-sm text-florence-slate">
        No cohort selected. Pick one above, or ask ops to create one.
      </p>
    </div>
  );
}

function FooterDisconnect({ onDisconnect }: { onDisconnect: () => void }) {
  return (
    <div className="mt-10 flex items-center justify-end">
      <button
        type="button"
        onClick={onDisconnect}
        className="text-xs font-medium text-florence-slate hover:text-vital-danger"
      >
        Disconnect (clear session token)
      </button>
    </div>
  );
}

// ── Connect form ────────────────────────────────────────────────────────────
function ConnectForm({ onConnected }: { onConnected: () => void }) {
  const [base, setBase] = useState(() => defaultBase());
  const [clientId, setClientId] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await instructorConnect(base.trim(), clientId.trim(), secret);
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <p className="fl-eyebrow">Instructor Console</p>
      <h1 className="mt-2 font-serif text-2xl font-semibold">Sign in to teach</h1>
      <p className="mt-2 text-sm text-florence-slate">
        Enter your operator API client credentials. The token is held only in
        this tab&apos;s memory — never bundled with the app and never saved to
        disk.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-florence-line bg-white p-6">
        <Field label="API base URL">
          <input
            type="url"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            className="fl-input"
            placeholder="http://localhost:8788"
            required
          />
        </Field>
        <Field label="Client ID">
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="fl-input"
            placeholder="instructor-bootcamp"
            autoComplete="username"
            required
          />
        </Field>
        <Field label="Client secret">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="fl-input"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </Field>
        {error && (
          <p className="rounded-lg border border-vital-danger/30 bg-vital-danger/5 px-3 py-2 text-sm text-vital-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-florence-indigo px-5 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-florence-indigo-dark disabled:bg-florence-slate/40"
        >
          {busy ? "Connecting…" : "Connect"}
        </button>
      </form>
    </div>
  );
}

function defaultBase(): string {
  try {
    if (typeof window !== "undefined") {
      const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
      if (env["VITE_API_URL"]) return env["VITE_API_URL"];
      if (/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
        return "http://localhost:8788";
      }
    }
  } catch {
    /* ignore */
  }
  return "";
}

// ── Cohort picker (chips) ───────────────────────────────────────────────────
function CohortPicker({
  cohorts,
  selectedCode,
  onSelect,
}: {
  cohorts: InstructorCohort[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="fl-eyebrow">Cohort</p>
      {cohorts.map((c) => {
        const active = c.code === selectedCode;
        return (
          <button
            key={c.code}
            type="button"
            onClick={() => onSelect(c.code)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? "border-florence-indigo bg-florence-indigo text-white"
                : "border-florence-line bg-white text-florence-slate hover:bg-florence-mist"
            }`}
            title={`${c.status} · ${c.code}`}
          >
            {c.name}
            {c.status === "active" && (
              <span className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full ${active ? "bg-white" : "bg-vital-ok"}`} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Cohort console (the body of the dashboard) ──────────────────────────────
function CohortConsole({
  cohort,
  onCohortChange,
}: {
  cohort: InstructorCohort;
  onCohortChange: (c: InstructorCohort) => void;
}) {
  const [roster, setRoster] = useState<RosterMember[] | null>(null);
  const [copilot, setCopilot] = useState<CohortCopilot | null>(null);
  const [attendanceMarks, setAttendanceMarks] = useState<Record<string, "present" | "absent" | "late">>({});
  const [busyRows, setBusyRows] = useState<Record<string, boolean>>({});
  const [bumpBusy, setBumpBusy] = useState(false);
  const [bumpError, setBumpError] = useState<string | null>(null);
  const [copilotMemo, setCopilotMemo] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => loadChecklist(cohort.code));

  useEffect(() => {
    setRoster(null);
    setCopilot(null);
    setAttendanceMarks({});
    setCopilotMemo(null);
    setChecklist(loadChecklist(cohort.code));
    void (async () => {
      try {
        const [r, cp] = await Promise.all([fetchRoster(cohort.code), fetchCopilot(cohort.code).catch(() => null)]);
        setRoster(r);
        setCopilot(cp);
      } catch {
        setRoster([]);
      }
    })();
  }, [cohort.code]);

  const watermark = cohort.covered_through_section ?? 0;
  const nextSection = SECTIONS.find((s) => s.n === watermark + 1) ?? null;
  const nextSectionN = nextSection?.n ?? 0;
  // Split the roster: active students (the ones you teach today) vs former
  // students (withdrawn). The roster pane shows the active list — withdrawn
  // candidates live in a collapsed "Former students" section below.
  const activeRoster = useMemo(
    () => (roster ?? []).filter((r) => r.enrollment_status !== "withdrawn"),
    [roster],
  );
  const formerRoster = useMemo(
    () => (roster ?? []).filter((r) => r.enrollment_status === "withdrawn"),
    [roster],
  );
  const depositPaid = useMemo(
    () =>
      activeRoster.filter((r) =>
        ["deposit_paid", "attending", "completed"].includes(r.enrollment_status),
      ).length,
    [activeRoster],
  );

  async function toggleAttendance(
    member: RosterMember,
    status: "present" | "absent" | "late",
  ) {
    if (busyRows[member.candidate_id]) return;
    setBusyRows((m) => ({ ...m, [member.candidate_id]: true }));
    try {
      await recordAttendance(member.candidate_id, cohort.code, status);
      setAttendanceMarks((m) => ({ ...m, [member.candidate_id]: status }));
    } catch {
      // Surface a row-level error inline if the API rejects.
      setAttendanceMarks((m) => ({ ...m, [member.candidate_id]: "absent" }));
    } finally {
      setBusyRows((m) => {
        const next = { ...m };
        delete next[member.candidate_id];
        return next;
      });
    }
  }

  async function onBump() {
    if (!nextSection) return;
    setBumpBusy(true);
    setBumpError(null);
    try {
      const updated = await bumpCoverage(cohort.id, nextSection.n);
      onCohortChange({ ...cohort, covered_through_section: updated.covered_through_section });
    } catch (err) {
      setBumpError(err instanceof Error ? err.message : "Coverage update failed");
    } finally {
      setBumpBusy(false);
    }
  }

  async function regenerateMemo() {
    try {
      const cp = await fetchCopilot(cohort.code);
      setCopilot(cp);
      setCopilotMemo(formatMemo(cp, cohort, nextSection?.title));
    } catch (e) {
      setCopilotMemo(`Couldn't reach the copilot endpoint — ${e instanceof Error ? e.message : "unknown error"}.`);
    }
  }

  function updateChecklist(key: string, on: boolean) {
    const next = { ...checklist, [key]: on };
    setChecklist(next);
    saveChecklist(cohort.code, next);
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
      {/* LEFT column: today's class */}
      <div className="space-y-6">
        <CohortHeader cohort={cohort} nextSection={nextSection} watermark={watermark} />

        <PreClassChecklist
          checklist={checklist}
          onChange={updateChecklist}
          nextSection={nextSection}
          rosterSize={activeRoster.length}
          depositPaid={depositPaid}
        />

        <StartSessionPane cohort={cohort} nextSection={nextSection} />

        <RosterPane
          roster={roster === null ? null : activeRoster}
          attendanceMarks={attendanceMarks}
          busyRows={busyRows}
          onMark={toggleAttendance}
        />

        {formerRoster.length > 0 && (
          <FormerStudents members={formerRoster} />
        )}
      </div>

      {/* RIGHT column: stand-by / post-class wrap */}
      <div className="space-y-6">
        <CopilotPane copilot={copilot} cohort={cohort} />

        <PostClassWrap
          cohort={cohort}
          nextSection={nextSection}
          nextSectionN={nextSectionN}
          bumpBusy={bumpBusy}
          bumpError={bumpError}
          onBump={onBump}
          memo={copilotMemo}
          onRegenerateMemo={regenerateMemo}
        />
      </div>
    </div>
  );
}

// ── Sub-panes ───────────────────────────────────────────────────────────────
function CohortHeader({
  cohort,
  nextSection,
  watermark,
}: {
  cohort: InstructorCohort;
  nextSection: { n: number; title: string } | null;
  watermark: number;
}) {
  const dateLabel = todayLabel();
  const totalSections = SECTIONS.length;
  const pctCovered = Math.round((watermark / totalSections) * 100);
  return (
    <div className="rounded-2xl border border-florence-line bg-white p-6">
      <p className="fl-eyebrow">{dateLabel}</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold">{cohort.name}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <Pill>{cohort.code}</Pill>
        <Pill tone={cohort.status === "active" ? "good" : "neutral"}>{cohort.status}</Pill>
        {cohort.starts_at && <Pill>Starts {cohort.starts_at.slice(0, 10)}</Pill>}
        {typeof cohort.capacity === "number" && <Pill>Capacity {cohort.capacity}</Pill>}
      </div>
      <p className="mt-4 text-sm text-florence-slate">
        Covered through Section {watermark} of {totalSections}.{" "}
        {nextSection ? (
          <>
            Next live: <span className="font-semibold text-florence-ink">Section {nextSection.n} · {nextSection.title}</span>.
          </>
        ) : (
          <>This cohort has completed the curriculum.</>
        )}
      </p>
      {/* Curriculum progress strip — visual at-a-glance of cohort cadence. */}
      <div className="mt-3" aria-label={`Cohort curriculum progress: ${pctCovered}% covered`}>
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-florence-slate">
            Curriculum progress
          </span>
          <span className="font-mono text-xs font-semibold text-florence-ink">
            {watermark}/{totalSections} · {pctCovered}%
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-florence-mist">
          <div
            className="h-full bg-florence-teal transition-all"
            style={{ width: `${pctCovered}%` }}
          />
        </div>
        <div className="mt-1.5 flex gap-[2px]">
          {SECTIONS.map((s) => {
            const state =
              s.n <= watermark
                ? "bg-florence-teal-dark"
                : s.n === watermark + 1
                  ? "bg-florence-indigo"
                  : "bg-florence-line";
            return (
              <span
                key={s.n}
                title={`Section ${s.n}: ${s.title}`}
                className={`h-1.5 flex-1 rounded-sm ${state}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

const CHECKLIST_ITEMS: { key: string; title: string; body: string }[] = [
  {
    key: "slide_ready",
    title: "Slide deck loaded",
    body: "Open Section N presenter on your second screen before students join.",
  },
  {
    key: "screen_share",
    title: "Screen share works",
    body: "Test share with one student. Audio routes through the meeting app, not the OS.",
  },
  {
    key: "audio",
    title: "Mic + speaker confirmed",
    body: "Speak a full sentence; check the room hears you and you hear the room.",
  },
  {
    key: "roll",
    title: "Roster matched to room",
    body: "Students checked-in match expected deposit-paid count. Flag missing students.",
  },
  {
    key: "polling",
    title: "Live polling ready",
    body: "Polling endpoint reachable; one warm-up poll fired and answered.",
  },
  {
    key: "recover",
    title: "Recovery plan in mind",
    body: "If WiFi drops mid-class: pause sync, students hold on current slide, you resume from sectionN/present.",
  },
];

function PreClassChecklist({
  checklist,
  onChange,
  nextSection,
  rosterSize,
  depositPaid,
}: {
  checklist: Record<string, boolean>;
  onChange: (key: string, on: boolean) => void;
  nextSection: { n: number; title: string } | null;
  rosterSize: number;
  depositPaid: number;
}) {
  const done = CHECKLIST_ITEMS.filter((i) => checklist[i.key]).length;
  return (
    <div className="rounded-2xl border border-florence-line bg-white p-6">
      <div className="flex items-baseline justify-between">
        <p className="fl-eyebrow">Pre-class checklist</p>
        <span className="text-xs font-semibold text-florence-slate">
          {done}/{CHECKLIST_ITEMS.length} done
        </span>
      </div>
      <h2 className="mt-1 text-base font-semibold">
        {nextSection ? `Before opening Section ${nextSection.n} · ${nextSection.title}` : "Cohort review"}
      </h2>
      <p className="mt-1 text-xs text-florence-slate">
        Roster: <span className="font-semibold text-florence-ink">{rosterSize}</span> enrolled ·{" "}
        <span className="font-semibold text-florence-ink">{depositPaid}</span> paid deposit
      </p>
      <ul className="mt-4 space-y-2">
        {CHECKLIST_ITEMS.map((item) => {
          const on = !!checklist[item.key];
          return (
            <li key={item.key}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-florence-line/70 bg-florence-mist/30 p-3 hover:bg-florence-mist/60">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => onChange(item.key, e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-florence-indigo"
                />
                <span>
                  <span
                    className={`block text-sm font-semibold ${
                      on ? "text-florence-slate line-through" : "text-florence-ink"
                    }`}
                  >
                    {item.title}
                  </span>
                  <span className={`block text-xs ${on ? "text-florence-slate/70" : "text-florence-slate"}`}>
                    {item.body}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StartSessionPane({
  cohort,
  nextSection,
}: {
  cohort: InstructorCohort;
  nextSection: { n: number; title: string; slug: string } | null;
}) {
  if (!nextSection) {
    return (
      <div className="rounded-2xl border border-florence-line bg-florence-teal-soft/40 p-6">
        <p className="fl-eyebrow text-florence-teal-dark">Curriculum complete</p>
        <p className="mt-1 text-sm">
          {cohort.name} has covered all 20 sections. Use post-class to fire
          the final cohort copilot memo.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-florence-indigo bg-florence-indigo-soft/40 p-6">
      <p className="fl-eyebrow text-florence-indigo-dark">Today&apos;s live session</p>
      <h2 className="mt-1 font-serif text-xl font-semibold">
        Section {nextSection.n} · {nextSection.title}
      </h2>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          to={`/academy/${nextSection.slug}/present`}
          className="rounded-xl bg-florence-indigo px-4 py-2 text-sm font-semibold text-white shadow-card hover:bg-florence-indigo-dark"
        >
          ▶ Open presenter
        </Link>
        <Link
          to={`/academy/${nextSection.slug}/live?cohort=${encodeURIComponent(cohort.code)}`}
          className="rounded-xl border border-florence-line bg-white px-4 py-2 text-sm font-semibold text-florence-ink hover:bg-florence-mist"
        >
          📡 Go live (sync students)
        </Link>
        <Link
          to={`/academy/${nextSection.slug}`}
          className="rounded-xl border border-florence-line bg-white px-4 py-2 text-sm font-semibold text-florence-ink hover:bg-florence-mist"
          target="_blank"
          rel="noopener noreferrer"
        >
          Read along ↗
        </Link>
      </div>
      <p className="mt-3 text-xs text-florence-slate">
        Tip: open the presenter on your second screen so this dashboard stays
        visible during class.
      </p>
    </div>
  );
}

function RosterPane({
  roster,
  attendanceMarks,
  busyRows,
  onMark,
}: {
  roster: RosterMember[] | null;
  attendanceMarks: Record<string, "present" | "absent" | "late">;
  busyRows: Record<string, boolean>;
  onMark: (member: RosterMember, status: "present" | "absent" | "late") => void;
}) {
  if (roster === null) {
    return <SkeletonCard title="Roster" />;
  }
  if (roster.length === 0) {
    return (
      <div className="rounded-2xl border border-florence-line bg-white p-6">
        <p className="fl-eyebrow">Roster</p>
        <p className="mt-2 text-sm text-florence-slate">
          No one enrolled yet. Ops sees them in Control Tower once they pay
          the deposit.
        </p>
      </div>
    );
  }
  const checkedIn = Object.values(attendanceMarks).filter((s) => s === "present" || s === "late").length;
  return (
    <div className="rounded-2xl border border-florence-line bg-white p-6">
      <div className="flex items-baseline justify-between">
        <p className="fl-eyebrow">Roster</p>
        <span className="text-xs font-semibold text-florence-slate">
          {checkedIn}/{roster.length} marked today
        </span>
      </div>
      <ul className="mt-3 divide-y divide-florence-line">
        {roster.map((m) => (
          <RosterRow
            key={m.candidate_id}
            member={m}
            mark={attendanceMarks[m.candidate_id]}
            busy={!!busyRows[m.candidate_id]}
            onMark={onMark}
          />
        ))}
      </ul>
    </div>
  );
}

const BAND_DOT: Record<string, string> = {
  green: "bg-vital-ok",
  yellow: "bg-amber-400",
  orange: "bg-orange-500",
  red: "bg-vital-danger",
  none: "bg-florence-slate/40",
};

function RosterRow({
  member,
  mark,
  busy,
  onMark,
}: {
  member: RosterMember;
  mark: "present" | "absent" | "late" | undefined;
  busy: boolean;
  onMark: (m: RosterMember, s: "present" | "absent" | "late") => void;
}) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${BAND_DOT[member.readiness_band ?? "none"] ?? "bg-florence-slate/40"}`}
        title={`Readiness: ${member.readiness_band ?? "none"}`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-florence-ink">{member.full_name}</p>
        <p className="text-xs text-florence-slate">{member.enrollment_status}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <AttendBtn label="P" tone="good" active={mark === "present"} busy={busy}
          onClick={() => onMark(member, "present")} />
        <AttendBtn label="L" tone="warn" active={mark === "late"} busy={busy}
          onClick={() => onMark(member, "late")} />
        <AttendBtn label="A" tone="bad" active={mark === "absent"} busy={busy}
          onClick={() => onMark(member, "absent")} />
      </div>
    </li>
  );
}

function AttendBtn({
  label,
  tone,
  active,
  busy,
  onClick,
}: {
  label: string;
  tone: "good" | "warn" | "bad";
  active: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const toneClass = active
    ? tone === "good"
      ? "bg-vital-ok text-white border-vital-ok"
      : tone === "warn"
        ? "bg-amber-400 text-white border-amber-400"
        : "bg-vital-danger text-white border-vital-danger"
    : "bg-white text-florence-slate border-florence-line hover:bg-florence-mist";
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`h-7 w-7 rounded-md border text-xs font-bold transition-colors disabled:opacity-50 ${toneClass}`}
      title={`Mark ${label === "P" ? "present" : label === "L" ? "late" : "absent"}`}
    >
      {label}
    </button>
  );
}

function CopilotPane({ copilot, cohort }: { copilot: CohortCopilot | null; cohort: InstructorCohort }) {
  if (!copilot) {
    return <SkeletonCard title="Cohort signals" />;
  }
  const bands: ("green" | "yellow" | "orange" | "red" | "none")[] = ["green", "yellow", "orange", "red", "none"];
  return (
    <div className="rounded-2xl border border-florence-line bg-white p-6">
      <p className="fl-eyebrow">Cohort signals</p>
      <h2 className="mt-1 text-base font-semibold">{copilot.candidates} students · live mix</h2>
      <div className="mt-3 grid grid-cols-5 gap-1">
        {bands.map((b) => {
          const n = copilot.band_counts[b] ?? 0;
          return (
            <div key={b} className="rounded-lg bg-florence-mist/40 p-2 text-center">
              <p className={`mx-auto h-2 w-2 rounded-full ${BAND_DOT[b]}`} />
              <p className="mt-1 font-mono text-lg font-semibold">{n}</p>
              <p className="text-[10px] uppercase tracking-wider text-florence-slate">{b}</p>
            </div>
          );
        })}
      </div>
      {copilot.avg_readiness !== null && (
        <p className="mt-3 text-xs text-florence-slate">
          Avg readiness:{" "}
          <span className="font-semibold text-florence-ink">{Math.round(copilot.avg_readiness * 100)}%</span>
        </p>
      )}
      {copilot.fallers.length > 0 && (
        <div className="mt-4">
          <p className="fl-eyebrow text-vital-danger">Watch list</p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {copilot.fallers.slice(0, 5).map((f) => (
              <li key={f.candidate_id} className="flex items-center gap-2">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${BAND_DOT[f.band] ?? "bg-florence-slate/40"}`} />
                <span className="text-florence-ink">{f.full_name ?? f.candidate_id.slice(0, 8)}</span>
                {f.readiness != null && (
                  <span className="ml-auto font-mono text-xs text-florence-slate">{Math.round(f.readiness * 100)}%</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-4 text-[11px] text-florence-slate/80">
        Cohort {cohort.code} · refreshed live
      </p>
    </div>
  );
}

function PostClassWrap({
  cohort,
  nextSection,
  nextSectionN,
  bumpBusy,
  bumpError,
  onBump,
  memo,
  onRegenerateMemo,
}: {
  cohort: InstructorCohort;
  nextSection: { n: number; title: string } | null;
  nextSectionN: number;
  bumpBusy: boolean;
  bumpError: string | null;
  onBump: () => void;
  memo: string | null;
  onRegenerateMemo: () => void;
}) {
  return (
    <div className="rounded-2xl border border-florence-line bg-white p-6">
      <p className="fl-eyebrow">Post-class wrap</p>
      <h2 className="mt-1 text-base font-semibold">When you finish the section</h2>

      {nextSection ? (
        <div className="mt-3 rounded-xl border border-florence-teal bg-florence-teal-soft/40 p-4">
          <p className="text-sm font-semibold text-florence-teal-dark">
            Mark Section {nextSectionN} ({nextSection.title}) covered.
          </p>
          <p className="mt-1 text-xs text-florence-slate">
            This unlocks the section for the cohort to revisit on their own.
            Current watermark: {cohort.covered_through_section ?? 0}.
          </p>
          <button
            type="button"
            disabled={bumpBusy}
            onClick={onBump}
            className="mt-3 rounded-lg bg-florence-teal-dark px-4 py-2 text-sm font-semibold text-white shadow-card hover:bg-florence-teal disabled:opacity-50"
          >
            {bumpBusy ? "Saving…" : `Mark Section ${nextSectionN} covered`}
          </button>
          {bumpError && (
            <p className="mt-2 text-xs text-vital-danger">{bumpError}</p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-florence-slate">
          Cohort has covered all 20 sections.
        </p>
      )}

      <div className="mt-5 border-t border-florence-line pt-4">
        <p className="text-sm font-semibold">Cohort copilot memo</p>
        <p className="mt-1 text-xs text-florence-slate">
          One-paragraph summary of where the cohort stands. Drop it into your
          ops note or share with the candidate-success team.
        </p>
        {memo ? (
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-florence-line bg-florence-mist/40 p-3 text-xs leading-relaxed text-florence-ink">
            {memo}
          </pre>
        ) : null}
        <button
          type="button"
          onClick={onRegenerateMemo}
          className="mt-3 rounded-lg border border-florence-line bg-white px-4 py-2 text-sm font-semibold text-florence-ink hover:bg-florence-mist"
        >
          {memo ? "Regenerate memo" : "Generate memo"}
        </button>
      </div>
    </div>
  );
}

function SkeletonCard({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-florence-line bg-white p-6">
      <p className="fl-eyebrow">{title}</p>
      <div className="mt-4 h-32 animate-pulse rounded-xl bg-florence-mist/50" />
    </div>
  );
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
        tone === "good"
          ? "border-vital-ok/40 bg-vital-ok/10 text-vital-ok"
          : "border-florence-line bg-florence-mist/60 text-florence-slate"
      }`}
    >
      {children}
    </span>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-florence-ink">{label}</span>
      {hint && <span className="ml-2 text-xs text-florence-slate">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function todayLabel(): string {
  try {
    return new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

const CHECKLIST_PREFIX = "fl_instr_checklist_";

function loadChecklist(cohortCode: string): Record<string, boolean> {
  try {
    const raw = sessionStorage.getItem(CHECKLIST_PREFIX + cohortCode);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveChecklist(cohortCode: string, value: Record<string, boolean>): void {
  try {
    sessionStorage.setItem(CHECKLIST_PREFIX + cohortCode, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function formatMemo(
  cp: CohortCopilot,
  cohort: InstructorCohort,
  nextTitle: string | undefined,
): string {
  const bands = cp.band_counts;
  const total = cp.candidates;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const lines: string[] = [];
  lines.push(`Cohort ${cohort.code} · ${cohort.name}`);
  lines.push(`Date: ${new Date().toISOString().slice(0, 10)}`);
  lines.push("");
  lines.push(`Students: ${total}. Readiness mix:`);
  lines.push(
    `  · green ${bands.green ?? 0} (${pct(bands.green ?? 0)}%), yellow ${bands.yellow ?? 0} (${pct(bands.yellow ?? 0)}%), orange ${bands.orange ?? 0} (${pct(bands.orange ?? 0)}%), red ${bands.red ?? 0} (${pct(bands.red ?? 0)}%), unassessed ${bands.none ?? 0}.`,
  );
  if (cp.avg_readiness !== null) {
    lines.push(`  · average readiness ${Math.round(cp.avg_readiness * 100)}%.`);
  }
  if (cp.fallers.length > 0) {
    lines.push("");
    lines.push(`Watch list (${cp.fallers.length}):`);
    for (const f of cp.fallers.slice(0, 10)) {
      lines.push(
        `  · ${f.full_name ?? f.candidate_id.slice(0, 8)} — ${f.band}${f.readiness != null ? `, ${Math.round(f.readiness * 100)}%` : ""}`,
      );
    }
  }
  if (nextTitle) {
    lines.push("");
    lines.push(`Next live section: ${nextTitle}.`);
  }
  return lines.join("\n");
}

// ── Former students panel (withdrawn) ───────────────────────────────────────
/** Collapsed list of withdrawn students. They never appear in attendance
 *  but ops still needs to see them when the instructor asks "wait, where's X?". */
function FormerStudents({ members }: { members: RosterMember[] }) {
  return (
    <details className="rounded-2xl border border-dashed border-florence-line bg-white p-5">
      <summary className="cursor-pointer text-sm font-semibold text-florence-slate">
        Former students ({members.length})
      </summary>
      <ul className="mt-3 divide-y divide-florence-line">
        {members.map((m) => (
          <li key={m.candidate_id} className="flex items-center gap-3 py-2 text-sm text-florence-slate">
            <span className="h-1.5 w-1.5 rounded-full bg-florence-slate/40" />
            <span className="flex-1 truncate">{m.full_name}</span>
            <span className="text-xs uppercase tracking-wider">withdrawn</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

