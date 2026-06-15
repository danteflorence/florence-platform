#!/usr/bin/env bash
# Live, multi-REAL-app proof of the Nurse Passport spine: start Core + Academy +
# Pathway with passport emits enabled, then drive ONE nurse (same email) through
# real app endpoints in each — Pathway (licensure + consent + document) and
# Academy (readiness) — and read back ONE folded Passport that contains all of it,
# with academy+pathway refs converged. (ATS-live is proven by its own `npm run
# smoke`; see scripts/verify-spine.ts for the 3-ref reducer convergence test.)
set -uo pipefail
NODE=/Users/dantetolbedantert/florence-work/.toolchain/node/bin/node
ROOT=/Users/dantetolbedantert/florence-work
SF=/tmp/core-spine-live.json; KEK=florence-dev-kek
EMAIL="ada.okafor.spine@floretest.com"
J(){ $NODE -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{process.stdout.write(eval('('+JSON.stringify(JSON.parse(s))+')')[''])}catch(e){}})"; }
jget(){ $NODE -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const o=JSON.parse(s);process.stdout.write(String(o$1??''))}catch(e){}})"; }

for p in 8090 8088 8786; do lsof -ti tcp:$p 2>/dev/null | xargs kill 2>/dev/null; done; sleep 0.5
rm -f "$SF"

# 1) Core + admin + demo client
cd "$ROOT/florence-core"
CORE_STATE_FILE=$SF FIELD_ENC_PASSPHRASE=$KEK CORE_BOOTSTRAP_ADMIN_EMAIL=dev@florenceeducation.com CORE_BOOTSTRAP_ADMIN_PASSWORD=florence-dev $NODE scripts/seed-admin.ts >/dev/null 2>&1
PORT=8090 PUBLIC_CORE_URL=http://127.0.0.1:8090 FIELD_ENC_PASSPHRASE=$KEK DEMO_CLIENT_ID=florence-core-demo DEMO_CLIENT_SECRET=devsecret CORE_STATE_FILE=$SF $NODE src/index.ts >/tmp/core-live.log 2>&1 &
for i in $(seq 1 40); do curl -s -o /dev/null http://127.0.0.1:8090/health && break; sleep 0.3; done

# 2) Academy api + Pathway, passport ENABLED (demo client)
PASSENV="FLORENCE_CORE_CLIENT_ID=florence-core-demo FLORENCE_CORE_CLIENT_SECRET=devsecret CORE_ISSUER_URL=http://127.0.0.1:8090"
cd "$ROOT/florence-academy/api"
env $PASSENV PORT=8088 $NODE src/index.ts >/tmp/academy-live.log 2>&1 &
cd "$ROOT/florence-pathway-agent"
env $PASSENV PORT=8786 $NODE --experimental-sqlite --import tsx server/index.ts >/tmp/pathway-live.log 2>&1 &
for i in $(seq 1 50); do curl -s -o /dev/null http://127.0.0.1:8088/health && curl -s -o /dev/null http://127.0.0.1:8786/api/health && break; sleep 0.3; done

# 3) Core admin token (super_admin → all academy scopes; staff bypass in Pathway)
ADMIN=$(curl -s -H 'accept: application/json' -X POST http://127.0.0.1:8090/auth/password -H 'content-type: application/json' -d '{"email":"dev@florenceeducation.com","password":"florence-dev"}' | jget '.token')
echo "admin token: ${ADMIN:0:12}…"

# 4) PATHWAY — create candidate (EMAIL) + licensure + consent + document
CIDP=$(curl -s -H "authorization: Bearer $ADMIN" -X POST http://127.0.0.1:8786/api/candidates -H 'content-type: application/json' \
  -d "{\"legalFirstName\":\"Ada\",\"legalLastName\":\"Okafor\",\"dateOfBirth\":\"1992-04-05\",\"citizenship\":\"Nigeria\",\"nationality\":\"Nigerian\",\"countryOfResidence\":\"Nigeria\",\"email\":\"$EMAIL\"}" | jget '.id')
echo "pathway candidate: $CIDP"
curl -s -H "authorization: Bearer $ADMIN" -X POST "http://127.0.0.1:8786/api/candidates/$CIDP/choose-state" -H 'content-type: application/json' -d '{"state":"Florida"}' >/dev/null
curl -s -H "authorization: Bearer $ADMIN" -X POST "http://127.0.0.1:8786/api/candidates/$CIDP/consent" -H 'content-type: application/json' -d '{"scope":"employer","granted":true}' >/dev/null
curl -s -H "authorization: Bearer $ADMIN" -X POST "http://127.0.0.1:8786/api/candidates/$CIDP/documents" -H 'content-type: application/json' -d '{"kind":"passport_bio","filename":"passport.pdf"}' >/dev/null

# 5) ACADEMY — create candidate (SAME EMAIL) + readiness assessment
CIDA=$(curl -s -H "authorization: Bearer $ADMIN" -X POST http://127.0.0.1:8088/v1/candidates -H 'content-type: application/json' \
  -d "{\"full_name\":\"Ada Okafor\",\"email\":\"$EMAIL\",\"country\":\"Nigeria\"}" | jget '.id')
echo "academy candidate: $CIDA"
curl -s -H "authorization: Bearer $ADMIN" -X POST http://127.0.0.1:8088/v1/assessment-results -H 'content-type: application/json' \
  -d "{\"candidate_id\":\"$CIDA\",\"kind\":\"diagnostic\",\"theta\":0.7,\"readiness\":0.85}" >/dev/null

sleep 2  # let fire-and-forget emits flush

# 6) Read ONE Passport by email (Core M2M token) + assert
M2M=$(curl -s -X POST http://127.0.0.1:8090/oauth/token -H 'content-type: application/json' -d '{"grant_type":"client_credentials","client_id":"florence-core-demo","client_secret":"devsecret","scope":"passport:read"}' | jget '.access_token')
echo "=== ONE Passport for $EMAIL (folded from TWO real apps) ==="
curl -s -H "authorization: Bearer $M2M" "http://127.0.0.1:8090/v1/nurse/passport?email=$EMAIL" | $NODE -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
  const p=JSON.parse(s); let pass=0,fail=0; const ok=(l,c)=>{console.log((c?'✓':'✗')+' '+l);c?pass++:fail++;};
  console.log(JSON.stringify({readiness:p.readiness,licensure:p.licensure,consents:p.consents,documents:p.documents,refs:p.refs,funnelStage:p.funnelStage,eventCount:p.eventCount},null,1));
  ok('readiness folded from Academy (passProbability 0.85)', p.readiness && p.readiness.passProbability===0.85);
  ok('licensure folded from Pathway (Florida)', p.licensure && p.licensure.state==='Florida');
  ok('consent folded from Pathway (employer granted)', p.consents && p.consents.employer==='granted');
  ok('document folded from Pathway (passport_bio)', p.documents && p.documents.passport_bio===true);
  const apps=(p.refs||[]).map(r=>r.app).sort().join('+');
  ok('identity converged by email: academy + pathway', apps==='academy+pathway', apps);
  console.log('\n'+(fail?'LIVE SPINE FAILED':'LIVE SPINE PASSED — two real apps, one nurse, one Passport')+' ('+pass+' passed, '+fail+' failed)');
  process.exit(fail?1:0);
})
"