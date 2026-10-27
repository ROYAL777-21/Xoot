# Address, private calendar and Rewards follow-up — 27 October 2026

Production is not cleared. The last verified live release remains e0c021e. This record
separates source checks, actual staging/provider observations and pending device/release work.

## Calendar copy and actual Google subscription

Source e720c3299fa393d9ce9e987c772b01911fd50418 fixes the founder's failed clipboard handoff.
The clipboard API's resolved promise is described as the browser's report, not proof that
the operating-system clipboard contains the link. A masked, read-only manual field can be
revealed/selected explicitly. Its capability is set only through the live input value property,
not an HTML value attribute, anchor, persistent storage, log or analytics event. Sentry block/
ignore selectors cover it; PostHog autocapture and recording remain disabled. Revocation and
account change remove/clear the field. Existing expectedSubject and delayed-digest guards remain.

Six focused tests passed independently and at root; TypeScript and scoped lint passed. Independent
reviewed component/test blobs were 2102463 / 96c01c8. This is source verification, not an OS
clipboard guarantee. The founder then privately replaced the link, copied it and reported calendar
added. The agent did not read the link, clipboard, email code or JWT, and hid the revealed field
after the handoff. The Google From URL public-sharing option stayed off.

Actual Google UI now shows Xoot visits selected and its disposable 27 October event at
10:00–12:00 SAST. The event is displayed as busy/Private rather than exposing its service title.
The feed logs show HTTP 200 and the subscription row records external fetches. Provider acceptance
is established by the visible imported event, not by a service-role feed read or forged Auth.
Screenshot: outputs/xoot-google-calendar-test-visit-20261026.png (captured in the 27 October
follow-up; its filename retained the earlier session date). No capability URL is visible.

Only labelled staging fixture 9c8ac396-5942-46a2-9d86-1bf72d705c48 was rescheduled to
27 October 11:00–13:00 SAST; database revision advanced 0→1. No payment request/row, worker/job
or actual service was created. Google reschedule/cancellation refresh is not yet observed.
Providers control refresh timing. Retain the fixture for that acceptance; cancel and clean it
after provider cancellation is observed. Never delete unrelated data or the Auth account.

The isolated local PostgreSQL container xoot-calendar-contract-20261026 was inspected for its
codex.task label and removed after contract/concurrency/negative-control checks. Other project
containers were left alone. Staging calendar schema and functions were not changed by this UI fix.

## Address recall and the unresolved private example

Reviewed source aa354fa (restored exactly after the bounded experiment by 4ede72e) asks for
ten address candidates and keeps ten through parsing and UI. A fixed Johannesburg point inside
the reviewed Gauteng polygon biases ranking; no bbox excludes other ZA addresses, and the Edge
server's IP is not treated as the customer's location. Twenty punctuation-separated alphanumeric
tokens are checked conservatively before an allowance is reserved. No automatic second call,
provider retry, shared-budget refill or Permanent quality relaxation was introduced.

Root passed 26 provider/handler/UI checks, scoped lint and Deno; independent review passed the
22 provider/UI checks and Deno. Reintroducing five-result parser truncation makes the new
ten-candidate assertion fail. The first two new UI tests had an ambiguous status selector;
corrected to select the unnamed status instead of the fixture output. Lint also exposed an
inherited control-character regex; equivalent character-code rejection preserves its behaviour.

Actual bounded tests used the founder-supplied query without committing it or saving Temporary
payloads. Abbreviated/full suffix and contextual variants did not find the correct area. A public
Sunninghill college address succeeded; a second public Sunninghill address missed. A Cape Town
address succeeded, demonstrating the ranking bias is not a hard Gauteng boundary filter.

A single-request structured-input experiment was independently reviewed as suitable for a known-
format staging comparison. Review found ambiguous unit/province comma formats; narrow exclusions
and 15 root and independent checks passed. Three actual comparisons still failed the private address's locality while
the public college case succeeded. The experiment was removed from source and staging; do not
ship a heuristic merely because it returns a similarly named street elsewhere.

Final staging search-addresses v4 is ACTIVE, public discovery only, bundle SHA256
a905952df037a5111e2d9a15c42ddab0d66261b7925a630698fff113f3526a1c. All five returned runtime
files exactly match the intended reviewed payload. It reads no customer, booking, Xooter or GPS
data. The final handler/source is the reviewed free-text implementation, not the experiment.

Twelve root Temporary attempts were used across the comparisons. Latest service-only readback:
53/200 Temporary, 4/20 confirmation and 4/20 shared Permanent consumed; no renewal or cap change.
No root Permanent request was made for the unresolved address. This is not a universal Mapbox
invoice cap. Missing-address resolution, canonical booking creation, actual coverage/worker
availability and physical device acceptance remain open. Do not claim every address is verified.

References: [Mapbox request and structured-input contract](https://docs.mapbox.com/api/search/geocoding/),
[address formatting](https://docs.mapbox.com/help/troubleshooting/address-geocoding-format-guide/),
[HFPA public address](https://hfpa.co.za/sunninghill/), [ARC public address](https://arc.int/contact).

## Handoff Rewards, Care+ and Safety

Source 8b5e367f3115f565ef45deb54be5ee86a2e35061 ports Rewards.jsx's flower-centred pastel
composition and design typography while retaining real owner-bound points/XootCred/history reads,
error states, retries and account-switch guards. It adds existing booking/referral/membership
destinations. Client-derived Bronze/Silver/Gold and unsupported milestone promises are removed;
no prototype streak, point award, unlocked benefit or fake balance is copied. Redemption remains
disabled with its existing honest status. No backend eligibility or wallet mutation was changed.

Navbar Trust is renamed Safety, preserving /trust-centre. CarePlusSymbol's original three SVG
paths and transform were compared with the supplied ds-bundle.js CarePlusMark and match. The
shared mark already appears in the navbar, public Care+ artwork, kit lockup and account membership
page; production delivery/native company-wide acceptance remain separate work.

61 existing wallet/kit/shell checks passed across three suites, TypeScript and scoped lint passed.
Production-mode build using authorised staging public configuration passed, prerendered 50 public
pages and passed artifact security scanning. Existing shared-chunk/large Mapbox warnings remain;
this is not a zero-lag certification. Vercel preview dpl_CU5ZPp9jhHPQwu7hFubGMgBZQZQr is READY
at that exact source. Actual signed-in staging Rewards renders the account's zero balances and
server-issued referral code. Measured CSS widths 390 and 1440 have no horizontal overflow. The
browser's zoom required compensating the viewport request; the actual innerWidth was checked,
not assumed from the requested dimensions. Screenshots are in outputs/xoot-rewards-handoff-phone-
20261027.png and xoot-rewards-handoff-desktop-20261027.png. Temporary viewport override was reset.
Safety visibly appears in the public navbar and clicking it opens /trust-centre with the existing
page title. Proof: outputs/xoot-safety-navbar-staging-20261027.png. Independent final review of
ad7099d..8b5e367 found no introduced blocker; all79 independent checks across five suites pass
with one worker. Owner/account-switch cleanup, delayed-response rejection, unavailable/error
states, disabled redemption and unchanged financial calculations remain intact. Physical device
acceptance and required GitHub release checks remain; preview/local passes do not clear production.

The current production checklist explicitly retains GPS/ETA, chat/calls, full email journeys,
malware/authenticity, real matching, all related handoff UI, saved places/Manage more/property
operations, rewards/Care+, standalone laundry/ironing, annual gifts, native widgets and performance.
The repo's standalone laundry ladder is explicitly empty/unconfirmed; enabling a button would not
implement a truthful paid service. Existing R30 add-ons are separate from that unfinished service.

Fresh live build-info GET on27October still returns e0c021e9fde328098f33fb216b1efa720eadf2f1. Required8b5security job121978579704 and type job121978578825 both fail with0steps; annotations say jobs did not start due account billing/spending. Source security scan also passes all three live-header tests and the secrets/admin-write/DOM/static-hosting checks. No required job is represented as passed.
