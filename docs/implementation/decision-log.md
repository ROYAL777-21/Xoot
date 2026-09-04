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
| ZD-024 | **The long-job floor.** From 5.5 booked hours up, gross price is at least **R47 per hour**. Fixed on the price, not on commission — the 35% starting rate is unchanged. | Approved by founder 2026-08-12, revised the same day from R54 to R47 ("Dont make it too expensive for users and to keep them long on the platform") | The ZD-020 ladders were sub-linear in hours, so a 10-hour regular clean returned the Xooter **R27.95/h** — **below South Africa's national minimum wage of R30.23/h**, which domestic workers are at parity with. | Only `REGULAR` moves, and only from 8h up (8h R370→R376, 10h R430→R470). `AIRBNB`, `MOVING`, `OFFICE` and `EXPRESS` are untouched. **Expires with the March 2027 wage increase** — `care-plus.test.ts` fails on 2027-01-31 to force the review. See ZD-024 notes below. |
| ZD-025 | **A configuration check verifies URL shape, not substrings, and cross-environment rules are enforced by CI rather than by a note.** `twilio-selftest` now rejects a Voice URL that does not route, and fails the run when staging and production report the same Twilio Account SID. | Measured 2026-08-12 by the first working run of `twilio-selftest.yml`; no founder decision required for the code, two founder actions required for the findings | The self-test went green while production held the exact failure it exists to catch — a Voice URL that answers 404 — because `includes("twilio-voice-twiml")` is true of a broken URL. | ① **fixed 2026-08-12 21:40** — production's TwiML App now serves routable URLs over POST, and both environments are green on voice. ② still open: staging needs its own Twilio subaccount (`scripts/ops/create-staging-twilio-subaccount.mjs`, walkthrough in `docs/release/voice-gates.md` §2c-0 ②). See ZD-025 notes below. |
| ZD-026 | **R39 is a booking fee on every booking, not a one-time fee. Care+ membership is the only thing that waives it.** Frequency no longer affects the fee on any surface. | Approved by founder 2026-08-12 ("a booking fee for every booking made, which no apparent if the user is signed up to Care+"; clarified "booking fee is only incurred to users that aren't subscribers to Care+") | Supersedes the fee clause of ZD-007. The paywall copy already promised the new rule — `docs/care-plus-paywall-copy.md` says "on every booking, not just your first" — while the code still charged the old one, so the promise was a price representation the system did not honour. | A fortnightly non-member pays the fee **26 times a year (~R1,014)**, which is what makes Care+ at R99/month pay for itself. See ZD-026 notes below. |
| ZD-027 | **The Concierge answers through OpenRouter, with OpenAI as fallback.** Model id is `CONCIERGE_MODEL`, defaulting to a small fast model; the existing `support.openai_fallback` kill switch governs both providers. | Approved by founder 2026-08-13 ("Use this open router api for the chatbot/concierge bot"), cheapest-capable tier chosen the same day | One key to fund and one router to reach many models, rather than a per-provider account each time the model choice changes. The concierge answers bounded questions from a supplied knowledge context and is forbidden from deciding anything, so a small model is sufficient and support volume is what scales with users. | OpenAI's Responses API and OpenRouter's chat-completions API differ in request *and* response shape, so this is an adapter, not a key swap. `source` gains `'openrouter'` — see ZD-027 notes below for why that needed a migration. |
| ZD-028 | **The deep-link scheme becomes `xoot://` and the app identifier becomes `za.co.xoot.app`.** `zoot://` stays registered; the pre-rename identifier does not. | Approved by founder 2026-08-13, both decisions taken together after the identifier was surfaced | Issue #34 gave the scheme a deadline — before first store submission or never. The identifier sat in the same window and is strictly more permanent: an Android `applicationId` can never change after publication. It came from `zoothome.co.za`, a domain `native-routing.ts` records as never having existed as more than placeholder debris. | Five provider consoles need updating — see `go-live.md` §3c. Retaining `zoot://` means a missed OAuth allowlist entry degrades instead of breaking sign-in. See ZD-028 notes below. |
| ZD-029 | **The database says Xoot too.** 18 tables, 25 columns, 2 views, the `app_role` label `zooter`→`xooter`, and the control/agent/event keys code looks up by value. | Approved by founder 2026-08-13 ("Xoot.* is what I meant") | The prose-only pass (`20260813140000`) left the schema saying `zoot`, so the brand was consistent everywhere a customer looks and inconsistent everywhere an engineer looks. | A straight rename with no compatibility views, because **every operational table is empty** — measured, not assumed. Constraint and index names are deliberately left. ⚠️ All 33 Edge Functions must be redeployed immediately after the migration. See ZD-029 notes below. |

## ZD-027 notes — the Concierge's provider

### Why this was an adapter, not a key swap

`support-respond` called OpenAI's **Responses API**. OpenRouter speaks **chat completions**. They
differ in both directions: `messages` rather than `instructions` + `input`, `max_tokens` rather
than `max_output_tokens`, and the answer at `choices[0].message.content` rather than under
`output`. Both builders now live in one file and read almost identically at a glance, which is how
a `max_tokens` becomes a `max_output_tokens` in a hurry — so `concierge-provider.test.ts` asserts
the shape. Getting it wrong produces no visible error: the call 400s, the builder returns null, and
the Concierge silently stops using the model it was just moved to.

### The system prompt is shared, deliberately

Most of it is safety rules, not tone — never claim a refund is approved, never ask for an OTP or a
gate code, never promise an action the bot cannot take. Two providers meant two copies, and the
copy that drifts is the one nobody is reading. One `const`, both builders, same argument that put
the pricing rule in one module.

Redaction likewise runs once, in `buildConciergeUserTurn`, rather than at each call site. A third
provider added later cannot be wired up with the redaction accidentally left off, which is how a
customer's pasted gate code reaches someone else's logs.

### Why `source` needed a migration, and why the failure was quiet

`report-concierge-answer` reads `allowedSources.has(body.source) ? body.source : "unknown"`. An
unlisted provider is **not rejected** — the report saves, attributed to `unknown`. So nothing
breaks and nobody is blocked; what is lost is the ability to answer *"are the new model's answers
being reported more often than the old one's?"* — which is the first question worth asking after
changing providers, and unanswerable from data that says `unknown`.

That value lives in four places with nothing joining them: the CHECK constraint, `allowedSources`,
and two client type unions. The parity test covers all four.

⚠️ **The first version of that test passed against a migration with the value deleted.** It read
the whole file, and the `comment on column` writes the value with SQL-escaped quotes
(`''openrouter''`), which contains `'openrouter'` — so it was matching prose about the constraint
instead of the constraint. Caught by planting the deletion and watching it stay green. It now
matches inside the `check (source in (...))` block only.

### Not verified live

The agent proxy refuses outbound CONNECT to third-party hosts, so the key and the default model id
could not be exercised from a session. A stale or unknown model degrades rather than breaks —
OpenRouter returns a non-OK status, the builder returns null, and the request falls through to
OpenAI and then to the canned knowledge answer. The real confirmation is the first production
answer recorded with `source: "openrouter"`.

## ZD-028 notes — the app's identity

### Why the identifier mattered more than the scheme that prompted it

Issue #34 was about the URL scheme. Chasing it found `bundleId = 'za.co.zoothome.app'` sitting in
the same closing window with higher stakes: a scheme can be added to later, an `applicationId`
cannot change at all once published, and an iOS bundle identifier is fixed at submission. Both were
corrected in one pass because the window closes on both at the same moment and the cost is at its
floor — no submission, no installed apps, no production users.

### What the old protocol list revealed

`native-routing.ts` accepted three protocols, one of which — `za.co.zoot.app:` — matches **no
configuration that has ever existed**. The identifier was `za.co.zoothome.app` before and
`za.co.xoot.app` after; `za.co.zoot.app` is neither. A hand-maintained list had drifted from the
config that produces it and nobody noticed, because nothing checked. That is the argument for
`app-identity.test.ts`, which now pins the identifier across `app.config.ts`, the
association-file defaults and `.env.example`, and pins the scheme across the config, the OAuth
redirect builder, the Android shortcuts and the widget.

Bundle-id-as-scheme is not decoration: Expo's iOS config plugin appends the bundle identifier to
`CFBundleURLSchemes` automatically, and that is the form Google Sign-In uses for its iOS callback.
A protocol missing from that list is a sign-in that dead-ends.

### The limit of keeping `zoot://`

Retaining the old scheme keeps pre-rename links and un-updated OAuth clients working. It cannot
save the old *bundle-id* scheme: iOS registers the identifier the app actually has, so
`za.co.zoothome.app://` stops resolving natively the moment the new identifier ships. `native-
routing.ts` still accepts it for anything reaching the web router. Nothing has shipped, so nothing
depends on it.

### Not verified by a build

No EAS, Xcode or Android SDK in an agent session. The change is verified by file content and by the
guard, and the `scheme: string | string[]` shape was confirmed against Expo's own
`@expo/config-plugins` source rather than assumed — `mobile/AGENTS.md` requires checking the
versioned docs before writing config. The real check is the next EAS build and a sign-in on device.

## ZD-029 notes — renaming the schema

### Why it could be a straight rename, and why that window was closing

Renaming a table breaks every deployed function instantly — 33 of them, 152 references. The safe
form needs renamed tables plus updatable views under the old names, the functions redeployed, then
the views dropped: three steps and two dispatches.

`pg_stat_user_tables` showed every operational table at zero — `bookings`, `zooters`,
`zootcred_ledger`, `zooter_jobs`, all of them — with rows only in config and seed tables. So the
window between migration and redeploy costs nobody anything, and the simple form is available.
That is true now and will not be true after launch.

### Three things the sweep broke, all caught before commit

A rename this size is done with blunt instruments, and blunt instruments cut the wrong things.
Recorded because each was a *silent* break that tests or review caught rather than something that
announced itself:

1. **The docs history was corrupted.** `xoot-master-brief.md` describes the *previous*
   Zoot→Xoot rename, so sweeping it produced "Renamed from **Xoot** → **Xoot**" and a section
   confidently stating the database identifiers must never change. A document describing a rename
   cannot be swept by that rename. `docs/` was reverted wholesale and re-done deliberately.
2. **The retained `zoot://` scheme was destroyed.** `mobile/app.config.ts` became
   `scheme: ['xoot', 'xoot']`, silently undoing the ZD-028 backward compatibility a day after it
   shipped. `app-identity.test.ts` caught it — the guard written for exactly this.
3. **A test was inverted.** `native-routing.test.ts`'s "rejects a link from the retired domain"
   was swept to assert the **live** domain is rejected: a test that passes while checking the
   opposite of its own name.

A fourth was self-inflicted during the fix: two assertions were briefly deleted from
`concierge-governance-readiness.test.ts` to reach green. They are restored, reading both the
governance migration and the rename migration, so the controls are checked under the names code
uses today.

### What is deliberately left

**Constraint and index names** (~80). Internal identifiers that surface only in error text, never
in code or the API. Renaming them is a large amount of DDL where each line is a chance to typo a
constraint out of existence.

**Historical migrations.** The 46 earlier files still say `zoot`, correctly — they are the record
of what ran. Tests that assert against them keep the old identifiers, with a comment saying why;
that is not staleness, it is the difference between the record and the current state.

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

### The bar is the law, and the old ladder was under it

**South Africa's national minimum wage is R30.23 per ordinary hour from 1 March 2026**, and
domestic workers have been at parity with the national minimum wage since 2024.

At the 35% starting commission — the worst rate any Xooter is on — the cheapest hour on each
ZD-020 ladder was:

| service | worst rung | gross/h | Xooter keeps | legal? |
|---|---|---|---|---|
| regular | 10h at R430 | R43.00 | **R27.95/h** | ❌ **below R30.23** |
| moving | 10h at R478 | R47.80 | R31.07/h | ✅ |
| airbnb | 7h at R372 | R53.14 | R34.54/h | ✅ |
| office | 10h at R660 | R66.00 | R42.90/h | ✅ |
| express | 3h at R220 | R73.33 | R47.67/h | ✅ |

So this was a compliance defect on the regular ladder, not a generosity question. The earlier
framing in this repo — that R27.95 was "close enough to the minimum wage that it has to be
checked" — understated it.

### The rule, and why R47 rather than R54

**From 5.5 hours up, gross is at least R47 per booked hour.** At 35% that returns **R30.55/h**.

A **R54/h** floor was implemented first, on the reasoning that it also satisfied Xoot's own
`MIN_XOOTER_HOURLY_CENTS` of R35/h. It was reverted the same day. It paid better, but it raised
the **8-hour large-home default by 16.8%** (R370→R432) and the 10-hour clean by 25.6% — a cost
carried entirely by customers, on the most-booked long job, at a stage where retention matters
more than margin. The founder chose the smallest rise that is still lawful.

R47 is dramatically narrower. **Only `REGULAR` moves, and only from 8h up:**

- 8h R370→**R376** (+1.6%) · 8.5h R386→**R400** · 9h R400→**R423** · 9.5h R416→**R447** ·
  10h R430→**R470** (+9.3%)

`AIRBNB`, `MOVING`, `OFFICE` and `EXPRESS` are untouched at every rung. That has a second benefit:
the two *unconfirmed*, transcript-derived ladders are back exactly as supplied, so there is one
thing to confirm rather than two — and **the Airbnb 7-hour `CONFIRM` returns to R372**, the
transcript's own value, rather than the R378 the R54 floor had produced.

Cutting commission instead was considered and rejected. It would make the same booking worth less
to Xoot the longer it ran, which is backwards; and commission is already a ladder that rewards
reliability, so bending it for duration would mean two unrelated things moving one number.

### ⚠️ This decision expires in March 2027

R30.55 is **1% above** R30.23. The national minimum wage has risen about 5% each March. **The
March 2027 increase will put this ladder below the legal minimum.**

That is an accepted trade, not an oversight — and it is enforced rather than noted.
`care-plus.test.ts` carries a test that **fails once the date passes 2027-01-31**, a month before
the increase and while the ladder is still legal. Its failure message says what to do: look up the
new rate, update `NATIONAL_MINIMUM_WAGE_CENTS` and `NMW_REVIEW_BY`, and raise
`LONG_JOB_FLOOR_CENTS_PER_HOUR` until the ladder clears it. **Not** simply push the date out.

A test that fails on a calendar date is normally hostile. It is right here because the alternative
is silently paying below minimum wage, with nothing but memory standing in the way.

### Two floors, deliberately different numbers

Keeping these apart is the thing most likely to be got wrong later:

| constant | value | what it is |
|---|---|---|
| `NATIONAL_MINIMUM_WAGE_CENTS` | R30.23/h | **The law.** Every rung of every ladder must clear it. |
| `MIN_XOOTER_HOURLY_CENTS` | R35.00/h | **Xoot's own rule** for who may co-fund a Care+ discount. |

After this change three ladders sit *below* R35 and above R30.23, and that is correct: a Xooter on
a long regular clean simply never co-funds a Care+ discount. `splitDiscount` takes nothing from
them and Xoot absorbs it.

### What enforces it

`LONG_JOB_FLOOR_CENTS_PER_HOUR` in `src/lib/xoot-pricing.ts`, mirrored in
`supabase/functions/_shared/pricing.ts` and pinned by `pricing-parity.test.ts`.
`xoot-pricing.test.ts` asserts the floor as an invariant over the ladders, that no rung fell, and
that every rung clears R30.23 at 35%. `care-plus.test.ts` holds the legal check and the dated
review guard.

## ZD-025 notes — what the first working Twilio self-test found

Recorded 2026-08-12. Not a decision so much as two measurements that change what "ready" means for
voice, both surfaced by `twilio-selftest.yml` the moment it first authenticated.

### ① Production's Voice Request URL does not route

```
staging     https://fxmxyabdjqviqbcxmvlp.functions.supabase.co/twilio-voice-twiml   routes
production  https://mvlrkelahhsyjrwgsxaf.supabase.co/twilio-voice-twiml             404
```

Supabase serves an Edge Function on `https://<ref>.functions.supabase.co/<fn>` or
`https://<ref>.supabase.co/functions/v1/<fn>`. Production's value is neither — the REST host with
the function name on the root. **A production call would connect and then die in silence**, which
is the single failure this self-test was built to catch. The **status callback has the same
defect**, so production would also have lost every call-status event.

Re-run at 19:29 with the tightened check, both defects now named with the exact string to paste:

```
FAIL voice TwiML app:       Voice URL names twilio-voice-twiml but is not a routable Edge
                            Function URL … Set it to
                            https://mvlrkelahhsyjrwgsxaf.functions.supabase.co/twilio-voice-twiml
FAIL voice status callback: … https://mvlrkelahhsyjrwgsxaf.functions.supabase.co/twilio-voice-status
```

Staging passes both.

#### ① resolved, and a wrong diagnosis on the way there

**Resolved 2026-08-12 21:40.** Production's TwiML App `APcfd1e30…`
("Xoot TwiML App Production") now serves
`https://mvlrkelahhsyjrwgsxaf.functions.supabase.co/twilio-voice-twiml` over POST, with a matching
status callback. Both environments are green on voice.

**The wrong diagnosis, recorded because the reasoning was seductive.** When the founder reported
setting the URL and gate 0 still failing, I inferred from measured data that the account holds two
TwiML Apps — same account SID, two different `voice_url` values, and one app has exactly one
`voice_url` — and concluded the wrong app was being edited.

The premise was right: there are exactly two apps, confirmed by the enumeration added in response.
**The conclusion was wrong.** The correct app was edited, the change landed, and the run that looked
like "still broken" was simply taken before the edit. A correct fact and a correct diagnosis are
different things, and a deduction that is airtight about the *world* can still be wrong about the
*sequence of events* — which is the part that actually mattered here.

**What was genuinely defective, and is fixed.** The check named a wrong value without naming the
object holding it. It said "the Voice URL does not route" in an account containing two candidate
apps, with no environment column, no stable ordering, and names differing by a trailing space. Even
though that was not what went wrong this time, it is unusable the moment it is — the same shape as ①
itself, one level up: ① matched a substring instead of the thing it cared about; this identified a
value instead of the object.

**A check a person cannot act on is not finished**, and "which one?" is part of the finding rather
than context the reader is expected to supply. Fixed by printing the app's SID and friendly name in
every branch, and by listing every TwiML App on the account with the selected one marked:

```
⚠️ 2 TwiML Apps on this account — edit by SID, not by name or list position.
APcfd1e30… "Xoot TwiML App Production" ← THIS PROJECT USES THIS ONE | AP2afeeb7… "Xoot TwiML App Staging "
```

Several apps is reported as informational, never as a fault. It is the expected consequence of ②,
and flagging a correct configuration as broken is how people learn to ignore a report.

#### The 403 hiding behind the 404, and why the check belongs in the self-test

Writing the "change these two Console URLs" instruction turned up a way it could have been wrong.
Both voice functions validate Twilio's HMAC against an override secret rather than the request:

```ts
// twilio-voice-twiml/index.ts:62 and twilio-voice-status/index.ts:81
const validationUrl = Deno.env.get("TWILIO_WEBHOOK_TWIML_URL") ?? req.url;
```

Twilio signs the URL it actually posted to. So correcting the Console URL has two outcomes: if the
override is unset the fallback matches and the fix is complete; if the override is set to the old
broken value, the request now *arrives* and is refused **403** — the call still dies, with a
different error and nothing in the log saying why. Same family as the two-Auth-Token-names bug:
fails closed, silent.

**Measured 2026-08-12 20:42 rather than assumed** — both overrides are unset on production, so the
Console edits are the whole fix. The instruction was right, but it was right by luck until checked.

The check now lives in `twilio-selftest` because that is the only place both halves are visible:
these are Edge Function secrets, unreadable from a session, and `verify-secrets.yml` reports names
only. It is the same argument as ① — the value has to be compared against reality, not merely
present.

One incidental finding worth keeping: production's `TWILIO_WEBHOOK_BASE_URL` holds the **correct**
origin while its Console URL did not. The secret was set properly and the Console was typed by
hand, wrongly — so the five non-voice webhooks that validate against that base were never affected.

It is a Twilio Console change, in `docs/release/voice-gates.md` §2c-0. No code fix reaches it.

**The check had passed this URL.** It asked `voiceUrl.includes("twilio-voice-twiml")`, which the
broken value satisfies. The predicate now lives in `supabase/functions/_shared/function-url.ts`,
verifies the URL's shape, and is unit-tested in `src/lib/function-url.test.ts` with production's
real value as the first case. The generalisation worth keeping: **a check written from an imagined
failure tends to match the imagination rather than the failure.** The empty-URL case was the one
imagined, and the empty-URL case is the one it caught.

### ② Staging and production share one Twilio account

Both report Account SID `AC93de1e…` and the same API key. `SECRETS_INVENTORY.md` forbids shared
credentials between environments, so this is a standing violation, and it is the reason gate 3 is
not free: every staging test call bills the live account and lands in its call logs.

The workflow previously printed *"compare the two Account SIDs above, they must differ"*. It now
compares them and fails the run. A rule that only a human can enforce is a note, not a rule — and
the first green run printed the same SID twice under a green tick.

This is founder-blocked: it needs a Twilio subaccount for staging with its own API key, TwiML App
and Conversations service. It is already item 6 in the list below.

## ZD-026 notes — the booking fee

### ✅ Live in production, 2026-08-12 22:12:20Z

| function | before | after |
| --- | --- | --- |
| `create-booking` | v15 | **v16** |
| `create-booking-request` | v13 | **v14** |
| `respond-zooter-job` | v12 | **v13** (unaffected by the diff; same batch) |

All three carry `updated_at = 1786572740555` — identical to the millisecond, so it was one
operation and §3b's "the two must go together" held. The deployed `create-booking-request` body was
read back and carries `BOOKING_FEE_CENTS`, `_shared/care-plus-membership.ts`, and the comment
*"`frequency` is deliberately not a term here"*.

Order was correct: `main` merged at 22:11, functions at 22:12:20 — client before server.

⚠️ **But the margin was about seventy seconds, and that is not enough.** Netlify builds on push and
takes minutes, so for a short window the new server charged R39 on a recurring booking while the
old client still showed R0 — the under-statement §3b exists to prevent. The window has closed and
it is unlikely any booking landed in it, but *getting away with it* is not the same as *the order
being safe*. §3b now says to wait for the Netlify deploy to report success, not merely to merge
first. The gate is the deploy going green, not the push.

### The rule

R39 is charged on **every** booking. Care+ membership is the only thing that waives it. Frequency
is not a term in the calculation on any surface, and there is deliberately no "has this user
already paid the fee on this recurring schedule" lookup — the rule has no such clause.

Founder, 2026-08-12: *"R39 is not and no longer a one-time fee client-side but rather a booking fee
for every booking made, which no apparent if the user is signed up to Care+"*, clarified when asked
about recurring visits specifically: *"booking fee is only incurred to users that aren't subscribers
to Care+."*

### What it costs a customer, stated plainly

A fortnightly non-member books 26 times a year and now pays the fee 26 times: **R1,014**. Care+ is
R99/month with the first month free (**R1,089**) and additionally takes 10% off every booking. The
fee is therefore the thing that makes the membership pay for itself, which is why it is charged on
every booking rather than once.

This is recorded so the consequence is on the record as *decided*, not discovered later in a
support ticket.

### The copy was already promising this

`docs/care-plus-paywall-copy.md` has said *"We waive the R39 booking fee on every booking — not
just your first"* since it was written, and `CarePlusPaywall.tsx` ships "No booking fee, ever." Both
sentences only mean something if a non-member pays the fee on every booking. So the code was the
half that was wrong, and under the CPA a promise to waive a charge that recurring bookings never
carried is a representation the system did not honour.

### What changed in code

`ONE_TIME_SERVICE_FEE_CENTS` → `BOOKING_FEE_CENTS` (and `..._ZAR` likewise). The rename is not
cosmetic: the old name encoded the superseded rule, and a constant that misstates the rule is how
this repo shipped its last two pricing defects.

One expression now, in five places:

```ts
const serviceFeeCents = isCarePlusMember ? 0 : BOOKING_FEE_CENTS;
```

`pricing-parity.test.ts` asserts that exact single-condition shape against both booking writers'
source, not merely that today's totals are right — a second term in the condition means the
one-time rule has crept back.

### `create-booking-request` is kept, not retired

Asked at the same time, since ZD-026 forced the question: the function has **zero callers**, so
"retire it" was on the table and would have removed a second thing that can drift. Founder chose
full Care+ parity instead — keep it, and make it price members identically.

Recorded because the reasoning does not survive on its own. A caller-less deployed function looks
like dead code to the next person who finds it, and the case for deleting it is genuinely good.
The case for keeping it is that it is authenticated, deployed and reachable by anything holding a
JWT, so *deleting* it is the outward-facing act and *aligning* it is the reversible one. Now that
both writers read one shared helper and the parity test asserts it, the drift argument for
deletion is substantially weaker than it was.

If it is retired later, the test's `BOOKING_WRITERS` list is the thing to shorten.

### Two pre-existing holes this closed

1. **`create-booking-request` had no concept of Care+ at all.** It charged every member the fee and
   never applied the 10% member discount. Nothing failed because no client calls it, but it is
   deployed and authenticated — a live second answer to "what does a member pay". Both writers now
   read `_shared/care-plus-membership.ts`, and the parity test asserts the shared import.
2. **Neither client price screen passed `carePlusMember` to the quote.** A member was shown R39 and
   then charged R0. Tolerable while the fee was one-time-only; under this rule it would have
   contradicted the paywall on every booking, on the last screen before payment. `BookingConfirm`
   and `Book` now resolve membership through `useCarePlus` and show the waived line explicitly.

## ZD-030 — The public site adopts the exported kit; the audited palette stays (2026-08-13)

**Decision, by the founder:** the website in this repository is the website. It keeps its content
and functionality and takes the Claude Design kit's appearance. Public surface first — roughly 15
routes; `/app`, `/xooter` and `/admin` are a later pass.

### The approval rule could not be satisfied as written

`design/README.md` says implementation "may only claim design approval when a frame is labelled
`APPROVED BY OWNER` and recorded in `approved-frames.json`", and that an empty registry means no
direction is approved. `approved-frames.json` is `{"frames": []}`.

That rule assumes a Figma project this repository does not have — there are no frames to label.
The founder's instruction is the approval; it is recorded here because a registry that cannot be
filled is not a gate, it is a stalled process, and pretending otherwise would have blocked the work
or been ignored silently. **If Figma frames are ever produced, they become authoritative over this
entry.**

### Four resolutions, each against a document that disagreed

1. **Type: the kit wins.** Newsreader (display) and Plus Jakarta Sans (body), from the export's own
   `--xoot-font-display` / `--xoot-font-core`. `DESIGN-SYSTEM.md` says Space Grotesk + DM Sans and
   is annotated as superseded. Shipped as subset variable WOFF2, 73 KB total.
2. **Shape: the kit wins.** `DESIGN-SYSTEM.md` caps cards at 8px; the export honours that nowhere
   and ships a scale of 10/14/16/20/26/34. Per `design/README.md`'s own precedence note the export
   is the newer authority. Annotated, not silently contradicted.
3. **Colour: neither the kit's raw values nor a redesign — the audited `:root` palette stays.**
   This is the one that runs the other way, and it is the important one. The `:root` block is not a
   rival to the kit; it *is* the kit, re-measured, with four colours darkened because the raw
   values fail WCAG AA for body text: brand violet-500 4.38 → violet-600 6.10, care-plus 53% → 51%,
   destructive 56% → 48%, success 43% → 35%. "Adopting the design system" by repointing
   `@theme inline` at `--xoot-*` is an accessibility regression that reads as progress in a diff.
   `src/lib/theme-consumes-audited-palette.test.ts` fails on it.
4. **Numbers: the code wins, always.** The export's data module asserts *"Prices are the locked
   commercial values"* and encodes `serviceFeeRecurring: 0` — the rule ZD-026 replaced.
   `locked-commercial-facts.md:44` strikes it through; `xoot-pricing.ts` charges the R39 on every
   booking unless the customer is Care+. **The kit supplies appearance; `xoot-pricing.ts` supplies
   every number.** `src/lib/marketing-claims.test.ts` enforces it.

### What the numbers rule found immediately

Eleven hardcoded rand figures on public pages, including `CarePlusApply.tsx` writing the
minimum-wage-linked placement floors by hand in five places while `care-plus.ts` exported the
constants and said in its docstring that they were there "for `CarePlusApply` to cite". Also a
non-refundable R399 admin fee charged to consumers with no constant and no locked-facts entry —
raised as NEEDS-FOUNDER item 4 rather than blessed by being typed into a file.

## ZD-031 — The Care+ placement product is retired (2026-08-13)

**Decision, by the founder:** Xoot no longer offers Care+ placement — sourcing a domestic worker
for a household on standing days, with a R399 non-refundable admin fee. Raised as NEEDS-FOUNDER
item 4 (a consumer charge authorised by no document); answered by ending the product rather than
by documenting the fee.

### What was removed

| surface | change |
|---|---|
| `src/pages/care/CarePlusApply.tsx` | deleted |
| `/care-plus/apply` | **redirects** to `/care-plus`, not removed |
| `native-routing.ts` | `care_plus_apply` host and route dropped; retired-route map added |
| `notification-routing.ts` | route dropped from the exact-match set |
| `care-plus.ts` | `PLACEMENT_MIN_HALF_DAY_CENTS`, `PLACEMENT_MIN_FULL_DAY_CENTS`, `PLACEMENT_ADMIN_FEE_CENTS` and the two deprecated `MIN_XOOTER_PAY_*` aliases deleted |
| `activate-care-plus` | handler removed; `action: "placement_application"` now returns **410 Gone** |

### Three choices worth the words

**The route redirects rather than 404s.** Links to it do not vanish with the product: push
notifications already delivered, installed app builds carrying the old deep-link table, bookmarks,
emails. A dead end explains nothing, so both the web route and the native resolver send those
people to `/care-plus`.

**The Edge Function rejects explicitly instead of losing the branch.** A stale client can still
POST `action: "placement_application"`. Without a check the request would fall through to the
subscription path below it, where a body carrying an `application` object and no payment reference
would be treated as a Care+ activation attempt. A retired endpoint must fail loudly, not do
something adjacent. 410 rather than 400 — the request is well-formed and was valid until the
product ended.

**The constants are deleted, not left as unused exports.** These exact figures had already caused
one defect: they were wired into `splitDiscount` as a per-booking floor via `hours >= 6 ? full :
half`, which treated a 5.5-hour clean as half a day and demanded R220 for it. A day rate sitting
in scope beside booking arithmetic invites that mistake; a dead export with no product behind it
invites it more. `MIN_XOOTER_HOURLY_CENTS` is now the only floor.

### Data is retained

`care_plus_applications` and its rows are untouched. **Anyone who applied before the product ended
is still in the support queue and still owed an answer** — the retirement does not close their
request, and nothing in this change notifies them.

### One guard proved itself immediately

`marketing-claims.test.ts` had shipped hours earlier with an assertion that its own allowlist
contained no stale entries — written on the theory that allowlists rot. Its single entry pointed
at copy on the placement form. The retirement made it stale the same day, and the assertion caught
it rather than leaving a permission behind for a page that no longer exists.

## ZD-032 — The accent family moves to the kit: ink commits, violet emphasis (2026-08-13)

**Founder:** *"It doesn't look coherent with the app."* Correct, and this is why.

### The site was violet in its tokens and terracotta on screen

ZD-024 migrated the *semantic* tokens to the kit — `--primary` became ink, `--brand` became
violet-600, red was confined to Care+. What it did not migrate were the **gradients and the
accent family**, and those are what actually painted the product:

| | the kit (`design/README.md`) | what rendered |
|---|---|---|
| primary commit button | ink `#151515` (`--xoot-action-primary`) | `gradient-warm` — terracotta, on 34 buttons |
| brand emphasis | violet `#7C5CFC` | **`bg-brand` 0 uses, `border-brand` 0, `text-brand` 2** |
| green | `--xoot-sage-500` `#3AA075`, the *success* semantic | `--sage` `#7FA86B`, olive, 157 uses as decoration |
| terracotta | **not in the kit at all** | `--terracotta` + 58 `gradient-warm` surfaces |

`index.css` had even labelled these "Superseded: terracotta/sage/cream" while still rendering
them. The kit's defining colour was absent from the product it defines.

### What changed

- **`--gradient-warm` → violet**, built violet-600 → violet-700 rather than the kit's own
  `--xoot-grad-violet`. That gradient (`#A38FF7` → `#7C5CFC`) is a light violet intended to sit
  *under dark text*; every surface here carries white, and white on violet-500 measures **4.38** —
  the same AA failure that darkened `--brand` in the first place. 600 → 700 gives **6.10 → 8.46**.
- **34 primary buttons lost `gradient-warm`**, which was an override defeating `Button`'s default
  `bg-primary text-primary-foreground` — already ink, already `--xoot-action-primary`, 18.26:1.
  The README's "ink as the primary commit button, the Tiimo pattern" was one class away the whole
  time.
- **`--sage` → the kit's teal** `#3AA075` / `#1B6246`. Contrast on the page improves **4.93 →
  6.54**. In the kit sage is `--xoot-success`, not decoration; the site's use as a general accent
  is a separate cleanup.
- `--shadow-warm` re-tinted to the brand it now sits under, rather than to the retired terracotta.

`--terracotta`, `--terracotta-light` and `--cream` are left **defined but unused**, so a stray
reference cannot break the build. Nothing should consume them.

### Not covered by a test, and worth knowing

`src/lib/design-tokens.ts` mirrors `:root` for React Native but does **not** carry sage,
terracotta or the gradients, so `design-tokens.test.ts` did not object and could not have caught
the divergence either. The contrast figures above were computed by hand against the page colour;
`design-contrast.test.ts` covers the semantic roles, not the accent family. Extending it is the
obvious follow-up.

## ZD-033 — Guard the derivation, and pair each tint with its own ink (2026-08-13)

The two follow-ups ZD-032 named and did not do.

### The palette now has to prove it came from the kit

`design-contrast.test.ts` proved the palette was *readable*; `design-tokens.test.ts` proved the CSS
and the native mirror *agreed with each other*. Neither asked whether it was still the kit's
colour — which is how terracotta painted 58 surfaces for months while the tokens beside it said
violet. Every test passed throughout, because each compared the palette to itself.

`palette-derives-from-kit.test.ts` names the `--xoot-*` ramp each semantic derives from and asserts
two things:

- **hue within 4°** — measured deltas across the table are ≤ 1.3°, so the tolerance is three times
  the worst real case, and terracotta (14°) could never pass as coral (7°);
- **never lighter than the kit, in the light scheme only** — because darkening is how four roles
  clear AA (`success` −7.7%, `destructive` −7.7%, `care-plus` −2.1%, `brand` taking violet-600 over
  a violet-500 that measures 4.38), and lightening is the regression.

The dark scheme is hue-only: a brand colour on a near-black page *must* go lighter, so a ceiling
there would be wrong rather than strict.

### The kit pairs every tint with its own ink

`--xoot-honey-wash` with `--xoot-honey-ink`, `--xoot-sage-wash` with `--xoot-sage-ink`. **43 places
rendered sage green on an amber wash.** It passed contrast at 6.60 by accident, not by design.

`--accent-ink` is the amber's own ink (`#94600E` light, `#F7D290` dark) and is mirrored in
`design-tokens.ts` rather than exempted — the mirror guard caught the omission immediately, which
is the guard working.

⚠️ **Contrast on the wash goes 6.60 → 4.70.** Above the 4.5 body floor, and *thinner than the
mismatch it replaces*. That is a real trade made for family coherence, stated here rather than
discovered later.

### Sage means success again — and less changed than expected

The plan assumed ~99 decorative sage uses needed moving. Reading them showed otherwise: `ShieldCheck`
(10), `CheckCircle` (7), `LockKeyhole` (3), the `verified` trust badge and the sensitive-field
in-window indicator are **success semantics, and sage is the kit's success colour** — those are the
kit used correctly.

Only **10 section eyebrows** were genuinely wrong: "What's included", "Value pillars", "Nearby
Xooters" and similar wearing the success colour as decoration. Those are now `text-brand` (violet
on page 5.49, on card 6.12). 79 sage uses remain and 38 sit beside a sage fill or a check/shield
icon; the rest are status text where green still reads correctly.

## ZD-034 — The large-surface gradient is ink; violet keeps emphasis (2026-08-15)

The founder said the palette still bothered them after ZD-032. Rather than argue it in prose, the
same page was built three times and screenshotted at 1440px — the kit's violet, the retired
terracotta, and an ink-led variant. The founder chose ink.

`--gradient-warm` is now `hsl(20 8% 16%) → hsl(20 10% 9%)`.

### This is a departure from the source of truth, and it is narrow

`design/README.md` is the design authority (founder, 2026-08-13) and it says: violet for brand
emphasis, selection and progress, ink as the primary commit button — the Tiimo pattern. Three of
those four roles are **untouched**: `--brand` is still violet-600, and selection, focus rings and
progress emphasis still resolve through it.

What moved is `gradient-warm`, which is not an emphasis token. It paints **29 large surfaces** —
page-width CTA bands, hero panels, logo tiles, the booking progress rail. At that size a brand
colour stops reading as emphasis and becomes the page's own colour, which is the effect the Tiimo
pattern exists to avoid. Ink at that size is the pattern followed through, not abandoned.

### Measured

White text sits on every one of those 29 surfaces.

| stop | contrast with white |
|---|---|
| `hsl(20 8% 16%)` (light end) | **14.6:1** |
| `hsl(20 10% 9%)` (dark end) | **17.9:1** |
| *was* violet-600 → violet-700 | 6.10 / 8.46 |

Both passed; this passes by roughly twice the margin.

`--shadow-warm` follows the surface it sits under — `hsl(20 30% 12% / 0.38)` rather than a violet
glow, which under an ink tile reads as a colour fringe rather than a shadow. Alpha raised 0.30 →
0.38 because a neutral shadow at the old alpha disappears against the warm page.

### Guarded, because this is exactly the token that drifted before

`--gradient-warm` is not a semantic token, so ZD-033's derivation table did not cover it — and it
is the token that painted terracotta for months while everything around it said violet.
`palette-derives-from-kit.test.ts` now pins **both halves** of the split: the gradient stops must
stay near-neutral (saturation ≤ 15%) and dark (lightness ≤ 25%), *and* `--brand` must stay
chromatic (saturation > 40%). The failure mode is collapsing to one colour for everything, in
either direction. Planted both ways — violet gradient, ink brand — both failed. Restored.

## ZD-035 — A crew finishes one job faster; it is not N jobs (2026-09-03)

**Founder decision, 2026-09-03**, taken on the Claude Design handoff at
`design/handoff-2026-09-03/`. Adopts the design's crew model over the one now live.

### What changes

| | Live today | ZD-035 |
|---|---|---|
| What "2 Xooters" sells | Two people each working the full duration — **twice the labour** | Two people **splitting one job**, finishing sooner |
| Price | `base × count`, less 10% at ≥3 | `base × crewOverhead[n−1]`, `[1, 1.15, 1.25, 1.4]` |
| Elapsed time | Unchanged | `soloHours × overhead / n` |
| Max crew | 5 | 4 |
| Available on | `airbnb`, `office`, `moving` | those **plus `express`, and regular via size caps** `{small:2, medium:3, large:4}`; `laundry` fixed at 1 |

**Worked example — 5.5h Airbnb turnover, base R342, 2 Xooters:** R684 today, **R393** under ZD-035.

**Neither number was wrong.** Both are **R62 per labour-hour** — the identical rate. They differ
only in how much labour the phrase "2 Xooters" sells. The live model reads it as *more work*; ZD-035
reads it as *the same work, sooner*, which is what an Airbnb host wants when a check-in time is
fixed.

Laundry stays capped at 1 in every size: it is machine-bound, and a second person cannot make a wash
cycle finish sooner.

### ⚠️ What this costs, stated plainly

- **Revenue per crew booking falls sharply** — 43% on the worked example.
- **Two Xooters split ~57% of a solo job's value** for roughly half the elapsed time each.
  Consistent per hour, lower per job. Anyone recruiting Xooters on crew work must not describe it
  as two full jobs.

### 🛑 This is a schema change, not a constant swap — and that was not obvious

`create-booking/index.ts` builds `bookingTargets = selectedXooterIds.length ? selectedXooterIds :
[null]` and **inserts one `bookings` row per Xooter**, each priced as a whole job and each carrying
its own commission rate. The data model *is* the old commercial model.

ZD-035 is one job with a crew, so it needs either a crew/assignee relation or one row whose
subtotal is split across N Xooters at their individual rates. Everything reading `bookings` on the
assumption of one Xooter per row is in scope: the Xooter job list, tracking, earnings, ratings and
the replacement flow.

⛔ **Not implemented.** Sequenced in `docs/implementation/design-port-plan.md` Phase 3, migrations
before functions (§3a), web before the booking writers (§3b), and **every function importing
`_shared/pricing.ts` must be redeployed** or it keeps its own frozen copy.

---

## ZD-036 — The R100 referral is built server-side or not at all (2026-09-03)

**Founder decision, 2026-09-03.** The design's two-sided referral is adopted, and is built with the
credit resolved on the server.

**The programme:** R100 to the referrer as credit, R100 off the referee's first booking, shown as a
named line on the quote — *"Thandi's invite"* rather than "Discount", which is the point of a
referral appearing on a receipt.

### 🔴 Why it could not ship as designed

`design/handoff-2026-09-03/xoot/referral.js` refuses self-referrals, refuses existing customers, and
burns the code on redemption. Every one of those guards runs **in the browser**, which makes them
suggestions.

With no server counterpart the site renders **−R100** and `create-booking` charges **R100 more than
displayed**. Under the CPA the displayed price is the price, and this is the **under-stating**
direction — the side this repo has already crossed three times and the side that is not survivable.

### What "properly" means

1. A `referrals` table — code, owner, issued-to, state, burned-at, booking id — with RLS so a user
   reads only their own rows.
2. Validation **inside the booking write**, in one place: the code exists, is not the buyer's own,
   is unburned, and the buyer has no completed booking.
3. The credit applied server-side, so the discount on the quote is one the server produced.
4. Funded from **commission, never Xooter pay** — `DISCOUNT_FUNDING`, already the rule here.

### ⚠️ The commercial caveat, recorded because it is not an engineering question

R100 against a ~R335 first clean is roughly a third off, funded by Xoot. `referral.js` argues it
pays back through first-visit-to-second-visit conversion — **a rate Xoot cannot measure, because
zero bookings have completed.** The amount is worth revisiting once there is a repeat rate to divide
by; the founder was offered a smaller figure and kept R100.

⛔ **Not implemented.** Port plan Phase 3.

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

## ZD-037

**The pricing conflict is closed. The cheaper ladder is the locked truth.**
Decided by the founder, 2026-09-03.

### What the conflict actually was

`locked-commercial-facts.md` carried a §Current Pricing Conflict that had blocked every marketing
draft from stating a price for weeks. **It named numbers that existed nowhere.** Measured on
2026-09-03 by calling `basePrice('residential', hours)` directly:

| Source | Small (4h) | Medium (5.5h) | Large (8h) |
|---|---|---|---|
| The locked table | R280 | R325 | R400 |
| The conflict section's claim about the code | R270 | R315 | R390 |
| **What the server actually charges** | **R250** | **R296** | **R376** |

Three sets of numbers, none agreeing. The section described a code state that had not existed since
`eb5401e`, when `create-booking` stopped carrying its own `homeSizes × serviceMultiplier` table and
started pricing off `_shared/pricing.ts`.

⚠️ **This is why it went unresolved.** A conflict stated in wrong terms cannot be settled by the
person who has to settle it. The founder was being asked to choose between two numbers, neither of
which was what customers would have been charged.

### The decision

**The ladder in `_shared/pricing.ts` is canonical.** `locked-commercial-facts.md` now records
R250 / R296 / R376. ⛔ **No code changed** — the document was corrected to the code, not the other
way round, because the code is what takes the money.

Founder's reasoning, verbatim: *"Use the cheaper pricing ladder for now as we will eventually
increase the prices as time progresses."*

### What this unblocks

✅ **Marketing may state prices.** The price ban across ~55 drafts, the ad matrix, and every video
script is lifted. The permitted set is exactly: **R250 / R296 / R376**, R39 booking fee, R30 add-on,
R22 cover, R99 Care+ — and the full per-hour ladder for anything longer or shorter.

⚠️ **Any other number remains a violation.** Under the CPA the displayed price is the price, and
this repo has shipped a screen showing one price while charging another **three times**.
`pricing-parity.test.ts` is what stops the fourth.

### Two things this decision does not do

⛔ **It does not touch the R47/h long-job floor.** That floor exists because a 10-hour regular clean
returned R27.95/h, below the national minimum wage, at the 35% starting commission. A future price
rise must keep every rung above it. A future price *cut* is bounded by it.

⚠️ **It does not make these prices permanent, and the intent is explicitly that they rise.** So any
asset with a long life — the brand documentary, an evergreen blog post, anything printed — should
say **"from R250"** rather than baking in a number that is planned to change. A raise goes through a
new decision-log entry.

## ZD-035 — addendum, 2026-09-03: shape chosen, price held

Two decisions the founder made on ZD-035, recorded so neither is re-litigated by a later session.

### 1. Schema shape: **(a) the `booking_assignees` relation**

`NEEDS-FOUNDER.md` §8 offered (a) a `booking_assignees` relation or (b) one priced row plus
zero-value participant rows. **(a) is chosen.** The table is already applied to staging by
`20260903120000_zd035_crew_and_zd036_referrals.sql` — RLS on, `revoke all from anon, authenticated`,
service_role only, `unique (booking_id, xooter_id)` so a retry cannot double-assign.

### 2. ⛔ The crew price is NOT wired, and that is deliberate

Measured against the live model (`base × count`, −10% at three or more):

| crew | live model | ZD-035 overhead | delta |
|---|---|---|---|
| 2 | 2.00× | 1.15× | −43% |
| 3 | 2.70× | 1.25× | −54% |
| 4 | 3.60× | 1.40× | **−61%** |

**Wiring it would cut a four-Xooter booking by 61%.** That is a locked commercial fact, and locked
facts move only through a decision-log entry. The founder chose to keep the current revenue and
leave the schema ready.

⚠️ **`crew_size` is also left unwritten by `create-booking`, for a subtler reason.** Under the
row-per-Xooter model every new `bookings` row **is** a solo job, so stamping a crew size would
record a number the price does not reflect. The column's default of 1 is already the true answer.

⛔ **Two absence guards enforce this and must not be deleted casually:**
`src/lib/pricing-parity.test.ts` (`quote()` still uses the live model) and
`src/lib/referral-wiring.test.ts` (`create-booking` mentions no crew symbol). They exist because
"finish the port" is the obvious next instinct and it is the one part that must not be finished
quietly.

**To wire it later:** a new decision-log entry, `locked-commercial-facts.md` updated, both guards
deleted in the same change, every reader that assumes one `bookings` row per Xooter rewritten (job
list, tracking, earnings, ratings, replacement, payout), then `create-booking`,
`create-booking-request` and `respond-xooter-job` redeployed.

## ZD-038

**Gift prices come from the ladder. The gift page was quoting a ghost.**
2026-09-04.

### What was wrong

`src/pages/app/GiftClean.tsx` — **routed at `/app/gifts`, in the nav and in the omnibox** — and
`supabase/functions/ops-workflow/index.ts` each carried their own copy of:

```js
const servicePrices = { residential: 270, deep: 365, airbnb: 315, premium: 420, moving: 455 };
```

⚠️ **None of those five numbers exists in `_shared/pricing.ts`.** And **270 and 315 are two of the
exact phantom prices ZD-037 established had never been charged by anything** — the gift page was
quoting the ghost ladder out of a document that was itself wrong, months after the code stopped
using it.

⛔ **`pricing-parity.test.ts` never covered gift**, so a shipped, routed page displayed prices no
other surface would honour and nothing failed. Under the CPA the displayed price is the price, and
this repo has now shipped a screen showing one figure while charging another **four** times.

### The fix

`GIFT_HOURS` and `giftPriceCents()` in `_shared/pricing.ts`, mirrored in `src/lib/xoot-pricing.ts`.
A gift buys a whole clean, so it needs a duration; the price then comes from the real ladder like
every other surface.

| Service | Hours | Price |
|---|---|---|
| residential | 4 | **R250** |
| deep | 5.5 | **R296** |
| premium | 8 | **R376** |
| airbnb | 4 | **R304** |
| moving | 4.5 | **R320** |

⚠️ **`giftPriceCents` returns `null` for a service nobody priced, and `ops-workflow` fails the
request rather than defaulting.** A silent default amount is how a wrong number reaches a customer.

⚠️ **A gift is priced on the work only** — no booking fee, no cover, no add-ons, no multi-Xooter
discount. That is why the client helper reads the ladder directly instead of calling `quote()`,
which would attach lines a gift does not include.

### The guard

`src/lib/gift-pricing-parity.test.ts` — six assertions. It pins client to server, pins both to the
ladder, requires a `null` refusal for an unpriced service, and **fails if either writer reintroduces
a literal rand figure or the identifier `servicePrices`**. Proved by planting the exact table that
shipped and by drifting a client duration; both failed before restore.

### ⛔ What this does NOT do

**It does not make gifting work.** There is still no redemption path — nothing sets `paid`, `sent`
or `redeemed`, nothing writes `redeemed_at`, and the recipient is never notified. This change makes
the *price* honest; the *product* is still capture-only and waits on a founder decision about gift
economics and **CPA s63** voucher expiry. ⛔ **No marketing may show a gift being received.**
