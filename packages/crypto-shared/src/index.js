import { Buffer } from "node:buffer";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

export function safeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function sha256hex(s) {
  return createHash("sha256").update(s).digest("hex");
}

export function hashSecret(secret) {
  const salt = randomBytes(16);
  const hash = scryptSync(secret, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifySecret(secret, stored) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const hash = scryptSync(secret, Buffer.from(saltHex, "hex"), 64);
  return safeEqual(hash.toString("hex"), hashHex);
}

const MAX_WEBHOOK_AGE_SEC = 300;

export function signWebhook(secret, body, tsSec) {
  const v1 = createHmac("sha256", secret).update(`${tsSec}.${body}`).digest("hex");
  return `t=${tsSec},v1=${v1}`;
}

export function verifyWebhook(secret, header, body, nowSec) {
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=")));
  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!Number.isFinite(t) || !v1) return false;
  if (Math.abs(nowSec - t) > MAX_WEBHOOK_AGE_SEC) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  return safeEqual(v1, expected);
}

function gcmSeal(key, plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]);
}

function gcmOpen(key, blob) {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ct = blob.subarray(28);
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}

export class LocalKeyProvider {
  constructor(keyring) {
    this.keys = keyring.keys;
    this.active = keyring.activeId;
    const k = this.keys[this.active];
    if (!k || k.length !== 32) throw new Error("active KEK must be present and 32 bytes (256-bit)");
  }

  activeKeyId() {
    return this.active;
  }

  async wrap(keyId, dataKey) {
    const kek = this.keys[keyId];
    if (!kek) throw new Error(`unknown KEK id: ${keyId}`);
    return gcmSeal(kek, dataKey);
  }

  async unwrap(keyId, wrapped) {
    const kek = this.keys[keyId];
    if (!kek) throw new Error(`unknown KEK id: ${keyId}`);
    return gcmOpen(kek, wrapped);
  }
}

export function makeFieldCrypto(provider) {
  return {
    async encrypt(plaintext) {
      const dek = randomBytes(32);
      const keyId = provider.activeKeyId();
      const wrapped = (await provider.wrap(keyId, dek)).toString("base64");
      const data = gcmSeal(dek, Buffer.from(plaintext, "utf8")).toString("base64");
      return `fe1.${keyId}.${wrapped}.${data}`;
    },
    async decrypt(token) {
      const [tag, keyId, wrappedB64, dataB64] = token.split(".");
      if (tag !== "fe1" || !keyId || !wrappedB64 || !dataB64) {
        throw new Error("malformed field ciphertext");
      }
      const dek = await provider.unwrap(keyId, Buffer.from(wrappedB64, "base64"));
      return gcmOpen(dek, Buffer.from(dataB64, "base64")).toString("utf8");
    },
  };
}

export function localKeyProvider(key) {
  return new LocalKeyProvider({ activeId: "k0", keys: { k0: key } });
}

export function keyFromPassphrase(passphrase) {
  return scryptSync(passphrase, "florence-field-enc", 32);
}
