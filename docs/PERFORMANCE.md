# Golden Gate — performance baseline

Measured on the development harness (stub upstream, anonymous session),
WebKitGTK, 1024×768, dpr 1, build v2.7.4.

Reproduce:

```bash
cd ~/Projects/genie-golden-gate/ipad/companion
python3 tests/stub_upstream.py &                                   # :8097
GG_UPSTREAM=http://127.0.0.1:8097 GG_DEV_ANON=1 GG_DEV_TOKEN=stub-token-123 \
  python3 gg_legacy_companion.py --host 127.0.0.1 --port 8096 &     # :8096
DISPLAY=:0 python3 tests/perf-probe.py
```

| Metric | Value | Notes |
|---|---|---|
| navigationStart → loadEventEnd | **168 ms** | local harness, no network |
| DOM nodes (home) | **315** | whole app shell, not just home |
| DOM nodes with 3 windows open | **425** | +110 for three frames |
| 2 000 forced layout reads | **36 ms** | ~0.018 ms per read |
| 200 000 loop iterations | **1 ms** | performance.now resolution clamps below this |
| open three windows | **8 ms** | engine cost, before paint |
| front-end payload | 10.6 KB HTML · 60 KB JS · 51 KB CSS | no framework, no bundler |

## Reading these numbers

- The app is a single document with one poll; there is no virtual DOM or render loop,
  so idle cost is one XHR per interval (5–60 s, paused when the tab is hidden).
- Window opening is cheap because it moves an existing DOM subtree instead of
  rebuilding it — the 110-node delta is chrome only (frame, bar, grip).
- WebKitGTK clamps `performance.now()` to 1 ms, so the loop and layout figures are
  upper bounds of resolution rather than precise timings; the 36 ms layout figure is
  above the clamp and therefore meaningful.
- These are desktop numbers. The iPad 2 is an A5; the ES5 build, the absence of
  `backdrop-filter` and the single-poll design are what keep it usable there. Device
  timings require the iPad itself and are not claimed here.

## Visual regression

```bash
tests/visual-regression.sh capture   # write docs/assets/baseline/*
tests/visual-regression.sh compare   # capture + diff, exit 1 on static drift > 0.2 %
```

Surfaces: home (dark/light), app library, lock, settings, Control Centre, Notification
Centre, Exposé, windows. The status bar is cropped before diffing so a clock minute is
not a regression. Live-value surfaces (settings, notifications) are informational.

## On-device note (iPad 2, iOS 9.3.5)

Measured live in the device engine: the iPhone-class WebKit here supports the **prefixed**
`-webkit-backdrop-filter` (unprefixed absent), so glass on the iPad is real blur, not a
simulation. That is a GPU cost on an A5, so `body.ios9` caps the radii:

| Surface | Desktop / modern | iPad 2 (`body.ios9`) |
|---|---|---|
| dock, AssistiveTouch | 24 px | 12 px |
| cards, widgets, sheets, windows | 18 px | 7 px |
| status bar, nav bar, composer | 14 px | 5 px |

Frame cost on the device could not be measured — WebKit 601 exposes no frame-timing API to
the page — so these caps are a deliberate conservative budget, not a measured optimum. If
the device feels heavy while scrolling the dock, lower `#dock` to 8 px or drop the blur for
that element only.

## Re-measured after Phases 2–9 (build 2.19.1, WebKitGTK 1024×768, dev instance)

| Metric | Before expansion | Now |
|---|---|---|
| Navigation start → load | 168 ms | **238 ms** |
| DOM nodes (Home) | 315–425 | **599** |
| DOM nodes with 3 windows | 425 | **719** |
| 2000 forced layout reads | 36 ms | 0–1 ms (cached) |
| 2000-iteration JS loop | — | 1 ms |
| Open 3 windows | 8 ms | **10 ms** |

Growth is expected: 4 Home pages, 50 registry entries, 5 apps, widget engine and dashboard.
Payload: legacy.js ~170 KB, legacy.css ~85 KB, HTML ~14 KB.
The iPad 2 profile keeps blur radii capped and no per-frame work runs outside the 1 s clock
ticker and the existing poll backoff.

## On-device optimization pass — build 2.28.0 (iPad 2, iOS 9.3.5)

Measured on the physical iPad 2 (A1395, A5, Safari 9 / WebKit 601.1.46, 1024×671
Safari viewport, dpr 1) with `scripts/device-bench.sh`, which opens
`ipad/legacy/legacy-bench.html` in the device engine and reads each stage back from
the companion audit log. "Load" is `performance.timing.loadEventEnd`; "ready" is the
first moment Home is actually painted, which is after the async session check.

| Metric | 2.27.2 before | 2.28.0 after |
|---|---|---|
| warm launch, load event | **1360 ms** | **91 ms** |
| warm launch → Home visible | ~1360 ms (load) | **284 ms** |
| first launch of a new build, load | 1382–1556 ms | **731 ms** |
| static asset requests per warm launch | 15 (JS, CSS, 13 icons) | **0** (HTML + API only) |
| CSS fetch | 359–932 ms | 68 ms (cached) |
| JS compile (200 KB ES5) | 32–43 ms | 33 ms |
| CSS parse + first layout | 47–52 ms | 52 ms |
| DOM nodes at boot | 592 | **358** |
| icon payload | 81 KB · 160×160 @16-bit | **45 KB · 128×128 @8-bit** |
| compositor, 0/7/12 px backdrop blur | 58.6–59.4 fps | 58.0–59.5 fps |
| icon decode, 13 icons | 96 ms | 84 ms |

What changed:

1. **Companion caching** (`gg_legacy_companion.py`). HTML stays `no-store` so a
   build bump is picked up on the next launch. Any asset on a `?v=<build>` URL is
   now `public, max-age=31536000, immutable`; unversioned assets revalidate with an
   `ETag`/`304`. Text assets are gzipped (200 KB JS → 48 KB). Before this, every
   launch re-downloaded the whole bundle because `no-cache` + no `304` support
   re-fetched 200 + 100 + 81 KB.
2. **Versioned icon URLs** (`?v=<build>` in the registry and the static dock), so the
   iPad's disk cache actually applies to every image.
3. **Lazy page rendering**: pages 1–3 (widgets, App Library, dashboard) render when
   first shown instead of during boot. This removed 50 library tiles and five
   widget bodies from every launch (592 → 358 DOM nodes).
4. **No widget re-render while on page 0**: the 10 s poll rebuilt five widget bodies
   even though that page was hidden. Widgets now render on `setPage(1)` from the
   freshest poll data.
5. **Smaller icons**: 160×160 16-bit RGBA → 128×128 8-bit (displayed at 66 px max
   on iPad 2). Saves ~1.8 MB of decoded image memory on a 512 MB device; the visual
   diff is below the capture threshold.

What was *not* worth changing, per measurement:

- **Blur radii.** A moving 564×72 glass surface at 12 px blur holds 58–59 fps on the
  A5, identical to no blur. The `body.ios9` caps stay as a conservative budget but
  are not the bottleneck.
- **Bundle minification.** Compile is 33 ms of a 284 ms warm launch and the file is
  gzipped; readability is worth more.

Remaining costs, honestly:

- CSS parse is still **52 ms** of the warm launch (100 KB stylesheet, A5). A
  critical/deferred split would recover perhaps 20–25 ms at the cost of cascade
  risk; not done.
- TTFB for the uncached HTML is 11–426 ms depending on Wi-Fi/TLS state; this is the
  A5's TLS handshake, not the app.
- Warm-launch numbers vary ±100 ms with Wi-Fi power-save; the "0 static requests"
  evidence is deterministic, the millisecond figures are not.

Reproduce:

```bash
scripts/device-bench.sh                 # current build, iPad at 192.168.31.228
scripts/device-bench.sh 2.28.0 120      # explicit build tag / timeout
journalctl --user -u gg-legacy-companion.service --since -2min   # per-request view
```

Device evidence for the final deploy: one HTML request, one `/session`, then
`/summary` polls only — no JS/CSS/icon requests — and no `client_error` entries.
