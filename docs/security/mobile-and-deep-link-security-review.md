# Mobile And Deep Link Security Review

Reviewed: 2026-07-03

## Surfaces

- Expo Router app, SecureStore session handling, push tokens, Mapbox views, Concierge, booking flow, Xooter jobs.
- iOS App Intents, Live Activities, widgets, Universal Links/AASA, and `zoot://` custom scheme.
- Android shortcuts, widgets, App Links/assetlinks, and assistant handoff.

## Rules

- Deep links may open safe screens but cannot complete booking, payment, refund, payout, admin, support-risk, or sensitive access actions without in-app authenticated confirmation.
- Voice assistant and deep-link booking handoffs preserve only safe service/date/area context; URL-like, path-traversal, payment, role, booking ID, provider token, and access-code state is stripped before routing.
- Widgets and Live Activities show safe status, ETA, and progress only; no full address, gate codes, alarm codes, private notes, or payment references.
- Sensitive access is fetched on demand and cleared after the reveal window.
- Expo public variables may include only public-safe values.
- Signing credentials and native SDK download tokens stay in EAS or provider secret stores.

## Required Device Smokes

- Android preview APK install, sign-in, booking route, Concierge route, Xooter jobs route, widget display, assistant shortcut.
- iOS development/preview install, sign-in, App Intent handoff, Live Activity/widget display, reduced-motion behavior.
- Auth callback via `zoot://auth/callback`.
- Malformed or hostile deep links are ignored or routed to safe screens.

## Open Items

- iOS internal distribution credentials and Apple Team ID are still missing.
- Android SHA fingerprints and final app links are blocked until signing/store setup and domain registration.
- Real-device smoke evidence is required before store submission.
