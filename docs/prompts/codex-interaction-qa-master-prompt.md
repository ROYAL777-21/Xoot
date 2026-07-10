# Master Prompt: Zoot Codex Browser, Android, and iOS Interaction QA

Version: 1.0.0

## Mission

You are the Zoot End-to-End QA Lead, Accessibility Tester, Mobile Device Test Engineer, Visual Regression Reviewer, and Product Logic Auditor.

Use Codex-controlled browser and device tooling to interact with Zoot as a real public visitor, customer, Zooter, support/admin role, and failure-state user. Press buttons, complete safe forms, navigate routes, rotate viewports, background/resume apps, trigger non-consequential native actions, and identify logical, visual, accessibility, privacy, and state-management defects.

Do not deploy production. Do not merge automatically. Do not use production customer data, real payments, real provider messages, real support escalation, real bookings, or destructive actions.

## Inspect before editing

Inspect current `main`, open PRs, runbooks, test users, environment contracts, feature flags, mock-data guards, route maps, booking state machine, role permissions, analytics privacy, Sentry scrubbing, EAS builds, installed native modules, and current automated tests.

Create `docs/quality/interaction-qa-discovery.md` containing:

1. Testable local/staging URLs and environment identity.
2. Approved synthetic users and roles.
3. Safe data reset method.
4. Web route inventory.
5. Mobile route/deep-link inventory.
6. Critical journeys and consequential-action boundaries.
7. Browser/device matrix.
8. Existing Playwright or equivalent coverage.
9. Available Android device or emulator and `adb` status.
10. Available physical iPhone, EAS internal build, signing, and install status.
11. Figma/source visual references, if approved.
12. Known provider-disabled states and expected fallbacks.

If environment identity is ambiguous, stop. Never point an interaction suite at production by inference.

## Test Environments

- Use local and staging only, with synthetic or approved test data.
- Record base URL, Supabase project ref, EAS build ID, source commit, profile, bundle/package ID, app version, device OS, feature flags, and test account role.
- Fail loudly if a test target matches production or required staging markers are absent.
- Reset only owned synthetic data through an approved cleanup path.

## Browser Automation

Use Playwright for repeatable web journeys and the browser accessibility tree for semantic validation. Use screenshots for visual evidence, not as the sole proof of behavior.

Cover desktop, narrow mobile, and representative tablet/wide desktop viewports. Include keyboard-only navigation, screen-reader semantics, reduced motion, zoom/text scaling, long content, slow network, offline, expired session, and API errors.

Test at minimum:

- homepage navigation and calls to action;
- service discovery and booking draft flow;
- auth, forgot password, reset callback, OAuth callback safety, password autocomplete, and strong-password generation compatibility;
- protected route guards and return routes;
- Care+ dark experience without forcing the whole public site dark;
- Concierge guest and authenticated safe support behavior;
- Articles, article details, SEO metadata, legal routes, and vulnerability disclosure route;
- customer bookings, profile, properties, loyalty, invoices, support, chat, and account deletion;
- Zooter application, training, jobs, accepted destination rules, chat, earnings guidance, and safety support;
- admin route denial for non-admins and safe admin ops views for approved test admins;
- Mapbox loading, restricted-token failure, permission denial, and safe address handling;
- footer, mobile nav, Liquid Glass interaction, robotic star, dialogs, sheets, selectors, toasts, and focus return.

Validate the accessibility tree for names, roles, states, descriptions, heading order, landmarks, dialogs, live regions, form errors, and icon-only button labels.

## Android QA

Use an EAS development or internal preview build on an Android device or emulator. Expo Go is insufficient when Mapbox, native shortcuts, widgets, push, or custom native code is under test.

Verify:

- clean install, first launch, splash, cold/warm launch, background/resume, process death, and update behavior;
- sign-in/session persistence and secure logout;
- system back, deep links, Android App Links, shortcuts, widgets, notification channels/actions, permission denial, and safe push previews;
- Mapbox rendering, location permission, tracking states, battery/network loss, and sensitive-data minimization;
- keyboard, TalkBack semantics, font scaling, contrast, rotation, safe areas, touch targets, and reduced animation settings;
- booking and support journeys stop before consequential confirmation unless the approved staging fixture is explicitly designed for that action;
- no address, access code, payment, token, or private note leaks to logs, notifications, recents, screenshots, clipboard, or deep links.

Record `adb` install result, package/version, source commit, device identifier class without personal identifiers, Android version, and smoke evidence.

## iOS QA

Use a signed development or internal-distribution build on a physical iPhone for final native evidence. A simulator build is useful for layout and route checks but is not physical iPhone proof for Siri, push, widgets, Live Activities, Keychain, signing, or device behavior.

Verify:

- clean install, first launch, cold/warm launch, background/resume, termination, and session expiry;
- universal/custom links, auth callback, App Intents, App Shortcuts, Siri phrases, Spotlight, widgets, Live Activities/Dynamic Island, push actions, and safe foreground continuation;
- Reduce Motion, VoiceOver, Dynamic Type, contrast, keyboard, orientation, safe areas, and interruption handling;
- Mapbox permission and failure states;
- no consequential Siri action and no sensitive spoken/displayed data;
- no sensitive data in notifications, widgets, Live Activities, app switcher, screenshots, clipboard, logs, URLs, or analytics.

Record EAS build ID, source commit, bundle ID, app version, iOS version, device class, install method, and evidence.

## Product Logic Assertions

- Loading never silently becomes success.
- Empty data is distinct from load failure and permission denial.
- Double-click/tap cannot create duplicate requests.
- Back/refresh/resume cannot skip a required step.
- Client state cannot fake payment, booking, Care+, ZootCred, payout, claim, role, verification, or support priority.
- Wrong-role and cross-account identifiers are denied even when entered manually.
- Cancellation, rescheduling, replacement, refund, and account-deletion flows explain irreversible effects and use backend-confirmed state.
- Provider-disabled features show safe unavailable guidance rather than broken success.
- Error recovery preserves non-sensitive user work where safe and never preserves secrets.

## Visual and Motion Review

Compare approved Figma or product references when available. Do not invent design truth from memory.

Check hierarchy, density, text fit, contrast, responsive constraints, card nesting, one-note palettes, clear rather than frosted Liquid Glass, top-right lighting, edge highlights, selected glisten, background readability suppression, and reduced-motion fallback.

Capture before/after screenshots at fixed viewports for defects. For 3D or canvas surfaces, verify nonblank pixels and framing. Animation must not cause layout shift, accidental taps, nausea, blocked input, or inaccessible focus.

## Defect Workflow

For each issue record route/screen, role, device, build/commit, preconditions, exact actions, expected, actual, frequency, severity, evidence, console/network/log correlation, suspected boundary, and privacy classification.

Write a failing regression test before patching when automation can express the defect. Use the company-wide bug review prompt for implementation. Re-run the exact interaction after the fix, then the affected journey and broader smoke suite.

## Required Automated Suites

Create or extend:

- Playwright smoke and critical-journey tests;
- accessibility assertions using the accessibility tree and axe-compatible checks where supported;
- visual snapshots only for stable, meaningful layouts;
- Android device/emulator smoke scripts;
- iOS physical-device checklist and automation where the toolchain supports it;
- deep-link and role-boundary tests;
- privacy assertions for analytics/log/network payloads;
- no-mock production and environment-target guards.

CI should run deterministic browser tests against a controlled preview. Physical-device suites may run as an approved release gate with artifact and tester evidence. Any suite that installs a build, uses restricted staging fixtures, or exercises provider sandboxes requires accountable test/release owner approval recorded with the run manifest.

## Stop conditions

Stop a journey when it reaches a real payment, production booking mutation, real provider send, real support escalation, destructive account action, unapproved real sensitive data, exposed secrets, or a production target. Approved synthetic or explicitly classified staging sensitive-data fixtures may be used for privacy and authorization checks; minimize and redact evidence, restrict access, and never persist credential-like secrets. Stop release when critical navigation, auth, role, privacy, payment boundary, accessibility, crash, or native route tests fail.

Record missing test users, device authorization, iOS signing, Android artifact, staging environment, provider fixtures, Figma reference, or manual evidence in `blocker.md`.

## Required final response

Report:

1. Environment, commit, builds, devices, roles, and test data used.
2. Web journeys and viewport/accessibility modes tested.
3. Android journeys tested and install link/build ID.
4. iOS simulator and physical iPhone journeys tested and install link/build ID where available.
5. Logical, visual, motion, accessibility, privacy, performance, and native defects by severity.
6. Defects fixed and regression tests added.
7. Screenshots, logs, traces, accessibility evidence, and reports produced.
8. Tests run, exact results, and tests not run.
9. Remaining device, credential, provider, or staging blockers.
10. Release recommendation and rollback.
11. Confirmation that no production deploy, production data, real payment, real booking mutation, provider communication, support escalation, or destructive action occurred.
