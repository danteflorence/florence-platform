// ───────────────────────────────────────────────────────────────────────────
// Lob Print & Mail API wrapper.
//
// TS port of the Florence labor-economics `lob_send.py` reference. The API
// surface is intentionally small: createPostcard + createLetter + retrieve.
// All other Lob features (address verification, IMb tracking, bulk batches)
// are wrappable behind the same `lobFetch` helper if we need them.
//
// KEY HANDLING:
//   - Lob keys are NEVER stored on our servers in this implementation.
//   - The operator types the key into the campaign-launch UI at runtime;
//     the SPA forwards it on the send request; the handler hands it
//     straight to Lob and drops it.
//   - test_… renders a real preview PDF, no charge, no real mail.
//   - live_… real mail, real money. Only used after explicit confirm.
//
// IDEMPOTENCY:
//   - Every create call sends an Idempotency-Key derived from (campaign_id,
//     target_id). Retrying the same call returns the same postcard/letter.
// ───────────────────────────────────────────────────────────────────────────

import type { MailPieceMode, OutreachMailFormat } from "./types.ts";

export interface LobAddress {
  name?: string;
  company?: string;
  address_line1: string;
  address_line2?: string;
  address_city: string;
  address_state?: string;
  address_zip: string;
  address_country: string; // ISO-3166 alpha-2 (Lob requirement)
}

export interface LobCreateInput {
  to: LobAddress;
  from: LobAddress;
  /** Rendered HTML from mailpiece.ts. */
  front: string;
  back: string;
  /** Lob postcard sizes: "4x6" | "6x9" | "6x11". We use 6x11. */
  size: "6x11";
  /** Required by Lob for postcards. */
  use_type: "marketing" | "operational";
  metadata?: Record<string, string>;
  /** Idempotency key - derived from (campaign, target). */
  idempotency_key: string;
  /** Operator-supplied Lob API key (test_… or live_…). */
  api_key: string;
}

export interface LobLetterInput extends Omit<LobCreateInput, "size"> {
  /** Letters: include the address as a window header so it shows through a
   *  #10 envelope window. */
  address_placement?: "top_first_page" | "insert_blank_page";
  color: boolean;
  double_sided: boolean;
}

export interface LobCreated {
  id: string;
  url: string; // preview PDF URL
  expected_delivery_date?: string;
  price?: string; // dollar string e.g. "0.87" - convert to cents
  mode: MailPieceMode;
  raw: unknown;
}

const LOB_BASE = "https://api.lob.com/v1";

function authHeader(apiKey: string): string {
  // Lob uses HTTP Basic with the API key as the username and an empty password.
  const token = Buffer.from(`${apiKey}:`).toString("base64");
  return `Basic ${token}`;
}

function modeFromKey(apiKey: string): MailPieceMode {
  return apiKey.startsWith("live_") ? "live" : "test";
}

async function lobPostForm(
  path: string,
  apiKey: string,
  formData: URLSearchParams,
  idempotencyKey: string,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${LOB_BASE}${path}`, {
    method: "POST",
    headers: {
      authorization: authHeader(apiKey),
      "content-type": "application/x-www-form-urlencoded",
      "idempotency-key": idempotencyKey,
    },
    body: formData,
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* leave as raw text */
  }
  return { status: res.status, body };
}

export class LobError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = "LobError";
    this.status = status;
    this.body = body;
  }
}

function priceDollarsToCents(p?: string): number | undefined {
  if (!p) return undefined;
  const n = Number(p);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n * 100);
}

/** Stamp `to[…]`, `from[…]` fields into a URLSearchParams correctly. */
function addAddress(prefix: "to" | "from", addr: LobAddress, fd: URLSearchParams): void {
  if (addr.name) fd.append(`${prefix}[name]`, addr.name);
  if (addr.company) fd.append(`${prefix}[company]`, addr.company);
  fd.append(`${prefix}[address_line1]`, addr.address_line1);
  if (addr.address_line2) fd.append(`${prefix}[address_line2]`, addr.address_line2);
  fd.append(`${prefix}[address_city]`, addr.address_city);
  if (addr.address_state) fd.append(`${prefix}[address_state]`, addr.address_state);
  fd.append(`${prefix}[address_zip]`, addr.address_zip);
  fd.append(`${prefix}[address_country]`, addr.address_country);
}

function addMetadata(meta: Record<string, string> | undefined, fd: URLSearchParams): void {
  if (!meta) return;
  for (const [k, v] of Object.entries(meta)) fd.append(`metadata[${k}]`, v);
}

export async function createPostcard(input: LobCreateInput): Promise<LobCreated> {
  const fd = new URLSearchParams();
  fd.append("front", input.front);
  fd.append("back", input.back);
  fd.append("size", input.size);
  fd.append("use_type", input.use_type);
  addAddress("to", input.to, fd);
  addAddress("from", input.from, fd);
  addMetadata(input.metadata, fd);
  const { status, body } = await lobPostForm(
    "/postcards",
    input.api_key,
    fd,
    input.idempotency_key,
  );
  if (status >= 400) {
    throw new LobError(
      status,
      body,
      `Lob postcard create failed: ${status}`,
    );
  }
  const b = body as { id: string; url: string; price?: string; expected_delivery_date?: string };
  return {
    id: b.id,
    url: b.url,
    ...(b.expected_delivery_date && { expected_delivery_date: b.expected_delivery_date }),
    ...(b.price && { price: b.price }),
    mode: modeFromKey(input.api_key),
    raw: body,
  };
}

export async function createLetter(input: LobLetterInput): Promise<LobCreated> {
  const fd = new URLSearchParams();
  fd.append("file", input.front); // letters use `file` not `front`
  fd.append("use_type", input.use_type);
  fd.append("color", input.color ? "true" : "false");
  fd.append("double_sided", input.double_sided ? "true" : "false");
  if (input.address_placement) fd.append("address_placement", input.address_placement);
  addAddress("to", input.to, fd);
  addAddress("from", input.from, fd);
  addMetadata(input.metadata, fd);
  const { status, body } = await lobPostForm(
    "/letters",
    input.api_key,
    fd,
    input.idempotency_key,
  );
  if (status >= 400) {
    throw new LobError(status, body, `Lob letter create failed: ${status}`);
  }
  const b = body as { id: string; url: string; price?: string; expected_delivery_date?: string };
  return {
    id: b.id,
    url: b.url,
    ...(b.expected_delivery_date && { expected_delivery_date: b.expected_delivery_date }),
    ...(b.price && { price: b.price }),
    mode: modeFromKey(input.api_key),
    raw: body,
  };
}

/** Combined entrypoint: pick the right Lob endpoint by format. */
export async function lobCreate(
  format: OutreachMailFormat,
  input: {
    api_key: string;
    idempotency_key: string;
    to: LobAddress;
    from: LobAddress;
    front: string;
    back: string;
    metadata?: Record<string, string>;
  },
): Promise<LobCreated> {
  if (format === "postcard_6x11") {
    return createPostcard({
      api_key: input.api_key,
      idempotency_key: input.idempotency_key,
      to: input.to,
      from: input.from,
      front: input.front,
      back: input.back,
      size: "6x11",
      use_type: "marketing",
      ...(input.metadata && { metadata: input.metadata }),
    });
  }
  return createLetter({
    api_key: input.api_key,
    idempotency_key: input.idempotency_key,
    to: input.to,
    from: input.from,
    front: input.front,
    back: input.back, // unused for single-page letter but kept for API symmetry
    use_type: "marketing",
    color: true,
    double_sided: false,
    address_placement: "insert_blank_page",
    ...(input.metadata && { metadata: input.metadata }),
  });
}

export { modeFromKey, priceDollarsToCents };
