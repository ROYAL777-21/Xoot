# Zoot iOS Live Activities and Widgets

Drop these Swift files into the future Zoot iOS app target and widget extension.

## Targets

- App target: add `ZootLiveActivityController.swift`, `ZootBookingActivityAttributes.swift`, and `ZootAppIntents.swift`.
- Widget extension target: add `ZootBookingLiveActivityWidget.swift`, `ZootBookingSummaryWidget.swift`, `ZootLiquidGlass.swift`, and `ZootWidgetBundle.swift`.
- Both targets must share `ZootBookingActivityAttributes.swift`.

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
6. Wire booking status events from the Zoot API or web-native bridge into `ZootLiveActivityController`.
7. Register `ZootAppShortcuts.updateAppShortcutParameters()` during native app launch after the SwiftUI app target exists.
8. Map the assistant routes in `ZootAppIntents.swift` to the Expo Router/deep-link configuration so Siri can open booking, Care+, bookings, and Zoot Concierge.

## Sensitive Data Rule

Never show gate codes, lockbox codes, full addresses, payment references, identity details, or support complaint details in widgets, Dynamic Island, Lock Screen, or notification previews.

## Siri / App Intents Rule

App Intents should open safe destinations and answer only generic Zoot routing prompts. Private booking, payment, address, household, support, or access-code details must require the authenticated app surface.
