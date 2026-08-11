# Phase 10 - Siri And App Intents

Reviewed: 2026-06-30

## Status

Implemented locally as an Expo prebuild foundation.

This phase does not submit TestFlight or Play builds, does not enable autonomous booking or payment, and does not depend on provider secrets. Physical iOS and Android development-build verification remains required before native release use.

## What Was Added

- `mobile/plugins/withXootAssistantIntents.cjs`
  - copies `native/ios/XootLiveActivities/XootAppIntents.swift` into the generated iOS app target during Expo prebuild;
  - adds the copied Swift file to the generated Xcode project when an iOS project exists;
  - copies Android static shortcut XML/string resources into the generated Android project;
  - registers `android.app.shortcuts` metadata on the launcher activity;
  - adds safe iOS user activity metadata and Live Activity support flags.
- `mobile/app.config.ts`
  - registers the local assistant-intents config plugin.
- `native/android/res/xml/shortcuts.xml`
  - uses `zoot://` deep links instead of future-domain links so shortcuts remain testable before domain registration.
- `native/ios/XootLiveActivities/XootAppIntents.swift`
  - keeps Siri/App Shortcut actions open-app-only;
  - sanitizes optional area text before adding it to the booking handoff URL;
  - keeps booking/payment/address confirmation inside the app.
- `mobile/src/app/bookings.tsx`
  - safe booking-status route for assistant handoff.
- `mobile/src/app/zooter/jobs.tsx`
  - safe Xooter jobs route for assistant handoff.
- `src/lib/phase10-assistant-intents-readiness.test.ts`
  - verifies config-plugin wiring, safe native routes, and absence of sensitive query names.

## Supported Assistant Handoffs

- Book a cleaner.
- Clean my house.
- Clean my home.
- Clean my place.
- I need my office cleaned.
- Book an Airbnb turnover.
- Ask Xoot Concierge.
- Open Care+.
- Check booking status.
- Open Xooter jobs.

These handoffs may prefill only safe service category, date, and area/suburb context. They must not include booking IDs, addresses, gate codes, alarm codes, lockbox details, phone numbers, payment state, refund state, complaint details, identity documents, or admin actions.

## Controls

- Siri/App Intents open the app and hand off to allowlisted routes.
- Android shortcuts open the same safe Expo Router routes.
- Booking creation, address entry, Xooter selection, payment, refund, sensitive access, and support actions remain inside authenticated app screens and Supabase Edge Functions.
- The app does not trust assistant/deep-link input for payment, access, or booking completion.
- The config plugin is additive and can be removed without touching secrets.

## Development-Build Verification Gate

Before Phase 10 is treated as complete for native release:

1. Run `npm --prefix mobile run typecheck`.
2. Run `npm run mobile:config:check`.
3. Run `npm test -- src/lib/mobile-native-launch.test.ts src/lib/phase10-assistant-intents-readiness.test.ts`.
4. Run Expo prebuild in a disposable workspace and confirm:
   - `XootAppIntents.swift` is present in the iOS app target;
   - Android `zoot_assistant_shortcuts.xml` and string resources are copied;
   - launcher activity metadata references `@xml/zoot_assistant_shortcuts`.
5. Build an EAS development client.
6. Test on real iOS and Android devices:
   - Siri opens booking with service/date/area prefill;
   - Siri opens Concierge, Care+, booking status, and Xooter jobs;
   - Android launcher/assistant shortcuts open the same routes;
   - unsafe params are ignored;
   - no booking is created and no payment state changes until the user confirms inside the app.

## Rollback

- Remove `./plugins/withXootAssistantIntents.cjs` from `mobile/app.config.ts`.
- Delete `mobile/plugins/withXootAssistantIntents.cjs`.
- Keep the Expo route files if the app still exposes those screens through ordinary navigation; otherwise remove them with their tests.
- Re-run `npm --prefix mobile run typecheck`, `npm test`, and `npm run ops:readiness`.
