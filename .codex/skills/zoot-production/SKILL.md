---
name: zoot-production
description: Production readiness skill for Zoot web app, PWA, Hostinger deploys, Supabase staging/production config, Sentry/monitoring, SEO, performance, Capacitor, iOS, Android, app-store readiness, and native Apple-like app experience.
---

# Zoot Production Skill

Load `zoot` first. Then read:

- `../work/zoot_company_wide_md_pack/docs/engineering/PRODUCTION_READINESS.md`
- `../work/zoot_company_wide_md_pack/docs/engineering/MOBILE_RELEASE_READINESS.md`
- `../work/zoot_company_wide_md_pack/docs/engineering/TESTING_QA.md`
- `../work/zoot_company_wide_md_pack/docs/marketing/CONTENT_SYSTEM.md`
- `../work/zoot_company_wide_md_pack/docs/marketing/LAUNCH_CAMPAIGN.md`
- `docs/MOBILE_RELEASE_CONFIG.md`
- `docs/STAGING_PRODUCTION_CHECKLIST.md`
- `docs/native/native-feel-ux-checklist.md`
- `docs/release/app-store-play-store-checklist.md`

Use [references/release-gates.md](references/release-gates.md) for launch checks.

## Release Principles

- The installable app must feel native to Apple where possible: clear text, liquid-glass background treatments only where legibility remains high, stable navigation, haptics, safe-area spacing, and native-feeling loading/transition states.
- Production build must not depend on mocks, placeholder env vars, or frontend-only payment success.
- Hostinger deploy output is `dist`.
- Staging and production credentials must be separate.
- Mobile app release requires verified bundle IDs, app IDs, signing, deep links, privacy labels, data safety, and store review notes.

## Verification

Use the checks that match the change:

- `npm run config:check`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run security:scan`
- Browser visual checks for UI, mobile layout, and liquid-glass readability
- Capacitor sync/open checks when native project files or app config change

When `npm` is unavailable on PATH, run package tools through the bundled Node runtime or local `node_modules/.bin` shims.
