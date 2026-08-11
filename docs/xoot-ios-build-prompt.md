# Prompt — Build the Xoot app from the UI kit, to production

Copy everything between the rules into a session. It is written to be handed over cold:
it names the files, resolves the decisions that were open, and describes the mistakes that
are already known so they are not made a second time.

Supersedes the earlier version of this file, which asked which palette wins. That question
is now answered — see "What source of truth means".

---

## THE PROMPT

`design/Xoot_App.html` is the **source of truth** for the Xoot app. Build the app from it,
in React Native (Expo SDK 56), to a standard where a signed build can go to the App Store
and hold up under real use by around 100,000 South African households.

### What source of truth means

**The kit wins on form. The brief wins on fact.**

The kit is authority for everything about how the app looks and behaves as an artefact:
screen inventory, layout, hierarchy, component anatomy, spacing, type scale, colour, radius,
elevation, motion timing and easing, iconography, empty and loading states, copy tone.
When the kit and the shipped code disagree about any of those, **the kit is right and the
code changes.**

The kit is not authority for anything the app has to be *true* about. It is a rendered
happy path — it does not know the pricing ladders, that a Xooter must not see a tip before
rating, that `bookings.price` is server-authoritative, or that the Care+ credit is one-time
rather than monthly. For those, `docs/xoot-master-brief.md` and
`docs/implementation/decision-log.md` win, always, and a pretty screen that states a false
fact is a defect, not a design.

Two consequences to act on immediately:

1. **The palette changes to the kit's — and it is not the change it first looks like.**
   The kit's UI colour is **violet**, `--xoot-violet-500` `#7C5CFC`, carrying brand
   emphasis, selection and progress. The primary commit button is **ink**, `#151515`, the
   Tiimo pattern — the kit says so beside the token: "Xoot's commit button is INK, the
   Tiimo way; violet carries selection, progress and brand emphasis." The page is warm
   neutral, `#F5F3F2`. Coral `#E64B36` is one of the pastel tint-set colours, not the
   brand.

   **Red is not deleted; it is scoped.** The kit keeps a full red family and reserves it
   for one product: "Care+ · the MEMBERSHIP red. Xoot's UI is violet; Care+ is red,
   always. Use only for subscription surfaces: badge, paywall, the '+' mark, plan
   savings." `--xoot-careplus-500` is `#E63329`, which is within a hair of the shipped
   `#e42a21`. So the company red survives as the membership colour, and `--zoey-fill`
   stays a separate token so the mascot can hold her own red independently of both.

   **The default scheme flips too.** The kit is light by default with a
   `[data-theme="dark"]` opt-in that redeclares semantic aliases only, never the palette.
   The native app is currently pinned dark (`userInterfaceStyle: 'dark'`, splash
   `#15100f`). Moving to light-default means changing `app.config.ts`, the splash
   background, and the generated launch screen together —
   `src/lib/ios-build-setup.test.ts` already pins the rule that the launch screen must
   match the scheme the app is pinned to, and it will fail if you change one without the
   other. Re-run `npm run icons:render` afterwards.

   Make all of it true in `src/index.css` and nowhere else: `src/lib/design-tokens.ts`
   mirrors it under test, `mobile/src/generated/` is synced from that by
   `npm run shared:sync`, and `native-design-system.test.ts` fails the build on any raw hex
   in `mobile/src`. Record it in the decision log as superseding the red/white direction.
2. **Any price, benefit, or availability claim rendered from the kit's example content is
   wrong until proven otherwise.** Copy the layout, not the number. Numbers come from
   `supabase/functions/_shared/pricing.ts` through the existing parity test.

### Where everything is

- **Repo:** `zoot-your-local-helpers`, branch `claude/xoot-ios-build-setup-0te1sl`.
- **Native app:** `mobile/` — Expo Router, TypeScript, Reanimated 4, react-native-svg.
- **The kit:** `design/Xoot_App.html`, a self-extracting bundle. Unpack it per
  `design/README.md`; do not read it whole, it is 2.9 MB on one line. Each entry in the
  JSON asset map is base64-encoded gzip:
  ```python
  import base64, gzip, json
  for key, entry in json.loads(asset_map_line).items():
      raw = gzip.decompress(base64.b64decode(entry["data"]))
  ```
  26 assets: 7 authored app modules with readable header comments, three vendor bundles,
  and **7 embedded TTF fonts** — the real files, so nothing needs licensing or
  substituting: Newsreader Regular and Italic (`--xoot-font-display`), Plus Jakarta Sans
  Regular and Italic (`--xoot-font-core`), DM Mono Regular and Medium
  (`--xoot-font-mono`), and Caveat Regular (`--xoot-font-script`).

  Two things follow from that list. **Newsreader is the display serif, with Georgia only
  as its CSS fallback** — which is the right call, because Georgia is a system font that
  cannot be embedded in an app bundle, and Newsreader is an open serif built for screen in
  the same register. The brief records Georgia as the display face on the founder's
  instruction; Newsreader is how that instruction survives contact with licensing. Say so
  rather than silently substituting. And **Caveat is a cursive face**, which is the
  typeface the deferred "Xoot written in cursive, animated as handwriting" idea needs —
  it does not have to be sourced any more, only converted to a stroke path.
- **Read before writing code:** `docs/xoot-master-brief.md` (product, pricing, decisions),
  `docs/implementation/decision-log.md` (ZD-001…ZD-023 and why things are as they are),
  `docs/xoot-production-readiness-prompt.md` (the data-handling bar),
  `blocker.md` (what is actually blocked, verified live on 2026-08-02).

### What the kit contains

197 components across 35 screens. The ones that define the product:

| Area | Screens |
|---|---|
| Home | `TodayScreen`, `CalendarScreen` — serif weekday, week strip, nudge widgets, time-of-day sections |
| Booking | `BookingFlow` → service, home details, when, pro, confirm |
| Live visit | `TrackingScreen`, `VisitScreen`, `CallScreen`, `ChatScreen`, `RateScreen` |
| Account | `AccountScreen`, `ProfileScreen`, `HomeEditScreen`, `InvoicesScreen`, `PrivacyScreen`, `NotificationsScreen` |
| Care+ | `CarePlusJoinScreen`, `CarePlusManageScreen`, `CarePlusPayment` |
| Rewards | `RewardsScreen`, `CredScreen`, `ReferScreen` |
| Xooter side | `XooterHomeScreen`, `XooterEarningsScreen`, `XooterGrowthScreen` |
| Entry | `SplashScreen`, `AuthScreen`, `OnboardingFlow`, `LoginFlow`, `PhoneFlow`, `SsoFlow` |
| Assist | `ConciergeScreen`, `SiriScreen`, `WidgetsScreen`, `SearchScreen` |

197 components is not 197 React Native components. Build the primitives the kit is made of
— `Button`, `Card`, `Sheet`, `ChipGrid`, `DockedCTA`, `Badge`, `Avatar`, the list rows —
onto the token layer, and derive the rest. A flat port of 197 files is the wrong shape and
will not be maintainable.

Port the **motion tokens** with the colour ones: `--xoot-dur-instant|fast|base|slow|breathe
|bloom|story|icon`, `--xoot-ease-out`, `--xoot-ease-in-out`. They are why the kit feels the
way it does and they are the first thing lost in a hand translation.

### The foundation that already exists — build on it, do not replace it

- **Design tokens** — `src/lib/design-tokens.ts`, mirrored from `index.css` under test,
  synced to `mobile/src/generated/` by `npm run shared:sync`.
- **Splash** — `mobile/src/components/splash-animation.tsx` plays the Zoey choreography
  natively from `src/lib/splash-choreography.ts`, the same module the Remotion video and
  the web splash read. Three renderers, one definition (ZD-022). Keep it that way. If the
  kit's `SplashScreen` differs, change the choreography module, not one renderer.
- **Brand assets** — `npm run icons:render` regenerates every launcher and launch-screen
  image from the mascot. Re-run after any change to her or to the palette.
- **Native launch rules** — `mobile/src/lib/native-launch.ts` owns the deep-link bypass and
  the Reduce Motion / Low Power gate. Route new launch behaviour through it rather than
  adding a second opinion.
- **Sign in with Apple** — native sheet, `mobile/src/lib/apple-auth.ts`. Required by Apple
  Guideline 4.8 because Google sign-in is offered. Never route it through a browser.
- **Claim gating** — `src/lib/tipping.ts` shows the pattern: a readiness constant, and a
  test that fails if the UI makes the promise before the constant says the system can keep
  it. Use it for anything the kit shows that the backend cannot yet do.

### Rules that are not negotiable

1. **No secret in the client.** `npm run security:scan` and `npm run build:artifact-scan`
   enforce it. Never add an exception. If you find a hardcoded secret, flag it — do not
   work around it.
2. **RLS is row-level, not column-level.** A sensitive column on a table someone can
   already read is readable by them, whatever the app shows. This has bitten once
   (ZD-023). Sensitive data gets its own table.
3. **Money is integer cents and server-authoritative.** The client displays a price; it
   never determines one. Note `bookings.price` is `numeric` in rands — that mismatch is a
   live hazard, not a style preference.
4. **No claim the system cannot honour.** Consumer Protection Act: a price or benefit shown
   in the app is a legal representation, not marketing.
5. **The gate is `npm run verify` plus `npm run mobile:typecheck`.** Both green before any
   commit. They pass today; keep them passing. If a test fails, fix it — do not wait to be
   asked, and do not weaken the test to make it pass.
6. **Verify by running, not by reading.** Four splash defects were only visible in a
   rendered frame; two iOS faults only in `expo prebuild` output. Without a Mac,
   `npx expo prebuild --platform ios` and `npx expo export --platform ios` are the checks
   available — run both.
7. **A duplicated definition is only safe with a test proving it is still a duplicate.**
   See `shared-native-sync.test.ts`, `design-tokens.test.ts`.
8. **Every tunable is a named constant at the top of its module** (ZD-021), and comments
   explain why — especially why not the obvious alternative.

### Known traps, already paid for once

- `react-native-svg` has **no filter support**. The blurred glow that makes the splash
  stars readable on cream does not port; use a `RadialGradient`. Concentric copies produce
  a hard bullseye ring — that was tried, it looked wrong.
- Metro cannot resolve files outside its project root. `watchFolders`, `resolveRequest`,
  and `EXPO_USE_METRO_WORKSPACE_ROOT` all fail with "Failed to get the SHA-1". The working
  answer is the generated-copy pattern already in place.
- `mobile/src/generated/` must stay committed. EAS runs `npm ci` and bundles; it never runs
  mobile's `prestart`.
- `userInterfaceStyle` and a dark splash variant cannot both be set — `expo prebuild` warns
  the combination stops the splash working entirely.
- Regex-driven colour migrations break quoted strings and JSX attribute values. If you
  rewrite colours mechanically, consume the quotes and re-add the braces.

### What "production ready" means here, specifically

This app holds **gate codes, alarm details, access instructions, and the hours a house is
empty**, plus Xooter ID documents and banking details. A breach is a home-invasion kit, not
a leaked mailing list. Before building any screen, ask what it lets someone learn about when
a house is empty and how to get into it — if the answer is "something", it needs an access
rule before it needs a layout.

For submission and for 100k users:

- Every screen works at the largest Dynamic Type setting and with VoiceOver.
- 44pt minimum tap targets (`MIN_TAP_TARGET`; the kit's own `--xoot-hit-min` is 48px, so
  take the larger), WCAG AA contrast, reduced motion respected — the kit ships a
  `@media (prefers-reduced-motion:reduce)` scope, so honour it rather than reinventing it.
  Re-check AA after the palette change: violet-on-warm-neutral and ink-on-warm-neutral are
  different contrast problems from red-on-white, and some pairs that passed will not.
- Offline and slow-network states on every screen that loads data. South African mobile
  data is expensive and patchy; a spinner forever is the default failure mode.
- No placeholder copy, no lorem, no dead links. App Review opens the least important screen
  you have.
- Privacy nutrition labels answered truthfully, which depends on the legal items in
  `blocker.md`.

### Work the blocker ledger as you go

`blocker.md` was reconciled against the live projects on 2026-08-02 and is unresolved-only.
Treat it as part of the task, not as background reading:

- When something in it stops being true, remove it and note it under "Closed at review".
- When you find something newly blocked, add it with the evidence and the date.
- Do not mark anything closed on inference. The last review closed items only against live
  Supabase advisor, migration, and function listings.

Two items in it are yours to fix in code, not the founder's to decide:

- **The booking price hole.** `20260730083000_booking_price_author_guard.sql` is written and
  unapplied. Until it is applied, any customer can PATCH their own booking price to zero and
  any assigned Xooter can raise the price of a job they are working. It has a deliberately
  early timestamp so it can ship ahead of the ZD-005 schema decision.
- **Six production Edge Functions have no source in this repo** —
  `sensitive-access-read`, `sensitive-access-save`, `twilio-token`, `twilio-conversation`,
  `twilio-voice-status`, `twilio-voice-twiml`. The first two touch gate and alarm codes; the
  last two are publicly invocable. Recover the source, review it, commit it.

### Blocked on me — ask, do not guess

Build around these and state plainly what you left out. Do not invent an answer:

1. **Schema source of truth** (ZD-005). Production and staging histories diverge; four
   written migrations are queued behind it.
2. **Payment provider.** Gates payments, payouts, and tip settlement.
3. **Legal entity and POPIA Information Officer.** Blocks a truthful privacy policy,
   truthful store privacy labels, and invoice fields.
4. **Apple Developer account, bundle ID, signing.** `za.co.zoothome.app` is configured; the
   account side is mine.
5. **The deferred design queue**, brief §3.7 — Zoey filling the screen on first onboarding,
   the cursive written-on splash, de-glossing the mascot, and the overall UI direction I
   said I would decide. Remind me when you reach a point where one of them fits; do not
   build them unprompted.

### Order of work

1. Unpack the kit; inventory every screen against what `mobile/src/app/` already has, and
   write the gap list down before writing components.
2. Palette and tokens into `src/index.css`; let the mirror and the sync flow. Fix contrast
   failures now, not at the end.
3. Fonts — 7 TTFs via `expo-font`, wired into the `Fonts` map in
   `mobile/src/constants/theme.ts`.
4. Motion tokens.
5. Primitives onto the token layer.
6. Screens in dependency order: shell → auth/onboarding → today/calendar → booking →
   visit/tracking → account → Care+ → rewards → Xooter side.
7. Wire to Supabase behind the existing RLS. Nothing new bypasses it.
8. Accessibility and offline pass over everything.
9. `expo prebuild` clean, `expo export` clean, EAS production build, TestFlight.

Do not stop between phases to ask permission to continue. Stop only for the five items
above, and if one of them blocks a phase, finish every other part of that phase first and
say exactly what you left out.

---

## END OF PROMPT

### Notes for you, not for the prompt

**Why the palette question is now answered.** "Use the HTML file as the source of truth"
resolves it in the kit's favour; there is no reading of source-of-truth where the app takes
its layout from the kit and its colours from somewhere else. It does reverse the red/white
direction recorded in the master brief, so it is called out explicitly rather than slipped
in. If that is not what was meant, it is one file to put back — that is the whole point of
keeping colour in `src/index.css` alone.

**The reversal is smaller than it sounds.** The kit does not throw the company red away; it
gives it a job. Red becomes Care+ — badge, paywall, the "+" mark, plan savings — which is
the surface where a distinct colour actually earns its keep, and `--xoot-careplus-500`
`#E63329` is within a hair of the shipped `#e42a21`. What changes is that red stops being
the colour of every button. Worth saying plainly when this goes back to the founder,
because "the app is violet now" and "red is now the membership colour" land very
differently and only the second one is accurate.

**What this still cannot do.** No Mac in the environment, so nothing here runs an iOS
simulator. `expo prebuild` and `expo export` verify configuration and bundling, not
appearance or frame rate. First run on real hardware will surface things, particularly
during app start and at large Dynamic Type sizes.

**Realistic scope.** 197 components and 35 screens is a large port; expect several sessions.
The order above is arranged so each stage leaves the app working and shippable-if-truncated
rather than half-migrated.
