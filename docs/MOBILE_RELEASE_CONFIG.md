# Zoot Mobile Release Configuration

Reviewed: 2026-06-08

This file inventories iOS, Android, PWA, Capacitor, push, app-link, privacy, and store-release configuration. It contains placeholders only.

## App Identity

| Item | Staging recommendation | Production recommendation | Storage |
| --- | --- | --- | --- |
| App name | Zoot Staging | Zoot | Xcode, Android Studio, store listings |
| Capacitor appId | `za.co.zoot.app.staging` if a separate staging native app is needed | `za.co.zoot.app` | `capacitor.config.ts` and native projects |
| iOS Bundle ID | `za.co.zoot.app.staging` | `za.co.zoot.app` | Apple Developer, Xcode |
| Android application ID | `za.co.zoot.app.staging` | `za.co.zoot.app` | Gradle/Play Console |
| Version | Match `package.json` release version | Match release version | package/native build settings |
| iOS build number | Increment every TestFlight/App Store build | Increment every build | Xcode/App Store Connect |
| Android version code | Increment every Play build | Increment every build | Gradle/Play Console |

Current branch status:

- `package.json` version is `0.1.0`.
- Capacitor dependencies are installed.
- Native project generation scripts exist.
- App link association generation exists.
- Native haptics and booking action bridge exist.
- Live Activities/Dynamic Island source exists under native iOS assets and still needs target integration.

## Apple Developer / iOS

Required before TestFlight:

- Apple Developer Team ID.
- Final iOS Bundle ID.
- Signing certificate or managed signing access.
- Provisioning profile for development, TestFlight, and App Store release.
- Push Notifications capability if native push is enabled.
- Associated Domains capability.
- Sign in with Apple capability if Apple auth is enabled.
- App Groups if widgets/Live Activities need shared storage.
- Privacy manifest review for native SDKs if applicable.

Build variables:

- `ZOOT_APPLE_TEAM_ID`
- `ZOOT_IOS_BUNDLE_ID`
- `ZOOT_IOS_APP_ID`
- `ZOOT_APP_LINK_PATHS`

Generated file:

- `https://zoothome.co.za/.well-known/apple-app-site-association`

AASA requirements:

- Serve without `.json` extension.
- Serve as JSON content type.
- Include production Team ID and bundle ID.
- Include only routes the native app can safely open.

## Google Play / Android

Required before Play testing:

- Final Android application ID.
- Release signing key or Play App Signing setup.
- Upload key stored outside repo.
- Adaptive icon and splash screen assets.
- Notification channels if push is enabled.
- App Links configuration and verification.
- Play Integrity/App Check strategy if required for anti-abuse.
- Play Store Data Safety form completed from actual code behavior.

Build variables:

- `ZOOT_ANDROID_PACKAGE_NAME`
- `ZOOT_ANDROID_SHA256_CERT_FINGERPRINTS`
- `ZOOT_APP_LINK_PATHS`

Generated file:

- `https://zoothome.co.za/.well-known/assetlinks.json`

Android App Links requirements:

- Use release SHA-256 certificate fingerprints.
- Include package name exactly as shipped.
- Verify links after deployment with Android tooling.

## Capacitor/PWA

Required commands after Node dependencies are installed:

```bash
npm run build
npm run mobile:add:ios
npm run mobile:add:android
npm run mobile:sync
```

Release checks:

```bash
npm run config:check
npm run lint
npm run test
npm run build
npm run security:scan
npm run mobile:sync
```

Native shells must wire:

- `zootBookingAction` for native maps, share ETA, and masked-call actions.
- `zootLiveActivity` for ActivityKit/Dynamic Island updates on iOS.
- Push notification registration and deep-link routing.
- Secure token storage using Keychain/Keystore through the native layer.

## Native Push Notifications

Required provider setup:

| Platform | Required setup | Secret/storage location |
| --- | --- | --- |
| iOS | APNs key/certificate, Push Notifications capability, app entitlements | Apple Developer and backend secret store |
| Android | Firebase project, FCM credentials, notification channels | Firebase/Google Cloud and backend secret store |
| Web/PWA | Web Push keys if web push is enabled | Backend secret store |

Rules:

- Device push tokens are user data and must be readable only by the owning user or backend service role.
- Push tokens must not be exposed to other users.
- Notifications must not include addresses, gate codes, lockbox codes, ID numbers, private support details, or payment references.
- Push tap actions may route to authenticated app screens, but must not mutate booking/payment state.
- Users must be able to revoke notification permission and stale tokens must be marked revoked.

Planned database surface:

- `native_push_subscriptions` table keyed by `user_id` and `device_id`.
- RLS policy: users can manage only their own subscriptions.
- Service role sends notifications server-side after event verification.

## App Store Privacy Labels

Expected data categories to review before submission:

- Contact info: email, phone if enabled, support contact details.
- User content: support tickets, booking notes, property/home memory, completion photos.
- Identifiers: Supabase user ID, device ID, push token.
- Purchases/payment info: payment provider records and transaction references.
- Location: service address and approximate/suburb coverage data.
- Diagnostics: crash/error logs if Sentry or equivalent is enabled.

Do not finalize privacy labels from plans. Finalize from the actual code, SDKs, Edge Functions, and provider dashboards.

## Play Store Data Safety

Review these before Play submission:

- Account creation and deletion path.
- Data collection and sharing by Supabase, payment providers, Twilio, Brevo, OpenAI, KIE, Sentry, and analytics tools.
- Data encryption in transit and at rest.
- User-requested deletion process.
- Whether data is optional or required for app functionality.
- Whether crash/diagnostic data is collected.

## Sensitive Payload Rules

Never show these outside the authenticated app:

- Full street address.
- Gate, alarm, lockbox, garage, or access codes.
- ID/passport data.
- Payment references or bank details.
- Support incident details.
- Private phone numbers.
- OTPs or password reset codes.

Allowed external notification summaries:

- Booking status changed.
- Zooter is on the way.
- Support replied.
- Care+ reminder.
- ZootCred updated.

## Store Submission Checklist

- [ ] Final bundle/application IDs confirmed.
- [ ] App icon and splash assets verified.
- [ ] TestFlight build installs and opens.
- [ ] Android internal testing build installs and opens.
- [ ] OAuth works on installed app if native auth is enabled.
- [ ] Deep links open correct authenticated routes.
- [ ] Push permission prompt appears only at a relevant moment.
- [ ] Push notification tap routes to the correct screen.
- [ ] Live Activity/Dynamic Island payloads are non-sensitive.
- [ ] App Store privacy labels completed from actual behavior.
- [ ] Play Data Safety completed from actual behavior.
- [ ] Support contact, privacy policy, and terms URLs are live.
- [ ] Demo/preview mode is disabled in production build.

## Manual Decisions Needed

No secret values are needed in chat. Confirm these decisions only:

- Final production app ID: keep `za.co.zoot.app` or change it?
- Separate staging native app IDs or production ID only for TestFlight/internal testing?
- Push provider path: APNs/FCM only, or web push too?
- Native auth path: Supabase browser-based OAuth callback, native provider SDKs, or both?
- Mobile launch countries: South Africa only at launch?
