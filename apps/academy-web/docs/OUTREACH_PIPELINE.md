# Outreach pipeline (Lob print + mail)

Florence Academy's partner-outreach engine. Send postcards and letters to
universities (today) and nursing associations (next) to sign them up to
the partner network — alumni get 25% off the live cohort, schools get an
anonymized alumni performance dashboard, and partner schools get first
access to the upcoming branded lab + VR simulator.

This is an Academy-side port of the Florence labor-economics
`lob_send.py` reference, generalized for the university audience and
re-engineered to fix a collision bug in the original activation-code
algorithm.

## Architecture

Three layers, all operator-only:

1. **Campaign** — a batch send. Name, kind, mail format, theme.
2. **Targets** — recipients within a campaign. School slug, mailing
   address, deterministic FLOR-XXXXX activation code.
3. **Mail pieces** — actual sent items. Lob id, status, cost, dates.
   Lob webhooks land in `mail_piece_events` (append-only, signature-verified).

## Entity kinds (PNA-ready)

The `outreach_campaigns.kind` enum is broader than universities so the
same engine handles future channels:

| kind                  | example               |
|-----------------------|-----------------------|
| `university`          | University of Edinburgh — Dean of Nursing |
| `nursing_association` | Philippine Nursing Association (worldwide) — Chapter chair |
| `employer`            | Hospital nursing chief — alumni hiring partnerships |
| `hospital`            | individual hospital systems |

Same renderer, same Lob client, same activation codes. The mailpiece
copy is generic enough today to work for any of these; targeted copy
variants ship per campaign by editing `outreach_copy.json`.

## API endpoints

All operator-scoped (`outreach:read` / `outreach:write`). The demo M2M
client gets both by default.

| Method | Path | Scope | What |
|---|---|---|---|
| POST | `/v1/outreach/campaigns` | `outreach:write` | Create a campaign. |
| GET  | `/v1/outreach/campaigns` | `outreach:read` | List all. |
| GET  | `/v1/outreach/campaigns/:id` | `outreach:read` | Detail + targets + pieces. |
| PATCH| `/v1/outreach/campaigns/:id` | `outreach:write` | Update name/status/notes. |
| POST | `/v1/outreach/campaigns/:id/targets` | `outreach:write` | Batch add targets. |
| POST | `/v1/outreach/campaigns/:id/preview` | `outreach:read` | Render front+back HTML for one target. |
| POST | `/v1/outreach/campaigns/:id/send` | `outreach:write` | Dispatch via Lob (key in body, test_ default). |
| POST | `/v1/outreach/webhooks/lob` | (public) | Lob webhook — signature-verified. |
| GET  | `/v1/activation/:code` | (public) | Activation lookup for the QR landing. |
| POST | `/v1/activation/:code/approve` | `outreach:write` | Operator marks a partner as activated → flips the school tier to `affiliate`. |

## Mailpiece renderer

`api/src/mailpiece.ts` generates front+back HTML for two formats:

- **postcard_6x11** — Lob 6×11 postcard. 11in × 6in canvas. Photo panel
  on the left, value + activation panel on the right; back has the
  offer breakdown + QR code in a card on the left, leaving Lob's
  reserved address zone blank on the right.
- **letter_us** — 8.5×11 US letter. Brand band header, recipient
  address block positioned for a #10 window envelope (~3.0in from top),
  body copy, QR + code card bottom-right. Single-sided.

Copy lives in `api/src/outreach_copy.json` — operators can edit copy
without touching code. Brand rules enforced by the renderer:

- No italics anywhere (`em` and `i` styled to `font-style: normal`).
- No em-dashes in source files.
- Theme: teal (default) or purple. Both palettes match the Florence
  brand tokens.
- Substitution: `{school}` is replaced with the target's `org_name`.

QR codes are rendered via the public quickchart.io QR endpoint. The
only data encoded is the activation URL (`…/activate?code=FLOR-XXXXX`);
no PII leaves our infrastructure. If that's a concern, swap
`qrImgSrc()` for an inline data: URL using any Node QR encoder.

## Activation codes

5-character codes drawn from a 32-letter alphabet (no 0/O/1/I; no
ambiguous vowels). Generated deterministically per (campaign × target
seed) so retries always produce the same code, and so re-imports never
duplicate a target.

```ts
import { activationCode } from "./outreach.ts";
const code = activationCode(`${campaign.id}|${school.slug ?? org_name}`);
// e.g. "FLOR-3W9CE"
```

**Important note on algorithm choice.** The Florence
labor-economics Python reference (`lob_send.code_for(ccn)`) uses
FNV-1a → glibc LCG → `alphabet[h mod 32]` per character. That algorithm
has a hidden collision class: an LCG modulo 32 only sees the bottom 5
bits of the previous state, so two inputs with different FNV hashes but
matching low 5 bits produce the same code. For short numeric inputs
(CCN-style IDs), collisions are rare in practice; for the longer
seeds we use here (`camp_…|FLR-…-…`), we hit the collision regime
almost immediately.

This module uses SHA-256 instead — first 25 bits sliced into five
5-bit groups, mapped through the alphabet. Full uniformity. Verified
0 collisions across 1,000 representative seeds.

Codes are **not** interchangeable with the labor-economics tool's HHA
codes. That's intentional: the two tools have separate code spaces.

## Lob client

`api/src/lob_client.ts` is a small wrapper around Lob's Print & Mail
REST API. It handles:

- HTTP Basic auth with the operator's API key
- Idempotency-Key header (derived from `(campaign_id, target_id)`)
- POST /postcards and POST /letters
- Test vs live key detection (`test_…` vs `live_…`)
- Address inlining (Lob verifies and standardizes US addresses for free)
- Metadata for match-back (`campaign_id`, `target_id`, `activation_code`)
- Parses Lob's response: returns id, preview URL, expected delivery,
  price in dollars (we convert to cents)

The key never persists anywhere on our side. The operator types it
into the launcher per send.

## Lob webhook receiver

`POST /v1/outreach/webhooks/lob` is public — Lob calls it. The handler
verifies the `Lob-Signature` header (HMAC-SHA256 over `${timestamp}.${rawBody}`
with the `LOB_WEBHOOK_SECRET` env var), with a 5-minute timestamp
tolerance for replay protection. If the signature fails or the secret
is unset, it returns 400 / 503 and never accepts the event.

When a known event arrives, the handler:
1. Records the raw payload in `mail_piece_events` (append-only,
   `lob_event_id` dedup'd).
2. Maps the event_type suffix (`.in_transit`, `.delivered`, etc.) onto
   `MailPieceStatus`.
3. Mirrors the status onto the linked `outreach_target` so the campaign
   rollup stays accurate.

Set this up in the Lob dashboard:

1. Settings → Webhooks → Add endpoint
2. URL: `https://your-api/v1/outreach/webhooks/lob`
3. Events: select all `postcard.*` and `letter.*`
4. Copy the signing secret, set `LOB_WEBHOOK_SECRET=…` on the API.

## Daily flow (the operator's job)

1. **Pick targets.** In the Outreach tab, paste a TSV of targets (one
   per line): `school_slug \t org_name \t recipient_title \t address_line1 \t city \t postal \t country`.
2. **Preview.** Click Preview on a row. Front + back render in iframes.
3. **Launch in test mode.** Open the launch modal. Paste your
   `test_…` key. Hit "Send test (N)". Lob returns preview PDFs; nothing
   mails, no charge. Inspect the PDFs at the preview URLs.
4. **Launch in live mode.** Open the launch modal again. Paste your
   `live_…` key. The button text turns red and an extra confirmation
   checkbox appears with the recipient count and estimated cost. Tick
   it and hit Send.
5. **Track delivery.** Lob webhooks update the per-piece status in
   real-time. The Outreach tab updates on refresh.
6. **Approve activations.** When a recipient scans the QR and submits
   the activation form on `/activate?code=FLOR-XXXXX`, ops gets an
   email at `partners@florenceedu.com`. After confirming who they
   really are, ops clicks "Mark activated" on the target row — that
   flips the school's `tier` to `affiliate` so alumni get the $75 rate.

## Boundary

- Outreach lives in ops. Never returned in any candidate-facing
  endpoint. Never visible in `/learn`.
- Lob API keys are NEVER stored on our side. The operator types them
  at runtime; they live in `sessionStorage` and are forwarded to Lob.
- Recipients don't get accounts. They submit a request from `/activate`
  that emails ops; ops manually approves the first batch. We scale to
  self-serve once we've validated the offer.

## TODO (after Phase 2 lands)

- Port the `outreach_*` and `mail_*` tables from the postgres adapter's
  MemoryStore shim to real SQL. Schema is already in `db/schema.sql`.
- Pull-from-schools target picker in the Outreach UI (currently TSV
  paste only).
- Bulk approve-from-list endpoint.
- Per-recipient first-name personalization in letter salutation when
  we have the data.
