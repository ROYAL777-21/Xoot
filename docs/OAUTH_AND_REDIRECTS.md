# Zoot OAuth And Redirects

Reviewed: 2026-06-29

This file inventories OAuth, Supabase Auth redirects, and native deep-link requirements. It contains placeholders only.

## Current App Routes

The React app already includes:

- `/auth` - email/password, email OTP, Google OAuth, Apple OAuth UI.
- `/auth/callback` - Supabase PKCE callback exchange.
- `/auth/reset` - password recovery/update.
- `/install` - PWA install guidance.
- `/app/*` - authenticated customer app.
- `/zooter/*` - Zooter portal.
- `/admin/*` - admin routes.

## Supabase Auth

| Setting | Local | Staging | Production |
| --- | --- | --- | --- |
| Site URL | `http://localhost:5173` | `https://staging.zoothome.co.za` | `https://zoothome.co.za` |
| Callback URL | `http://localhost:5173/auth/callback` | `https://staging.zoothome.co.za/auth/callback` | `https://zoothome.co.za/auth/callback` |
| Password reset URL | `http://localhost:5173/auth/reset` | `https://staging.zoothome.co.za/auth/reset` | `https://zoothome.co.za/auth/reset` |
| Native callback | `zoot://auth/callback` | `zoot://auth/callback` | `zoot://auth/callback` |

Additional redirect allow-list entries:

```text
http://127.0.0.1:5173/auth/callback
http://127.0.0.1:5173/auth/reset
http://127.0.0.1:4173/auth/callback
http://127.0.0.1:4173/auth/reset
https://www.zoothome.co.za/auth/callback
https://www.zoothome.co.za/auth/reset
zoot://auth/reset
```

Required Supabase Auth dashboard setup:

- Enable email confirmations for production.
- Configure email OTP expiry and rate limits in Supabase Auth.
- Use provider-generated randomized OTPs; do not generate or hardcode OTPs in frontend code.
- Enable leaked-password protection where available.
- Add all redirect URLs per environment.
- Keep staging and production provider credentials separate.

Live status on 2026-06-29:

- The local Supabase configuration now contains the complete web and `zoot://` redirect set.
- Staging and production dashboard allowlists still need live verification. The repo now includes `scripts/ops/set-supabase-auth-config.ps1`, which can update Supabase Auth Site URL and redirect allowlist through the Supabase Management API after `SUPABASE_ACCESS_TOKEN`, the project ref, and real environment URLs are available locally.
- Do not launch email confirmation, password reset, Google OAuth, or Apple OAuth until the dashboard values exactly match this document.

Example dry run:

```powershell
$env:ZOOT_SUPABASE_PROJECT_REF = "abcdefghijklmnopqrst"
$env:ZOOT_AUTH_SITE_URL = "https://<registered-domain>"
$env:ZOOT_AUTH_REDIRECT_URLS = "https://<registered-domain>/auth/callback,https://<registered-domain>/auth/reset,zoot://auth/callback"
powershell -ExecutionPolicy Bypass -File scripts/ops/set-supabase-auth-config.ps1
```

Apply only after the values are real and approved:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "<from local vault, not chat>"
powershell -ExecutionPolicy Bypass -File scripts/ops/set-supabase-auth-config.ps1 -Apply
```

## Google OAuth

| Item | Local | Staging | Production | Storage |
| --- | --- | --- | --- | --- |
| Web OAuth client ID | Google Cloud OAuth app | Google Cloud OAuth app | Google Cloud OAuth app | Supabase provider dashboard/config |
| Web OAuth client secret | Google Cloud OAuth app | Google Cloud OAuth app | Google Cloud OAuth app | Supabase dashboard or backend secret store |
| Authorized JavaScript origins | `http://localhost:5173` | `https://staging.zoothome.co.za` | `https://zoothome.co.za`, `https://www.zoothome.co.za` | Google Cloud Console |
| Authorized redirect URIs | Supabase provider callback URL | Staging Supabase provider callback URL | Production Supabase provider callback URL | Google Cloud Console |
| iOS client ID | Optional | Staging native | Production native | Native config if native Google auth is used |
| Android client ID | Optional | Staging native | Production native | Native config if native Google auth is used |

Implementation notes:

- The app calls `supabase.auth.signInWithOAuth({ provider: "google" })` and redirects through `/auth/callback`.
- The web client secret must never be placed in `VITE_` variables.
- Use separate OAuth consent/app configuration for staging and production where possible.
- Add the production privacy policy and terms URLs before public launch.

## Apple Sign In

| Item | Staging | Production | Storage |
| --- | --- | --- | --- |
| Apple Developer Team ID | Required | Required | Apple Developer, CI env as `APPLE_TEAM_ID` or `ZOOT_APPLE_TEAM_ID` |
| iOS Bundle ID | Proposed staging variant of `za.co.zoothome.app` | `za.co.zoothome.app` | Apple Developer/Xcode |
| Services ID for web | Required if web Sign in with Apple is enabled | Required if web Sign in with Apple is enabled | Apple Developer/Supabase |
| Key ID | Required | Required | Apple Developer/Supabase |
| Private key file | Secure file outside repo | Secure file outside repo | CI secret or Supabase provider dashboard |
| Return/redirect URL | Staging Supabase callback | Production Supabase callback | Apple Developer/Supabase |
| Capabilities | Sign in with Apple, Associated Domains | Sign in with Apple, Associated Domains | Apple Developer/Xcode |

Apple setup rules:

- Do not commit Apple private key files.
- Use the final bundle ID before TestFlight/App Store review.
- Add Associated Domains only after AASA is deployed and reachable.
- If Apple sign-in is offered on iOS, follow the applicable App Store sign-in requirements.

## Native Deep Links

Recommended scheme:

```text
zoot://auth/callback
```

Recommended app links:

```text
https://zoothome.co.za/auth/callback
https://zoothome.co.za/auth/reset
https://zoothome.co.za/app/*
https://zoothome.co.za/care-plus/*
https://zoothome.co.za/zooter/*
```

Build-time variables:

- `ZOOT_APPLE_TEAM_ID`
- `ZOOT_IOS_BUNDLE_ID`
- `ZOOT_IOS_APP_ID`
- `ZOOT_ANDROID_PACKAGE_NAME`
- `ZOOT_ANDROID_SHA256_CERT_FINGERPRINTS`
- `ZOOT_APP_LINK_PATHS`

Generated files:

- `/.well-known/apple-app-site-association`
- `/.well-known/assetlinks.json`

## Redirect Safety Rules

The app uses `getSafeRedirectPath` in `src/lib/auth-security.ts` to prevent unsafe redirect targets. Keep these constraints:

- Only same-origin paths are allowed.
- Protocol-relative URLs are rejected.
- Backslash-containing redirects are rejected.
- `/auth` redirect loops are rejected.
- Unknown values fall back to `/app`.

## OAuth QA Checklist

- Email/password sign-up works in staging.
- Email confirmation lands on `/auth/callback`.
- Password reset lands on `/auth/reset`.
- Email OTP uses randomized provider-generated codes and generic error messages.
- Google OAuth works on local, staging, and production domains.
- Apple OAuth works on local/staging/production as applicable.
- Native deep link callback opens the installed app only after native project setup.
- Failed OAuth returns a safe generic error.
- Redirect attempts to external domains are blocked.
- Supabase dashboard redirects exactly match the app URLs.
