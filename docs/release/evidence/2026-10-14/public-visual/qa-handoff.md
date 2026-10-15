# Public website visual QA — 14 October 2026

Source: `6056b6f1e6aa531a0f3ec3b49281fcf4b27d218a`, tree
`fe43c0e370d1181eebe7633cac1989361247fb66`, unchanged from the reviewed package.
The local staging-configured artifact reports this commit in `dist/build-info.json`.
Website `http://localhost:5173/`; untouched original HTML `http://localhost:5174/Xoot%20Website.dc.html`.
No hosted or native deployment. No synthetic backend responses or signed-in accounts.

## Completed verification

- `aggregate-serial.log`: 165 files, 1,749 tests passed, seven existing SQL-runtime skips,
  terminal exit 0, 269.20 seconds. Same tests/assertions/deadlines as the two-worker run.
  `history-timeouts-focused.log`: both previously timed-out files, 55 tests, exit 0.
  `aggregate-complete.log` retains the previous two 5-second timeouts (not assertion failures).
- `checks-complete.log`: global typecheck, lint, lockfile validation and four source scans exit 0.
- `build-complete.log`: staging build, rendered artifact smoke and artifact scan exit 0.
  Rendered smoke uses the actual configured public origin and backend: zero approved Xooters.
  Existing vendor-chunk warning and missing mobile association signing IDs remain recorded.
- `responsive-metrics.json`: seven normal viewports (320×800, 390×844, 768×1024,
  1024×768, 1440×1000, 1920×1080, 844×390), zero root/document horizontal overflow,
  zero framework overlays or console/page errors, exactly one visible navbar Book now,
  no extra Book. Six real Journal cards and the shared Trust composition render throughout.
- Original source screenshots and revised screenshots match the supplied Newsreader sizing:
  section titles 32/32/32/34.816/46/46/32px at the seven widths; article titles 20–25px.
  Heading transforms/filters are none. Source Trust two-column explanation/three-column desktop
  cards and Journal six-card grid reflow naturally. Availability wording and actual registry
  content intentionally replace unverified operational claims and prototype records.
- `interactions.json`: all 21 checks pass, zero console/page errors. Enter opens mobile menu;
  Sign in remains available; Escape closes; retained Book now opens the actual Book a visit
  dialog; Space toggles the clearly labelled explanation; Enter changes all five stages.
  Both Trust routes work. All 29 published articles appear; keyboard opens an article,
  refresh/canonical metadata, read-next, both legacy aliases, noindex unknown-slug recovery
  and return to actual index work. The URL changes before React mounts the index: observed
  zero initial cards, 29 settled cards after 72ms. The corrected probe waits for the visible
  list rather than treating URL change as completed rendering. Prior observation retained.
- `density-motion.json` and `.log`: five additional records, exit 0. Desktop/phone DPR2,
  normal/reduced motion, original SVG scene bounds, text transforms/filters and hover cleanup
  checked. Desktop character positions have no copy overlap; all painted shapes fit the
  preserved SVG viewBox. Five characters show at <=880px; three How figures are intentionally
  `display:none` under the existing responsive rule. Their zero DOM boxes are hidden, not
  clipping. Eight characters show at desktop sizes. Original hero WebP is 1792×2400, painted
  at about 585 CSS pixels; naturalWidth in the browser is srcset density-corrected.

## Screenshot handling and inspection

Use `verified-*.png`, `after-home-*.png`, `after-article-*.png`, `after-mobile-menu.png`
and `after-trust-keyboard.png`. Parent inspected desktop hero, Trust, Journal, character
band and mobile Trust, as well as the original source composition. Source captures are
`reference-*.png`. Full section captures retain width but temporarily enlarge viewport
height and use a viewport clip after scrolling the actual `#root` container. Normal-size
geometry is measured after restoring the intended viewport.

Earlier `after-trust-*`, `after-articles-*`, `after-people-*`, `after-how-*` and
`after-closing-*` element captures are invalid evidence: locator screenshots mis-scrolled
the nested root. Exclude them. `after-trust-viewport-1440.png` is a valid partial viewport.
One initial seven-navigation batch timed out on the final cold load and did not return
metrics; six captures were inspected and rejected for the scroll issue. A fresh single-load
responsive pass and the installed-runner repeat completed. No source changes were made.

The in-app connection had failed with a browser policy error. Playwright MCP provided the
reference/capture path; after tool availability changed, the repository's installed Playwright
runner completed durable verification. Its first attempt found the owned local server absent
(`ERR_CONNECTION_REFUSED`, confirmed no listener/process), then the same server was restarted
and the same runner completed. Those diagnostic logs remain. No test process was restarted
merely for an observation timeout, and no native startup was attempted.

## Boundaries

This is bounded public visual/routing evidence, not the complete website/app or paid release.
Actual browser-menu zoom, physical high-density devices, native screens, authenticated actor
journeys, provider services, production schema/function delivery and final company-wide
review remain part of the full plan. Source callback guards and explainers do not prove them.
Untouched publication claims elsewhere (for example closing booking copy and the older
`pricingRule` build-info label) still need the final company-wide consistency pass.
