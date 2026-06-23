import type { Buffer } from "node:buffer";

export declare function safeEqual(a: string, b: string): boolean;
export declare function sha256hex(s: string): string;
export declare function hashSecret(secret: string): string;
export declare function verifySecret(secret: string, stored: string): boolean;
export declare function signWebhook(secret: string, body: string, tsSec: number): string;
export declare function verifyWebhook(secret: string, header: string, body: string, nowSec: number): boolean;

export interface FieldCrypto {
  encrypt(plaintext: string): Promise<string>;
  decrypt(token: string): Promise<string>;
}

export interface Keyring {
  activeId: string;
  keys: Record<string, Buffer>;
}

export interface KeyProvider {
  activeKeyId(): string;
  wrap(keyId: string, dataKey: Buffer): Promise<Buffer>;
  unwrap(keyId: string, wrapped: Buffer): Promise<Buffer>;
}

export declare class LocalKeyProvider implements KeyProvider {
  private keys;
  private active;
  constructor(keyring: Keyring);
  activeKeyId(): string;
  wrap(keyId: string, dataKey: Buffer): Promise<Buffer>;
  unwrap(keyId: string, wrapped: Buffer): Promise<Buffer>;
}

export declare function makeFieldCrypto(provider: KeyProvider): FieldCrypto;
export declare function localKeyProvider(key: Buffer): KeyProvider;
export declare function keyFromPassphrase(passphrase: string): Buffer;
