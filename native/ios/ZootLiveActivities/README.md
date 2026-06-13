# Zoot iOS Live Activities and Widgets

Drop these Swift files into the future Zoot iOS app target and widget extension.

## Targets

- App target: add `ZootLiveActivityController.swift` and `ZootBookingActivityAttributes.swift`.
- Widget extension target: add `ZootBookingLiveActivityWidget.swift`, `ZootBookingSummaryWidget.swift`, `ZootLiquidGlass.swift`, and `ZootWidgetBundle.swift`.
- Both targets must share `ZootBookingActivityAttributes.swift`.

## Minimum OS

- Live Activities: iOS 16.1+
- Dynamic Island presentations: available on supported iPhone hardware
- AppIntent-configured widgets: iOS 17+
- Liquid Glass: iOS 26+ with Xcode 26 SDK; older SDKs and OS versions use the built-in material fallback.

## Setup

1. Add Push Notifications capability.
2. Add Widget Extension.
3. Add `NSSupportsLiveActivities` to the app target Info.plist.
4. Add App Groups if sharing booking summary cache between the app and widget extension.
5. Store only non-sensitive booking summary data in widget-accessible storage.
6. Wire booking status events from the Zoot API or web-native bridge into `ZootLiveActivityController`.

## Sensitive Data Rule

Never show gate codes, lockbox codes, full addresses, payment references, identity details, or support complaint details in widgets, Dynamic Island, Lock Screen, or notification previews.
