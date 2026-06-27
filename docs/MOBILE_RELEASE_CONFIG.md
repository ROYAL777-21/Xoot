# Zoot Expo Mobile Release Configuration

Reviewed: 2026-06-19

The Zoot mobile app is now planned as a separate Expo app in `/mobile`. The existing React/Vite website remains in place and must not be deleted or converted.

## App Identity

| Item | Preview/internal testing | Production |
| --- | --- | --- |
| App name | Zoot Preview | Zoot |
| Expo scheme | `zoot` | `zoot` |
| iOS bundle ID | `za.co.zoothome.app.preview` | `za.co.zoothome.app` |
| Android package | `za.co.zoothome.app.preview` | `za.co.zoothome.app` |
| EAS channel | `preview` | `production` |
| Version | `ZOOT_MOBILE_VERSION` | `ZOOT_MOBILE_VERSION` |
| iOS build number | EAS remote auto-increment | EAS remote auto-increment |
| Android version code | EAS remote auto-increment | EAS remote auto-increment |

Current scaffold:

- `/mobile` Expo SDK 56 app.
- Expo Router with TypeScript.
- `mobile/app.config.ts` dynamic config.
- `mobile/eas.json` development, preview, and production profiles.
- `mobile/.env.example` with public-safe placeholders only.
- Supabase mobile client using SecureStore-backed session storage.
- No production mock-data mode.
- EAS project: `@don-pacho777/zoot` (`b4c6e0b8-e2e7-40c5-b259-3b34c79be30b`).
- Supabase production project: `mvlrkelahhsyjrwgsxaf`.
- Supabase staging project: `fxmxyabdjqviqbcxmvlp`; schema/functions/secrets still need deployment using `docs/STAGING_BACKEND_DEPLOYMENT.md`.

## Required Expo Config

Required files:

- `mobile/package.json`
- `mobile/app.config.ts`
- `mobile/eas.json`
- `mobile/tsconfig.json`
- `mobile/.env.example`
- `mobile/src/lib/env.ts`
- `mobile/src/lib/supabase.ts`
- `mobile/src/lib/secure-storage.ts`

Production config must include:

- `scheme: "zoot"`
- `ios.bundleIdentifier: "za.co.zoothome.app"`
- `android.package: "za.co.zoothome.app"`
- associated domains for `zoothome.co.za`
- Android App Links for `https://zoothome.co.za/*`
- `expo-notifications` plugin
- `expo-secure-store` plugin
- `@rnmapbox/maps` config plugin for native Mapbox coverage/dispatch maps
- Sentry plugin once Sentry credentials exist

## Public Mobile Environment Variables

These are bundled into the app and must be public-safe:

- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_SITE_URL`
- `EXPO_PUBLIC_SUPABASE_PROJECT_ID`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_EAS_PROJECT_ID`
- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN` only if restricted to the mobile app use case
- `EXPO_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY` only after a restricted Turnstile widget is created
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` only if native Google auth is enabled
- `EXPO_PUBLIC_APPLE_SERVICES_ID` only as a public provider identifier

Do not use `EXPO_PUBLIC_` for service-role keys, payment secrets, Twilio secrets, Brevo secrets, KIE keys, OpenAI keys, Airtable tokens, Hostinger tokens, Cloudflare tokens, private keys, signing keys, or webhook secrets.

## Server-Side Secrets

Set these in Supabase Edge Function secrets, not in Expo:

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `STITCH_CLIENT_ID`
- `STITCH_CLIENT_SECRET`
- `STITCH_WEBHOOK_SECRET`
- `OZOW_SITE_CODE`
- `OZOW_PRIVATE_KEY`
- `OZOW_API_KEY`
- `OZOW_WEBHOOK_SECRET`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_API_KEY_SID`
- `TWILIO_API_KEY_SECRET`
- `TWILIO_VERIFY_SERVICE_SID`
- `TWILIO_TWIML_APP_SID`
- `BREVO_API_KEY`
- `KIE_API_KEY`
- provider webhook secrets
- `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` or `MAPBOX_DOWNLOADS_TOKEN` in EAS/CI secret storage for native Mapbox builds

## Supabase Auth Redirect URLs

Add these in Supabase Auth URL configuration:

- `zoot://auth/callback`
- `zoot://auth/reset`
- `zoot://**`
- `https://zoothome.co.za/auth/callback`
- `https://zoothome.co.za/auth/reset`
- `https://zoothome.co.za/**`
- preview equivalents after the preview domain is chosen

OAuth provider redirect/callback URLs must match Supabase Auth's provider instructions for Google and Apple.

## EAS Profiles

Profiles in `mobile/eas.json`:

- `development`: Expo development client, internal distribution.
- `preview`: internal distribution for TestFlight and Play internal testing.
- `production`: signed store builds, AAB for Android, EAS remote auto-increment.

Required EAS environments:

- `development`
- `preview`
- `production`

Current EAS environment routing:

- `production`: production Supabase project.
- `preview`: staging Supabase project.
- `development`: staging Supabase project.

Required EAS credential setup:

- Apple Developer Team selected.
- iOS distribution certificate.
- iOS provisioning profile.
- APNs key for notifications.
- Android upload key or EAS-managed credentials.
- Google Play service account key stored as a file secret or dashboard credential.

## Push Notifications

Mobile push uses Expo Push Service initially.

Client setup:

- `expo-notifications`
- physical-device permission prompt
- token stored in `native_push_subscriptions`
- token type `expo_push`

Backend setup still required:

- server-side notification sender Edge Function
- payload minimization
- stale token revocation
- no addresses, access codes, lockbox codes, ID data, payment references, private phone numbers, or support incident details in notifications

## Maps And Assistant Entry

- Website maps use `mapbox-gl` with `VITE_MAPBOX_PUBLIC_TOKEN`.
- Expo native maps use `@rnmapbox/maps`; this requires EAS development/preview/production builds, not Expo Go.
- Restrict public Mapbox tokens by domain/app where Mapbox allows it.
- Siri/App Intents are scaffolded in `native/ios/ZootLiveActivities/ZootAppIntents.swift`, including `BookZootCleanerIntent`.
- Android launcher shortcuts are scaffolded in `native/android/res/xml/shortcuts.xml`.
- Assistant entry points open safe booking or Concierge screens only; address, access, payment and support details stay inside authenticated app screens.

## Crash Monitoring

Use Sentry React Native:

- `EXPO_PUBLIC_SENTRY_DSN` in EAS public env
- `SENTRY_ORG`, `SENTRY_MOBILE_PROJECT`, and source-map auth token in EAS/CI secret storage
- one Sentry project for mobile or separate `zoot-mobile-ios` and `zoot-mobile-android` projects
- release name tied to EAS build/version

## Store Readiness

Before TestFlight:

- App Store Connect app record exists.
- Bundle ID matches `za.co.zoothome.app`.
- Apple Sign in capability enabled if Apple auth is enabled.
- Associated Domains enabled.
- Push Notifications enabled.
- Privacy policy URL and support URL are live.
- Reviewer demo accounts exist.

Before Play internal testing:

- Play Console app record exists.
- Android package matches `za.co.zoothome.app`.
- Data Safety draft completed from actual SDK behavior.
- Content rating completed.
- Google Play service account is linked and scoped.
- App Links verified after `assetlinks.json` deployment.

## Production Guards

- No mock data in production.
- Production fails if required public Supabase config is missing.
- No payment success from client return URLs.
- Sensitive actions go through Supabase Edge Functions.
- Session storage uses SecureStore on native devices.
- Client-contractor communication stays inside Zoot.
- WhatsApp is not used for routine booking communication.
