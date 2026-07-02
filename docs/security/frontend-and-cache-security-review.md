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
- Public pages must not include private data, fake claims, or secrets.
- Widgets, push, SMS, email, and SEO content must not contain household access data.

## Cache Rules

| Content | Cache stance |
| --- | --- |
| Static hashed assets | Cache aggressively once production hosting is configured |
| Public articles and legal pages | Cache publicly with purge strategy |
| Authenticated app responses | Do not cache in shared public caches |
| Sensitive access and support/account data | Never store in persistent frontend state or public caches |
| Preview/demo routes | Do not index; do not expose production-like secrets |

## Open Items

- Final Cloudflare cache/WAF rules require registered domain and zone.
- Confirm production headers on the final host.
- Run browser smoke for home, booking, Care+, Articles, Concierge, admin, Zooter jobs, and legal routes after deployment.
