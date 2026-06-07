# Zoot Mobile App Build Path

Reviewed on 2026-05-28. Updated on 2026-06-07.

Zoot now has a concrete Capacitor app path for turning the React/Vite web app into iOS and Android app projects while keeping the premium web experience, Care+, haptics, dashboards, and security constraints in one codebase.

## What This Adds

- `capacitor.config.ts` with Zoot app identity, `dist` web output, native schemes, push-notification presentation options, and warm launch styling.
- `package.json` scripts for adding, syncing, building, and opening iOS/Android app projects.
- Capacitor dependencies for native app shell, app lifecycle, haptics, preferences, and push notifications.
- Native haptics bridge in `src/lib/haptics.ts` with browser vibration fallback and reduced-motion respect.
- Native route bridge in `src/lib/native-routing.ts` and `NativeInteractionLayer` for launch URLs, app URL opens, push-notification taps, and native-shell route events.
- Existing iOS Live Activities, Dynamic Island, and WidgetKit source under `native/ios/ZootLiveActivities` for integration into the generated iOS project.

## First-Time iOS Project Creation

Run from a machine with Node.js, npm, Xcode, and CocoaPods available:

```bash
npm install
npm run build
npm run mobile:add:ios
npm run mobile:sync
npm run mobile:open:ios
```

Then in Xcode:

- Add the Live Activities and WidgetKit files from `native/ios/ZootLiveActivities` to the app and widget extension targets.
- Add the Info.plist keys in `native/ios/ZootLiveActivities/Info.plist.snippet.xml`.
- Enable Push Notifications, App Groups if widget cache sharing is used, and required signing capabilities.
- Verify Dynamic Island, Lock Screen, and widget previews do not show addresses, gate codes, lockbox codes, access notes, payment references, ID data, or sensitive support details.

## First-Time Android Project Creation

Run from a machine with Node.js, npm, JDK, Android Studio, and Android SDK available:

```bash
npm install
npm run build
npm run mobile:add:android
npm run mobile:sync
npm run mobile:open:android
```

Then in Android Studio:

- Configure package signing, version code/name, adaptive icons, splash screen, notification channels, deep links, and release build types.
- Add Android widgets only for non-sensitive summaries: Next Booking, Care+ Home Readiness, ZootCred, and Favourite Zooter.
- Complete Play Data Safety from actual code and SDK behavior.
- Run emulator QA before Play submission.

## Release Verification

Before any store submission:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run mobile:sync`
- iOS archive build in Xcode
- Android release bundle build in Android Studio or Gradle
- App Store and Play Store checklist review in `docs/release/app-store-play-store-checklist.md`
- AI usage review in `docs/release/ai-usage-review-checklist.md`
- Security launch controls review in `docs/security/launch-critical-controls.md`

## Native Experience Rules

- Use native haptics for important confirmations and warnings, but keep them subtle.
- Use native push/Live Activities/widgets for status visibility, but never expose sensitive home access details outside the authenticated app.
- Route native links and push tap payloads through `resolveNativeRoute`; include only safe screen names and booking IDs, never addresses, access notes, gate codes, payment references, or private support details.
- Use Keychain/Android Keystore-backed storage for tokens in the native shell.
- Keep booking, support, payment, cancellation, Care+, and ZootCred changes inside authenticated in-app flows.
- Treat the PWA as a useful fallback; App Store and Play Store submission still requires real native project builds and native QA.