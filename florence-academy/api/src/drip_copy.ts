// ───────────────────────────────────────────────────────────────────────────
// Candidate drip campaign copy (Phase 3) - single source of truth for the
// email sequence that invites internationally-educated nurses (imported as
// `leads`) to the live NCLEX-RN bootcamp.
//
// BRAND RULES (enforced; a smoke test lints these):
//   - Value + activation copy ONLY. NEVER FICA / visa / immigration / tax.
//   - No em-dashes. No italics. Periods.
//   - Substitutions are simple {var} replacement; missing vars degrade
//     gracefully (the sentence still reads).
//
// SEQUENCE (re-permission first - the operator default):
//   step 0  invited  Welcome + "what school did you train at?" enrichment.
//                    The ONLY email an "invited" lead gets until they opt in.
//   step 1+ engaged  Sent only after the lead clicks (consent). Value sequence.
// ───────────────────────────────────────────────────────────────────────────

export const DRIP_MAX_STEP = 5; // steps 0..5 inclusive
export const DRIP_STAGE_COUNT = DRIP_MAX_STEP + 1;

export interface DripContext {
  firstname: string;
  /** Joined from the lead's school_slug, when known. */
  schoolName?: string;
  /** True when the joined school is tier affiliate|lab_partner (partner). */
  isPartnerSchool: boolean;
  /** e.g. "the Manila cohort on July 6". Omitted when no upcoming cohort. */
  cohortLabel?: string;
  /** School-picker URL (captures school_slug + consent). */
  enrichUrl: string;
  /** Curriculum Navigator / "what a week looks like". */
  learnUrl: string;
  /** Reserve-a-seat signup. */
  signupUrl: string;
  /** One-click unsubscribe. */
  unsubUrl: string;
}

export interface RenderedDripEmail {
  subject: string;
  text: string;
  html: string;
}

interface StageSpec {
  /** Which lifecycle_stage a lead transitions INTO after this step sends.
   *  undefined = no transition (stay in current stage). */
  advanceTo?: "engaged";
  subject: (c: DripContext) => string;
  /** Body paragraphs (no greeting, no unsubscribe - those are added). */
  paragraphs: (c: DripContext) => string[];
}

const greeting = (c: DripContext) => `Hi ${c.firstname || "there"},`;

const STAGES: StageSpec[] = [
  // ── Step 0 - Welcome + school enrichment (the opt-in / re-permission email) ──
  {
    subject: () => "You trained as a nurse. The NCLEX-RN is the next step.",
    paragraphs: (c) => [
      "Florence Academy runs a live NCLEX-RN bootcamp built for internationally educated nurses. Real instructors, a real cohort, and a clear plan from day one.",
      `Before we send the details, tell us where you trained so we can tailor what you see. Pick your nursing school here: ${c.enrichUrl}`,
      "Picking your school also unlocks any partner benefit your school qualifies for.",
    ],
  },
  // ── Step 1 - Who we are / what the bootcamp is (engaged only) ──
  {
    subject: () => "A live cohort, not another video library",
    paragraphs: (c) => [
      "Here is how the Florence Academy bootcamp works. You join a live cohort with set class times, an instructor who knows your name, and adaptive practice between sessions.",
      "Most learners tell us the live format is what finally made the material stick.",
      `See the schedule and what a week looks like: ${c.learnUrl}`,
    ],
  },
  // ── Step 2 - Offer ($75 partner rate when the school qualifies) ──
  {
    subject: (c) =>
      c.isPartnerSchool
        ? "Your school qualifies you for a $75 start"
        : "Reserve your seat in the next cohort",
    paragraphs: (c) =>
      c.isPartnerSchool
        ? [
            `Good news. Because you trained at ${c.schoolName ?? "your school"}, you qualify for 25 percent off the bootcamp and a reduced $75 deposit to hold your seat. The standard deposit is $100.`,
            `Reserve your seat: ${c.signupUrl}`,
          ]
        : [
            "You can hold your seat in the live bootcamp with a $100 deposit, applied to tuition when you enroll.",
            `Reserve your seat: ${c.signupUrl}`,
          ],
  },
  // ── Step 3 - Cohort-aware nudge ──
  {
    subject: (c) =>
      c.cohortLabel ? `The ${c.cohortLabel} starts soon` : "The next cohort starts soon",
    paragraphs: (c) => [
      c.cohortLabel
        ? `${capitalize(c.cohortLabel)} begins soon and seats are limited. If you have been meaning to start, this is the one.`
        : "The next live cohort begins soon and seats are limited. If you have been meaning to start, this is the one.",
      `Reserve your seat: ${c.signupUrl}`,
    ],
  },
  // ── Step 4 - Reminder ──
  {
    subject: () => "Still planning to take the NCLEX-RN?",
    paragraphs: (c) => [
      "A quick nudge. Your seat in the live bootcamp is still open and we would love to have you in the next cohort.",
      `Here is everything in one place: ${c.signupUrl}`,
    ],
  },
  // ── Step 5 - Last call ──
  {
    subject: (c) =>
      c.cohortLabel ? `Last call for the ${c.cohortLabel}` : "Last call for the next cohort",
    paragraphs: (c) => [
      "Enrollment closes soon. If the timing is not right we will stop here, no problem.",
      `If it is, reserve your seat now: ${c.signupUrl}`,
    ],
  },
];

/** Render the email for a given drip step. Throws on an out-of-range step. */
export function renderDripStage(step: number, ctx: DripContext): RenderedDripEmail {
  const spec = STAGES[step];
  if (!spec) throw new Error(`drip: no stage ${step}`);
  const subject = spec.subject(ctx);
  const paras = spec.paragraphs(ctx);
  const unsub = `If you would rather not hear from us, unsubscribe here: ${ctx.unsubUrl}`;
  const text = [greeting(ctx), ...paras, unsub].join("\n\n");
  const html = [
    `<p>${escapeHtml(greeting(ctx))}</p>`,
    ...paras.map((p) => `<p>${linkify(escapeHtml(p))}</p>`),
    `<p style="color:#6b7280;font-size:12px">${linkify(escapeHtml(unsub))}</p>`,
  ].join("\n");
  return { subject, text, html };
}

/** Which lifecycle_stage a successful send at `step` transitions the lead into.
 *  Step 0 keeps "invited" (consent gate); steps 1+ keep "engaged". */
export function stageAdvanceTarget(step: number): "engaged" | undefined {
  return STAGES[step]?.advanceTo;
}

// ── helpers ──────────────────────────────────────────────────────────────────
function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
/** Turn bare https URLs in already-escaped text into anchors. */
function linkify(s: string): string {
  return s.replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}">${u}</a>`);
}

/** For the brand-lint smoke test: every subject + paragraph across all stages,
 *  rendered with a representative context, so the test can assert no forbidden
 *  language / em-dashes / italics ever ship. */
export function allDripCopyForLint(): string[] {
  const ctx: DripContext = {
    firstname: "Ana",
    schoolName: "University of Santo Tomas",
    isPartnerSchool: true,
    cohortLabel: "Manila cohort on July 6",
    enrichUrl: "https://florenceedu.com/x",
    learnUrl: "https://florenceedu.com/x",
    signupUrl: "https://florenceedu.com/x",
    unsubUrl: "https://florenceedu.com/x",
  };
  const out: string[] = [];
  for (let step = 0; step < DRIP_STAGE_COUNT; step++) {
    for (const partner of [true, false]) {
      const r = renderDripStage(step, { ...ctx, isPartnerSchool: partner });
      out.push(r.subject, r.text, r.html);
    }
  }
  return out;
}
