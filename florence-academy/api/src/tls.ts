// Native TLS options. When TLS_CERT_PATH + TLS_KEY_PATH are set, the server
// speaks HTTPS directly with a TLS 1.2 floor and a modern cipher suite — so the
// service no longer depends on an external terminator to protect data in
// transit. Mutual TLS (client-cert pinning) turns on when a client CA is given.

import { readFileSync } from "node:fs";
import type { ServerOptions } from "node:https";
import { config } from "./config.ts";

// Strong TLS 1.2 ECDHE suites (forward secrecy, AEAD only). TLS 1.3 suites are
// negotiated automatically and need no listing here.
const CIPHERS = [
  "ECDHE-ECDSA-AES256-GCM-SHA384",
  "ECDHE-RSA-AES256-GCM-SHA384",
  "ECDHE-ECDSA-CHACHA20-POLY1305",
  "ECDHE-RSA-CHACHA20-POLY1305",
  "ECDHE-ECDSA-AES128-GCM-SHA256",
  "ECDHE-RSA-AES128-GCM-SHA256",
].join(":");

/** HTTPS options from configured cert/key (+ optional mTLS), or null if unset. */
export function loadTlsOptions(): ServerOptions | null {
  const { certPath, keyPath, clientCaPath, requireClientCert } = config.tls;
  if (!certPath || !keyPath) return null;
  const opts: ServerOptions = {
    cert: readFileSync(certPath),
    key: readFileSync(keyPath),
    minVersion: "TLSv1.2",
    ciphers: CIPHERS,
    honorCipherOrder: true,
  };
  if (clientCaPath) {
    opts.ca = readFileSync(clientCaPath);
    opts.requestCert = true;
    // Enforce mutual TLS when required; otherwise request-but-don't-require.
    opts.rejectUnauthorized = requireClientCert;
  }
  return opts;
}

export function tlsEnabled(): boolean {
  return Boolean(config.tls.certPath && config.tls.keyPath);
}
