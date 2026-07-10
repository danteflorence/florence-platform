// ───────────────────────────────────────────────────────────────────────────
// Scenario ingest - turn an uploaded scenario document (its extracted text)
// into a DRAFT virtual-patient scenario in our schema, for an instructor to
// refine in the Scenario Studio.
//
//   • MOCK (default): deterministic. Pulls a title, a patient name, and any
//     vital-sign numbers out of the text with light regex, then emits a
//     minimal VALID scenario skeleton (baseline phase, a few generic actions,
//     one rubric decision, a debrief). The instructor fleshes it out. No key
//     required - always produces something usable.
//   • MODEL (env-gated): when MODEL_GATEWAY_URL/KEY are set, ask the model to
//     draft a full scenario from the text against a schema description. Falls
//     back to the skeleton on any failure. Request shape isolated in one
//     function for the key owner to wire.
//
// The emitted skeleton is constructed to satisfy the SPA's validateScenario
// (first phase atSec 0, rubric references existing actions, etc.) - the Studio
// re-validates client-side before an instructor can save or submit it.
// ───────────────────────────────────────────────────────────────────────────

export interface IngestRequest {
  text: string;
  /** Optional title/clientNeed hints from the upload form. */
  title?: string;
  clientNeed?: string;
}

export interface IngestResult {
  scenario: Record<string, unknown>;
  source: "mock" | "model";
  /** Notes for the author about what was auto-filled vs. needs their attention. */
  notes: string[];
}

const CLIENT_NEEDS = [
  "management-of-care",
  "safety-infection-control",
  "health-promotion",
  "psychosocial-integrity",
  "basic-care-comfort",
  "pharmacological-therapies",
  "reduction-of-risk",
  "physiological-adaptation",
];

function slugId(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return `vp-authored-${base || "scenario"}-${Date.now().toString(36)}`;
}

function num(re: RegExp, text: string, fallback: number): number {
  const m = text.match(re);
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

/** Best-effort vital extraction from free text (HR 136, BP 84/40, SpO2 80, RR 32). */
function extractVitals(text: string) {
  const t = text.replace(/\s+/g, " ");
  const bp = t.match(/\b(\d{2,3})\s*\/\s*(\d{2,3})\b/);
  return {
    hr: num(/\bHR[:\s]*?(\d{2,3})/i, t, 88),
    sbp: bp ? Number(bp[1]) : 120,
    dbp: bp ? Number(bp[2]) : 74,
    rr: num(/\bRR[:\s]*?(\d{1,2})/i, t, 18),
    spo2: num(/\b(?:SpO2|SPO2|O2 sat|sat)[:\s]*?(\d{2,3})/i, t, 96),
    tempC: 37,
    pain: 3,
    rhythm: "Sinus rhythm",
    loc: "alert" as const,
  };
}

function pickClientNeed(hint: string | undefined): string {
  return hint && CLIENT_NEEDS.includes(hint) ? hint : "physiological-adaptation";
}

/** A minimal VALID scenario skeleton the instructor edits into a real one. */
export function scenarioSkeleton(req: IngestRequest): { scenario: Record<string, unknown>; notes: string[] } {
  const title = (req.title || "Untitled scenario").slice(0, 120);
  const vitals = extractVitals(req.text);
  const nameMatch = req.text.match(/Patient Name[:\s]*([A-Z][a-zA-Z'’-]+(?:\s[A-Z][a-zA-Z'’-]+)?)/);
  const patientName = nameMatch ? nameMatch[1] : "New Patient";
  const clientNeed = pickClientNeed(req.clientNeed);

  const scenario = {
    id: slugId(title),
    title,
    status: "draft",
    setting: "Edit this: the unit, time, and situation the learner walks into.",
    clientNeed,
    patient: {
      name: patientName,
      age: num(/\bAge[:\s]*?(\d{1,3})/i, req.text, 50),
      sex: /female/i.test(req.text) ? "F" : /male/i.test(req.text) ? "M" : "F",
      history: ["Edit: relevant history"],
      allergies: ["No known allergies"],
      meds: ["Edit: home meds"],
      chart: [{ id: "notes", label: "Nurses' Notes", body: "Edit: handoff and chart context." }],
    },
    initialVitals: vitals,
    durationSec: 600,
    phases: [
      {
        id: "p0-baseline",
        atSec: 0,
        cues: [
          { id: "c-opening", text: "Edit: the opening cue the learner notices.", channel: "patient", critical: true },
        ],
        patientLine: { text: "Edit: what the patient says first." },
      },
    ],
    actions: [
      { id: "check_vitals", label: "Take a full set of vitals", category: "assess", durationSec: 10, cooldownSec: 30, repeatable: true },
      { id: "notify_provider", label: "SBAR the provider", category: "communicate", durationSec: 30 },
    ],
    rules: [
      {
        id: "r-notify",
        when: { actionTaken: "notify_provider" },
        effects: [
          { kind: "setFlag", flag: "provider_notified" },
          { kind: "narrate", text: "Edit: the provider's orders." },
        ],
      },
    ],
    rubric: [
      {
        decisionId: "d-vitals",
        label: "Get a full set of vitals early",
        ncjmmStep: "recognize-cues",
        clientNeed,
        correctActions: ["check_vitals"],
        opensAtSec: 0,
        windowSec: 120,
        errorTypeIfMissed: "missed_cue",
        weight: 1,
      },
      {
        decisionId: "d-escalate",
        label: "Escalate with SBAR",
        ncjmmStep: "take-actions",
        clientNeed: "management-of-care",
        correctActions: ["notify_provider"],
        opensAtSec: 0,
        windowSec: 300,
        errorTypeIfMissed: "unsafe_delay",
        weight: 2,
      },
    ],
    debrief: {
      outcomeSummaries: {
        stabilized: "Edit: the good-outcome debrief frame.",
        deteriorated: "Edit: the bad-outcome debrief frame.",
        time_end: "Edit: the ran-out-of-time debrief frame.",
      },
      optimalTimeline: [
        { atSec: 0, label: "Vitals", actionId: "check_vitals" },
        { atSec: 120, label: "Escalate", actionId: "notify_provider" },
      ],
    },
    narration: [],
    patientResponses: [
      { match: ["feel", "how"], text: "Edit: how the patient answers." },
    ],
  };

  const notes = [
    `Auto-filled a skeleton from your document. Vitals detected: HR ${vitals.hr}, BP ${vitals.sbp}/${vitals.dbp}, SpO2 ${vitals.spo2}, RR ${vitals.rr}.`,
    "Replace every 'Edit:' placeholder, add the cues/actions/phases your scenario needs, then validate.",
    "This ships as a draft - a clinical reviewer approves it before learners see it.",
  ];
  return { scenario, notes };
}

function ingestConfigured(): boolean {
  return Boolean(process.env.MODEL_GATEWAY_URL && process.env.MODEL_GATEWAY_KEY);
}

async function modelDraft(req: IngestRequest): Promise<IngestResult> {
  const system = [
    "You convert a nursing clinical-simulation scenario document into a JSON virtual-patient scenario.",
    "Output ONLY valid JSON matching this shape: { id, title, status:'draft', setting, clientNeed, patient:{name,age,sex,history[],allergies[],meds[],chart:[{id,label,body}]}, initialVitals:{hr,sbp,dbp,rr,spo2,tempC,pain,rhythm,loc}, durationSec, phases:[{id,atSec,vitalsDrift?,cues?,patientLine?}], actions:[{id,label,category,durationSec,...}], rules:[{id,when,effects}], rubric:[{decisionId,label,ncjmmStep,clientNeed,correctActions[],windowSec,errorTypeIfMissed,weight}], debrief, narration:[], patientResponses:[] }.",
    "The first phase must be atSec 0. Every rubric.correctActions id must exist in actions. Compress real timelines ~6:1 for a 10-minute run. Do not invent facts beyond the document.",
  ].join("\n");
  const res = await fetch(process.env.MODEL_GATEWAY_URL as string, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.MODEL_GATEWAY_KEY}` },
    body: JSON.stringify({ system, user: req.text.slice(0, 12000), max_tokens: 4000, response_format: "json" }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`model gateway ${res.status}`);
  const j = (await res.json()) as { text?: string };
  if (!j.text) throw new Error("model gateway: empty draft");
  const scenario = JSON.parse(j.text) as Record<string, unknown>;
  return { scenario, source: "model", notes: ["Drafted by the model from your document. Review every field, then validate - the model can be wrong."] };
}

export async function ingestScenario(req: IngestRequest): Promise<IngestResult> {
  if (ingestConfigured()) {
    try {
      return await modelDraft(req);
    } catch {
      /* fall back to the deterministic skeleton */
    }
  }
  const { scenario, notes } = scenarioSkeleton(req);
  return { scenario, source: "mock", notes };
}
