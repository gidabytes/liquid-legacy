# Changelog

## v2.28.0 — 2026-11-01 — on-device A5 launch pass

Measured on the physical iPad 2 (A1395, iOS 9.3.5, Safari 9), before/after:

| Metric | 2.27.2 | 2.28.0 |
|---|---|---|
| warm launch, load event | 1360 ms | 91 ms |
| warm launch -> Home painted | ~1360 ms | 284 ms |
| static asset requests per warm launch | 15 | 0 |
| DOM nodes at boot | 592 | 358 |

Companion:

- Assets on a `?v=<build>` URL are now `public, max-age=31536000, immutable`;
  HTML stays `no-store` so a build bump is still picked up.
- `ETag` + `304 Not Modified` for unversioned static requests.
- gzip for text assets when the client offers it (`legacy.js` 200 KB -> 48 KB).
- Fixed a latent `UnboundLocalError` in `/summary` when no session cookie was
  present (contacted after restarting the service).
- Tests grew 25 -> 31 assertions, including cache, 304 and gzip gates.

Frontend:

- Every icon URL carries `?v=BUILD`, so the iPad's disk cache applies to images too.
- Icons re-encoded from 160x160 16-bit RGBA to 128x128 8-bit: ~1.8 MB less decoded
  image memory at the 66 px display size used on the iPad.
- App Library, widgets and dashboard are rendered by `setPage()` on first view
  instead of during boot (DOM 592 -> 358 nodes).
- The 10 s poll only re-renders widgets while Home page 1 is visible.
- Blur was measured and is not a bottleneck: 58-59 fps at 0/7/12 px on the A5.

## v2.27.2 — 2026-11-01

First standalone package for the iPad 2: auto read-only session, demo data,
Liquid Glass surfaces, Dock, widgets, dashboard, built-in apps. Default port 8090.
