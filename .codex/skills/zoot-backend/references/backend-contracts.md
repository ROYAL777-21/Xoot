# Zoot Backend Contracts

## Edge Function Shape

- Accept `POST` and `OPTIONS`.
- Reject disallowed origins.
- Require bearer JWT for user actions.
- Verify provider webhook signatures for payment callbacks.
- Derive acting user from `auth.getUser()`.
- Use service-role Supabase client only inside the function.
- Return sanitized errors.

## Server-Owned Rows

These rows should generally be created or changed server-side:

- `bookings`
- `payment_records`
- `user_subscriptions`
- `zootcred_ledger`
- `zooter_jobs`
- `booking_status_events`
- `admin_review_queue`
- `integration_outbox`
- `zooter_applications`
- sensitive access logs

## Payment Rules

- Use idempotency around provider references.
- Keep bookings or memberships pending until verified provider callback or approved admin action exists.
- Never trust success/cancel/error URL query params for money movement.

## Notifications

- Queue notifications after the server event is accepted.
- Keep full addresses, gate codes, payment details, ID details, and complaint details out of push, SMS, email, and logs.
