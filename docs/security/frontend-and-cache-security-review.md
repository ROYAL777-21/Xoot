# Frontend And Cache Security Review

Reviewed: 2026-07-02

## Surfaces

- Public website, Articles/SEO pages, Care+ marketing, booking entry points, Concierge launcher.
- Authenticated app shell, admin panel, Zooter shell, booking details, sensitive reveal component.
- Static hosting, browser caches, service-worker/PWA behavior, GitHub Pages/Hostinger/Netlify preview paths.

## Controls

- Public env validation fails loudly for missing Supabase URL/key or secret-like `VITE_` names.
- Frontend mutation guard blocks direct writes to admin/outbox/messages paths.
- Sensitive fields use Edge Function reveal instead of direct table queries.
- Native/deep-link web URLs are restricted to approved Zoot hosts or local development hosts in `src/lib/native-routing.ts`.
- Stored notification links are resolved through `src/lib/notification-routing.ts` and render as plain text when the route is external, auth-token bearing, unsafe, or outside approved in-app surfaces.
- `npm run security:scan` fails on raw frontend HTML insertion or string-execution APIs through `scripts/security/assert-no-unsafe-dom-apis.mjs`.
- `npm run security:scan` also verifies static host security headers, private-route `no-store`, service-worker revalidation, and deterministic Netlify installs through `scripts/security/assert-static-hosting-security.mjs`.
- Public pages must not include private data, fake claims, or secrets.
- Widgets, push, SMS, email, and SEO content must not contain household access data.

## Cache Rules

| Content | Cache stance |
| --- | --- |
| Static hashed assets | Cache aggressively once production hosting is configured |
| Public articles and legal pages | Cache publicly with purge strategy |
| Authenticated app responses | `Cache-Control: no-store, private, max-age=0, must-revalidate` on `/app`, `/auth`, `/admin`, and private Zooter routes |
| Sensitive access and support/account data | Never store in persistent frontend state or public caches; private SPA routes are no-store |
| Preview/demo routes | Do not index; do not expose production-like secrets |

## Open Items

- Final Cloudflare cache/WAF rules require registered domain and zone.
- Confirm production headers on the final host.
- Run browser smoke for home, booking, Care+, Articles, Concierge, admin, Zooter jobs, and legal routes after deployment.
