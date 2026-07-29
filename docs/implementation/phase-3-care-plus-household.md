# Phase 3 - Care+ Household Operating Layer

Reviewed: 2026-06-29

## Scope Completed Locally

This slice consolidates the Care+ household operating layer behind one frontend hook:

- `src/hooks/useHouseholdOperatingLayer.ts`

The hook reads authenticated user data from existing Supabase tables:

- `household_profiles` for Home Memory readiness.
- `property_accounts` for host, landlord, and office property readiness.
- `bookings` for recent booking cadence.
- `favorites` and `zooters_public` for favourite and backup Xooter context.
- `support_tickets` for service recovery signals.

No provider dashboards, production secrets, payment state, or live communications are activated by this slice.

## Product Behaviour

The hook exposes:

- `homeMemory`: owner-visible Home Memory summary without returning gate codes.
- `propertyProfiles`: display-ready property profiles derived from real `property_accounts`.
- `householdCircle`: favourite Xooter, backup Xooters, saved count, and recurring favourite count.
- `readyModes`: Home Memory, Guest-Ready Mode, Workplace Ready, and One-Tap Rebook readiness.
- `recentBookings`: real recent booking snapshots.
- `serviceRecovery`: open support/disrupted-booking signals.
- `lifecycleTriggers`: booking-cadence, profile-completion, and property-ops prompts based on real data.

## Pages Updated

- `src/pages/app/Plans.tsx`
  - Removed direct `household_profiles` Home Memory query.
  - Uses the shared household operating layer for Home Memory and ready modes.

- `src/pages/app/OfficeDashboard.tsx`
  - Removed direct `property_accounts` query and hard-coded office profile examples.
  - Uses real office property profiles, recent booking status, recovery count, and lifecycle prompts.

- `src/pages/app/AirbnbHostDashboard.tsx`
  - Removed direct `property_accounts` query and fake recent host history.
  - Uses real host/landlord property profiles, recent booking history, recovery count, and lifecycle prompts.

- `src/pages/care/CarePlus.tsx`
  - Active Care+ members see household operating readiness and service recovery context when real data exists.

## Guardrails

- No mock membership data is introduced.
- Sensitive access values such as gate codes are not returned by the household hook.
- Service recovery is informational only; support/admin actions still go through existing audited boundaries.
- Favourite Xooter messaging avoids availability guarantees.
- Payment state is not inferred from the frontend.

## Tests

Added:

- `src/hooks/useHouseholdOperatingLayer.test.ts`

Covered behaviours:

- Home Memory readiness scoring.
- Property-account to display-profile mapping.
- Lifecycle trigger derivation from booking cadence.
- Ready mode generation.
- Service recovery signal generation.

## Rollback

Frontend rollback:

- Revert `src/hooks/useHouseholdOperatingLayer.ts`, `src/hooks/useHouseholdOperatingLayer.test.ts`, and the four updated page files.

No database rollback is required because this slice does not add migrations.

## Remaining Live Gates

- Live Phase 2 booking chat deployment still depends on authenticated Supabase CLI/session access.
- Domain-dependent production setup remains blocked until a final domain is registered.
- Supabase Auth redirect allowlists, provider secrets, Twilio production channels, Mapbox restricted tokens, Cloudflare zone, and store credentials remain tracked in `blocker.md`.
