# On-Device Assistants: Siri And Android/Gemini

Reviewed: 2026-06-20

This repo now uses a separate Expo app in `/mobile` for native iOS and Android release work. The assistant-ready work in this branch prepares safe native surfaces, but App Store/Play Store builds still need signed Expo/EAS releases before Siri, Spotlight, Android shortcuts, or Gemini-adjacent entry points can be verified on devices.

## Safe Assistant Surface

Assistant actions may open only safe Xoot destinations:

- Book a clean: `/app?intent=book_clean`
- Book a cleaner with Siri: `BookXootCleanerIntent` opens `/app` with booking intent context, optional service type, optional area, and optional date. Address, time, price, and payment confirmation stay inside Xoot.
- Ask Xoot Concierge: `/?zootBot=open&intent=concierge`
- Open Care+: `/care-plus?intent=care_plus`
- Open bookings: `/app/bookings?intent=bookings`

Assistants must not read out, display, or collect gate codes, alarm codes, lockbox codes, payment references, OTPs, private household notes, support complaint details, or identity documents.

## iOS

Prepared file:

- `native/ios/XootLiveActivities/XootAppIntents.swift`
- `BookXootCleanerIntent` for phrases such as "Book a cleaner with Xoot", "Clean my house with Xoot", "I need my office cleaned with Xoot", and "I need my place cleaned with Xoot".
- Expanded Siri examples covered by the app-opening intent: "Book a cleaner for a date with Xoot", "Clean my home with Xoot", "Clean my place with Xoot", "I need a cleaner for my office with Xoot", and "Schedule a house clean with Xoot".
- Safe deep link shape: `zoot://book?intent=book_clean&service=<residential|office|place>&area=<safe text>&date=<yyyy-mm-dd>`.

Implementation notes from Apple's App Intents and Apple Intelligence guidance:

- Keep App Shortcuts to the most common actions, not every screen.
- Set `openAppWhenRun = true` for UI navigation actions.
- Use clear phrases that include the app name.
- Register shortcut parameters during native app launch.
- Use Siri tips later inside native SwiftUI views after the app target exists.
- Use universal links or the native deep-link router to land on the matching Xoot route.
- Adopt assistant schemas only where Xoot maps to a known Apple domain; otherwise keep custom App Intents narrow, safe, and app-opening.
- Add entity display representations only for non-sensitive objects such as service types, safe destinations, and public booking status labels.
- Do not expose sensitive entities such as addresses, access instructions, gate codes, alarm codes, KYC documents, complaints, payment records, or private household notes to Siri, Spotlight, Shortcuts, or Visual Intelligence.
- Use on-screen context APIs only for public-safe screens after the native app target exists and route protection has been verified.

Required native follow-up:

1. Generate the native iOS project through EAS/prebuild only when the Expo config is ready.
2. Add `XootAppIntents.swift` to the iOS app target or an Expo config/plugin path that copies it during prebuild.
3. Register `XootAppShortcuts.updateAppShortcutParameters()` during launch.
4. Map the safe destination paths to the web/native router.
5. Test with Siri, Spotlight, Shortcuts, locked device, and unauthenticated sessions.
6. Add App Intents testing to the TestFlight QA checklist before public App Store submission.

## Android / Gemini-Adjacent Entry Points

Prepared template:

- `native/android/res/xml/shortcuts.xml`
- `native/android/res/values/strings.xml`
- PWA shortcuts in `public/manifest.json` and `public/manifest.webmanifest`

Required native follow-up after Expo prebuild/EAS native project generation:

1. Copy the shortcut XML into `android/app/src/main/res/xml/shortcuts.xml`.
2. Add matching string resources for each shortcut label.
3. Add the shortcuts metadata to the Android launcher activity.
4. Ensure verified Android App Links open `https://xoot.co.za/*`.
5. Test long-press launcher shortcuts, Google Assistant/Gemini app-opening behavior, PWA shortcuts, and signed-in route protection.

Current safe Android/PWA activation examples:

- "Clean my house" opens `/app?intent=book_clean&service=residential`.
- "I need my place cleaned" opens `/app?intent=book_clean&service=residential`.
- "I need my office cleaned" opens `/app?intent=book_clean&service=office`.
- "Book an Airbnb turnover" opens `/app?intent=book_clean&service=airbnb`.
- "Ask Xoot Concierge" opens `/?zootBot=open&intent=concierge`.

The web router preserves only approved assistant query keys: `intent`, `service`, `area`, `date`, and `zootBot`. Access codes, payment details, private notes, and arbitrary query data are stripped.

## Booking Voice Handoff

Voice assistants should never finish a Xoot booking by themselves. They open the booking screen with non-sensitive context only:

- Service category, such as `residential`, `office`, `airbnb`, `moving`, or `express`.
- Optional date in `yyyy-mm-dd` format.
- Optional suburb/area text after route sanitisation.

The app then shows a "Voice booking started" banner and requires the user to confirm address, arrival time, Xooter choice, payment, and protected household details inside authenticated Xoot screens.

## Quality Gate

- Assistant actions open the app quickly and never expose private account state.
- Guest users can ask Xoot Concierge general questions, but account-specific actions still require sign-in.
- Booking/payment/support decisions remain server-side and authenticated.
- Voice surfaces use the same source-of-truth constraints as `support-respond`.
