// Agora RTC token minting for live classes. The instructor joins as a HOST
// (publisher: camera+mic); students join as AUDIENCE (subscriber-only) — the
// host/audience "live" model scales to large, global cohorts cheaply. Tokens
// are role-scoped and short-lived; access is gated by the caller's FlorenceRN
// Core role at the route (only instructors/ops get a publisher token).
//
// Provisioned by YOU: an Agora project's App ID + App Certificate (set
// AGORA_APP_ID / AGORA_APP_CERTIFICATE). Until then agoraConfigured() is false
// and the live page simply runs slides-only (no A/V) — nothing breaks.

import AgoraToken from "agora-token";

// agora-token is published CJS; default-import then destructure for NodeNext interop.
const { RtcTokenBuilder, RtcRole } = AgoraToken as unknown as {
  RtcTokenBuilder: { buildTokenWithUid: (appId: string, appCert: string, channel: string, uid: number, role: number, tokenExpireSec: number, privilegeExpireSec: number) => string };
  RtcRole: { PUBLISHER: number; SUBSCRIBER: number };
};

const APP_ID = process.env["AGORA_APP_ID"] ?? "";
const APP_CERT = process.env["AGORA_APP_CERTIFICATE"] ?? "";
const TTL_SEC = Number(process.env["AGORA_TOKEN_TTL_SEC"] ?? 3600);

export function agoraConfigured(): boolean {
  return Boolean(APP_ID && APP_CERT);
}

export function agoraAppId(): string {
  return APP_ID;
}

export interface RtcGrant {
  appId: string;
  channel: string;
  uid: number;
  role: "host" | "audience";
  token: string;
  expiresIn: number;
}

/** Build a role-scoped RTC token. uid 0 lets Agora assign the uid client-side. */
export function buildRtcToken(channel: string, publisher: boolean, uid = 0): RtcGrant {
  const role = publisher ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERT, channel, uid, role, TTL_SEC, TTL_SEC);
  return { appId: APP_ID, channel, uid, role: publisher ? "host" : "audience", token, expiresIn: TTL_SEC };
}
