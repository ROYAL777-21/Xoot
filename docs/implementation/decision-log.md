# Xoot Decision Log

Reviewed: 2026-06-24

| ID | Decision | Status | Reason | Consequence |
| --- | --- | --- | --- | --- |
| ZD-001 | Expo is the approved native mobile path. Capacitor references are legacy documentation only. | Approved by founder request | `/mobile` exists and is initialized in EAS. | Do not revive Capacitor. Update company docs during Phase 1. |
| ZD-002 | Phase execution follows the Master Phased Implementation Program in strict order. | Approved by supplied program | Later provider/store work depends on unresolved security and schema governance. | Stop at the founder checkpoint after each phase. |
| ZD-003 | No further production deployment or provider mutation occurs during Phase 0. | Active | The master program explicitly forbids it. | Phase 0 remains inspection and documentation only. |
| ZD-004 | Staging is a separate Supabase project because branching is unavailable on the current plan. | Existing | Separate project already exists and contains the local forward schema. | Maintain isolated credentials and data. |
| ZD-005 | Schema source of truth is unresolved. | Founder decision required | Staging/local and production histories differ materially. | Do not push the local chain blindly to production. |
| ZD-006 | The locked booking state list is authoritative for future work. | Approved by supplied program | Existing production uses legacy enum values. | Phase 1 requires a compatibility and migration plan. |
| ZD-007 | Locked prices are R280/R325/R400, R30 add-ons, R39 one-time fee, R21 optional Booking Cover and R99 Care+ membership. | Approved by supplied program | Current booking backend uses R270/R315/R390. | Do not change silently; create an approved server-pricing migration and release plan. |
| ZD-008 | Public marketing and SEO content remains crawlable. Private data is protected by Auth, RLS, Edge authorization, rate limits and WAF. | Approved security position | A public website cannot be made completely unscrapable without harming legitimate indexing. | Cloudflare controls target abuse, not ordinary public indexing. |
| ZD-009 | Twilio is for Verify, masked voice and tightly limited urgent operational messages. | Approved by supplied program | Current Messaging Service is classified as marketing. | Do not use the existing service for Xoot operational traffic without replacement or reclassification approval. |
| ZD-010 | WhatsApp is not routine chat and is not a marketing channel. | Approved by supplied program | In-app chat is primary. | Only approved urgent templates may be activated in Phase 9. |
| ZD-011 | Brevo is the preferred transactional email provider. | Proposed | The stack already names Brevo; SendGrid remains optional. | Founder must confirm that SendGrid stays disabled. |
| ZD-012 | Mapbox web and native tokens must be separate. | Approved security requirement | URL restrictions are appropriate for web and incompatible with native SDK use. | Create a URL-restricted web token and a separate least-privilege native token. |
| ZD-013 | Siri/App Intents are route launchers only. | Approved by supplied program | Booking/payment actions require authenticated in-app confirmation. | Keep safe parameters only; no booking IDs or private data. |
| ZD-014 | No store record or privacy declaration is submitted without final legal/business answers. | Active | Store declarations are legal representations. | Prepare evidence and drafts, then require founder/legal sign-off. |
| ZD-015 | GitHub CLI may be installed locally, but repository publishing waits for the Phase 0 founder checkpoint. | Active | The working tree includes a large mixed implementation. | Authenticate and publish only after scope approval. |
| ZD-016 | CodeRabbit must use an official supported path. | Active | Native Windows installer is unsupported; official docs require WSL. | Install WSL only with founder approval or use the GitHub app review after a PR exists. |
| ZD-017 | Cloudflare configuration waits until the Xoot domain is added to the connected account. | Active | Connected account currently contains no zones. | Prepare rules now; activate only after DNS/hosting approval. |
| ZD-018 | Care+ activation paths must be consolidated. | Founder/product decision required | Current functions overlap and one expects missing columns. | Phase 1 defines the authority before Phase 3 expansion. |
| ZD-019 | Existing integration outbox is reused for invoices, communications and provider jobs. | Approved architecture direction | Duplicate queues increase replay and audit risk. | Add typed event contracts and idempotency instead of a second queue. |
| ZD-020 | ZD-007 is superseded. Pricing moves from flat per-home-size to per-half-hour ladders per service, defined in `docs/xoot-master-brief.md` §4. Booking Cover moves R21 to R22. | Approved by founder 2026-07-29 | Founder supplied full per-hour ladders for all services and confirmed they supersede the locked commercial facts. | See ZD-020 notes below. Nothing reaches production pricing without founder sign-off on the migration plan. |
| ZD-021 | Terms are accepted implicitly at sign-up with a visible linked notice. Post-deploy editing is code-and-deploy, not database-editable config. Care+ discount funding is `shared` short-term, switching to `commission` later. | Approved by founder 2026-07-29 | Founder chose lowest-friction consent, the most secure editing model, and early-frequency discount funding. | See ZD-021 notes below. |
| ZD-022 | The splash is authored once in `src/lib/splash-choreography.ts` and rendered three ways: Remotion for video, Web Animations for the browser, Reanimated + react-native-svg for native. Remotion is a devDependency and an authoring tool, never a runtime one. Launcher and launch-screen stills are generated from `ZoeyArt`. | Approved by founder 2026-07-29 ("Use remotion"), extended to native 2026-07-30 ("i also want the app to have it") | Hand-maintained copies of the same animation drift, and the drift is invisible in review. | See ZD-022 notes below. Native adds `react-native-svg`, and the shared modules are copied into `mobile/src/generated/` by a script rather than imported across roots. |
| ZD-023 | Tips live in `public.booking_tips`, not on `bookings`, and are visible to a Xooter only once `settled_at` is set. Xoot takes no cut. Booking `price` and `status` become unwritable from any client session. | Approved by founder 2026-07-30 ("Both no") | Row-level security cannot hide a column, so a tip on `bookings` is readable by the assigned Xooter the moment it exists. | See ZD-023 notes below. The price/status guard fixes a live production hole and is currently unapplied. |
| ZD-024 | **The long-job floor.** From 5.5 booked hours up, gross price is at least **R54 per hour** on every ladder. Fixed on the price, not on commission — the 35% starting rate is unchanged. | Approved by founder 2026-08-12 ("Fix the pricing to make it fairer … by repricing long jobs rather than cutting commission") | The ZD-020 ladders were sub-linear in hours, so a 10-hour regular clean returned the Xooter **R27.95/h** at the starting commission — under the stated R35/h per-booking pay floor and near the national minimum wage for domestic work. | Supersedes the ZD-007 reconciliation for medium and large regular cleans (8h is now R432, above ZD-007's R400). Amends `docs/xoot-master-brief.md` §4.1, §4.5 and §4.6. See ZD-024 notes below. |

## ZD-020 notes — pricing model change

**What is approved.** The pricing *model* changes: price becomes a function of booked hours
per service, on a half-hour ladder, instead of a flat charge per home size. Booking Cover
becomes R22. The ladders live in `docs/xoot-master-brief.md` §4 and that document is the
reference — do not re-key the numbers into a second place.

**What this obsoletes.** `docs/product/locked-commercial-facts.md` pricing table is now
stale and must be reissued against §4. Two implementations are also now non-conforming:

- `supabase/functions/create-booking/index.ts` — R270/R315/R390 plus unapproved service
  multipliers and a high-demand premium.
- `src/lib/pricing.ts` (app-iteration) — bedroom/bathroom/property-type multipliers,
  recurrence discounts and a surge multiplier. Structurally incompatible: it prices by
  property attributes, the new model prices by hours.

**This is not a price cut — corrected 2026-07-29.** An earlier revision of this entry read
the new ladders as a price decrease. That was wrong. The founder clarified that the ZD-007
prices already had one add-on baked in, and the arithmetic confirms it exactly:

| Size | Default hours | ZD-007 locked | New ladder | Difference |
|---|---|---|---|---|
| Small | 4.0h | R280 | R250 | **R30** |
| Medium | 5.5h | R325 | R296 | **R29** |
| Large | 8.0h | R400 | R370 | **R30** |

The gap is one standard R30 add-on at every size — the preselected interior-windows add-on.
So ZD-007 quoted an add-on-inclusive price, and §4 quotes the **base service price before
add-ons**. Headline revenue per booking is unchanged. No margin check is needed on this
basis. Do not "restore" the old numbers on top of the ladder; that would double-charge the
add-on.

**This also closes the single-ladder question.** All three locked sizes land on *one* ladder
at their own default hours once the R30 add-on is removed. Home size therefore sets the
**default hours only** — it does not change the price of an hour. One ladder, three defaults.

Minor: medium is R29 rather than R30. Almost certainly rounding in the original R325, but
worth confirming that R296 is right and not R295.

**Approval is to the model, not yet to every number.** Still open, marked `CONFIRM` in the
master brief, and gating the migration:

1. Moving cleaning — the single shared ladder is a reconstruction from a degraded
   transcript, not a transcription.
2. Airbnb 7.0h — R372 or R388.
3. Laundry/ironing band boundaries, and whether wash and ironing compose into one estimate.
4. Last-minute surcharge — cutoff window, multiplier vs flat, per-service, Care+ exemption.
5. Whether the recurring discounts (1-2 / 3-4 / 5+ days per week) survive the change.
6. Office cleaning add-ons — none by design, or not yet specified.

**Closed:** regular-cleaning ladder is shared across sizes (above). Airbnb linen is **R20**,
not R30 (founder, 2026-07-29).

**Sequencing.** Phase 1 may build UI against §4 because no price is shown until the end of
the booking flow. Server pricing is a separate, founder-signed-off migration. Client and
server must not diverge in production.

## ZD-021 notes — consent, editability, discount funding

**Terms.** Implicit acceptance with a visible linked notice, rendered by
`src/components/zoot/TermsNotice.tsx` directly beneath the action it refers to. For
implicit acceptance to bind it must be genuinely visible before the action and the links
must work — it cannot be hidden behind a disclosure toggle, greyed to illegibility, or
pushed below the fold. The component names the actual button ("by starting your trial"
rather than "by continuing") so the sentence is true on each screen.

Shown on `/welcome` and on the Care+ paywall. **Still to add** wherever else an account is
created or money is committed.

**Editability — code and deploy, deliberately.** The founder asked for the most secure
option, and this is it. Database-editable prices and copy are one compromised admin
session away from changing what customers are charged, with no review step. Code changes
pass through git history, pull-request review, CI, and the Claude security-review action,
and leave an immutable audit trail.

The cost is real and worth stating: **every price or copy change needs a developer and a
deploy.** If that becomes the bottleneck, the secure middle path is to move only low-risk
strings — marketing copy, benefit lists — into config while prices stay in code, and to
gate any config write behind the existing `approval_requests` and `admin_audit_log`
tables rather than a bare admin form.

To keep that tolerable, every tunable value is a named, commented constant at the top of
its module rather than a literal buried in a component:

| What | Where |
|---|---|
| Booking price ladders (display) | `src/lib/xoot-pricing.ts` |
| Booking price ladders (authoritative) | `supabase/functions/_shared/pricing.ts` |
| Add-on, cover, linen amounts | both of the above, kept in parity by `pricing-parity.test.ts` |
| Care+ tier prices, discounts, win-back | `src/lib/care-plus.ts` |
| Discount funding split and pay floor | `src/lib/care-plus.ts` (`DISCOUNT_FUNDING`) |
| Trial length | `src/pages/CarePlusPaywall.tsx` (`TRIAL_DAYS`) |
| Onboarding options and defaults | `src/lib/onboarding.ts` |
| Colour and type tokens | `src/index.css` |

**Discount funding.** `shared` short-term to drive booking frequency, moving to
`commission` once volume supports it. It is a constant rather than a hardcoded rule so the
switch is a one-line change. `splitDiscount()` caps the Xooter's share so it can never
breach the R220 half-day / R300 full-day floor; Xoot absorbs whatever the cap refuses.
The risk to watch is not complaints — it is Xooters quietly declining Care+ jobs.

## ZD-022 notes — the splash

**Why one definition.** `splash-choreography.ts` is the whole animation as pure
functions of time. Remotion samples it per video frame; the app samples it into Web
Animations keyframes. Neither renderer owns any timing or geometry. The alternative —
author it in Remotion, then hand-write the app version to match — produces two
animations that are the same today and different in three months, and nobody reviewing
a diff will catch the moment they part company. `splash-choreography.test.ts` asserts
the properties both renderers depend on, because neither can be eyeballed in CI.

**Why not ship Remotion to the browser.** `@remotion/player` would run the composition
live, at the cost of parsing a player bundle before the first frame of a splash whose
entire job is to appear instantly. The splash instead plays through the Web Animations
API, which hands transform and opacity to the compositor — so it holds even while the
main thread is busy with bundle parse, auth rehydration and the first query, which is
exactly when a splash runs.

**Four things the render caught that reading could not.** Recorded because each is a
plausible-looking choice that is wrong only on screen:

1. Keeping the star orbits running underneath the exit is continuous and defensible on
   paper. The two velocities cancel about a third of the way out; the star stalls
   mid-flight and its trail blinks off. The ellipse now relaxes as the star departs.
2. White stars are invisible on the cream background — they only read where they cross
   the heart. They carry a blurred red glow now. An unblurred scaled copy is the cheap
   substitute and turns a white star into a red ring.
3. A tail is only a streak while its segments overlap. At exit speed, four segments
   read as a dotted line following the star.
4. Marking the session on mount meant nobody ever saw the splash. `public/sw.js`
   navigates every client when it activates, so a genuine first visit loads twice, and
   the reload found the splash already claimed. It is marked on completion now.

**Assets.** `npm run icons:render` regenerates every launcher and launch-screen still
from `ZoeyArt`, so the icon and the mascot cannot become different characters. Those
are committed because EAS needs them at build time and does not run Remotion. The
splash *video* is not committed — it is derivable, and a binary regenerated on every
render does not belong in git history.

**Native — added 2026-07-30.** `react-native-svg` plus Reanimated, driving the same
choreography. `mobile/src/components/splash-animation.tsx` translates it into native
elements and decides no timing and no geometry of its own; `splash-parity.test.ts`
holds all three renderers to that.

*Why a generated copy rather than a shared import.* Metro builds its file map from the
project root and fails with "Failed to get the SHA-1" for anything outside it — through
`watchFolders`, through `resolveRequest`, and with `EXPO_USE_METRO_WORKSPACE_ROOT` set.
A symlink is the other usual answer and breaks on Windows checkouts. So
`npm run shared:sync` copies the dependency-free modules into `mobile/src/generated/`,
and `shared-native-sync.test.ts` compares them byte-for-byte against the source. A
duplicated file is only safe while something proves it is still a duplicate; that test
is what makes this a copy rather than a fork. Mobile's `prestart` runs the sync, so a
stale copy cannot reach a bundle by accident.

*Where native legitimately differs.* Five trail segments rather than ten, because every
animated element is a worklet the UI thread evaluates each frame and sixty of them is
not a bet worth taking on a low-end Android device during app start. The taper is
shared — `trailSegments(count)` — so only the sampling rate changes. And the star glow
is a radial gradient rather than a Gaussian blur, because react-native-svg has no
filter support on Android; the obvious substitute, concentric copies of the star, is
the exact bullseye failure the web version documents.

*Whether it plays* is `shouldPlayLaunchAnimation` in `mobile/src/lib/native-launch.ts`,
which already owned the deep-link bypass and the Reduce Motion / Low Power gate. Adding
a second opinion in the layout would have meant a voice booking intent getting a brand
flourish over the top of the screen it asked for.


## ZD-023 notes — tips, and what looking at them exposed

**The visibility rule drove the schema.** The founder ruled that a Xooter must not see
the tip before the customer relationship is closed out. That cannot be done with a
column on `bookings`: RLS in Postgres is row-level, the existing
`zooters view assigned bookings` policy returns whole rows, and column-level `GRANT`s
cannot separate customers from Xooters because both are the `authenticated` role. So the
tip is its own table with its own policies, gated on `settled_at` — settlement rather
than completion, because the point is that knowing must not colour the job or the
rating. `settled_at` is server-only; a trigger reverts any client attempt to set it,
since a customer who could set it would reveal their own tip early.

**Xoot takes no cut**, so `TIP_GOES_ENTIRELY_TO_XOOTER` is true. The claim still does not
render until `TIP_READINESS === "settled"`. A promise about a payout that does not run
yet is no more true for being well intentioned, and this one is checkable by every
Xooter it is made to.

**A live hole, found on the way.** `update own bookings` and
`zooters update assigned bookings` both grant UPDATE on the whole `bookings` row with no
column restriction. A customer can set the price of their own booking to zero; an
assigned Xooter can raise the price of a job they are working. Neither needs a UI — one
PATCH from the browser with a valid session does it.

The migration adds a trigger that reverts `price` and `status` changes made from any
client session, allowing the server path (`auth.uid()` null, i.e. the service role),
admins, and a customer cancelling their own booking. It reverts rather than raises, so a
legitimate update carrying the old values along does not fail.

**This one should not wait for tipping.** The rest of this migration is gated on ZD-005
and can sit; the price guard is protecting money in production today. It needs to be
split out and prioritised on its own.


## ZD-024 notes — the long-job floor

### What was measured

At the 35% starting commission — the worst rate any Xooter can be on — the cheapest hour on each
ZD-020 ladder, before this change:

| service | worst rung | gross/h | Xooter keeps |
|---|---|---|---|
| regular | 10h at R430 | R43.00 | **R27.95/h** |
| moving | 10h at R478 | R47.80 | **R31.07/h** |
| airbnb | 7h at R372 | R53.14 | **R34.54/h** |
| office | 10h at R660 | R66.00 | R42.90/h |
| express | 3h at R220 | R73.33 | R47.67/h |

Three of the five finished under `MIN_XOOTER_HOURLY_CENTS` (R35/h), which `src/lib/care-plus.ts`
has asserted as the per-booking pay floor since 2026-08-10. The floor was an intention the prices
contradicted, and the longest, hardest jobs contradicted it hardest.

### The rule

**From 5.5 hours up, gross is at least R54 per booked hour.** It only ever raises a price, so
`OFFICE`, `EXPRESS` and every rung below 5.5h are untouched. Changed rungs:

- **regular** — 5.5h R296→R297, then 6h→R324, 6.5→R351, 7→R378, 7.5→R405, 8→R432, 8.5→R459,
  9→R486, 9.5→R513, 10→R540.
- **airbnb** — 7h R372→R378, 7.5h R400→R405, 8h R426→R432.
- **moving** — 7.5h R404→R405, 8h R430→R432, 8.5→R459, 9→R486, 9.5→R513, 10→R540.

At 35% this returns **R35.10/h** at every floored rung, and the worst cell on any ladder is now
R35.10 (regular/airbnb/moving) or better.

### Why R54, and why not commission

R54 is not chosen — it is what the 5.5-hour regular clean, the most-booked job and the rung the
rest of the ladder was set relative to, already charged: R296 ÷ 5.5 = R53.82, rounded up so the
floor is a whole rand and the invariant is exact. The R1 that rounding adds to the 5.5h rung is
what moves a new Xooter from ten cents *under* the R192.50 hourly floor on that job to 55c clear
of it.

Cutting commission instead was considered and rejected. It would make the same booking worth less
to Xoot the longer it ran, which is backwards; and commission is already a ladder that rewards
reliability, so bending it for duration would mean two unrelated things moving one number.

### What enforces it

`LONG_JOB_FLOOR_CENTS_PER_HOUR` in `src/lib/xoot-pricing.ts`, mirrored in
`supabase/functions/_shared/pricing.ts` and pinned by `pricing-parity.test.ts`.
`xoot-pricing.test.ts` asserts the invariant over the ladders rather than a list of rungs, plus
that no rung fell and that every rung clears R35/h at 35%. `care-plus.test.ts` keeps the
minimum-wage check, now computed from the ladder rather than transcribed.

### Still open

Whether R35.10/h clears the current national minimum wage for domestic work. That figure changes
every March and is not asserted anywhere in this repo — deliberately, because guessing at a legal
threshold is worse than flagging it. It is a founder/legal check, not a code change.

## Pending Founder Decisions

1. Canonical Supabase schema source.
2. Care+ placement product ownership and naming.
3. Booking creation authority.
4. Launch payment provider order.
5. Booking Cover preselection approval.
6. Twilio account upgrade/subaccount strategy.
7. Cloudflare and primary production host arrangement.
8. Legal entity and Information Officer details.
9. Native Care+ billing classification.
10. WSL installation for CodeRabbit.
