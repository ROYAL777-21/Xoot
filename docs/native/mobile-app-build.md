# Zoot Expo Mobile App Build Path

Reviewed: 2026-06-19

Zoot's production mobile path is Expo, not Capacitor. The React/Vite website remains in the repo root. Native iOS and Android work now belongs in `/mobile`.

## What Exists

- `/mobile` Expo SDK 56 app.
- Expo Router with TypeScript.
- `mobile/app.config.ts` for dynamic app identity.
- `mobile/eas.json` for development, preview, and production builds.
- SecureStore-backed Supabase auth session storage.
- Expo Push Service token registration helper.
- Native Liquid Glass card shell using `expo-glass-effect` on supported iOS devices.

## First-Time Setup

```bash
cd mobile
npm ci
copy .env.example .env.local
npm run config:check
npm run typecheck
```

Set real public-safe Supabase and EAS values in `.env.local` for local development. Do not put secrets in `.env.local` unless they are only used by local CLI tooling and the file remains ignored.

## EAS Setup

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest env:create --environment development --name EXPO_PUBLIC_APP_ENV --value development --visibility plaintext
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_APP_ENV --value preview --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_APP_ENV --value production --visibility plaintext
```

Add the remaining public-safe variables listed in `docs/MOBILE_RELEASE_CONFIG.md`.

## iOS Preview/TestFlight

```bash
cd mobile
npx eas-cli@latest credentials -p ios
npx eas-cli@latest build -p ios --profile preview
```

Required before TestFlight:

- Apple Developer membership.
- Bundle ID `za.co.zoothome.app`.
- App Store Connect app record.
- Associated Domains.
- Push Notifications.
- Sign in with Apple if Apple OAuth is enabled.
- App Store Connect API key for automated submit.

## Android Internal Testing

```bash
cd mobile
npx eas-cli@latest credentials -p android
npx eas-cli@latest build -p android --profile preview
```

Required before Play internal testing:

- Play Console account and app record.
- Package `za.co.zoothome.app`.
- Play App Signing/upload key.
- Google Play service account JSON stored as an EAS file secret.
- Firebase/FCM setup for notifications.
- Android App Links verified.

## Native Experience Rules

- Use SecureStore for sessions.
- Keep client-contractor chat inside Zoot.
- Do not use WhatsApp for routine communication.
- Route sensitive actions through Supabase Edge Functions.
- Never expose household access details in push notifications, widgets, logs, screenshots, Live Activities, or lock-screen surfaces.
- Payment return screens are display-only and must fetch verified backend status.
