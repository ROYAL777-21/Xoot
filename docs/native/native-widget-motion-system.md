# Native Widget And Motion System

Reviewed: 2026-07-03

Figma preview: https://www.figma.com/design/2M0vWKGmiLApMcB980WYC4
Figma motion board: same file, with native widget frames for Next Booking, Care+ Readiness, ZootCred, Favourite Zooter, and Accepted Zooter Job. If Codex/Figma auth expires, code remains the source of truth until the editable board can be re-synced.

This document defines the first production-safe widget direction for Zoot's Expo native app. It covers iOS widgets, iOS Live Activities, Dynamic Island, Android home-screen widgets, and safe assistant deep links.

## Safety Rules

Widgets, Live Activities, Dynamic Island, and assistant surfaces must never show:

- full street addresses;
- gate codes, alarm codes, lockbox codes, or access instructions;
- private household notes;
- payment references, card details, refunds, disputes, or complaint details;
- ID documents, screening details, background-check data, or admin notes.

Safe content is limited to short booking status, service type, safe ETA, suburb-level context when needed, Care+ readiness, ZootCred summary, favourite Zooter prompt, and deep links into authenticated screens.

## Motion Contract

- Primary easing: spring-like settle, `360ms`, no overshoot that shifts layout.
- Tap response: scale to `0.985`, brighten top-right specular highlight, then settle.
- Liquid Glass direction: clear material, top-right light source, edge shimmer, readable foreground text, background obscured enough that underlying text cannot be read.
- Message and widget entrance: staggered `42ms` increments, maximum seven visible delays.
- Reduced motion: remove shimmer and glisten movement; keep opacity and color feedback.
- Widget identity: use a simple robotic-star mark, compact enough for small iOS and Android widgets, and never use fake client names, prices, suburbs, balances, or access details.

## Implemented Native Surfaces

- iOS: `native/ios/ZootLiveActivities/ZootBookingSummaryWidget.swift`
  - Next Booking
  - Care+ Readiness
  - ZootCred
  - Favourite Zooter
  - Accepted Zooter Job
- iOS: `native/ios/ZootLiveActivities/ZootBookingLiveActivityWidget.swift`
  - Live Activity and Dynamic Island status surfaces
- Android: `native/android/src/main/java/za/co/zoothome/widgets/ZootStatusWidgetProvider.java`
  - Safe static widget shell that deep-links to authenticated booking status
- Expo prebuild plugin: `mobile/plugins/withZootAssistantIntents.cjs`
  - Copies iOS App Intents and Android assistant/widget resources during prebuild
- Placeholder widget entries deliberately say `Open app` rather than showing realistic names, times, suburbs or balances. Real widget summaries must come from an authenticated app-group cache that stores only non-sensitive summary fields.

## Next Native Upgrade

The Android widget intentionally starts with standard `AppWidgetProvider` resources because the project is Expo-first and does not keep a committed Gradle app. After Android native build stability is proven, upgrade to Jetpack Glance with an authenticated local cache that stores only non-sensitive summary fields.

The iOS widget should move from placeholder timeline entries to app-group cached entries after the native app has a stable signed development build and a tested authenticated cache writer.
