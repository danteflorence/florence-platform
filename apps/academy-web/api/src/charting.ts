// ───────────────────────────────────────────────────────────────────────────
// charting.ts - graded charting practice, the first-90-days skill nobody
// teaches: US-style nursing documentation. Deterministic heuristic grader
// (same mock-by-default posture as the tutor/patient-voice: works offline and
// in tests; a model gateway can later polish the PROSE of the feedback, but
// the checks themselves stay rule-based and auditable).
//
// What good charting is, per every US hospital's documentation policy:
//   - objective (no opinions, no blame),
//   - complete (the findings and interventions that mattered),
//   - timed (when things happened),
//   - closed-loop (who was notified and their response).
// ───────────────────────────────────────────────────────────────────────────

export interface ChartExpectation {
  /** Key findings/interventions the note must mention (short labels). */
  mustMention: string[];
}

export interface ChartFeedback {
  score: number; // 0..1
  found: string[];
  missing: string[];
  style_flags: string[];
  feedback: string;
}

// Subjective/blame phrasing → the professional replacement. Charting language
// is legal language: "patient is difficult" has ended careers.
const STYLE_RULES: { pattern: RegExp; flag: string }[] = [
  { pattern: /\b(uncooperative|difficult|rude|lazy|non-?compliant)\b/i, flag: 'Avoid labeling the patient ("uncooperative", "noncompliant") - chart the observable behavior instead: "declined medication, states…".' },
  { pattern: /\bI think\b|\bprobably\b|\bmaybe\b|\bseems? (like|to be)?\b/i, flag: 'Avoid speculation ("I think", "seems", "probably") - chart what you observed and measured.' },
  { pattern: /\b(good|fine|normal|okay|ok)\b(?!\s*to)/i, flag: 'Avoid vague qualifiers ("good", "fine", "normal") - chart the actual values and findings.' },
  { pattern: /\bappears?\b/i, flag: '"Appears" is acceptable only for observations you cannot measure - prefer the measurement when one exists.' },
  { pattern: /\b(error|mistake|accidentally|blame|fault)\b/i, flag: "Never chart blame or the word \"error\" - document facts and the incident report handles the rest (and is never mentioned in the chart)." },
];

const TIME_RE = /\b\d{1,2}:\d{2}\b|\b\d{4}\s?(hrs|hours)\b|\bat\s+\d{3,4}\b/i;
const NUMBER_RE = /\d/;
const NOTIFY_RE = /\b(notified|paged|called|informed|contacted|reported to)\b/i;

// Nurses chart in abbreviations; expectations arrive as prose. Expand both to
// canonical words before matching so "BP 86/54" satisfies "blood pressure".
const ABBREV: [RegExp, string][] = [
  [/\bsbp\b/g, "systolic blood pressure"],
  [/\bbp\b/g, "blood pressure"],
  [/\bhr\b/g, "heart rate"],
  [/\brr\b/g, "respiratory rate"],
  [/\bspo2\b|\bsats?\b/g, "oxygen saturation"],
  [/\bo2\b/g, "oxygen"],
  [/\bnc\b/g, "nasal cannula"],
  [/\bivf?\b/g, "intravenous"],
  [/\bmd\b|\bdr\.?\b/g, "provider"],
];

function normalize(text: string): string {
  let t = text.toLowerCase();
  for (const [re, word] of ABBREV) t = t.replace(re, word);
  return t;
}

/** Significant tokens of an expected element (words > 3 chars + numbers). */
function tokens(label: string): string[] {
  return normalize(label)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3 || /^\d{2,3}$/.test(t));
}

export function gradeChartNote(note: string, expected: ChartExpectation): ChartFeedback {
  const low = normalize(note);
  const found: string[] = [];
  const missing: string[] = [];
  for (const item of expected.mustMention) {
    const toks = tokens(item);
    const hits = toks.filter((t) => low.includes(t)).length;
    // Mentioned = at least half the tokens, or any two significant tokens.
    if (toks.length === 0 || hits >= Math.ceil(toks.length / 2) || hits >= 2) found.push(item);
    else missing.push(item);
  }
  const coverage = expected.mustMention.length ? found.length / expected.mustMention.length : 1;

  const style_flags = STYLE_RULES.filter((r) => r.pattern.test(note)).map((r) => r.flag);

  const structureChecks: { pass: boolean; miss: string }[] = [
    { pass: TIME_RE.test(note), miss: "Add times - when you assessed, intervened, and reassessed. Untimed charting is unusable in a review." },
    { pass: NUMBER_RE.test(note), miss: "Chart the numbers - actual vitals and measurements, not descriptions of them." },
    { pass: NOTIFY_RE.test(note), miss: "Close the loop - document WHO you notified and their response. If it isn't charted, it didn't happen." },
  ];
  const structure = structureChecks.filter((c) => c.pass).length / structureChecks.length;

  const score = Math.round((coverage * 0.6 + structure * 0.4) * (style_flags.length ? 0.9 : 1) * 1000) / 1000;

  const lines: string[] = [];
  if (missing.length === 0 && structure === 1 && style_flags.length === 0) {
    lines.push("This note would stand up in a chart review: objective, complete, timed, and the escalation loop is closed.");
  } else {
    if (missing.length) lines.push(`Missing from the note: ${missing.join("; ")}.`);
    for (const c of structureChecks) if (!c.pass) lines.push(c.miss);
    if (style_flags.length === 0 && missing.length === 0) lines.push("Content is complete - tighten the structure points above.");
  }
  return { score, found, missing, style_flags, feedback: lines.join(" ") };
}
