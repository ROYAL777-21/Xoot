# Phase 2 Booking-Scoped Chat

Reviewed: 2026-06-30

This slice hardens the existing `public.messages` booking chat path. It does not create a second chat system.

## Added Artifacts

- Migration: `supabase/migrations/20260629113000_booking_chat_action_layer.sql`
- Edge Function: `supabase/functions/send-booking-message/index.ts`
- Edge Function: `supabase/functions/report-booking-message/index.ts`
- Edge Function: `supabase/functions/mark-booking-message-read/index.ts`
- Client safety helper: `src/lib/booking-chat-safety.ts`
- Staging smoke coverage: `scripts/ops/staging-role-smoke.mjs`

## Security Boundary

- Clients can still read booking messages through RLS.
- Clients can no longer insert, update, or delete `public.messages` directly.
- New messages are sent through `send-booking-message`, which verifies:
  - authenticated user;
  - booking participant role;
  - non-terminal booking state;
  - encrypted `zoot:e2ee:v1:` message envelope;
  - `booking.chat_send` operational control;
  - per-user booking chat rate limit.
- Message reports go through `report-booking-message`, which writes `booking_message_reports` and queues `admin_review_queue` triage.
- Read receipts go through `mark-booking-message-read`.
- Typing state uses the existing booking participant model and contains no sensitive message content.

## Encryption And Safety

The browser/mobile app encrypts message content before calling the Edge Function. The Edge Function stores only the encrypted envelope. Because the server does not receive plaintext, obvious sensitive-data and off-platform-payment checks run client-side before encryption. This protects normal users from accidental leakage, but it is not a substitute for moderation reports, rate limits, trust review, and platform enforcement.

Blocked examples include phone numbers, email addresses, WhatsApp/off-platform prompts, access-code terms, OTP/password terms, and payment secrets.

## Rollback

If the action layer causes delivery issues:

1. Set `booking.chat_send` to `false` to stop new sends while preserving message reads.
2. Redeploy the previous `BookingChat` frontend only if a founder/security decision accepts direct client inserts again.
3. Prefer forward fix over restoring direct `messages` insert grants.

## Live Follow-Up

The migration and three Edge Functions are applied in staging and production as of 2026-06-30. Next run:

```powershell
npm run ops:smoke:staging -- --all
```

The smoke run verifies client/Zooter participant auth, Edge-only chat sending, denied direct `public.messages` insert, read receipts, message reports, and admin review queue creation on one staging booking.
