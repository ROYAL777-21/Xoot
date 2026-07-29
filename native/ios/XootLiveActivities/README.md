# Xoot iOS Live Activities and Widgets

Drop these Swift files into the future Xoot iOS app target and widget extension.

## Targets

- App target: add `XootLiveActivityController.swift`, `XootBookingActivityAttributes.swift`, and `XootAppIntents.swift`.
- Widget extension target: add `XootBookingLiveActivityWidget.swift`, `XootBookingSummaryWidget.swift`, `XootLiquidGlass.swift`, and `XootWidgetBundle.swift`.
- Both targets must share `XootBookingActivityAttributes.swift`.

## Minimum OS

- Live Activity controller updates: iOS 16.2+ (`ActivityContent` API)
- Live Activity widget presentation: iOS 16.1+
- Dynamic Island presentations: available on supported iPhone hardware
- AppIntent-configured widgets: iOS 17+
- App Intents and App Shortcuts: iOS 16+
- Liquid Glass: iOS 26+ with Xcode 26 SDK; older SDKs and OS versions use a darker solid fallback so text or sensitive content behind the surface is not readable.

## Setup

1. Add Push Notifications capability.
2. Add Widget Extension.
3. Add `NSSupportsLiveActivities` to the app target Info.plist.
4. Add App Groups if sharing booking summary cache between the app and widget extension.
5. Store only non-sensitive booking summary data in widget-accessible storage.
6. Wire booking status events from the Xoot API or web-native bridge into `XootLiveActivityController`.
7. Register `XootAppShortcuts.updateAppShortcutParameters()` during native app launch after the SwiftUI app target exists.
8. Map the assistant routes in `XootAppIntents.swift` to the Expo Router/deep-link configuration so Siri can open booking, Care+, bookings, and Xoot Concierge.

## Sensitive Data Rule

Never show gate codes, lockbox codes, full addresses, payment references, identity details, or support complaint details in widgets, Dynamic Island, Lock Screen, or notification previews.

## Siri / App Intents Rule

App Intents should open safe destinations and answer only generic Xoot routing prompts. Private booking, payment, address, household, support, or access-code details must require the authenticated app surface.
