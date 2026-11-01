# Combined website staging candidate — 27 October 2026

Production is not cleared. The founder authorised implementation/testing and selected PayFast as
the next phase after current website readiness. No payment activation or real charge is included.
The current task matrix remains [the production checklist](../../production-checklist.md).

## Integrated source and preview

Branch integration/website-staging-20261027 combines PR97/100 with reviewed PR71 GPS/ETA,
PR81 provincial geometry/address lookup, PR91 private indexing, PR93 private calls, PR94 native
Auth and PR96 chat access. The approved release is an ancestor; no implementation was discarded
to resolve a conflict. Original branches, unrelated Journal PR98 and separate candidate PR99 remain.

Vercel preview dpl_8jTCGCixXjwi8LqDmLdmtbKbgF24 is READY at
f48fc98088ed9d10dcdb0f15c67d3f6766cc4471. The stable protected test site is
[the combined staging preview](https://xoot-git-integration-website-stagi-56296d-royal777-21s-projects.vercel.app).
Its branch-only Preview configuration explicitly selects staging project fxmxyabdjqviqbcxmvlp,
enables bounded address lookup/calendar UI, leaves the browser map token empty and keeps live
journey/verified coverage false. No global or Production variables changed or protection disabled.

Independent release and security reviews found no blocker in the final guard corrections at
f48fc98. This is source/integration review, not approval of unfinished provider/device operations.

## Actual new signup and saved-place acceptance

The founder privately completed the new authorised 27 October staging alias through name/password
signup, email confirmation and normal sign-in. The agent did not enter/read a password, email code,
session JWT or sign-in link. Actual /app and /app/profile show the signed-in name and account.
Targeted aggregate readback confirms one registered and confirmed Auth account, one corresponding
owner profile and only the ordinary user role. No admin or Xooter role was added.

Using that ordinary browser session, the agent saved the explicitly labelled
“Staging check — public address” place, selecting a real provider suggestion for a public Kikuyu
Road test address in Sunninghill and waiting for server-side Permanent confirmation. Private gate,
access, pet and other home details were left empty. Save returned to the profile; browser reload
retained both the session and Your places entry. No booking, payment or worker was created.
The retained disposable household fixture is 64297493-1d42-4251-89f7-80c51443da07. Leave it visibly
labelled for founder testing; any later cleanup must target this fixture alone, never the Auth user.

A real Data API request using only staging's modern publishable key and no bearer JWT returns
HTTP200 with zero rows for that known saved-place ID. This proves anonymous read denial; it does
not replace a different signed-in customer's isolation test. The browser owner's save/read and the
targeted aggregate show that the row actually exists, rather than treating an absent fixture as denial.

Actual CSS viewport checks at 390×844 and 1440×1000 have scrollWidth equal to innerWidth. Computed
body typography begins Plus Jakarta Sans; Manage more exposes Airbnb host and Small office routes.
Viewport override was reset. Phone/desktop captures remain local in outputs/xoot-new-account-saved-
places-phone-20261027.png and xoot-new-account-saved-places-desktop-20261027.png; no private profile
screenshot was uploaded to the repository. These are browser responsive checks, not physical iPhone
or Android acceptance. Default-place controls and unfinished preferences remain visibly unavailable.
Production new signup, logout/account switching and device acceptance remain separate checks.

The founder then opened the combined profile on the authorised physical iPhone 12, signed in with
the newly created staging account and explicitly confirmed “The place appears.” This establishes
cross-device saved-place retrieval through the normal account journey. It is owner-reported phone
acceptance, not an agent-captured phone screenshot or proof of GPS permissions, chat/call audio,
production Auth, logout/account switching or a signed native app build.

## Actual public-address and booking UI

On the hosted combined site, selecting a public test suggestion confirms the address without
opening an interactive map. Book now carries the confirmed full label into guest booking state,
not the URL. The place step continues with the optional suburb left empty; the suburb is not
duplicated into an already complete label. Ironing and Laundry are the first two add-ons; selecting
both changes the displayed single-Xooter estimate from 5.5 to 7.5 hours and the next step offers
SAST visit slots consistent with the 17:00 end boundary. No final booking or charge was submitted.

An earlier keyboard attempt left the tab at Auth during confirmation; its cause was not established.
The repeated direct-tap path passed. Do not turn that observation into a keyboard acceptance claim.
The founder's original private Sunninghill example still lacks a correct provider result; broader
address/normal-booking acceptance remains open. A saved address is not proof of worker availability.

The three public-address UI attempts used three Temporary and three Permanent attempts. Latest
service-only readback is 56/200 suggestions, 7/20 confirmations and 7/20 shared Permanent. The original
non-renewing allowance, no-refill rule and default-zero production allowance remain. This bounded
lookup allowance is not a universal Mapbox invoice cap. No Temporary response or private query is
committed as evidence.

## Exact staging origin delivery

At action time the founder approved only this exact integration-preview origin in staging
ALLOWED_ORIGINS. All six existing origins were preserved. Old SHA256:
4bd5e6bc30e3d4cdb735011e47314d885f3614999bd135f52448572c420b6971.
Saved/read-back SHA256:
a800d3e8bd0e9f77b191fb10408ca11945599cb1dd1ee59c6be8389095dae8b7.
Dashboard save is 27 October 08:09:31 UTC. Source staging derivation/test matches the seven-origin set;
production/default derivations stay unchanged. No wildcard or handler redeployment was introduced.

Nine actual HTTP checks pass: own/foreign address preflights, own invalid short search, foreign
search rejection, calendar preflight/no-JWT denial and no-JWT denials for GPS, voice token and
application submission. All owned responses echo only the exact allowed origin where applicable.
The deliberately invalid search spent no allowance; counters were unchanged by these checks.

## Automated checks and reproducible corrections

Full f48fc98 web run completes 189 files/1944 tests in 596.01 seconds: 1920 pass, 17 five-second
timeouts and seven existing skips;183 files pass and six fail. All43 rendered-browser checks pass.
The affected files are deploy-host-config, NotificationsFeed, BookingFlow, Bookings, GiftClean and
Today. This full run is not green. A same-source, same-assertion/deadline six-file rerun passes
88 of 91, with three timeouts remaining: both host environment-resolution cases and the long guest
booking UI journey. The other four files pass. No timeout is raised and no failed test is removed.
Available host RAM measured about 669 MiB after the run, but resource pressure alone is not proof
that every timed-out case is correct. Those three cases were checked individually without
concurrent file execution. Both host cases pass in 1.98 seconds and the long booking case passes
in 3.71 seconds, using their unchanged original five-second deadlines. Those explicit -t runs
exclude the other cases by selection; they do not add new product skips. These focused passes
do not erase the failed full-run result. The final full run explicitly disables file parallelism
and PASSES all 189 files: 1937 tests pass with seven existing skips, 1944 total, in 428.91 seconds.
Same source f48fc98, original assertions/deadlines, one worker/threads and no product/test edit.
The earlier timeout results remain recorded above; required GitHub checks are still separate.

Earlier full 18739a4 passed 189 files/1931 tests with seven existing skips. The b190544 run completed
with one five-second BookingFlow timeout; its unchanged focused 23-test rerun passed. Do not call that
full run green. No test timeout or production interlock was relaxed to hide either result.

Other completed checks: web TypeScript, full/scoped ESLint, lockfile validation, all 59 native script
checks and an exact-byte isolated mobile typecheck. The shared mobile dependency junction was not
replaced after automatic approval review rejected that operation; a separate isolated install and
146 SHA256-matched source files provided the safe verification path. No native build was produced.

The final exact-f48fc98 production-mode staging-config build passes 50 public prerenders and
artifact scanning, then both actual smoke scripts pass. Build-info names f48fc980. Actual
enabled-suggestions design smoke passes at 390/1440, and rendered startup observes the real
staging endpoint and truthful zero-person roster, then exercises usable returning-user controls.
The older design gate expected only textbox; it now also accepts the exact named combobox while
retaining typing/focus assertions. Signup-first Auth now takes the actual returning-user action
on both navigation and reload; missing action, broken action and missing returning-email fixtures
are rejected. An actual missing-email fixture wrongly passed before the final fix and fails after it.
The guarded runtime files are unchanged by the final smoke-test-only commits.

Final exact-f48fc98 source preflight also passes web/mobile lock validation, web TypeScript,
full ESLint, all four live-header contract cases and unchanged secret/admin-write/DOM/static-hosting
security scans. The built-artifact and source outputs are separate evidence; neither replaces CI.

## Calendar provider reschedule and retained cancellation

A fresh ordinary Google Calendar week view now shows the subscribed Xoot visits fixture at
11:00–13:00 SAST on 27 October, with no location and the private busy presentation. This establishes
that the provider refreshed the prior 10:00–12:00 event after its staging revision advanced to 1.
Local proof: outputs/xoot-google-calendar-rescheduled-20261027.png. No capability, clipboard,
subscription URL or owner session was read to obtain that observation.

After that visible acceptance, only fixture 9c8ac396-5942-46a2-9d86-1bf72d705c48 was cancelled by a
guarded staging fixture update. Eligibility checked the exact ID, marker, authorised owner,
pending_payment status, zero price, revision 1, expected time/duration, and no payment or assignee.
Exactly one row returned cancelled with revision 2. This is privileged disposable-fixture setup,
not acceptance of the normal customer cancellation writer. No real booking, payment or worker changed.
Retain the cancellation tombstone until Google visibly observes it; cancellation refresh and final
fixture cleanup remain pending. The provider controls polling. Do not delete the Auth account.

Source secret/admin-write/DOM/static-hosting and live-header checks pass. Three synthetic unit-test
keys were shortened; scanner patterns/allowlists and signature/denial assertions were not weakened.
The writer-parity scanner now handles logical/nullish value branches and rejects a planted forbidden
fallback. A real quarantine preflight denies the old active-worker acceptance fixture before Auth
or data changes; never disable clearance or fabricate verified capacity to rerun that fixture.

## Production preflight and remaining gates

A fresh public build-info read still identifies production e0c021e9fde328098f33fb216b1efa720eadf2f1,
built 24 October 19:18:14 UTC. Read-only 27 October migration ledgers show none of the nine current
integration versions on production; its external safety-PIN version20261008011821 is preserved.
Staging has eight of those nine version records. The configuration-only20261025080000 voice-control
record is absent; targeted catalog read confirms no twilio.in_app_voice row, so that gate fails
closed. The older masked_voice/operational_messages controls are separate and are not evidence of
in-app-call activation. No ledger was repair-marked, blind db-push attempted or production row changed.

The production-only PIN migration, older prepared schema gaps, actual effects/dependencies and frozen
Edge bundles require exact reconciliation before any production delivery. In particular, staging's
operations handler keeps the reviewed narrow quarantine backport because the canonical unrelated
gift RPC is absent; do not blanket-deploy source. See [the quarantine delivery record](kyc-staging-delivery.md).

Required GitHub release jobs still need genuine execution; previously verified included Actions
usage was 3000/3000 minutes. No plan/spending increase, fabricated status or merge bypass is authorised.
Physical GPS/chat/audio, authentic worker capacity/matching, scanner/privacy/legal clearance and
safe MFA document approval, complete lifecycle email delivery, property operations, standalone laundry,
52-visit gifts and native widgets remain open in the current checklist. Apple remains explicitly pending.
PayFast is the next requested phase, preserving PR72; no sandbox success or live payment readiness is claimed.
