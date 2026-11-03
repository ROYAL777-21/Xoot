# Apple sign-in readiness — 2 November 2026

This evidence records truthful account-entry choices, not enabled Apple authentication.
Inspection base: approved `fa0050862b018d0fa9ba6a08fcc3a4271746f4c6`; the final patch is
rebased onto approved schema release `ad6e4efb47289cd742d88b10791b5803780e7262`.
All independent worklog entries and actual generated schema types are preserved. No provider settings,
credentials, enrollment, build, payment or hosted data were changed for this work.

## Observed production state

At `2026-11-02T20:27:26Z`, the intended production publishable client configuration
was used for a read-only `GET /auth/v1/settings`. It returned HTTP 200 with
`external.apple=false`, `external.google=true`, `external.email=true`, and
`disable_signup=false`. No key or token was logged. This public response does not
prove any private Apple identifier, secret, redirect allowlist or entitlement.

The old web Auth and Welcome screens exposed actionable Apple choices. The native
availability helper treated Android alone as ready; on iOS it checked only device
capability. Both could offer an authentication method the production provider rejects.

## Bounded implementation

`src/lib/apple-auth-readiness.ts` is a dependency-free reviewed release record. Provider
configuration and separate web, signed iOS, and Android-browser acceptance all remain
false. The existing native sync copies exactly this record into the mobile package.
Web entry screens hide Apple and the auth handler checks the same condition. Native
availability and direct sign-in reject an unready surface before invoking its transport.
Google/email entry, existing signup text, nonce/state verification, ID-token exchange and PKCE
callbacks are preserved. No additional auth-page request, setting fetch or paid call is added.

The root review also authorized removing Welcome's unsupported phone continuation and
hardcoded “142 homes cleaned in Sandton this month” claim. Both had failing negative
controls before removal. The available email entry becomes the primary button; no new
activity count, provider or service-availability claim replaces the removed metric.

Changing this record requires a reviewed code release supported by the applicable
provider and surface evidence below. An OS check or provider toggle alone is insufficient.
This is not an authorization control; Supabase remains the authentication authority.

## Setup still required

The founder previously confirmed no enrolled Apple Developer team and requested that
Apple remain pending. Do not enroll, purchase, create keys or enable the provider from
this document alone.

| Area | Actual source / remaining evidence |
| --- | --- |
| Developer ownership | An enrolled team and authorized owner are still needed. Expo ownership is not an Apple team. |
| Apple identifiers | Register/verify a primary App ID with Sign in with Apple, then associate a Services ID and website. No actual Apple registration was verified here. |
| Native app | Source uses `za.co.xoot.app`; preview uses `za.co.xoot.app.preview`. `ios.usesAppleSignIn=true` and SDK 56's `expo-apple-authentication` are present. The CNG plugin is absent. Add/configure it in a separate native-build change and inspect the generated entitlement and provisioning before a real signed build. |
| Web provider | Team ID, signing Key ID, securely held `.p8`, Services ID and client secret must be configured privately. Web client secrets need renewal within six months; native-only exchange does not use that web-secret cycle. |
| Audiences | Services ID must be first in Supabase Client IDs; include the accepted native bundle IDs for ID-token audiences. Do not disable nonce verification. |
| Provider callback | Current production project callback is `https://mvlrkelahhsyjrwgsxaf.supabase.co/auth/v1/callback`. A Xoot auth domain must actually be configured before substituting one. Use the separate staging project's callback for staging. |
| App return | Source uses the web origin's `/auth/callback` with a safe next path and native `xoot://auth/callback`. Verify exact accepted origins/allowlists; no broad wildcard is required by this change. Provider transit uses provider domains. |
| Hidden-email delivery | Register every actual Xoot sender domain/address in Apple's private relay; verify aligned SPF/DKIM and real delivery. Existing general email delivery does not prove Apple relay registration. |
| Personalization | iOS requests first-login full name but the current adapter drops it. Save it through the profile flow or collect the name before claiming Apple-provided personalization; web OAuth needs separate name collection. |

Native source already generates a random nonce and state, sends the nonce digest to
Apple, verifies response state, and sends the original nonce with the ID token to
Supabase. Browser callbacks use PKCE. These source checks do not prove the signature,
audience or device entitlement in a real authentication attempt.

Real web and signed iPhone checks remain: first/repeat sign-in, cancellation, wrong
state/nonce/audience rejection, hidden email, profile completion, and safe return to
Xoot. Android browser acceptance is independent. Interim hidden choices do not make
the native app ready for App Store submission.

## Verification and rollback

The four original-behavior regressions failed against unmodified source: Apple remained
visible on Auth/Welcome, and iOS/Android availability returned true. The repaired tests
exercise actual rendered pages and the native boundary; positive accepted fixtures
preserve the existing transports without making a real provider request.

Local verification on 2–3 November:

- 88 focused auth/readiness/native/PKCE/generated-sync/marketing cases passed across ten files;
  web/mobile typechecks, scoped lint and the unsafe-DOM scan passed.
- The full local run was **not green**: 2165 passed, 7 failed, 7 skipped across 209 files.
  Five failures hit existing 5-second deadlines (BookingFlow, GiftClean twice,
  ops-booking-status-access, checklist-support-handlers); another GiftClean case did
  not reach the cancelled status. These four behavior files subsequently passed all
  57 cases in isolation with unchanged deadlines and no source changes.
- The seventh failure was kit-tokens' exact generated-byte check. It still failed in
  isolation because this Windows checkout used CRLF. Verifying unchanged canonical
  content and normalizing only the two local token files to LF made all ten kit cases
  pass. No token values, generator, guard or unrelated generated file is in this patch.
- Isolated Chromium rendered the actual Auth and Welcome components at 320, 390 and
  1024 pixels: zero Apple choices, one Google choice per surface, no unsupported phone
  continuation or fabricated activity count on Welcome, no horizontal overflow,
  zero external requests and no page errors. Auth context/Supabase transports were local
  fixtures; this is UI evidence, not a provider or signed-device acceptance result.
  One cold development-fixture navigation hit the existing 30-second load deadline;
  its diagnostic retry passed all six views with that deadline unchanged. This does
  not establish production latency or native performance.

Screenshots are local ignored artifacts `.render-check/apple-{auth,welcome}-{width}.png`.
Required isolated release CI must pass before merge; the local broad failures were not waived.

Web rollback is a code release. Keep the readiness record closed during any UI rollback;
never reopen a nonfunctional choice as a substitute for provider acceptance. Native
changes require a new approved binary; no signed binary was built in this session.
Parent Release/Correctness review and required CI precede promotion.

## Primary documentation checked

- [Apple web identifiers and association](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/)
- [Apple signing key](https://developer.apple.com/help/account/capabilities/create-a-sign-in-with-apple-private-key)
- [Apple private email relay](https://developer.apple.com/help/account/capabilities/configure-private-email-relay-service)
- [Supabase Apple authentication](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple)
- [Expo SDK 56 AppleAuthentication](https://docs.expo.dev/versions/v56.0.0/sdk/apple-authentication/)

Read the exact Expo SDK 56 page before native changes, as `mobile/AGENTS.md` requires.
