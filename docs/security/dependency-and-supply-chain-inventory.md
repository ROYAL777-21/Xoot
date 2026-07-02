# Dependency And Supply Chain Inventory

Reviewed: 2026-07-02

This inventory supports Phase 1 of the hardening programme. It records the current dependency posture, high-risk packages, CI install controls, and build-artifact safeguards. It is not an approval for automatic dependency upgrades.

## Workspaces

| Workspace | Manifest | Lockfile | Install command | Current lockfile status |
| --- | --- | --- | --- | --- |
| Web app | `package.json` | `package-lock.json` | `npm ci --no-audit --prefer-offline` in CI | `npm run lockfiles:check` passed on 2026-07-02 |
| Expo mobile app | `mobile/package.json` | `mobile/package-lock.json` | `npm --prefix mobile ci --no-audit --prefer-offline` in CI | `npm run lockfiles:check` passed on 2026-07-02 |

## Audit Evidence

| Command | Result on 2026-07-02 |
| --- | --- |
| `npm audit --omit=dev --audit-level=moderate --json` | 0 info / 0 low / 0 moderate / 0 high / 0 critical production vulnerabilities |
| `npm --prefix mobile audit --omit=dev --audit-level=moderate --json` | 0 info / 0 low / 0 moderate / 0 high / 0 critical production vulnerabilities |

Audit output is point-in-time evidence. Re-run before release and after any dependency change.

## Dependency Classification

| Category | Web dependencies | Mobile dependencies | Risk posture |
| --- | --- | --- | --- |
| Runtime framework | `react`, `react-dom`, `react-router-dom`, `vite` build runtime | `react`, `react-native`, `expo`, `expo-router`, `react-native-web` | High blast radius; upgrade only with full regression and mobile build checks |
| UI and interaction | Radix UI packages, `lucide-react`, `recharts`, `embla-carousel-react`, `vaul`, `cmdk`, `sonner`, `react-day-picker` | `@expo/ui`, `expo-glass-effect`, `expo-symbols`, `react-native-reanimated`, gesture/screen/safe-area packages | Medium; mostly user-facing, but route/dialog regressions can affect auth and booking flows |
| Data and validation | `@supabase/supabase-js`, `@tanstack/react-query`, `zod`, `react-hook-form`, `@hookform/resolvers`, `date-fns` | `@supabase/supabase-js`, `@tanstack/react-query`, `react-native-url-polyfill`, `expo-secure-store` | High; affects auth/session, API calls, cache correctness, and validation |
| Security and sanitisation | `dompurify`, env guards, custom secret scanner | `expo-secure-store`, app config guards | High; review changelogs before upgrades |
| Analytics and monitoring | `@sentry/react`, `@sentry/vite-plugin`, `posthog-js` | `@sentry/react-native`, `posthog-react-native` | High privacy risk; must preserve redaction and event allowlists |
| Maps and location | `mapbox-gl` | `@rnmapbox/maps`, location-related Expo modules only where explicitly used | High token/privacy risk; public tokens must be restricted |
| Native device services | PWA/static web only | `expo-notifications`, `expo-device`, `expo-application`, `expo-auth-session`, `expo-linking`, `expo-updates`, `expo-web-browser`, `expo-file-system` | High; impacts store permissions, push privacy, OAuth, deep links, and updates |
| Developer tooling | ESLint, TypeScript, Vitest, Testing Library, Tailwind, PostCSS, Autoprefixer, jsdom | TypeScript, `tsx`, Expo CLI through npm scripts | Medium; CI/build failure risk and supply-chain exposure |

## High-Risk Direct Dependencies

| Package | Workspace | Purpose | Known concern today | Required review before upgrade/removal |
| --- | --- | --- | --- | --- |
| `@supabase/supabase-js` | Web/mobile | Auth, database, Edge Function client | No production audit findings; API/auth behavior changes can break RLS assumptions | Supabase changelog, auth/session regression, Edge Function smoke |
| `expo` and Expo modules | Mobile | Native app runtime and device APIs | No production audit findings; native config changes can affect app-store behavior | `npx expo-doctor`, config introspection, EAS preview build |
| `react-native` | Mobile | Native UI runtime | No production audit findings; upgrade requires native compatibility review | Expo compatibility, real-device smoke |
| `@rnmapbox/maps` / `mapbox-gl` | Mobile/web | Maps and service-area views | Token leakage and native download-token risk | Restricted public tokens, EAS secret download token, no secret `sk.` public value |
| `@sentry/*` and `posthog-*` | Web/mobile | Observability and analytics | Privacy leakage if configured poorly | Scrubbing, event allowlist, no sensitive text capture |
| `dompurify` | Web | Sanitisation boundary where rich content is allowed | Sanitiser bypass risk if misconfigured | Keep allowlist strict; test XSS payloads before rich-content expansion |
| `vite` and `@vitejs/plugin-react` | Web | Build pipeline | Build artifact/source-map/env exposure risk | Build artifact secret scan and config check |
| `react-native-reanimated` / `react-native-worklets` | Mobile | Native motion runtime | Native build compatibility and crash risk | EAS preview build and reduced-motion fallback |

## CI And Build Controls

- GitHub Actions pins major action versions and grants minimal listed permissions.
- Web workflow uses Node 20 with npm cache keyed by `**/package-lock.json`.
- Web and mobile installs retry `npm ci` three times and use `--no-audit --prefer-offline` to reduce transient registry failure. Security audit runs separately in controlled local/release review.
- `scripts/config/validate-lockfiles.mjs` fails if web or mobile lockfiles are missing, out of sync, or contain legacy Capacitor packages.
- `npm run security:scan` fails if known secret patterns appear in source or if frontend code writes directly to protected queues.
- Production build writes native association files only when required identifiers/fingerprints exist; missing values skip generation rather than inventing IDs.

## Upgrade Policy

1. Trace package usage before removal.
2. Review changelog/security notes for high-risk dependencies.
3. Update manifest and lockfile together.
4. Run `npm run lockfiles:check`, `npm run lint`, `npm test`, `npm run build`, `npm run security:scan`, `npm run mobile:config:check`, and `npm run mobile:typecheck` as applicable.
5. For mobile or native dependencies, run Expo config inspection and EAS preview/development builds before release.
6. Do not auto-upgrade production branches without PR review and CodeRabbit/GitHub checks.

## Open Items

- Add scheduled dependency audit cadence after launch.
- Add store-signing and EAS credential review once Apple/Google records exist.
- Run build-artifact secret inspection on final production host output after domain/hosting configuration is complete.
