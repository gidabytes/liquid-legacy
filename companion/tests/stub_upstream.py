#!/usr/bin/env python3
"""Controlled stand-in for the CyberGate API, used to integration-test the
legacy companion without touching production credentials."""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TOKEN = "stub-token-123"
USER = {"username": "demo", "role": "viewer", "scopes": ["read"]}


class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _j(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def authed(self):
        return self.headers.get("Authorization") == "Bearer " + TOKEN

    def do_GET(self):
        if self.path == "/health":
            return self._j(200, {"status": "ok", "service": "stub-cybergate"})
        if not self.authed():
            return self._j(401, {"detail": "Not authenticated"})
        data = {
            "/api/v1/dashboard/summary": {"computers": 412, "online": 398, "alerts_open": 7},
            "/api/v1/aetg/summary": {"trusted": 388, "untrusted": 12, "pending": 12,
                                     "conflicts": 3, "relay_healthy": True},
            "/api/v1/alerts": {"items": [
                {"title": "Switch core-01 uplink flapping", "severity": "critical",
                 "created_at": "2026-11-01T10:20:00Z"},
                {"title": "Patch window missed on 12 endpoints", "severity": "warning",
                 "created_at": "2026-11-01T09:05:00Z"},
                {"title": "Collector lag > 5 min", "severity": "warning",
                 "created_at": "2026-11-01T08:47:00Z"}]},
            "/api/v1/alerts/summary": {"open": 7, "critical": 1},
            "/api/v1/collectors/status": {"items": [
                {"name": "dnac-collector", "state": "running", "lag_s": 12},
                {"name": "ise-collector", "state": "running", "lag_s": 4},
                {"name": "ad-collector", "state": "degraded", "lag_s": 310}]},
        }
        if self.path in data:
            return self._j(200, data[self.path])
        return self._j(404, {"detail": "not found"})

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        body = json.loads(self.rfile.read(n) or b"{}")
        if self.path == "/api/v1/auth/login":
            if body.get("username") == "demo" and body.get("password") == "demo":
                return self._j(200, {"access_token": TOKEN, "token_type": "bearer", "user": USER})
            return self._j(401, {"detail": "bad credentials"})
        return self._j(404, {"detail": "not found"})

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8097), H).serve_forever()
