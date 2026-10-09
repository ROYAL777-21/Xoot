# Visit and Rating review corrections

9 October 2026. This records local corrections to the [original Visit/Rate
comparison](../../2026-10-08/visit-rate/README.md), not a deployed customer journey.

The reviewed base is tree `7312319fbe03bae5a2030fb81ddeadb6598ad0e7`. Correction
round 1 was frozen at tree `0d8857830ff13f5d5478b87bb13c952dabc2dbd1`, then committed
locally as `89d6fe31e010b26fdb54fa306f5d0c671a37b9e8`. It has not been deployed.
The immutable nine-file fix package has 53,453 bytes and SHA-256
`DF99121AE9C60A9FEBCAD18BF8B7A7CA20EB312E43A8F136BF0E30BC33FABAA8`.
Independent re-review passed both findings with no new breakage. Spec compliance and
quality are approved for this bounded fix; the validated patch-risk assessment is
`merge / human_review_required`, not whole-branch or production approval. No layout
or stylesheet changed in this round.

Visit sharing again dispatches the supported native action and includes the actual
booking route. It distinguishes a browser share, copied link, requested native
options, cancellation and unavailable sharing. It includes no invented ETA or address.

Low-rating routing uses the additive `20261009090000_atomic_visit_review_followup.sql`
service-only transaction. It checks the verified owner and saved rating, locks the
review, reuses existing routing without changing its status, and rolls both required
inserts back on failure. The immutable rating remains saved even when support routing
fails. The client shows that failure and retains the support link.

| Check | Result and scope |
|---|---|
| Focused component/native/actual Edge handler tests | 4 files, 56 tests pass. Transport is isolated in handler tests. |
| Final aggregate regression | 158 files / 1,656 tests pass, with seven existing SQL-runtime skips. The separate SQL execution below is not skipped. |
| Real migration execution in isolated PGlite | 67 groups pass: original 40 plus 27 follow-up assertions, including both insert failures, rollback, retry, partial legacy routing, unchanged opinions/statuses and client execution denial. No independent connections. |
| Web type checking and lint | Pass on the frozen correction. |
| Explicit staging build and rendered artifact | Pass; actual empty staging directory, meaningful homepage and sign-in controls render without runtime errors. This does not verify authenticated review saving. |
| Security and built-artifact scans | Pass; no obvious committed secrets, critical client writes, unsafe DOM execution or static-header failures detected. |
| Browser sharing | Native bridge spy, Web Share spy, clipboard and cancelled share pass at 390px. Each successful path retains the real booking route; cancelled sharing claims no success. |
| Browser follow-up failure | Failed and unconfirmed routing at 390/1440px preserve the saved rating and support link, with one save and one follow-up request each. |
| Browser health | Meaningful content, expected route/title, loaded fonts, no framework overlay, page/console error or horizontal overflow. |

[Browser evidence](evidence.json) comes from actual `BookingDetail`, `RateVisit` and
`AppShell` components with synthetic adapters outside product source. The repository's
installed Playwright was used because the Browser skill was unavailable. These are
browser bridge spies, not installed native devices or hosted support records.

The command was `node ../../outputs/run-visit-rate-fix1-20261009.mjs`. Screenshots:
[saved rating with failed follow-up](followup-error-390.png),
[copied visit link](share-clipboard-390.png). Test helpers and records are not runtime
application paths.

Build validation used explicit staging configuration, followed by
`npm run ops:smoke:rendered:artifact`, `npm run build:artifact-scan` and
`npm run security:scan`. Existing large-chunk and missing native-association settings
warnings remain. The base commit in build metadata is not the identity of this
then-uncommitted source snapshot. The first aggregate process stopped without a final
result; after confirming its handle and processes were gone, a fresh run completed with
exit 0. The incomplete run is retained and is not counted as passing evidence.

Delivery order remains review-save migration, atomic follow-up migration, authenticated
review function and updated `ops-workflow`, then client. Hosted access/migration checks,
independent PostgreSQL concurrency, provider/device proof, complete crew reviews and
remaining handoff screens are still open in the [production checklist](../../../production-checklist.md).
