#!/usr/bin/env python3
"""Capture a screenshot of a URL in WebKitGTK (the closest stand-in for iOS 9 Safari).

Usage: xvfb-run -s '-screen 0 1280x1200x24' webkit-capture.py <url> <out.png> [w] [h] [wait_ms] [condition_js]

The page renders in a real WebKit engine inside an **ephemeral** context (no
disk cache, no localStorage from earlier runs), then the mapped window is read
back from the X server. An optional condition expression is polled every 300 ms
and the capture happens only once it is truthy (or the budget runs out) — e.g.
`document.body.className.indexOf(' light ') >= 0` for the light appearance, so a
slow session check cannot produce a wrong-theme capture.

Prefer `xvfb-run` over the live display: reading an obscured window returns
stale pixels. WebKit2.WebView.get_snapshot() can drop text paint on some builds
(observed here: Home labels painted dark in the snapshot but white in the
window), so this tool reads the window instead. Chromium alone is not evidence
for the device engine.
"""
import sys

import gi

gi.require_version("Gtk", "3.0")
gi.require_version("WebKit2", "4.1")
gi.require_version("Gdk", "3.0")
from gi.repository import Gtk, WebKit2, GLib, Gdk  # noqa: E402

URL = sys.argv[1]
OUT = sys.argv[2]
W = int(sys.argv[3]) if len(sys.argv) > 3 else 1024
H = int(sys.argv[4]) if len(sys.argv) > 4 else 768
WAIT = int(sys.argv[5]) if len(sys.argv) > 5 else 3000
COND = sys.argv[6] if len(sys.argv) > 6 else ""

BUDGET_MS = WAIT + 12000
state = {"shot": False, "ready_at": None}


def finish():
    Gtk.main_quit()


def grab():
    window = win.get_window()
    if not window:
        print("no mapped window")
        finish()
        return False
    pixbuf = Gdk.pixbuf_get_from_window(window, 0, 0, window.get_width(), window.get_height())
    if pixbuf:
        pixbuf.savev(OUT, "png", [], [])
        state["shot"] = True
        print("captured %s %sx%s at %sms" % (OUT, window.get_width(), window.get_height(),
                                             state["ready_at"]))
    else:
        print("pixbuf capture failed")
    finish()
    return False


def cond_ok(value, res, ud=None):
    ok = False
    try:
        ok = value.evaluate_javascript_finish(res).to_boolean()
    except Exception:  # noqa: BLE001 - a failed probe must not abort the capture
        ok = False
    elapsed = int((GLib.get_monotonic_time() - t0) / 1000)
    if ok or elapsed > BUDGET_MS:
        state["ready_at"] = elapsed
        grab()
        return False
    GLib.timeout_add(300, poll)
    return False


def poll():
    view.evaluate_javascript(COND or "1", -1, None, None, None, cond_ok, None)
    return False


win = Gtk.Window()
win.set_default_size(W, H)
win.move(0, 0)
context = WebKit2.WebContext.new_ephemeral()
view = WebKit2.WebView.new_with_context(context)
win.add(view)
win.show_all()
t0 = GLib.get_monotonic_time()


def on_load(webview, event):
    if event == WebKit2.LoadEvent.FINISHED:
        GLib.timeout_add(WAIT, poll)
    return False


view.connect("load-changed", on_load)
view.load_uri(URL)
GLib.timeout_add(BUDGET_MS + 15000, lambda: (finish(), False)[1])
Gtk.main()
sys.exit(0 if state["shot"] else 1)
