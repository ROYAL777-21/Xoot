# Zoot Implementation Phases

Use this as the high-level sequence. Do not claim the whole goal is complete until each phase has direct current-state evidence.

1. Production environment hardening: block mock/preview production paths.
2. Supabase RLS security hardening: remove permissive sensitive-table policies.
3. Backend action layer: move business-critical writes into Edge Functions.
4. Booking state machine: enforce valid status transitions.
5. CVE/security patches: SSRF, XSS, rate limits, validation, security headers.
6. Contractor sensitive data access: time-limited reveal and audit.
7. Admin typed auditable actions: replace generic row updates.
8. Care+ and ZootCred live data: replace authenticated mocks with real Supabase states.
9. Performance, monitoring, production build: Sentry, code splitting, SEO, PWA.
10. Mobile and PWA production readiness: Capacitor, deep links, push, store checks.

Post-phase launch checks:

- Staging database migrations applied.
- Client, contractor, admin, and business loops tested.
- Webhooks verified with signatures/secrets where supported.
- No committed `.env` files or real secrets.
- Production build and security scan pass.
