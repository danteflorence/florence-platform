// ───────────────────────────────────────────────────────────────────────────
// Florence Academy mailpiece renderer — postcard (6x11) + letter (8.5x11).
//
// Adapted from the Florence labor-economics `florence_postcard.py` reference.
// Renders standalone HTML documents sized for Lob's print API:
//   - postcard_6x11: 11in × 6in canvas at 96px/inch (1056×576 css px)
//   - letter_us:    8.5in × 11in canvas at 96px/inch (816×1056 css px)
//
// Compliance (carried over from the Python reference):
//   - Value + activation copy ONLY. NO FICA / visa / tax / immigration.
//   - No italics, no em-dashes (per brand voice).
//   - Theme: teal (default) or purple. Both follow the Florence palette.
//
// QR code rendering: we delegate to quickchart.io's QR endpoint (a free,
// reputable QR service) so we don't have to pull in a Node QR encoder.
// The URL we encode is `${FLORENCE_SIGNUP_URL}?code=FLOR-XXXXX`, which
// reveals only the activation code; no PII leaves our infrastructure.
// To swap for an inline data: URL, replace `qrImgSrc` with whatever
// returns a base64-encoded image.
//
// Lob renders these HTML strings to PDF on its side. We never embed a real
// address barcode or postage indicia — Lob does that in the reserved zone
// on the right side of the postcard back / above the address on a letter.
// ───────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { OutreachMailFormat, OutreachTheme, OutreachTarget } from "./types.ts";

// Read the copy JSON at module load. Keeping it in a separate file lets ops
// edit the copy without touching code — same pattern as postcard_copy.json
// in the labor-economics reference.
const __dirname = dirname(fileURLToPath(import.meta.url));
const COPY = JSON.parse(
  readFileSync(join(__dirname, "outreach_copy.json"), "utf8"),
) as typeof COPY_TYPE;

// Type-only shape so TS can validate index access into COPY.
// This stays in sync with outreach_copy.json by inspection.
const COPY_TYPE = {
  themes: {} as Record<
    OutreachTheme,
    {
      ac: string;
      ac_deep: string;
      ac_text: string;
      ac_wash: string;
      ac_tint: string;
      sec_text: string;
      sec_wash: string;
    }
  >,
  postcard: {
    front: {
      eyebrow: "",
      head_quote: "",
      sub_quote: "",
      head_market: "",
      sub_market: "",
    },
    back: {
      headline: "",
      for_alumni: { label: "", body: "" },
      for_school: { label: "", body: "" },
      phase_two: { label: "", body: "" },
      cta_top: "",
      cta_url_label: "",
      cta_code_label: "",
    },
  },
  letter: {
    salutation_default: "",
    head_quote: "",
    head_market: "",
    paragraphs_quote: [] as string[],
    paragraphs_market: [] as string[],
    closing_paragraphs: [] as string[],
    signoff: "",
    signature_name: "",
    cta_url_label: "",
    cta_code_label: "",
  },
};

const DEFAULT_SIGNUP_URL = "https://florenceedu.com/activate";
const NURSE_IMG = "https://florenceedu.com/assets/nurse-rn.png";
const LOGO_WHITE = "https://florenceedu.com/assets/florence-white.svg";

export interface MailpieceContext {
  target: Pick<
    OutreachTarget,
    | "org_name"
    | "recipient_name"
    | "recipient_title"
    | "city"
    | "country"
    | "activation_code"
  >;
  theme?: OutreachTheme;
  /** "quote" = bold lead. "market" = warmer/intro pitch. */
  tone?: "quote" | "market";
  signupBaseUrl?: string;
  /** Override the asset URLs (used by tests to point at local fixtures). */
  nurseImgUrl?: string;
  logoUrl?: string;
}

export interface RenderedMailpiece {
  front: string;
  back: string;
  activation_url: string;
}

export function renderMailpiece(
  format: OutreachMailFormat,
  ctx: MailpieceContext,
): RenderedMailpiece {
  if (format === "postcard_6x11") return renderPostcard(ctx);
  return renderLetter(ctx);
}

// ── Postcard 6x11 ───────────────────────────────────────────────────────────
function renderPostcard(ctx: MailpieceContext): RenderedMailpiece {
  const theme = themeOrDefault(ctx.theme);
  const tone = ctx.tone ?? "market";
  const url = activationUrl(ctx);
  const qr = qrImgSrc(url, 220);
  const fc = COPY.postcard.front;
  const bc = COPY.postcard.back;
  const head = tone === "quote" ? fc.head_quote : fc.head_market;
  const sub = (tone === "quote" ? fc.sub_quote : fc.sub_market)
    .replaceAll("{school}", ctx.target.org_name);
  const nurseImg = ctx.nurseImgUrl ?? NURSE_IMG;
  const logo = ctx.logoUrl ?? LOGO_WHITE;

  // 6x11 portrait => 11in wide × 6in tall. Lob renders at 300dpi from 96 css px/in.
  const stylesCommon = `
    @page { size: 11in 6in; margin: 0; }
    html, body { margin: 0; padding: 0; }
    body {
      width: 11in; height: 6in;
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      color: #1B2530; -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .canvas { position: relative; width: 11in; height: 6in; overflow: hidden; }
    /* No italics anywhere. Brand rule. */
    em, i { font-style: normal; }
  `;

  const front = `<!doctype html><html><head><meta charset="utf-8"><style>${stylesCommon}
    .photo { position:absolute; left:0; top:0; width:4.4in; height:6in;
             background:#0F1A2B; }
    .photo img { width:100%; height:100%; object-fit:cover; display:block; opacity:.96; }
    .panel { position:absolute; left:4.4in; top:0; width:6.6in; height:6in;
             background:${theme.ac_wash}; padding:.55in .65in; box-sizing:border-box; }
    .eyebrow { font-size:11pt; font-weight:600; letter-spacing:.18em; text-transform:uppercase;
               color:${theme.ac_text}; }
    .head { font-size:30pt; line-height:1.08; font-weight:600;
            color:${theme.ac_deep}; margin:.18in 0 .14in; }
    .sub  { font-size:14pt; line-height:1.4; color:#1B2530; max-width:5.4in; }
    .school-badge {
      position:absolute; right:.55in; bottom:.55in;
      background:${theme.ac}; color:#fff; padding:.16in .24in;
      border-radius:.18in; font-size:11pt; font-weight:600;
      letter-spacing:.06em; text-transform:uppercase;
    }
    .logo {
      position:absolute; left:.5in; bottom:.5in;
      width:1.6in; height:auto; opacity:.95;
    }
  </style></head><body><div class="canvas">
    <div class="photo"><img src="${esc(nurseImg)}" alt=""></div>
    <div class="panel">
      <div class="eyebrow">${esc(fc.eyebrow)}</div>
      <div class="head">${esc(head)}</div>
      <div class="sub">${esc(sub)}</div>
    </div>
    <img class="logo" src="${esc(logo)}" alt="">
    <div class="school-badge">For ${esc(ctx.target.org_name)}</div>
  </div></body></html>`;

  // Back: keep the right ~5in (address zone + postage + IMb) BLANK — Lob
  // prints those. We render content on the LEFT half only.
  const back = `<!doctype html><html><head><meta charset="utf-8"><style>${stylesCommon}
    .copy { position:absolute; left:0; top:0; width:6in; height:6in;
            padding:.55in .55in .55in .65in; box-sizing:border-box; }
    .headline { font-size:22pt; font-weight:600; color:${theme.ac_deep}; margin:0 0 .22in; }
    .row { margin-bottom:.16in; }
    .row .label { font-size:10pt; font-weight:600; letter-spacing:.14em;
                  text-transform:uppercase; color:${theme.ac_text}; }
    .row .body  { font-size:12pt; line-height:1.34; color:#1B2530; margin-top:.04in; }
    .row.phase  .label { color:${theme.sec_text}; }
    .qr-card {
      position:absolute; right:.65in; bottom:.45in; width:1.9in;
      background:#fff; border:1px solid ${theme.ac_tint};
      border-radius:.16in; padding:.18in .2in; text-align:center;
    }
    .qr-card .top   { font-size:9pt; color:#4B5563; }
    .qr-card .url   { font-size:11pt; font-weight:600; color:${theme.ac_deep}; margin:.04in 0 .1in; }
    .qr-card img    { width:1.55in; height:1.55in; display:block; margin:0 auto; }
    .qr-card .code  { margin-top:.12in; font-size:10pt; color:#4B5563; }
    .qr-card .code b{ display:block; font-size:13pt; color:#1B2530;
                      letter-spacing:.08em; margin-top:.02in; }
  </style></head><body><div class="canvas">
    <div class="copy">
      <div class="headline">${esc(bc.headline)}</div>
      <div class="row">
        <div class="label">${esc(bc.for_alumni.label)}</div>
        <div class="body">${esc(bc.for_alumni.body)}</div>
      </div>
      <div class="row">
        <div class="label">${esc(bc.for_school.label)}</div>
        <div class="body">${esc(bc.for_school.body)}</div>
      </div>
      <div class="row phase">
        <div class="label">${esc(bc.phase_two.label)}</div>
        <div class="body">${esc(bc.phase_two.body)}</div>
      </div>
    </div>
    <div class="qr-card">
      <div class="top">${esc(bc.cta_top)}</div>
      <div class="url">${esc(bc.cta_url_label)}</div>
      <img src="${esc(qr)}" alt="QR code">
      <div class="code">${esc(bc.cta_code_label)}<b>${esc(ctx.target.activation_code)}</b></div>
    </div>
  </div></body></html>`;

  return { front, back, activation_url: url };
}

// ── Letter US (8.5x11) ──────────────────────────────────────────────────────
function renderLetter(ctx: MailpieceContext): RenderedMailpiece {
  const theme = themeOrDefault(ctx.theme);
  const tone = ctx.tone ?? "market";
  const url = activationUrl(ctx);
  const qr = qrImgSrc(url, 180);
  const c = COPY.letter;
  const head = tone === "quote" ? c.head_quote : c.head_market;
  const paragraphs = (tone === "quote" ? c.paragraphs_quote : c.paragraphs_market)
    .map((p) => p.replaceAll("{school}", ctx.target.org_name));
  const closing = c.closing_paragraphs.map((p) =>
    p.replaceAll("{school}", ctx.target.org_name),
  );
  const salutation = ctx.target.recipient_name
    ? `Dear ${ctx.target.recipient_name}`
    : ctx.target.recipient_title
      ? `Dear ${ctx.target.recipient_title}`
      : c.salutation_default;
  const logo = ctx.logoUrl ?? LOGO_WHITE;

  // The reserved window for the address sits ~3.5in down on the left side of
  // a #10 window envelope; we put the recipient block there so a window
  // envelope shows the address through the window automatically.
  const stylesCommon = `
    @page { size: letter; margin: 0; }
    html, body { margin: 0; padding: 0; }
    body {
      width: 8.5in; height: 11in;
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      color: #1B2530;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    em, i { font-style: normal; }
  `;

  const front = `<!doctype html><html><head><meta charset="utf-8"><style>${stylesCommon}
    .page { position:relative; width:8.5in; height:11in; padding:0; box-sizing:border-box; }
    .head-band {
      position:absolute; left:0; top:0; width:8.5in; height:1.1in;
      background:${theme.ac_deep};
      padding:.35in .8in; box-sizing:border-box;
      display:flex; align-items:center; justify-content:space-between;
    }
    .head-band img { height:.55in; }
    .head-band .eyebrow {
      color:#fff; font-size:10pt; letter-spacing:.18em;
      text-transform:uppercase; font-weight:600;
    }
    .return {
      position:absolute; left:.8in; top:1.45in; font-size:10pt; color:#4B5563;
      line-height:1.35;
    }
    .recipient {
      position:absolute; left:.8in; top:3.0in;
      font-size:11pt; line-height:1.4; color:#1B2530;
      max-width:3.8in;
    }
    .body {
      position:absolute; left:.8in; right:.8in; top:4.6in;
      font-size:11.5pt; line-height:1.55; color:#1B2530;
    }
    .body .head {
      font-size:18pt; font-weight:600; color:${theme.ac_deep};
      line-height:1.2; margin:0 0 .22in;
    }
    .body p { margin:0 0 .18in; }
    .signoff { margin-top:.3in; font-size:11.5pt; }
    .qr-block {
      position:absolute; right:.7in; bottom:.7in; width:2.1in;
      border:1px solid ${theme.ac_tint}; border-radius:.16in;
      padding:.18in .22in; text-align:center; background:${theme.ac_wash};
    }
    .qr-block .top { font-size:9pt; color:#4B5563; }
    .qr-block .url { font-size:11pt; font-weight:600; color:${theme.ac_deep}; margin:.04in 0; }
    .qr-block img  { width:1.8in; height:1.8in; display:block; margin:.06in auto; }
    .qr-block .code  { font-size:10pt; color:#4B5563; }
    .qr-block .code b{ display:block; font-size:13pt; color:#1B2530;
                       letter-spacing:.08em; margin-top:.02in; }
  </style></head><body><div class="page">
    <div class="head-band">
      <img src="${esc(logo)}" alt="Florence Academy">
      <span class="eyebrow">NCLEX-RN Bootcamp Partner Program</span>
    </div>
    <div class="return">
      Florence Academy<br>
      Los Angeles, California<br>
      florenceedu.com
    </div>
    <div class="recipient">
      ${ctx.target.recipient_name ? `${esc(ctx.target.recipient_name)}<br>` : ""}
      ${ctx.target.recipient_title ? `${esc(ctx.target.recipient_title)}<br>` : ""}
      <strong>${esc(ctx.target.org_name)}</strong><br>
      ${esc(ctx.target.city)}${ctx.target.country ? `, ${esc(ctx.target.country)}` : ""}
    </div>
    <div class="body">
      <div class="head">${esc(head)}</div>
      <p>${esc(salutation)},</p>
      ${paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}
      ${closing.map((p) => `<p>${esc(p)}</p>`).join("")}
      <div class="signoff">
        ${esc(c.signoff)}<br>
        ${esc(c.signature_name)}
      </div>
    </div>
    <div class="qr-block">
      <div class="top">Activate at</div>
      <div class="url">${esc(c.cta_url_label)}</div>
      <img src="${esc(qr)}" alt="QR code">
      <div class="code">${esc(c.cta_code_label)}<b>${esc(ctx.target.activation_code)}</b></div>
    </div>
  </div></body></html>`;

  // Back is left blank for a single-page letter — Lob bills letters per
  // physical page. If we ever extend to a two-sided letter, we'd render
  // the back here. For now an empty page with the same dimensions makes
  // the API consistent with the postcard pattern.
  const back = `<!doctype html><html><head><meta charset="utf-8"><style>${stylesCommon}</style></head><body></body></html>`;
  return { front, back, activation_url: url };
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function themeOrDefault(t: OutreachTheme | undefined): typeof COPY.themes.teal {
  return t === "purple" ? COPY.themes.purple : COPY.themes.teal;
}

function activationUrl(ctx: MailpieceContext): string {
  const base = ctx.signupBaseUrl ?? DEFAULT_SIGNUP_URL;
  return `${base.replace(/\/+$/, "")}?code=${encodeURIComponent(ctx.target.activation_code)}`;
}

/** Quickchart.io QR endpoint. The activation URL is the only data we
 *  encode; quickchart's logs will see the URL with code but not who it
 *  belongs to. Swap to an inline data: URL if that's a concern. */
function qrImgSrc(url: string, sizePx: number): string {
  const params = new URLSearchParams({
    text: url,
    size: String(sizePx),
    margin: "2",
    ecLevel: "M",
  });
  return `https://quickchart.io/qr?${params.toString()}`;
}

const ESC: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ESC[c] ?? c);
}
