# Android Native Readiness

Reviewed on 2026-05-28.

This repository contains the Xoot React/Vite web app plus a separate `/mobile` Expo app. It still does not keep a committed Gradle project, because Android native files are generated through Expo prebuild/EAS. Native assistant shortcut and safe widget source now live under `native/android` and are copied by `mobile/plugins/withXootAssistantIntents.cjs`.

## Current Branch Coverage

- Installable PWA manifest and app icon are present for browser install flows.
- Store-readiness checklists cover Google Play, Android Data Safety, AI-generated content policy, and OWASP Mobile Top 10 risks.
- The web app includes safe haptics and native bridge patterns, but browser vibration is not a substitute for native Android haptics.
- Care+, Home Memory, Favourite Xooter, XootCred, host dashboards, office dashboards, support priority, and security docs are represented in the web app.
- Android assistant shortcuts are defined in `native/android/res/xml/shortcuts.xml` and deep-link into safe authenticated routes.
- A first safe Android home-screen widget is defined in `native/android/src/main/java/za/co/zoothome/widgets/XootStatusWidgetProvider.java` with resource files under `native/android/res`. It displays only non-sensitive summary copy and deep-links into Xoot for live booking status.

## Required Before Google Play Submission

- Keep the Expo Android prebuild path healthy with package id, adaptive icons, splash screen, signing setup, version code/name, release build type, and Play track configuration.
- Implement secure auth/session storage with Android Keystore-backed storage, not raw shared preferences.
- Add notification channels for booking updates, support, Care+, and account/security events.
- Add deep links for bookings, support cases, Care+, host dashboard, office dashboard, Favourite Xooter rebook, and XootCred.
- Implement native haptics for primary actions, confirmation, warning, and error states using Android APIs while respecting accessibility and system settings.
- Extend Android home-screen widgets only with non-sensitive summaries: Next Booking, Care+ Home Readiness, XootCred, Favourite Xooter, and accepted Xooter job prompts.
- Keep full addresses, access notes, gate codes, lockbox codes, payment references, support complaint details, ID data, and background-check data out of widgets and notification previews.
- Complete Play Data Safety based on actual code and SDK behavior, including auth, analytics, crash reporting, maps, payments, messaging, AI, and support vendors.
- Run emulator QA on representative devices before Play submission.

## Emulator QA Checklist

- App installs, launches, signs in, signs out, and survives process death.
- Client can view Care+, Home Memory, Favourite Xooter, bookings, XootCred, support, host dashboard, and office dashboard.
- Xooter booking status updates show correct notifications without leaking sensitive access details.
- Haptics are subtle and do not block actions when unsupported or disabled.
- Widgets render placeholder, logged-out, no-booking, stale-cache, and active-booking states.
- Notification taps and widget taps deep-link to the correct authenticated screen.
- Network failure, expired session, payment pending, cancellation, support escalation, and replacement matching states are handled.
- Accessibility checks pass for TalkBack labels, touch targets, color contrast, dynamic font size, and reduced animation.
