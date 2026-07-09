---
name: zoot-backend
description: Backend action-layer skill for Zoot Supabase Edge Functions, payment webhooks, booking state transitions, masked calling, support actions, admin actions, and replacing browser-owned Supabase writes with authenticated server-side functions.
---

# Zoot Backend Skill

Load `zoot` first. Then read:

- `../work/zoot_company_wide_md_pack/docs/product/BOOKING_LOGIC.md`
- `../work/zoot_company_wide_md_pack/docs/engineering/PAYMENTS_WEBHOOKS.md`
- `../work/zoot_company_wide_md_pack/docs/security/FRAUD_AND_BUSINESS_LOGIC.md`
- `docs/BOOKING_LOGIC.md`
- `docs/WEBHOOKS_AND_CALLBACKS.md`

Use [references/backend-contracts.md](references/backend-contracts.md) for function rules.

## Core Rule

Frontend guides. Backend decides.

Prices, payment status, Care+ activation, ZootCred, booking state transitions, support escalations, masked-call setup, and contractor verification must be decided in Edge Functions or verified webhooks.

## Edge Function Pattern

Each Zoot Edge Function should:

1. Handle `OPTIONS` with CORS allow-list.
2. Verify a bearer JWT unless it is a signed provider webhook.
3. Derive `user_id` from Supabase Auth, never from client input.
4. Validate and normalize inputs.
5. Use `SUPABASE_SERVICE_ROLE_KEY` only server-side.
6. Write server-owned rows such as payment/admin/outbox/notification records.
7. Avoid leaking sensitive details in errors, logs, notifications, SMS, or email.
8. Return a compact status response for the frontend.

## Priority Function Backlog

- `create-booking-request`
- `care-plus-membership`
- `confirm-payment` or provider-specific Stitch/Ozow webhooks
- `cancel-booking`
- `redeem-zootcred`
- `create-support-case`
- `submit-zooter-application`
- `approve-zooter`
- `create-masked-call`
- `request-replacement`
- admin typed actions replacing generic row updates

## Verification

Search before and after:

`rg -n "payment_records|admin_review_queue|integration_outbox|zooter_jobs|booking_status_events|zootcred_ledger|user_subscriptions|zooter_applications" src`

Browser writes to these tables require explicit justification or replacement with `supabase.functions.invoke()`.
