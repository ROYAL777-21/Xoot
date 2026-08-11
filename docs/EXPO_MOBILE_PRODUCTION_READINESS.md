# Expo Mobile Production Readiness Plan

Reviewed: 2026-06-19

## Current Repository Shape

- Web remains a React/Vite app in the repo root.
- Mobile is a separate Expo app in `/mobile`.
- Supabase backend is shared through migrations and Edge Functions in `/supabase`.
- Public web configuration uses `VITE_`.
- Public mobile configuration uses `EXPO_PUBLIC_`.
- Server secrets stay in Supabase Edge Function secrets, EAS secrets, CI secrets, or provider dashboards.

## Shared Code Candidates

Move these into a shared package later:

- booking state machine
- public env validation patterns
- input validators
- sanitized support/Xoot knowledge constraints
- Edge Function response types
- formatting helpers
- generated Supabase database types

Do not share:

- DOM components
- shadcn/Radix UI components
- browser `localStorage` assumptions
- Vite-only env access
- web CSS/Tailwind components that depend on DOM layout

## React Native Rewrites Required

These web surfaces need native React Native implementations:

- booking form and booking detail
- Care+ membership state screen
- XootCred ledger
- Xoot Concierge chat
- support tickets
- Xooter onboarding and KYC uploads
- Xooter jobs and sensitive access reveal
- admin ops, if admins are allowed on mobile
- maps/Xooter tracking
- in-app client-contractor chat
- payment checkout return/status screens

## Required Backend Before Store Testing

- Supabase staging/preview project or branch.
- Supabase production project secrets set.
- Edge Functions deployed:
  - `support-respond`
  - `care-plus-membership`
  - `create-booking`
  - `create-booking-request`
  - `confirm-payment`
  - `cancel-booking`
  - `request-replacement`
  - `get-booking-public-keys`
  - `get-sensitive-access`
  - `create-masked-call`
  - admin functions
- Payment provider functions:
  - `stitch-create-checkout`
  - `stitch-webhook`
  - `ozow-create-payment`
  - `ozow-notify`
- Push sender function for Expo Push Service.
- Real staging users for client, admin, and Xooter flows.

## Required Mobile Security Controls

- SecureStore-backed auth session storage on native.
- PKCE auth flow.
- Supabase RLS for all exposed tables.
- Edge Functions for sensitive actions.
- No Supabase service-role key in mobile.
- No payment/Twilio/Brevo/KIE/OpenAI/Airtable/Cloudflare/Hostinger secrets in mobile.
- No mock data in production.
- Production config fails loudly when required public config is missing.
- Payment success never trusted from mobile route return.
- Booking chat counterpart public keys only through `get-booking-public-keys`.
- Sensitive household access only through `get-sensitive-access` and logged reveal.
- Push payloads contain non-sensitive summaries only.
- App Links/deep links route to authenticated screens and never mutate state by themselves.

## Required Store Credentials

Apple:

- Apple Developer Program membership.
- Team ID.
- Bundle ID: `za.co.zoothome.app`.
- App Store Connect app record.
- Distribution certificate and provisioning profile, EAS-managed if possible.
- App Store Connect API key for CI/EAS submit.
- APNs key.
- Associated Domains capability.
- Sign in with Apple capability.

Google:

- Google Play Developer account.
- Package: `za.co.zoothome.app`.
- Play Console app record.
- Google Play App Signing.
- Upload key, EAS-managed if possible.
- Google Play service account JSON stored as EAS file secret.
- Firebase/FCM credentials for notifications.
- Android App Links verification.

Expo:

- Expo account and organization.
- EAS project ID.
- EAS credentials for iOS and Android.
- EAS env sets: development, preview, production.
- EAS Update channels: development, preview, production.

## TestFlight And Play Internal Testing Gate

Before TestFlight:

- `npm ci` in `/mobile`.
- `npm run config:check`.
- `npm run typecheck`.
- `npx expo-doctor`.
- `eas build -p ios --profile preview`.
- install on real iPhone.
- auth, Concierge, Care+, booking, support, push permission, and deep links tested.

Before Play internal testing:

- `npm ci` in `/mobile`.
- `npm run config:check`.
- `npm run typecheck`.
- `npx expo-doctor`.
- `eas build -p android --profile preview`.
- install on real Android device.
- auth, Concierge, Care+, booking, support, push permission, and App Links tested.

## Production Release Gate

- App Store privacy labels completed from actual code behavior.
- Play Data Safety completed from actual code behavior.
- Privacy policy, terms, support, account deletion, refund/cancellation policy live.
- Sentry mobile project receiving crash events.
- Supabase advisors reviewed.
- Edge Function logs reviewed after staging smoke tests.
- All payment provider webhooks verified and idempotent.
- No production mock/demo switches.
- No committed secrets scan clean.
