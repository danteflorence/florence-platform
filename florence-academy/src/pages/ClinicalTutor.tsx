import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCandidate } from "../lib/CandidateContext";
import { ApplyProgramsCta } from "../components/ApplyProgramsCta";

type ModeKey =
  | "teach"
  | "quiz"
  | "review"
  | "simulate"
  | "plan"
  | "listen"
  | "explain"
  | "remediate";

type ReviewTab = "answer" | "judgment" | "distractors" | "listen" | "next";

interface TutorMode {
  key: ModeKey;
  label: string;
  purpose: string;
  prompt: string;
  action: string;
}

const TUTOR_MODES: TutorMode[] = [
  {
    key: "review",
    label: "Review",
    purpose: "Analyze the missed item",
    prompt: "You selected B. What cue made that answer feel tempting?",
    action: "Open rationale tutor",
  },
  {
    key: "teach",
    label: "Teach",
    purpose: "Explain from approved content",
    prompt: "Explain sepsis escalation using the cues from the question bank.",
    action: "Teach concept",
  },
  {
    key: "quiz",
    label: "Quiz",
    purpose: "Ask and grade questions",
    prompt: "Give me one prioritization question, then wait for my answer.",
    action: "Start quiz",
  },
  {
    key: "simulate",
    label: "Simulate",
    purpose: "Run a patient scenario",
    prompt: "A post-op patient is pale, restless, and hypotensive. Start the handoff.",
    action: "Start scenario",
  },
  {
    key: "explain",
    label: "Explain back",
    purpose: "Score spoken reasoning",
    prompt: "Explain why your action is safer than the other options.",
    action: "Record reasoning",
  },
  {
    key: "listen",
    label: "Listen",
    purpose: "Play audio coaching",
    prompt: "Today: a 3-minute review on deterioration cues before the next case.",
    action: "Play coach",
  },
  {
    key: "remediate",
    label: "Remediate",
    purpose: "Assign targeted review",
    prompt: "Priority errors appeared twice under time pressure. Review one case and three items.",
    action: "Assign review",
  },
  {
    key: "plan",
    label: "Plan",
    purpose: "Build a study path",
    prompt: "Create a 30-minute pharmacology plan from my weak subscales.",
    action: "Make plan",
  },
];

const REVIEW_TABS: { key: ReviewTab; label: string }[] = [
  { key: "answer", label: "Answer" },
  { key: "judgment", label: "Clinical judgment" },
  { key: "distractors", label: "Why not the others" },
  { key: "listen", label: "Listen" },
  { key: "next", label: "Review next" },
];

const ROUND_ITEMS = [
  { label: "Missed question", detail: "Sepsis deterioration", status: "Ready" },
  { label: "Similar question", detail: "Priority action under hypotension", status: "Queued" },
  { label: "NGN item", detail: "Recognize cues + take action", status: "Queued" },
  { label: "Patient scenario", detail: "Charge nurse escalation", status: "Voice-ready" },
  { label: "Explain back", detail: "15-45 second safety rationale", status: "Awaiting" },
  { label: "Remediation", detail: "Deterioration cues playlist", status: "Assigned" },
];

const CJMM_STEPS = [
  ["Recognize cues", "Hypotension, altered mental status, fever, tachycardia."],
  ["Analyze cues", "The cues cluster around worsening perfusion and infection."],
  ["Prioritize hypotheses", "Sepsis with clinical deterioration outranks isolated fever management."],
  ["Generate solutions", "Escalate care, prepare oxygen, anticipate cultures, fluids, and antibiotics."],
  ["Take action", "Notify the provider or rapid response per protocol after immediate assessment."],
  ["Evaluate outcomes", "Improved mentation, pressure, urine output, lactate trend, and oxygenation."],
];

const SIMULATIONS = [
  "Sepsis deterioration",
  "Post-op hemorrhage",
  "Hypoglycemia with altered mental status",
  "Pediatric asthma exacerbation",
  "Chest pain / possible MI",
  "Stroke symptoms",
  "Postpartum hemorrhage",
  "Medication error / near miss",
  "Fall risk and delegation",
  "SBAR escalation to physician",
];

const PRACTICE_INSIGHTS = [
  ["Priority action", "Choose the safest first action when vital signs change."],
  ["Cue recognition", "Name the cues that prove the patient is deteriorating."],
  ["Explain back", "Practice a clear, safe rationale in your own words."],
  ["SBAR", "Put assessment cues in a tighter handoff order."],
  ["Focused review", "Review deterioration cues under time pressure."],
];

const AUDIO_QUEUE = [
  ["Audio rationales", "High-yield missed questions"],
  ["NCJMM walkthroughs", "Six-step clinical judgment coaching"],
  ["Patient voices", "Short scenario practice"],
  ["Daily coach", "Personalized briefings"],
  ["SBAR practice", "Explain-back and interview readiness"],
];

const DEFAULT_FOCUS = ["prioritization", "deterioration cues", "pharmacology safety"];

export default function ClinicalTutor() {
  const { status, candidate, readiness, apiEnabled } = useCandidate();
  const [mode, setMode] = useState<ModeKey>("review");
  const [tab, setTab] = useState<ReviewTab>("answer");
  const [scenario, setScenario] = useState(SIMULATIONS[0]);

  const activeMode = TUTOR_MODES.find((m) => m.key === mode) ?? TUTOR_MODES[0];
  const readinessPct = readiness?.readiness != null ? Math.round(readiness.readiness * 100) : null;
  const focusAreas = readiness?.focus_areas?.length ? readiness.focus_areas.slice(0, 3) : DEFAULT_FOCUS;
  const firstName = candidate?.full_name.split(" ")[0] || "Florence nurse";

  const roundLabel = useMemo(() => {
    if (!apiEnabled) return "Demo round";
    if (status === "authenticated") return `${firstName}'s round`;
    return "Sign in to personalize";
  }, [apiEnabled, firstName, status]);

  return (
    <div className="bg-florence-mist">
      <section className="border-b border-florence-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:py-10">
          <div>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
              FlorenceRN Interactive Tutor
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-florence-slate sm:text-base">
              Talk through NCLEX questions, practice clinical judgment, listen to
              rationales, and get a focused next step.
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-florence-slate sm:text-base">
              The tutor uses reviewed Florence lessons, question rationales, and
              the NCSBN Clinical Judgment Model.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/academy/practice"
                className="rounded-xl bg-florence-indigo px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark"
              >
                Start adaptive practice
              </Link>
              <a
                href="#round"
                className="rounded-xl border border-florence-line bg-white px-4 py-2.5 text-sm font-semibold text-florence-ink transition-colors hover:bg-florence-mist"
              >
                Open today's round
              </a>
            </div>
            <ApplyProgramsCta placement="tutor" compact className="mt-5 max-w-2xl" />
          </div>

          <div className="rounded-2xl border border-florence-line bg-florence-mist p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-florence-slate">
                  Exam readiness
                </p>
                <p className="mt-1 text-2xl font-semibold text-florence-ink">
                  {readinessPct != null ? `${readinessPct}%` : "Not assessed"}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-florence-teal-dark">
                Private coaching
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Metric label="Ways to practice" value="8" />
              <Metric label="CJ steps" value="6" />
              <Metric label="Next steps" value="Daily" />
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-florence-slate">
                Current focus
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {focusAreas.map((area) => (
                  <span key={area} className="fl-pill bg-white">
                    {area.replace(/-/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="round" className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="fl-eyebrow">Today's Clinical Judgment Round</p>
            <h2 className="mt-1 text-2xl font-semibold">{roundLabel}</h2>
          </div>
          <p className="text-sm text-florence-slate">15-20 minutes, generated from prior misses.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {ROUND_ITEMS.map((item, index) => (
            <div key={item.label} className="rounded-2xl border border-florence-line bg-white p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-florence-teal-soft text-sm font-bold text-florence-teal-dark">
                  {index + 1}
                </span>
                <span className="rounded-full bg-florence-mist px-2.5 py-1 text-xs font-semibold text-florence-slate">
                  {item.status}
                </span>
              </div>
              <p className="mt-3 font-semibold text-florence-ink">{item.label}</p>
              <p className="mt-1 text-sm text-florence-slate">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-4 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-florence-line bg-white p-4 shadow-card">
          <p className="fl-eyebrow">Mode selector</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {TUTOR_MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  mode === m.key
                    ? "border-florence-teal bg-florence-teal-soft text-florence-ink"
                    : "border-florence-line bg-white text-florence-slate hover:border-florence-teal"
                }`}
              >
                <span className="text-sm font-semibold">{m.label}</span>
                <span className="mt-1 block text-xs leading-5">{m.purpose}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-florence-line bg-white p-5 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="fl-eyebrow">{activeMode.label} mode</p>
              <h2 className="mt-1 text-2xl font-semibold">{activeMode.purpose}</h2>
            </div>
            <button
              type="button"
              className="w-fit rounded-xl bg-florence-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-florence-teal-dark"
            >
              {activeMode.action}
            </button>
          </div>
          <div className="mt-5 rounded-xl border border-florence-line bg-florence-mist p-4">
            <p className="text-sm font-medium text-florence-slate">
              Tutor prompt
            </p>
            <p className="mt-2 text-base leading-7 text-florence-ink">{activeMode.prompt}</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SmallSignal label="Grounding" value="Reviewed content" />
            <SmallSignal label="Framework" value="NCJMM guided" />
            <SmallSignal label="Next step" value="Targeted review" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-florence-line bg-white p-5 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="fl-eyebrow">Rationale Tutor</p>
              <h2 className="mt-1 text-2xl font-semibold">Why B is tempting, and why it is unsafe first.</h2>
            </div>
            <span className="w-fit rounded-full bg-vital-danger/10 px-3 py-1 text-xs font-semibold text-vital-danger">
              Priority error
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5 border-b border-florence-line">
            {REVIEW_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`-mb-px rounded-t-md px-3 py-2 text-xs font-semibold ${
                  tab === t.key
                    ? "border-b-2 border-florence-teal-dark text-florence-teal-dark"
                    : "text-florence-slate hover:text-florence-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="mt-4 min-h-[14rem]">
            {tab === "answer" && (
              <ReviewPanel
                title="Correct answer"
                body="Escalate care for likely deterioration. The abnormal respiratory rate matters, but new hypotension and altered mental status make perfusion and sepsis escalation the safer first priority."
              />
            )}
            {tab === "judgment" && (
              <ol className="space-y-2">
                {CJMM_STEPS.map(([label, body], index) => (
                  <li key={label} className="rounded-xl border border-florence-line bg-florence-mist p-3">
                    <p className="text-sm font-semibold text-florence-ink">
                      {index + 1}. {label}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-florence-slate">{body}</p>
                  </li>
                ))}
              </ol>
            )}
            {tab === "distractors" && (
              <div className="space-y-3">
                <ReviewPanel
                  title="Why B is tempting"
                  body="It addresses an abnormal respiratory cue, but it does not respond to the full deterioration picture. The safest answer acts on perfusion and escalation first."
                />
                <ReviewPanel
                  title="Why C delays care"
                  body="Rechecking later gathers data, but the patient already has enough priority cues to justify immediate escalation."
                />
              </div>
            )}
            {tab === "listen" && (
              <ReviewPanel
                title="Audio coach queued"
                body="This is ready for ElevenLabs as a reusable 60-90 second rationale: cue cluster, error type, safer first action, and one teach-back prompt."
              />
            )}
            {tab === "next" && (
              <ReviewPanel
                title="Next remediation"
                body="Complete one similar prioritization item, one sepsis unfolding case, and a 30-second explain-back: 'Which cue proves the patient is deteriorating?'"
              />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-florence-line bg-white p-5 shadow-card">
          <p className="fl-eyebrow">Simulation lab</p>
          <h2 className="mt-1 text-2xl font-semibold">First 10 cases</h2>
          <label className="mt-4 block text-sm font-semibold text-florence-ink" htmlFor="scenario">
            Scenario
          </label>
          <select
            id="scenario"
            value={scenario}
            onChange={(event) => setScenario(event.target.value)}
            className="fl-input mt-2"
          >
            {SIMULATIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <div className="mt-4 rounded-xl border border-florence-line bg-florence-mist p-4">
            <p className="text-sm font-semibold text-florence-ink">{scenario}</p>
            <p className="mt-2 text-sm leading-6 text-florence-slate">
              Ask assessment questions, identify priority cues, choose the first safe
              action, then give SBAR to a charge nurse or physician.
            </p>
          </div>
          <div className="mt-4 space-y-2">
            {["Cue capture", "Priority action", "SBAR quality", "Safety score"].map((label, index) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-xs font-semibold text-florence-slate">
                  <span>{label}</span>
                  <span>{82 - index * 7}%</span>
                </div>
                <div className="h-2 rounded-full bg-florence-mist">
                  <div
                    className="h-2 rounded-full bg-florence-teal"
                    style={{ width: `${82 - index * 7}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-12 sm:px-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-florence-line bg-white p-5 shadow-card">
          <p className="fl-eyebrow">Practice insights</p>
          <h2 className="mt-1 text-2xl font-semibold">Your next step gets clearer as you practice.</h2>
          <div className="mt-4 divide-y divide-florence-line">
            {PRACTICE_INSIGHTS.map(([skill, detail]) => (
              <div key={skill} className="grid gap-2 py-3 sm:grid-cols-[0.55fr_1fr]">
                <span className="text-sm font-semibold text-florence-ink">{skill}</span>
                <span className="text-sm text-florence-slate">{detail}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-florence-line bg-white p-5 shadow-card">
          <p className="fl-eyebrow">Voice practice</p>
          <h2 className="mt-1 text-2xl font-semibold">Audio coaching for questions and scenarios.</h2>
          <div className="mt-4 space-y-3">
            {AUDIO_QUEUE.map(([label, detail], index) => (
              <div key={label} className="flex gap-3 rounded-xl border border-florence-line bg-florence-mist p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-xs font-bold text-florence-indigo">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-florence-ink">{label}</p>
                  <p className="text-sm text-florence-slate">{detail}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-xl bg-florence-indigo-soft px-4 py-3 text-sm font-semibold text-florence-indigo-dark">
            FlorenceRN explains from reviewed course material.
          </p>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-3">
      <p className="text-lg font-semibold text-florence-ink">{value}</p>
      <p className="text-xs font-medium text-florence-slate">{label}</p>
    </div>
  );
}

function SmallSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-florence-line bg-white p-3">
      <p className="text-xs font-medium text-florence-slate">{label}</p>
      <p className="mt-1 text-sm font-semibold text-florence-ink">{value}</p>
    </div>
  );
}

function ReviewPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-florence-line bg-florence-mist p-4">
      <p className="text-sm font-semibold text-florence-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-florence-slate">{body}</p>
    </div>
  );
}
