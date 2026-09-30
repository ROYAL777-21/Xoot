# Customer Home and navigation — 30 September

Visual source: `design/handoff-2026-09-03/xoot/app/Frame.jsx`, `Today.jsx`,
`app/data.js` and the matching primitives in `ds-bundle.js`.

- [Implemented Home, 390 pixels](implemented-returning-390x844.png)
- [Implemented Home, 1440 pixels](implemented-returning-1440x1000.png)
- [New-customer Home, 320 pixels](implemented-new-320x844.png)
- [Original Today reference](reference-today-390.png)
- First-visit booking card: [original](reference-new-bar.png), [implemented](implemented-new-bar.png)
- Returning booking card: [original](reference-returning-bar.png), [implemented](implemented-returning-bar.png)
- [Viewport measurements](evidence.json)

The real Today, AppShell, search and notification components were rendered in Chromium using
**isolated synthetic account records**. Test adapters replace authentication, database and wallet
inputs only in the temporary harness. Those fixtures do not ship. Most destination routes are
stubs; these images do not prove authenticated production behaviour or payment fulfilment.
The original reference includes prototype gifts, helpers and notifications that are not
fabricated in the application. Different account content is deliberate; the source composition,
fonts, colours, icons, spacing and card geometry are preserved.

Seven viewport checks passed: 320×844, 390×844, 768×844, 1024×844, 1440×1000, 1920×1080
and 844×390 landscape. No horizontal document overflow, page/console errors or framework error
overlay was observed. Newsreader loaded at the original 36px heading size; heading and dock
have no persistent transform. Reduced motion was enabled.

The browser checks use native keyboard input for the date strip, search focus containment,
Escape/restoration, the second search result and the Concierge action with Enter and Space.
Search transfers the exact unsent question to the actual Concierge context. Historical days
keep readable visits and offer no misleading date-specific booking action. Weekly entry and
retryable read errors are also checked. Actual Care+ loading, unavailable and populated branches
retain a usable Home return control in component integration tests.

On 1 October, independent scoped review passed after three repairs: secondary-page navigation,
historical booking actions and keyboard search activation. Four focused suites pass 28 tests;
the earlier booking/helper suites also passed. The aggregate writer scan's TSX-test-fixture
false positive was fixed separately and reviewed, with 18 covering checks passing.

Final web verification on 1 October: 139 test files, 1,409 passing tests and seven existing
skips; full lint and typecheck passed. The explicit production-configured build, rendered
homepage/sign-in artifact check, artifact scan and repository security guards passed. The
[DOMPurify advisory](https://github.com/advisories/GHSA-p98j-92pf-mc4p) found by the fresh
dependency audit was addressed with 3.4.16 in both npm and Bun resolutions. The sanitizer checks,
lockfile validation and scoped dependency review passed; the website npm audit reports zero
vulnerabilities. This local verification does not promote a release or verify live account flows.

This is a bounded Home/navigation implementation. Full Profile and Notifications source ports,
same-helper rebooking, verified benefits/task progress, crew fulfilment, authenticated staging
journeys and native rendering remain unfinished. The parent evidence folder contains separate
actual hosted homepage/sign-in captures.
