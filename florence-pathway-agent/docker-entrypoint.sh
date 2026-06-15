#!/bin/sh
set -e
# Reseed read-only reference data onto the persistent disk WITHOUT clobbering a
# live db (cp -an = no-clobber). The app's seedIfEmpty() creates the sqlite db on
# first boot; on later deploys the live data on the disk is preserved.
mkdir -p /app/data
if [ -d /app/data_seed ]; then cp -an /app/data_seed/. /app/data/ 2>/dev/null || true; fi
exec node --experimental-sqlite --import tsx server/index.ts
