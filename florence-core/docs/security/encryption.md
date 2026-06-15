# Encryption & Key Management

**Status:** ✅ field-level AES-256-GCM envelope + scrypt secrets implemented (`src/crypto.ts`); 🟡 KMS + automated rotation are ops; ⛔ TDE/TLS termination are deployment-owned
**Maps to:** NIST CSF 2.0 PR.DS-01 (data at rest) / PR.DS-02 (data in transit) · SOC 2 CC6.7 · OWASP ASVS 5.0 V6 (Cryptography)

## At rest

- **Field-level envelope encryption (AES-256-GCM).** `makeFieldCrypto()` wraps a
  per-record data key (DEK) with a key-encryption key (KEK); ciphertext format
  `fe1.<keyId>.<wrapped-dek>.<ciphertext>`. Used today to encrypt RSA signing
  private keys at rest (`signing_keys.private_pem_enc`).
- **Restricted fields** (visa/I-20, government ids, DOB, financing, bank details,
  documents) **must** use field-level encryption when stored. The envelope +
  `KeyProvider` seam is in place; per-domain key separation is the rollout step.
- **Secret hashing.** Client secrets + passwords use scrypt (`hashSecret` /
  `verifySecret`), salted, constant-time compare.
- **Hashing for lookup.** High-entropy opaque tokens (refresh tokens) use SHA-256
  for the at-rest lookup hash; tracked-link IP/UA stored **hashed** (Demand Radar).

## Key management

- **KEK is environment-provided** (`FIELD_ENC_PASSPHRASE`) and **must be stable**
  across restarts (a per-boot key would make all encrypted data undecryptable).
- **Rotation.** Signing keys rotate via `kid` (active → retiring → revoked);
  `scripts/rotate-key.ts`. Field KEKs support multiple ids via the keyring.
- 🟡 **KMS (planned).** Replace the local `LocalKeyProvider` with a managed KMS
  (AWS KMS / GCP KMS / Vault) implementing the same `KeyProvider` interface;
  separate keys by environment + data domain (candidate docs, financing, employer
  packets, logs, backups). No application code change — the seam already exists.
- ⛔ **No production secrets in repos, env files committed to git, Slack, or
  local machines.** Use a secrets manager. (Ops control.)

## In transit
- ⛔ **TLS 1.2+/1.3** terminated at the edge (Cloudflare/Render) — deployment-owned.
- M2M + SSO tokens are RS256, verified everywhere via JWKS; a leak downstream
  cannot forge a token (only Core holds the private key).

## Payments
- ⛔ **Never store card data.** Use a PCI-compliant processor (Stripe) and keep
  FlorenceRN out of cardholder-data scope. (PCI DSS v4.0.1.)

## Document access (planned)
- Short-lived **signed URLs** for sensitive document access; cryptographic erasure
  / hard delete for expired documents per the retention policy.

## Verification
The Core checkpoint mints + verifies RS256 tokens and decrypts the signing key at
boot (proving the envelope round-trips with a stable KEK). Field-encryption
round-trip is covered by the Academy PostgresStore integration test
(email/phone encrypt-on-write, decrypt-on-read).
