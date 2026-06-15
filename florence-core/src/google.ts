// Google OIDC (authorization-code flow). Core is the OIDC *client* to Google and
// the *issuer* to the fleet. We exchange the code server-side over TLS and read
// the returned id_token (authenticated by the TLS channel + client secret), then
// the route applies the @florenceeducation.com domain policy.

import { config } from "./config.ts";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";

export function googleAuthUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  // Hint Google to the workspace when exactly one domain is allowed.
  if (config.allowedEmailDomains.length === 1 && config.allowedEmailDomains[0])
    p.set("hd", config.allowedEmailDomains[0]);
  return `${GOOGLE_AUTH}?${p.toString()}`;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  hd?: string;
}

export async function exchangeCode(code: string): Promise<GoogleProfile> {
  const body = new URLSearchParams({
    code,
    client_id: config.google.clientId,
    client_secret: config.google.clientSecret,
    redirect_uri: config.google.redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`google token exchange failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { id_token?: string };
  if (!json.id_token) throw new Error("no id_token in Google response");
  const part = json.id_token.split(".")[1];
  if (!part) throw new Error("malformed id_token");
  const payload = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    hd?: string;
  };
  return {
    sub: payload.sub,
    email: (payload.email ?? "").toLowerCase(),
    email_verified: payload.email_verified !== false,
    ...(payload.name && { name: payload.name }),
    ...(payload.hd && { hd: payload.hd }),
  };
}
