#!/usr/bin/env bash
# Open Liquid Legacy on the iPad 2. Requires SSH access (key or GG_IPAD_PASS+sshpass).
set -euo pipefail
cd "$(dirname "$0")"
IPAD="${1:-${GG_IPAD:-192.168.31.228}}"
HOSTIP="${2:-$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}')}"
URL="http://${HOSTIP}:8088/ipad/legacy/"
printf 'Liquid Legacy URL: %s\n' "$URL"
if command -v sshpass >/dev/null 2>&1 && [ -n "${GG_IPAD_PASS:-}" ]; then
  SSHPASS="$GG_IPAD_PASS" sshpass -e ssh -o StrictHostKeyChecking=no -o HostKeyAlgorithms=+ssh-rsa \
    -o PubkeyAcceptedAlgorithms=+ssh-rsa "root@${IPAD}" "uiopen '${URL}'" \
    && echo "Opened in Safari on the iPad."
else
  echo "No password helper. Open the URL in Safari on the iPad and use Share → Add to Home Screen."
  echo "For automatic launch: set up SSH keys (root@${IPAD}) or export GG_IPAD_PASS and install sshpass."
fi
