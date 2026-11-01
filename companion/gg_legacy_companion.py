#!/usr/bin/env python3
"""Golden Gate Legacy Companion — backend for the iPad 2 / iOS 9.3.5 frontend.

Design rules (enforced here, not in the browser):
  * Versioned API under /api/legacy/v1/.
  * Read-only by default. The ONLY state-changing calls are login/logout and
    Genie chat; every one is written to an audit log.
  * No arbitrary proxying: upstream paths come from a fixed allowlist.
  * No shell execution of any kind.
  * Sessions are server-side; the upstream bearer token never reaches the iPad.
  * TLS optional (--tls-cert/--tls-key); plain HTTP is for isolated read-only LANs.
"""
import argparse
import base64
import json
import os
import re
import secrets
import shutil
import signal
import socket
import ssl
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

VERSION = "1.0.0"
API_PREFIX = "/api/legacy/v1"
HERE = Path(__file__).resolve().parent
BUNDLE = HERE.parent / "legacy"          # static frontend
STATE = Path(os.environ.get("XDG_STATE_HOME", Path.home() / ".local/state")) / "gg-legacy-companion"
STATE.mkdir(parents=True, exist_ok=True)
AUDIT = STATE / "audit.log"

UPSTREAM = os.environ.get("GG_UPSTREAM", "http://127.0.0.1:8000")
LLM_URL = os.environ.get("GG_LLM_URL", "http://127.0.0.1:1337")
LLM_KEY_FILE = Path(os.environ.get("GG_LLM_KEY_FILE", Path.home() / ".local/share/genie/llm-always.key"))

# ---- upstream allowlist: exact paths the legacy client may read ----
ALLOWED_GET = {
    "/api/v1/dashboard/summary": "dashboard",
    "/api/v1/dashboard/mission-control": "mission_control",
    "/api/v1/dashboard/activity": "activity",
    "/api/v1/dashboard/collector-status": "collector_status",
    "/api/v1/dashboard/change-summary": "change_summary",
    "/api/v1/alerts/summary": "alerts_summary",
    "/api/v1/alerts": "alerts",
    "/api/v1/aetg/summary": "gids_summary",
    "/api/v1/collectors/status": "collectors",
    "/api/v1/inventory/dashboard": "inventory",
    "/api/v1/health/ready": "upstream_ready",
    "/api/v1/health/dependencies": "upstream_deps",
}

SESSION_TTL = 1800          # 30 min idle
# TEST-ONLY: when set, an anonymous read-only session is created so UI tests can
# render authenticated views. Never enable this in production.
DEV_ANON = os.environ.get("GG_DEV_ANON") == "1"
DEMO = os.environ.get("GG_DEMO") == "1"
AUTO_SESSION = os.environ.get("GG_AUTO_SESSION") == "1" or DEMO
AUTO_USER = os.environ.get("GG_AUTO_USER", "")
AUTO_PASSWORD = os.environ.get("GG_AUTO_PASSWORD", "")
# Plain-HTTP mode never accepts credentials unless the operator explicitly opts in.
# Over an isolated LAN this is the documented fallback when a legacy browser cannot
# complete TLS; it is refused by default so a misconfiguration cannot leak passwords.
ALLOW_INSECURE_LOGIN = os.environ.get("GG_ALLOW_INSECURE_LOGIN") == "1"
CHAT_LIMIT = 12             # per session per minute
MAX_BODY = 64 * 1024

SESSIONS = {}
SESSIONS_LOCK = threading.Lock()
CHAT_HISTORY = {}


def audit(action, session_id, detail, outcome):
    rec = {
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "action": action,
        "session": (session_id or "-")[:12],
        "detail": detail,
        "outcome": outcome,
        "pid": os.getpid(),
    }
    try:
        with AUDIT.open("a", encoding="utf-8") as f:
            f.write(json.dumps(rec, separators=(",", ":")) + "\n")
        os.chmod(AUDIT, 0o600)
    except OSError:
        pass


def upstream_get(path, token, timeout=6.0):
    req = urllib.request.Request(UPSTREAM + path, method="GET")
    req.add_header("Authorization", "Bearer " + token)
    req.add_header("Accept", "application/json")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, json.loads(r.read().decode("utf-8", "replace"))


def upstream_login(username, password, timeout=8.0):
    body = json.dumps({"username": username, "password": password}).encode()
    req = urllib.request.Request(UPSTREAM + "/api/v1/auth/login", data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def proc_metrics():
    def read(p):
        try:
            return Path(p).read_text()
        except OSError:
            return ""
    load = read("/proc/loadavg").split()
    mem = {}
    for line in read("/proc/meminfo").splitlines():
        k, _, v = line.partition(":")
        mem[k] = v.strip()
    def kb(key):
        try:
            return int(mem.get(key, "0 kB").split()[0])
        except (ValueError, IndexError):
            return 0
    total, avail = kb("MemTotal"), kb("MemAvailable")
    used = max(0, total - avail)
    st = os.statvfs("/")
    disk_total = st.f_blocks * st.f_frsize
    disk_free = st.f_bavail * st.f_frsize
    up = float(read("/proc/uptime").split()[0] or 0)
    return {
        "host": socket.gethostname(),
        "load1": float(load[0]) if load else 0.0,
        "load5": float(load[1]) if len(load) > 1 else 0.0,
        "mem_total_mb": round(total / 1024, 1),
        "mem_used_mb": round(used / 1024, 1),
        "mem_pct": round(100.0 * used / total, 1) if total else 0.0,
        "disk_total_gb": round(disk_total / 1e9, 1),
        "disk_free_gb": round(disk_free / 1e9, 1),
        "disk_pct": round(100.0 * (1 - disk_free / disk_total), 1) if disk_total else 0.0,
        "uptime_s": int(up),
        "uptime_human": "%dd %dh %dm" % (up // 86400, (up % 86400) // 3600, (up % 3600) // 60),
    }


def llm_chat(session_id, message):
    key = LLM_KEY_FILE.read_text().strip() if LLM_KEY_FILE.exists() else ""
    payload = {
        "model": "genie-local",
        "messages": [
            {"role": "system", "content":
             "You are Genie, the Golden Gate assistant on a legacy iPad companion. "
             "Answer briefly (max 120 words), plain text, no markdown tables, no emoji."},
            {"role": "user", "content": message[:2000]},
        ],
        "max_tokens": 320,
        "temperature": 0.6,
        "stream": False,
    }
    req = urllib.request.Request(LLM_URL + "/v1/chat/completions",
                                 data=json.dumps(payload).encode(), method="POST")
    req.add_header("Content-Type", "application/json")
    if key:
        req.add_header("Authorization", "Bearer " + key)
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.loads(r.read().decode("utf-8", "replace"))
    try:
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError):
        return ""


DEMO_SUMMARY = {
    "ok": True,
    "demo": True,
    "host": {"host": "liquid-legacy", "load1": "0.42", "mem_pct": 31,
             "disk_pct": 58, "uptime_human": "6d 04h 12m"},
    "datasets": {
        "gids_summary": {"trusted": 388, "untrusted": 12, "pending": 12, "conflicts": 3},
        "aetg_posture": {"trusted": 388, "untrusted": 12, "pending": 12, "conflicts": 3},
        "alerts": [{"id": "demo-1", "severity": "warning",
                    "title": "Demo alert: collector lag",
                    "message": "Sample data — no live backend is connected"}],
        "collectors": {"items": [
            {"name": "edge-01", "state": "running"},
            {"name": "core-02", "state": "running"},
            {"name": "sensor-07", "state": "degraded"},
        ]},
    },
    "errors": [],
}

class Handler(BaseHTTPRequestHandler):
    server_version = "GG-Legacy/" + VERSION
    protocol_version = "HTTP/1.1"

    # ---------- helpers ----------
    def _json(self, code, obj):
        body = json.dumps(obj, separators=(",", ":")).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def _err(self, code, msg):
        self._json(code, {"ok": False, "error": msg})

    def _session(self):
        cookie = self.headers.get("Cookie", "")
        m = re.search(r"gg_legacy_sid=([A-Za-z0-9_-]+)", cookie)
        if not m:
            return None, None
        sid = m.group(1)
        with SESSIONS_LOCK:
            s = SESSIONS.get(sid)
            if not s:
                return None, None
            if time.time() - s["seen"] > SESSION_TTL:
                del SESSIONS[sid]
                return None, None
            s["seen"] = time.time()
            return sid, s

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > MAX_BODY:
            return None
        try:
            return json.loads(self.rfile.read(n).decode("utf-8", "replace"))
        except (ValueError, UnicodeDecodeError):
            return None

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    # ---------- static ----------
    def _static(self, path):
        rel = path[len("/ipad/legacy/"):] or "index.html"
        if rel.endswith("/"):
            rel += "index.html"
        target = (BUNDLE / rel).resolve()
        if not str(target).startswith(str(BUNDLE.resolve())) or not target.is_file():
            self._err(404, "not found")
            return
        types = {
            ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8", ".png": "image/png",
            ".svg": "image/svg+xml", ".json": "application/json", ".ico": "image/x-icon",
            ".crt": "application/x-x509-ca-cert", ".txt": "text/plain; charset=utf-8",
        }
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", types.get(target.suffix, "application/octet-stream"))
        self.send_header("Content-Length", str(len(data)))
        # HTML must never be reused from the iOS standalone snapshot; assets may
        # revalidate but never be served stale.
        if target.suffix == ".html":
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        else:
            self.send_header("Cache-Control", "no-cache, must-revalidate, max-age=0")
        self.end_headers()
        self.wfile.write(data)

    # ---------- API ----------
    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/go":
            host = self.headers.get("Host", "").split(":")[0]
            target = "https://%s:8443/ipad/legacy/" % host
            audit("redirect_https", None, target, "ok")
            self.send_response(302)
            self.send_header("Location", target)
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return

        if u.path.startswith("/ipad/legacy/"):
            return self._static(u.path)

        if u.path == API_PREFIX + "/health":
            up_ok, up_detail = False, None
            try:
                req = urllib.request.Request(UPSTREAM + "/health")
                with urllib.request.urlopen(req, timeout=4) as r:
                    up_detail = json.loads(r.read().decode("utf-8", "replace"))
                    up_ok = r.status == 200
            except Exception as e:                      # noqa: BLE001 - report, don't crash
                up_detail = {"error": str(e)}
            return self._json(200, {"ok": True, "version": VERSION, "upstream_ok": up_ok,
                                    "upstream": up_detail, "time": int(time.time())})

        if u.path == API_PREFIX + "/status":
            return self._json(200, {"ok": True, "system": proc_metrics()})

        if u.path == API_PREFIX + "/settings":
            return self._json(200, {"ok": True, "settings": {
                "poll_seconds": 10, "chat_limit_per_min": CHAT_LIMIT,
                "session_ttl": SESSION_TTL, "version": VERSION,
                "read_only": True,
            }})

        m = re.match(r"^" + re.escape(API_PREFIX) + r"/upstream/([a-z_]+)$", u.path)
        if m:
            key = m.group(1)
            path = next((p for p, k in ALLOWED_GET.items() if k == key), None)
            if not path:
                return self._err(404, "unknown dataset")
            sid, s = self._session()
            if not s:
                return self._err(401, "not authenticated")
            try:
                status, data = upstream_get(path, s["token"])
                return self._json(200, {"ok": True, "dataset": key, "status": status, "data": data})
            except urllib.error.HTTPError as e:
                return self._err(e.code, "upstream %s" % e.code)
            except Exception as e:                      # noqa: BLE001
                return self._err(502, "upstream unreachable: %s" % type(e).__name__)

        if u.path == API_PREFIX + "/summary":
            if DEMO:
                return self._json(200, DEMO_SUMMARY)
            if not s:
                return self._err(401, "not authenticated")
            out = {"ok": True, "host": proc_metrics(), "datasets": {}, "errors": []}
            for key in ("alerts", "alerts_summary", "gids_summary", "dashboard", "collectors"):
                path = next((p for p, k in ALLOWED_GET.items() if k == key), None)
                if not path:
                    continue
                try:
                    _, data = upstream_get(path, s["token"], timeout=5.0)
                    out["datasets"][key] = data
                except Exception as e:            # noqa: BLE001
                    out["errors"].append("%s:%s" % (key, type(e).__name__))
            return self._json(200, out)

        if u.path == API_PREFIX + "/session":
            sid, s = self._session()
            if not s and AUTO_SESSION:
                token = ""
                user = {"username": "auto", "role": "viewer"}
                if AUTO_USER and AUTO_PASSWORD:
                    try:
                        tok = upstream_login(AUTO_USER, AUTO_PASSWORD)
                        token = tok.get("access_token", "")
                        user = tok.get("user") or user
                    except Exception as e:                      # noqa: BLE001
                        audit("session_auto", None, "auto",
                              "upstream-failed:%s" % type(e).__name__)
                if not token:
                    token = os.environ.get("GG_DEV_TOKEN", "")
                sid = secrets.token_urlsafe(24)
                with SESSIONS_LOCK:
                    SESSIONS[sid] = {"token": token, "user": user, "seen": time.time()}
                audit("session_auto", sid, user.get("username", "auto"), "ok")
                self.send_response(200)
                payload = json.dumps({"ok": True, "user": user, "auto": True,
                                      "expires_in": SESSION_TTL}).encode()
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(payload)))
                self.send_header("Set-Cookie",
                                 "gg_legacy_sid=%s; Path=/; HttpOnly; SameSite=Lax%s"
                                 % (sid, "; Secure" if self.server.tls else ""))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(payload)
                return
            if not s and DEV_ANON:
                sid = secrets.token_urlsafe(24)
                with SESSIONS_LOCK:
                    SESSIONS[sid] = {"token": os.environ.get("GG_DEV_TOKEN", ""),
                                     "user": {"username": "ui-test", "role": "viewer"},
                                     "seen": time.time()}
                self.send_response(200)
                payload = json.dumps({"ok": True, "user": SESSIONS[sid]["user"],
                                      "expires_in": SESSION_TTL}).encode()
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(payload)))
                self.send_header("Set-Cookie", "gg_legacy_sid=%s; Path=/; HttpOnly; SameSite=Lax" % sid)
                self.end_headers()
                self.wfile.write(payload)
                return
            if not s:
                return self._err(401, "not authenticated")
            return self._json(200, {"ok": True, "user": s["user"], "expires_in": SESSION_TTL})

        return self._err(404, "no route")

    def do_POST(self):
        u = urlparse(self.path)

        if u.path == API_PREFIX + "/summary":
            sid, s = self._session()
            if not s:
                return self._err(401, "not authenticated")
            out = {"ok": True, "host": proc_metrics(), "datasets": {}, "errors": []}
            for key in ("alerts", "alerts_summary", "gids_summary", "dashboard", "collectors"):
                path = next((p for p, k in ALLOWED_GET.items() if k == key), None)
                if not path:
                    continue
                try:
                    _, data = upstream_get(path, s["token"], timeout=5.0)
                    out["datasets"][key] = data
                except Exception as e:            # noqa: BLE001
                    out["errors"].append("%s:%s" % (key, type(e).__name__))
            return self._json(200, out)

        if u.path == API_PREFIX + "/session":
            if not self.server.tls and not ALLOW_INSECURE_LOGIN:
                audit("login", None, "insecure-attempt", "refused:requires-tls")
                return self._err(403, "refusing credentials over plain HTTP; "
                                      "set GG_ALLOW_INSECURE_LOGIN=1 on an isolated LAN")
            body = self._body()
            if not body or "username" not in body or "password" not in body:
                return self._err(400, "username and password required")
            try:
                tok = upstream_login(body["username"], body["password"])
            except urllib.error.HTTPError as e:
                audit("login", None, body.get("username", "?"), "denied:%s" % e.code)
                return self._err(401, "invalid credentials")
            except Exception as e:                      # noqa: BLE001
                audit("login", None, body.get("username", "?"), "error:%s" % type(e).__name__)
                return self._err(502, "authentication backend unavailable")
            sid = secrets.token_urlsafe(24)
            with SESSIONS_LOCK:
                SESSIONS[sid] = {"token": tok["access_token"], "user": tok.get("user", {}),
                                 "seen": time.time()}
            audit("login", sid, body["username"], "ok")
            self.send_response(200)
            payload = json.dumps({"ok": True, "user": tok.get("user", {}),
                                  "expires_in": SESSION_TTL}).encode()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Set-Cookie",
                             "gg_legacy_sid=%s; Path=/; HttpOnly; SameSite=Lax%s"
                             % (sid, "; Secure" if self.server.tls else ""))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)
            return

        if u.path == API_PREFIX + "/session/logout":
            sid, s = self._session()
            if sid:
                with SESSIONS_LOCK:
                    SESSIONS.pop(sid, None)
                audit("logout", sid, "-", "ok")
            self.send_response(200)
            self.send_header("Set-Cookie", "gg_legacy_sid=; Path=/; Max-Age=0")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return

        if u.path == API_PREFIX + "/client-report":
            body = self._body() or {}
            report = str(body.get("report", ""))[:2000]
            ua = str(self.headers.get("User-Agent", ""))[:160]
            audit("client_report", body.get("session"), "%s | %s" % (report, ua), "reported")
            return self._json(200, {"ok": True})

        if u.path == API_PREFIX + "/client-error":
            body = self._body() or {}
            msg = str(body.get("message", ""))[:400]
            src = str(body.get("source", ""))[:120]
            steps = str(body.get("steps", ""))[:200]
            ua = str(self.headers.get("User-Agent", ""))[:160]
            audit("client_error", body.get("session"), "%s | %s | %s | %s" % (msg, src, steps, ua), "reported")
            return self._json(200, {"ok": True})

        if u.path == API_PREFIX + "/genie/chat":
            sid, s = self._session()
            if not s:
                return self._err(401, "not authenticated")
            body = self._body()
            msg = (body or {}).get("message", "").strip()
            if not msg:
                return self._err(400, "message required")
            now = time.time()
            hist = CHAT_HISTORY.setdefault(sid, [])
            hist[:] = [t for t in hist if now - t < 60]
            if len(hist) >= CHAT_LIMIT:
                audit("genie_chat", sid, msg[:80], "rate_limited")
                return self._err(429, "rate limit: %d messages/minute" % CHAT_LIMIT)
            hist.append(now)
            try:
                reply = llm_chat(sid, msg)
            except Exception as e:                      # noqa: BLE001
                audit("genie_chat", sid, msg[:80], "error:%s" % type(e).__name__)
                return self._err(502, "Genie unavailable")
            audit("genie_chat", sid, msg[:80], "ok")
            return self._json(200, {"ok": True, "reply": reply})

        return self._err(404, "no route")


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True
    tls = False

    def get_request(self):
        """Surface TLS handshake failures instead of swallowing them: without this
        a legacy client that cannot negotiate simply looks like 'cannot connect'."""
        try:
            return super().get_request()
        except ssl.SSLError as e:
            # Peek at what actually arrived: a plaintext request, a TLS record, or nothing.
            try:
                conn, addr = self.socket.accept()
                conn.settimeout(1.0)
                head = conn.recv(24)
                conn.close()
                if head:
                    printable = "".join(chr(b) if 32 <= b < 127 else "." for b in head)
                    kind = "PLAINTEXT-HTTP" if head[:4] in (b"GET ", b"HEAD", b"POST") else (
                           "TLS-RECORD" if head[:1] == b"\x16" else "OTHER")
                    sys.stderr.write("  rejected %s on TLS port: %r (%s)\n" % (kind, printable, kind))
                    audit("tls_reject", None, "%s %r" % (kind, printable), "failed")
                else:
                    sys.stderr.write("  rejected: client closed before sending\n")
            except OSError:
                pass
            peer = "-"
            try:
                peer = "%s" % (self.socket.getsockname(),)
            except OSError:
                pass
            audit("tls_handshake", None, "%s: %s" % (e.__class__.__name__, e.reason), "failed")
            sys.stderr.write("TLS handshake failed from %s: %s\n" % (peer, e.reason or e))
            raise


def main():
    ap = argparse.ArgumentParser(description="Golden Gate Legacy Companion")
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8088)
    ap.add_argument("--tls-cert")
    ap.add_argument("--tls-key")
    args = ap.parse_args()

    httpd = Server((args.host, args.port), Handler)
    scheme = "http"
    if args.tls_cert and args.tls_key:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(args.tls_cert, args.tls_key)
        # TLS floor: 1.2 by default. iOS 9's bundled OpenSSL 0.9.8zg only speaks
        # TLS 1.0, so legacy on-device tooling needs GG_TLS_MIN=1.0. Safari 9 uses
        # SecureTransport and negotiates TLS 1.2 regardless.
        want = os.environ.get("GG_TLS_MIN", "1.2")
        floor = {"1.0": ssl.TLSVersion.TLSv1,
                 "1.1": ssl.TLSVersion.TLSv1_1,
                 "1.2": ssl.TLSVersion.TLSv1_2}.get(want, ssl.TLSVersion.TLSv1_2)
        ctx.minimum_version = floor
        ctx.options |= getattr(ssl, "OP_NO_COMPRESSION", 0)
        httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)
        httpd.tls = True
        scheme = "https"

    audit("start", None, "%s://%s:%d" % (scheme, args.host, args.port), "ok")
    print("Golden Gate Legacy Companion %s" % VERSION)
    print("  frontend : %s://<host>:%d/ipad/legacy/" % (scheme, args.port))
    print("  api      : %s://<host>:%d%s/" % (scheme, args.port, API_PREFIX))
    print("  upstream : %s   (read-only allowlist, %d datasets)" % (UPSTREAM, len(ALLOWED_GET)))
    print("  audit    : %s" % AUDIT)
    if not httpd.tls:
        print("  security : PLAIN HTTP — read-only LAN mode%s"
              % ("; credential login ALLOWED (opt-in)" if ALLOW_INSECURE_LOGIN
                 else "; credential login DISABLED (set GG_ALLOW_INSECURE_LOGIN=1 to permit)"))
    print("  mode     : %s" % ("TLS (min %s)" % os.environ.get("GG_TLS_MIN", "1.2")
                                  if httpd.tls else "HTTP (isolated LAN only)"))
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        audit("stop", None, "signal", "ok")
        httpd.server_close()


if __name__ == "__main__":
    main()
