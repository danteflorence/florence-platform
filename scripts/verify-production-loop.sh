#!/usr/bin/env bash
# ── FlorenceRN — End-to-end Production Loop ("Definition of Done") ───────────
# Boots a LIVE Core (fresh state, demo M2M client with passport + control-tower
# scopes), then runs the in-process ATS production loop against it. The ATS half
# emits to Core over the REAL spine API, so the attested 'started' propagates and
# the Control Tower reports the start + MRR. ONE nurse, three apps, one Passport.
#
#   ./scripts/verify-production-loop.sh        # exits non-zero on any failed assertion
set -uo pipefail
NODE=/Users/dantetolbedantert/florence-work/.toolchain/node/bin/node
ROOT=/Users/dantetolbedantert/florence-work
CORE_PORT=${CORE_PORT:-8091}
SF=/tmp/core-prodloop.json
KEK=florence-dev-kek
EMAIL="grace.loop.$(date +%s 2>/dev/null || echo run)@floretest.com"

cleanup() { [ -n "${CORE_PID:-}" ] && kill "$CORE_PID" 2>/dev/null; }
trap cleanup EXIT

lsof -ti tcp:$CORE_PORT 2>/dev/null | xargs kill 2>/dev/null; sleep 0.4
rm -f "$SF"

# 1) Core — demo M2M client carries passport:read/write + control-tower:read.
cd "$ROOT/florence-core"
PORT=$CORE_PORT PUBLIC_CORE_URL=http://127.0.0.1:$CORE_PORT FIELD_ENC_PASSPHRASE=$KEK \
  DEMO_CLIENT_ID=florence-core-demo DEMO_CLIENT_SECRET=devsecret CORE_STATE_FILE=$SF \
  $NODE src/index.ts >/tmp/core-prodloop.log 2>&1 &
CORE_PID=$!
UP=0
for i in $(seq 1 50); do curl -s -o /dev/null "http://127.0.0.1:$CORE_PORT/health" && { UP=1; break; }; sleep 0.3; done
if [ "$UP" != "1" ]; then echo "✗ Core failed to start on :$CORE_PORT"; tail -20 /tmp/core-prodloop.log; exit 1; fi
echo "Core up on :$CORE_PORT (pid $CORE_PID)"

# 2) The in-process ATS production loop, passport emits ENABLED → this Core.
cd "$ROOT/florence-ats-connect"
CORE_ISSUER_URL=http://127.0.0.1:$CORE_PORT \
  FLORENCE_CORE_CLIENT_ID=florence-core-demo FLORENCE_CORE_CLIENT_SECRET=devsecret \
  PRODLOOP_CORE=http://127.0.0.1:$CORE_PORT PRODLOOP_EMAIL="$EMAIL" \
  $NODE --experimental-sqlite --import tsx scripts/verify-production-loop.ts
exit $?
