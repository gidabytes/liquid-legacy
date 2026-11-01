#!/usr/bin/env python3
"""Measure Golden Gate's runtime cost in a real WebKit engine (WebKitGTK).

Reports navigation timing, DOM size, forced-layout cost, a JS loop baseline and
the latency of opening three app windows. Synchronous on purpose: WebKitGTK's
evaluate_javascript returns JS values directly, it does not await Promises.

Usage: python3 tests/perf-probe.py [url]
Requires the dev harness (stub upstream + companion on :8096).
"""
import gi, json, sys
gi.require_version('Gtk', '3.0'); gi.require_version('WebKit2', '4.1')
from gi.repository import Gtk, WebKit2, GLib

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8096/ipad/legacy/?unlock=1#/home"
JS = r"""
(function(){
  var nav = performance.timing, t, i, n, w0;
  var dom = document.getElementsByTagName('*').length;
  var app = document.getElementById('app');
  t = performance.now();
  for (i = 0; i < 2000; i++) { n = app.offsetWidth; }
  var layoutMs = performance.now() - t;
  t = performance.now();
  n = 0;
  for (i = 0; i < 200000; i++) { n = (n + i) % 7; }
  var loopMs = performance.now() - t;
  w0 = performance.now();
  GGWM.open('gids'); GGWM.open('alerts'); GGWM.open('status');
  var openMs = performance.now() - w0;
  var domOpen = document.getElementsByTagName('*').length;
  GGWM.close('status'); GGWM.close('alerts'); GGWM.close('gids');
  return JSON.stringify({
    navStartToLoad: nav.loadEventEnd - nav.navigationStart,
    domNodes: dom,
    forcedLayout200: Math.round(layoutMs * 100) / 100,
    jsLoop2000: Math.round(loopMs * 100) / 100,
    openThreeWindowsMs: Math.round(openMs * 100) / 100,
    domNodesWith3Windows: domOpen,
    viewport: [innerWidth, innerHeight],
    dpr: devicePixelRatio
  });
})()
"""
win = Gtk.Window(); win.set_default_size(1024, 768)
view = WebKit2.WebView(); win.add(view); win.show_all()
out = {}

def done(v, res, ud=None):
    try:
        val = v.evaluate_javascript_finish(res)
        out["r"] = val.get_js_value().to_string() if hasattr(val, 'get_js_value') else val.to_string()
    except Exception as exc:
        out["r"] = json.dumps({"error": str(exc)})
    Gtk.main_quit()

def on_load(v, ev):
    if ev == WebKit2.LoadEvent.FINISHED:
        GLib.timeout_add(1800, lambda: (v.evaluate_javascript(JS, -1, None, None, None, done, None), False)[1])

view.connect('load-changed', on_load)
view.load_uri(URL)
GLib.timeout_add(40000, lambda: (Gtk.main_quit(), False)[1])
Gtk.main()
print(out.get("r"))
