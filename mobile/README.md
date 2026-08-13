# Xoot Mobile

This is the separate Expo app for Xoot native iOS and Android releases. The React/Vite website remains in the repository root and is not replaced by this app.

## Stack

- Expo SDK 56
- Expo Router
- TypeScript
- Supabase shared backend
- SecureStore-backed native sessions
- Expo Push Service readiness
- EAS Build and Submit readiness

## Setup

Install dependencies from this directory:

```bash
npm install
```

Create a local ignored env file from the template:

```bash
copy .env.example .env.local
```

Add only public-safe values to `.env.local`. Do not add service-role keys, payment secrets, Twilio secrets, Brevo secrets, KIE keys, OpenAI keys, Airtable tokens, Hostinger tokens, Cloudflare tokens, private keys, or signing files.

## Development

```bash
npm run start
npm run ios
npm run android
npm run web
```

## Validation

```bash
npm run config:check
npm run typecheck
```

## EAS

```bash
npx eas-cli@20.5.0 project:info
npx eas-cli@20.5.0 credentials
npx eas-cli@20.5.0 build -p ios --profile preview
npx eas-cli@20.5.0 build -p ios --profile preview-simulator
npx eas-cli@20.5.0 build -p android --profile preview
```

EAS project initialization is complete for `@don-pacho777/xoot`. Use EAS environments for `development`, `preview`, and `production`. The `preview` iOS profile is for physical-device internal distribution and requires Apple credentials; `preview-simulator` produces an iOS simulator artifact without provisioning a device. Store file credentials and secrets in EAS or provider dashboards, not in source control.
