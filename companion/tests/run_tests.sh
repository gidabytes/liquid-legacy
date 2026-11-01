#!/usr/bin/env bash
# Integration test: stub CyberGate upstream -> legacy companion -> assertions.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
COMPANION="$HERE/../gg_legacy_companion.py"
BUILD="$(grep -o 'var BUILD = "[0-9.]*"' "$HERE/../../legacy/legacy.js" | head -1 | grep -o '[0-9.]*')"
PORT=8099
BASE="http://127.0.0.1:$PORT"
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %s\n' "$1"; }
chk()  { [ "$2" = "$3" ] && ok "$1 ($2)" || bad "$1 (got $2, want $3)"; }

cleanup() { [ -n "${STUB_PID:-}" ] && kill "$STUB_PID" 2>/dev/null; [ -n "${COMP_PID:-}" ] && kill "$COMP_PID" 2>/dev/null; }
trap cleanup EXIT

# make the run deterministic: a stale instance on the test ports would make the
# new server fail to bind and silently exercise the old one
command -v fuser >/dev/null 2>&1 && { fuser -k -n tcp 8097 2>/dev/null; fuser -k -n tcp "$PORT" 2>/dev/null; sleep 0.5; }

python3 "$HERE/stub_upstream.py" & STUB_PID=$!
sleep 0.6
# tests speak plain HTTP on loopback, so they must opt in to credential login
GG_UPSTREAM=http://127.0.0.1:8097 GG_ALLOW_INSECURE_LOGIN=1 \
  python3 "$COMPANION" --host 127.0.0.1 --port "$PORT" >/tmp/legacy-test.log 2>&1 &
COMP_PID=$!
sleep 1.0

echo "== static + unauthenticated =="
chk "frontend index"      "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/ipad/legacy/")" 200
chk "css served"          "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/ipad/legacy/legacy.css")" 200
chk "js served"           "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/ipad/legacy/legacy.js")" 200
chk "touch icon"          "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/ipad/legacy/assets/touch-icon.png")" 200
chk "path traversal blocked" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/ipad/legacy/../../../etc/passwd")" 404
chk "health"              "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/legacy/v1/health")" 200
chk "status(host)"        "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/legacy/v1/status")" 200
chk "session unauth"      "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/legacy/v1/session")" 401
chk "dataset unauth"      "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/legacy/v1/upstream/dashboard")" 401
chk "unknown dataset"     "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/legacy/v1/upstream/nope")" 404

echo "== cache + compression (A5 launch cost) =="
hdr() { curl -s -D - -o /dev/null "$1" | tr -d '\r' | awk -F': ' -v k="$2" 'tolower($1)==k{print $2}'; }
chk "html is never cached" "$(hdr "$BASE/ipad/legacy/" cache-control | grep -c 'no-store')" 1
chk "versioned asset is immutable" "$(hdr "$BASE/ipad/legacy/legacy.css?v=$BUILD" cache-control | grep -c 'immutable')" 1
etag=$(hdr "$BASE/ipad/legacy/legacy.js?v=$BUILD" etag)
chk "etag present" "$([ -n "$etag" ] && echo yes)" yes
chk "304 on if-none-match" "$(curl -s -o /dev/null -w '%{http_code}' -H "If-None-Match: $etag" "$BASE/ipad/legacy/legacy.js?v=$BUILD")" 304
chk "gzip offered for js" "$(curl -s -D - -o /dev/null -H 'Accept-Encoding: gzip' "$BASE/ipad/legacy/legacy.js?v=$BUILD" | tr -d '\r' | awk -F': ' 'tolower($1)=="content-encoding"{print $2}' | grep -c gzip)" 1
curl -s -H 'Accept-Encoding: gzip' "$BASE/ipad/legacy/legacy.js?v=$BUILD" -o /tmp/gg-js-gz
curl -s "$BASE/ipad/legacy/legacy.js?v=$BUILD" -o /tmp/gg-js-plain
chk "gzip decodes to same bytes" "$(gzip -dc /tmp/gg-js-gz 2>/dev/null | cmp -s - /tmp/gg-js-plain && echo same)" same

echo "== authentication =="
chk "bad login"           "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
                             -d '{"username":"demo","password":"nope"}' "$BASE/api/legacy/v1/session")" 401
curl -s -c /tmp/gg_cookies.txt -o /dev/null -X POST -H 'Content-Type: application/json' \
     -d '{"username":"demo","password":"demo"}' "$BASE/api/legacy/v1/session"
grep -q "gg_legacy_sid" /tmp/gg_cookies.txt && ok "session cookie issued" || bad "no session cookie"
chk "session auth"        "$(curl -s -b /tmp/gg_cookies.txt -o /dev/null -w '%{http_code}' "$BASE/api/legacy/v1/session")" 200

echo "== read-only datasets through the allowlist =="
for ds in dashboard gids_summary alerts alerts_summary collectors; do
  code=$(curl -s -b /tmp/gg_cookies.txt -o /tmp/ds.json -w '%{http_code}' "$BASE/api/legacy/v1/upstream/$ds")
  chk "dataset $ds" "$code" 200
done
chk "dashboard payload has data" \
  "$(curl -s -b /tmp/gg_cookies.txt "$BASE/api/legacy/v1/upstream/dashboard" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("yes" if d["data"].get("computers")==412 else "no")')" yes
chk "alerts payload has items" \
  "$(curl -s -b /tmp/gg_cookies.txt "$BASE/api/legacy/v1/upstream/alerts" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(len(d["data"]["items"]))')" 3

echo "== no write surface beyond login/chat =="
for ep in "/api/legacy/v1/admin" "/api/legacy/v1/exec" "/api/legacy/v1/upstream/dashboard"; do
  m=$(curl -s -o /dev/null -w '%{http_code}' -X POST -b /tmp/gg_cookies.txt -H 'Content-Type: application/json' -d '{}' "$BASE$ep")
  [ "$m" = "404" ] || [ "$m" = "405" ] && ok "POST $ep rejected ($m)" || bad "POST $ep not rejected ($m)"
done

echo "== audit log =="
AUD="$HOME/.local/state/gg-legacy-companion/audit.log"
grep -q '"action":"login"' "$AUD" && ok "login audited" || bad "login not audited"
grep -q '"outcome":"denied:401"' "$AUD" && ok "denied login audited" || bad "denied login not audited"

echo
echo "  result: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
