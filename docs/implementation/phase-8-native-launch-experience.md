# Phase 8 - Native Launch Experience

Reviewed: 2026-06-30

## Status

Implemented locally for the Expo app.

This phase does not submit TestFlight or Play builds, does not add native Swift/Kotlin targets, and does not depend on external credentials. Physical-device development-build verification remains required before store testing.

## What Was Added

- `mobile/src/lib/native-launch.ts`
  - `resolveNativeLaunchIntent`
  - `buildNativeLaunchTarget`
  - `shouldBypassNativeLaunchExperience`
  - `getNativeLaunchMode`
  - `nativeLaunchAssets`
- `mobile/src/components/native-launch-experience.tsx`
  - bundled React Native launch surface;
  - clear Liquid Glass-inspired native card without WebView;
  - reduced-motion/static fallback;
  - accessibility-safe status text.
- `mobile/src/app/index.tsx`
  - ordinary launches show the native launch experience;
  - assistant/urgent intents bypass launch and route directly to Book, Concierge or Care+.
- `mobile/src/app/_layout.tsx`
  - Expo splash fade configured with `expo-splash-screen`.
- `src/lib/mobile-native-launch.test.ts`
  - verifies safe assistant bypass, static fallback, and no remote/WebView launch assets.

## Controls

- Launch assets are local and native-rendered.
- No remote 3D model, iframe, WebView or remotely fetched launch media is used.
- Reduced-motion users receive a static launch surface.
- The pure launch helper also supports low-power/static mode so native build work can wire device power-state detection later without changing the route contract.
- Voice assistant and urgent links bypass the launch layer and preserve only safe query params.

## Security Rules

- Assistant deep links can prefill only service category, date and area.
- The launch layer cannot create a booking, confirm payment, reveal address details, show access codes, or mutate account state.
- Booking, payment, Concierge account context, Care+ activation and support actions remain behind Supabase Auth, Edge Functions and backend provider confirmation.
- Sensitive params such as gate codes, access codes, payment references, OTPs and arbitrary query data are ignored.

## Development-Build Verification Gate

Before Phase 8 is treated as complete for native release:

1. Run `npm --prefix mobile run typecheck`.
2. Run `npm run mobile:config:check`.
3. Start the app in Expo Go for basic routing where supported.
4. Build a development client with EAS.
5. Test on a real iPhone and Android device:
   - normal app launch shows the bundled launch surface;
   - reduced-motion mode shows static launch;
   - `zoot://book?intent=book_clean&service=office&date=2026-07-03&area=Rosebank` opens booking;
   - `zoot://concierge?intent=concierge` opens Concierge;
   - `zoot://care-plus?intent=care_plus` opens Care+;
   - unsafe params are ignored.

## Rollback

- Remove `NativeLaunchExperience` from `mobile/src/app/index.tsx`.
- Keep `mobile/src/lib/native-launch.ts` if assistant routing still depends on it; otherwise remove it with its tests.
- Re-run `npm run mobile:typecheck`, `npm test`, and `npm run ops:readiness`.
