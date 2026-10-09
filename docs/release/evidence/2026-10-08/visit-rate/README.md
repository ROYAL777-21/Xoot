# Visit and Rating source comparison

This is **isolated component QA**, with synthetic booking/authentication adapters outside
the product source. The original handoff screenshots contain its example records. Neither
set establishes a real customer, payment, live ETA, hosted review save or native app run.
Independent review on 9 October identified two required corrections, subsequently
verified in [fix round 1](../../2026-10-09/visit-rate-fix1/README.md). Migration/function
delivery is still pending.

The implementation uses the actual `BookingDetail`, `RateVisit` and `AppShell` components.
The reference uses unmodified `xoot/app/Visits.jsx`, `Frame.jsx`, `ds-bundle.js` and styles.
The phone's device chrome is omitted. Its comparison wrapper adds 12px above the original
TopBar; the web shell uses its existing 22px top inset. This wrapper difference is not a
claim of pixel-identical complete screens.

| State | Original handoff | Implementation |
|---|---|---|
| Visit detail | [Reference](reference-visit-390.png) | [Viewport](implemented-visit-390.png), [full page](implemented-visit-390-full.png) |
| Rating unselected | [Reference](reference-rate-unselected-390.png) | [Implementation](implemented-rate-unselected-390.png) |
| Five stars selected | [Reference](reference-rate-five-390.png) | [Viewport](implemented-rate-five-390.png), [full page](implemented-rate-five-390-full.png) |

The source font, flower geometry/palette, service icon, warm surfaces, card geometry,
checklist, star controls and tip/rebook card order are retained. The source palette named
`red` actually resolves to violet petals with a honey centre; the implementation uses those
actual values. Optional written feedback opens below the original cards.

Runtime facts replace prototype claims: recorded schedule instead of a twelve-minute ETA;
the actual helper fields instead of invented badges; stored service, fees and payments
instead of sample charges; a saved overall rating instead of fabricated quality/punctuality
ratings; unavailable tips; and a new booking link instead of an automatic repeat booking.
Crew routing/reviews and provider-dependent features remain unfinished.

[Browser measurements](browser-evidence.json) cover 320, 390, 768, 1024, 1440 and 1920 CSS
pixels, 844×390 landscape, 390 at device scale3, and a 720×500/device-scale2 equivalent of
1440×1000 at 200% zoom. The latter is emulated reflow, not physical-browser zoom evidence.
All 27 screen states had loaded fonts, meaningful content, no page/console errors, no
horizontal overflow and no heading transform/filter. At each size, zero initial stars
kept Save disabled; selecting five stars sent one save request, showed a recorded review
and returned to Visit. Missing-booking and unavailable crew-rating states also passed.
The fixture separately verifies R332 stored service, R39 fee and R371 recorded payment;
it is a historical solo example, not the approved R393 two-Xooter quote.

Browser plugin/skill was not available, so the installed repository Playwright was used.
No new browser dependencies or native server were started. These checks do not establish
database concurrency, full route/provider integration, staging role permissions or a paid
production journey. The [production checklist](../../../production-checklist.md) remains
the launch register.

## Frozen source checks

The final source snapshot is Git tree `7312319fbe03bae5a2030fb81ddeadb6598ad0e7`, based on
commit `14cc5d5c7154f1fcba4851926c0bd06f322fa0c9`. It is an uncommitted review snapshot, not
a deployment. The immutable review package is 195,346 bytes with SHA-256
`90217EFE22F74B5EB32085DEE42D969B7DE671918D4B13CF244AEA4320FFD3CE`.

The 8 October full regression run, read back on 9 October, passed **157 files / 1,633
tests**, with seven existing SQL-runtime skips. Focused implementation checks covered
144 tests; the final avatar correction reran its 27 affected tests (not additional to
the aggregate count). Web types and lint passed. The isolated review SQL passed 40
assertion groups, including duplicate-refusal preservation, immutable retry, eligibility,
category fields remaining NULL and client permission denials. It explicitly does not
prove independent concurrent sessions.

The staging build and actual rendered artifact check passed against the real empty
staging directory. This checks public startup, not a hosted authenticated rating save.
The build stamp still says the base commit because the work is uncommitted. Existing
large-chunk and unset native-association warnings remain. Fresh 9 October artifact and
secret/critical-write/unsafe-DOM/static-header scans passed. Independent spec/quality
review and Codex Security patch-risk assessment recommend **revise**: restore native
sharing and the booking link, and make actual low-rating queue persistence atomic with
observable failures. [Fix round 1](../../2026-10-09/visit-rate-fix1/README.md) subsequently
passed scoped re-review and affected tests/browser checks. The preceding counts and screenshots
describe the frozen pre-fix source; they do not verify future amendments. None of these
checks grants production approval or establishes the full handoff deliverable.
