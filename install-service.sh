#!/usr/bin/env bash
# Install Liquid Legacy as a systemd --user service on this host.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
mkdir -p "$UNIT_DIR"
cat > "$UNIT_DIR/liquid-legacy.service" <<EOF
[Unit]
Description=Liquid Legacy standalone (iPad 2)
After=network.target

[Service]
WorkingDirectory=$DIR
Environment=GG_DEMO=1
Environment=GG_AUTO_SESSION=1
ExecStart=$DIR/run.sh
Restart=on-failure

[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable --now liquid-legacy.service
echo "Liquid Legacy service started: systemctl --user status liquid-legacy.service"
