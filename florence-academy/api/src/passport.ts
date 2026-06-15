// Emit Academy readiness signals to the FlorenceRN Nurse Passport spine (Core).
// Fire-and-forget + mock-by-default: with no FLORENCE_CORE_CLIENT_ID/SECRET this
// is a no-op and Academy behaves exactly as before. A failed emit never breaks a
// request — the spine is a cross-app overlay, not a dependency.
import { createPassportClient, type NurseSelector } from "./coreAuth.ts";

const coreUrl = process.env.CORE_ISSUER_URL ?? process.env.PUBLIC_CORE_URL ?? "http://id.lvh.me:8080";
const clientId = process.env.FLORENCE_CORE_CLIENT_ID ?? "";
const clientSecret = process.env.FLORENCE_CORE_CLIENT_SECRET ?? "";

export const passportEnabled = Boolean(clientId && clientSecret);
const client = passportEnabled ? createPassportClient({ coreUrl, clientId, clientSecret }) : null;

export async function emitPassport(sel: NurseSelector, type: string, data?: Record<string, unknown>): Promise<void> {
  if (!client) return;
  try {
    await client.emit(sel, type, data);
  } catch (e) {
    console.warn(`[academy-api] passport emit ${type} failed:`, (e as Error).message);
  }
}
