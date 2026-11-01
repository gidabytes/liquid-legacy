#!/usr/bin/env bash
# Liquid Legacy standalone: demo data, no backend or credentials required.
set -euo pipefail
cd "$(dirname "$0")"
HOST="${1:-0.0.0.0}"
PORT="${2:-8090}"
export GG_DEMO=1 GG_AUTO_SESSION=1
echo "Liquid Legacy on http://$(hostname -I 2>/dev/null | awk '{print $1}'):$PORT/ipad/legacy/"
exec python3 companion/gg_legacy_companion.py --host "$HOST" --port "$PORT"
