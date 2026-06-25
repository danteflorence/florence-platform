import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCandidate } from "../lib/CandidateContext";
import {
  ApiError,
  attestAffiliation,
  clearRemediation,
  fetchMyAudit,
  fetchPathwayTasks,
  fetchPayments,
  fetchProgress,
  fetchRemediations,
  fetchSchoolsPublic,
  hasPaidSponsoredAccess,
  resendVerification,
  startSponsoredAccessCheckout,
  updateConsent,
  type AffiliationRole,
  type AuditEntry,
  type ConsentPurpose,
  type PathwayTask,
  type PathwayTaskKind,
  type PathwayTaskStatus,
  type ProgressRecord,
  type PublicSchool,
  type ReadinessBand,
  type RemediationAssignment,
} from "../lib/academyAuth";
import { ApplyProgramsCta } from "../components/ApplyProgramsCta";
import { SECTIONS, CLIENT_NEED_LABEL } from "../data/blueprint";
import type { ClientNeed } from "../types/question";

const BAND: Record<ReadinessBand, { label: string; dot: string; text: string; ring: string }> = {
  green: { label: "Exam-ready", dot: "bg-vital-ok", text: "text-vital-ok", ring: "ring-vital-ok/30" },
  yellow: { label: "Almost there", dot: "bg-amber-400", text: "text-amber-600", ring: "ring-amber-300/40" },
  orange: { label: "Building", dot: "bg-orange-500", text: "text-orange-600", ring: "ring-orange-300/40" },
  red: { label: "Foundational", dot: "bg-vital-danger", text: "text-vital-danger", ring: "ring-vital-danger/30" },
  none: { label: "Not yet assessed", dot: "bg-florence-slate/40", text: "text-florence-slate", ring: "ring-florence-line" },
};

const SECTION_TITLE = new Map(SECTIONS.map((s) => [s.slug, `Section ${s.n} · ${s.title}`]));

function needLabel(key: string): string {
  return CLIENT_NEED_LABEL[key as ClientNeed] ?? key;
}

const CJMM_LABEL: Record<string, string> = {
  "recognize-cues": "Recognize cues",
  "analyze-cues": "Analyze cues",
  "prioritize-hypotheses": "Prioritize hypotheses",
  "generate-solutions": "Generate solutions",
  "take-actions": "Take actions",
  "evaluate-outcomes": "Evaluate outcomes",
};

function subscaleLabel(r: RemediationAssignment): string {
  return r.dim === "cjmm" ? (CJMM_LABEL[r.key] ?? r.key) : needLabel(r.key);
}

/**
 * Targeted practice queue with a one-tap path to focused practice + the
 * FlorenceRN voice coach, and a simple way for the learner to mark one cleared.
 */
function RemediationCard({ candidateId }: { candidateId: string }) {
  const [rows, setRows] = useState<RemediationAssignment[] | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const r = await fetchRemediations(candidateId);
        if (alive) setRows(r);
      } catch {
        if (alive) setRows([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [candidateId]);

  const open = (rows ?? []).filter((r) => r.status !== "cleared");
  if (!rows || open.length === 0) return null; // nothing assigned → no card

  const markCleared = async (r: RemediationAssignment) => {
    try {
      await clearRemediation(candidateId, r.dim, r.key);
      setRows((prev) => (prev ?? []).map((x) => (x.dim === r.dim && x.key === r.key ? { ...x, status: "cleared" } : x)));
    } catch {
      /* leave as-is on failure */
    }
  };

  return (
    <div className="fl-card mt-6 p-6">
      <h2 className="text-lg font-semibold">Your targeted practice</h2>
      <p className="mt-1 text-sm text-florence-slate">
        Recommended from your recent practice. Clear these to keep moving toward exam-ready.
      </p>
      <ul className="mt-3 divide-y divide-florence-line">
        {open.map((r) => (
          <li key={`${r.dim}:${r.key}`} className="flex items-center gap-3 py-2.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-600">
              {Math.round(r.pass_prob * 100)}
            </span>
            <div className="flex-1">
              <span className="text-sm font-medium text-florence-ink">{subscaleLabel(r)}</span>
              <span className="ml-2 text-xs text-florence-slate">
                {r.dim === "cjmm" ? "clinical-judgment step" : "client need"}
              </span>
            </div>
            <Link to="/academy/practice" className="text-xs font-semibold text-florence-teal-dark">
              Practice
            </Link>
            <button onClick={() => void markCleared(r)} className="text-xs font-medium text-florence-slate hover:text-florence-ink">
              Mark done
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Account() {
  const { status, candidate, readiness, apiEnabled, logout, refreshReadiness } = useCandidate();

  if (!apiEnabled) {
    return (
      <Shell>
        <div className="fl-card p-6">
          <h1 className="text-xl font-semibold">Accounts aren't enabled here</h1>
          <p className="mt-2 text-sm text-florence-slate">
            This build isn't connected to the Academy data service, so progress and
            readiness aren't being saved. You can still use every lesson and the full
            practice bank - nothing is gated.
          </p>
          <Link to="/learn" className="mt-4 inline-block text-sm font-semibold text-florence-teal-dark">
            ← Back to the curriculum
          </Link>
        </div>
      </Shell>
    );
  }

  if (status === "loading") {
    return (
      <Shell>
        <p className="animate-pulse text-sm font-medium text-florence-slate">Loading your account…</p>
      </Shell>
    );
  }

  if (status !== "authenticated" || !candidate) {
    return (
      <Shell>
        <AuthForms />
      </Shell>
    );
  }

  const band = readiness ? BAND[readiness.band] : BAND.none;
  const pct = readiness?.readiness != null ? Math.round(readiness.readiness * 100) : null;

  return (
    <Shell>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="fl-eyebrow">Your account</p>
          <h1 className="mt-1 text-2xl font-semibold">{candidate.full_name}</h1>
          {candidate.email && <p className="text-sm text-florence-slate">{candidate.email}</p>}
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg border border-florence-line bg-white px-3 py-1.5 text-sm font-medium text-florence-slate hover:bg-florence-mist"
        >
          Sign out
        </button>
      </div>

      {!candidate.email_verified && <VerifyBanner email={candidate.email} />}

      {/* Study status card */}
      <div className={`fl-card mt-6 p-6 ring-1 ${band.ring}`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Readiness</h2>
          <button
            type="button"
            onClick={() => void refreshReadiness()}
            className="text-xs font-medium text-florence-slate hover:text-florence-ink"
          >
            ↻ Refresh
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-4">
          <div className="flex items-center gap-2.5">
            <span className={`h-3.5 w-3.5 rounded-full ${band.dot}`} />
            <span className={`text-xl font-semibold ${band.text}`}>{band.label}</span>
          </div>
          <Stat label="Projected pass" value={pct != null ? `${pct}%` : "-"} />
          <Stat label="Questions answered" value={String(readiness?.items_completed ?? 0)} />
          <Stat
            label="Sections completed"
            value={`${readiness?.sections_completed ?? 0} / ${readiness?.sections_total ?? SECTIONS.length}`}
          />
        </div>
        {readiness?.next_action && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-florence-teal-soft/40 px-4 py-3">
            <span className="mt-0.5 text-florence-teal-dark" aria-hidden>
              →
            </span>
            <div>
              <p className="text-sm font-medium text-florence-teal-dark">
                Your next step
              </p>
              <p className="text-sm text-florence-ink">{readiness.next_action}</p>
            </div>
          </div>
        )}

        {readiness && readiness.focus_areas.length > 0 && (
          <div className="mt-4 border-t border-florence-line pt-3">
            <p className="text-sm font-medium text-florence-slate">
              Focus next
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {readiness.focus_areas.map((f) => (
                <span
                  key={f}
                  className="rounded-full bg-florence-mist px-2.5 py-1 text-xs font-medium text-florence-ink"
                >
                  {needLabel(f)}
                </span>
              ))}
            </div>
          </div>
        )}
        {(!readiness || readiness.assessments_taken === 0) && (
          <p className="mt-3 text-sm text-florence-slate">
            Take a{" "}
            <Link to="/academy/practice" className="font-semibold text-florence-teal-dark">
              practice session
            </Link>{" "}
            and your readiness band will appear here.
          </p>
        )}
      </div>

      <RemediationCard candidateId={candidate.id} />

      <SponsoredAccessCard candidateId={candidate.id} />

      <ConsentCard />

      <PathwayTasksCard candidateId={candidate.id} pathwayConsent={candidate.consent?.pathway === true} />

      <ProgressList candidateId={candidate.id} />

      <AuditLogCard />
    </Shell>
  );
}

function VerifyBanner({ email }: { email?: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [devUrl, setDevUrl] = useState<string | null>(null);

  async function resend() {
    setStatus("sending");
    try {
      const res = await resendVerification();
      setDevUrl(res.dev_url ?? null);
      setStatus("sent");
    } catch {
      setStatus("idle");
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-amber-300/70 bg-amber-50 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Verify your email.</span>{" "}
          {email ? `We sent a confirmation link to ${email}.` : "We sent you a confirmation link."}
        </p>
        <div className="flex items-center gap-2">
          {devUrl && (
            <a
              href={devUrl}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Verify now (dev)
            </a>
          )}
          <button
            type="button"
            onClick={() => void resend()}
            disabled={status === "sending"}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : status === "sent" ? "Sent ✓ - resend" : "Resend email"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SponsoredAccessCard({ candidateId }: { candidateId: string }) {
  const [params, setParams] = useSearchParams();
  const returned = params.get("access") ?? params.get("deposit");
  const [paid, setPaid] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Auto-enrollment outcome message, surfaced only after checkout success
  // return when there was a pending cohort code from the public landing.
  const [autoEnroll, setAutoEnroll] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const pays = await fetchPayments(candidateId);
      setPaid(hasPaidSponsoredAccess(pays));
    } catch {
      setPaid(false);
    }
  }, [candidateId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Re-check after returning from checkout. If the public landing stashed a
  // pending cohort code on this candidate's tab, join the cohort now.
  useEffect(() => {
    if (returned !== "success") return;
    let alive = true;
    void (async () => {
      await refresh();
      let pending: string | null = null;
      try {
        pending = sessionStorage.getItem("florence:pending_cohort");
      } catch {
        /* private browsing */
      }
      if (pending) {
        const m = await import("../lib/academyAuth");
        const outcome = await m.selfEnroll(candidateId, pending, "deposit_paid");
        if (!alive) return;
        try {
          sessionStorage.removeItem("florence:pending_cohort");
        } catch {
          /* ignore */
        }
        if (outcome.ok) {
          setAutoEnroll(`Enrolled in ${pending}.`);
        } else if (outcome.code === "already_enrolled") {
          setAutoEnroll(`Already enrolled in ${pending}.`);
        } else if (outcome.code === "cohort_full") {
          setAutoEnroll(`${pending} is full - we'll move you to the next cohort.`);
        } else if (outcome.code === "cohort_closed") {
          setAutoEnroll(`${pending} has closed - ops will pick a new cohort for you.`);
        } else {
          setAutoEnroll(`Couldn't auto-enroll in ${pending}: ${outcome.message}. Ops will follow up.`);
        }
      }
    })();
    const t = setTimeout(() => {
      params.delete("access");
      params.delete("deposit");
      setParams(params, { replace: true });
    }, 1500);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returned]);

  // Cancelled checkout - re-fetch to surface "not paid" state, then drop param.
  useEffect(() => {
    if (returned !== "cancelled") return;
    void refresh();
    const t = setTimeout(() => {
      params.delete("access");
      params.delete("deposit");
      setParams(params, { replace: true });
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returned]);

  async function start() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await startSponsoredAccessCheckout();
      window.location.href = res.checkout_url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start checkout.");
      setBusy(false);
    }
  }

  if (paid === null) return null;

  return (
    <div className="fl-card mt-6 p-6">
      <h2 className="text-lg font-semibold">Florence Academy Global Live NCLEX Access</h2>
      {returned === "cancelled" && !paid && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Checkout cancelled. You can restart anytime.
        </p>
      )}
      {paid ? (
        <div className="mt-3 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-florence-ink">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-vital-ok/15 text-vital-ok">✓</span>
            Global Live access is active for your account.
          </div>
          {autoEnroll && (
            <p className="rounded-lg border border-florence-teal-soft bg-florence-teal-soft/40 px-3 py-2 text-sm text-florence-teal-dark">
              {autoEnroll}
            </p>
          )}
          <ApplyProgramsCta placement="checkout_success" compact />
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-florence-slate">
            Get 12 months of scheduled live online NCLEX and clinical judgment
            classes. Free Academy stays free. Hosted checkout keeps card details
            outside this app.
          </p>
          <div className="mt-4 divide-y divide-florence-line rounded-lg border border-florence-line bg-white">
            <PriceRow label="Program value" value="$200" />
            <PriceRow label="University sponsorship" value="-$100" />
            <PriceRow label="Student price" value="$100" strong />
          </div>
          {error && (
            <p className="mt-3 rounded-lg bg-vital-danger/10 px-3 py-2 text-sm text-vital-danger">{error}</p>
          )}
          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="mt-4 rounded-xl bg-florence-indigo px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark disabled:opacity-50"
          >
            {busy ? "Starting..." : "Start Global Live access - $100"}
          </button>
          <ApplyProgramsCta placement="account" compact className="mt-4" />
        </>
      )}
    </div>
  );
}

function PriceRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
      <span className="text-florence-slate">{label}</span>
      <span className={strong ? "font-semibold text-florence-ink" : "font-medium text-florence-ink"}>{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums text-florence-ink">{value}</p>
      <p className="text-xs font-medium text-florence-slate">{label}</p>
    </div>
  );
}

interface ConsentPurposeMeta {
  key: ConsentPurpose;
  title: string;
  description: string;
}

const CONSENT_PURPOSES: ConsentPurposeMeta[] = [
  {
    key: "crm_sync",
    title: "Florence team updates",
    description:
      "Let the Florence team contact you with support, reminders, and important Academy updates.",
  },
  {
    key: "pathway",
    title: "Pathway support",
    description:
      "Let Florence help organize optional next steps toward becoming a US-ready RN. You can revoke this at any time.",
  },
  {
    key: "financing",
    title: "Financing packet preparation",
    description:
      "Allow Florence to prepare an optional financing packet on your behalf if you decide to pursue financing. This does not start a loan application.",
  },
  {
    key: "employer_sharing",
    title: "Employer interview-day sharing",
    description:
      "Allow Florence to share your interview-ready Academy summary with employer partners when you choose to be considered.",
  },
  {
    key: "underwriting",
    title: "Financing review",
    description:
      "Allow Florence to help prepare financing information if you choose to apply later.",
  },
];

function ConsentCard() {
  const { candidate, reloadCandidate } = useCandidate();
  const [busy, setBusy] = useState<ConsentPurpose | null>(null);
  if (!candidate) return null;
  const consent = (candidate.consent ?? {}) as Partial<Record<ConsentPurpose, boolean>>;

  async function toggle(p: ConsentPurpose) {
    if (busy || !candidate) return;
    setBusy(p);
    try {
      await updateConsent(candidate.id, { [p]: !consent[p] });
      await reloadCandidate();
    } catch {
      /* leave the toggle in its previous position on failure */
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fl-card mt-6 p-6">
      <h2 className="text-lg font-semibold">Your consents</h2>
      <p className="mt-1 text-sm text-florence-slate">
        You control how Florence uses your data. Each consent below is independent -
        revoke any of them at any time. The free self-guided Academy never requires any
        of these.
      </p>
      <ul className="mt-4 divide-y divide-florence-line">
        {CONSENT_PURPOSES.map((p) => {
          const granted = consent[p.key] === true;
          return (
            <li key={p.key} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-florence-ink">{p.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-florence-slate">{p.description}</p>
              </div>
              <button
                type="button"
                onClick={() => void toggle(p.key)}
                disabled={busy === p.key}
                aria-pressed={granted}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  granted
                    ? "bg-vital-ok/15 text-vital-ok hover:bg-vital-ok/25"
                    : "border border-florence-line bg-white text-florence-slate hover:bg-florence-mist"
                }`}
              >
                {busy === p.key
                  ? "Saving…"
                  : granted
                    ? "✓ Granted - revoke"
                    : "Grant consent"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Phase 4b · Your Pathway ──
const PATHWAY_KIND_LABEL: Record<PathwayTaskKind, string> = {
  university_app: "University application",
  financing_packet: "Financing packet",
  i20_readiness: "I-20 readiness",
  ds160_guidance: "DS-160 guidance",
  visa_appointment: "Visa appointment",
  nclex_registration: "NCLEX registration",
  att_tracking: "ATT tracking",
  state_licensure: "State licensure",
  endorsement: "Endorsement",
  employer_packet: "Employer-ready packet",
  human_qa: "Human QA review",
};
const PATHWAY_STATUS_LABEL: Record<PathwayTaskStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  awaiting_candidate: "Needs your input",
  human_qa: "Awaiting human review",
  completed: "Completed",
  blocked: "Blocked",
};
const PATHWAY_STATUS_TONE: Record<PathwayTaskStatus, string> = {
  pending: "bg-florence-mist text-florence-slate",
  in_progress: "bg-florence-teal-soft text-florence-teal-dark",
  awaiting_candidate: "bg-amber-50 text-amber-700",
  human_qa: "bg-florence-indigo-soft text-florence-indigo-dark",
  completed: "bg-vital-ok/15 text-vital-ok",
  blocked: "bg-vital-danger/10 text-vital-danger",
};

function PathwayTasksCard({
  candidateId,
  pathwayConsent,
}: {
  candidateId: string;
  pathwayConsent: boolean;
}) {
  const [tasks, setTasks] = useState<PathwayTask[] | null>(null);

  useEffect(() => {
    if (!pathwayConsent) {
      setTasks(null);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const r = await fetchPathwayTasks(candidateId);
        if (alive) setTasks(r.latest);
      } catch {
        if (alive) setTasks([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [candidateId, pathwayConsent]);

  if (!pathwayConsent) return null;

  return (
    <div className="fl-card mt-6 p-6">
      <h2 className="text-lg font-semibold">Your pathway</h2>
      <p className="mt-1 text-sm text-florence-slate">
        A read-only summary of optional next steps. We'll tell you when something
        needs your input.
      </p>
      {tasks === null ? (
        <p className="mt-4 animate-pulse text-sm text-florence-slate">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="mt-4 text-sm text-florence-slate">
          No pathway updates yet. When support begins, your next steps will show
          up here.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-florence-line">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-florence-ink">
                  {PATHWAY_KIND_LABEL[t.kind]}
                </p>
                {t.note && t.status === "awaiting_candidate" && (
                  <p className="mt-1 text-xs text-amber-700">{t.note}</p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${PATHWAY_STATUS_TONE[t.status]}`}
              >
                {PATHWAY_STATUS_LABEL[t.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Phase 4c · Data access log (FERPA/GDPR-style transparency) ──────────────
function AuditLogCard() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const r = await fetchMyAudit(30);
        if (alive) setEntries(r);
      } catch {
        if (alive) setEntries([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (entries === null || entries.length === 0) return null;
  const grouped: Record<string, number> = {};
  for (const e of entries) grouped[e.actor] = (grouped[e.actor] ?? 0) + 1;

  return (
    <div className="fl-card mt-6 p-6">
      <h2 className="text-lg font-semibold">Data access log</h2>
      <p className="mt-1 text-sm text-florence-slate">
        Recent activity on your account. We never log the values of your data -
        only who took what action, so you can see who has touched your record.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(grouped).map(([actor, n]) => (
          <span
            key={actor}
            className="rounded-full bg-florence-mist px-2.5 py-1 text-xs font-medium text-florence-ink"
          >
            {actorLabel(actor)}: {n}
          </span>
        ))}
      </div>
      <ul className="mt-4 max-h-72 space-y-1 overflow-y-auto text-xs">
        {entries.slice(0, 20).map((e, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 border-b border-florence-line/60 py-1.5 last:border-0">
            <span className="font-mono text-florence-slate">{e.ts.slice(11, 19)}</span>
            <span className="flex-1 truncate text-florence-ink">{e.action}</span>
            <span className="font-medium text-florence-slate">{actorLabel(e.actor)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function actorLabel(actor: string): string {
  if (actor === "you") return "You";
  if (actor === "ops") return "Florence ops";
  if (actor === "agent") return "Florence support";
  if (actor === "system") return "System";
  return actor;
}

function ProgressList({ candidateId }: { candidateId: string }) {
  const [rows, setRows] = useState<ProgressRecord[] | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const p = await fetchProgress(candidateId);
        if (alive) setRows(p);
      } catch {
        if (alive) setRows([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [candidateId]);

  if (!rows) return null;
  const sorted = [...rows].sort((a, b) => a.section_slug.localeCompare(b.section_slug));

  return (
    <div className="fl-card mt-6 p-6">
      <h2 className="text-lg font-semibold">Course progress</h2>
      {sorted.length === 0 ? (
        <p className="mt-2 text-sm text-florence-slate">
          No sections started yet.{" "}
          <Link to="/learn" className="font-semibold text-florence-teal-dark">
            Pick one to begin
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-florence-line">
          {sorted.map((r) => (
            <li key={r.section_slug} className="flex items-center gap-3 py-2.5">
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                  r.status === "completed"
                    ? "bg-vital-ok/15 text-vital-ok"
                    : "bg-florence-mist text-florence-slate"
                }`}
              >
                {r.status === "completed" ? "✓" : `${r.percent}`}
              </span>
              <Link
                to={`/academy/${r.section_slug}`}
                className="flex-1 text-sm font-medium text-florence-ink hover:text-florence-teal-dark"
              >
                {SECTION_TITLE.get(r.section_slug) ?? r.section_slug}
              </Link>
              <span className="text-xs font-medium capitalize text-florence-slate">
                {r.status.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AuthForms() {
  const { login, signup } = useCandidate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [schoolSlug, setSchoolSlug] = useState("");
  const [schoolRole, setSchoolRole] = useState<AffiliationRole>("student");
  const [schools, setSchools] = useState<PublicSchool[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => setSchools(await fetchSchoolsPublic()))();
  }, []);

  const valid = useMemo(() => {
    if (!email.includes("@") || password.length < 8) return false;
    if (mode === "signup" && fullName.trim().length < 2) return false;
    return true;
  }, [email, password, fullName, mode]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const cand = await signup({
          full_name: fullName.trim(), email: email.trim(), password,
          country: country.trim() || undefined,
        });
        // Attest the school affiliation right after signup. Best effort.
        if (schoolSlug) await attestAffiliation(cand.id, schoolSlug, schoolRole);
      } else {
        await login(email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <p className="fl-eyebrow">Florence Academy</p>
      <h1 className="mt-1 text-2xl font-semibold">
        {mode === "login" ? "Sign in" : "Create your account"}
      </h1>
      <p className="mt-1 text-sm text-florence-slate">
        Save your progress across devices and track your NCLEX readiness as you study.
      </p>

      <form onSubmit={onSubmit} className="fl-card mt-5 space-y-4 p-6">
        {mode === "signup" && (
          <Field label="Full name">
            <input
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="fl-input"
              placeholder="Ana Reyes"
            />
          </Field>
        )}
        <Field label="Email">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="fl-input"
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password" hint={mode === "signup" ? "At least 8 characters" : undefined}>
          <input
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="fl-input"
            placeholder="••••••••"
          />
        </Field>
        {mode === "signup" && (
          <Field label="Country" hint="Optional">
            <input
              type="text"
              autoComplete="country-name"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="fl-input"
              placeholder="Philippines"
            />
          </Field>
        )}

        {mode === "signup" && schools.length > 0 && (
          <Field
            label="Your nursing school"
            hint="Optional"
          >
            <select
              value={schoolSlug}
              onChange={(e) => setSchoolSlug(e.target.value)}
              className="fl-input"
            >
              <option value="">- I'm not from a listed school -</option>
              {schools.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name} ({s.country})
                </option>
              ))}
            </select>
            {schoolSlug && (
              <>
                <div className="mt-2 flex gap-3 text-sm">
                  {(["student", "alumni"] as AffiliationRole[]).map((r) => (
                    <label key={r} className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="school-role"
                        checked={schoolRole === r}
                        onChange={() => setSchoolRole(r)}
                      />
                      <span className="capitalize">{r}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-florence-slate">
                  Free Academy stays free. Sponsored Global Live access is $100
                  for 12 months of scheduled online NCLEX and clinical judgment classes.
                </p>
              </>
            )}
          </Field>
        )}

        {error && (
          <p className="rounded-lg bg-vital-danger/10 px-3 py-2 text-sm font-medium text-vital-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!valid || busy}
          className="w-full rounded-xl bg-florence-indigo px-5 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark disabled:opacity-50"
        >
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-florence-slate">
        {mode === "login" ? "New to Florence Academy?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
          className="font-semibold text-florence-teal-dark hover:underline"
        >
          {mode === "login" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-florence-ink">{label}</span>
        {hint && <span className="text-xs text-florence-slate">{hint}</span>}
      </span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">{children}</div>;
}
