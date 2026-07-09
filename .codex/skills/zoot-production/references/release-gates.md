# Zoot Release Gates

## Web And Hostinger

- `npm run config:check`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run security:scan`
- `dist` contains Hostinger files such as `.htaccess` when required.
- Production env vars are configured in the host dashboard, not committed.

## Monitoring

- Sentry DSN configured per environment.
- Release/environment names set.
- Source map upload token kept server/CI-side only if used.
- Edge Function monitoring/log review path documented.

## PWA

- Manifest complete.
- Service worker and installability verified if present.
- Icons and screenshots match brand and store requirements.

## Native

- iOS bundle ID, Android application ID, Capacitor app ID, app name, version, build number, and signing identities documented.
- Deep links and auth callback URLs configured.
- Push notifications use safe payloads.
- App Store privacy labels and Play Store data safety answers match actual data use.

## SEO

- Public routes have titles, descriptions, sitemap/robots coverage, and locally relevant content.
- Blog/content work must be human-readable and revenue-oriented without unsupported service claims.
