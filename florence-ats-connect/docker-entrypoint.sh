#!/bin/sh
set -e
# No-clobber reseed onto the persistent disk; seedIfEmpty() creates the sqlite db
# on first boot, live data preserved on later deploys.
mkdir -p /app/data
if [ -d /app/data_seed ]; then cp -an /app/data_seed/. /app/data/ 2>/dev/null || true; fi
exec node --experimental-sqlite --import tsx server/index.ts
