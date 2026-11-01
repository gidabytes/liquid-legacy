# Liquid Legacy

**A Liquid Glass, iPadOS 26-inspired workspace that runs in the browser on an iPad 2 (A1395, iOS 9.3.5).**

Liquid Legacy is a vanilla ES5 web app: no framework, no build step, no service worker.
It ships with a small Python (stdlib only) companion server so it can run **standalone** on
your LAN with clearly-labelled demo data, then open it in Safari on the iPad.

![Liquid Legacy on the iPad 2](docs/screenshot.png)

## Quick start (standalone)

```bash
./run.sh                 # starts http://0.0.0.0:8088/ipad/legacy/
```

Open `http://<host-ip>:8088/ipad/legacy/` in any browser. The standalone mode:

- issues a **read-only** automatic session — no login screen;
- serves **demo data** for the system/posture/alerts/collectors widgets, marked as demo;
- keeps all personal data (notes, reminders, calendar, dock, widgets, dashboard) in the
  browser's localStorage.

## Push to the iPad 2

```bash
./deploy-ipad.sh 192.168.31.228            # IPAD_IP [HOST_IP]
```

The script prints the URL and, when SSH is available, opens it in Safari with `uiopen`.
Options:

- `GG_IPAD` — default iPad address.
- `GG_IPAD_PASS` + `sshpass` — password-based SSH (legacy ssh-rsa is negotiated).
- No SSH? Open the URL manually and use **Share → Add to Home Screen**; it launches
  full-screen because the page ships Apple web-app meta tags.

## Live backend (optional)

The companion can proxy a CyberGate backend instead of demo data:

```bash
unset GG_DEMO
export GG_UPSTREAM=http://127.0.0.1:8000
export GG_AUTO_SESSION=1 GG_AUTO_USER=... GG_AUTO_PASSWORD=...
python3 companion/gg_legacy_companion.py --host 0.0.0.0 --port 8088
```

Read-only, fixed allowlist, HttpOnly cookie; the upstream bearer token never reaches the
browser. Credentials can live in `~/.config/gg-legacy/auto.env` (mode 600) instead of the
shell.

## Install as a service

```bash
./install-service.sh      # systemd --user unit "liquid-legacy"
```

## What is inside

| Path | Purpose |
|---|---|
| `legacy/` | The app: one HTML, one CSS, one ES5 JS, local icons |
| `companion/gg_legacy_companion.py` | Static server + session + optional backend proxy |
| `run.sh` | Standalone launcher (demo mode) |
| `deploy-ipad.sh` | Open/install on the iPad |
| `install-service.sh` | systemd --user service |

## Honest limits

- Demo data is **sample data**, not live telemetry; the widgets label it as demo.
- Built-ins and launchers are simulations of an OS surface; external sites open as new tabs.
- No OAuth, no iframe embedding, no credential capture.
- iOS 9.3.5 Safari is the target: ES5 only, prefixed CSS, no modern APIs.
- Reminders, timers and alarms only fire while the page is open.

## License

MIT — see [LICENSE](LICENSE).
