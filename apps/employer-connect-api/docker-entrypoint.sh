#!/bin/sh
set -e
node --import tsx scripts/migrate.ts
exec node --import tsx server/index.ts
