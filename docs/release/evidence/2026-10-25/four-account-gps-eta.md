# Four-account staging GPS/ETA — actual acceptance

Four founder-authorised aliases in a single Gmail inbox completed genuine normal Auth sign-in
using owner-entered codes. No code, token or password was logged or saved to disk.
[Structured evidence](four-account-gps-eta.json) records the six passing groups.

The run exercised no-auth/outsider denial, worker/customer binding, consent/accuracy/stale/replay
rejection, fresh no-store private GPS, a real Mapbox road ETA from synthetic public inputs,
and STOP revocation without disturbing the other customer. It did not run admin AAL1/AAL2,
physical-device GPS/permission/background tests, encrypted chat or a real call.

Disposable fixture creation was checked inside BEGIN/ROLLBACK before committing in named staging.
The synthetic worker rows were not real verification/availability evidence. After the helper stopped,
the reviewed cleanup SQL was also rolled back before committing. Exact ownership/marker/dependency
guards were preserved. Readback found zero fixture bookings, jobs, workers, locations and messages.

The observed run had six groups. A later combined-chat attempt did not publish any chat devices
or messages, so no live chat result is claimed. The original helper's 45-minute lifetime expired and
cleared its in-memory sessions. A new run requires fresh ordinary sign-ins.

The new encrypted-chat module uses the actual WebCrypto library and only public test keys through
ordinary RLS; it is prepared for two-way send/read/decrypt, outsider denial and plaintext rejection.
Parent-owned device IDs make cleanup possible after child termination, and both device revocations
are attempted even if one fails. Independent 17/17 synthetic checks pass at 729a523. Three negative
controls reject child-only cleanup, first-failure cleanup and six-group GPS-only combined output.
These are guard evidence, not live encrypted-chat acceptance.

No production tracking, schema, role or verified worker approval changed. The
[production checklist](../../production-checklist.md) remains the launch authority.
