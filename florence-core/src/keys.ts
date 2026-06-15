// Signing-key lifecycle. On boot, ensures an active RS256 key exists (generates
// one if the store is empty), keeps the decrypted active private key in memory
// for signing, and serves all non-revoked public keys as JWKS. Private keys are
// stored encrypted (crypto.ts field envelope) so they persist across restarts
// and multi-instance — never regenerated per boot (that would invalidate every
// live token). Rotation: add a new active key, mark the old `retiring` (still in
// JWKS until verifier caches expire), then `revoked`.

import { randomBytes, type KeyObject } from "node:crypto";
import { config } from "./config.ts";
import {
  generateRsaKeyPair,
  keyFromJwk,
  keyFromPassphrase,
  localKeyProvider,
  makeFieldCrypto,
  signJwtRS256,
  type CoreClaims,
  type FieldCrypto,
  type PublicJwk,
} from "./crypto.ts";
import type { SigningKeyRow, Store } from "./store.ts";
import { nowIso } from "./util.ts";

function newKid(): string {
  const d = new Date();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}-rs-${randomBytes(3).toString("hex")}`;
}

export class KeyManager {
  private active!: { kid: string; privatePem: string };
  private publicKeys = new Map<string, KeyObject>();
  private jwks: PublicJwk[] = [];
  private store: Store;
  private fc: FieldCrypto;

  constructor(store: Store) {
    this.store = store;
    this.fc = makeFieldCrypto(localKeyProvider(keyFromPassphrase(config.fieldEncPassphrase)));
  }

  async init(): Promise<void> {
    let rows = await this.store.listSigningKeys();
    if (rows.length === 0) {
      await this.generateAndStore("active");
      rows = await this.store.listSigningKeys();
    }
    await this.loadFrom(rows);
  }

  private async loadFrom(rows: SigningKeyRow[]): Promise<void> {
    this.publicKeys.clear();
    this.jwks = [];
    let active: SigningKeyRow | undefined;
    for (const r of rows) {
      const jwk = r.public_jwk as unknown as PublicJwk;
      this.publicKeys.set(r.kid, keyFromJwk(jwk));
      this.jwks.push(jwk);
      if (r.status === "active") active = r;
    }
    active ??= rows[0];
    if (!active) throw new Error("no usable signing key");
    this.active = { kid: active.kid, privatePem: await this.fc.decrypt(active.private_pem_enc) };
  }

  private async generateAndStore(status: "active" | "retiring"): Promise<void> {
    const kid = newKid();
    const { privatePem, publicJwk } = generateRsaKeyPair(kid);
    await this.store.insertSigningKey({
      kid,
      alg: "RS256",
      public_jwk: publicJwk as unknown as Record<string, unknown>,
      private_pem_enc: await this.fc.encrypt(privatePem),
      status,
      created_at: nowIso(),
    });
  }

  sign(payload: CoreClaims): string {
    return signJwtRS256(payload, this.active.privatePem, this.active.kid);
  }

  resolveKey(kid: string): KeyObject | undefined {
    return this.publicKeys.get(kid);
  }

  activeKid(): string {
    return this.active.kid;
  }

  jwksJson(): { keys: PublicJwk[] } {
    return { keys: this.jwks };
  }

  /** Rotate signing keys: generate a NEW active key and mark the previously-active
   *  one `retiring` (still served in JWKS so already-issued tokens verify until
   *  they expire / verifier caches refresh). After your cache TTL, set the
   *  retiring key to `revoked` to drop it from JWKS. */
  async rotate(): Promise<{ newKid: string; retired: string | null }> {
    const rows = await this.store.listSigningKeys();
    const prev = rows.find((r) => r.status === "active");
    await this.generateAndStore("active");
    if (prev) await this.store.updateSigningKeyStatus(prev.kid, "retiring");
    await this.init();
    return { newKid: this.active.kid, retired: prev?.kid ?? null };
  }
}
