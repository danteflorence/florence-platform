// HubSpot connector for the Florence Data API.
//
// Consumes Florence webhooks (verifying the HMAC signature), resolves the
// candidate, maps the event to HubSpot contact properties (the field-mapping
// layer), and upserts the contact by email. The HubSpot call is guarded: with
// no HUBSPOT_TOKEN it returns a dry-run result instead of calling out, so the
// mapping is fully testable offline.

import { verifyWebhook } from "../src/crypto.ts";
import type { AssessmentResult, Enrollment } from "../src/types.ts";
import type { WebhookEvent } from "../src/webhooks.ts";

export interface ResolvedCandidate {
  id: string;
  email?: string;
  full_name?: string;
  country?: string;
  external_ref?: string;
}

export interface HubspotContact {
  email: string;
  properties: Record<string, string>;
}

/**
 * The field-mapping layer: Florence event + candidate → HubSpot contact props.
 * Returns null for unmapped events or when there's no email to key on.
 * HubSpot property values are always strings.
 */
export function hubspotContactFromEvent(
  event: WebhookEvent,
  candidate: ResolvedCandidate,
): HubspotContact | null {
  if (!candidate.email) return null;

  const props: Record<string, string> = { florence_candidate_id: candidate.id };
  if (candidate.full_name) props["firstname"] = candidate.full_name;
  if (candidate.country) props["country"] = candidate.country;
  if (candidate.external_ref) props["florence_external_ref"] = candidate.external_ref;

  switch (event.type) {
    case "assessment_result.created": {
      const d = event.data as AssessmentResult;
      props["florence_readiness"] = String(d.readiness ?? "");
      props["florence_theta"] = String(d.theta ?? "");
      props["florence_items_completed"] = String(d.items_completed ?? "");
      props["florence_assessment_kind"] = d.kind;
      props["florence_last_assessment_at"] = d.created_at;
      break;
    }
    case "enrollment.status_changed": {
      const e = event.data as Enrollment;
      props["florence_enrollment_status"] = e.status;
      props["florence_cohort"] = e.cohort;
      break;
    }
    case "candidate.created":
      // Base props above are enough to create/sync the contact at signup.
      break;
    case "payment.completed": {
      const d = event.data as { amount_cents?: number; currency?: string };
      props["florence_deposit_paid"] = "true";
      if (d.amount_cents != null) props["florence_deposit_amount_cents"] = String(d.amount_cents);
      if (d.currency) props["florence_deposit_currency"] = d.currency;
      break;
    }
    case "candidate.email_verified":
      props["florence_email_verified"] = "true";
      break;
    default:
      return null; // event we don't sync
  }
  return { email: candidate.email, properties: props };
}

export type HandleResult =
  | { ok: true; dryRun: boolean; contact: HubspotContact; status?: number }
  | { ok: false; reason: string; contact?: HubspotContact; status?: number };

export interface HubspotConnectorOptions {
  /** Florence webhook signing secret (must match the emitter). */
  webhookSecret: string;
  /** HubSpot private-app token. Omit → dry-run (no outbound call). */
  hubspotToken?: string;
  /** Resolve a candidate by id (default: the Florence API). */
  resolveCandidate: (candidateId: string) => Promise<ResolvedCandidate | null>;
}

export class HubspotConnector {
  private secret: string;
  private token?: string;
  private resolve: (id: string) => Promise<ResolvedCandidate | null>;

  constructor(opts: HubspotConnectorOptions) {
    this.secret = opts.webhookSecret;
    if (opts.hubspotToken) this.token = opts.hubspotToken;
    this.resolve = opts.resolveCandidate;
  }

  async handleWebhook(signature: string, rawBody: string): Promise<HandleResult> {
    const nowSec = Math.floor(Date.now() / 1000);
    if (!verifyWebhook(this.secret, signature, rawBody, nowSec))
      return { ok: false, reason: "invalid signature" };

    let event: WebhookEvent;
    try {
      event = JSON.parse(rawBody) as WebhookEvent;
    } catch {
      return { ok: false, reason: "invalid json" };
    }

    // payment/assessment/enrollment events carry candidate_id; candidate.* events
    // carry the candidate as `id`.
    const d0 = event.data as { candidate_id?: string; id?: string } | null;
    const candidateId = d0?.candidate_id ?? d0?.id;
    if (!candidateId) return { ok: false, reason: "no candidate id in event" };

    const candidate = await this.resolve(candidateId);
    if (!candidate) return { ok: false, reason: "candidate not found" };

    const contact = hubspotContactFromEvent(event, candidate);
    if (!contact) return { ok: false, reason: "event not mapped or no email" };

    if (!this.token) return { ok: true, dryRun: true, contact };
    return this.upsert(contact);
  }

  private async upsert(contact: HubspotContact): Promise<HandleResult> {
    const auth = { authorization: `Bearer ${this.token}`, "content-type": "application/json" };
    // Try update-by-email; fall back to create on 404.
    let status: number;
    let success: boolean;
    const patch = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(contact.email)}?idProperty=email`,
      { method: "PATCH", headers: auth, body: JSON.stringify({ properties: contact.properties }) },
    );
    if (patch.status === 404) {
      const create = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ properties: { email: contact.email, ...contact.properties } }),
      });
      status = create.status;
      success = create.ok;
    } else {
      status = patch.status;
      success = patch.ok;
    }
    return success
      ? { ok: true, dryRun: false, contact, status }
      : { ok: false, reason: `hubspot upsert failed (${status})`, contact, status };
  }
}

/** Default resolver: fetch the candidate from the Florence API (candidates:read). */
export function florenceResolver(
  apiUrl: string,
  token: string,
): (candidateId: string) => Promise<ResolvedCandidate | null> {
  return async (candidateId: string) => {
    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, "")}/v1/candidates/${candidateId}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const c = (await res.json()) as ResolvedCandidate;
      return c;
    } catch {
      return null;
    }
  };
}
