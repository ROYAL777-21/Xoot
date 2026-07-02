# iOS Live Activities, Dynamic Island, and Widgets

This repo is currently a React/Vite web app. There is no checked-in Xcode project, so the production iOS app still needs a native target before App Store submission. The files under `native/ios/ZootLiveActivities` are a ready-to-drop Swift package for that target.

Primary Apple references reviewed on 2026-05-28:

- ActivityKit: https://developer.apple.com/documentation/ActivityKit/
- Displaying live data with Live Activities: https://developer.apple.com/documentation/ActivityKit/displaying-live-data-with-live-activities
- Starting and updating Live Activities with ActivityKit push notifications: https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications
- WidgetKit Live Activities: https://developer.apple.com/documentation/widgetkit/liveactivities-collection
- Human Interface Guidelines for Live Activities: https://developer.apple.com/design/human-interface-guidelines/live-activities
- App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/

Design and motion preview reviewed on 2026-07-02:

- Zoot Native Widgets - Liquid Glass Motion Preview: https://www.figma.com/design/2M0vWKGmiLApMcB980WYC4

## Native iOS Experience Goals

- Use a native SwiftUI shell for tab navigation, booking detail, Care+, support, and account/profile settings instead of a plain web wrapper for App Store submission.
- Use SF Symbols, Dynamic Type, native sheets, native haptics, native notifications, passkeys/Keychain where appropriate, and system permission prompts.
- Keep payments, Care+ claims, support claims, replacement matching, and trust/safety claims aligned with backend reality.
- Keep home access notes and gate/lockbox codes out of Lock Screen, Dynamic Island, widgets, push notification body text, screenshots, and watch surfaces.

## Live Activity Scope

A Zoot booking Live Activity should start only after a booking is confirmed or when a Zooter is assigned. It should update for:

- Booking confirmed
- Zooter on the way
- Zooter arrived
- Job started
- Job completed
- Booking cancelled
- Zooter reassigned or replacement matching in progress
- Priority support escalation

Dynamic Island copy must stay glanceable and non-sensitive. Good examples:

- `Nomsa on the way`
- `12 min`
- `Arrived`
- `Job started`
- `Guest-ready clean`
- `Support reviewing`

Do not show full home address, access code, gate code, lockbox code, complaint detail, payment reference, ID information, or sensitive support notes.

## Web-to-Native Bridge

The web app includes `src/lib/native-live-activity.ts`. A native shell can listen for:

- `window.webkit.messageHandlers.zootLiveActivity.postMessage(payload)` for WKWebView iOS shells
- `window.ReactNativeWebView.postMessage(...)` for React Native shells
- `window.ZootNative.updateBookingLiveActivity(payload)` for custom bridges
- `zoot:booking-live-activity` browser events for local testing

Payload shape:

```ts
interface ZootBookingLiveActivityPayload {
  bookingId: string;
  status: "confirmed" | "enroute" | "arrived" | "in_progress" | "completed" | "cancelled" | "reassigned" | "pending";
  statusLabel: string;
  serviceName: string;
  zooterName?: string;
  propertyName?: string;
  suburb?: string;
  scheduledAt?: string;
  etaMinutes?: number;
  nextStep?: string;
  supportState?: "standard" | "priority" | "escalated";
  updatedAt: string;
}
```

## Server Push Requirements

For production-grade Live Activities, the backend should support ActivityKit push updates:

- Store the Live Activity push token against the booking and user.
- Send APNs updates for status changes rather than relying only on the app being open.
- End the activity when the job completes, is cancelled, or becomes stale.
- Use APNs collapse/idempotency so duplicate status events do not create contradictory UI.
- Never include sensitive access details in APNs payloads.

## Widget Scope

User-created widgets should be configurable using WidgetKit and App Intents:

- `Next Booking`: next date/time, service type, Zooter first name, and status.
- `Care+ Home Readiness`: readiness score, Home Memory completeness, next prompt.
- `ZootCred`: available ZootCred, pending ZootCred, monthly add-on credit expiry.
- `Favourite Zooter`: preferred Zooter and deep link to rebook.
- `Accepted Zooter Job`: accepted job prompt and deep link to the authenticated Zooter job screen.

Widget content should use cached, non-sensitive summaries. Tapping a widget should deep-link into the authenticated app.

## Entitlements And Info.plist

Add to the iOS app target:

- Push Notifications capability
- Background Modes where APNs/booking updates require it
- App Groups if sharing cached widget data between app and extension
- `NSSupportsLiveActivities = YES`
- `NSSupportsLiveActivitiesFrequentUpdates = YES` only if Zoot truly needs and can responsibly support frequent updates

## App Review Notes

- Live Activities and widgets are optional enhancements; users must still receive core booking updates in-app.
- Do not require location or notifications to book a service.
- Provide a reviewer demo booking that can move through confirmed, on the way, arrived, started, and completed states.
- Include a privacy note that widgets and Live Activities intentionally omit sensitive home access details.
