# Zoot Product State Reference

## Care+

States:

- unauthenticated
- not_member
- pending_payment
- active
- past_due
- cancelled

Tables:

- `subscription_plans`
- `user_subscriptions`
- `payment_records`
- `household_profiles`
- `property_accounts`
- `zootcred_ledger`

Activation requires server-side payment confirmation or approved admin action.

## ZootCred

Use `zootcred_ledger` as the source of truth. Show:

- available balance
- pending credits
- expiring credits
- redemption history
- referral rewards

Do not allow negative-balance mutations from the frontend.

## Home Memory

Use `household_profiles` and property/account tables. Keep access notes inside authenticated app surfaces. Do not expose sensitive notes in notifications.

## Favorite Zooter

Use real booking history or an explicit favorite relationship. Do not show fake favorite contractors to signed-in users in production.
