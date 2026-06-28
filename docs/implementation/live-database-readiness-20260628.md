# Live Database Readiness Evidence

Reviewed: 2026-06-28

These checks were executed through the authenticated Supabase connector against live staging and production. The query was catalog-only and did not return application data, user data, or secret values.

## Results

- Staging project `fxmxyabdjqviqbcxmvlp`: 33 pass / 0 fail.
- Production project `mvlrkelahhsyjrwgsxaf`: 33 pass / 0 fail.

## Coverage

The live query verified:

- canonical `public.bookings.status` constraint and default;
- sensitive-access notification column, audit tables, helper functions, and execution privileges;
- safe Zooter job-card and accepted-destination RPC boundaries;
- Phase 1 governance tables, provider-event idempotency helpers, rate-limit helpers, default-disabled provider controls, and governance indexes;
- RLS policy hardening indicators, including no raw `auth.uid()` predicates in public policies;
- public Zooter table/view exposure boundary;
- duplicate-index and public foreign-key covering-index checks.

## Remaining Live Work

This evidence closes the live catalog-readiness check only. It does not replace:

- role-based smoke tests with real staging client, admin, and Zooter users;
- Supabase Auth redirect allowlist verification;
- provider dashboard configuration;
- signed Twilio webhook smoke tests.
