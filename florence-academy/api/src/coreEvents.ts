import { config } from "./config.ts";
import { contentHash } from "./store.ts";

export async function emitCoreEvent(input: {
  eventType: string;
  candidateId?: string;
  sponsorId?: string;
  campaignId?: string;
  payload?: Record<string, unknown>;
}): Promise<boolean> {
  if (!config.coreEvents) return false;
  if (!input.candidateId) return false;
  const body = {
    event_type: input.eventType,
    source_system: "florence-academy",
    ref: { app: "academy", externalId: input.candidateId },
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
