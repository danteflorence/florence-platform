// Verify the audit-log tamper-evidence chain against the configured store
// (CORE_STATE_FILE for file/dev, DATABASE_URL for Postgres).
//
//   CORE_STATE_FILE=data/core-dev.json node scripts/verify-audit.ts
//   DATABASE_URL=postgres://… node scripts/verify-audit.ts

import { config } from "../src/config.ts";
import { createStore } from "../src/store.ts";
import { verifyAuditChain } from "../src/auditVerify.ts";

const store = await createStore(config);
const r = await verifyAuditChain(store);
if (r.ok) {
  console.log(`✓ audit chain intact — ${r.checked} chained rows verified`);
  process.exit(0);
} else {
  console.error(`✗ audit chain BROKEN at ${r.brokenAt} — ${r.reason} (after ${r.checked} good rows)`);
  process.exit(1);
}
