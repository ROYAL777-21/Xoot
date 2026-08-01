# Prompt — Build the Xoot iOS app to App Store submission

Copy everything between the rules below into a fresh session. It is written to be
handed over cold: it names the files, the decisions already made, and the things that
will go wrong.

---

## THE PROMPT

Build the Xoot iOS app in React Native (Expo SDK 56) to the point where a signed build
can be submitted to the App Store, using the UI kit I supplied.

### Where everything is

- **Repo:** `zoot-your-local-helpers`, branch `claude/xoot-ios-build-setup-0te1sl`.
- **Native app:** `mobile/` — Expo Router, TypeScript, Reanimated 4, react-native-svg.
- **UI kit:** `Xoot_App.html`, a self-extracting bundle. Unpack it, do not read it whole
  — it is 2.9 MB and the payload is one line. Each entry in the JSON asset map is
  base64-encoded gzip:
  ```python
  import base64, gzip, json
  for key, entry in json.loads(asset_map_line).items():
      raw = gzip.decompress(base64.b64decode(entry["data"]))
  ```
  You get 26 assets: 7 authored app modules with readable header comments, three vendor
  bundles, and **7 embedded TTF fonts** — the real font files, so nothing needs
  licensing or substituting.
- **Standing briefs, read before writing code:**
  `docs/xoot-master-brief.md` (product, pricing, decisions),
  `docs/implementation/decision-log.md` (ZD-001…ZD-023, why things are the way they
  are), `docs/xoot-production-readiness-prompt.md` (the bar for shipping).

### What the kit contains

197 components across 35 screens. The ones that define the product:

| Area | Screens |
|---|---|
| Home | `TodayScreen`, `CalendarScreen` — Tiimo-style: serif weekday, week strip, nudge widgets, time-of-day sections |
| Booking | `BookingFlow` → service, home details, when, pro, confirm |
| Live visit | `TrackingScreen`, `VisitScreen`, `CallScreen`, `ChatScreen`, `RateScreen` |
| Account | `AccountScreen`, `ProfileScreen`, `HomeEditScreen`, `InvoicesScreen`, `PrivacyScreen`, `NotificationsScreen` |
| Care+ | `CarePlusJoinScreen`, `CarePlusManageScreen`, `CarePlusPayment` |
| Rewards | `RewardsScreen`, `CredScreen`, `ReferScreen` |
| Xooter side | `XooterHomeScreen`, `XooterEarningsScreen`, `XooterGrowthScreen` |
| Entry | `SplashScreen`, `AuthScreen`, `OnboardingFlow`, `LoginFlow`, `PhoneFlow`, `SsoFlow` |
| Assist | `ConciergeScreen`, `SiriScreen`, `WidgetsScreen`, `SearchScreen` |

It carries its own token system — `--xoot-action-brand`, `--xoot-coral-*`,
`--xoot-blush-*`, `--xoot-careplus-*`, a type scale, border tokens, and **motion tokens**
(`--xoot-dur-instant|fast|base|slow|breathe|bloom|story|icon`, `--xoot-ease-out`,
`--xoot-ease-in-out`). Port the motion tokens too — they are why the kit feels the way
it does, and they are the first thing lost in a hand translation.

### Decide this before writing a line

**The kit's palette and the shipped tokens disagree.** The kit is warm coral on cream
(`#E64B36`, `#E05B47`, `#C7503E`, `#FCEEDA`, ink `#3B3430`). `src/index.css` and
`src/lib/design-tokens.ts` are red on near-white (`#e42a21` / `#fff7f5`). The kit's
direction is close to the terracotta the master brief marked **superseded**.

Ask me which wins before porting anything. Then make it true in **one place**:
`src/index.css`, with `src/lib/design-tokens.ts` mirrored to it — `design-tokens.test.ts`
already enforces that, and `native-design-system.test.ts` fails the build on any raw hex
in `mobile/src`. Do not let a kit colour into a component.

### The foundation that already exists — build on it, do not replace it

- **Design tokens** — `src/lib/design-tokens.ts`, mirrored from `index.css` under test,
  synced to `mobile/src/generated/` by `npm run shared:sync`.
- **Splash** — `mobile/src/components/splash-animation.tsx` plays the Zoey choreography
  natively from `src/lib/splash-choreography.ts`, the same module the Remotion video and
  the web splash use. Three renderers, one definition (ZD-022). Keep it that way.
- **Brand assets** — `npm run icons:render` regenerates every launcher and launch-screen
  image from the mascot. Re-run after any change to her.
- **Native launch rules** — `mobile/src/lib/native-launch.ts` owns the deep-link bypass
  and the Reduce Motion / Low Power gate. Route new launch behaviour through it rather
  than adding a second opinion.
- **Sign in with Apple** — native sheet, `mobile/src/lib/apple-auth.ts`. Required by
  Apple Guideline 4.8 because Google sign-in is offered. Do not route it through a
  browser.

### Rules that are not negotiable

1. **No secret in the client.** `npm run security:scan` and `npm run build:artifact-scan`
   enforce it. Never add an exception.
2. **RLS is row-level, not column-level.** A sensitive column on a table someone can
   already read is readable by them. This has bitten once (ZD-023). Sensitive data gets
   its own table.
3. **Money is integer cents and server-authoritative.** The client displays a price; it
   never determines one. `supabase/functions/_shared/pricing.ts` is the authority and a
   parity test pins the client ladders to it.
4. **No claim the system cannot honour.** Consumer Protection Act. The pattern is in
   `src/lib/tipping.ts`: gate the claim behind a constant, and test that it cannot render
   while the constant is unset.
5. **The gate is `npm run verify` plus `npm run mobile:typecheck`.** Both green before
   any commit. 269 tests pass today; keep them passing.
6. **Verify by running, not by reading.** Four splash defects were only visible in a
   rendered frame; two iOS faults only in `expo prebuild` output. `npx expo export
   --platform ios` and `npx expo prebuild --platform ios` are the checks available
   without a Mac.

### What "production ready" means here, specifically

This app holds **gate codes, alarm details, access instructions, and the hours a house is
empty**, plus Xooter ID documents and banking details. A breach is a home-invasion kit,
not a leaked mailing list. Before building any screen, ask what it lets someone learn
about when a house is empty and how to get into it — if the answer is "something", it
needs an access rule before it needs a layout.

Concretely, for submission:

- Every screen works at the largest Dynamic Type setting and with VoiceOver.
- 44pt minimum tap targets (`MIN_TAP_TARGET`), WCAG AA contrast, `prefers-reduced-motion`
  respected.
- Offline and slow-network states on every screen that loads data. South African mobile
  data is expensive and patchy; a spinner forever is the default failure.
- No placeholder copy, no lorem, no dead links. App Review opens the least important
  screen you have.
- Privacy nutrition labels answered truthfully — which needs §"blocked on me" below.

### Blocked on me — ask, do not guess

Do not invent an answer to any of these. Ask, and if I am slow, build around them and
say what you left out:

1. **Palette** — kit coral or shipped red (above).
2. **Schema source of truth** (ZD-005). Staging and production histories differ. Two
   migrations are written and unapplied behind this.
3. **Payment provider** (PayFast / Peach / Yoco / Stripe). Gates payments, payouts and
   tip settlement.
4. **Legal entity and POPIA Information Officer.** Blocks the privacy policy being
   truthful, and blocks store submission.
5. **Apple Developer account, bundle ID, signing.** `za.co.zoothome.app` is configured;
   I have to do the account side.

### Order of work

1. Unpack the kit; inventory every screen against what `mobile/src/app/` already has.
2. Settle the palette; make it true in `index.css` and let the mirror flow.
3. Port the fonts — 7 TTFs, loaded via `expo-font`, wired into the `Fonts` map in
   `mobile/src/constants/theme.ts`.
4. Port tokens: colour, type, spacing, radius, **and motion**.
5. Build the primitives (`Button`, `Card`, `Sheet`, `ChipGrid`, `DockedCTA`, `Badge`,
   `Avatar`…) onto the token layer. These are the 197 components' foundation.
6. Screens in dependency order: shell → auth/onboarding → today/calendar → booking →
   visit/tracking → account → Care+ → rewards → Xooter side.
7. Wire to Supabase behind the existing RLS. Nothing new bypasses it.
8. Accessibility and offline pass over everything.
9. `expo prebuild` clean, `expo export` clean, EAS production build, TestFlight.

### How to work

- **Comments explain why, especially why not the obvious alternative.** This codebase is
  full of them because most were learned by getting it wrong first.
- **A duplicated definition is only safe with a test proving it is still a duplicate.**
  See `shared-native-sync.test.ts`, `design-tokens.test.ts`.
- **Tests assert properties, not snapshots.**
- **Every tunable is a named constant at the top of its module** (ZD-021).
- **Report honestly.** If a test fails, show the output. If something was skipped, say
  so. Do not describe intent as achievement.
- **Do not stop between phases to ask permission to continue** — only stop for the five
  blocked items above.

---

## END OF PROMPT

### Notes for you, not for the prompt

**What this cannot do.** No Mac in the environment, so nobody can run an iOS simulator
here. `expo prebuild` and `expo export` verify configuration and bundling; they do not
verify the app *looks* right on a device. First run on real hardware will surface things
— particularly frame rate during app start, and Dynamic Type at large sizes.

**The five blockers are yours, not mine.** Items 2–5 need decisions or accounts I cannot
create. Item 1 needs thirty seconds. Answering the palette question unblocks roughly 80%
of the porting work, so it is worth answering first even if the rest waits.

**Realistic scope.** 197 components and 35 screens is a large port. Expect it across
several sessions. The order above is arranged so each stage leaves the app in a
working, shippable-if-truncated state rather than half-migrated.
