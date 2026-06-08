# Zoot Mobile App Build Path

Reviewed on 2026-06-08.

Zoot now has a concrete Capacitor app path for turning the React/Vite web app into iOS and Android app projects while keeping the premium web experience, Care+, haptics, dashboards, and security constraints in one codebase.

## What This Adds

- `capacitor.config.ts` with Zoot app identity, `dist` web output, native schemes, push-notification presentation options, and warm launch styling.
- `package.json` scripts for adding, syncing, building, and opening iOS/Android app projects.
- Capacitor dependencies for native app shell, app lifecycle, haptics, preferences, and push notifications.
- Native haptics bridge in `src/lib/haptics.ts` with browser vibration fallback and reduced-motion respect.
- Existing iOS Live Activities, Dynamic Island, and WidgetKit source under `native/ios/ZootLiveActivities` for integration into the generated iOS project.
- Native booking action bridge in `src/lib/native-booking-actions.ts` for directions, ETA sharing, and masked-call handoff without exposing phone numbers or access notes.

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
- Add Associated Domains for the production Zoot domain after the generated `/.well-known/apple-app-site-association` is deployed.
- Wire `zootBookingAction` and `zootLiveActivity` WKWebView message handlers to native map, share, masked-call, and ActivityKit handlers.
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
- Add Android App Links after the generated `/.well-known/assetlinks.json` is deployed with the release certificate SHA-256 fingerprint.
- Map `zoot.bookingAction` WebView messages to native maps, Android Sharesheet, and the approved masked-call flow.
- Add Android widgets only for non-sensitive summaries: Next Booking, Care+ Home Readiness, ZootCred, and Favourite Zooter.
- Complete Play Data Safety from actual code and SDK behavior.
- Run emulator QA before Play submission.

## Native Booking Actions Bridge

The web booking detail screen now emits safe native actions through:

- `window.webkit.messageHandlers.zootBookingAction.postMessage(payload)` for WKWebView iOS shells.
- `window.ReactNativeWebView.postMessage(JSON.stringify({ type: "zoot.bookingAction", payload }))` for React Native shells.
- `window.ZootNative.performBookingAction(payload)` for custom bridges.
- `zoot:booking-action` browser events for local testing.

Supported actions:

- `directions`: contains the booking route and Apple Maps fallback URL when a destination is saved. This action may include a user-initiated destination label/query but must never include access notes, gate codes, lockbox codes, or support incident text.
- `share_eta`: contains booking status, ETA minutes, route, and Zooter first name when available. It intentionally omits raw street address data.
- `masked_call`: contains the masked call session id and booking route. It never includes caller or callee phone numbers; Twilio setup remains server-side and approval-gated.

Native shells should treat these messages as user-initiated intents, not as trusted proof that a booking mutation is approved. Booking state must still come from authenticated backend state.

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
- Use native maps and sharesheets only after explicit user actions from the authenticated booking surface.
- Use Keychain/Android Keystore-backed storage for tokens in the native shell.
- Keep booking, support, payment, cancellation, Care+, and ZootCred changes inside authenticated in-app flows.
- Treat the PWA as a useful fallback; App Store and Play Store submission still requires real native project builds and native QA.
