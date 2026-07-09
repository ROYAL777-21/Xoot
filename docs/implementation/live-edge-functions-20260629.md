# Live Edge Function Inventory Evidence

Reviewed: 2026-06-30

These checks were executed through the authenticated Supabase connector against live staging and production. They listed and deployed Edge Function metadata only; no function secrets, request payloads, application data, or user data were returned or recorded.

## Result

- Staging project `fxmxyabdjqviqbcxmvlp`: required functions active.
- Production project `mvlrkelahhsyjrwgsxaf`: required functions active.
- `get-booking-public-keys` was deployed to staging and production on 2026-06-29 with JWT verification enabled after the live inventory showed the local function was not yet present in either project.
- Phase 2 booking chat functions `send-booking-message`, `report-booking-message`, and `mark-booking-message-read` were deployed to staging and production on 2026-06-30 with JWT verification enabled after the live inventory showed they were not yet present in either project.
- Anonymous POST probes to `get-booking-public-keys` in both environments returned `401` with `UNAUTHORIZED_NO_AUTH_HEADER`, confirming the endpoint exists and does not allow unauthenticated access.

## Required Function Coverage

The live inventory now includes these production-critical function groups in both environments:

- Concierge/support: `support-respond`
- Booking and payment: `create-booking`, `create-booking-request`, `confirm-payment`, `cancel-booking`, `request-replacement`
- Care+ and credits: `activate-care-plus`, `care-plus-membership`, `redeem-zootcred`
- Zooter/admin operations: `approve-zooter`, `submit-zooter-application`, `admin-confirm-payment`, `admin-resolve-review`, `admin-mark-outbox`, `admin-escalate-support`, `admin-reject-zooter`, `admin-control-management`
- Sensitive access and booking chat: `get-sensitive-access`, `revoke-sensitive-access`, `get-zooter-job-cards`, `get-booking-public-keys`, `send-booking-message`, `report-booking-message`, `mark-booking-message-read`
- Twilio provider callbacks: `twilio-message-webhook`, `twilio-whatsapp-webhook`, `twilio-status-callback`, `twilio-voice-webhook`, `twilio-verify-webhook`
- Ops: `ops-workflow`

## Remaining Live Work

This evidence closes the function-presence gap only. It does not replace:

- Supabase Auth redirect allowlist verification;
- Supabase Edge Function secret verification;
- provider dashboard configuration;
- signed Twilio webhook smoke tests;
- authenticated booking-chat public-key lookup smoke tests with real staging users.
