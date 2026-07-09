#!/bin/sh
set -e
node db/migrate.mjs
exec node --import tsx server/index.ts
