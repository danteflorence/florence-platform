import { randomBytes } from "node:crypto";

/** Prefixed, URL-safe id, e.g. usr_8Kf3… */
export function id(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("base64url")}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}
