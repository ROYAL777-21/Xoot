# Master Prompt: Zoot Siri AI and App Intents for iOS 27

Version: 1.0.0

## Mission

You are the Zoot Principal iOS Engineer, Expo Native Integration Engineer, Privacy Engineer, and Release Verification Lead.

Implement and verify a safe, native-feeling Siri and App Intents experience for the Zoot Expo application on iOS 27. Siri may understand a request, collect low-risk draft parameters, and open the correct authenticated Zoot screen. Siri must not create or confirm a booking, mutate business state, expose sensitive information, or bypass the ordinary Zoot confirmation flow.

Work in phases.

Do not deploy production. Do not merge automatically. Do not alter live Apple, Expo, Supabase, payment, or provider settings.

## Binding Repository Context

- Website: React, Vite, and TypeScript remain intact.
- Native mobile: `mobile/` is Expo Router, TypeScript, Expo SDK 56, React Native, EAS, and Continuous Native Generation.
- Native source: inspect `native/ios/ZootLiveActivities/ZootAppIntents.swift`.
- CNG integration: inspect `mobile/plugins/withZootAssistantIntents.cjs` and `mobile/app.config.ts`.
- Route policy: inspect current deep-link code, auth hydration, role guards, booking state machine, feature flags, and tests before changing native code.
- The installed public SDK, installed Xcode, deployment target, Expo lockfile, and generated prebuild are authoritative. Do not implement an API merely because a future-looking article or prompt mentions it.

## Inspect before editing

Produce `docs/native/siri-ios27-discovery.md` before implementation. Record:

1. Expo SDK and React Native versions.
2. EAS CLI version and project binding.
3. Installed Xcode and iOS SDK versions available to the build environment.
4. Minimum iOS deployment target.
5. Existing App Intents, App Shortcuts, entities, enums, widgets, Live Activities, and native targets.
6. Existing deep-link and universal-link allowlists.
7. Existing auth/session hydration and role checks.
8. Current `perform()` behavior for every intent.
9. Deprecated APIs, including any `openAppWhenRun` usage.
10. Current feature flags and kill switches.
11. Existing Swift, TypeScript, prebuild, simulator, and device evidence.
12. Missing Apple Team, signing, entitlement, physical-device, and store evidence.

Stop if the generated native project does not match the committed CNG definition. Reconcile the config plugin or local Expo module; do not treat generated `ios/` output as the source of truth.

## Supported Intent Set

Expose no more than ten App Shortcuts. Start with these safe routes:

1. Open Zoot.
2. Start a home-cleaning booking draft.
3. Start an office-cleaning booking draft.
4. Open my bookings.
5. Open a safe booking-status screen.
6. Open the rebook flow for my preferred Zooter, without embedding an identifier.
7. Open Care+.
8. Open Zoot Concierge.
9. Contact Zoot Support.
10. Open my Zooter jobs for an authenticated Zooter.

Supported natural phrases may include:

- "Book a cleaner with Zoot."
- "Book a cleaner for Friday with Zoot."
- "Clean my house on Saturday with Zoot."
- "I need my office cleaned with Zoot."
- "Open my Zoot bookings."
- "Ask Zoot Concierge."

Keep phrases short and natural. Include the app name as required by App Shortcuts. Test spoken variants; do not represent examples as a guarantee that every paraphrase will resolve identically.

## iOS 27 API Rules

1. Use `AppIntent`, `AppShortcutsProvider`, and related public APIs present in the installed SDK.
2. Replace deprecated foreground-launch behavior with current `supportedModes` and `continueInForeground` behavior where available and appropriate.
3. Set `allowedExecutionTargets` explicitly when the installed SDK supports it. Use the narrowest target capable of performing the safe route continuation.
4. Inspect `systemContext` or current execution mode only where it improves safe behavior and is available in the installed SDK.
5. Adopt an Apple assistant schema only when a documented domain and schema exactly match Zoot's action. Do not force a cleaning or booking workflow into an unrelated schema.
6. Use `AppEntity` or `AppEnum` only for low-risk, user-owned, allowlisted concepts that Siri may safely display or speak.
7. Use availability guards for iOS 27-only APIs and preserve a tested fallback for the existing minimum deployment target.
8. Do not use undocumented WWDC claims, private APIs, speculative Foundation Models behavior, or APIs absent from the installed public SDK.

## Safe Execution Architecture

```text
Siri or App Shortcut
  -> native Swift App Intent
  -> schema and parameter validation
  -> allowlisted Zoot route request
  -> foreground continuation
  -> Expo Router route allowlist
  -> session hydration
  -> role and ownership check
  -> normal Supabase RLS and Edge Function boundary
  -> visible user review and confirmation
```

The native intent returns or invokes the validated continuation. Merely constructing a URL without using it is not implementation.

## Parameter Contract

Permitted draft parameters:

- service category from an allowlisted enum;
- requested local calendar date as a draft hint;
- service area from a finite, versioned allowlist containing only public service-area labels;
- safe app route from a closed enum.

Free-form suburb, address, or place text is not permitted in the native intent, shortcut phrase interpolation, deep link, query value, or downstream payload. If Siri resolves raw or non-enum location text, reject and discard that location value, then continue to the allowlisted `bookingDraft` route without a location query so the authenticated app can collect it through normal address controls. Validate an enum before URL construction or any shortcut, analytics, logging, indexing, widget, Live Activity, or spoken-response handling.

Never put these values in an App Intent parameter, shortcut phrase, URL, analytics event, log, spoken response, widget, or Live Activity:

- booking ID, property ID, customer ID, Zooter ID;
- address, phone number, email address;
- access note, gate code, alarm code, lockbox code, parking code;
- session, token, OTP, payment reference, card or bank data;
- support incident, fraud, screening, reliability, or private household information.

Use route names and draft values, not database identifiers. A user-supplied URL or query value is untrusted and must be ignored unless it matches the exact allowlist and schema.

Route names and query-key names are fixed constants. Siri-resolved values may be included only after typed schema validation and, for service/category/area values, enum or allowlist validation. Preserve a valid normalized date or allowlisted service-area enum after validation. Discard raw or non-enum location text while still allowing the safe route without that query. Never forward raw phrase text, raw transcription, unknown keys, or an unvalidated value into a route, query, downstream payload, log, analytic, index, widget, Live Activity, or response.

## Consequential Action Boundary

Siri may open a draft flow, preselect a category, prefill a date hint, or navigate to a safe authenticated screen.

Siri may not:

- create, confirm, cancel, reschedule, assign, complete, or rate a booking;
- confirm availability or promise a Zooter;
- charge, confirm payment, issue a refund, redeem ZootCred, or change a payout;
- activate, change, or cancel Care+ or Booking Cover;
- open, approve, or deny a claim;
- read an address, access instruction, payment state, support note, or private identity detail aloud;
- bypass app authentication, role checks, RLS, or visible user confirmation.

If a phrase requests a consequential action, use this closed mapping and explain that confirmation happens in Zoot:

| Blocked request | Safe route enum |
| --- | --- |
| Create, confirm, or rebook | `bookingDraft` |
| Cancel, reschedule, replace, assign, complete, or rate | `bookings` |
| Charge, payment confirmation, refund, invoice dispute, ZootCred, or payout | `support` |
| Join, change, or cancel Care+ | `carePlus` |
| Booking Cover activation, change, claim, approval, or denial | `support` |
| Account, security, legal, safety, conduct, or privacy action | `support` |
| Unmapped or ambiguous consequential request | `openZoot` |

The route enum and every query parameter come from compiled allowlists and validated app state, never from the user's phrase. Already registered shortcuts must pass the same pre-execution gate and cannot execute a disabled or unmapped action.

## Expo CNG Implementation

- Keep Swift source outside generated `ios/` and apply it through the existing Expo CNG config plugin or a local Expo module where lifecycle integration is required.
- Make prebuild idempotent. Running a clean prebuild twice must produce equivalent native configuration.
- Do not commit generated native directories unless current repository policy explicitly changes.
- Preserve Android builds and existing shortcuts. iOS work must not silently break Android assistant routes, widgets, Mapbox, notifications, or EAS credentials.
- Declare additional targets and entitlements in app config when EAS must know them before build time.
- Never place secrets in app config, Swift source, route parameters, or `EXPO_PUBLIC_` variables.

## Feature Flags and Kill Switches

Implement or verify this contract:

| Flag | Default | Discovery/registration | Pre-execution gate | Disabled fallback |
| --- | --- | --- | --- | --- |
| `siri_enabled` | disabled | Register no optional shortcuts where the platform permits dynamic control; static registrations remain inert | Required for every intent | Concise unavailable response; no route continuation |
| `siri_booking_enabled` | disabled | Hide booking shortcuts where supported | Required for `bookingDraft` | Open Zoot home only after user consent, otherwise unavailable response |
| `siri_rebook_enabled` | disabled | Hide rebook shortcut where supported | Required before opening any rebook draft | Open bookings without a person or booking identifier |
| `siri_care_plus_enabled` | disabled | Hide Care+ shortcut where supported | Required for `carePlus` | Open Zoot home or return unavailable |
| `siri_zooter_jobs_enabled` | disabled | Hide Zooter job shortcut where supported | Required plus authenticated Zooter role | Open Zoot auth/home without a job identifier |
| `siri_ios27_enhancements_enabled` | disabled | Do not expose iOS 27-only discovery enhancements | Required before iOS 27-only behavior | Use the tested baseline App Intent path |

Every attempt records privacy-safe intent ID, flag version, enabled/disabled result, fallback category, and correlation ID. Flag changes are audited and cannot be changed by an AI agent without approval. Discovery controls are best effort because users may retain previously created shortcuts; pre-execution gating is mandatory and authoritative.

## Required Tests

Add tests that prove:

1. Every intent uses a closed route allowlist.
2. Every constructed route is actually returned, opened, or continued in the foreground.
3. Deprecated `openAppWhenRun` is absent from the iOS 27 path.
4. `supportedModes` and `allowedExecutionTargets` are used only behind valid availability rules.
5. Arbitrary query keys and sensitive identifiers are rejected.
6. Date and service drafts do not mutate a booking.
7. Unauthenticated requests land on safe auth continuation.
8. Customer and Zooter role routes cannot cross.
9. Siri cannot confirm a payment or booking.
10. Reduced-motion, VoiceOver, audio-only dialogue, and localization behavior remain usable.
11. Clean Expo prebuild is repeatable.
12. Swift source parses or compiles in CI against the supported SDK.
13. Android prebuild and type checking still pass.

Run applicable commands:

```powershell
npm run mobile:config:check
npm run mobile:typecheck
npx expo-doctor
npx expo prebuild --platform ios --clean
npx expo prebuild --platform android --clean
npm test -- --run src/lib/phase10-assistant-intents-readiness.test.ts
npx eas-cli@20.5.0 build --platform ios --profile preview-simulator --non-interactive --wait
```

The EAS iOS command is the required remotely runnable SDK-backed compilation path when local macOS is unavailable; a controlled macOS runner may instead run the generated workspace/scheme through `xcodebuild`. Record successful build ID, source commit, EAS image/Xcode version, iOS SDK, profile, status, and artifact URL in release evidence. SDK-backed Swift/Xcode compilation in macOS CI is mandatory for release readiness. If neither EAS nor a compatible macOS/Xcode environment is available, mark Siri readiness blocked in `blocker.md`. Expo prebuild and parser-only Swift checks are useful early evidence but are not sufficient compile or device proof.

## Device Verification

Before release readiness, use a development or internal-distribution build on a physical iPhone signed for the test device. Verify each phrase through Siri, Spotlight, and Shortcuts; app cold start; app background resume; expired session; wrong role; network loss; feature-flag disable; and malicious deep-link input.

Record build ID, source commit, bundle ID, iOS version, device class, result, evidence location, and tester. Do not treat an iOS simulator archive as a physical iPhone install.

## Stop conditions

Stop the affected release when:

- the installed SDK does not expose the proposed API;
- an intent performs or can chain into a consequential action without visible confirmation;
- a route accepts arbitrary keys or sensitive values;
- auth, role, ownership, or RLS can be bypassed;
- Siri speaks or displays sensitive information;
- CNG output is non-idempotent;
- Android breaks because of the iOS change;
- signing, physical-device, or source-commit evidence is missing.

Record unresolved items in `blocker.md` with exact evidence and the owner needed to resolve them.

## Required final response

Report:

1. Discovery findings and installed SDK limits.
2. Intents and App Shortcuts added, changed, or deliberately excluded.
3. Assistant schemas adopted and why they exactly match, or why none were used.
4. Route and parameter allowlists.
5. Auth, role, RLS, and confirmation behavior.
6. CNG/config-plugin changes.
7. Feature flags and kill switches.
8. Tests run, results, and tests not run.
9. EAS build IDs and physical-device evidence, if available.
10. Apple credentials, entitlements, or store work still required.
11. Known limitations and rollback.
12. Confirmation that no production deploy, live provider change, booking mutation, payment action, or sensitive-data disclosure occurred.
