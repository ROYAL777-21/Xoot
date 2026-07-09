# Deployment Readiness

Reviewed: 2026-07-09 14:38 SAST

## Source Of Truth

- Canonical integration and production source branch: `main`
- Current staging branch: none confirmed as a separate Git branch.
- Current pull request: none before this focused documentation update.
- Last verified green `main` reference: `8a788d4`.

## Current Deployment State

- Release state: stabilising, blocked from production by manual provider, domain, store, and Supabase credential tasks.
- Web: required GitHub checks pass on current `main`; GitHub Pages remains explicitly manual.
- Backend: Supabase schema and Edge Function work is tracked, but live Auth redirects and some storage/function smoke tests still require credentials/dashboard access.
- Database: live catalog-readiness checks have passed through connector evidence, but dashboard migration metadata still needs controlled repair with rotated local credentials.
- Android: EAS preview build `114d0c10-c754-4426-9a90-9fdfeadb8a06` produced an APK versionCode `5`; Android Platform Tools are installed, but real-device smoke testing is still pending because no authorized device is connected.
- iOS: EAS simulator preview build `d4de44a1-d827-4045-b1a6-e427066fcd64` finished on 2026-07-01 and produced a simulator archive from commit `d007189`; physical-device preview builds remain blocked by missing EAS internal-distribution iOS credentials.
- Security: no obvious committed secrets in the current diff; private provider values remain outside source control.

## Deployment Targets

- Website/web app: React/Vite build, future DreamHost production deployment, Netlify preview/staging only.
- Mobile: Expo/EAS iOS and Android preview builds first, then TestFlight/Google Play internal testing after store credentials exist.
- Backend: Supabase staging first, production only after approval and credential setup.

## Required Before Production

- Resolve all items in `blocker.md`.
- Configure Supabase Auth redirects and migration repair with rotated local credentials.
- Register final production domain and configure Cloudflare/DNS/TLS.
- Configure App Store Connect and Google Play records.
- Complete iOS physical-device internal distribution credentials in EAS.
- Install the simulator archive on a macOS iOS Simulator and run the mobile smoke test.
- Run web, backend, Android, and iOS smoke tests with real staging users.
- Obtain founder approval.
