import { config } from "./config.ts";
import { contentHash } from "./store.ts";

const SAFE_SESSION_RE = /^anon_[A-Za-z0-9_-]{8,64}$/;

function coreRefFor(input: {
  candidateId?: string;
  payload?: Record<string, unknown>;
}): { app: string; externalId: string } | undefined {
  if (input.candidateId) return { app: "academy", externalId: input.candidateId };
  const session = input.payload?.["safe_session_id"];
  if (typeof session === "string" && SAFE_SESSION_RE.test(session))
    return { app: "academy_anonymous", externalId: session };
  return undefined;
}

export async function emitCoreEvent(input: {
  eventType: string;
  candidateId?: string;
  sponsorId?: string;
  campaignId?: string;
  payload?: Record<string, unknown>;
}): Promise<boolean> {
  if (!config.coreEvents) return false;
  const ref = coreRefFor(input);
  if (!ref) return false;
  const body = {
    event_type: input.eventType,
    source_system: "florence-academy",
    ref,
    payload: {
      ...(input.sponsorId ? { sponsor_id: input.sponsorId } : {}),
      ...(input.campaignId ? { campaign_id: input.campaignId } : {}),
      ...(input.payload ?? {}),
    },
  };
  try {
    const res = await fetch(`${config.coreEvents.url}/v1/events`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.coreEvents.token}`,
        "content-type": "application/json",
        "idempotency-key": contentHash(body),
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}
