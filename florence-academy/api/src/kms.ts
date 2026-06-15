// AWS KMS KeyProvider. The KEK never leaves KMS: we call Encrypt to wrap a data
// key and Decrypt to unwrap it. `@aws-sdk/client-kms` is imported lazily so the
// reference build needs no dependency. To enable:
//   npm i @aws-sdk/client-kms   (in api/)
//   set KMS_KEY_ID (+ AWS creds/region), select KmsKeyProvider in index.ts:
//     new PostgresStore(sql, makeFieldCrypto(new KmsKeyProvider(process.env.KMS_KEY_ID!)))
//
// The shape is identical to LocalKeyProvider, so swapping is a one-line change.

import type { KeyProvider } from "./crypto.ts";

export class KmsKeyProvider implements KeyProvider {
  private keyId: string;
  private kmsPromise: Promise<unknown> | null = null;

  constructor(kmsKeyId: string) {
    this.keyId = kmsKeyId;
  }

  activeKeyId(): string {
    return this.keyId;
  }

  private async sdk(): Promise<Record<string, unknown>> {
    if (!this.kmsPromise) {
      this.kmsPromise = (async () => {
        try {
          const spec = "@aws-sdk/client-kms"; // non-literal: optional dependency
          return await import(spec);
        } catch {
          throw new Error("@aws-sdk/client-kms is not installed — run `npm i @aws-sdk/client-kms`");
        }
      })();
    }
    return this.kmsPromise as Promise<Record<string, unknown>>;
  }

  async wrap(keyId: string, dataKey: Buffer): Promise<Buffer> {
    const kms = (await this.sdk()) as any;
    const client = new kms.KMSClient({});
    const out = await client.send(new kms.EncryptCommand({ KeyId: keyId, Plaintext: dataKey }));
    return Buffer.from(out.CiphertextBlob);
  }

  async unwrap(_keyId: string, wrapped: Buffer): Promise<Buffer> {
    // KMS Decrypt resolves the key from the ciphertext blob itself.
    const kms = (await this.sdk()) as any;
    const client = new kms.KMSClient({});
    const out = await client.send(new kms.DecryptCommand({ CiphertextBlob: wrapped }));
    return Buffer.from(out.Plaintext);
  }
}
