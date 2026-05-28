# App Store and Play Store Rejection-Prevention Checklist

Sources reviewed on 2026-05-28:

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple Human Interface Guidelines for Live Activities: https://developer.apple.com/design/human-interface-guidelines/live-activities
- Apple ActivityKit documentation: https://developer.apple.com/documentation/ActivityKit/
- Apple WidgetKit documentation: https://developer.apple.com/documentation/WidgetKit/
- Google Play AI-generated content policy: https://support.google.com/googleplay/android-developer/answer/14094294
- Android Data Safety: https://developer.android.com/privacy-and-security/declare-data-use
- OWASP Mobile Top 10 2024: https://owasp.org/www-project-mobile-top-10/

## Shared Submission Checklist

- Test the production build for crashes, blank screens, broken routing, failed sign-in, failed booking, failed support submission, and failed payment return states.
- Provide a complete reviewer demo account for client, Zooter, host, office, and support flows if those roles are reviewable.
- Keep backend services live during review, including auth, booking mocks/seed data, support, payment test modes, push notification endpoints, Live Activity update endpoints, and widget/deep-link endpoints where applicable.
- Explain non-obvious features in review notes: Care+, Home Memory, Favourite Zooter, ZootCred, host/office dashboards, AI-style reminders, priority support, Live Activities, Dynamic Island, widgets, and support escalation.
- Make app metadata accurate: screenshots, privacy labels, subscription price, billing terms, support links, account deletion flow, and contact information.
- Remove placeholder text, staging banners, test-only credentials, unapproved third-party logos, unsupported guarantees, and internal admin/debug UI.
- Ensure all claims are supportable: do not claim guaranteed replacement, full insurance, criminal-background coverage, or named vendor checks unless the production process supports it.
- Make terms, privacy policy, POPIA handling, cancellation policy, refund policy, account deletion, and contact details easy to find.
- Keep sensitive home access data out of screenshots, store listing previews, widgets, notifications, Live Activities, Dynamic Island, and support examples.

## Apple App Store Checklist

- App must be useful, complete, and stable; do not submit a shell, broken web wrapper, or unfinished marketplace flow.
- If the app requires login, provide App Review with active credentials or a fully-featured demo mode.
- App information and metadata must be complete and accurate, including Care+ R99/month and any subscription details.
- In-app purchase rules must be reviewed before selling digital memberships through iOS. If Care+ is sold as a digital subscription in the iOS app, use the correct Apple purchase flow unless legal/product counsel confirms an exception.
- User-generated content areas such as reviews, support messages, profile bios, and chat must include filtering, reporting, blocking or moderation paths, and published contact details.
- Do not include offensive, discriminatory, unsafe, deceptive, or misleading generated/support content.
- Ask only for permissions that are needed, and explain why location, photos, camera, notifications, or contacts are needed at the moment of request.
- Keep sensitive home access notes out of notifications, emails, SMS, lock screen previews, screenshots, Dynamic Island, and widgets.
- Provide account deletion support and avoid dark patterns for subscription cancellation.
- Remove debug menus, development payment providers, and private API keys from the shipped app.

## Native iOS Experience Gate

- Build the App Store binary as a native SwiftUI shell or high-quality hybrid shell, not a bare web wrapper.
- Use native tab/navigation patterns, SF Symbols, Dynamic Type, system sheets, native date/time pickers, Keychain/secure storage, and native haptics where appropriate.
- Respect safe areas, notches, Dynamic Island spacing, reduced motion, dark mode, large text, VoiceOver, and one-handed mobile ergonomics.
- Keep the web app/PWA as an installable fallback, but use native iOS affordances for booking status, support, push, widgets, Live Activities, and account/session management in the submitted app.
- Verify every native screen has a useful offline/loading/error state, especially bookings, support, Care+, host/office dashboards, and payments.

## Live Activities And Dynamic Island

- Start a Live Activity only for confirmed or actively assigned bookings where the user benefits from glanceable progress.
- Update only non-sensitive status: confirmed, on the way, arrived, job started, completed, cancelled, reassigned, or support reviewing.
- Do not show full address, gate code, lockbox code, access notes, payment reference, private complaint detail, ID data, or background-check data.
- End stale activities promptly after completion, cancellation, or timeout.
- Provide App Review with a demo booking that can move through confirmed, on the way, arrived, started, and completed states.
- Keep the Dynamic Island compact text calm and operational, for example `Nomsa on the way`, `Arrived`, or `Support reviewing`.
- Ensure the backend can update Live Activities through APNs for production; the web bridge is only a local/native-shell handoff.

## WidgetKit Widgets

- Let users create configurable widgets for Next Booking, Care+ Home Readiness, ZootCred, and Favourite Zooter.
- Widget content must use cached, non-sensitive summaries and deep-link into authenticated app screens.
- Do not put addresses, access instructions, gate/lockbox codes, or private support details in widgets.
- Include placeholder, snapshot, no-booking, logged-out, and stale-cache states.
- Use App Intents only for safe configuration or navigation actions; booking changes, payments, cancellations, and support escalation should require authenticated in-app confirmation.

## Google Play Checklist

- Complete the Data safety form accurately for every data type collected or shared, including third-party SDK behavior.
- Declare location, personal info, financial info, photos/videos, files/documents, app activity, device identifiers, and diagnostics where applicable.
- Make privacy policy and data deletion details accessible from the store listing and inside the app.
- If AI generation becomes a central app feature, comply with Google Play's AI-generated content policy and user feedback requirements.
- Ensure AI-generated or AI-assisted outputs cannot create prohibited content, scams, harassment, deepfake sexual content, deceptive election content, malicious code, or fake official documents.
- Keep payments compliant: do not bypass required billing rules for in-app digital goods, and ensure physical service payments are clearly described.
- Avoid deceptive behavior: no fake reviews, misleading rankings, manipulated ratings, hidden data collection, or false trust/safety claims.
- Remove unused permissions and justify every permission in user-facing copy.
- Protect mobile credentials against OWASP Mobile Top 10 risks: improper credential usage, inadequate supply chain security, insecure auth/authorisation, insufficient input/output validation, insecure communication, privacy control gaps, insecure storage, and weak cryptography.
- Test app bundle signing, production keystore handling, version codes, target SDK requirements, and release track configuration.

## Android Native And QA Gate

- A production Android app must include a real Android project with Gradle, AndroidManifest, signing config, adaptive icons, notification channels, deep links, Play Integrity where appropriate, and secure storage.
- Do not request background location, contacts, SMS, call log, microphone, camera, photos, or notification permissions unless the specific Zoot flow needs them and explains them at the moment of use.
- If Android home-screen widgets are added, keep them non-sensitive and equivalent to the iOS widget policy: Next Booking, Care+ Readiness, ZootCred, and Favourite Zooter summaries only.
- Test on at least one current Android emulator and one lower-memory profile before Play submission.
- Validate Play Data Safety declarations against actual app code, third-party SDKs, analytics, crash reporting, payments, maps, messaging, and AI providers.

## Zoot-Specific Release Gates

- Care+ copy says priority replacement support, not guaranteed replacement.
- Home Memory stores access notes securely and avoids exposing gate/lockbox codes outside the app.
- Favourite Zooter flow uses personal CTA copy such as `Book Nomsa again` but respects availability.
- ZootCred and R30 add-on credit terms explain eligibility, expiry, and completed-booking requirement.
- Host and office dashboards do not expose tenant/client/staff details beyond the current account's scope.
- Support escalation has a human-review path for refunds, damage, theft, harassment, safety, no-shows, cancellation, and access-code issues.
- Haptics are subtle, optional, degrade gracefully, and do not block core actions on unsupported devices.
- PWA installability is a fallback, not proof that native iOS/Android store builds are submission-ready.
