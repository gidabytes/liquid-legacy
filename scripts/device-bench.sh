#!/usr/bin/env bash
# Run the on-device benchmark on the iPad 2 and print the reports it posts.
#
# Usage: scripts/device-bench.sh [BUILD_TAG] [TIMEOUT_SECONDS]
#
# The device loads /ipad/legacy/legacy-bench.html in Safari (via SSH uiopen) and
# posts each stage to /api/legacy/v1/client-report, which the companion appends
# to ~/.local/state/gg-legacy-companion/audit.log.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IPAD="${GG_IPAD:-192.168.31.228}"
HOSTIP="${GG_BENCH_HOST:-$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}')}"
LEGACY_JS="$ROOT/ipad/legacy/legacy.js"
[ -f "$LEGACY_JS" ] || LEGACY_JS="$ROOT/legacy/legacy.js"
BUILD="${1:-$(grep -o 'var BUILD = "[0-9.]*"' "$LEGACY_JS" | head -1 | grep -o '[0-9.]*')}"
TIMEOUT="${2:-90}"
PORT="${GG_BENCH_PORT:-8443}"
SCHEME="${GG_BENCH_SCHEME:-https}"
AUD="$HOME/.local/state/gg-legacy-companion/audit.log"
SSH_KEY="${GG_IPAD_KEY:-$HOME/ipad/config/ssh/ipad2_root_key}"
URL="${SCHEME}://${HOSTIP}:${PORT}/ipad/legacy/legacy-bench.html?b=${BUILD}"

ssh_ipad() {
  ssh -i "$SSH_KEY" -o IdentitiesOnly=yes \
    -o PubkeyAcceptedAlgorithms=+ssh-rsa -o HostKeyAlgorithms=+ssh-rsa \
    -o KexAlgorithms=+diffie-hellman-group1-sha1 -o Ciphers=+aes128-cbc \
    -o MACs=+hmac-sha1 -o StrictHostKeyChecking=no -o ConnectTimeout=12 \
    -o ServerAliveInterval=5 -o ServerAliveCountMax=2 "root@${IPAD}" "$@"
}

MARK="$(date -u +%Y-%m-%dT%H:%M:%S)"
printf 'bench URL : %s\n' "$URL"
printf 'marker    : %s\n' "$MARK"

ssh_ipad "uiopen '${URL}'" >/dev/null 2>&1 || { echo "uiopen failed (SSH?)" >&2; exit 1; }
printf 'opened on device; collecting reports…\n\n'

seen=0
deadline=$((SECONDS + TIMEOUT))
while [ "$SECONDS" -lt "$deadline" ]; do
  out="$(python3 - "$AUD" "$MARK" <<'PY'
import json, sys
path, mark = sys.argv[1], sys.argv[2]
try:
    lines = open(path, encoding="utf-8", errors="replace").read().splitlines()
except OSError:
    sys.exit(0)
for line in lines:
    try: d = json.loads(line)
    except Exception: continue
    if d.get("action") != "client_report" or not str(d.get("ts","")) >= mark: continue
    det = str(d.get("detail",""))
    if "BENCH " not in det: continue
    print(d["ts"], det.split(" | ")[0])
PY
)"
  if [ -n "$out" ]; then
    if [ "$seen" -eq 0 ]; then
      printf '%s\n' "$out"
    else
      printf '%s\n' "$out" | tail -n +"$((seen + 1))" || true
    fi
    seen=$(printf '%s\n' "$out" | wc -l)
  fi
  if printf '%s\n' "$out" | grep -q 'BENCH done'; then
    [ "$seen" -ge 8 ] && break
  fi
  sleep 2
done

printf '\n%d BENCH report(s) collected.\n' "$seen"
[ "$seen" -ge 6 ] || { echo "incomplete — device may be locked or Safari suspended" >&2; exit 2; }
