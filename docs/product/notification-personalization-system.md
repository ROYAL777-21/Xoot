# Notification Personalization System

Reviewed: 2026-07-09

Zoot notifications are behavior-aware, privacy-first, and server-owned. The product goal is to feel personal without exposing private household, payment, support, or account data on lock screens, email previews, SMS, WhatsApp, analytics, logs, or widgets.

## Source Of Truth

- Primary channel: in-app notifications.
- Native push: safe prompts that route users back into Zoot.
- Email: receipts, records, and longer lifecycle updates through Brevo.
- WhatsApp/SMS/voice: urgent operational fallback only after provider, consent, regulatory, webhook, and smoke-test gates are complete.
- Delivery authority: Supabase Edge Functions and `integration_outbox`, never direct frontend provider calls.

## Behavior Signals

The personalization model may use privacy-safe signals only:

| Signal | Meaning | Example treatment |
| --- | --- | --- |
| `new_user` | User has not completed core setup | In-app setup nudge, no external send by default |
| `booking_started` | Booking flow started but not completed | Calm reminder to continue booking |
| `service_selected` | User chose a service but stopped before details | Service-specific next-step prompt |
| `payment_pending` | Backend/provider says payment is pending | High-priority app route to payment status |
| `booking_assigned` | Backend says a Zooter is assigned | Booking route prompt, no address in push |
| `booking_accepted` | Assigned Zooter accepted | Customer and Zooter route prompts |
| `job_day` | Booking is close enough to need attention | Push allowed outside quiet-hours suppression |
| `repeat_customer` | User has repeat usage | Care+ and saved preference prompts |
| `care_plus_candidate` | User shows repeat-home or host intent | Care+ education, only with consent for marketing |
| `support_waiting` | Support case has safe status update | Route to support, no complaint content in push |
| `zooter_active_today` | Zooter has an accepted job today | Job checklist prompt |
| `inactive_14d` | User has been quiet for retention window | In-app or consented email only |

Do not use raw chat text, access notes, full addresses, payment references, support allegations, fraud signals, ID documents, bank details, or private Zooter/client identifiers as notification personalization inputs.

## Channel Rules

| Category | Allowed channels before provider activation | External-channel rule |
| --- | --- | --- |
| Booking | `in_app`, `expo_push` | Email only for records/receipts; no WhatsApp unless urgent operational flow is approved |
| Support | `in_app`, `expo_push` | WhatsApp/SMS only for urgent approved support after Twilio compliance and signed webhook smoke tests |
| Care+ | `in_app`, `expo_push` | Email only with consent or transactional membership context |
| ZootCred | `in_app`, `expo_push` | Do not expose balances in push body |
| Security | `in_app`, `expo_push`, email | No OTPs or account-existence disclosure |
| Zooter jobs | `in_app`, `expo_push` | No client address, access note, gate code, or private phone number in previews |
| Sensitive access | `in_app`, `expo_push` | Push text must say only that details are available inside Zoot |
| Marketing | `in_app` and consented email | No WhatsApp/SMS marketing without explicit approved programme |

## Frequency And Timing

- Default cap: 6 non-urgent notifications/day and 24/week.
- Quiet hours: 21:00 to 07:00 local time unless urgency is `urgent` or the behavior signal is time-sensitive, such as `job_day`, `payment_pending`, `support_waiting`, or `zooter_active_today`.
- If a cap is reached, keep the notification in-app or route-only instead of pushing externally.
- Every delivery decision must record reason codes, chosen channel, suppressed channel, category, and correlation ID in the server-owned outbox/decision log.

## Privacy Rules

Notification title/body must never include:

- full address;
- gate, alarm, lockbox, door, entry, or parking codes;
- OTPs;
- card, CVV, bank, payout, invoice, or provider references;
- raw support complaint details;
- harassment, theft, safety, medical, legal, or police-report details;
- private client/Zooter phone numbers or emails;
- internal trust, fraud, reliability, or screening reasons.

If sensitive text is detected, replace the preview with:

`Open Zoot to view this securely.`

## Implementation Anchors

- Web decision helper: `src/lib/notification-personalization.ts`.
- Web route allowlist: `src/lib/notification-routing.ts`.
- Web push registration: `src/lib/push-notifications.ts`.
- Expo push registration and Android channels: `mobile/src/lib/push-notifications.ts`.
- Server delivery queue: `public.integration_outbox`.
- User-visible in-app rows: `public.notifications`.
- Native token store: `public.native_push_subscriptions`.

## Release Gate

Before this system is production-ready:

1. Run the unit tests for notification routing and personalization.
2. Deploy Edge delivery functions to staging only.
3. Verify in-app notification rows cannot be mutated except `read`.
4. Verify push payloads contain only safe route labels and non-sensitive body text.
5. Smoke-test Android channels on a real Android preview build.
6. Smoke-test iOS push permission, foreground, background, and tapped-notification routes on a real device or TestFlight.
7. Confirm PostHog and Sentry do not receive raw notification bodies, addresses, support text, or provider payloads.
8. Confirm Twilio/Brevo external sends remain disabled until provider credentials, signed webhooks, consent, and compliance records are complete.
