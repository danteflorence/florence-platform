#!/usr/bin/env bash
# FlorenceRN platform smoke check: proves the SSO loop end-to-end.
#   smoke_check.sh <core_url> <email> <password> [pathway_url] [ats_url] [academy_api_url]
# Local example:
#   scripts/smoke_check.sh http://id.lvh.me:8080 dev@florenceeducation.com florence-dev \
#       http://pathway.lvh.me:8786 http://ats.lvh.me:8788 http://academy.lvh.me:8088
# Prod example:
#   scripts/smoke_check.sh https://id.florenceeducation.com you@florenceeducation.com '' \
#       https://pathway.florenceeducation.com https://ats.florenceeducation.com https://api.academy.florenceeducation.com
set -u
CORE="${1:?core url}"; EMAIL="${2:?email}"; PASS="${3:-}"
PATHWAY="${4:-http://pathway.lvh.me:8786}"; ATS="${5:-http://ats.lvh.me:8788}"; ACADEMY="${6:-http://academy.lvh.me:8088}"
JAR="$(mktemp)"; fail=0
say(){ printf '%-52s %s\n' "$1" "$2"; }
code(){ curl -s -o /dev/null -w "%{http_code}" "$@" 2>/dev/null; }
expect(){ # label url expected_code [curl args...]
  local label="$1" url="$2" exp="$3"; shift 3
  local c; c=$(code "$@" "$url"); [ "$c" = "$exp" ] && say "$label" "✓ $c" || { say "$label" "✗ got $c want $exp"; fail=1; }
}

echo "== health =="
expect "core /health" "$CORE/health" 200
expect "pathway /api/health" "$PATHWAY/api/health" 200
expect "ats /api/health" "$ATS/api/health" 200

echo "== unauthenticated staff routes must reject =="
expect "pathway /api/admin/metrics (no auth)" "$PATHWAY/api/admin/metrics" 401
expect "ats /api/ops/employers (no auth)" "$ATS/api/ops/employers" 401

echo "== sign in to Core =="
login=$(curl -s -c "$JAR" -X POST "$CORE/auth/password" -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
if grep -q fl_session "$JAR"; then say "core login → fl_session cookie" "✓"; else say "core login" "✗ no cookie ($login)"; fail=1; fi

echo "== the SAME cookie authorizes every app (SSO) =="
expect "core /me (cookie)" "$CORE/me" 200 -b "$JAR"
expect "pathway /api/admin/metrics (cookie)" "$PATHWAY/api/admin/metrics" 200 -b "$JAR"
expect "pathway /api/qa/queue (cookie)" "$PATHWAY/api/qa/queue" 200 -b "$JAR"
expect "ats /api/ops/employers (cookie)" "$ATS/api/ops/employers" 200 -b "$JAR"
expect "ats /api/candidates (cookie)" "$ATS/api/candidates" 200 -b "$JAR"
expect "academy /v1/candidates (cookie)" "$ACADEMY/v1/candidates" 200 -b "$JAR"

rm -f "$JAR"
echo
[ "$fail" = 0 ] && echo "SMOKE OK — one login authorized Core + Pathway + ATS + Academy" || echo "SMOKE FAILED"
exit $fail
